<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Krux" width="120" height="120">

  <h1>Krux</h1>

  <p>
    <strong>A native terminal multiplexer and project manager</strong>
  </p>
  <p>
    Keyboard-driven with vim-style navigation, a tmux-like prefix system, and integrated AI coding tools.
  </p>

  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-blue?style=for-the-badge" alt="Features"></a>
    <a href="#download"><img src="https://img.shields.io/badge/Download-green?style=for-the-badge" alt="Download"></a>
    <a href="#keybindings"><img src="https://img.shields.io/badge/Keybindings-purple?style=for-the-badge" alt="Keybindings"></a>
    <a href="#development"><img src="https://img.shields.io/badge/Development-orange?style=for-the-badge" alt="Development"></a>
  </p>
</div>

<!-- Add a screenshot here: ![Krux](screenshot.png) -->

## Features

### Terminal

- **GPU-accelerated rendering** via xterm.js WebGL, powered by `portable-pty`
- **Multiple tabs** with quick switching (`Ctrl+A` + `1`-`9`)
- **Prefix key system** inspired by tmux — `Ctrl+A` enters command mode
- **WhichKey overlay** shows available bindings when in prefix mode

### Project Management

- **Auto-discovers projects** from `~/Code` with git branch tracking
- **Quick-switch** between workspaces with fuzzy search
- **Sidebar navigation** with full vim motions (`j`/`k`/`gg`/`G`)

### Integrated Tools

- **Claude Code**, **Codex**, **OpenCode** — launch AI coding agents directly in tabs
- **Lazygit** — built-in git UI
- **AI chat panel** with streaming responses and conversation history

### Appearance

- **11 theme presets** — Cyberpunk, Tokyo Night, Catppuccin Mocha, Dracula, Gruvbox, Nord, One Dark, Solarized, Rose Pine, Kanagawa, Josean
- **Background wallpapers** with adjustable opacity and blur
- **Auto-updates** — in-app update notifications and one-click install

## Download

**[Download the latest release](https://github.com/bradjenn/krux/releases/latest)** — available for macOS (Apple Silicon + Intel), Windows, and Linux (.deb, .AppImage, .rpm).

> [!NOTE]
> macOS and Windows builds are currently unsigned. On macOS, right-click the app and select "Open" on first launch. On Windows, click "More info" then "Run anyway" in the SmartScreen prompt.

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

**Sidebar mode:** `j`/`k` to navigate, `Enter` to select, `gg`/`G` to jump top/bottom, `Escape` or `l` to return.

## Development

### Tech Stack

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

### Getting Started

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

### Project Structure

```
src/                          # React frontend
  components/
    layout/                   # Shell, Sidebar, TabBar, StatusLine, Settings
    terminal/                 # XTerminal (xterm.js wrapper), ToolTab
    ui/                       # Shared primitives (button, input, dialog)
  features/
    chat/                     # AI chat panel with streaming + history
    gsd/                      # GSD workflow viewer
  hooks/                      # useKeyboardMode, useTauri (IPC wrappers)
  lib/                        # themes, keybindings, tools config, wallpapers
  stores/                     # Zustand app store

src-tauri/src/                # Rust backend
  lib.rs                      # Tauri setup, IPC command registration
  pty.rs                      # PTY spawning, reader thread, output events
  projects.rs                 # Project discovery, CRUD, git branch detection
  settings.rs                 # Settings persistence (~/.krux/settings.json)
  chat.rs                     # Claude CLI subprocess handler
  fs.rs                       # File system operations
```

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>
    <a href="https://github.com/bradjenn/krux/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/bradjenn/krux/issues">Request Feature</a>
  </p>
</div>
