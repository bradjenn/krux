mod projects;
mod pty;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(pty::PtyState::new())
        .manage(projects::ProjectState::new())
        .invoke_handler(tauri::generate_handler![
            pty::create_terminal,
            pty::write_terminal,
            pty::resize_terminal,
            pty::close_terminal,
            projects::list_projects,
            projects::add_project,
            projects::remove_project,
            projects::reorder_projects,
            projects::discover_projects,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
