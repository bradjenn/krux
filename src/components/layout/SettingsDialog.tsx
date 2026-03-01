import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/appStore'
import { THEME_PRESETS, applyTheme } from '@/lib/themes'

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your terminal manager</DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 130px)' }}>
          {/* Theme */}
          <div>
            <label className="block mb-2 uppercase tracking-wide font-medium text-[11px] text-[var(--text-muted)]">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs transition-all duration-150 cursor-pointer"
                  style={{
                    border: `1px solid ${theme === id ? 'var(--accent)' : 'var(--border)'}`,
                    background: theme === id ? 'rgba(71,255,156,0.06)' : 'var(--bg)',
                    color: theme === id ? 'var(--text)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (theme !== id) e.currentTarget.style.borderColor = 'var(--text-dim)'
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== id) e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <div className="flex gap-1">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.accent }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.accent2 }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.ui.bg }} />
                  </div>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Shell */}
          <div>
            <label className="block mb-2 uppercase tracking-wide font-medium text-[11px] text-[var(--text-muted)]">
              Default Shell
            </label>
            <Input
              value={settings?.default_shell ?? ''}
              onChange={(e) => settings && setSettings({ ...settings, default_shell: e.target.value })}
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block mb-2 uppercase tracking-wide font-medium text-[11px] text-[var(--text-muted)]">
              Font Size
            </label>
            <Input
              type="number"
              min={8}
              max={32}
              value={settings?.font_size ?? 14}
              onChange={(e) => settings && setSettings({ ...settings, font_size: Number(e.target.value) })}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
