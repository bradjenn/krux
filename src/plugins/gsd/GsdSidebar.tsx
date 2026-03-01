import { LayoutDashboard, FileText, Play } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface GsdSidebarProps {
  projectId: string
  projectPath: string
}

const GSD_TABS = [
  { id: 'gsd:overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'gsd:documents', label: 'Documents', icon: FileText },
  { id: 'gsd:execution', label: 'Execute', icon: Play },
] as const

export default function GsdSidebar({ projectId }: GsdSidebarProps) {
  const { tabs, activeTabId, addTab, setActiveTab } = useAppStore()

  const openOrFocusTab = (tabTypeId: string, label: string) => {
    // Check if this tab type already exists for this project
    const existing = tabs.find((t) => t.type === tabTypeId && t.projectId === projectId)
    if (existing) {
      setActiveTab(existing.id)
      return
    }

    // Create new tab
    addTab({
      id: crypto.randomUUID(),
      type: tabTypeId,
      label,
      projectId,
    })
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-dim">
        GSD Workflow
      </div>
      {GSD_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = tabs.some(
          (t) => t.type === id && t.projectId === projectId && t.id === activeTabId,
        )
        return (
          <button
            key={id}
            onClick={() => openOrFocusTab(id, `GSD ${label}`)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-1 text-xs transition-colors duration-100',
              isActive
                ? 'text-primary bg-primary/[0.04]'
                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
