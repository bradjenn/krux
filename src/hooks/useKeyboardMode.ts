import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeTerminal } from '@/hooks/useTauri'
import { CHORD_MAP } from '@/lib/keybindings'
import { useAppStore } from '@/stores/appStore'

export interface KeyboardModeActions {
  openProjectSwitcher: () => void
  openWallpaperSwitcher: () => void
  openSettings: () => void
  openGsd: () => void
  openChat: () => void
  openLazygit: () => void
  newTerminal: () => void
  closeTab: () => void
  nextTab: () => void
  prevTab: () => void
  jumpToTab: (n: number) => void
  focusSidebar: () => void
  focusTerminal: () => void
}

export function useKeyboardMode(actions: KeyboardModeActions) {
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  // Track multi-key sequences for sidebar mode (gg, dd)
  const sidebarKeyBuffer = useRef<{ key: string; time: number } | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = useAppStore.getState()
      const mode = state.keyboardMode

      // ── Terminal mode ──
      if (mode === 'terminal') {
        // Catch Ctrl+A for non-xterm contexts (start screen, settings, etc.)
        if (e.ctrlKey && e.key === 'a') {
          e.preventDefault()
          e.stopPropagation()
          state.setKeyboardMode('prefix')
        }
        return
      }

      // ── Prefix mode ──
      if (mode === 'prefix') {
        e.preventDefault()
        e.stopPropagation()

        // Escape cancels prefix mode
        if (e.key === 'Escape') {
          state.setKeyboardMode('terminal')
          return
        }

        const binding = CHORD_MAP.get(e.key)
        if (!binding) {
          // Unknown key — cancel prefix mode
          state.setKeyboardMode('terminal')
          return
        }

        // Dispatch action based on binding
        switch (binding.action) {
          case 'focus-sidebar':
            state.setKeyboardMode('sidebar')
            actionsRef.current.focusSidebar()
            return
          case 'focus-terminal':
            state.setKeyboardMode('terminal')
            actionsRef.current.focusTerminal()
            return
          case 'next-tab':
            state.setKeyboardMode('terminal')
            actionsRef.current.nextTab()
            return
          case 'prev-tab':
            state.setKeyboardMode('terminal')
            actionsRef.current.prevTab()
            return
          case 'new-terminal':
            state.setKeyboardMode('terminal')
            actionsRef.current.newTerminal()
            return
          case 'close-tab':
            state.setKeyboardMode('terminal')
            actionsRef.current.closeTab()
            return
          case 'open-project-switcher':
            state.setKeyboardMode('terminal')
            actionsRef.current.openProjectSwitcher()
            return
          case 'open-wallpaper-switcher':
            state.setKeyboardMode('terminal')
            actionsRef.current.openWallpaperSwitcher()
            return
          case 'open-settings':
            state.setKeyboardMode('terminal')
            actionsRef.current.openSettings()
            return
          case 'open-gsd':
            state.setKeyboardMode('terminal')
            actionsRef.current.openGsd()
            return
          case 'open-chat':
            state.setKeyboardMode('terminal')
            actionsRef.current.openChat()
            return
          case 'open-lazygit':
            state.setKeyboardMode('terminal')
            actionsRef.current.openLazygit()
            return
          case 'toggle-maximize':
            state.setKeyboardMode('terminal')
            getCurrentWindow().toggleMaximize()
            return
          case 'send-ctrl-a': {
            state.setKeyboardMode('terminal')
            // Send literal Ctrl+A (\x01) to the active terminal
            const activeTab = state.tabs.find((t) => t.id === state.activeTabId)
            if (activeTab?.terminalId) {
              writeTerminal(activeTab.terminalId, '\x01')
            }
            return
          }
          case 'show-help':
            // Just keep WhichKey visible (it's already shown in prefix mode)
            // Stay in prefix mode so user can read the help
            return
          default:
            // Handle jump-tab-N
            if (binding.action.startsWith('jump-tab-')) {
              const n = parseInt(binding.action.replace('jump-tab-', ''), 10)
              state.setKeyboardMode('terminal')
              actionsRef.current.jumpToTab(n)
              return
            }
            state.setKeyboardMode('terminal')
            return
        }
      }

      // ── Sidebar mode ──
      if (mode === 'sidebar') {
        e.preventDefault()
        e.stopPropagation()

        const projects = state.projects
        const idx = state.sidebarSelectedIndex
        const now = Date.now()

        switch (e.key) {
          case 'j':
            state.setSidebarSelectedIndex(Math.min(idx + 1, projects.length - 1))
            return
          case 'k':
            state.setSidebarSelectedIndex(Math.max(idx - 1, 0))
            return
          case 'g':
            // gg — jump to top (multi-key sequence)
            if (
              sidebarKeyBuffer.current?.key === 'g' &&
              now - sidebarKeyBuffer.current.time < 400
            ) {
              state.setSidebarSelectedIndex(0)
              sidebarKeyBuffer.current = null
            } else {
              sidebarKeyBuffer.current = { key: 'g', time: now }
            }
            return
          case 'G':
            // G — jump to bottom
            state.setSidebarSelectedIndex(Math.max(0, projects.length - 1))
            return
          case 'd':
            // dd — remove project (multi-key sequence)
            if (
              sidebarKeyBuffer.current?.key === 'd' &&
              now - sidebarKeyBuffer.current.time < 400
            ) {
              // TODO: implement project removal from sidebar if desired
              sidebarKeyBuffer.current = null
            } else {
              sidebarKeyBuffer.current = { key: 'd', time: now }
            }
            return
          case 'Enter': {
            const project = projects[idx]
            if (project) {
              state.setActiveProject(project.id)
              state.setKeyboardMode('terminal')
            }
            return
          }
          case 'Escape':
          case 'l':
            state.setKeyboardMode('terminal')
            return
          case '/':
            // Open project switcher from sidebar
            state.setKeyboardMode('terminal')
            actionsRef.current.openProjectSwitcher()
            return
        }
      }
    }

    window.addEventListener('keydown', handler, true) // capture phase
    return () => window.removeEventListener('keydown', handler, true)
  }, [])
}
