import type { ITheme } from '@xterm/xterm'

export interface ThemePreset {
  name: string
  ui: {
    bg: string
    bg2: string
    border: string
    accent: string
    accent2: string
    text: string
    textMuted: string
    textDim: string
    danger: string
    green: string
    yellow: string
    magenta: string
  }
  terminal: ITheme
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  ghostty: {
    name: 'Cyberpunk',
    ui: {
      bg: '#080810',
      bg2: '#0c1018',
      border: '#1e2d40',
      accent: '#c8ff00',
      accent2: '#0fc5ed',
      text: '#d0e0f0',
      textMuted: '#7a9ab8',
      textDim: '#4a6580',
      danger: '#ff2e4a',
      green: '#44ffb1',
      yellow: '#ffe073',
      magenta: '#a277ff',
    },
    terminal: {
      background: '#080810',
      foreground: '#d0e0f0',
      cursor: '#c8ff00',
      cursorAccent: '#080810',
      selectionBackground: '#1e2d40',
      selectionForeground: '#d0e0f0',
      black: '#253545',
      red: '#ff2e4a',
      green: '#44ffb1',
      yellow: '#ffe073',
      blue: '#0fc5ed',
      magenta: '#a277ff',
      cyan: '#24eaf7',
      white: '#d0e0f0',
      brightBlack: '#4a6585',
      brightRed: '#ff5068',
      brightGreen: '#5cffbe',
      brightYellow: '#ffe88a',
      brightBlue: '#3dd4f5',
      brightMagenta: '#b48aff',
      brightCyan: '#4aeeff',
      brightWhite: '#e8f0ff',
    },
  },
  dracula: {
    name: 'Dracula',
    ui: {
      bg: '#282a36',
      bg2: '#21222c',
      border: '#44475a',
      accent: '#bd93f9',
      accent2: '#8be9fd',
      text: '#f8f8f2',
      textMuted: '#8893b8',
      textDim: '#626580',
      danger: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      magenta: '#ff79c6',
    },
    terminal: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#bd93f9',
      cursorAccent: '#282a36',
      selectionBackground: '#44475a',
      selectionForeground: '#f8f8f2',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
  },
  'tokyo-night': {
    name: 'Tokyo Night',
    ui: {
      bg: '#1a1b26',
      bg2: '#16161e',
      border: '#292e42',
      accent: '#7aa2f7',
      accent2: '#2ac3de',
      text: '#c0caf5',
      textMuted: '#7982a8',
      textDim: '#565d80',
      danger: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      magenta: '#bb9af7',
    },
    terminal: {
      background: '#1a1b26',
      foreground: '#c0caf5',
      cursor: '#7aa2f7',
      cursorAccent: '#1a1b26',
      selectionBackground: '#292e42',
      selectionForeground: '#c0caf5',
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
      white: '#a9b1d6',
      brightBlack: '#414868',
      brightRed: '#f7768e',
      brightGreen: '#9ece6a',
      brightYellow: '#e0af68',
      brightBlue: '#7aa2f7',
      brightMagenta: '#bb9af7',
      brightCyan: '#7dcfff',
      brightWhite: '#c0caf5',
    },
  },
  'catppuccin-mocha': {
    name: 'Catppuccin Mocha',
    ui: {
      bg: '#1e1e2e',
      bg2: '#181825',
      border: '#313244',
      accent: '#cba6f7',
      accent2: '#89dceb',
      text: '#cdd6f4',
      textMuted: '#8f93a8',
      textDim: '#626478',
      danger: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      magenta: '#f5c2e7',
    },
    terminal: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#cba6f7',
      cursorAccent: '#1e1e2e',
      selectionBackground: '#313244',
      selectionForeground: '#cdd6f4',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#f5c2e7',
      cyan: '#94e2d5',
      white: '#bac2de',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightMagenta: '#f5c2e7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8',
    },
  },
}

/**
 * Convert hex color to rgba string for glow effects.
 */
function hexToGlow(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Apply a theme's UI colors as CSS custom properties on document root.
 */
export function applyTheme(themeId: string) {
  const theme = THEME_PRESETS[themeId]
  if (!theme) return

  const root = document.documentElement
  root.style.setProperty('--bg', theme.ui.bg)
  root.style.setProperty('--bg2', theme.ui.bg2)
  root.style.setProperty('--border', theme.ui.border)
  root.style.setProperty('--accent', theme.ui.accent)
  root.style.setProperty('--accent2', theme.ui.accent2)
  root.style.setProperty('--text', theme.ui.text)
  root.style.setProperty('--text-muted', theme.ui.textMuted)
  root.style.setProperty('--text-dim', theme.ui.textDim)
  root.style.setProperty('--danger', theme.ui.danger)
  root.style.setProperty('--green', theme.ui.green)
  root.style.setProperty('--yellow', theme.ui.yellow)
  root.style.setProperty('--magenta', theme.ui.magenta)

  // Compute glow values from accent colors
  root.style.setProperty('--accent-glow', hexToGlow(theme.ui.accent, 0.2))
  root.style.setProperty('--accent-glow-strong', hexToGlow(theme.ui.accent, 0.35))
  root.style.setProperty('--accent2-glow', hexToGlow(theme.ui.accent2, 0.2))
}

/**
 * Get the xterm.js terminal theme for a given theme ID.
 */
export function getTerminalTheme(themeId: string): ITheme {
  return THEME_PRESETS[themeId]?.terminal ?? THEME_PRESETS.ghostty.terminal
}
