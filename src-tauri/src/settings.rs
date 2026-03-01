use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub font_size: u16,
    pub default_shell: String,
}

impl Default for Settings {
    fn default() -> Self {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        Self {
            theme: "ghostty".to_string(),
            font_size: 14,
            default_shell: shell,
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
