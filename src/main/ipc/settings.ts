import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CONFIG_DIR = path.join(os.homedir(), '.krux')

// Ensure config dir exists
fs.mkdirSync(CONFIG_DIR, { recursive: true })

interface Settings {
  theme: string
  font_size: number
  default_shell: string
  line_height: number
  cursor_style: string
  cursor_blink: boolean
  scrollback: number
  font_family: string
  terminal_vibrancy: string
  background_image: string | null
  background_opacity: number
  background_blur: number
  hide_titlebar: boolean
  use_webgl: boolean
}

const DEFAULTS: Settings = {
  theme: 'ghostty',
  font_size: 14,
  default_shell: process.env.SHELL || '/bin/zsh',
  line_height: 1.0,
  cursor_style: 'block',
  cursor_blink: true,
  scrollback: 10000,
  font_family: 'MesloLGS Nerd Font Mono',
  terminal_vibrancy: 'normal',
  background_image: null,
  background_opacity: 0.85,
  background_blur: 0,
  hide_titlebar: false,
  use_webgl: true,
}

function settingsPath(): string {
  return path.join(CONFIG_DIR, 'settings.json')
}

function sessionsPath(): string {
  return path.join(CONFIG_DIR, 'sessions.json')
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const data = fs.readFileSync(filePath, 'utf-8')
    return { ...fallback, ...JSON.parse(data) }
  } catch {
    return fallback
  }
}

function saveJson(filePath: string, data: unknown): void {
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

ipcMain.handle('load_settings', (): Settings => {
  return loadJson(settingsPath(), DEFAULTS)
})

ipcMain.handle('save_settings', (_event, args: { settings: Settings }): void => {
  saveJson(settingsPath(), args.settings)
})

ipcMain.handle('load_sessions', () => {
  return loadJson(sessionsPath(), { projects: {}, last_active_project_id: null })
})

ipcMain.handle('save_sessions', (_event, args: { sessions: unknown }): void => {
  saveJson(sessionsPath(), args.sessions)
})

ipcMain.handle('pick_wallpaper', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})
