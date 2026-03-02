import { Send, Square } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

interface InputBarProps {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export default function InputBar({ onSend, onStop, isStreaming, disabled }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Escape key during streaming stops generation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        onStop()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStreaming, onStop])

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 150
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
    el.style.overflow = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  const handleSend = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const text = el.value.trim()
    if (!text) return
    onSend(text)
    el.value = ''
    el.style.height = 'auto'
    el.style.overflow = 'hidden'
  }, [onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isStreaming && !disabled) {
          handleSend()
        }
      }
    },
    [isStreaming, disabled, handleSend],
  )

  return (
    <div className="border-t border-border flex-shrink-0">
      <div className="max-w-[700px] mx-auto w-full flex items-end gap-2 pr-3">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message Claude..."
          onInput={resizeTextarea}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="bg-transparent text-foreground placeholder:text-dim focus:outline-none resize-none w-full text-sm leading-relaxed overflow-hidden px-4 py-4"
          style={{ height: 'auto', minHeight: '52px' }}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-shrink-0 w-8 h-8 mb-[13px] flex items-center justify-center rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
            title="Stop generation (Esc)"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="flex-shrink-0 w-8 h-8 mb-[13px] flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
