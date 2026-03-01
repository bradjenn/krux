import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import {
  writeTerminal,
  resizeTerminal,
  useTerminalOutput,
  useTerminalExit,
} from '../../hooks/useTauri'
import { useAppStore } from '../../stores/appStore'
import { getTerminalTheme } from '../../lib/themes'

interface XTerminalProps {
  projectPath: string
  existingTerminalId: string
  onExit?: () => void
}

export default function XTerminal({ existingTerminalId, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [terminalId] = useState<string>(existingTerminalId)
  const theme = useAppStore((s) => s.theme)
  const termTheme = getTerminalTheme(theme)

  // Subscribe to PTY output → write to xterm
  useTerminalOutput(terminalId, (data) => {
    terminalRef.current?.write(data)
  })

  // Subscribe to PTY exit
  useTerminalExit(terminalId, () => {
    onExit?.()
  })

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getTerminalTheme(theme)
    }
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    const currentTheme = getTerminalTheme(useAppStore.getState().theme)

    const term = new Terminal({
      theme: currentTheme,
      fontFamily: '"MesloLGS Nerd Font", "JetBrains Mono", "SF Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)

    // Try WebGL addon for GPU acceleration
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => webglAddon.dispose())
      term.loadAddon(webglAddon)
    } catch {
      // Canvas fallback is fine
    }

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Initial fit after a tick to ensure container has dimensions
    requestAnimationFrame(() => {
      fitAddon.fit()
      // Send initial size to PTY
      resizeTerminal(terminalId, term.cols, term.rows)
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
      className="h-full w-full"
      style={{
        padding: '8px 8px 4px 8px',
        background: termTheme.background,
      }}
    />
  )
}
