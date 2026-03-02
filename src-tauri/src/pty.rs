use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub struct PtyState {
    terminals: Mutex<HashMap<String, TerminalEntry>>,
}

struct TerminalEntry {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            terminals: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, Serialize)]
struct TerminalOutput {
    terminal_id: String,
    data: String,
}

#[tauri::command]
pub fn create_terminal(
    app: AppHandle,
    state: State<'_, PtyState>,
    project_path: String,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let terminal_id = Uuid::new_v4().to_string();

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Get the user's default shell
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&project_path);

    // Set environment variables for proper terminal behavior
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Drop the slave side — we only need the master
    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    let tid = terminal_id.clone();

    // Spawn a background thread to read PTY output and emit events
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut leftover = Vec::new(); // incomplete UTF-8 bytes from previous read

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app.emit(
                        "terminal:exit",
                        serde_json::json!({ "terminal_id": tid }),
                    );
                    break;
                }
                Ok(n) => {
                    // Prepend any leftover bytes from the previous read
                    let combined = if leftover.is_empty() {
                        &buf[..n]
                    } else {
                        leftover.extend_from_slice(&buf[..n]);
                        leftover.as_slice()
                    };

                    // Find the last valid UTF-8 boundary
                    let valid_up_to = match std::str::from_utf8(combined) {
                        Ok(_) => combined.len(),
                        Err(e) => e.valid_up_to(),
                    };

                    // Emit the valid UTF-8 portion
                    if valid_up_to > 0 {
                        let data =
                            unsafe { std::str::from_utf8_unchecked(&combined[..valid_up_to]) };
                        let _ = app.emit(
                            "terminal:output",
                            TerminalOutput {
                                terminal_id: tid.clone(),
                                data: data.to_string(),
                            },
                        );
                    }

                    // Save any trailing incomplete UTF-8 bytes for next read
                    let remainder = &combined[valid_up_to..];
                    leftover = if remainder.is_empty() {
                        Vec::new()
                    } else {
                        remainder.to_vec()
                    };
                }
                Err(_) => break,
            }
        }
    });

    let entry = TerminalEntry {
        writer,
        master: pair.master,
    };

    state
        .terminals
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?
        .insert(terminal_id.clone(), entry);

    Ok(terminal_id)
}

#[tauri::command]
pub fn write_terminal(
    state: State<'_, PtyState>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    let mut terminals = state
        .terminals
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    let entry = terminals
        .get_mut(&terminal_id)
        .ok_or("Terminal not found")?;

    entry
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, PtyState>,
    terminal_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let terminals = state
        .terminals
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    let entry = terminals
        .get(&terminal_id)
        .ok_or("Terminal not found")?;

    entry
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn close_terminal(state: State<'_, PtyState>, terminal_id: String) -> Result<(), String> {
    let mut terminals = state
        .terminals
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    // Removing the entry drops the writer and master, which closes the PTY
    terminals.remove(&terminal_id);

    Ok(())
}
