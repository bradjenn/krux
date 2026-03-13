import { invoke } from '@/lib/bridge'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'
import { useAppStore } from '@/stores/appStore'

const COLS = 3

interface WallpaperSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

type WallpaperOption =
  | { type: 'none' }
  | { type: 'preset'; id: string; name: string; file: string }
  | { type: 'custom' }

// Static — WALLPAPER_PRESETS never changes at runtime
const ALL_OPTIONS: WallpaperOption[] = [
  { type: 'none' },
  ...WALLPAPER_PRESETS.map((p) => ({
    type: 'preset' as const,
    id: p.id,
    name: p.name,
    file: p.file,
  })),
  { type: 'custom' },
]

export default function WallpaperSwitcher({ isOpen, onClose }: WallpaperSwitcherProps) {
  // Use selectors to avoid re-rendering on unrelated store changes
  const backgroundImage = useAppStore((s) => s.backgroundImage)
  const setBackgroundImage = useAppStore((s) => s.setBackgroundImage)

  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [originalWallpaper, setOriginalWallpaper] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const skipPreviewRef = useRef(false)

  // Memoize filtered list — only recompute when search changes
  const filtered = useMemo<WallpaperOption[]>(
    () =>
      search
        ? ALL_OPTIONS.filter((o) => {
            if (o.type === 'none') return 'none'.includes(search.toLowerCase())
            if (o.type === 'custom') return 'custom'.includes(search.toLowerCase())
            return o.name.toLowerCase().includes(search.toLowerCase())
          })
        : ALL_OPTIONS,
    [search],
  )

  // Stash original wallpaper on open, reset state
  // biome-ignore lint/correctness/useExhaustiveDependencies: backgroundImage and findCurrentIndex are intentionally excluded — this effect must only run when isOpen transitions to true, not when the preview changes the wallpaper
  useEffect(() => {
    if (isOpen) {
      skipPreviewRef.current = true
      setOriginalWallpaper(backgroundImage)
      setSearch('')
      setSelectedIndex(findCurrentIndex())
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
  }, [isOpen])

  function findCurrentIndex(): number {
    if (!backgroundImage) return 0
    const idx = WALLPAPER_PRESETS.findIndex((p) => p.id === backgroundImage)
    return idx >= 0 ? idx + 1 : 0 // +1 because "None" is at index 0
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

  // Live preview: apply wallpaper as selection changes
  const applyPreview = useCallback(
    (index: number) => {
      const option = filtered[index]
      if (!option) return
      if (option.type === 'none') {
        setBackgroundImage(null)
      } else if (option.type === 'preset') {
        setBackgroundImage(option.id)
      }
      // Don't preview 'custom' — it requires a file picker
    },
    [filtered, setBackgroundImage],
  )

  useEffect(() => {
    if (skipPreviewRef.current) {
      skipPreviewRef.current = false
      return
    }
    if (isOpen && filtered[selectedIndex]?.type !== 'custom') {
      applyPreview(selectedIndex)
    }
  }, [selectedIndex, isOpen, applyPreview, filtered])

  // biome-ignore lint/correctness/useExhaustiveDependencies: save is a stable local function that only uses invoke (external) and its parameter
  const confirm = useCallback(
    (option: WallpaperOption) => {
      if (option.type === 'custom') {
        // Open file picker, then confirm
        invoke<string | null>('pick_wallpaper').then((path) => {
          if (path) {
            setBackgroundImage(path)
            save(path)
          } else {
            // Cancelled — revert
            setBackgroundImage(originalWallpaper)
          }
          onClose()
        })
        return
      }

      const value = option.type === 'none' ? null : option.id
      setBackgroundImage(value)
      save(value)
      onClose()
    },
    [originalWallpaper, onClose, setBackgroundImage],
  )

  function save(value: string | null) {
    invoke<Record<string, unknown>>('load_settings').then((s) => {
      invoke('save_settings', { settings: { ...s, background_image: value } })
    })
  }

  const revert = useCallback(() => {
    setBackgroundImage(originalWallpaper)
    onClose()
  }, [originalWallpaper, setBackgroundImage, onClose])

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

  function isActive(option: WallpaperOption): boolean {
    if (option.type === 'none') return !originalWallpaper
    if (option.type === 'preset') return originalWallpaper === option.id
    return false
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
        aria-label="Close wallpaper switcher"
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
            placeholder="Search wallpapers..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="w-full bg-transparent text-foreground border-none outline-none"
            style={{ fontSize: 15, fontFamily: 'inherit' }}
          />
        </div>

        {/* Thumbnail grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-3 gap-2 overflow-y-auto p-3"
          style={{ maxHeight: 340 }}
        >
          {filtered.map((option, index) => {
            const selected = index === selectedIndex
            const active = isActive(option)

            if (option.type === 'none') {
              return (
                <button
                  type="button"
                  key="none"
                  onClick={() => confirm(option)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex items-center justify-center h-20 rounded-lg text-xs font-medium border transition-all duration-100 cursor-pointer',
                    selected
                      ? 'border-primary ring-1 ring-primary text-foreground'
                      : active
                        ? 'border-primary/50 text-foreground'
                        : 'border-border text-muted-foreground hover:border-dim',
                  )}
                >
                  None
                </button>
              )
            }

            if (option.type === 'custom') {
              return (
                <button
                  type="button"
                  key="custom"
                  onClick={() => confirm(option)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex items-center justify-center h-20 rounded-lg text-xs font-medium border border-dashed transition-all duration-100 cursor-pointer',
                    selected
                      ? 'border-primary ring-1 ring-primary text-foreground'
                      : 'border-border text-muted-foreground hover:border-dim',
                  )}
                >
                  Custom...
                </button>
              )
            }

            return (
              <button
                type="button"
                key={option.id}
                onClick={() => confirm(option)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'relative h-20 rounded-lg overflow-hidden border transition-all duration-100 cursor-pointer',
                  selected
                    ? 'border-primary ring-1 ring-primary'
                    : active
                      ? 'border-primary/50'
                      : 'border-border hover:border-dim',
                )}
              >
                <img
                  src={`./wallpapers/${option.file}`}
                  alt={option.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                  <span className="text-[11px] text-white/90">{option.name}</span>
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 py-8 text-center text-sm text-dim">
              No matching wallpapers
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="tui-panel-footer">
          <span>
            <kbd className="text-muted-foreground">←→↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="text-muted-foreground">↵</kbd> apply
          </span>
          <span>
            <kbd className="text-muted-foreground">esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  )
}
