import { useState, useEffect } from 'react'
import { X, Settings as SettingsIcon } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../stores/appStore'
import { THEME_PRESETS, applyTheme } from '../../lib/themes'

interface Settings {
  theme: string
  font_size: number
  default_shell: string
}

export default function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    if (isOpen) {
      invoke<Settings>('load_settings').then(setSettings)
    }
  }, [isOpen])

  const handleThemeChange = async (themeId: string) => {
    setTheme(themeId)
    applyTheme(themeId)

    if (settings) {
      const updated = { ...settings, theme: themeId }
      setSettings(updated)
      await invoke('save_settings', { settings: updated })
    }
  }

  const handleFontSizeChange = async (size: number) => {
    if (settings) {
      const updated = { ...settings, font_size: size }
      setSettings(updated)
      await invoke('save_settings', { settings: updated })
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
        style={{ color: 'var(--text-muted)' }}
        title="Settings"
      >
        <SettingsIcon size={14} />
        <span>Settings</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />

      {/* Dialog */}
      <div
        className="relative w-[480px] max-h-[80vh] rounded-lg border shadow-2xl overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg2)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Settings
          </h2>
          <button onClick={() => setIsOpen(false)} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme picker */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className="flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors"
                  style={{
                    borderColor: theme === id ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: theme === id ? 'var(--bg)' : 'transparent',
                    color: 'var(--text)',
                  }}
                >
                  {/* Color preview dots */}
                  <div className="flex gap-0.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: preset.ui.accent }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: preset.ui.accent2 }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: preset.ui.bg }}
                    />
                  </div>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Font Size: {settings?.font_size ?? 14}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={settings?.font_size ?? 14}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Default shell */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Default Shell
            </label>
            <input
              type="text"
              value={settings?.default_shell ?? ''}
              onChange={(e) => {
                if (settings) setSettings({ ...settings, default_shell: e.target.value })
              }}
              onBlur={() => {
                if (settings) invoke('save_settings', { settings })
              }}
              className="w-full px-3 py-1.5 text-xs rounded border bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
