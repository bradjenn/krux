import { useEffect, useState, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
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

  // Refs for menu event handler (avoids stale closures in the once-registered listener)
  const stateRef = useRef({ activeProject, activeTabId, activeProjectId })
  stateRef.current = { activeProject, activeTabId, activeProjectId }

  // Close tab and its PTY process
  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return // Already closed (e.g. PTY exit after manual close)
      if (tab.terminalId) {
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

  // Auto-create a shell tab when a project has no tabs (on select or after closing last tab)
  const projectTabs = activeProjectId ? getProjectTabs(activeProjectId) : []
  useEffect(() => {
    if (!activeProjectId) return
    if (projectTabs.length > 0) return
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) return

    createTerminal(project.path, 80, 24).then((terminalId) => {
      addTab({
        id: crypto.randomUUID(),
        type: 'shell',
        label: 'Terminal 1',
        projectId: activeProjectId,
        terminalId,
      })
    })
  }, [activeProjectId, projects, projectTabs.length])

  // Native menu event listener
  useEffect(() => {
    const unlisten = listen<string>('menu-action', (event) => {
      const { activeProject, activeTabId, activeProjectId } = stateRef.current
      const { setActiveView, addTab, setActiveTab, tabs, getProjectTabs } = useAppStore.getState()

      switch (event.payload) {
        case 'settings':
          setActiveView('settings')
          break

        case 'new-terminal':
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
          break

        case 'close-tab':
          if (activeTabId) handleCloseTab(activeTabId)
          break

        case 'add-project':
          setDiscoverOpen(true)
          break

        case 'toggle-sidebar':
          setSidebarVisible((v) => !v)
          break

        case 'open-gsd':
          if (activeProjectId) {
            const existing = tabs.find(
              (t) => t.type === 'gsd:main' && t.projectId === activeProjectId,
            )
            if (existing) {
              setActiveTab(existing.id)
            } else {
              addTab({
                id: crypto.randomUUID(),
                type: 'gsd:main',
                label: 'GSD',
                projectId: activeProjectId,
              })
            }
          }
          break
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [handleCloseTab])

  // Keyboard shortcuts (for keys not handled by native menu)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDiscoverOpen(false)
        if (useAppStore.getState().activeView === 'settings') {
          useAppStore.getState().setActiveView('projects')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-full w-full">
      <Header
        onAddProject={() => setDiscoverOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar visible={sidebarVisible} />

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
                  <div className="text-base font-medium text-muted-foreground">
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
      </div>

      {/* Settings overlay */}
      {activeView === 'settings' && (
        <SettingsPage onClose={() => useAppStore.getState().setActiveView('projects')} />
      )}

      {/* Modals */}
      <DiscoverDialog isOpen={discoverOpen} onClose={() => setDiscoverOpen(false)} />
    </div>
  )
}
