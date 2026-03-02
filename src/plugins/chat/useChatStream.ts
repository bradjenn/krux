import { useRef, useEffect, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useChatStore } from './chatStore'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'aborted'

type MessageParam = {
  role: 'user' | 'assistant'
  content: string
}

export function useChatStream(apiKey: string, projectPath: string) {
  const { streamingContent, setStreamingContent, appendStreamingContent, setStreaming, setError, resetStream } =
    useChatStore()

  // Track stream status separately (not in zustand — local to this hook instance)
  const statusRef = useRef<StreamStatus>('idle')
  const clientRef = useRef<Anthropic | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef<string>('')
  const rafRef = useRef<number | null>(null)

  // Create the Anthropic client once when apiKey becomes available
  useEffect(() => {
    if (apiKey) {
      clientRef.current = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      })
    }
    return () => {
      // Cleanup: abort any in-flight stream and cancel pending rAF
      if (abortRef.current) {
        abortRef.current.abort()
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [apiKey])

  const flush = useCallback(() => {
    if (bufferRef.current) {
      const chunk = bufferRef.current
      bufferRef.current = ''
      appendStreamingContent(chunk)
    }
    rafRef.current = null
  }, [appendStreamingContent])

  const appendToken = useCallback(
    (text: string) => {
      bufferRef.current += text
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush)
      }
    },
    [flush]
  )

  const sendMessage = useCallback(
    async (history: MessageParam[], userMessage: string) => {
      if (!clientRef.current) return

      // Reset and set up for new stream
      abortRef.current = new AbortController()
      bufferRef.current = ''
      statusRef.current = 'streaming'
      setStreamingContent('')
      setStreaming(true)
      setError(null)

      // Use last 20 messages for API context (not all 50 from storage)
      const contextMessages = history.slice(-20)
      const messages: MessageParam[] = [
        ...contextMessages,
        { role: 'user', content: userMessage },
      ]

      try {
        const stream = clientRef.current.messages.stream(
          {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8096,
            system: `You are a helpful assistant. The active project is at ${projectPath}.`,
            messages,
          },
          { signal: abortRef.current.signal }
        )

        stream.on('text', appendToken)

        await stream.finalMessage()

        // Final flush of any remaining buffered tokens
        if (bufferRef.current) {
          const remaining = bufferRef.current
          bufferRef.current = ''
          appendStreamingContent(remaining)
        }
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }

        statusRef.current = 'done'
        setStreaming(false)
      } catch (err: unknown) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        const error = err as { name?: string; message?: string }
        if (error.name === 'AbortError') {
          statusRef.current = 'aborted'
        } else {
          statusRef.current = 'error'
          setError(error.message ?? 'Stream error')
        }
        setStreaming(false)
      }
    },
    [appendToken, appendStreamingContent, setStreamingContent, setStreaming, setError, projectPath]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    streamingContent,
    status: statusRef.current as StreamStatus,
    sendMessage,
    stop,
    setStreamingContent,
    resetStream,
  }
}
