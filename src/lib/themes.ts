import type { ITheme } from '@xterm/xterm'

export type TerminalVibrancy = 'normal' | 'vivid' | 'high'

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
  josean: {
    name: 'Josean',
    ui: {
      bg: '#011423',
      bg2: '#01101c',
      border: '#033259',
      accent: '#47ff9c',
      accent2: '#0fc5ed',
      text: '#cbe0f0',
      textMuted: '#7a9ab8',
      textDim: '#4a6580',
      danger: '#e52e2e',
      green: '#44ffb1',
      yellow: '#ffe073',
      magenta: '#a277ff',
    },
    terminal: {
      background: '#011423',
      foreground: '#cbe0f0',
      cursor: '#47ff9c',
      cursorAccent: '#011423',
      selectionBackground: '#033259',
      selectionForeground: '#cbe0f0',
      black: '#214969',
      red: '#e52e2e',
      green: '#44ffb1',
      yellow: '#ffe073',
      blue: '#0fc5ed',
      magenta: '#a277ff',
      cyan: '#24eaf7',
      white: '#24eaf7',
      brightBlack: '#214969',
      brightRed: '#e52e2e',
      brightGreen: '#44ffb1',
      brightYellow: '#ffe073',
      brightBlue: '#a277ff',
      brightMagenta: '#a277ff',
      brightCyan: '#24eaf7',
      brightWhite: '#24eaf7',
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
  'gruvbox-dark': {
    name: 'Gruvbox Dark',
    ui: {
      bg: '#282828',
      bg2: '#1d2021',
      border: '#3c3836',
      accent: '#fabd2f',
      accent2: '#83a598',
      text: '#ebdbb2',
      textMuted: '#a89984',
      textDim: '#665c54',
      danger: '#fb4934',
      green: '#b8bb26',
      yellow: '#fabd2f',
      magenta: '#d3869b',
    },
    terminal: {
      background: '#282828',
      foreground: '#ebdbb2',
      cursor: '#fabd2f',
      cursorAccent: '#282828',
      selectionBackground: '#3c3836',
      selectionForeground: '#ebdbb2',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2',
    },
  },
  nord: {
    name: 'Nord',
    ui: {
      bg: '#2e3440',
      bg2: '#272c36',
      border: '#3b4252',
      accent: '#88c0d0',
      accent2: '#81a1c1',
      text: '#eceff4',
      textMuted: '#9aa5b4',
      textDim: '#616e7c',
      danger: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      magenta: '#b48ead',
    },
    terminal: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#88c0d0',
      cursorAccent: '#2e3440',
      selectionBackground: '#434c5e',
      selectionForeground: '#d8dee9',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
    },
  },
  'one-dark': {
    name: 'One Dark',
    ui: {
      bg: '#282c34',
      bg2: '#21252b',
      border: '#3e4452',
      accent: '#61afef',
      accent2: '#56b6c2',
      text: '#abb2bf',
      textMuted: '#7f848e',
      textDim: '#5c6370',
      danger: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      magenta: '#c678dd',
    },
    terminal: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#61afef',
      cursorAccent: '#282c34',
      selectionBackground: '#3e4452',
      selectionForeground: '#abb2bf',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff',
    },
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    ui: {
      bg: '#002b36',
      bg2: '#00252f',
      border: '#073642',
      accent: '#b58900',
      accent2: '#268bd2',
      text: '#839496',
      textMuted: '#657b83',
      textDim: '#586e75',
      danger: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      magenta: '#d33682',
    },
    terminal: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#b58900',
      cursorAccent: '#002b36',
      selectionBackground: '#073642',
      selectionForeground: '#93a1a1',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#586e75',
      brightRed: '#cb4b16',
      brightGreen: '#859900',
      brightYellow: '#b58900',
      brightBlue: '#268bd2',
      brightMagenta: '#6c71c4',
      brightCyan: '#2aa198',
      brightWhite: '#fdf6e3',
    },
  },
  'rose-pine': {
    name: 'Rosé Pine',
    ui: {
      bg: '#191724',
      bg2: '#1f1d2e',
      border: '#26233a',
      accent: '#ebbcba',
      accent2: '#31748f',
      text: '#e0def4',
      textMuted: '#908caa',
      textDim: '#6e6a86',
      danger: '#eb6f92',
      green: '#9ccfd8',
      yellow: '#f6c177',
      magenta: '#c4a7e7',
    },
    terminal: {
      background: '#191724',
      foreground: '#e0def4',
      cursor: '#ebbcba',
      cursorAccent: '#191724',
      selectionBackground: '#26233a',
      selectionForeground: '#e0def4',
      black: '#26233a',
      red: '#eb6f92',
      green: '#9ccfd8',
      yellow: '#f6c177',
      blue: '#31748f',
      magenta: '#c4a7e7',
      cyan: '#9ccfd8',
      white: '#e0def4',
      brightBlack: '#6e6a86',
      brightRed: '#eb6f92',
      brightGreen: '#9ccfd8',
      brightYellow: '#f6c177',
      brightBlue: '#31748f',
      brightMagenta: '#c4a7e7',
      brightCyan: '#9ccfd8',
      brightWhite: '#e0def4',
    },
  },
  kanagawa: {
    name: 'Kanagawa',
    ui: {
      bg: '#1f1f28',
      bg2: '#16161d',
      border: '#2a2a37',
      accent: '#dca561',
      accent2: '#7e9cd8',
      text: '#dcd7ba',
      textMuted: '#9a9a8e',
      textDim: '#727169',
      danger: '#e82424',
      green: '#98bb6c',
      yellow: '#e6c384',
      magenta: '#957fb8',
    },
    terminal: {
      background: '#1f1f28',
      foreground: '#dcd7ba',
      cursor: '#dca561',
      cursorAccent: '#1f1f28',
      selectionBackground: '#2d4f67',
      selectionForeground: '#dcd7ba',
      black: '#16161d',
      red: '#c34043',
      green: '#76946a',
      yellow: '#c0a36e',
      blue: '#7e9cd8',
      magenta: '#957fb8',
      cyan: '#6a9589',
      white: '#c8c093',
      brightBlack: '#727169',
      brightRed: '#e82424',
      brightGreen: '#98bb6c',
      brightYellow: '#e6c384',
      brightBlue: '#7fb4ca',
      brightMagenta: '#938aa9',
      brightCyan: '#7aa89f',
      brightWhite: '#dcd7ba',
    },
  },
}

