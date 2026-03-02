import { useState } from 'react'
import { Copy, RotateCcw } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import type { ChatMessage } from '@/lib/chatDb'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  isLastAssistant?: boolean
  onCopy?: () => void
  onRetry?: () => void
}

export default function MessageBubble({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onCopy,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  if (message.role === 'user') {
    return (
      <div className="py-3">
        <div className="text-dim text-[10px] uppercase tracking-wider font-medium mb-1">You</div>
        <div className="text-foreground text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="group py-3">
      <div className="text-dim text-[10px] uppercase tracking-wider font-medium mb-1">Claude</div>
      <div className="text-foreground text-sm">
        <Streamdown plugins={{ code }} isAnimating={isStreaming && isLastAssistant} shikiTheme={['github-dark', 'github-dark']}>
          {message.content}
        </Streamdown>
        {isStreaming && isLastAssistant && (
          <span className="w-2 h-4 bg-primary animate-pulse inline-block ml-0.5 align-middle" />
        )}
      </div>
      {/* Action buttons — visible on hover */}
      {!isStreaming && (
        <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-dim hover:text-foreground text-xs px-1.5 py-0.5 rounded transition-colors"
            title="Copy message"
          >
            <Copy size={12} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-dim hover:text-foreground text-xs px-1.5 py-0.5 rounded transition-colors"
              title="Retry"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
