import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import type { Conversation } from '@/lib/chatDb'

interface ConversationListProps {
  conversations: Conversation[]
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onCreate: () => void
}

function relativeTime(ts: number): string {
  const diff = Math.round((ts - Date.now()) / 1000)
  const abs = Math.abs(diff)

  if (abs < 60) return 'just now'

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
  return rtf.format(Math.round(diff / 2592000), 'month')
}

export default function ConversationList({
  conversations,
  onSelect,
  onDelete,
  onCreate,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <MessageCircle size={32} className="text-dim" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={14} />
          Start a conversation
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          type="button"
          key={conv.id}
          onClick={() => conv.id != null && onSelect(conv.id)}
          className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors border-b border-border/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{conv.title}</p>
            <p className="text-xs text-dim mt-0.5">{relativeTime(conv.updatedAt)}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (conv.id != null) onDelete(conv.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-dim hover:text-destructive transition-all"
            title="Delete conversation"
          >
            <Trash2 size={13} />
          </button>
        </button>
      ))}
    </div>
  )
}
