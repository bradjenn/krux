import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../stores/appStore'
import { applyTheme } from '../../lib/themes'
import { createTerminal } from '../../hooks/useTauri'
import Header from './Header'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import SettingsDialog from './SettingsDialog'
import DiscoverDialog from './DiscoverDialog'
import XTerminal from '../terminal/XTerminal'

export default function Shell() {
  const {
    activeProjectId,
    activeTabId,
    tabs,
    projects,
    closeTab,
    addTab,
    setTheme,
    getProjectTabs,
  } = useAppStore()

  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Load saved theme on startup
  useEffect(() => {
    invoke<{ theme: string }>('load_settings').then((settings) => {
      setTheme(settings.theme)
      applyTheme(settings.theme)
    })
  }, [])

  // Auto-create a shell tab when selecting a project with no tabs
  useEffect(() => {
    if (!activeProjectId) return
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) return

    const projectTabs = getProjectTabs(activeProjectId)
    if (projectTabs.length === 0) {
      createTerminal(project.path, 80, 24).then((terminalId) => {
        addTab({
          id: crypto.randomUUID(),
          type: 'shell',
          label: 'Terminal 1',
          projectId: activeProjectId,
          terminalId,
        })
      })
    }
  }, [activeProjectId, projects])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+T: new terminal
      if (meta && e.key === 't') {
        e.preventDefault()
        if (activeProject) {
          const count = getProjectTabs(activeProject.id).filter((t) => t.type === 'shell').length
          createTerminal(activeProject.path, 80, 24).then((terminalId) => {
            addTab({
              id: crypto.randomUUID(),
              type: 'shell',
              label: `Terminal ${count + 1}`,
              projectId: activeProject.id,
              terminalId,
            })
          })
        }
      }

      // Cmd+W: close tab
      if (meta && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      }

      // Escape: close modals
      if (e.key === 'Escape') {
        setSettingsOpen(false)
        setDiscoverOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeProject, activeTabId])

  return (
    <div className="flex flex-col h-full w-full">
      <Header
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddProject={() => setDiscoverOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          visible={sidebarVisible}
          onOpenDiscover={() => setDiscoverOpen(true)}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <TabBar />

          {/* Terminal / Empty state */}
          <div className="flex-1 min-h-0 relative">
            {/* Render all shell tabs but only show active */}
            {tabs
              .filter((t) => t.type === 'shell' && t.terminalId && t.projectId === activeProjectId)
              .map((tab) => (
                <div
                  key={tab.terminalId}
                  className="absolute inset-0"
                  style={{
                    opacity: activeTabId === tab.id ? 1 : 0,
                    pointerEvents: activeTabId === tab.id ? 'auto' : 'none',
                    transition: 'opacity 0.1s',
                  }}
                >
                  <XTerminal
                    projectPath={activeProject?.path ?? '~'}
                    existingTerminalId={tab.terminalId!}
                    onExit={() => closeTab(tab.id)}
                  />
                </div>
              ))}

            {/* Empty state */}
            {!activeProjectId && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-dim)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.4 }}
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <div className="text-center">
                  <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>
                    No project selected
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Select a project from the sidebar or add a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DiscoverDialog isOpen={discoverOpen} onClose={() => setDiscoverOpen(false)} />
    </div>
  )
}
