# cc-manager Tauri Terminal App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a native terminal multiplexer with project management using Tauri v2 + React, with a plugin system where GSD is the first plugin.

**Architecture:** Tauri v2 app with a thin Rust backend (PTY via portable-pty, file I/O, persistence) and React frontend (xterm.js, Zustand, Tailwind). Plugins register tab types. GSD plugin adds overview/docs/execution tabs. Agent SDK runs via Node.js sidecar.

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, @xterm/xterm, portable-pty (Rust), Zustand, Tailwind CSS, Node.js sidecar for Claude Agent SDK

**Design doc:** `docs/plans/2026-03-01-tauri-terminal-app-design.md`

**Reference projects:**
- [tauri-plugin-pty](https://github.com/Tnze/tauri-plugin-pty) — Tauri 2 PTY plugin with xterm.js integration
- [tauri-terminal](https://github.com/marc2332/tauri-terminal) — Terminal emulator in Tauri using xterm.js + portable-pty
- [Terminon](https://github.com/Shabari-K-S/terminon) — Full terminal emulator with Tauri v2 + xterm.js + portable-pty
- [Tauri v2 create project](https://v2.tauri.app/start/create-project/)
- [Tauri v2 Node.js sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
- [Tauri v2 sidecar embedding](https://v2.tauri.app/develop/sidecar/)

**Existing code to reference:**
- `cc-manager-backup/server.js` — original terminal multiplexer (PTY management, project CRUD, theming, WebSocket)
- `cc-manager/frontend/` — GSD dashboard React components (will become GSD plugin)
- `cc-manager/backend/src/services/agentRunner.ts` — Agent SDK execution logic (will become sidecar)
- `cc-manager/backend/src/services/planningParser.ts` — .planning/ file parser (reuse in GSD plugin)

---

## Phase 1: Scaffold Tauri + React App

### Task 1: Create Tauri v2 project with React + TypeScript

**Files:**
- Create: entire project scaffold in `/Users/bradley/Code/cc-manager-v2/`

**Step 1: Scaffold the project**

```bash
cd /Users/bradley/Code
npm create tauri-app@latest cc-manager-v2 -- --template react-ts
```

Select: React, TypeScript, npm

**Step 2: Verify it runs**

```bash
cd cc-manager-v2
npm install
npm run tauri dev
```

Expected: Empty Tauri window opens with Vite React starter

**Step 3: Add Tailwind CSS**

```bash
npm install tailwindcss @tailwindcss/vite
```

Update `vite.config.ts` to add Tailwind plugin. Add `@import "tailwindcss"` to `src/index.css`.

**Step 4: Add core frontend dependencies**

```bash
npm install zustand @xterm/xterm @xterm/addon-fit @xterm/addon-webgl lucide-react
```

**Step 5: Clean starter files**

Remove default Vite starter content from App.tsx, App.css. Set up base CSS with dark theme variables (reference `cc-manager-backup/server.js` THEME_PRESETS for the Ghostty theme as default).

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri v2 + React + TypeScript + Tailwind"
```

---

### Task 2: Rust PTY backend

**Files:**
- Modify: `src-tauri/Cargo.toml` — add portable-pty dependency
- Modify: `src-tauri/src/main.rs` — register PTY commands
- Create: `src-tauri/src/pty.rs` — PTY spawn/write/resize/kill commands

**Step 1: Add portable-pty to Cargo.toml**

```toml
[dependencies]
portable-pty = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
```

**Step 2: Create pty.rs with Tauri commands**

Reference [tauri-terminal](https://github.com/marc2332/tauri-terminal) and [tauri-plugin-pty](https://github.com/Tnze/tauri-plugin-pty) for the pattern.

Commands needed:
- `create_terminal(project_path: String, cols: u16, rows: u16) -> String` — spawns PTY, returns terminal_id, starts emitting `terminal:output` events
- `write_terminal(terminal_id: String, data: String)` — writes stdin to PTY
- `resize_terminal(terminal_id: String, cols: u16, rows: u16)` — resizes PTY
- `close_terminal(terminal_id: String)` — kills PTY process

Use `AppHandle.emit()` to push terminal output as Tauri events.

**Step 3: Register commands in main.rs**

```rust
mod pty;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pty::create_terminal,
            pty::write_terminal,
            pty::resize_terminal,
            pty::close_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

**Step 4: Test PTY creation**

Run `npm run tauri dev`, open browser console, call:
```javascript
await window.__TAURI__.core.invoke('create_terminal', { projectPath: '/tmp', cols: 80, rows: 24 })
```
Expected: Returns a terminal ID string, terminal:output events start firing

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Rust PTY backend with portable-pty"
```

---

### Task 3: XTerminal React component

**Files:**
- Create: `src/components/terminal/XTerminal.tsx` — xterm.js wrapper
- Create: `src/hooks/useTauri.ts` — Tauri IPC helpers

**Step 1: Create useTauri.ts**

Wrappers around `@tauri-apps/api`:
- `useCreateTerminal(projectPath, cols, rows)` — invokes create_terminal
- `useTerminalOutput(terminalId, callback)` — listens to terminal:output events
- `writeTerminal(terminalId, data)` — invokes write_terminal
- `resizeTerminal(terminalId, cols, rows)` — invokes resize_terminal
- `closeTerminal(terminalId)` — invokes close_terminal

**Step 2: Create XTerminal.tsx**

React component that:
1. On mount: creates a PTY via `useCreateTerminal`, initializes xterm.js Terminal with WebGL addon and fit addon
2. Listens to `terminal:output` events, writes data to xterm instance
3. Hooks xterm `onData` to `writeTerminal` (keystroke → PTY stdin)
4. Hooks xterm `onResize` to `resizeTerminal`
5. On unmount: closes PTY, disposes xterm

Reference: existing `cc-manager-backup/server.js` lines 442-530 for the WebSocket PTY protocol (same logic, different transport).

**Step 3: Render a terminal in App.tsx**

Quick test: render `<XTerminal projectPath="/Users/bradley/Code" />` in App.tsx. Verify a working terminal appears.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add XTerminal React component with xterm.js + Tauri IPC"
```

---

## Phase 2: Project Management + Tab System

### Task 4: Rust project persistence

**Files:**
- Create: `src-tauri/src/projects.rs` — project CRUD commands
- Modify: `src-tauri/src/main.rs` — register project commands

**Step 1: Create projects.rs**

JSON persistence to `~/.cc-manager/projects.json`. Commands:
- `list_projects() -> Vec<Project>`
- `add_project(name, path, color) -> Project`
- `remove_project(id)`
- `reorder_projects(ids: Vec<String>)`
- `discover_projects(scan_path: String) -> Vec<DiscoveredProject>`

Project struct: `{ id, name, path, color, created_at }`

Discovery: scan directory for project markers (.git, package.json, Cargo.toml, etc.) — reference `cc-manager-backup/server.js` lines 320-347.

**Step 2: Register commands and test**

**Step 3: Commit**

```bash
git commit -m "feat: add project CRUD with JSON persistence"
```

---

### Task 5: Zustand stores + app layout

**Files:**
- Create: `src/stores/appStore.ts` — active project, tabs, theme
- Create: `src/components/layout/Shell.tsx` — main layout
- Create: `src/components/layout/Sidebar.tsx` — project list
- Create: `src/components/layout/TabBar.tsx` — terminal tabs

**Step 1: Create appStore**

```typescript
interface Tab {
  id: string
  type: string           // 'shell' or plugin tab type id
  label: string
  projectId: string
  terminalId?: string    // only for shell tabs
}

interface AppState {
  activeProjectId: string | null
  tabs: Tab[]
  activeTabId: string | null
  theme: string
  setActiveProject: (id: string | null) => void
  addTab: (tab: Tab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
}
```

**Step 2: Build Shell layout**

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  TabBar                           │
│          ├──────────────────────────────────┤
│          │  Tab content                      │
│          │                                   │
└──────────┴──────────────────────────────────┘
```

**Step 3: Build Sidebar**

Project list with: color dots, project name, click to select. Add/remove buttons. Reference `cc-manager-backup` for UX patterns.

**Step 4: Build TabBar**

Tab strip with: tab labels, close buttons, + button to create new shell tab. Active tab highlighted.

**Step 5: Wire it together**

Selecting a project shows its tabs. Clicking + creates a new shell tab (spawns PTY). Tab content area renders `<XTerminal>` for shell tabs.

**Step 6: Commit**

```bash
git commit -m "feat: add project sidebar, tab system, and app shell layout"
```

---

### Task 6: Theming

**Files:**
- Create: `src/lib/themes.ts` — theme presets (port from backup)
- Create: `src/components/layout/SettingsDialog.tsx` — settings + theme picker
- Create: `src-tauri/src/settings.rs` — settings persistence

**Step 1: Port theme presets**

Copy the 4 theme presets from `cc-manager-backup/server.js` (Ghostty, Dracula, Tokyo Night, Catppuccin Mocha). Define as TypeScript objects with UI colors + xterm.js terminal theme.

**Step 2: Settings persistence**

Rust commands for `~/.cc-manager/settings.json`: `load_settings()`, `save_settings()`.

**Step 3: Settings dialog**

Theme picker, default shell, font size. Apply theme to CSS variables + xterm instances.

**Step 4: Commit**

```bash
git commit -m "feat: add theming with 4 presets and settings persistence"
```

---

## Phase 3: Plugin System

### Task 7: Plugin API + registry

**Files:**
- Create: `src/plugins/types.ts` — PluginDefinition, TabType interfaces
- Create: `src/plugins/index.ts` — plugin registry, PLUGINS array

**Step 1: Define plugin types**

```typescript
interface TabType {
  id: string
  label: string
  icon: ComponentType<{ size?: number }>
  component: ComponentType<{ projectId: string }>
}

interface PluginDefinition {
  id: string
  name: string
  tabTypes: TabType[]
  sidebarSection?: ComponentType<{ projectId: string }>
  isAvailable?: (projectPath: string) => Promise<boolean>  // e.g. check for .planning/
}
```

**Step 2: Wire into tab creation**

The + button shows: Shell (built-in) + all plugin tab types for the active project. `isAvailable` gates plugin tabs (GSD only shows if `.planning/` exists).

**Step 3: Wire into sidebar**

Below project list, render active plugin's `sidebarSection` if provided.

**Step 4: Commit**

```bash
git commit -m "feat: add plugin system with tab type registration"
```

---

## Phase 4: GSD Plugin

### Task 8: GSD Overview tab

**Files:**
- Create: `src/plugins/gsd/index.ts` — GSD plugin definition
- Create: `src/plugins/gsd/OverviewTab.tsx` — phase overview
- Create: `src-tauri/src/fs.rs` — file system read commands (read_dir_tree, read_file)

**Step 1: Add Rust fs commands**

- `read_file(path: String) -> String`
- `read_dir_tree(path: String) -> Vec<TreeNode>` — recursive directory listing

**Step 2: Port planning parser**

Reference `cc-manager/backend/src/services/planningParser.ts`. Rewrite as TypeScript utility in `src/plugins/gsd/parser.ts` that calls Tauri fs commands instead of Node.js fs.

**Step 3: Build OverviewTab**

Port from `cc-manager/frontend/src/components/overview/ProjectOverview.tsx`. Shows phases, status, roadmap progress. Calls Tauri fs commands to read `.planning/` files.

**Step 4: Register GSD plugin**

```typescript
// src/plugins/gsd/index.ts
export const gsdPlugin: PluginDefinition = {
  id: 'gsd',
  name: 'GSD Workflow',
  tabTypes: [
    { id: 'gsd:overview', label: 'Overview', icon: LayoutDashboard, component: OverviewTab },
    // docs and execution added in subsequent tasks
  ],
  isAvailable: async (projectPath) => {
    // Check if .planning/ directory exists via Tauri command
  },
}
```

Add to PLUGINS array in `src/plugins/index.ts`.

**Step 5: Commit**

```bash
git commit -m "feat: add GSD plugin with overview tab"
```

---

### Task 9: GSD Documents tab

**Files:**
- Create: `src/plugins/gsd/DocumentsTab.tsx` — file tree + markdown viewer

**Step 1: Port document viewer**

Reference `cc-manager/frontend/src/components/viewer/DocumentPage.tsx`, `DocViewer.tsx`, `FileTree.tsx`. Rewrite to use Tauri fs commands instead of HTTP API calls.

**Step 2: Add to GSD plugin tabTypes**

**Step 3: Commit**

```bash
git commit -m "feat: add GSD documents tab with file tree and markdown viewer"
```

---

### Task 10: GSD Execution tab + Node.js sidecar

**Files:**
- Create: `sidecar/agent.ts` — Agent SDK runner with stdin/stdout IPC
- Create: `sidecar/package.json`
- Create: `src/plugins/gsd/ExecutionTab.tsx` — execution UI
- Modify: `src-tauri/tauri.conf.json` — register sidecar binary

**Step 1: Create sidecar agent**

Node.js script that:
- Reads commands from stdin (JSON lines)
- Runs Agent SDK `query()` with provided prompt, project path, options
- Writes structured events to stdout (JSON lines): progress, messages, complete, error
- Handles abort via a "cancel" stdin command

Reference `cc-manager/backend/src/services/agentRunner.ts` for the execution logic.

**Step 2: Build sidecar into standalone binary**

Use `pkg` or `esbuild` to bundle into a standalone executable. Place in `src-tauri/binaries/`.

**Step 3: Register sidecar in tauri.conf.json**

```json
{
  "bundle": {
    "externalBin": ["binaries/agent-sidecar"]
  }
}
```

**Step 4: Build ExecutionTab**

Port from `cc-manager/frontend/src/components/execution/ExecutionPanel.tsx`. UI for: selecting a phase, starting execution, streaming log output with progress bars. Communicates with sidecar via Tauri's `Command.sidecar()` API.

**Step 5: Add to GSD plugin tabTypes**

**Step 6: Commit**

```bash
git commit -m "feat: add GSD execution tab with Agent SDK sidecar"
```

---

## Phase 5: Polish + Migration

### Task 11: GSD sidebar section

**Files:**
- Create: `src/plugins/gsd/GsdSidebar.tsx` — nav links for Overview/Docs/Execute

**Step 1: Build sidebar section**

Three nav links that open/focus the corresponding GSD tab. Only visible when active project has `.planning/`.

**Step 2: Add file watcher**

Use Tauri's `tauri-plugin-fs` watch API or a Rust notify crate integration to watch `.planning/` for changes and push events to the frontend. This replaces the chokidar watcher.

**Step 3: Commit**

```bash
git commit -m "feat: add GSD sidebar navigation and file watcher"
```

---

### Task 12: Migrate .planning/ and clean up

**Step 1: Copy .planning/ from cc-manager to cc-manager-v2**

**Step 2: Copy design doc**

**Step 3: Update .planning/PROJECT.md to reflect new architecture**

**Step 4: Final commit + push**

```bash
git commit -m "feat: migrate .planning/ and finalize cc-manager v2"
git remote add origin git@github.com:bradjenn/cc-manager.git
git push -u origin main --force
```

(Force push replaces the old cc-manager repo contents)

---

## Verification Checklist

1. `npm run tauri dev` — app window opens
2. Add a project → appears in sidebar
3. Click project → shell tab created, working terminal
4. Type `ls` in terminal → see directory listing
5. Open multiple tabs → can switch between them
6. Theme picker → colors change across app + terminal
7. Project with `.planning/` → GSD tabs available in + menu
8. GSD Overview tab → shows phase status
9. GSD Documents tab → file tree + markdown rendering
10. GSD Execution tab → can start/stream/stop phase execution
