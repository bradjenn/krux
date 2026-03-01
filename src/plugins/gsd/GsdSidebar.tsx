import { useEffect, useState } from 'react'
import { LayoutDashboard, FileText, Play } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { parseRoadmap } from './parser'

interface GsdSidebarProps {
  projectId: string
  projectPath: string
}

const GSD_TABS = [
  { id: 'gsd:overview', label: 'Overview', icon: LayoutDashboard, requiresPhases: false },
  { id: 'gsd:documents', label: 'Documents', icon: FileText, requiresPhases: false },
  { id: 'gsd:execution', label: 'Execute', icon: Play, requiresPhases: true },
] as const

export default function GsdSidebar({ projectId, projectPath }: GsdSidebarProps) {
  const { tabs, activeTabId, addTab, setActiveTab } = useAppStore()
  const [hasPhases, setHasPhases] = useState(false)

  useEffect(() => {
    parseRoadmap(projectPath).then((phases) => setHasPhases(phases.length > 0))
  }, [projectPath])

  const openOrFocusTab = (tabTypeId: string, label: string) => {
    const existing = tabs.find((t) => t.type === tabTypeId && t.projectId === projectId)
    if (existing) {
      setActiveTab(existing.id)
      return
    }

    addTab({
      id: crypto.randomUUID(),
      type: tabTypeId,
      label,
      projectId,
    })
  }

  const visibleTabs = GSD_TABS.filter((t) => !t.requiresPhases || hasPhases)

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-[12px] font-semibold uppercase tracking-wider text-dim">
        GSD Workflow
      </div>
      {visibleTabs.map(({ id, label, icon: Icon }) => {
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
