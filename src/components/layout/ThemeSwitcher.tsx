import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { THEME_PRESETS, applyTheme } from '@/lib/themes'
import { useAppStore } from '@/stores/appStore'

const COLS = 3

interface ThemeSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

interface ThemeOption {
  id: string
  name: string
  accent: string
  accent2: string
  bg: string
}

// Static — THEME_PRESETS never changes at runtime
const ALL_OPTIONS: ThemeOption[] = Object.entries(THEME_PRESETS).map(([id, preset]) => ({
  id,
  name: preset.name,
  accent: preset.ui.accent,
  accent2: preset.ui.accent2,
  bg: preset.ui.bg,
}))

export default function ThemeSwitcher({ isOpen, onClose }: ThemeSwitcherProps) {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [originalTheme, setOriginalTheme] = useState<string>('ghostty')
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const skipPreviewRef = useRef(false)

  // Memoize filtered list — only recompute when search changes
  const filtered = useMemo<ThemeOption[]>(
    () =>
      search
        ? ALL_OPTIONS.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
        : ALL_OPTIONS,
    [search],
  )

  // Stash original theme on open, reset state
  // biome-ignore lint/correctness/useExhaustiveDependencies: theme and findCurrentIndex are intentionally excluded — this effect must only run when isOpen transitions to true, not when the preview changes the theme
  useEffect(() => {
    if (isOpen) {
      skipPreviewRef.current = true
      setOriginalTheme(theme)
      setSearch('')
      setSelectedIndex(findCurrentIndex())
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  function findCurrentIndex(): number {
    const idx = ALL_OPTIONS.findIndex((o) => o.id === theme)
    return idx >= 0 ? idx : 0
  }

  // Clamp selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  // Scroll selected item into view
  useEffect(() => {
    if (!gridRef.current) return
    const item = gridRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Live preview: apply theme as selection changes
  const applyPreview = useCallback(
    (index: number) => {
      const option = filtered[index]
      if (!option) return
      applyTheme(option.id)
      setTheme(option.id)
    },
    [filtered, setTheme],
  )

  useEffect(() => {
    if (skipPreviewRef.current) {
      skipPreviewRef.current = false
      return
    }
    if (isOpen) {
      applyPreview(selectedIndex)
    }
  }, [selectedIndex, isOpen, applyPreview])

  // biome-ignore lint/correctness/useExhaustiveDependencies: save is a stable local function that only uses invoke (external) and its parameter
  const confirm = useCallback(
    (option: ThemeOption) => {
      applyTheme(option.id)
      setTheme(option.id)
      save(option.id)
      onClose()
    },
    [onClose, setTheme],
  )

  function save(value: string) {
    invoke<Record<string, unknown>>('load_settings').then((s) => {
      invoke('save_settings', { settings: { ...s, theme: value } })
    })
  }

  const revert = useCallback(() => {
    applyTheme(originalTheme)
    setTheme(originalTheme)
    onClose()
  }, [originalTheme, setTheme, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowLeft':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + COLS, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - COLS, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[selectedIndex]) {
          confirm(filtered[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        revert()
        break
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '18vh' }}
    >
      {/* Backdrop — click to dismiss */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={revert}
        aria-label="Close theme switcher"
        tabIndex={-1}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg tui-panel overflow-hidden"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        {/* Search input */}
        <div className="border-b border-border" style={{ padding: '12px 16px' }}>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="w-full bg-transparent text-foreground border-none outline-none"
            style={{ fontSize: 15, fontFamily: 'inherit' }}
          />
        </div>

        {/* Theme grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-3 gap-2 overflow-y-auto p-3"
          style={{ maxHeight: 340 }}
        >
          {filtered.map((option, index) => {
            const selected = index === selectedIndex
            const active = originalTheme === option.id

            return (
              <button
                type="button"
                key={option.id}
                onClick={() => confirm(option)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 h-20 rounded-lg border transition-all duration-100 cursor-pointer',
                  selected
                    ? 'border-primary ring-1 ring-primary'
                    : active
                      ? 'border-primary/50'
                      : 'border-border hover:border-dim',
                )}
                style={{ background: option.bg }}
              >
                {/* Color dots */}
                <div className="flex gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ background: option.accent }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ background: option.accent2 }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ background: option.bg }}
                  />
                </div>
                <span className="text-[11px] font-medium" style={{ color: '#fff' }}>
                  {option.name}
                </span>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 py-8 text-center text-sm text-dim">
              No matching themes
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="tui-panel-footer">
          <span>
            <kbd className="text-muted-foreground">&#8592;&#8594;&#8593;&#8595;</kbd> navigate
          </span>
          <span>
            <kbd className="text-muted-foreground">&#8629;</kbd> apply
          </span>
          <span>
            <kbd className="text-muted-foreground">esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  )
}
