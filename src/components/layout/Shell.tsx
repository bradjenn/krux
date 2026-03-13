import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ToolTab from '@/components/terminal/ToolTab'
import XTerminal from '@/components/terminal/XTerminal'
import ChatTab from '@/features/chat/ChatTab'
import GsdTab from '@/features/gsd/GsdTab'
import { useKeyboardMode } from '@/hooks/useKeyboardMode'
import { closeTerminal, createTerminal } from '@/hooks/useTauri'
import { applyTheme } from '@/lib/themes'
import { getToolFromTabType } from '@/lib/tools'
import { cn } from '@/lib/utils'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'
import { useAppStore } from '@/stores/appStore'
import BackgroundAdjuster from './BackgroundAdjuster'
import DiscoverDialog from './DiscoverDialog'
import Notifications from './Notifications'
import ProjectSwitcher from './ProjectSwitcher'
import SettingsPage from './SettingsPage'
import Sidebar from './Sidebar'
import StartScreen from './StartScreen'
import StatusLine from './StatusLine'
import TabBar from './TabBar'
import ThemeSwitcher from './ThemeSwitcher'
import WallpaperSwitcher from './WallpaperSwitcher'
import WhichKey from './WhichKey'

interface Settings {
  theme: string
  font_size: number
  line_height: number
  cursor_style: string
  cursor_blink: boolean
  scrollback: number
  font_family: string
  terminal_vibrancy: 'normal' | 'vivid' | 'high'
  background_image: string | null
  background_opacity: number
  background_blur: number
  hide_titlebar: boolean
  use_webgl: boolean
}

interface SavedTab {
  tab_type: string
  label: string
}

interface ProjectSession {
  tabs: SavedTab[]
  active_tab_index: number | null
}

