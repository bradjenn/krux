import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { applyTheme } from '@/lib/themes'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'
import { createTerminal, closeTerminal } from '@/hooks/useTauri'
import { getAllPluginTabTypes } from '@/plugins'
import Header from './Header'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import SettingsPage from './SettingsPage'
import DiscoverDialog from './DiscoverDialog'
import ProjectSwitcher from './ProjectSwitcher'
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
    backgroundImage,
  } = useAppStore()

  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const wallpaperUrl = useMemo(() => {
    if (!backgroundImage) return null
    const preset = WALLPAPER_PRESETS.find((p) => p.id === backgroundImage)
    if (preset) return `/wallpapers/${preset.file}`
    return convertFileSrc(backgroundImage)
  }, [backgroundImage])

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

  // Load saved settings on startup
  useEffect(() => {
    invoke<{
      theme: string
      font_size: number
      line_height: number
      cursor_style: string
      cursor_blink: boolean
      scrollback: number
      font_family: string
      background_image: string | null
    }>('load_settings').then((s) => {
      setTheme(s.theme)
      applyTheme(s.theme)
      const store = useAppStore.getState()
      store.setFontSize(s.font_size)
      store.setLineHeight(s.line_height)
      store.setCursorStyle(s.cursor_style as 'block' | 'bar' | 'underline')
      store.setCursorBlink(s.cursor_blink)
      store.setScrollback(s.scrollback)
      store.setFontFamily(s.font_family)
      store.setBackgroundImage(s.background_image ?? null)
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

        case 'project-switcher':
          setSwitcherOpen((v) => !v)
          break

        case 'toggle-sidebar':
          setSidebarVisible((v) => !v)
          break

        case 'font-increase': {
          const store = useAppStore.getState()
          const newSize = Math.min(32, store.fontSize + 1)
          store.setFontSize(newSize)
          invoke('load_settings').then((s: any) => {
            invoke('save_settings', { settings: { ...s, font_size: newSize } })
          })
          break
        }

        case 'font-decrease': {
          const store = useAppStore.getState()
          const newSize = Math.max(8, store.fontSize - 1)
          store.setFontSize(newSize)
          invoke('load_settings').then((s: any) => {
            invoke('save_settings', { settings: { ...s, font_size: newSize } })
          })
          break
        }

        case 'font-reset': {
          const store = useAppStore.getState()
          store.setFontSize(14)
          invoke('load_settings').then((s: any) => {
            invoke('save_settings', { settings: { ...s, font_size: 14 } })
          })
          break
        }

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

        case 'open-chat':
          if (activeProjectId) {
            const existing = tabs.find(
              (t) => t.type === 'chat:main' && t.projectId === activeProjectId,
            )
            if (existing) {
              setActiveTab(existing.id)
            } else {
              addTab({
                id: crypto.randomUUID(),
                type: 'chat:main',
                label: 'Chat',
                projectId: activeProjectId,
              })
            }
          }
          break

        case 'prev-tab':
        case 'next-tab': {
          if (!activeProjectId) break
          const projectTabs = getProjectTabs(activeProjectId)
          if (projectTabs.length < 2) break
          const currentIndex = projectTabs.findIndex((t) => t.id === activeTabId)
          if (currentIndex === -1) break
          const delta = event.payload === 'next-tab' ? 1 : -1
          const nextIndex = (currentIndex + delta + projectTabs.length) % projectTabs.length
          setActiveTab(projectTabs[nextIndex].id)
          break
        }
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

      // Cmd+1-9: jump to tab N
      const num = parseInt(e.key, 10)
      if ((e.metaKey || e.ctrlKey) && num >= 1 && num <= 9) {
        const { activeProjectId } = stateRef.current
        if (!activeProjectId) return
        const projectTabs = useAppStore.getState().getProjectTabs(activeProjectId)
        const targetTab = projectTabs[num - 1]
        if (targetTab) {
          e.preventDefault()
          useAppStore.getState().setActiveTab(targetTab.id)
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
            {wallpaperUrl && (
              <img
                src={wallpaperUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              />
            )}
            {/* Render ALL shell tabs across all projects — keep mounted to preserve state */}
            {tabs
              .filter((t) => t.type === 'shell' && t.terminalId)
              .map((tab) => {
                const project = projects.find((p) => p.id === tab.projectId)
                return (
                  <div
                    key={tab.terminalId}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-100",
                      activeTabId === tab.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                      wallpaperUrl && "z-10"
                    )}
                  >
                    <XTerminal
                      projectPath={project?.path ?? '~'}
                      existingTerminalId={tab.terminalId!}
                      isActive={activeTabId === tab.id}
                      onExit={() => handleCloseTab(tab.id)}
                    />
                  </div>
                )
              })}

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
                      "absolute inset-0 overflow-auto transition-opacity duration-100",
                      activeTabId === tab.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                      wallpaperUrl ? "z-10 bg-background/75" : "bg-background"
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
                className={cn("flex flex-col items-center justify-center h-full gap-4 text-dim", wallpaperUrl && "z-10")}
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
      <ProjectSwitcher isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  )
}
