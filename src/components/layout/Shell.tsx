import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { applyTheme } from '@/lib/themes'
import { createTerminal, closeTerminal } from '@/hooks/useTauri'
import { getAllPluginTabTypes } from '@/plugins'
import Header from './Header'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import SettingsPage from './SettingsPage'
import DiscoverDialog from './DiscoverDialog'
import XTerminal from '@/components/terminal/XTerminal'

export default function Shell() {
  const {
    activeProjectId,
    activeTabId,
    activeView,
    tabs,
    projects,
    closeTab,
    addTab,
    setTheme,
    getProjectTabs,
  } = useAppStore()

  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [discoverOpen, setDiscoverOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Close tab and its PTY process
  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (tab?.terminalId) {
        closeTerminal(tab.terminalId).catch(() => {})
      }
      closeTab(tabId)
    },
    [tabs, closeTab],
  )

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
        if (activeTabId) handleCloseTab(activeTabId)
      }

      // Cmd+B: toggle sidebar
      if (meta && e.key === 'b') {
        e.preventDefault()
        setSidebarVisible((v) => !v)
      }

      // Escape: close modals
      if (e.key === 'Escape') {
        setDiscoverOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeProject, activeTabId, handleCloseTab])

  return (
    <div className="flex flex-col h-full w-full">
      <Header
        onAddProject={() => setDiscoverOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar visible={sidebarVisible} />

        {activeView === 'settings' ? (
          <SettingsPage />
        ) : (
          <div className="flex flex-col flex-1 min-w-0">
            <TabBar onCloseTab={handleCloseTab} />

            {/* Tab content area */}
            <div className="flex-1 min-h-0 relative">
              {/* Render all shell tabs but only show active */}
              {tabs
                .filter((t) => t.type === 'shell' && t.terminalId && t.projectId === activeProjectId)
                .map((tab) => (
                  <div
                    key={tab.terminalId}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-100",
                      activeTabId === tab.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    )}
                  >
                    <XTerminal
                      projectPath={activeProject?.path ?? '~'}
                      existingTerminalId={tab.terminalId!}
                      onExit={() => handleCloseTab(tab.id)}
                    />
                  </div>
                ))}

              {/* Render plugin tabs */}
              {tabs
                .filter((t) => t.type !== 'shell' && t.projectId === activeProjectId)
                .map((tab) => {
                  const tabType = getAllPluginTabTypes().find((tt) => tt.id === tab.type)
                  if (!tabType) return null
                  const TabComponent = tabType.component
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        "absolute inset-0 overflow-auto bg-background transition-opacity duration-100",
                        activeTabId === tab.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                      )}
                    >
                      <TabComponent
                        projectId={tab.projectId}
                        projectPath={activeProject?.path ?? ''}
                      />
                    </div>
                  )
                })}

              {/* Empty state */}
              {!activeProjectId && (
                <div
                  className="flex flex-col items-center justify-center h-full gap-4 text-dim"
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ fontSize: 28, opacity: 0.3, fontWeight: 300 }}
                  >
                    <span className="text-muted-foreground">&gt;_</span>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      Select a project
                    </div>
                    <div className="text-xs mt-1">
                      Choose a project from the sidebar to manage its Claude Code sessions
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DiscoverDialog isOpen={discoverOpen} onClose={() => setDiscoverOpen(false)} />
    </div>
  )
}
