# Design: cc-manager — Tauri Terminal App

**Date:** 2026-03-01
**Status:** Approved

## What This Is

A native terminal multiplexer with project management, built with Tauri v2 + React. The core app manages projects and terminal sessions. A plugin system allows extensions — GSD is the first plugin, adding planning docs, phase overview, and AI-powered execution.

## Core Product (No Plugins)

A terminal multiplexer with project management:

- **Project sidebar** — add/remove/reorder projects, discover from filesystem, color-coded
- **Terminal tabs** — multiple real PTY sessions per project, create/close/switch
- **Theming** — presets (Ghostty, Dracula, Tokyo Night, Catppuccin) + custom
- **Settings** — default shell, font size, keybindings
- **Persistence** — projects and settings stored in `~/.cc-manager/`

```
┌──────────┬──────────────────────────────────┐
│ Projects │  ┌─────┬───────┬─────┐           │
│          │  │ zsh │ zsh 2 │  +  │           │
│● proj-a  │  ├─────┴───────┴─────┴──────────┤
│  proj-b  │  │                                │
│  proj-c  │  │  ~/Code/proj-a                 │
│          │  │  $ git status                  │
│          │  │  On branch main                │
│          │  │  nothing to commit             │
│          │  │  $ █                            │
│ ──────── │  │                                │
│ + Add    │  │                                │
│ ⚙ Settings  │                                │
└──────────┴──────────────────────────────────┘
```

## Architecture

```
┌─────────────────────────────────────────────┐
│ Tauri App                                    │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ React Frontend (webview)                │ │
│  │  - xterm.js for terminal rendering      │ │
│  │  - Zustand for state                    │ │
│  │  - Plugin system (tab types)            │ │
│  └──────────────┬──────────────────────────┘ │
│                 │ Tauri IPC (invoke/events)   │
│  ┌──────────────┴──────────────────────────┐ │
│  │ Rust Backend (thin layer)               │ │
│  │  - PTY spawn/resize/kill (portable-pty) │ │
│  │  - File system reads                    │ │
│  │  - Process management                   │ │
│  │  - JSON persistence (~/.cc-manager/)    │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Rust does only what requires native access: PTY management, file I/O, process spawning. Everything else (UI state, plugin logic, tab management, theming) lives in TypeScript/React.

Communication via Tauri IPC:
- `invoke()` — frontend calls Rust functions (create terminal, read file, list projects)
- `events` — Rust pushes to frontend (terminal output, file changes)

No HTTP server. No WebSocket. No CORS.

## Plugin System

Plugins register tab types. The core app manages tabs, plugins define what's inside them.

```typescript
interface TabType {
  id: string
  label: string
  icon: ComponentType
  component: ComponentType<{ projectId: string }>
}

interface PluginDefinition {
  id: string
  name: string
  tabTypes: TabType[]
  sidebarSection?: ComponentType<{ projectId: string }>
}
```

- Core app has one built-in tab type: `shell` (real PTY terminal)
- Plugins register additional tab types
- The `+` button shows all available tab types (shell + plugin-provided)
- Plugins can contribute a sidebar section below the project list

## GSD Plugin

Three tab types + sidebar section:

| Tab | What it does | Data source |
|-----|-------------|-------------|
| `gsd:overview` | Phase status, roadmap summary, progress | Reads `.planning/` files via Tauri fs commands |
| `gsd:documents` | File tree + markdown viewer for `.planning/` | Reads `.planning/` directory tree + file contents |
| `gsd:execution` | Run phase via Claude Agent SDK, stream structured output | Node.js sidecar with Agent SDK |

Sidebar section: three nav links (Overview, Docs, Execute) visible when project has `.planning/`.

## Agent SDK: Node.js Sidecar

The Claude Agent SDK is a Node.js library. Since Tauri's frontend is a webview, the SDK runs in a Node.js sidecar process:

- Tauri spawns the sidecar alongside the app
- Frontend sends execution commands via Tauri events
- Sidecar streams structured output back (progress, messages, completion)
- Sidecar handles: session resume, tool selection, abort control

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| App shell | Tauri v2 | Native window, IPC, process management |
| Frontend | React + TypeScript + Vite | UI in Tauri's webview |
| Terminal | @xterm/xterm + WebGL addon | GPU-accelerated terminal display |
| Styling | Tailwind CSS | Theming, layout |
| State | Zustand | App state, tab management, active project |
| PTY | portable-pty (Rust) | Shell session spawning |
| File I/O | Rust std::fs | Project discovery, .planning/ reads, persistence |
| Agent SDK | Node.js sidecar | GSD phase execution |
| Persistence | JSON in ~/.cc-manager/ | Projects, settings, themes |

## Repo Structure

```
cc-manager/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Tauri entry, command registration
│   │   ├── pty.rs              # PTY spawn/resize/kill commands
│   │   ├── fs.rs               # File system commands
│   │   └── projects.rs         # Project CRUD, persistence
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # Shell, Sidebar, TabBar
│   │   ├── terminal/           # XTerminal wrapper component
│   │   └── ui/                 # shadcn components
│   ├── plugins/
│   │   ├── types.ts            # PluginDefinition, TabType interfaces
│   │   ├── index.ts            # Plugin registry
│   │   └── gsd/                # GSD plugin
│   │       ├── index.ts
│   │       ├── OverviewTab.tsx
│   │       ├── DocumentsTab.tsx
│   │       └── ExecutionTab.tsx
│   ├── stores/
│   │   ├── appStore.ts         # Active project, tabs, theme
│   │   └── executionStore.ts   # GSD execution state
│   ├── hooks/
│   │   └── useTauri.ts         # Wrappers around invoke/listen
│   ├── App.tsx
│   └── main.tsx
├── sidecar/                    # Node.js sidecar for Agent SDK
│   ├── agent.ts
│   └── package.json
├── .planning/                  # Project planning docs
├── package.json
└── vite.config.ts
```

## What Carries Over

| Source | What | Reuse |
|--------|------|-------|
| cc-manager-backup | Project management UX, theming presets, terminal multiplexing | Feature reference |
| cc-manager (GSD dashboard) | ProjectOverview, DocViewer, planning parser, execution logic | GSD plugin components (rewritten but same logic) |
| .planning/ | All planning docs, phase research, roadmap | Stays in repo, GSD plugin reads these |

## Decision: Primary Activity

The user's primary activity is running Claude Code sessions. They want to see terminal output alongside context (docs, phase progress). The terminal-first layout with plugin-provided tabs keeps the terminal as the core experience while GSD adds specialized views.
