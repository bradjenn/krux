import { listen, type UnlistenFn } from '@/lib/bridge'
import { useCallback, useEffect, useRef, useState } from 'react'
import { abortClaudeChat, cleanupClaudeChat, startClaudeChat } from '@/hooks/useTerminal'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'aborted'

interface ChatOutputPayload {
  chat_id: string
  data: string
}

interface ChatDonePayload {
  chat_id: string
  error: string | null
}

/**
 * Extracts text content from a stream-json assistant message.
 * The message.content array may contain text blocks, tool_use blocks, etc.
 * We only extract text blocks for display.
 */
function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('')
}

export function useChatStream(projectPath: string) {
  const [streamingContent, setStreamingContent] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const chatIdRef = useRef<string | null>(null)
  const unlistenDataRef = useRef<UnlistenFn | null>(null)
  const unlistenDoneRef = useRef<UnlistenFn | null>(null)
  const streamContentRef = useRef('')

  // Session tracking: first message uses --session-id, subsequent use --resume
  const sessionRef = useRef<{ id: string; started: boolean }>({
    id: crypto.randomUUID(),
    started: false,
  })

  const cleanup = useCallback(() => {
    unlistenDataRef.current?.()
    unlistenDoneRef.current?.()
    unlistenDataRef.current = null
    unlistenDoneRef.current = null
  }, [])

  // Abort and clean up on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (chatIdRef.current) {
        abortClaudeChat(chatIdRef.current).catch(() => {})
      }
    }
  }, [cleanup])

  const sendMessage = useCallback(
    async (_history: Array<{ role: string; content: string }>, userMessage: string) => {
      cleanup()
      streamContentRef.current = ''
      setStreamingContent('')
      setStatus('streaming')
      setLastError(null)

      // Generate chat ID upfront so listeners can filter before process starts
      const chatId = crypto.randomUUID()
      chatIdRef.current = chatId

      try {
        // Set up event listeners BEFORE starting the process
        const dataUnlisten = listen<ChatOutputPayload>('claude:chat:data', (payload) => {
          if (payload.chat_id !== chatId) return

          try {
            const parsed = JSON.parse(payload.data)

            // Partial assistant messages contain cumulative content
            if (parsed.type === 'assistant' && parsed.message?.content) {
              const text = extractText(parsed.message.content)
              if (text) {
                streamContentRef.current = text
                setStreamingContent(text)
              }
            }

            // Result message contains the final complete text
            if (parsed.type === 'result' && parsed.result) {
              streamContentRef.current = parsed.result
              setStreamingContent(parsed.result)
            }
          } catch {
            // Ignore unparseable lines (e.g. system init messages)
          }
        })

        const doneUnlisten = listen<ChatDonePayload>('claude:chat:done', (payload) => {
          if (payload.chat_id !== chatId) return
          if (streamContentRef.current) {
            setStatus('done')
          } else {
            setStatus('error')
            setLastError(payload.error || 'Claude exited with no output')
          }
          cleanup()
          cleanupClaudeChat(chatId).catch(() => {})
        })

        unlistenDataRef.current = dataUnlisten
        unlistenDoneRef.current = doneUnlisten

        // Start the Claude CLI process with session tracking
        const session = sessionRef.current
        await startClaudeChat(chatId, userMessage, projectPath, session.id, session.started)
        // Mark session as started after first successful spawn
        session.started = true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start Claude'
        console.error('Claude chat error:', message)
        setStatus('error')
      }
    },
    [projectPath, cleanup],
  )

  const stop = useCallback(() => {
    if (chatIdRef.current) {
      abortClaudeChat(chatIdRef.current).catch(() => {})
      setStatus('aborted')
      cleanup()
    }
  }, [cleanup])

  const resetStream = useCallback(() => {
    setStreamingContent('')
    setStatus('idle')
    streamContentRef.current = ''
  }, [])

  // Reset session (new conversation) — call on "Clear"
  const resetSession = useCallback(() => {
    sessionRef.current = { id: crypto.randomUUID(), started: false }
  }, [])

  return {
    streamingContent,
    status,
    lastError,
    sendMessage,
    stop,
    setStreamingContent,
    resetStream,
    resetSession,
  }
}
