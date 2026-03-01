import { useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import XTerminal from '../terminal/XTerminal'

export default function Shell() {
  const { activeProjectId, activeTabId, tabs, projects, closeTab } = useAppStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Auto-create a shell tab when selecting a project with no tabs
  const { addTab, getProjectTabs } = useAppStore()

  useEffect(() => {
    if (!activeProjectId || !activeProject) return

    const projectTabs = getProjectTabs(activeProjectId)
    if (projectTabs.length === 0) {
      // Import dynamically to avoid circular dependency
      import('../../hooks/useTauri').then(({ createTerminal }) => {
        createTerminal(activeProject.path, 80, 24).then((terminalId) => {
          addTab({
            id: crypto.randomUUID(),
            type: 'shell',
            label: 'zsh',
            projectId: activeProjectId,
            terminalId,
          })
        })
      })
    }
  }, [activeProjectId])

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TabBar />
        <div className="flex-1 min-h-0">
          {activeTab?.type === 'shell' && activeTab.terminalId ? (
            <XTerminal
              key={activeTab.terminalId}
              projectPath={activeProject?.path ?? '~'}
              existingTerminalId={activeTab.terminalId}
              onExit={() => closeTab(activeTab.id)}
            />
          ) : !activeProjectId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>
                  No project selected
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                  Select a project from the sidebar or discover new ones
                </p>
              </div>
            </div>
          ) : !activeTab ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                Opening terminal...
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
