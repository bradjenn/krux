import { Rocket } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface GsdSidebarProps {
  projectId: string
  projectPath: string
}

export default function GsdSidebar({ projectId }: GsdSidebarProps) {
  const { tabs, activeTabId, addTab, setActiveTab } = useAppStore()

  const openOrFocusGsd = () => {
    const existing = tabs.find((t) => t.type === 'gsd:main' && t.projectId === projectId)
    if (existing) {
      setActiveTab(existing.id)
      return
    }

    addTab({
      id: crypto.randomUUID(),
      type: 'gsd:main',
      label: 'GSD',
      projectId,
    })
  }

  const isActive = tabs.some(
    (t) => t.type === 'gsd:main' && t.projectId === projectId && t.id === activeTabId,
  )

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-[12px] font-semibold uppercase tracking-wider text-dim">
        Plugins
      </div>
      <button
        onClick={openOrFocusGsd}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1 text-xs transition-colors duration-100',
          isActive
            ? 'text-primary bg-primary/[0.04]'
            : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
        )}
      >
        <Rocket size={13} />
        GSD Workflow
      </button>
    </div>
  )
}
