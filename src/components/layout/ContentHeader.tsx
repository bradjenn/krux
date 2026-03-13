import ClaudeLogo from '@/components/icons/ClaudeLogo'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

interface ContentHeaderProps {
  chatOpen: boolean
  onToggleChat: () => void
  wallpaperActive?: boolean
  backgroundOpacity?: number
}

export default function ContentHeader({
  chatOpen,
  onToggleChat,
  wallpaperActive,
  backgroundOpacity = 0.8,
}: ContentHeaderProps) {
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const tabs = useAppStore((s) => s.tabs)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div
      data-tauri-drag-region=""
      className={cn(
        'shrink-0 flex h-[52px] items-center border-b border-border px-5 select-none',
        !wallpaperActive && 'bg-surface',
      )}
      style={
        wallpaperActive
          ? {
              background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
            }
          : undefined
      }
    >
      {/* Left: session name */}
      <div className="flex min-w-0 flex-1 items-center pointer-events-none">
        {activeTab ? (
          <span className="truncate text-xs text-muted-foreground/70">
            {activeTab.label}
          </span>
        ) : activeProjectId ? (
          <span className="text-xs text-muted-foreground/50">No active session</span>
        ) : null}
      </div>

      {/* Right: chat toggle */}
      {activeProjectId && (
        <button
          type="button"
          onClick={onToggleChat}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer pointer-events-auto',
            chatOpen
              ? 'text-secondary bg-foreground/[0.06]'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title="Toggle chat (Ctrl+A, I)"
        >
          <ClaudeLogo size={14} color="#D97757" />
        </button>
      )}
    </div>
  )
}
