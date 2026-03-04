# Krux

A native terminal multiplexer and project manager built with Tauri, React, and xterm.js. Keyboard-driven with vim-style navigation and a tmux-like prefix key system.

## Features

- **Native terminal** — GPU-accelerated rendering via xterm.js WebGL, powered by `portable-pty` on the backend
- **Project management** — Auto-discovers projects from `~/Code`, tracks git branches, quick-switch between workspaces
- **Vim keybindings** — `Ctrl+A` prefix mode (tmux-style), vim navigation in sidebar (`j`/`k`/`gg`/`G`), tab jumping (`1`-`9`)
- **Integrated tools** — Launch Claude Code, Codex, OpenCode, or Lazygit directly in tabs
- **AI chat panel** — Built-in chat interface with streaming responses and conversation history
- **11 theme presets** — Cyberpunk, Tokyo Night, Catppuccin Mocha, Dracula, Gruvbox, Nord, One Dark, Solarized, Rosé Pine, Kanagawa, Josean
- **Wallpapers** — Background images with adjustable opacity and blur
- **WhichKey overlay** — Displays available keybindings when in prefix mode
- **Auto-updates** — Built-in update checker via Tauri updater plugin

## Keybindings

`Ctrl+A` enters prefix mode, then:

| Key | Action |
|-----|--------|
| `h` | Focus sidebar |
| `l` | Focus terminal |
| `j` / `k` | Next / previous tab |
| `c` | New terminal |
| `x` | Close tab |
| `1`-`9` | Jump to tab N |
| `p` | Project switcher |
| `w` | Wallpaper switcher |
| `s` | Settings |
| `g` | GSD workflow |
| `i` | Chat panel |
| `b` | Lazygit |
| `a` | Send literal Ctrl+A |
| `?` | Show help |

In sidebar mode: `j`/`k` to navigate, `Enter` to select, `gg`/`G` to jump, `Escape` or `l` to return.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Tauri v2 (Rust) |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Terminal | xterm.js 6 (WebGL addon) |
| PTY | portable-pty |
| State | Zustand |
| UI | Radix UI primitives |
| Linting | Biome |
| Build | Vite |

## Development

```sh
# Install dependencies
npm install

# Run in development mode (starts Vite + Tauri)
npm run tauri dev

# Build for production
npm run tauri build

# Lint & format
npm run lint:fix
npm run format
```

## Project Structure

```
src/                          # React frontend
  components/
    layout/                   # Shell, Sidebar, TabBar, StatusLine, Settings, etc.
    terminal/                 # XTerminal (xterm.js wrapper), ToolTab
    ui/                       # Shared primitives (button, input, dialog, select)
  features/
    chat/                     # AI chat panel with streaming + conversation history
    gsd/                      # GSD workflow viewer
  hooks/                      # useKeyboardMode, useTauri (IPC wrappers)
  lib/                        # themes, keybindings, tools config, wallpapers
  stores/                     # Zustand app store

src-tauri/src/                # Rust backend
  lib.rs                      # Tauri setup, IPC command registration
  pty.rs                      # PTY spawning, reader thread, terminal:output events
  projects.rs                 # Project discovery, CRUD, git branch detection
  settings.rs                 # Settings persistence (~/.krux/settings.json)
  chat.rs                     # Claude CLI subprocess handler
  fs.rs                       # File system operations
```
