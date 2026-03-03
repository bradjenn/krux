use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

const PROJECT_MARKERS: &[&str] = &[
    ".git",
    "package.json",
    "CLAUDE.md",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "Gemfile",
    "composer.json",
];

const PROJECT_COLORS: &[&str] = &[
    "#47ff9c", "#0fc5ed", "#a277ff", "#ffe073", "#e52e2e", "#44ffb1", "#ff79c6", "#bd93f9",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredProject {
    pub name: String,
    pub path: String,
}

pub struct ProjectState {
    config_dir: PathBuf,
}

impl ProjectState {
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
        let config_dir = home.join(".krux");
        fs::create_dir_all(&config_dir).ok();
        Self { config_dir }
    }

    fn projects_path(&self) -> PathBuf {
        self.config_dir.join("projects.json")
    }

    fn load_projects(&self) -> Vec<Project> {
        let path = self.projects_path();
        if !path.exists() {
            return Vec::new();
        }
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    }

    fn save_projects(&self, projects: &[Project]) -> Result<(), String> {
        let path = self.projects_path();
        let tmp = path.with_extension("json.tmp");
        let data = serde_json::to_string_pretty(projects)
            .map_err(|e| format!("Serialize error: {}", e))?;
        fs::write(&tmp, &data).map_err(|e| format!("Write error: {}", e))?;
        fs::rename(&tmp, &path).map_err(|e| format!("Rename error: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
pub fn list_projects(state: State<'_, ProjectState>) -> Vec<Project> {
    state.load_projects()
}

#[tauri::command]
pub fn add_project(
    state: State<'_, ProjectState>,
    name: String,
    path: String,
    color: Option<String>,
) -> Result<Project, String> {
    let mut projects = state.load_projects();

    // Check for duplicate path
    if projects.iter().any(|p| p.path == path) {
        return Err("Project with this path already exists".to_string());
    }

    let color =
        color.unwrap_or_else(|| PROJECT_COLORS[projects.len() % PROJECT_COLORS.len()].to_string());

    let project = Project {
        id: Uuid::new_v4().to_string()[..8].to_string(),
        name,
        path,
        color,
        created_at: chrono_now(),
    };

    projects.push(project.clone());
    state.save_projects(&projects)?;

    Ok(project)
}

#[tauri::command]
pub fn remove_project(state: State<'_, ProjectState>, id: String) -> Result<(), String> {
    let mut projects = state.load_projects();
    let len_before = projects.len();
    projects.retain(|p| p.id != id);

    if projects.len() == len_before {
        return Err("Project not found".to_string());
    }

    state.save_projects(&projects)
}

#[tauri::command]
pub fn reorder_projects(state: State<'_, ProjectState>, ids: Vec<String>) -> Result<(), String> {
    let projects = state.load_projects();
    let mut reordered = Vec::with_capacity(ids.len());

    for id in &ids {
        if let Some(p) = projects.iter().find(|p| &p.id == id) {
            reordered.push(p.clone());
        }
    }

    // Append any projects not in the ids list
    for p in &projects {
        if !ids.contains(&p.id) {
            reordered.push(p.clone());
        }
    }

    state.save_projects(&reordered)
}

#[tauri::command]
pub fn discover_projects(
    state: State<'_, ProjectState>,
    scan_path: String,
) -> Vec<DiscoveredProject> {
    let resolved = if scan_path.starts_with('~') {
        let home = dirs::home_dir().unwrap_or_default();
        home.join(&scan_path[2..])
    } else {
        PathBuf::from(&scan_path)
    };

    if !resolved.is_dir() {
        return Vec::new();
    }

    let known_paths: std::collections::HashSet<String> = state
        .load_projects()
        .iter()
        .map(|p| p.path.clone())
        .collect();

    let mut discovered = Vec::new();

    if let Ok(entries) = fs::read_dir(&resolved) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            // Skip hidden directories
            if entry
                .file_name()
                .to_str()
                .map_or(true, |n| n.starts_with('.'))
            {
                continue;
            }

            let full_path = path.to_string_lossy().to_string();
            if known_paths.contains(&full_path) {
                continue;
            }

            // Check for project markers
            let has_marker = PROJECT_MARKERS.iter().any(|m| path.join(m).exists());

            if has_marker {
                discovered.push(DiscoveredProject {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: full_path,
                });
            }
        }
    }

    discovered
}

#[tauri::command]
pub fn get_git_branch(project_path: String) -> Option<String> {
    let output = std::process::Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&project_path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if branch.is_empty() {
        None
    } else {
        Some(branch)
    }
}

fn chrono_now() -> String {
    // Simple ISO 8601 timestamp without pulling in chrono crate
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}
