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
    const label = `Terminal ${shellCount + 1}`

    const terminalId = await createTerminal(activeProject.path, 80, 24)
    addTab({
      id: crypto.randomUUID(),
      type: 'shell',
      label,
      projectId: activeProject.id,
      terminalId,
    })
  }

  // Cmd+T for new tab, Cmd+W to close
  // (registered in Shell.tsx for proper scope)

  if (!activeProjectId || projectTabs.length === 0) return null

  return (
    <div
      className="flex items-center shrink-0 select-none overflow-x-auto"
      style={{
        height: 36,
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {projectTabs.map((tab, i) => {
        const isActive = activeTabId === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="group flex items-center gap-1.5 shrink-0 transition-colors duration-100"
            style={{
              padding: '0 14px',
              height: '100%',
              fontSize: 12,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              background: isActive ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span>{tab.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 p-0.5 rounded"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.background = 'rgba(229,46,46,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = ''
                e.currentTarget.style.background = ''
              }}
            >
              <X size={11} />
            </span>
          </button>
        )
      })}

      {/* New tab */}
      <button
        onClick={handleNewShellTab}
        className="flex items-center justify-center shrink-0 transition-colors duration-150"
        style={{
          width: 36,
          height: '100%',
          fontSize: 16,
          color: 'var(--text-dim)',
        }}
        title="New terminal (⌘T)"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-dim)'
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
