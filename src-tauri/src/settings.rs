use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub font_size: u16,
    pub default_shell: String,
    #[serde(default = "default_line_height")]
    pub line_height: f32,
    #[serde(default = "default_cursor_style")]
    pub cursor_style: String,
    #[serde(default = "default_true")]
    pub cursor_blink: bool,
    #[serde(default = "default_scrollback")]
    pub scrollback: u32,
    #[serde(default = "default_font_family")]
    pub font_family: String,
    #[serde(default)]
    pub background_image: Option<String>,
}

fn default_line_height() -> f32 {
    1.2
}
fn default_cursor_style() -> String {
    "block".to_string()
}
fn default_true() -> bool {
    true
}
fn default_scrollback() -> u32 {
    10000
}
fn default_font_family() -> String {
    "MesloLGS Nerd Font".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        Self {
            theme: "ghostty".to_string(),
            font_size: 14,
            default_shell: shell,
            line_height: default_line_height(),
            cursor_style: default_cursor_style(),
            cursor_blink: default_true(),
            scrollback: default_scrollback(),
            font_family: default_font_family(),
            background_image: None,
        }
    }
}

pub struct SettingsState {
    config_dir: PathBuf,
}

impl SettingsState {
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
        let config_dir = home.join(".cc-manager");
        fs::create_dir_all(&config_dir).ok();
        Self { config_dir }
    }

    fn settings_path(&self) -> PathBuf {
        self.config_dir.join("settings.json")
    }
}

#[tauri::command]
pub fn load_settings(state: State<'_, SettingsState>) -> Settings {
    let path = state.settings_path();
    if !path.exists() {
        return Settings::default();
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(state: State<'_, SettingsState>, settings: Settings) -> Result<(), String> {
    let path = state.settings_path();
    let tmp = path.with_extension("json.tmp");
    let data =
        serde_json::to_string_pretty(&settings).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&tmp, &data).map_err(|e| format!("Write error: {}", e))?;
    fs::rename(&tmp, &path).map_err(|e| format!("Rename error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn pick_wallpaper(app: tauri::AppHandle) -> Option<String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "gif", "webp", "bmp"])
        .blocking_pick_file();
    file.and_then(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
}
