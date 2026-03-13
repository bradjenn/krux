use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub node_type: String, // "file" or "dir"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreeNode>>,
}

fn build_tree(path: &Path, base: &Path) -> Vec<TreeNode> {
    let mut nodes = Vec::new();

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return nodes,
    };

    let mut items: Vec<_> = entries.flatten().collect();
    items.sort_by_key(|e| e.file_name());

    for entry in items {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs
        if name.starts_with('.') {
            continue;
        }

        let relative = entry_path
            .strip_prefix(base)
            .unwrap_or(&entry_path)
            .to_string_lossy()
            .to_string();

        if entry_path.is_dir() {
            let children = build_tree(&entry_path, base);
            nodes.push(TreeNode {
                name,
                path: relative,
                node_type: "dir".to_string(),
                children: Some(children),
            });
        } else {
            nodes.push(TreeNode {
                name,
                path: relative,
                node_type: "file".to_string(),
                children: None,
            });
        }
    }

    nodes
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn read_dir_tree(path: String) -> Result<Vec<TreeNode>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    Ok(build_tree(p, p))
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

const FAVICON_CANDIDATES: &[&str] = &[
    "favicon.svg",
    "favicon.ico",
    "favicon.png",
    "public/favicon.svg",
    "public/favicon.ico",
    "public/favicon.png",
    "app/favicon.ico",
    "app/favicon.png",
    "app/icon.svg",
    "app/icon.png",
    "app/icon.ico",
    "src/favicon.ico",
    "src/favicon.svg",
    "src/app/favicon.ico",
    "src/app/icon.svg",
    "src/app/icon.png",
    "assets/icon.svg",
    "assets/icon.png",
    "assets/logo.svg",
    "assets/logo.png",
];

fn mime_for_ext(ext: &str) -> &'static str {
    match ext {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ico" => "image/x-icon",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub fn find_project_favicon(project_path: String) -> Option<String> {
    use base64::Engine;
    let base = Path::new(&project_path);
    for candidate in FAVICON_CANDIDATES {
        let p = base.join(candidate);
        if p.is_file() {
            if let Ok(bytes) = fs::read(&p) {
                let ext = p
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("png");
                let mime = mime_for_ext(ext);
                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                return Some(format!("data:{};base64,{}", mime, b64));
            }
        }
    }
    None
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut names = Vec::new();
    let entries = fs::read_dir(p).map_err(|e| format!("Failed to read dir: {}", e))?;
    for entry in entries.flatten() {
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    names.sort();
    Ok(names)
}
