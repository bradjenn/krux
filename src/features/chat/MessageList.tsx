import { MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/lib/chatDb'
import MessageBubble from './MessageBubble'
import ThinkingIndicator from './ThinkingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
  scrollTrigger: number
  onCopy: (content: string) => void
  onRetry: (messageIndex: number) => void
  onSuggestedPrompt: (prompt: string) => void
}

const SUGGESTED_PROMPTS = [
  'Explain this project',
  "What's the current status?",
  'Help me debug an issue',
]

export default function MessageList({
  messages,
  streamingContent,
  isStreaming,
  scrollTrigger,
  onCopy,
  onRetry,
  onSuggestedPrompt,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const nearBottomRef = useRef(true)

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setShowJumpToBottom(false)
    nearBottomRef.current = true
  }, [])

  const handleScroll = useCallback(() => {
    const near = isNearBottom()
    nearBottomRef.current = near
    setShowJumpToBottom(!near)
  }, [isNearBottom])

  // Force scroll when user sends a message (regardless of scroll position)
  useEffect(() => {
    if (scrollTrigger > 0) {
      nearBottomRef.current = true
      scrollToBottom()
    }
  }, [scrollTrigger, scrollToBottom])

  // Auto-scroll when messages or streaming content changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length and streamingContent are intentional trigger dependencies to scroll on new content
  useEffect(() => {
    if (nearBottomRef.current) {
      scrollToBottom()
    }
  }, [messages.length, streamingContent, scrollToBottom])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
        <div className="max-w-[700px] mx-auto w-full px-4 py-4">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-center py-16">
              <MessageCircle size={32} className="text-dim" />
              <p className="text-sm font-medium text-muted-foreground">Start a conversation</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => onSuggestedPrompt(prompt)}
                    className="border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id ?? idx}
                  message={msg}
                  isStreaming={false}
                  isLastAssistant={false}
                  onCopy={() => onCopy(msg.content)}
                  onRetry={msg.role === 'assistant' ? () => onRetry(idx) : undefined}
                />
              ))}
              {/* Live streaming message (not in messages array) */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    projectId: '',
                    conversationId: 0,
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: Date.now(),
                  }}
                  isStreaming={true}
                  isLastAssistant={true}
                />
              )}
              {/* Thinking indicator while waiting for first token */}
              {isStreaming && !streamingContent && <ThinkingIndicator />}
            </>
          )}
        </div>
      </div>

      {/* Jump to bottom button */}
      {showJumpToBottom && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={scrollToBottom}
            className="bg-surface border border-border text-xs text-muted-foreground hover:text-foreground rounded-full px-3 py-1 transition-colors shadow-sm"
          >
            Jump to latest
          </button>
        </div>
      )}
    </div>
  )
}
