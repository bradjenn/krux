import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearConversationHistory,
  createConversation,
  deleteConversation,
  persistMessage,
} from '@/lib/chatDb'
import ConversationList from './ConversationList'
import { useChatHistory, useConversationList } from './chatStore'
import InputBar from './InputBar'
import MessageList from './MessageList'
import { useChatStream } from './useChatStream'

interface ChatPanelProps {
  projectId: string
  projectPath: string
}

export default function ChatPanel({ projectId, projectPath }: ChatPanelProps) {
  const [view, setView] = useState<'list' | 'chat'>('chat')
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const initializedRef = useRef(false)

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
  const isStreaming = status === 'streaming'

  // On mount: auto-create a conversation if none exist, or select the most recent
  useEffect(() => {
    if (initializedRef.current || conversations === undefined) return
    initializedRef.current = true

    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id!)
      setView('chat')
    } else {
      createConversation(projectId).then((id) => {
        setActiveConversationId(id)
        setView('chat')
      })
    }
  }, [conversations, projectId])

  // When stream completes (done), persist assistant message
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingContent is intentionally read only on status change to avoid persisting on every streaming chunk
  useEffect(() => {
    if (status === 'done' && streamingContent && activeConversationId) {
      persistMessage({
        projectId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        resetStream()
      })
    }
  }, [status, projectId, activeConversationId, resetStream])

  // When stream is aborted, persist any partial content
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingContent is intentionally read only on status change to avoid persisting on every streaming chunk
  useEffect(() => {
    if (status === 'aborted' && streamingContent && activeConversationId) {
      persistMessage({
        projectId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }).then(() => {
        resetStream()
      })
    } else if (status === 'aborted') {
      resetStream()
    }
  }, [status, projectId, activeConversationId, resetStream])

  // When stream errors, show inline error with details from stderr
  useEffect(() => {
    if (status === 'error') {
      setError(
        lastError || 'Failed to get a response. Check that Claude CLI is working and try again.',
      )
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
    const id = await createConversation(projectId)
    setActiveConversationId(id)
    setView('chat')
    resetSession()
    setStreamingContent('')
    resetStream()
    setError(null)
  }, [projectId, resetSession, setStreamingContent, resetStream])

  const handleSelectConversation = useCallback(
    (id: number) => {
      setActiveConversationId(id)
      setView('chat')
      resetSession()
      setStreamingContent('')
      resetStream()
      setError(null)
    },
    [resetSession, setStreamingContent, resetStream],
  )

  const handleDeleteConversation = useCallback(
    async (id: number) => {
      await deleteConversation(id)
      // If we deleted the active conversation, go back to list
      if (id === activeConversationId) {
        setActiveConversationId(null)
        setView('list')
      }
    },
    [activeConversationId],
  )

  const activeConversation = conversations?.find((c) => c.id === activeConversationId)

  // --- List view ---
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-between px-4 border-b border-border flex-shrink-0"
          style={{ height: 36 }}
        >
          <span className="text-sm font-medium text-foreground">Conversations</span>
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 text-dim hover:text-primary text-xs transition-colors"
            title="New conversation"
          >
            <Plus size={13} />
            New
          </button>
        </div>
        <ConversationList
          conversations={conversations ?? []}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onCreate={handleNewConversation}
        />
      </div>
    )
  }

  // --- Chat view ---
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 border-b border-border flex-shrink-0"
        style={{ height: 36 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setView('list')}
            className="text-dim hover:text-foreground transition-colors flex-shrink-0"
            title="Back to conversations"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-sm font-medium text-foreground truncate">
            {activeConversation?.title ?? 'Chat'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 text-dim hover:text-destructive text-xs transition-colors flex-shrink-0"
          title="Clear conversation"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>

      {/* Loading skeleton while Dexie query in-flight */}
      {messages === undefined ? (
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
          streamingContent={streamingContent}
          isStreaming={isStreaming}
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
        isStreaming={isStreaming}
        disabled={messages === undefined}
      />
    </div>
  )
}
