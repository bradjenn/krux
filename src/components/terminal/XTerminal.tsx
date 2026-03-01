import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  closeTerminal,
  useTerminalOutput,
  useTerminalExit,
} from '../../hooks/useTauri'

interface XTerminalProps {
  projectPath: string
  onExit?: () => void
}

const GHOSTTY_THEME = {
  background: '#011423',
  foreground: '#cbe0f0',
  cursor: '#47ff9c',
  cursorAccent: '#011423',
  selectionBackground: '#033259',
  selectionForeground: '#cbe0f0',
  black: '#214969',
  red: '#e52e2e',
  green: '#44ffb1',
  yellow: '#ffe073',
  blue: '#0fc5ed',
  magenta: '#a277ff',
  cyan: '#24eaf7',
  white: '#24eaf7',
  brightBlack: '#214969',
  brightRed: '#e52e2e',
  brightGreen: '#44ffb1',
  brightYellow: '#ffe073',
  brightBlue: '#a277ff',
  brightMagenta: '#a277ff',
  brightCyan: '#24eaf7',
  brightWhite: '#24eaf7',
}

export default function XTerminal({ projectPath, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [terminalId, setTerminalId] = useState<string | null>(null)

  // Subscribe to PTY output → write to xterm
  useTerminalOutput(terminalId, (data) => {
    terminalRef.current?.write(data)
  })

  // Subscribe to PTY exit
  useTerminalExit(terminalId, () => {
    onExit?.()
  })

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: GHOSTTY_THEME,
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
    fitAddonRef.current = fitAddon

    // Spawn PTY
    const cols = term.cols
    const rows = term.rows

    let termId: string | null = null

    createTerminal(projectPath, cols, rows)
      .then((id) => {
        termId = id
        setTerminalId(id)

        // Hook xterm input → PTY stdin
        term.onData((data) => {
          writeTerminal(id, data)
        })

        // Hook xterm resize → PTY resize
        term.onResize(({ cols, rows }) => {
          resizeTerminal(id, cols, rows)
        })
      })
      .catch((err) => {
        term.writeln(`\x1b[31mFailed to create terminal: ${err}\x1b[0m`)
      })

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      if (termId) {
        closeTerminal(termId)
      }
    }
  }, [projectPath])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: '4px', backgroundColor: GHOSTTY_THEME.background }}
    />
  )
}
