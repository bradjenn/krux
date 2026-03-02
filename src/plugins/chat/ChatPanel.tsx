import { useEffect, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useChatHistory } from './chatStore'
import { useChatStream } from './useChatStream'
import { persistMessage, clearProjectHistory } from '@/lib/chatDb'
import MessageList from './MessageList'
import InputBar from './InputBar'

interface ChatPanelProps {
  projectId: string
  projectPath: string
}

export default function ChatPanel({ projectId, projectPath }: ChatPanelProps) {
  const messages = useChatHistory(projectId)
  const { streamingContent, status, sendMessage, stop, setStreamingContent, resetStream, resetSession } =
    useChatStream(projectPath)
  const [error, setError] = useState<string | null>(null)
  const isStreaming = status === 'streaming'

  // When stream completes (done), persist assistant message
  useEffect(() => {
    if (status === 'done' && streamingContent) {
      persistMessage({
        projectId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        resetStream()
      })
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // When stream is aborted, persist any partial content
  useEffect(() => {
    if (status === 'aborted' && streamingContent) {
      persistMessage({
        projectId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        resetStream()
      })
    } else if (status === 'aborted') {
      resetStream()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // When stream errors, show inline error
  useEffect(() => {
    if (status === 'error') {
      setError('Failed to get a response. Check that Claude CLI is working and try again.')
      resetStream()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return
      setError(null)

      // Persist user message
      await persistMessage({
        projectId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      })

      // Build history from current persisted messages
      const currentMessages = messages ?? []
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }))

      // Start streaming
      await sendMessage(history, userMessage)
    },
    [projectId, messages, sendMessage],
  )

  const handleRetry = useCallback(
    (messageIndex: number) => {
      const currentMessages = messages ?? []
      const msg = currentMessages[messageIndex]
      if (!msg) return

      if (msg.role === 'assistant') {
        const userMsg = currentMessages
          .slice(0, messageIndex)
          .reverse()
          .find((m) => m.role === 'user')
        if (userMsg) {
          handleSend(userMsg.content)
        }
      } else if (msg.role === 'user') {
        handleSend(msg.content)
      }
    },
    [messages, handleSend],
  )

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const handleClear = useCallback(async () => {
    await clearProjectHistory(projectId)
    setStreamingContent('')
    resetStream()
    resetSession()
    setError(null)
  }, [projectId, setStreamingContent, resetStream, resetSession])

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend],
  )

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="max-w-[700px] mx-auto w-full flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Chat</span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-dim hover:text-destructive text-xs transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      {/* Loading skeleton while Dexie query in-flight */}
      {messages === undefined ? (
        <div className="flex-1 flex flex-col gap-4 p-6 max-w-[700px] mx-auto w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col gap-2">
              <div className="h-2 w-12 bg-surface rounded" />
              <div className="h-4 bg-surface rounded w-3/4" />
              {i === 2 && <div className="h-4 bg-surface rounded w-1/2" />}
            </div>
          ))}
        </div>
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          onCopy={handleCopy}
          onRetry={handleRetry}
          onSuggestedPrompt={handleSuggestedPrompt}
        />
      )}

      {/* Inline error display */}
      {error && (
        <div className="px-4 py-2 max-w-[700px] mx-auto w-full">
          <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
        </div>
      )}

      {/* Input bar */}
      <InputBar
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={messages === undefined}
      />
    </div>
  )
}
