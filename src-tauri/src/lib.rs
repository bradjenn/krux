mod fs;
mod projects;
mod pty;
mod settings;

use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(pty::PtyState::new())
        .manage(projects::ProjectState::new())
        .manage(settings::SettingsState::new())
        .setup(|app| {
            // App menu
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;
            let app_menu = SubmenuBuilder::new(app, "CC Manager")
                .about(None)
                .separator()
                .item(&settings_item)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // File menu
            let new_terminal =
                MenuItem::with_id(app, "new-terminal", "New Terminal", true, Some("CmdOrCtrl+T"))?;
            let close_tab =
                MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("CmdOrCtrl+W"))?;
            let add_project =
                MenuItem::with_id(app, "add-project", "Add Project...", true, None::<&str>)?;
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_terminal)
                .item(&close_tab)
                .separator()
                .item(&add_project)
                .build()?;

            // Edit menu
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // View menu
            let toggle_sidebar = MenuItem::with_id(
                app,
                "toggle-sidebar",
                "Toggle Sidebar",
                true,
                Some("CmdOrCtrl+B"),
            )?;
            let open_gsd =
                MenuItem::with_id(app, "open-gsd", "GSD Workflow", true, Some("CmdOrCtrl+G"))?;
            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_sidebar)
                .separator()
                .item(&open_gsd)
                .build()?;

            // Window menu
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .item(&PredefinedMenuItem::maximize(app, None)?)
                .separator()
                .fullscreen()
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            match id {
                "settings" | "new-terminal" | "close-tab" | "add-project" | "toggle-sidebar"
                | "open-gsd" => {
                    let _ = app.emit("menu-action", id);
                }
                _ => {}
            }
        })
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
            settings::load_settings,
            settings::save_settings,
            fs::read_file,
            fs::read_dir_tree,
            fs::path_exists,
            fs::list_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
