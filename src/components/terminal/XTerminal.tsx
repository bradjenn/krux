import { FitAddon } from '@xterm/addon-fit'
// WebGL addon removed — canvas renderer handles Unicode glyphs (braille, spinners) better
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import {
  resizeTerminal,
  useTerminalExit,
  useTerminalOutput,
  writeTerminal,
} from '../../hooks/useTauri'
import { getTerminalTheme, hexToRgba } from '../../lib/themes'
import { useAppStore } from '../../stores/appStore'

/**
 * When wallpaper is active, make xterm's own background fully transparent
 * so only the container div's overlay is visible. This prevents double-compositing
 * where the container rgba + canvas rgba stack to produce a darker terminal area.
 */
function getTranslucentTheme(themeId: string, hasWallpaper: boolean) {
  const base = getTerminalTheme(themeId)
  if (!hasWallpaper) return base
  return { ...base, background: '#00000000' }
}

/** The single uniform overlay color for the container div when wallpaper is active. */
function getOverlayBg(themeId: string, alpha: number): string {
  const base = getTerminalTheme(themeId)
  return hexToRgba(base.background ?? '#000000', alpha)
}

interface XTerminalProps {
  projectPath: string
  existingTerminalId: string
  isActive?: boolean
  onExit?: () => void
}

export default function XTerminal({ existingTerminalId, isActive, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [terminalId] = useState<string>(existingTerminalId)
  const theme = useAppStore((s) => s.theme)
  const fontSize = useAppStore((s) => s.fontSize)
  const lineHeight = useAppStore((s) => s.lineHeight)
  const cursorStyle = useAppStore((s) => s.cursorStyle)
  const cursorBlink = useAppStore((s) => s.cursorBlink)
  const fontFamily = useAppStore((s) => s.fontFamily)
  const backgroundImage = useAppStore((s) => s.backgroundImage)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const hasWallpaper = !!backgroundImage
  const termTheme = getTranslucentTheme(theme, hasWallpaper)
  const containerBg = hasWallpaper ? getOverlayBg(theme, backgroundOpacity) : termTheme.background

  // Subscribe to PTY output → write to xterm
  useTerminalOutput(terminalId, (data) => {
    terminalRef.current?.write(data)
  })

  // Subscribe to PTY exit
  useTerminalExit(terminalId, () => {
    onExit?.()
  })

  // Re-fit and focus when becoming visible
  useEffect(() => {
    if (isActive && terminalRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
        terminalRef.current?.focus()
      })
    }
  }, [isActive])

  // Update xterm options when settings change
  useEffect(() => {
    const term = terminalRef.current
    if (!term) return
    term.options.theme = getTranslucentTheme(theme, hasWallpaper)
    term.options.fontSize = fontSize
    term.options.lineHeight = lineHeight
    term.options.cursorStyle = cursorStyle
    term.options.cursorBlink = cursorBlink
    term.options.fontFamily = `"${fontFamily}", "JetBrains Mono", "SF Mono", "Fira Code", monospace`
    fitAddonRef.current?.fit()
  }, [theme, fontSize, lineHeight, cursorStyle, cursorBlink, fontFamily, hasWallpaper])

  useEffect(() => {
    if (!containerRef.current) return

    const s = useAppStore.getState()

    const term = new Terminal({
      allowTransparency: true,
      theme: getTranslucentTheme(s.theme, !!s.backgroundImage),
      fontFamily: `"${s.fontFamily}", "JetBrains Mono", "SF Mono", "Fira Code", monospace`,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      cursorBlink: s.cursorBlink,
      cursorStyle: s.cursorStyle,
      scrollback: s.scrollback,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    // Unicode 11 support for proper rendering of braille, box-drawing, emoji, etc.
    const unicodeAddon = new Unicode11Addon()
    term.loadAddon(unicodeAddon)
    term.unicode.activeVersion = '11'

    term.open(containerRef.current)

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Fit immediately after open and send correct size to PTY
    // This minimizes the time the PTY runs at the wrong 80x24 default
    fitAddon.fit()
    resizeTerminal(terminalId, term.cols, term.rows)

    // Second fit on next frame to catch any layout shifts
    requestAnimationFrame(() => {
      fitAddon.fit()
    })

    // Keystroke → PTY stdin
    const dataDisposable = term.onData((data) => {
      writeTerminal(terminalId, data)
    })

    // Xterm resize → PTY resize
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      resizeTerminal(terminalId, cols, rows)
    })

    // Container resize → fit
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize to avoid excessive calls
      requestAnimationFrame(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
        }
      })
    })
    resizeObserver.observe(containerRef.current)

    // Focus terminal
    term.focus()

    return () => {
      resizeObserver.disconnect()
      dataDisposable.dispose()
      resizeDisposable.dispose()
      term.dispose()
      // Don't close the PTY here — the tab system manages PTY lifecycle.
      // closeTerminal is called from the store's closeTab action via Shell.
    }
  }, [terminalId])

  return (
    <div
      ref={containerRef}
      className={`h-full w-full${hasWallpaper ? ' terminal-transparent' : ''}`}
      style={{
        padding: '8px 8px 4px 8px',
        background: containerBg,
      }}
    />
  )
}
