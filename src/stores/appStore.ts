import { create } from 'zustand'

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

interface AppState {
  // Projects
  projects: Project[]
  activeProjectId: string | null
  setProjects: (projects: Project[]) => void
  setActiveProject: (id: string | null) => void

  // Tabs
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Tab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  getProjectTabs: (projectId: string) => Tab[]

  // Theme
  theme: string
  setTheme: (theme: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Projects
  projects: [],
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => {
    set({ activeProjectId: id })
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
  },

  // Tabs
  tabs: [],
  activeTabId: null,
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
  getProjectTabs: (projectId) => get().tabs.filter((t) => t.projectId === projectId),

  // Theme
  theme: 'ghostty',
  setTheme: (theme) => set({ theme }),
}))
