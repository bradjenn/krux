import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/appStore'
import { THEME_PRESETS, applyTheme } from '@/lib/themes'
import { cn } from '@/lib/utils'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'

interface Settings {
  theme: string
  font_size: number
  default_shell: string
  line_height: number
  cursor_style: string
  cursor_blink: boolean
  scrollback: number
  font_family: string
  background_image: string | null
  background_opacity: number
  background_blur: number
}

type Section = 'appearance' | 'terminal' | 'shortcuts'

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts' },
]

const IS_MAC = navigator.platform.toUpperCase().includes('MAC')
const MOD = IS_MAC ? '\u2318' : 'Ctrl+'

const SHORTCUT_GROUPS: { label: string; shortcuts: { action: string; keys: string }[] }[] = [
  {
    label: 'General',
    shortcuts: [
      { action: 'Settings', keys: `${MOD},` },
      { action: 'Toggle Sidebar', keys: `${MOD}B` },
      { action: 'Switch Project', keys: `${MOD}K` },
    ],
  },
  {
    label: 'Tabs',
    shortcuts: [
      { action: 'New Terminal', keys: `${MOD}T` },
      { action: 'Close Tab', keys: `${MOD}W` },
      { action: 'Previous Tab', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}[` },
      { action: 'Next Tab', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}]` },
      { action: 'Jump to Tab 1–9', keys: `${MOD}1 – ${MOD}9` },
    ],
  },
  {
    label: 'View',
    shortcuts: [
      { action: 'Increase Font Size', keys: `${MOD}=` },
      { action: 'Decrease Font Size', keys: `${MOD}-` },
      { action: 'Reset Font Size', keys: `${MOD}0` },
      { action: 'Change Wallpaper', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}B` },
      { action: 'Increase Opacity', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}=` },
      { action: 'Decrease Opacity', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}-` },
      { action: 'Increase Blur', keys: `${MOD}${IS_MAC ? '\u2325' : 'Alt+'}=` },
      { action: 'Decrease Blur', keys: `${MOD}${IS_MAC ? '\u2325' : 'Alt+'}-` },
    ],
  },
  {
    label: 'Plugins',
    shortcuts: [
      { action: 'GSD Workflow', keys: `${MOD}G` },
      { action: 'Chat', keys: `${MOD}${IS_MAC ? '\u21E7' : 'Shift+'}C` },
    ],
  },
]

interface SettingsPageProps {
  onClose: () => void
}

export default function SettingsPage({ onClose }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('appearance')
  const { theme, setTheme, setFontSize, setLineHeight, setCursorStyle, setCursorBlink, setScrollback, setFontFamily, backgroundImage, setBackgroundImage, backgroundOpacity, setBackgroundOpacity, backgroundBlur, setBackgroundBlur } = useAppStore()

  useEffect(() => {
    invoke<Settings>('load_settings').then(setSettings)
  }, [])

  const save = (updated: Settings) => {
    setSettings(updated)
    invoke('save_settings', { settings: updated })
  }

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
    applyTheme(themeId)
    if (settings) save({ ...settings, theme: themeId })
  }

  const handleWallpaperChange = (value: string | null) => {
    setBackgroundImage(value)
    if (settings) save({ ...settings, background_image: value })
  }

  const handlePickCustomWallpaper = async () => {
    const path = await invoke<string | null>('pick_wallpaper')
    if (path) handleWallpaperChange(path)
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    save(updated)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header — centered */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="w-full max-w-5xl px-8">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-100 cursor-pointer"
          >
            <ChevronLeft size={18} />
            <span className="text-lg font-semibold text-foreground">Settings</span>
          </button>
        </div>
      </div>

      {/* Body — full-width scroll container so scrollbar sits at screen edge */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex justify-center pb-8">
          <div className="flex w-full max-w-5xl px-8">
            {/* Nav — sticky so it stays visible while content scrolls */}
            <nav className="shrink-0 pr-8 pt-2 sticky top-0 self-start whitespace-nowrap">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-colors duration-100 cursor-pointer",
                    activeSection === item.id
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Content — border on left, padding inside */}
            <div className="flex-1 border-l border-border pl-8 pt-2">
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-sm font-medium text-foreground">Appearance</h2>

              <SettingRow label="Theme" description="Choose a color scheme for the app">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(THEME_PRESETS).map(([id, preset]) => (
                    <button
                      key={id}
                      onClick={() => handleThemeChange(id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs transition-all duration-150 cursor-pointer border",
                        theme === id
                          ? "border-primary bg-primary/[0.06] text-foreground"
                          : "border-border bg-surface text-muted-foreground hover:border-dim"
                      )}
                    >
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full" style={{ background: preset.ui.accent }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: preset.ui.accent2 }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: preset.ui.bg }} />
                      </div>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Background image" description="Show a wallpaper behind the content area">
                <div className="grid grid-cols-4 gap-2">
                  {/* None option */}
                  <button
                    onClick={() => handleWallpaperChange(null)}
                    className={cn(
                      "flex items-center justify-center h-16 rounded-md text-xs border transition-all duration-150 cursor-pointer",
                      !backgroundImage
                        ? "border-primary bg-primary/[0.06] text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:border-dim"
                    )}
                  >
                    None
                  </button>
                  {/* Preset thumbnails */}
                  {WALLPAPER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleWallpaperChange(preset.id)}
                      className={cn(
                        "relative h-16 rounded-md overflow-hidden border transition-all duration-150 cursor-pointer",
                        backgroundImage === preset.id
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:border-dim"
                      )}
                    >
                      <img
                        src={`/wallpapers/${preset.file}`}
                        alt={preset.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                        <span className="text-[10px] text-white/90">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                  {/* Custom option */}
                  <button
                    onClick={handlePickCustomWallpaper}
                    className={cn(
                      "flex items-center justify-center h-16 rounded-md text-xs border border-dashed transition-all duration-150 cursor-pointer",
                      backgroundImage && !backgroundImage.startsWith('preset:')
                        ? "border-primary bg-primary/[0.06] text-foreground"
                        : "border-border text-muted-foreground hover:border-dim"
                    )}
                  >
                    Custom...
                  </button>
                </div>
              </SettingRow>

              {backgroundImage && (
                <>
                <SettingRow label="Background opacity" description="How translucent the terminal overlay is (lower = more wallpaper visible)">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={settings?.background_opacity ?? backgroundOpacity}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        updateSetting('background_opacity', val)
                        setBackgroundOpacity(val)
                      }}
                      className="w-48 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground w-10 tabular-nums">
                      {Math.round((settings?.background_opacity ?? backgroundOpacity) * 100)}%
                    </span>
                  </div>
                </SettingRow>

                <SettingRow label="Background blur" description="Blur the wallpaper image behind the terminal">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={1}
                      value={settings?.background_blur ?? backgroundBlur}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        updateSetting('background_blur', val)
                        setBackgroundBlur(val)
                      }}
                      className="w-48 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground w-10 tabular-nums">
                      {settings?.background_blur ?? backgroundBlur}px
                    </span>
                  </div>
                </SettingRow>
                </>
              )}
            </div>
          )}

          {activeSection === 'terminal' && (
            <div className="space-y-6">
              <h2 className="text-sm font-medium text-foreground">Terminal</h2>

              <SettingRow label="Font family" description="Primary font for the terminal">
                <Input
                  value={settings?.font_family ?? 'MesloLGS Nerd Font'}
                  onChange={(e) => {
                    updateSetting('font_family', e.target.value)
                    setFontFamily(e.target.value)
                  }}
                  className="w-64"
                />
              </SettingRow>

              <SettingRow label="Font size" description="Terminal text size in pixels">
                <Input
                  type="number"
                  min={8}
                  max={32}
                  value={settings?.font_size ?? 14}
                  onChange={(e) => {
                    const size = Number(e.target.value)
                    updateSetting('font_size', size)
                    setFontSize(size)
                  }}
                  className="w-20"
                />
              </SettingRow>

              <SettingRow label="Line height" description="Spacing between lines (1.0 – 2.0)">
                <Input
                  type="number"
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  value={settings?.line_height ?? 1.2}
                  onChange={(e) => {
                    const lh = Number(e.target.value)
                    updateSetting('line_height', lh)
                    setLineHeight(lh)
                  }}
                  className="w-20"
                />
              </SettingRow>

              <SettingRow label="Cursor style" description="Shape of the terminal cursor">
                <div className="flex gap-1.5">
                  {(['block', 'bar', 'underline'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        updateSetting('cursor_style', style)
                        setCursorStyle(style)
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs border transition-colors duration-100 cursor-pointer capitalize",
                        settings?.cursor_style === style
                          ? "border-primary bg-primary/[0.06] text-foreground"
                          : "border-border text-muted-foreground hover:border-dim"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Cursor blink" description="Whether the cursor blinks">
                <Toggle
                  checked={settings?.cursor_blink ?? true}
                  onChange={(v) => {
                    updateSetting('cursor_blink', v)
                    setCursorBlink(v)
                  }}
                />
              </SettingRow>

              <SettingRow label="Scrollback" description="Number of lines kept in scroll history">
                <Input
                  type="number"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={settings?.scrollback ?? 10000}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    updateSetting('scrollback', val)
                    setScrollback(val)
                  }}
                  className="w-28"
                />
              </SettingRow>

              <SettingRow label="Default shell" description="Shell to use when opening new terminals">
                <Input
                  value={settings?.default_shell ?? ''}
                  onChange={(e) => updateSetting('default_shell', e.target.value)}
                  className="w-64"
                />
              </SettingRow>
            </div>
          )}

          {activeSection === 'shortcuts' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-medium text-foreground">Keyboard Shortcuts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All available keyboard shortcuts
                </p>
              </div>

              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] uppercase tracking-widest text-dim mb-3">
                    {group.label}
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={shortcut.action}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5",
                          i !== group.shortcuts.length - 1 && "border-b border-border"
                        )}
                      >
                        <span className="text-[13px] text-foreground">{shortcut.action}</span>
                        <kbd className="px-2 py-0.5 rounded bg-white/[0.06] border border-border text-[12px] text-muted-foreground font-mono tabular-nums">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border pb-5">
      <div className="text-[13px] text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5 mb-3">{description}</div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors duration-150 cursor-pointer",
        checked ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform duration-150",
          checked && "translate-x-4"
        )}
      />
    </button>
  )
}