/**
 * Convert hex color to rgba string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Convert hex color to rgba string for glow effects.
 */
function hexToGlow(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) =>
      Math.round(clamp01(value) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) {
    return { h: 0, s: 0, l }
  }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0

  switch (max) {
    case r:
      h = ((g - b) / d) % 6
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
      break
  }

  h *= 60
  if (h < 0) h += 360

  return { h, s, l }
}

function hueToRgb(p: number, q: number, t: number) {
  let value = t
  if (value < 0) value += 1
  if (value > 1) value -= 1
  if (value < 1 / 6) return p + (q - p) * 6 * value
  if (value < 1 / 2) return q
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    return { r: l, g: l, b: l }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360

  return {
    r: hueToRgb(p, q, hk + 1 / 3),
    g: hueToRgb(p, q, hk),
    b: hueToRgb(p, q, hk - 1 / 3),
  }
}

function adjustHexColor(hex: string, saturationDelta: number, lightnessDelta: number) {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const adjusted = hslToRgb(h, clamp01(s + saturationDelta), clamp01(l + lightnessDelta))
  return rgbToHex(adjusted.r, adjusted.g, adjusted.b)
}

function withTerminalVibrancy(theme: ITheme, vibrancy: TerminalVibrancy): ITheme {
  if (vibrancy === 'normal') return theme

  const profile =
    vibrancy === 'high'
      ? {
          foregroundLightness: 0.1,
          colorSaturation: 0.24,
          colorLightness: 0.05,
          brightSaturation: 0.28,
          brightLightness: 0.07,
        }
      : {
          foregroundLightness: 0.06,
          colorSaturation: 0.16,
          colorLightness: 0.03,
          brightSaturation: 0.18,
          brightLightness: 0.04,
        }

  return {
    ...theme,
    foreground: theme.foreground
      ? adjustHexColor(theme.foreground, 0, profile.foregroundLightness)
      : theme.foreground,
    cursor: theme.cursor
      ? adjustHexColor(theme.cursor, profile.colorSaturation, profile.colorLightness)
      : theme.cursor,
    red: theme.red
      ? adjustHexColor(theme.red, profile.colorSaturation, profile.colorLightness)
      : theme.red,
    green: theme.green
      ? adjustHexColor(theme.green, profile.colorSaturation, profile.colorLightness)
      : theme.green,
    yellow: theme.yellow
      ? adjustHexColor(theme.yellow, profile.colorSaturation, profile.colorLightness)
      : theme.yellow,
    blue: theme.blue
      ? adjustHexColor(theme.blue, profile.colorSaturation, profile.colorLightness)
      : theme.blue,
    magenta: theme.magenta
      ? adjustHexColor(theme.magenta, profile.colorSaturation, profile.colorLightness)
      : theme.magenta,
    cyan: theme.cyan
      ? adjustHexColor(theme.cyan, profile.colorSaturation, profile.colorLightness)
      : theme.cyan,
    white: theme.white
      ? adjustHexColor(theme.white, profile.colorSaturation * 0.15, profile.foregroundLightness)
      : theme.white,
    brightBlack: theme.brightBlack
      ? adjustHexColor(theme.brightBlack, profile.colorSaturation * 0.4, profile.colorLightness)
      : theme.brightBlack,
    brightRed: theme.brightRed
      ? adjustHexColor(theme.brightRed, profile.brightSaturation, profile.brightLightness)
      : theme.brightRed,
    brightGreen: theme.brightGreen
      ? adjustHexColor(theme.brightGreen, profile.brightSaturation, profile.brightLightness)
      : theme.brightGreen,
    brightYellow: theme.brightYellow
      ? adjustHexColor(theme.brightYellow, profile.brightSaturation, profile.brightLightness)
      : theme.brightYellow,
    brightBlue: theme.brightBlue
      ? adjustHexColor(theme.brightBlue, profile.brightSaturation, profile.brightLightness)
      : theme.brightBlue,
    brightMagenta: theme.brightMagenta
      ? adjustHexColor(theme.brightMagenta, profile.brightSaturation, profile.brightLightness)
      : theme.brightMagenta,
    brightCyan: theme.brightCyan
      ? adjustHexColor(theme.brightCyan, profile.brightSaturation, profile.brightLightness)
      : theme.brightCyan,
    brightWhite: theme.brightWhite
      ? adjustHexColor(
          theme.brightWhite,
          profile.colorSaturation * 0.15,
          profile.foregroundLightness + 0.02,
        )
      : theme.brightWhite,
  }
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
export function getTerminalTheme(themeId: string, vibrancy: TerminalVibrancy = 'normal'): ITheme {
  const baseTheme = THEME_PRESETS[themeId]?.terminal ?? THEME_PRESETS.ghostty.terminal
  return withTerminalVibrancy(baseTheme, vibrancy)
}
