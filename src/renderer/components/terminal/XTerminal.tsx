import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import {
  resizeTerminal,
  useTerminalExit,
  useTerminalOutput,
  writeTerminal,
} from '../../hooks/useTerminal'
import { getTerminalTheme } from '../../lib/themes'
import { useAppStore } from '../../stores/appStore'

/** Always return the opaque theme — xterm WebGL can't do true transparency. */
function getTheme(themeId: string, vibrancy: 'normal' | 'vivid' | 'high') {
  return getTerminalTheme(themeId, vibrancy)
}

function getMinimumContrastRatio(vibrancy: 'normal' | 'vivid' | 'high') {
  switch (vibrancy) {
    case 'vivid':
      return 4.5
    case 'high':
      return 7
    default:
      return 1
  }
}

interface XTerminalProps {
  existingTerminalId: string
  isActive?: boolean
  onExit?: () => void
}

/** Shell-escape a file path for safe pasting into a terminal. */
function shellEscape(path: string): string {
  if (/[^a-zA-Z0-9_./:@~=-]/.test(path)) return `'${path.replace(/'/g, "'\\''")}'`
  return path
}

export default function XTerminal({ existingTerminalId, isActive, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const [terminalId] = useState<string>(existingTerminalId)
  const [dragOver, setDragOver] = useState(false)
  const theme = useAppStore((s) => s.theme)
  const fontSize = useAppStore((s) => s.fontSize)
  const lineHeight = useAppStore((s) => s.lineHeight)
  const cursorStyle = useAppStore((s) => s.cursorStyle)
  const cursorBlink = useAppStore((s) => s.cursorBlink)
  const fontFamily = useAppStore((s) => s.fontFamily)
  const terminalVibrancy = useAppStore((s) => s.terminalVibrancy)
  const backgroundImage = useAppStore((s) => s.backgroundImage)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const hasWallpaper = !!backgroundImage

  // Subscribe to PTY output → write to xterm
  useTerminalOutput(terminalId, (data) => {
    terminalRef.current?.write(data)
  })

  // Subscribe to PTY exit
  useTerminalExit(terminalId, () => {
    onExit?.()
  })

  // File drag-and-drop: use HTML5 native drag events and paste paths into PTY
  useEffect(() => {
    if (!isActive) {
      setDragOver(false)
      return
    }

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isActive) setDragOver(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        // In Electron, File objects have a .path property with the full filesystem path
        const filePath = (files[i] as File & { path?: string }).path
        if (filePath) paths.push(filePath)
      }

      if (paths.length === 0) return

      const escaped = paths.map(shellEscape).join(' ')
      writeTerminal(terminalId, escaped)
      // Re-focus the terminal after drop
      requestAnimationFrame(() => terminalRef.current?.focus())
    }

    wrapper.addEventListener('dragover', handleDragOver)
    wrapper.addEventListener('dragenter', handleDragEnter)
    wrapper.addEventListener('dragleave', handleDragLeave)
    wrapper.addEventListener('drop', handleDrop)

    return () => {
      wrapper.removeEventListener('dragover', handleDragOver)
      wrapper.removeEventListener('dragenter', handleDragEnter)
      wrapper.removeEventListener('dragleave', handleDragLeave)
      wrapper.removeEventListener('drop', handleDrop)
    }
  }, [isActive, terminalId])

  // Re-fit and focus when becoming visible
  useEffect(() => {
    if (isActive && terminalRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
        terminalRef.current?.refresh(0, terminalRef.current.rows - 1)
        terminalRef.current?.focus()
      })
    }
  }, [isActive])

  // Update xterm options when settings change
  useEffect(() => {
    const term = terminalRef.current
    if (!term) return
    term.options.theme = getTheme(theme, terminalVibrancy)
    term.options.minimumContrastRatio = getMinimumContrastRatio(terminalVibrancy)
    term.options.fontSize = fontSize
    term.options.lineHeight = lineHeight
    term.options.cursorStyle = cursorStyle
    term.options.cursorBlink = cursorBlink
    term.options.fontFamily = `"${fontFamily}", "Symbols Nerd Font Mono", "Symbols Nerd Font", "JetBrains Mono", "SF Mono", "Fira Code", monospace`
    // Dispose and recreate the WebGL addon so it picks up new cell metrics.
    // clearTextureAtlas() alone races with xterm's internal font measurement.
    if (webglAddonRef.current) {
      webglAddonRef.current.dispose()
      webglAddonRef.current = null
      try {
        const webglAddon = new WebglAddon()
        webglAddon.onContextLoss(() => {
          webglAddon.dispose()
          webglAddonRef.current = null
        })
        term.loadAddon(webglAddon)
        webglAddonRef.current = webglAddon
      } catch {
        // WebGL unavailable — falls back to canvas renderer
      }
    }
    fitAddonRef.current?.fit()
    term.refresh(0, term.rows - 1)
  }, [
    theme,
    terminalVibrancy,
    fontSize,
    lineHeight,
    cursorStyle,
    cursorBlink,
    fontFamily,
    hasWallpaper,
  ])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let disposed = false

    // Build the font-family CSS string with Nerd Font symbol fallback
    function buildFontFamily(family: string) {
      return `"${family}", "Symbols Nerd Font Mono", "Symbols Nerd Font", "JetBrains Mono", "SF Mono", "Fira Code", monospace`
    }

    async function initTerminal() {
      const s = useAppStore.getState()
      const fontFamilyCss = buildFontFamily(s.fontFamily)

      // Wait for the configured font to load so the WebGL texture atlas
      // measures glyphs correctly on first paint. Timeout after 3s to avoid
      // blocking forever if the font isn't installed.
      try {
        await Promise.race([
          document.fonts.load(`${s.fontSize}px ${fontFamilyCss}`),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ])
      } catch {
        // Font loading failed — proceed with fallbacks
      }

      if (disposed) return

      const term = new Terminal({
        allowTransparency: false,
        theme: getTheme(s.theme, s.terminalVibrancy),
        minimumContrastRatio: getMinimumContrastRatio(s.terminalVibrancy),
        fontFamily: fontFamilyCss,
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

      term.open(container)

      // WebGL renderer — GPU-accelerated with pixel-perfect box-drawing.
      // Can be disabled via settings if it causes glyph rendering issues.
      if (s.useWebGL) {
        try {
          const webglAddon = new WebglAddon()
          webglAddon.onContextLoss(() => {
            webglAddon.dispose()
            webglAddonRef.current = null
          })
          term.loadAddon(webglAddon)
          webglAddonRef.current = webglAddon
        } catch {
          // WebGL unavailable — falls back to canvas renderer
        }

        // Refresh texture atlas when fonts finish loading after init
        document.fonts.ready.then(() => {
          if (!disposed && webglAddonRef.current) {
            webglAddonRef.current.clearTextureAtlas()
            term.refresh(0, term.rows - 1)
          }
        })
      }

      // Intercept keys based on keyboard mode — synchronous, reads store directly
      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== 'keydown') return true
        const state = useAppStore.getState()
        const mode = state.keyboardMode

        if (mode === 'terminal') {
          // Only intercept Ctrl+A to enter prefix mode
          if (e.ctrlKey && e.key === 'a') {
            state.setKeyboardMode('prefix')
            return false
          }
          return true
        }

        // In prefix or sidebar mode, suppress all keys from reaching PTY
        return false
      })

      terminalRef.current = term
      fitAddonRef.current = fitAddon


      // Fit immediately after open and send correct size to PTY
      // This minimizes the time the PTY runs at the wrong 80x24 default
      fitAddon.fit()
      term.refresh(0, term.rows - 1)
      resizeTerminal(terminalId, term.cols, term.rows)

      // Second fit on next frame to catch any layout shifts
      requestAnimationFrame(() => {
        fitAddon.fit()
        term.refresh(0, term.rows - 1)
      })

      // Keystroke → PTY stdin
      const dataDisposable = term.onData((data) => {
        writeTerminal(terminalId, data)
      })

      // Xterm resize → PTY resize
      const resizeDisposable = term.onResize(({ cols, rows }) => {
        resizeTerminal(terminalId, cols, rows)
      })

      // Container resize → debounced fit to avoid flicker during sidebar transitions
      let resizeTimer: ReturnType<typeof setTimeout> | null = null
      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            if (fitAddonRef.current && terminalRef.current) {
              fitAddonRef.current.fit()
              terminalRef.current.refresh(0, terminalRef.current.rows - 1)
            }
          })
        }, 80)
      })
      resizeObserver.observe(container)

      // Focus terminal
      term.focus()

      // Restore focus when keyboard mode returns to 'terminal' and this terminal is active
      const unsubMode = useAppStore.subscribe((state, prev) => {
        if (prev.keyboardMode !== 'terminal' && state.keyboardMode === 'terminal') {
          if (state.activeTabId) {
            const activeTab = state.tabs.find((t) => t.id === state.activeTabId)
            if (activeTab?.terminalId === terminalId) {
              requestAnimationFrame(() => term.focus())
            }
          }
        }
      })

      cleanupRef.current = () => {
        if (resizeTimer) clearTimeout(resizeTimer)
        unsubMode()
        resizeObserver.disconnect()
        dataDisposable.dispose()
        resizeDisposable.dispose()
        webglAddonRef.current = null
        term.dispose()
      }
    }

    const cleanupRef = { current: () => {} }
    initTerminal()

    return () => {
      disposed = true
      cleanupRef.current()
      // Don't close the PTY here — the tab system manages PTY lifecycle.
      // closeTerminal is called from the store's closeTab action via Shell.
    }
  }, [terminalId])

  return (
    <div ref={wrapperRef} className="h-full w-full relative">
      <div
        ref={containerRef}
        className="h-full w-full terminal-view"
        style={{
          padding: '8px',
          background: getTheme(theme, terminalVibrancy).background,
          ...(hasWallpaper && { opacity: backgroundOpacity }),
        }}
      />
      {dragOver && (
        <div className="absolute inset-2 z-50 flex items-center justify-center rounded border-2 border-dashed border-primary/50 bg-primary/[0.08] pointer-events-none">
          <span className="text-primary text-sm font-medium">Drop files here</span>
        </div>
      )}
    </div>
  )
}
