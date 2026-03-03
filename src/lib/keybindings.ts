export type KeyboardMode = 'terminal' | 'prefix' | 'sidebar'

export interface ChordBinding {
  key: string
  label: string
  description: string
  category: 'navigation' | 'tabs' | 'panels' | 'special'
  action: string
}

export const CHORD_BINDINGS: ChordBinding[] = [
  // Navigation
  {
    key: 'h',
    label: 'Sidebar',
    description: 'Focus sidebar',
    category: 'navigation',
    action: 'focus-sidebar',
  },
  {
    key: 'l',
    label: 'Terminal',
    description: 'Focus terminal',
    category: 'navigation',
    action: 'focus-terminal',
  },

  // Tabs
  {
    key: 'j',
    label: 'Next Tab',
    description: 'Switch to next tab',
    category: 'tabs',
    action: 'next-tab',
  },
  {
    key: 'k',
    label: 'Prev Tab',
    description: 'Switch to previous tab',
    category: 'tabs',
    action: 'prev-tab',
  },
  {
    key: 'c',
    label: 'New Terminal',
    description: 'Create new terminal tab',
    category: 'tabs',
    action: 'new-terminal',
  },
  {
    key: 'x',
    label: 'Close Tab',
    description: 'Close current tab',
    category: 'tabs',
    action: 'close-tab',
  },
  {
    key: '1',
    label: 'Tab 1',
    description: 'Jump to tab 1',
    category: 'tabs',
    action: 'jump-tab-1',
  },
  {
    key: '2',
    label: 'Tab 2',
    description: 'Jump to tab 2',
    category: 'tabs',
    action: 'jump-tab-2',
  },
  {
    key: '3',
    label: 'Tab 3',
    description: 'Jump to tab 3',
    category: 'tabs',
    action: 'jump-tab-3',
  },
  {
    key: '4',
    label: 'Tab 4',
    description: 'Jump to tab 4',
    category: 'tabs',
    action: 'jump-tab-4',
  },
  {
    key: '5',
    label: 'Tab 5',
    description: 'Jump to tab 5',
    category: 'tabs',
    action: 'jump-tab-5',
  },
  {
    key: '6',
    label: 'Tab 6',
    description: 'Jump to tab 6',
    category: 'tabs',
    action: 'jump-tab-6',
  },
  {
    key: '7',
    label: 'Tab 7',
    description: 'Jump to tab 7',
    category: 'tabs',
    action: 'jump-tab-7',
  },
  {
    key: '8',
    label: 'Tab 8',
    description: 'Jump to tab 8',
    category: 'tabs',
    action: 'jump-tab-8',
  },
  {
    key: '9',
    label: 'Tab 9',
    description: 'Jump to tab 9',
    category: 'tabs',
    action: 'jump-tab-9',
  },

  // Panels
  {
    key: 'p',
    label: 'Projects',
    description: 'Open project switcher',
    category: 'panels',
    action: 'open-project-switcher',
  },
  {
    key: 'w',
    label: 'Wallpaper',
    description: 'Open wallpaper switcher',
    category: 'panels',
    action: 'open-wallpaper-switcher',
  },
  {
    key: 's',
    label: 'Settings',
    description: 'Open settings',
    category: 'panels',
    action: 'open-settings',
  },
  {
    key: 'g',
    label: 'GSD',
    description: 'Open GSD workflow',
    category: 'panels',
    action: 'open-gsd',
  },
  { key: 'i', label: 'Chat', description: 'Open Chat', category: 'panels', action: 'open-chat' },

  // Special
  {
    key: 'a',
    label: 'Ctrl+A',
    description: 'Send literal Ctrl+A to terminal',
    category: 'special',
    action: 'send-ctrl-a',
  },
  { key: '?', label: 'Help', description: 'Show help', category: 'special', action: 'show-help' },
]

export const CHORD_MAP = new Map<string, ChordBinding>(CHORD_BINDINGS.map((b) => [b.key, b]))

export const PREFIX_TIMEOUT_MS = 1500
