import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'

interface BackgroundAdjusterProps {
  isOpen: boolean
  onClose: () => void
  initialFocus?: 'opacity' | 'blur'
}

const BAR_SEGMENTS = 20

function renderBar(value: number, max: number): string {
  const filled = Math.round((value / max) * BAR_SEGMENTS)
  return '█'.repeat(filled) + '░'.repeat(BAR_SEGMENTS - filled)
}

function save() {
  const { backgroundOpacity, backgroundBlur } = useAppStore.getState()
  invoke<Record<string, unknown>>('load_settings').then((s) => {
    invoke('save_settings', {
      settings: { ...s, background_opacity: backgroundOpacity, background_blur: backgroundBlur },
    })
  })
}

export default function BackgroundAdjuster({
  isOpen,
  onClose,
  initialFocus = 'opacity',
}: BackgroundAdjusterProps) {
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const backgroundBlur = useAppStore((s) => s.backgroundBlur)
  const setBackgroundOpacity = useAppStore((s) => s.setBackgroundOpacity)
  const setBackgroundBlur = useAppStore((s) => s.setBackgroundBlur)

  const [focusedRow, setFocusedRow] = useState<'opacity' | 'blur'>(initialFocus)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const close = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    onClose()
  }, [onClose])

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(close, 2500)
  }, [close])

  // On open: focus the container and start auto-dismiss timer
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Only set focused row on initial open
      setFocusedRow(initialFocus)
      containerRef.current?.focus({ preventScroll: true })
    }
    if (isOpen) {
      resetTimeout()
    }
    wasOpenRef.current = isOpen
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isOpen, initialFocus, resetTimeout])

  // Reset auto-dismiss when values change externally (from menu shortcuts)
  useEffect(() => {
    if (isOpen) resetTimeout()
  }, [backgroundOpacity, backgroundBlur, isOpen, resetTimeout])

  function adjustOpacity(delta: number) {
    const current = useAppStore.getState().backgroundOpacity
    const newVal = Math.min(1, Math.max(0.1, Math.round((current + delta) * 100) / 100))
    setBackgroundOpacity(newVal)
    save()
  }

  function adjustBlur(delta: number) {
    const current = useAppStore.getState().backgroundBlur
    const newVal = Math.min(32, Math.max(0, current + delta))
    setBackgroundBlur(newVal)
    save()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault()
        setFocusedRow('blur')
        resetTimeout()
        break
      case 'k':
      case 'ArrowUp':
        e.preventDefault()
        setFocusedRow('opacity')
        resetTimeout()
        break
      case 'h':
      case 'ArrowLeft':
        e.preventDefault()
        if (focusedRow === 'opacity') adjustOpacity(-0.05)
        else adjustBlur(-2)
        break
      case 'l':
      case 'ArrowRight':
        e.preventDefault()
        if (focusedRow === 'opacity') adjustOpacity(0.05)
        else adjustBlur(2)
        break
      case 'Enter':
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0"
        onClick={close}
        aria-label="Close background adjuster"
        tabIndex={-1}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className="relative tui-panel w-[340px]"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="dialog"
      >
        <div className="tui-panel-header">Background</div>

        <div className="p-3 space-y-1">
          {/* Opacity row */}
          <div
            className="flex items-center gap-3 px-2 py-1.5 rounded"
            style={focusedRow === 'opacity' ? { background: 'rgba(255,255,255,0.06)' } : undefined}
          >
            <span className="text-[11px] text-muted-foreground w-14">Opacity</span>
            <span className="text-[11px] tracking-tight text-foreground flex-1 leading-none">
              {renderBar(backgroundOpacity, 1)}
            </span>
            <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums">
              {Math.round(backgroundOpacity * 100)}%
            </span>
          </div>

          {/* Blur row */}
          <div
            className="flex items-center gap-3 px-2 py-1.5 rounded"
            style={focusedRow === 'blur' ? { background: 'rgba(255,255,255,0.06)' } : undefined}
          >
            <span className="text-[11px] text-muted-foreground w-14">Blur</span>
            <span className="text-[11px] tracking-tight text-foreground flex-1 leading-none">
              {renderBar(backgroundBlur, 32)}
            </span>
            <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums">
              {backgroundBlur}px
            </span>
          </div>
        </div>

        <div className="tui-panel-footer">
          <span>
            <kbd className="text-muted-foreground">↑↓</kbd> select
          </span>
          <span>
            <kbd className="text-muted-foreground">←→</kbd> adjust
          </span>
          <span>
            <kbd className="text-muted-foreground">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
