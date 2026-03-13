import { create } from 'zustand'
import { appEvents } from '@/lib/events'
import type { KeyboardMode } from '@/lib/keybindings'

export type NotificationSeverity = 'info' | 'warn' | 'error' | 'success'

export interface Notification {
  id: string
  message: string
  severity: NotificationSeverity
  createdAt: number
}

export interface Project {
  id: string
  name: string
  path: string
  color: string
  created_at: string
}

export interface Tab {
  id: string
  type: string // 'shell' or plugin tab type id
  label: string
  projectId: string
  terminalId?: string // only for shell tabs
}

export type TerminalVibrancy = 'normal' | 'vivid' | 'high'

interface AppState {
  // Projects
  projects: Project[]
  activeProjectId: string | null
  setProjects: (projects: Project[]) => void
  setActiveProject: (id: string | null) => void
  lastActiveProjectId: string | null

  // View
  activeView: 'projects' | 'settings'
  setActiveView: (view: 'projects' | 'settings') => void

  // Tabs
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Tab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  renameTab: (id: string, label: string) => void
  getProjectTabs: (projectId: string) => Tab[]
  activeConversationIdByProject: Record<string, number | null>
  setActiveConversation: (projectId: string, conversationId: number | null) => void

  // Theme & terminal settings
  theme: string
  setTheme: (theme: string) => void
  fontSize: number
  setFontSize: (size: number) => void
  lineHeight: number
  setLineHeight: (lh: number) => void
  cursorStyle: 'block' | 'bar' | 'underline'
  setCursorStyle: (style: 'block' | 'bar' | 'underline') => void
  cursorBlink: boolean
  setCursorBlink: (blink: boolean) => void
  scrollback: number
  setScrollback: (lines: number) => void
  fontFamily: string
  setFontFamily: (family: string) => void
  terminalVibrancy: TerminalVibrancy
  setTerminalVibrancy: (vibrancy: TerminalVibrancy) => void
  backgroundImage: string | null
  setBackgroundImage: (img: string | null) => void
  backgroundOpacity: number
  setBackgroundOpacity: (opacity: number) => void
  backgroundBlur: number
  setBackgroundBlur: (blur: number) => void
  hideTitlebar: boolean
  setHideTitlebar: (hide: boolean) => void
  useWebGL: boolean
  setUseWebGL: (use: boolean) => void

  // Keyboard mode (vim-style navigation)
  keyboardMode: KeyboardMode
  setKeyboardMode: (mode: KeyboardMode) => void
  // Sidebar vim navigation
  sidebarSelectedIndex: number
  setSidebarSelectedIndex: (index: number) => void

  // Notifications
  notifications: Notification[]
  addNotification: (message: string, severity?: NotificationSeverity) => void
  dismissNotification: (id: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Projects
  projects: [],
  activeProjectId: null,
  lastActiveProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => {
    set({ activeProjectId: id, activeView: 'projects', ...(id ? { lastActiveProjectId: id } : {}) })
    // Auto-activate the first tab of the newly selected project
    if (id) {
      const tabs = get().tabs.filter((t) => t.projectId === id)
      if (tabs.length > 0) {
        set({ activeTabId: tabs[0].id })
      } else {
        set({ activeTabId: null })
      }
    } else {
      set({ activeTabId: null })
    }
    appEvents.emit('project:switched', { projectId: id })
  },

  // View
  activeView: 'projects',
  setActiveView: (view) => set({ activeView: view }),

  // Tabs
  tabs: [],
  activeTabId: null,
  activeConversationIdByProject: {},
  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),
  closeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      let newActiveTabId = state.activeTabId

      if (state.activeTabId === id) {
        // Activate the next tab in the same project, or null
        const projectId = state.tabs.find((t) => t.id === id)?.projectId
        const projectTabs = newTabs.filter((t) => t.projectId === projectId)
        newActiveTabId = projectTabs.length > 0 ? projectTabs[projectTabs.length - 1].id : null
      }

      return { tabs: newTabs, activeTabId: newActiveTabId }
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  renameTab: (id, label) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, label } : t)),
    })),
  getProjectTabs: (projectId) => get().tabs.filter((t) => t.projectId === projectId),
  setActiveConversation: (projectId, conversationId) =>
    set((state) => ({
      activeConversationIdByProject: {
        ...state.activeConversationIdByProject,
        [projectId]: conversationId,
      },
    })),

  // Theme & terminal settings
  theme: 'ghostty',
  setTheme: (theme) => set({ theme }),
  fontSize: 19,
  setFontSize: (fontSize) => set({ fontSize }),
  lineHeight: 1.0,
  setLineHeight: (lineHeight) => set({ lineHeight }),
  cursorStyle: 'block',
  setCursorStyle: (cursorStyle) => set({ cursorStyle }),
  cursorBlink: true,
  setCursorBlink: (cursorBlink) => set({ cursorBlink }),
  scrollback: 10000,
  setScrollback: (scrollback) => set({ scrollback }),
  fontFamily: 'MesloLGS Nerd Font Mono',
  setFontFamily: (fontFamily) => set({ fontFamily }),
  terminalVibrancy: 'normal',
  setTerminalVibrancy: (terminalVibrancy) => set({ terminalVibrancy }),
  backgroundImage: null,
  setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
  backgroundOpacity: 0.85,
  setBackgroundOpacity: (backgroundOpacity) => set({ backgroundOpacity }),
  backgroundBlur: 0,
  setBackgroundBlur: (backgroundBlur) => set({ backgroundBlur }),
  hideTitlebar: false,
  setHideTitlebar: (hideTitlebar) => set({ hideTitlebar }),
  useWebGL: true,
  setUseWebGL: (useWebGL) => set({ useWebGL }),

  // Keyboard mode
  keyboardMode: 'terminal',
  setKeyboardMode: (keyboardMode) => set({ keyboardMode }),
  // Sidebar vim navigation
  sidebarSelectedIndex: 0,
  setSidebarSelectedIndex: (sidebarSelectedIndex) => set({ sidebarSelectedIndex }),

  // Notifications
  notifications: [],
  addNotification: (message, severity = 'info') =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: crypto.randomUUID(), message, severity, createdAt: Date.now() },
      ],
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
