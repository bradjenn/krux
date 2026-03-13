#![allow(unexpected_cfgs)]

mod chat;
mod fs;
mod projects;
mod pty;
mod settings;

use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[tauri::command]
fn get_env_var(name: String) -> Option<String> {
    std::env::var(name).ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(chat::ChatState::new())
        .manage(pty::PtyState::new())
        .manage(projects::ProjectState::new())
        .manage(settings::SettingsState::new())
        .setup(|app| {
            // App menu
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;
            let app_menu = SubmenuBuilder::new(app, "Krux")
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
            let new_terminal = MenuItem::with_id(
                app,
                "new-terminal",
                "New Terminal",
                true,
                Some("CmdOrCtrl+T"),
            )?;
            let close_tab =
                MenuItem::with_id(app, "close-tab", "Close Tab", true, Some("CmdOrCtrl+W"))?;
            let add_project =
                MenuItem::with_id(app, "add-project", "Add Project...", true, None::<&str>)?;
            let project_switcher = MenuItem::with_id(
                app,
                "project-switcher",
                "Switch Project...",
                true,
                Some("CmdOrCtrl+K"),
            )?;
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_terminal)
                .item(&close_tab)
                .separator()
                .item(&add_project)
                .item(&project_switcher)
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
            let font_increase = MenuItem::with_id(
                app,
                "font-increase",
                "Increase Font Size",
                true,
                Some("CmdOrCtrl+="),
            )?;
            let font_decrease = MenuItem::with_id(
                app,
                "font-decrease",
                "Decrease Font Size",
                true,
                Some("CmdOrCtrl+-"),
            )?;
            let font_reset = MenuItem::with_id(
                app,
                "font-reset",
                "Reset Font Size",
                true,
                Some("CmdOrCtrl+0"),
            )?;
            let change_wallpaper = MenuItem::with_id(
                app,
                "change-wallpaper",
                "Change Wallpaper",
                true,
                Some("CmdOrCtrl+Shift+B"),
            )?;
            let change_theme = MenuItem::with_id(
                app,
                "change-theme",
                "Change Theme",
                true,
                Some("CmdOrCtrl+Shift+T"),
            )?;
            let opacity_increase = MenuItem::with_id(
                app,
                "opacity-increase",
                "Increase Background Opacity",
                true,
                Some("CmdOrCtrl+Shift+="),
            )?;
            let opacity_decrease = MenuItem::with_id(
                app,
                "opacity-decrease",
                "Decrease Background Opacity",
                true,
                Some("CmdOrCtrl+Shift+-"),
            )?;
            let blur_increase = MenuItem::with_id(
                app,
                "blur-increase",
                "Increase Background Blur",
                true,
                Some("CmdOrCtrl+Alt+="),
            )?;
            let blur_decrease = MenuItem::with_id(
                app,
                "blur-decrease",
                "Decrease Background Blur",
                true,
                Some("CmdOrCtrl+Alt+-"),
            )?;
            let toggle_sidebar = MenuItem::with_id(
                app,
                "toggle-sidebar",
                "Toggle Sidebar",
                true,
                Some("CmdOrCtrl+B"),
            )?;
            let open_gsd =
                MenuItem::with_id(app, "open-gsd", "GSD Workflow", true, Some("CmdOrCtrl+G"))?;
            let open_chat =
                MenuItem::with_id(app, "open-chat", "Chat", true, Some("CmdOrCtrl+Shift+C"))?;
            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_sidebar)
                .separator()
                .item(&font_increase)
                .item(&font_decrease)
                .item(&font_reset)
                .separator()
                .item(&change_wallpaper)
                .item(&change_theme)
                .item(&opacity_increase)
                .item(&opacity_decrease)
                .item(&blur_increase)
                .item(&blur_decrease)
                .separator()
                .item(&open_gsd)
                .item(&open_chat)
                .build()?;

            // Window menu
            let prev_tab = MenuItem::with_id(
                app,
                "prev-tab",
                "Show Previous Tab",
                true,
                Some("CmdOrCtrl+Shift+["),
            )?;
            let next_tab = MenuItem::with_id(
                app,
                "next-tab",
                "Show Next Tab",
                true,
                Some("CmdOrCtrl+Shift+]"),
            )?;
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .item(&PredefinedMenuItem::maximize(app, None)?)
                .separator()
                .item(&prev_tab)
                .item(&next_tab)
                .separator()
                .fullscreen()
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])
                .build()?;

            app.set_menu(menu)?;

            // T3-style transparent titlebar: traffic lights visible, title hidden,
            // content extends behind title bar area (equivalent to Electron hiddenInset)
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    window
                        .with_webview(|webview| {
                            #[allow(deprecated, unexpected_cfgs)]
                            unsafe {
                                use cocoa::appkit::{
                                    NSView, NSWindow, NSWindowStyleMask,
                                    NSWindowTitleVisibility,
                                };
                                use cocoa::base::{id, YES};

                                let ns_window = webview.ns_window() as id;

                                // Extend content behind the title bar
                                let mut style_mask = ns_window.styleMask();
                                style_mask |=
                                    NSWindowStyleMask::NSFullSizeContentViewWindowMask;
                                ns_window.setStyleMask_(style_mask);

                                // Make title bar transparent and hide title text
                                ns_window.setTitlebarAppearsTransparent_(YES);
                                ns_window.setTitleVisibility_(
                                    NSWindowTitleVisibility::NSWindowTitleHidden,
                                );

                                let content_view = ns_window.contentView();
                                content_view.setWantsLayer(YES);
                            }
                        })
                        .map_err(|e| e.to_string())?;
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            match id {
                "settings" | "new-terminal" | "close-tab" | "add-project" | "toggle-sidebar"
                | "open-gsd" | "open-chat" | "font-increase" | "font-decrease" | "font-reset"
                | "change-wallpaper" | "change-theme" | "opacity-increase" | "opacity-decrease"
                | "blur-increase" | "blur-decrease" | "prev-tab" | "next-tab"
                | "project-switcher" => {
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
            projects::get_git_status,
            settings::load_settings,
            settings::save_settings,
            settings::pick_wallpaper,
            settings::load_sessions,
            settings::save_sessions,
            fs::read_file,
            fs::read_dir_tree,
            fs::path_exists,
            fs::list_dir,
            fs::find_project_favicon,
            get_env_var,
            chat::check_claude_cli,
            chat::start_claude_chat,
            chat::abort_claude_chat,
            chat::cleanup_claude_chat,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            #[cfg(all(dev, target_os = "macos"))]
            if matches!(event, tauri::RunEvent::Ready) {
                set_dev_dock_icon();
            }
        });
}

#[cfg(all(dev, target_os = "macos"))]
fn set_dev_dock_icon() {
    #[allow(deprecated)]
    unsafe {
        use cocoa::appkit::{NSApplication, NSImage};
        use cocoa::base::nil;
        use cocoa::foundation::NSData;
        use std::ffi::c_void;

        let icon_bytes: &[u8] = include_bytes!("../icons/icon-dev.png");
        let ns_app = NSApplication::sharedApplication(nil);
        let data = NSData::dataWithBytes_length_(
            nil,
            icon_bytes.as_ptr() as *const c_void,
            icon_bytes.len() as u64,
        );
        let image = NSImage::initWithData_(NSImage::alloc(nil), data);
        ns_app.setApplicationIconImage_(image);
    }
}
