import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../stores/appStore'
import { THEME_PRESETS, applyTheme } from '../../lib/themes'

interface Settings {
  theme: string
  font_size: number
  default_shell: string
}

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    if (isOpen) {
      invoke<Settings>('load_settings').then(setSettings)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleThemeChange = async (themeId: string) => {
    setTheme(themeId)
    applyTheme(themeId)
    if (settings) {
      const updated = { ...settings, theme: themeId }
      setSettings(updated)
      await invoke('save_settings', { settings: updated })
    }
  }

  const handleSave = async () => {
    if (settings) {
      await invoke('save_settings', { settings })
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: 'fade-in 0.15s ease' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 460,
          maxHeight: '85vh',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'scale-in 0.15s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors duration-100"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 110px)' }}>
          {/* Theme */}
          <div>
            <label
              className="block mb-2 uppercase tracking-wider font-medium"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded transition-all duration-150"
                  style={{
                    border: `1px solid ${theme === id ? 'var(--accent)' : 'var(--border)'}`,
                    background: theme === id ? 'rgba(71,255,156,0.06)' : 'var(--bg)',
                    fontSize: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (theme !== id) {
                      e.currentTarget.style.borderColor = 'var(--text-dim)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== id) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                >
                  <div className="flex gap-1">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.accent }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.accent2 }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.bg }} />
                  </div>
                  <span style={{ color: theme === id ? 'var(--text)' : 'var(--text-muted)' }}>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Shell */}
          <div>
            <label
              className="block mb-2 uppercase tracking-wider font-medium"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              Default Shell
            </label>
            <input
              type="text"
              value={settings?.default_shell ?? ''}
              onChange={(e) => settings && setSettings({ ...settings, default_shell: e.target.value })}
              className="w-full px-3 py-2 rounded transition-colors duration-150"
              style={{
                fontSize: 13,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent2)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Font Size */}
          <div>
            <label
              className="block mb-2 uppercase tracking-wider font-medium"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              Font Size
            </label>
            <input
              type="number"
              min={8}
              max={32}
              value={settings?.font_size ?? 14}
              onChange={(e) => settings && setSettings({ ...settings, font_size: Number(e.target.value) })}
              className="w-24 px-3 py-2 rounded transition-colors duration-150"
              style={{
                fontSize: 13,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent2)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded transition-all duration-150"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-dim)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded font-medium transition-all duration-150"
            style={{
              fontSize: 12,
              background: 'var(--accent)',
              color: 'var(--bg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = ''
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
