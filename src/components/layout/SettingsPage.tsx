import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/appStore'
import { THEME_PRESETS, applyTheme } from '@/lib/themes'
import { cn } from '@/lib/utils'

interface Settings {
  theme: string
  font_size: number
  default_shell: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    invoke<Settings>('load_settings').then(setSettings)
  }, [])

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
    }
  }

  return (
    <div
      className="h-full overflow-y-auto bg-background"
    >
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Settings
          </h1>
          <p className="text-xs mt-1 text-dim">
            Configure your terminal manager
          </p>
        </div>

        {/* Theme */}
        <section>
          <label className="block mb-3 uppercase tracking-wide font-medium text-[11px] text-muted-foreground">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {Object.entries(THEME_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                onClick={() => handleThemeChange(id)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-3 rounded-md text-xs transition-all duration-150 cursor-pointer border",
                  theme === id
                    ? "border-primary bg-green/[0.06] text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-dim"
                )}
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
        </section>

        {/* Default Shell */}
        <section>
          <label className="block mb-3 uppercase tracking-wide font-medium text-[11px] text-muted-foreground">
            Default Shell
          </label>
          <Input
            value={settings?.default_shell ?? ''}
            onChange={(e) => settings && setSettings({ ...settings, default_shell: e.target.value })}
            className="max-w-xs"
          />
        </section>

        {/* Font Size */}
        <section>
          <label className="block mb-3 uppercase tracking-wide font-medium text-[11px] text-muted-foreground">
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
        </section>

        {/* Save */}
        <div>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
