use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct ChatState {
    processes: Mutex<HashMap<String, Child>>,
}

impl ChatState {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, Serialize)]
struct ChatOutputPayload {
    chat_id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct ChatDonePayload {
    chat_id: String,
}

/// Resolve the claude binary path through the user's login shell.
/// This handles PATH correctly even when the app is launched from the Dock.
fn resolve_claude() -> Result<String, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = Command::new(&shell)
        .args(["-lc", "command -v claude"])
        .env_remove("CLAUDECODE")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map_err(|e| format!("Shell error: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Ok(path);
        }
    }
    Err("Claude CLI not found. Install from https://claude.ai/download".to_string())
}

#[tauri::command]
pub fn check_claude_cli() -> Result<bool, String> {
    Ok(resolve_claude().is_ok())
}

#[tauri::command]
pub fn start_claude_chat(
    app: AppHandle,
    state: State<'_, ChatState>,
    chat_id: String,
    message: String,
    project_path: String,
    session_id: String,
    is_resume: bool,
) -> Result<(), String> {
    let claude_path = resolve_claude()?;

    let mut cmd = Command::new(&claude_path);
    cmd.arg("-p")
        .arg("--output-format")
        .arg("stream-json")
        .arg("--include-partial-messages")
        .current_dir(&project_path)
        .env_remove("CLAUDECODE");

    if is_resume {
        cmd.arg("--resume").arg(&session_id);
    } else {
        cmd.arg("--session-id").arg(&session_id);
    }

    cmd.arg("--").arg(&message);

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;

    // Store process for abort capability
    state
        .processes
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?
        .insert(chat_id.clone(), child);

    // Background thread reads stdout line-by-line, emits events to frontend
    let chat_id_for_thread = chat_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(l) if !l.is_empty() => {
                    let _ = app.emit(
                        "claude:chat:data",
                        ChatOutputPayload {
                            chat_id: chat_id_for_thread.clone(),
                            data: l,
                        },
                    );
                }
                Err(_) => break,
                _ => {}
            }
        }

        let _ = app.emit(
            "claude:chat:done",
            ChatDonePayload {
                chat_id: chat_id_for_thread,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn abort_claude_chat(state: State<'_, ChatState>, chat_id: String) -> Result<(), String> {
    let mut procs = state.processes.lock().map_err(|_| "Lock poisoned".to_string())?;
    if let Some(mut child) = procs.remove(&chat_id) {
        child.kill().map_err(|e| format!("Kill failed: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn cleanup_claude_chat(state: State<'_, ChatState>, chat_id: String) -> Result<(), String> {
    let mut procs = state.processes.lock().map_err(|_| "Lock poisoned".to_string())?;
    procs.remove(&chat_id);
    Ok(())
}
