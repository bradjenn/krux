import { useEffect, useRef } from 'react'
import { invoke, listen } from '@/lib/bridge'

// --- IPC wrappers ---

export async function createTerminal(
  projectPath: string,
  cols: number,
  rows: number,
): Promise<string> {
  return invoke<string>('create_terminal', {
    projectPath,
    cols,
    rows,
  })
}

export async function writeTerminal(terminalId: string, data: string): Promise<void> {
  return invoke('write_terminal', { terminalId, data })
}

export async function resizeTerminal(
  terminalId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke('resize_terminal', { terminalId, cols, rows })
}

export async function closeTerminal(terminalId: string): Promise<void> {
  return invoke('close_terminal', { terminalId })
}

// --- Chat IPC wrappers ---

export async function checkClaudeCli(): Promise<boolean> {
  return invoke<boolean>('check_claude_cli')
}

export async function startClaudeChat(
  chatId: string,
  message: string,
  projectPath: string,
  sessionId: string,
  isResume: boolean,
): Promise<void> {
  return invoke('start_claude_chat', {
    chatId,
    message,
    projectPath,
    sessionId,
    isResume,
  })
}

export async function abortClaudeChat(chatId: string): Promise<void> {
  return invoke('abort_claude_chat', { chatId })
}

export async function cleanupClaudeChat(chatId: string): Promise<void> {
  return invoke('cleanup_claude_chat', { chatId })
}

// --- Hooks ---

interface TerminalOutputPayload {
  terminal_id: string
  data: string
}

interface TerminalExitPayload {
  terminal_id: string
}

/**
 * Subscribe to terminal output events for a specific terminal.
 */
export function useTerminalOutput(terminalId: string | null, onData: (data: string) => void) {
  const callbackRef = useRef(onData)
  callbackRef.current = onData

  useEffect(() => {
    if (!terminalId) return

    const unlisten = listen<TerminalOutputPayload>('terminal:output', (payload) => {
      if (payload.terminal_id === terminalId) {
        callbackRef.current(payload.data)
      }
    })

    return () => {
      unlisten()
    }
  }, [terminalId])
}

/**
 * Subscribe to terminal exit events for a specific terminal.
 */
export function useTerminalExit(terminalId: string | null, onExit: () => void) {
  const callbackRef = useRef(onExit)
  callbackRef.current = onExit

  useEffect(() => {
    if (!terminalId) return

    const unlisten = listen<TerminalExitPayload>('terminal:exit', (payload) => {
      if (payload.terminal_id === terminalId) {
        callbackRef.current()
      }
    })

    return () => {
      unlisten()
    }
  }, [terminalId])
}
