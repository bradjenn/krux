import { Plus, X } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { createTerminal } from '../../hooks/useTauri'

export default function TabBar() {
  const { tabs, activeTabId, activeProjectId, projects, addTab, closeTab, setActiveTab } =
    useAppStore()

  const projectTabs = tabs.filter((t) => t.projectId === activeProjectId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const handleNewShellTab = async () => {
    if (!activeProject) return

    const shellCount = projectTabs.filter((t) => t.type === 'shell').length
    const label = shellCount === 0 ? 'zsh' : `zsh ${shellCount + 1}`

    // Create PTY first, then add tab
    const terminalId = await createTerminal(activeProject.path, 80, 24)

    addTab({
      id: crypto.randomUUID(),
      type: 'shell',
      label,
      projectId: activeProject.id,
      terminalId,
    })
  }

  if (!activeProjectId) return null

  return (
    <div
      className="flex items-center h-9 border-b px-1 gap-0.5 shrink-0"
      style={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      {projectTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-t transition-colors group"
          style={{
            color: activeTabId === tab.id ? 'var(--text)' : 'var(--text-muted)',
            backgroundColor: activeTabId === tab.id ? 'var(--bg)' : 'transparent',
            borderBottom:
              activeTabId === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <span>{tab.label}</span>
          <span
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
          >
            <X size={10} />
          </span>
        </button>
      ))}

      {/* New tab button */}
      <button
        onClick={handleNewShellTab}
        className="flex items-center justify-center w-7 h-7 rounded transition-colors"
        style={{ color: 'var(--text-dim)' }}
        title="New shell tab"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
