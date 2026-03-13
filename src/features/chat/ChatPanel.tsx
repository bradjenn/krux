import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { clearConversationHistory, createConversation, persistMessage } from '@/lib/chatDb'
import { useAppStore } from '@/stores/appStore'
import { useChatHistory, useConversationList } from './chatStore'
import InputBar from './InputBar'
import MessageList from './MessageList'
import { useChatStream } from './useChatStream'

interface ChatPanelProps {
  projectId: string
  projectPath: string
}

export default function ChatPanel({ projectId, projectPath }: ChatPanelProps) {
  const activeConversationId = useAppStore(
    (s) => s.activeConversationIdByProject[projectId] ?? null,
  )
  const setActiveConversation = useAppStore((s) => s.setActiveConversation)
  const previousConversationIdRef = useRef<number | null>(null)

  const conversations = useConversationList(projectId)
  const messages = useChatHistory(activeConversationId)
  const {
    streamingContent,
    status,
    lastError,
    sendMessage,
    stop,
    setStreamingContent,
    resetStream,
    resetSession,
  } = useChatStream(projectPath)
  const [error, setError] = useState<string | null>(null)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const [streamConversationId, setStreamConversationId] = useState<number | null>(null)
  const isStreaming = status === 'streaming'

  useEffect(() => {
    if (conversations === undefined) return

    const hasActiveConversation =
      activeConversationId != null &&
      conversations.some((conversation) => conversation.id === activeConversationId)

    if (hasActiveConversation) return

    if (conversations.length === 0) {
      if (activeConversationId !== null) {
        setActiveConversation(projectId, null)
      }
      return
    }

    setActiveConversation(projectId, conversations[0].id ?? null)
  }, [conversations, activeConversationId, projectId, setActiveConversation])

  useEffect(() => {
    if (previousConversationIdRef.current === activeConversationId) return
    const previousConversationId = previousConversationIdRef.current
    previousConversationIdRef.current = activeConversationId
    if (status === 'streaming' && streamConversationId === previousConversationId) {
      stop()
    }
    resetSession()
    setError(null)
  }, [activeConversationId, resetSession, status, stop, streamConversationId])

  // When stream completes (done), persist assistant message
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingContent is intentionally read only on status change to avoid persisting on every streaming chunk
  useEffect(() => {
    if (status === 'done' && streamingContent && streamConversationId) {
      persistMessage({
        projectId,
        conversationId: streamConversationId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        setStreamConversationId(null)
        resetStream()
      })
    } else if (status === 'done') {
      setStreamConversationId(null)
      resetStream()
    }
  }, [status, projectId, streamConversationId, resetStream])

  // When stream is aborted, persist any partial content
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingContent is intentionally read only on status change to avoid persisting on every streaming chunk
  useEffect(() => {
    if (status === 'aborted' && streamingContent && streamConversationId) {
      persistMessage({
        projectId,
        conversationId: streamConversationId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        setStreamConversationId(null)
        resetStream()
      })
    } else if (status === 'aborted') {
      setStreamConversationId(null)
      resetStream()
    }
  }, [status, projectId, streamConversationId, resetStream])

  // When stream errors, show inline error with details from stderr
  useEffect(() => {
    if (status === 'error') {
      setError(
        lastError || 'Failed to get a response. Check that Claude CLI is working and try again.',
      )
      setStreamConversationId(null)
      resetStream()
    }
  }, [status, lastError, resetStream])

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || !activeConversationId) return
      setError(null)

      // Persist user message
      await persistMessage({
        projectId,
        conversationId: activeConversationId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      })
      setScrollTrigger((prev) => prev + 1)

      // Build history from current persisted messages
      const currentMessages = messages ?? []
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }))

      // Start streaming
      setStreamConversationId(activeConversationId)
      await sendMessage(history, userMessage)
    },
    [projectId, activeConversationId, messages, sendMessage],
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
    if (!activeConversationId) return
    await clearConversationHistory(activeConversationId)
    setStreamingContent('')
    resetStream()
    resetSession()
    setError(null)
  }, [activeConversationId, setStreamingContent, resetStream, resetSession])

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend],
  )

  const handleNewConversation = useCallback(async () => {
    if (isStreaming) stop()
    const id = await createConversation(projectId)
    setActiveConversation(projectId, id)
    resetSession()
    setStreamingContent('')
    resetStream()
    setError(null)
  }, [
    isStreaming,
    projectId,
    resetSession,
    setActiveConversation,
    setStreamingContent,
    resetStream,
    stop,
  ])

  const activeConversation = conversations?.find((c) => c.id === activeConversationId)
  const hasNoSessions = conversations !== undefined && conversations.length === 0
  const hasSelectionGap =
    conversations !== undefined && conversations.length > 0 && !activeConversation
  const showEmptyState = hasNoSessions || hasSelectionGap
  const showStreamingContent = isStreaming && streamConversationId === activeConversationId

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 border-b border-border flex-shrink-0"
        style={{ height: 52 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {activeConversation?.title ?? 'Sessions'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 text-dim hover:text-primary text-xs transition-colors"
            title="New session"
          >
            <Plus size={13} />
            New
          </button>
          {activeConversation && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 text-dim hover:text-destructive text-xs transition-colors flex-shrink-0"
              title="Clear session"
            >
              <Trash2 size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <MessageCircle size={32} className="text-dim" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {hasNoSessions ? 'No sessions yet' : 'Select a session'}
            </p>
            <p className="text-xs text-dim">
              {hasNoSessions
                ? 'Create one from the sidebar or start a new session here.'
                : 'Choose a session from the sidebar or start a new one here.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Plus size={13} />
            New session
          </button>
        </div>
      ) : messages === undefined ? (
        <div className="flex-1 flex flex-col gap-4 p-6">
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
          streamingContent={showStreamingContent ? streamingContent : ''}
          isStreaming={showStreamingContent}
          scrollTrigger={scrollTrigger}
          onCopy={handleCopy}
          onRetry={handleRetry}
          onSuggestedPrompt={handleSuggestedPrompt}
        />
      )}

      {/* Inline error display */}
      {error && (
        <div className="px-4 py-2">
          <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
        </div>
      )}

      {/* Input bar */}
      <InputBar
        onSend={handleSend}
        onStop={stop}
        isStreaming={showStreamingContent}
        disabled={messages === undefined || activeConversation == null}
      />
    </div>
  )
}
