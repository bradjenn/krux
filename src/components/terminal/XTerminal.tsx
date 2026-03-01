import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import {
  writeTerminal,
  resizeTerminal,
  closeTerminal,
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

export default function XTerminal({ projectPath, existingTerminalId, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
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
      terminalRef.current.options.theme = termTheme
    }
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: termTheme,
      fontFamily: '"Berkeley Mono", "SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)

    // Try WebGL, fall back to canvas
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      term.loadAddon(webglAddon)
    } catch {
      // WebGL not available — canvas renderer is fine
    }

    fitAddon.fit()
    terminalRef.current = term

    // Hook xterm input → PTY stdin
    term.onData((data) => {
      writeTerminal(terminalId, data)
    })

    // Hook xterm resize → PTY resize
    term.onResize(({ cols, rows }) => {
      resizeTerminal(terminalId, cols, rows)
    })

    // Send initial resize to sync PTY with actual rendered dimensions
    resizeTerminal(terminalId, term.cols, term.rows)

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      closeTerminal(terminalId)
    }
  }, [terminalId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: '4px', backgroundColor: termTheme.background }}
    />
  )
}