interface Sessions {
  projects: Record<string, ProjectSession>
  last_active_project_id: string | null
}

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
    backgroundOpacity,
    backgroundBlur,
  } = useAppStore()

  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [wallpaperSwitcherOpen, setWallpaperSwitcherOpen] = useState(false)
  const [themeSwitcherOpen, setThemeSwitcherOpen] = useState(false)
  const [bgAdjusterOpen, setBgAdjusterOpen] = useState(false)
  const [bgAdjusterFocus, setBgAdjusterFocus] = useState<'opacity' | 'blur'>('opacity')
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const savedSessionsRef = useRef<Record<string, ProjectSession>>({})
  const lastActiveProjectRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Keyboard mode actions (Ctrl+A prefix chords) ──
  const openNewTerminal = useCallback(() => {
    const { activeProject } = stateRef.current
    if (!activeProject) return
    const count = useAppStore
      .getState()
      .getProjectTabs(activeProject.id)
      .filter((t) => t.type === 'shell').length
    createTerminal(activeProject.path, 80, 24).then((terminalId) => {
      useAppStore.getState().addTab({
        id: crypto.randomUUID(),
        type: 'shell',
        label: `Terminal ${count + 1}`,
        projectId: activeProject.id,
        terminalId,
      })
      useAppStore.getState().addNotification('Terminal created', 'success')
    })
  }, [])

  const closeActiveTab = useCallback(() => {
    const { activeTabId } = stateRef.current
    if (activeTabId) handleCloseTab(activeTabId)
  }, [handleCloseTab])

  const nextTab = useCallback(() => {
    const { activeProjectId, activeTabId } = stateRef.current
    if (!activeProjectId) return
    const projectTabs = useAppStore.getState().getProjectTabs(activeProjectId)
    if (projectTabs.length < 2) return
    const currentIndex = projectTabs.findIndex((t) => t.id === activeTabId)
    if (currentIndex === -1) return
    useAppStore.getState().setActiveTab(projectTabs[(currentIndex + 1) % projectTabs.length].id)
  }, [])

  const prevTab = useCallback(() => {
    const { activeProjectId, activeTabId } = stateRef.current
    if (!activeProjectId) return
    const projectTabs = useAppStore.getState().getProjectTabs(activeProjectId)
    if (projectTabs.length < 2) return
    const currentIndex = projectTabs.findIndex((t) => t.id === activeTabId)
    if (currentIndex === -1) return
    useAppStore
      .getState()
      .setActiveTab(projectTabs[(currentIndex - 1 + projectTabs.length) % projectTabs.length].id)
  }, [])

  const jumpToTab = useCallback((n: number) => {
    const { activeProjectId } = stateRef.current
    if (!activeProjectId) return
    const projectTabs = useAppStore.getState().getProjectTabs(activeProjectId)
    const target = projectTabs[n - 1]
    if (target) useAppStore.getState().setActiveTab(target.id)
  }, [])

  const openGsd = useCallback(() => {
    const { activeProjectId } = stateRef.current
    if (!activeProjectId) return
    const { tabs, addTab, setActiveTab } = useAppStore.getState()
    const existing = tabs.find((t) => t.type === 'gsd' && t.projectId === activeProjectId)
    if (existing) {
      setActiveTab(existing.id)
    } else {
      addTab({
        id: crypto.randomUUID(),
        type: 'gsd',
        label: 'GSD',
        projectId: activeProjectId,
      })
    }
  }, [])

  const openChat = useCallback(() => {
    const { activeProjectId } = stateRef.current
    if (!activeProjectId) return
    setChatPanelOpen((v) => !v)
  }, [])

  const openLazygit = useCallback(() => {
    const { activeProjectId } = stateRef.current
    if (!activeProjectId) return
    const { tabs, addTab, setActiveTab } = useAppStore.getState()
    const existing = tabs.find((t) => t.type === 'tool:lazygit' && t.projectId === activeProjectId)
    if (existing) {
      setActiveTab(existing.id)
    } else {
      addTab({
        id: crypto.randomUUID(),
        type: 'tool:lazygit',
        label: 'Lazygit',
        projectId: activeProjectId,
      })
    }
  }, [])

  const focusSidebar = useCallback(() => {
    setSidebarVisible(true)
  }, [])

  const focusTerminal = useCallback(() => {
    // Focus restore is handled by XTerminal's store subscription
  }, [])

  useKeyboardMode({
    openProjectSwitcher: () => setSwitcherOpen(true),
    openWallpaperSwitcher: () => setWallpaperSwitcherOpen(true),
    openSettings: () => useAppStore.getState().setActiveView('settings'),
    openGsd,
    openChat,
    openLazygit,
    newTerminal: openNewTerminal,
    closeTab: closeActiveTab,
    nextTab,
    prevTab,
    jumpToTab,
    focusSidebar,
    focusTerminal,
  })

  // Guard against WebKit scrolling the viewport when focusing inside
  // fixed-position overlays (modals). Reset any accidental scroll immediately.
  useEffect(() => {
    const reset = () => window.scrollTo(0, 0)
    window.addEventListener('scroll', reset)
    return () => window.removeEventListener('scroll', reset)
  }, [])

  // Load saved settings on startup
  useEffect(() => {
    invoke<Settings>('load_settings').then((s) => {
      setTheme(s.theme)
      applyTheme(s.theme)
      const store = useAppStore.getState()
      store.setFontSize(s.font_size)
      store.setLineHeight(s.line_height)
      store.setCursorStyle(s.cursor_style as 'block' | 'bar' | 'underline')
      store.setCursorBlink(s.cursor_blink)
      store.setScrollback(s.scrollback)
      store.setFontFamily(s.font_family)
      store.setTerminalVibrancy(s.terminal_vibrancy ?? 'normal')
      store.setBackgroundImage(s.background_image ?? null)
      store.setBackgroundOpacity(s.background_opacity)
      store.setBackgroundBlur(s.background_blur)
      store.setHideTitlebar(s.hide_titlebar)
      store.setUseWebGL(s.use_webgl ?? true)
    })
  }, [setTheme])

  // Load saved sessions on startup
  useEffect(() => {
    invoke<Sessions>('load_sessions').then((sessions) => {
      savedSessionsRef.current = sessions.projects ?? {}
      lastActiveProjectRef.current = sessions.last_active_project_id ?? null
      setSessionsLoaded(true)
    })
  }, [])

  // Restore last active project once projects are loaded
  useEffect(() => {
    if (!sessionsLoaded) return
    if (activeProjectId) return // Already selected
    if (projects.length === 0) return

    const lastId = lastActiveProjectRef.current
    if (lastId && projects.find((p) => p.id === lastId)) {
      useAppStore.getState().setActiveProject(lastId)
    }
  }, [sessionsLoaded, projects, activeProjectId])

  // Restore or auto-create tabs when a project has no tabs
  const projectTabs = activeProjectId ? getProjectTabs(activeProjectId) : []
  useEffect(() => {
    if (!activeProjectId) return
    if (projectTabs.length > 0) return
    if (!sessionsLoaded) return // Wait for sessions to load before deciding
    const project = projects.find((p) => p.id === activeProjectId)
    if (!project) return

    // Check for a saved session to restore
    const saved = savedSessionsRef.current[activeProjectId]
    if (saved && saved.tabs.length > 0) {
      // Consume so we don't re-restore if tabs are closed later
      delete savedSessionsRef.current[activeProjectId]

      // Restore saved tabs (create PTYs for shell tabs in parallel)
      const restoreTabs = async () => {
        const terminalIds = await Promise.all(
          saved.tabs.map((t) =>
            t.tab_type === 'shell' ? createTerminal(project.path, 80, 24) : Promise.resolve(null),
          ),
        )
        const store = useAppStore.getState()
        const tabIds: string[] = []
        for (let i = 0; i < saved.tabs.length; i++) {
          const tabId = crypto.randomUUID()
          tabIds.push(tabId)
          store.addTab({
            id: tabId,
            type: saved.tabs[i].tab_type,
            label: saved.tabs[i].label,
            projectId: project.id,
            ...(terminalIds[i] ? { terminalId: terminalIds[i]! } : {}),
          })
        }
        // Restore the previously active tab
        const idx = saved.active_tab_index
        if (idx != null && idx >= 0 && tabIds[idx]) {
          store.setActiveTab(tabIds[idx])
        }
      }
      restoreTabs()
      return
    }

    // No saved session — create a fresh terminal
    createTerminal(project.path, 80, 24).then((terminalId) => {
      addTab({
        id: crypto.randomUUID(),
        type: 'shell',
        label: 'Terminal 1',
        projectId: activeProjectId,
        terminalId,
      })
    })
  }, [activeProjectId, projects, projectTabs.length, addTab, sessionsLoaded])

  // Debounced save of session state whenever tabs or active project change
  useEffect(() => {
    if (!sessionsLoaded) return

    clearTimeout(saveTimerRef.current!)
    saveTimerRef.current = setTimeout(() => {
      const { tabs: allTabs, activeTabId: aTabId, activeProjectId: aProjId, projects: allProjects } =
        useAppStore.getState()

      const projectSessions: Record<string, ProjectSession> = {}
      for (const proj of allProjects) {
        const pTabs = allTabs.filter((t) => t.projectId === proj.id)
        if (pTabs.length > 0) {
          const activeIdx = pTabs.findIndex((t) => t.id === aTabId)
          projectSessions[proj.id] = {
            tabs: pTabs.map((t) => ({ tab_type: t.type, label: t.label })),
            active_tab_index: activeIdx >= 0 ? activeIdx : null,
          }
        }
      }

      invoke('save_sessions', {
        sessions: {
          projects: projectSessions,
          last_active_project_id: aProjId,
        },
      })
    }, 500)

    return () => clearTimeout(saveTimerRef.current!)
  }, [tabs, activeTabId, activeProjectId, sessionsLoaded])

  // Native menu event listener
  useEffect(() => {
    const unlisten = listen<string>('menu-action', (event) => {
      const { activeProject, activeTabId, activeProjectId } = stateRef.current
      const { setActiveView, addTab, setActiveTab, tabs, getProjectTabs } = useAppStore.getState()

      switch (event.payload) {
        case 'settings':
          setActiveView('settings')
          break

        case 'change-wallpaper':
          setWallpaperSwitcherOpen(true)
          break

        case 'change-theme':
          setThemeSwitcherOpen(true)
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
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, font_size: newSize } })
          })
          break
        }

        case 'font-decrease': {
          const store = useAppStore.getState()
          const newSize = Math.max(8, store.fontSize - 1)
          store.setFontSize(newSize)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, font_size: newSize } })
          })
          break
        }

        case 'font-reset': {
          const store = useAppStore.getState()
          store.setFontSize(14)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, font_size: 14 } })
          })
          break
        }

        case 'opacity-increase': {
          const store = useAppStore.getState()
          if (!store.backgroundImage) break
          const newOpacity = Math.min(1, Math.round((store.backgroundOpacity + 0.05) * 100) / 100)
          store.setBackgroundOpacity(newOpacity)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, background_opacity: newOpacity } })
          })
          setBgAdjusterFocus('opacity')
          setBgAdjusterOpen(true)
          break
        }

        case 'opacity-decrease': {
          const store = useAppStore.getState()
          if (!store.backgroundImage) break
          const newOpacity = Math.max(0.1, Math.round((store.backgroundOpacity - 0.05) * 100) / 100)
          store.setBackgroundOpacity(newOpacity)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, background_opacity: newOpacity } })
          })
          setBgAdjusterFocus('opacity')
          setBgAdjusterOpen(true)
          break
        }

        case 'blur-increase': {
          const store = useAppStore.getState()
          if (!store.backgroundImage) break
          const newBlur = Math.min(32, store.backgroundBlur + 2)
          store.setBackgroundBlur(newBlur)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, background_blur: newBlur } })
          })
          setBgAdjusterFocus('blur')
          setBgAdjusterOpen(true)
          break
        }

        case 'blur-decrease': {
          const store = useAppStore.getState()
          if (!store.backgroundImage) break
          const newBlur = Math.max(0, store.backgroundBlur - 2)
          store.setBackgroundBlur(newBlur)
          invoke<Settings>('load_settings').then((s) => {
            invoke('save_settings', { settings: { ...s, background_blur: newBlur } })
          })
          setBgAdjusterFocus('blur')
          setBgAdjusterOpen(true)
          break
        }

        case 'open-gsd':
          if (activeProjectId) {
            const existing = tabs.find((t) => t.type === 'gsd' && t.projectId === activeProjectId)
            if (existing) {
              setActiveTab(existing.id)
            } else {
              addTab({
                id: crypto.randomUUID(),
                type: 'gsd',
                label: 'GSD',
                projectId: activeProjectId,
              })
            }
          }
          break

        case 'open-chat':
          if (activeProjectId) {
            setChatPanelOpen((v) => !v)
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

      // Cmd+Shift+J/K: cycle through projects
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'j' || e.key === 'k')) {
        e.preventDefault()
        const { projects, activeProjectId } = useAppStore.getState()
        if (projects.length < 2) return
        const currentIndex = projects.findIndex((p) => p.id === activeProjectId)
        const delta = e.key === 'j' ? 1 : -1
        const nextIndex = (currentIndex + delta + projects.length) % projects.length
        useAppStore.getState().setActiveProject(projects[nextIndex].id)
        return
      }

      // Cmd+Shift+H/L: cycle through tabs
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'h' || e.key === 'l')) {
        e.preventDefault()
        const { activeProjectId } = stateRef.current
        if (!activeProjectId) return
        const store = useAppStore.getState()
        const projectTabs = store.getProjectTabs(activeProjectId)
        if (projectTabs.length < 2) return
        const currentIndex = projectTabs.findIndex((t) => t.id === store.activeTabId)
        const delta = e.key === 'l' ? 1 : -1
        const nextIndex = (currentIndex + delta + projectTabs.length) % projectTabs.length
        store.setActiveTab(projectTabs[nextIndex].id)
        return
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
      <div className="flex flex-1 min-h-0 relative">
        {/* Wallpaper covers entire shell including sidebar and tab bar */}
        {wallpaperUrl && (
          <img
            src={wallpaperUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            style={{
              filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : undefined,
              transform: 'scale(1.1)',
            }}
          />
        )}
        <Sidebar
          visible={sidebarVisible}
          onAddProject={() => setDiscoverOpen(true)}
          wallpaperActive={!!wallpaperUrl}
          backgroundOpacity={backgroundOpacity}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <TabBar
            onCloseTab={handleCloseTab}
            wallpaperActive={!!wallpaperUrl}
            backgroundOpacity={backgroundOpacity}
            chatOpen={chatPanelOpen}
            onToggleChat={() => setChatPanelOpen((v) => !v)}
          />

          {/* Tab content area — flex-1 so StatusLine stays at the bottom */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* Wallpaper tint placeholder — only visible during the brief gap when a
                project is selected but its first terminal hasn't loaded yet. */}
            {wallpaperUrl && activeProjectId && projectTabs.length === 0 && (
              <div
                className="absolute inset-0 z-[5] pointer-events-none"
                style={{
                  background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
                }}
              />
            )}

            {/* Render ALL shell tabs across all projects — keep mounted to preserve state */}
            {tabs
              .filter((t) => t.type === 'shell' && t.terminalId)
              .map((tab) => (
                <div
                  key={tab.terminalId}
                  className={cn(
                    'absolute inset-0',
                    !wallpaperUrl && 'transition-opacity duration-100',
                    activeTabId === tab.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none',
                    wallpaperUrl && 'z-10',
                  )}
                >
                  <XTerminal
                    existingTerminalId={tab.terminalId!}
                    isActive={activeTabId === tab.id}
                    onExit={() => handleCloseTab(tab.id)}
                  />
                </div>
              ))}

            {/* Render feature & tool tabs */}
            {tabs
              .filter((t) => t.type !== 'shell' && t.projectId === activeProjectId)
              .map((tab) => {
                const tool = getToolFromTabType(tab.type)
                let content: React.ReactNode = null
                if (tool) {
                  content = (
                    <ToolTab
                      toolId={tool.id}
                      projectId={tab.projectId}
                      projectPath={activeProject?.path ?? ''}
                    />
                  )
                } else if (tab.type === 'gsd') {
                  content = (
                    <GsdTab projectId={tab.projectId} projectPath={activeProject?.path ?? ''} />
                  )
                } else {
                  return null
                }
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      'absolute inset-0 overflow-auto',
                      !wallpaperUrl && 'transition-opacity duration-100',
                      activeTabId === tab.id
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none',
                      wallpaperUrl ? 'z-10' : 'bg-background',
                    )}
                    style={
                      wallpaperUrl && !tool
                        ? ({
                            '--color-background': 'transparent',
                            '--color-surface': 'color-mix(in srgb, var(--bg2) 50%, transparent)',
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {content}
                  </div>
                )
              })}

            {/* Start screen */}
            {!activeProjectId && (
              <StartScreen
                onAddProject={() => setDiscoverOpen(true)}
                onSwitchProject={() => setSwitcherOpen(true)}
                wallpaperActive={!!wallpaperUrl}
                backgroundOpacity={backgroundOpacity}
              />
            )}
          </div>
          <StatusLine wallpaperActive={!!wallpaperUrl} backgroundOpacity={backgroundOpacity} />
        </div>

        {/* Chat side panel */}
        {activeProjectId && (
          <div
            className={cn(
              'flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200 ease-in-out relative z-[1]',
              !wallpaperUrl && 'bg-surface',
              chatPanelOpen && 'border-l border-border',
            )}
            style={{
              width: chatPanelOpen ? 380 : 0,
              ...(wallpaperUrl
                ? {
                    background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
                  }
                : {}),
            }}
          >
            <div className="h-full" style={{ width: 380 }}>
              <ChatTab projectId={activeProjectId} projectPath={activeProject?.path ?? ''} />
            </div>
          </div>
        )}

        {/* Settings overlay */}
        {activeView === 'settings' && (
          <SettingsPage onClose={() => useAppStore.getState().setActiveView('projects')} />
        )}

        {/* Modals */}
        <DiscoverDialog isOpen={discoverOpen} onClose={() => setDiscoverOpen(false)} />
        <ProjectSwitcher isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} />
        <WallpaperSwitcher
          isOpen={wallpaperSwitcherOpen}
          onClose={() => setWallpaperSwitcherOpen(false)}
        />
        <ThemeSwitcher isOpen={themeSwitcherOpen} onClose={() => setThemeSwitcherOpen(false)} />
        <BackgroundAdjuster
          isOpen={bgAdjusterOpen}
          onClose={() => setBgAdjusterOpen(false)}
          initialFocus={bgAdjusterFocus}
        />

        {/* Keyboard mode overlays */}
        <WhichKey />
        <Notifications />
      </div>
    </div>
  )
}
