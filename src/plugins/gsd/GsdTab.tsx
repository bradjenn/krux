import { useState, useEffect } from 'react'
import { LayoutDashboard, FileText, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseRoadmap } from './parser'
import OverviewTab from './OverviewTab'
import DocumentsTab from './DocumentsTab'
import ExecutionTab from './ExecutionTab'

type GsdView = 'overview' | 'documents' | 'execution'

const NAV_ITEMS: { id: GsdView; label: string; icon: typeof LayoutDashboard; requiresPhases: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, requiresPhases: false },
  { id: 'documents', label: 'Documents', icon: FileText, requiresPhases: false },
  { id: 'execution', label: 'Execute', icon: Play, requiresPhases: true },
]

interface GsdTabProps {
  projectId: string
  projectPath: string
}

export default function GsdTab({ projectId, projectPath }: GsdTabProps) {
  const [activeView, setActiveView] = useState<GsdView>('overview')
  const [hasPhases, setHasPhases] = useState(false)

  useEffect(() => {
    parseRoadmap(projectPath).then((phases) => setHasPhases(phases.length > 0))
  }, [projectPath])

  const visibleItems = NAV_ITEMS.filter((item) => !item.requiresPhases || hasPhases)

  return (
    <div className="flex h-full">
      {/* Internal sidebar */}
      <div className="w-[160px] flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-dim">
          GSD Workflow
        </div>
        <nav className="flex flex-col gap-0.5 px-1.5">
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded transition-colors duration-100',
                activeView === id
                  ? 'text-primary bg-primary/[0.08]'
                  : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area — overflow handled by each view */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {activeView === 'overview' && (
          <div className="flex-1 overflow-auto">
            <OverviewTab projectId={projectId} projectPath={projectPath} />
          </div>
        )}
        {activeView === 'documents' && (
          <DocumentsTab projectId={projectId} projectPath={projectPath} />
        )}
        {activeView === 'execution' && (
          <ExecutionTab projectId={projectId} projectPath={projectPath} />
        )}
      </div>
    </div>
  )
}
