# Phase 2: Frontend + Document Viewer - Research

**Researched:** 2026-03-01
**Domain:** React SPA, markdown rendering, WebSocket live updates, file watching
**Confidence:** HIGH (core stack), MEDIUM (WS/CORS integration pattern)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual aesthetic**
- Hybrid theme: shadcn/ui dark base with monospace headings/labels and terminal-green accents
- Compact information density — developer tool feel, not spacious consumer app
- Green accent color (emerald/terminal-green) for progress bars, active states, success indicators
- Linear as the primary visual reference — clean, minimal, fast-feeling
- Sans-serif body text, monospace for headings, status indicators, and code blocks
- Zinc/slate dark backgrounds with subtle borders

**Dashboard layout**
- Collapsible left sidebar (VS Code activity bar style) — full navigation when expanded, icon rail when collapsed
- Project overview as the default home/landing view — phase list with progress, state card, quick stats
- Project switcher: dropdown in sidebar header for quick switching PLUS Cmd+K command palette for power users
- "Add project" available in both dropdown and command palette
- Separate settings/management view accessible from dropdown for removing projects
- Clicking a phase from overview navigates to the document viewer filtered to that phase's directory

**Document viewer**
- Full filesystem tree representation of .planning/ directory — collapsible folders, VS Code explorer style
- Top-level files (ROADMAP.md, STATE.md, etc.) shown first, then phases/ with subdirectories
- GitHub-flavored markdown rendering — tables, task lists, fenced code blocks with syntax highlighting
- Breadcrumb bar for path context (phases > 01-backend > 01-01-PLAN.md), no heading TOC
- Subtle status indicators next to plan files in the tree: green dot for complete (has SUMMARY), yellow for in-progress, no indicator for static files

**Live update behavior**
- Everything updates live via WebSocket — overview page, document viewer, and file tree
- Changed files get a brief highlight/glow in the file tree (like git status coloring)
- Document content refreshes silently in-place when the viewed file changes
- New files appear in tree automatically WITH a toast notification ("New file: 02-01-PLAN.md")
- Scroll position preserved when document updates mid-read
- "New content above" indicator when content is added above the viewport — click to scroll up

### Claude's Discretion
- Typography details (specific fonts, sizes, weights)
- Animation/transition timing and easing
- Loading skeleton design
- Error state handling and empty state illustrations
- Sidebar default width and collapse breakpoint
- Command palette scope beyond project switching (future phases may expand it)
- Syntax highlighting theme (should complement the green/zinc palette)
- WebSocket reconnection strategy and debounce timing for rapid file changes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | User can register project paths to the dashboard | Backend API exists at POST /api/projects; frontend needs a form/dialog wired to the command palette and sidebar dropdown |
| PROJ-02 | User can remove registered projects | Backend API exists at DELETE /api/projects/:id; frontend needs settings view and confirmation dialog |
| PROJ-03 | User can switch between registered projects | Backend returns project list at GET /api/projects; frontend needs Zustand store tracking activeProjectId, project switcher dropdown + Cmd+K |
| PROJ-04 | User sees project overview (phase count, progress, current status) | GET /api/projects/:id/overview returns ProjectOverview (project, phases[], state); frontend overview page parses Phase.disk_status for progress |
| PROJ-05 | Dashboard auto-updates when .planning/ files change on disk | Requires: chokidar watcher on backend + @hono/node-ws WebSocket broadcast + React WS client that invalidates TanStack Query cache |
| DOCS-01 | User can view .planning/ files rendered as formatted markdown | GET /api/projects/:id/docs/* returns raw markdown; frontend renders with react-markdown v10 + remark-gfm |
| DOCS-02 | User can navigate .planning/ directory via file tree sidebar | Backend needs new GET /api/projects/:id/docs endpoint returning directory listing as JSON; frontend renders collapsible tree |
| DOCS-03 | Code blocks in documents have syntax highlighting | react-markdown components prop with rehype-highlight plugin; theme must complement zinc/emerald palette |
</phase_requirements>

---

## Summary

Phase 2 builds a React SPA served from `frontend/` (a new Vite workspace) alongside the existing `backend/`. The stack is well-established: Vite + React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui. As of March 2025, shadcn/ui has full Tailwind v4 support — the STATE.md concern about compatibility is resolved; use v4 from the start.

The document viewer uses react-markdown v10 with remark-gfm for GFM rendering and rehype-highlight for syntax highlighting. Both are mature, well-integrated, and verified as current. react-markdown renders markdown safely to React elements (no raw HTML injection), so no additional sanitization library is needed. The file tree sidebar should be built as a custom recursive component (no external tree library needed) — the VS Code explorer style is 15–30 lines of recursive React.

WebSocket infrastructure requires the most care. The backend needs `@hono/node-ws` added alongside the existing Hono server, with `injectWebSocket(server)` called after `serve()`. The known CORS + WebSocket header conflict (GitHub issue #4090) is avoided by mounting the `/ws` route before applying CORS middleware, or by excluding the WS path from the CORS `app.use('/api/*')` scope. Chokidar v5 is ESM-only and Node 20+ only; since the backend is already ESM (`"type": "module"`), v5 is appropriate if Node >= 20 is guaranteed. Use chokidar v3 as a safe fallback if Node version is uncertain.

State management follows the established split from STATE.md: TanStack Query v5 for all server data (projects, overview, docs), Zustand v5 for UI state (activeProjectId, sidebarOpen, selectedFile). WebSocket events invalidate TanStack Query cache entries, driving re-fetches without coupling WS logic to component trees.

**Primary recommendation:** Scaffold `frontend/` with `npm create vite@latest`, add shadcn/ui with Tailwind v4, implement the three plans in order (02-01 scaffold → 02-02 document viewer → 02-03 WebSocket), keeping the WS route isolated from CORS middleware.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | ^6.x | Build tool / dev server | Near-instant HMR, ESM-native, standard for React SPAs in 2025 |
| React | ^18.x | UI framework | Stable, shadcn/ui targets 18 (v19 is opt-in upgrade) |
| TypeScript | ^5.x | Type safety | Already used in backend; shared types in `shared/` |
| Tailwind CSS | ^4.x | Utility-first CSS | shadcn/ui now fully supports v4 as of March 2025 |
| shadcn/ui | latest | Component library | Locked decision; built on Radix UI + Tailwind, fully customizable |
| @tanstack/react-query | ^5.x | Server state | Locked decision; handles caching, refetch, staleTime |
| zustand | ^5.x | UI/client state | Locked decision; no-provider, TypeScript-native |
| react-markdown | ^10.x | Markdown rendering | Standard for dynamic markdown in React; renders safely to React elements |
| remark-gfm | ^4.x | GFM tables/tasklists | Required plugin for GitHub-flavored markdown |
| rehype-highlight | ^7.x | Syntax highlighting | Lightweight Highlight.js wrapper; SSR-compatible |
| highlight.js | ^11.x | Syntax theme CSS | Used by rehype-highlight; import theme CSS once globally |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.x | Toast notifications | Replaces deprecated shadcn/ui toast; used for "New file" events |
| cmdk | via shadcn | Command palette | shadcn/ui Command component built on cmdk (same library as Linear) |
| lucide-react | latest | Icons | Standard icon set for shadcn/ui |
| @hono/node-ws | latest | WebSocket on Node | Required to add WS to existing Hono/Node.js server |
| chokidar | v5 (ESM) or v3 | File watching | v5 if Node >= 20 confirmed; v3 if uncertain |
| react-use-websocket | ^4.x | WS client hook | Optional; provides reconnect/heartbeat; can hand-roll for this project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rehype-highlight | react-syntax-highlighter | react-syntax-highlighter is legacy (Prism/hljs bundles the full parser); rehype-highlight integrates with react-markdown's plugin pipeline and is smaller |
| rehype-highlight | shiki / rehype-pretty-code | Shiki produces better output but is async-only and heavier; overkill for a local dev tool where bundle size matters less than simplicity |
| react-arborist | Custom recursive tree | react-arborist is powerful but heavyweight; a custom 30-line recursive component is simpler and fully controllable for this specific use case |
| react-use-websocket | Custom useWebSocket hook | react-use-websocket adds reconnection and heartbeat out of the box; worthwhile if reconnection logic is complex; hand-rolling is fine for local single-user tool |
| TanStack Query polling | WebSocket push | Polling creates unnecessary load; WS push is the right model for file-change-driven updates |

**Installation:**
```bash
# In frontend/
npm create vite@latest . -- --template react-ts
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init

# Core libraries
npm install @tanstack/react-query zustand react-markdown remark-gfm rehype-highlight highlight.js sonner lucide-react

# Backend additions (in backend/)
npm install @hono/node-ws chokidar
```

---

## Architecture Patterns

### Recommended Project Structure

```
├── backend/          # Existing Hono server (Phase 1)
│   └── src/
│       ├── index.ts            # Add: createNodeWebSocket, injectWebSocket
│       ├── lib/watcher.ts      # New: chokidar watcher service
│       ├── routes/
│       │   ├── ws.ts           # New: WebSocket route (/ws)
│       │   └── docs.ts         # Update: add GET /:id/docs (directory listing)
│       └── ...
├── frontend/         # New Vite React SPA
│   ├── src/
│   │   ├── main.tsx            # QueryClientProvider root
│   │   ├── App.tsx             # Router + layout shell
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx          # Collapsible VS Code-style sidebar
│   │   │   │   └── CommandPalette.tsx   # Cmd+K dialog (shadcn Command)
│   │   │   ├── overview/
│   │   │   │   ├── ProjectOverview.tsx  # Phase list, progress, state card
│   │   │   │   └── PhaseCard.tsx
│   │   │   ├── viewer/
│   │   │   │   ├── FileTree.tsx         # Recursive tree component
│   │   │   │   ├── DocViewer.tsx        # react-markdown renderer
│   │   │   │   └── Breadcrumb.tsx
│   │   │   └── ui/                      # shadcn/ui generated components
│   │   ├── hooks/
│   │   │   ├── useProjects.ts           # TanStack Query hooks (projects, overview, docs)
│   │   │   ├── useWebSocket.ts          # WS connection + event dispatch
│   │   │   └── useFileTree.ts           # Directory listing query
│   │   ├── stores/
│   │   │   └── appStore.ts             # Zustand: activeProjectId, sidebarOpen, selectedFile
│   │   ├── lib/
│   │   │   └── queryClient.ts          # Shared QueryClient instance
│   │   └── index.css                   # Tailwind base + custom CSS vars (zinc/emerald theme)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
└── shared/           # Existing shared types (imported by both backend and frontend)
    └── types/index.ts
```

### Pattern 1: State Split — TanStack Query + Zustand

**What:** TanStack Query owns all server-derived data (fetched, cached, refetchable). Zustand owns ephemeral UI state (which project is active, sidebar open/closed, which file is selected). They never overlap.

**When to use:** Any time you need data from the API (use TQ) vs. state that lives only in the browser (use Zustand).

**Example:**
```typescript
// stores/appStore.ts — Zustand for UI state only
import { create } from 'zustand'

interface AppState {
  activeProjectId: string | null
  sidebarOpen: boolean
  selectedFile: string | null
  setActiveProject: (id: string) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedFile: (path: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeProjectId: null,
  sidebarOpen: true,
  selectedFile: null,
  setActiveProject: (id) => set({ activeProjectId: id, selectedFile: null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedFile: (path) => set({ selectedFile: path }),
}))

// hooks/useProjects.ts — TanStack Query for server state
import { useQuery } from '@tanstack/react-query'
import type { ProjectOverview } from '../../shared/types'

export function useProjectOverview(projectId: string | null) {
  return useQuery<ProjectOverview>({
    queryKey: ['overview', projectId],
    queryFn: () =>
      fetch(`http://localhost:3001/api/projects/${projectId}/overview`)
        .then((r) => r.json()),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}
```

### Pattern 2: WebSocket -> Query Cache Invalidation

**What:** The WS connection lives in a context provider at the app root. WS messages carry event types (`file:changed`, `file:created`, `file:deleted`). Handlers call `queryClient.invalidateQueries()` to trigger re-fetches.

**When to use:** Every live-update scenario — file tree refresh, document content refresh, overview stats refresh.

**Example:**
```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type WsEvent =
  | { type: 'file:changed'; projectId: string; path: string }
  | { type: 'file:created'; projectId: string; path: string }
  | { type: 'file:deleted'; projectId: string; path: string }

export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws')
    wsRef.current = ws

    ws.onmessage = (evt) => {
      const event: WsEvent = JSON.parse(evt.data)
      const { projectId, path } = event

      // Invalidate file tree and overview for the affected project
      queryClient.invalidateQueries({ queryKey: ['filetree', projectId] })
      queryClient.invalidateQueries({ queryKey: ['overview', projectId] })

      // Invalidate the specific document if it's the one being viewed
      if (event.type === 'file:changed') {
        queryClient.invalidateQueries({ queryKey: ['doc', projectId, path] })
      }
    }

    return () => ws.close()
  }, [queryClient])
}
```

### Pattern 3: @hono/node-ws Integration (Backend)

**What:** `createNodeWebSocket` wraps the Hono app to produce `upgradeWebSocket` and `injectWebSocket`. The WS route is registered before CORS middleware application to avoid the header-immutability conflict (GitHub issue #4090).

**When to use:** Adding WebSocket to any existing Hono + @hono/node-server setup.

**Example:**
```typescript
// backend/src/index.ts (updated)
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createNodeWebSocket } from '@hono/node-ws'
import { createWatcher } from './lib/watcher.js'

const app = new Hono()

// Create WS infrastructure BEFORE mounting CORS middleware
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// Track connected clients for broadcast
const clients = new Set<import('@hono/node-ws').WSContext>()

// WS route — must be registered BEFORE app.use('/api/*', cors(...))
// This avoids the header-immutability conflict from issue #4090
app.get('/ws', upgradeWebSocket(() => ({
  onOpen(_evt, ws) { clients.add(ws) },
  onClose(_evt, ws) { clients.delete(ws) },
})))

// CORS only on /api/* — does not affect /ws
app.use('/api/*', cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))

// ... other routes ...

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`GSD backend running on http://localhost:${info.port}`)
  setupSigtermHandler(server as unknown as import('node:http').Server)

  // Wire chokidar to broadcast to all WS clients
  createWatcher((event) => {
    const msg = JSON.stringify(event)
    for (const ws of clients) ws.send(msg)
  })
})

// CRITICAL: injectWebSocket must be called after serve()
injectWebSocket(server)
```

### Pattern 4: Chokidar Watcher Service

**What:** A module that accepts a broadcast callback and watches registered project paths. Project paths are obtained from ProjectStore at startup, and dynamically updated when projects are added/removed.

**When to use:** Anytime a file in a registered project's `.planning/` directory changes.

**Example:**
```typescript
// backend/src/lib/watcher.ts
import chokidar from 'chokidar'
import { join } from 'node:path'
import { ProjectStore } from '../services/projectStore.js'

type WatchEvent = {
  type: 'file:changed' | 'file:created' | 'file:deleted'
  projectId: string
  path: string  // relative to .planning/
}

export function createWatcher(broadcast: (event: WatchEvent) => void) {
  const projects = ProjectStore.list()
  const paths = projects.map((p) => join(p.path, '.planning'))

  if (paths.length === 0) return

  const watcher = chokidar.watch(paths, {
    ignoreInitial: true,
    persistent: true,
    // Debounce rapid writes (e.g. editor saves)
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  })

  watcher.on('change', (filePath) => {
    const event = resolveEvent('file:changed', filePath, projects)
    if (event) broadcast(event)
  })
  watcher.on('add', (filePath) => {
    const event = resolveEvent('file:created', filePath, projects)
    if (event) broadcast(event)
  })
  watcher.on('unlink', (filePath) => {
    const event = resolveEvent('file:deleted', filePath, projects)
    if (event) broadcast(event)
  })

  return watcher
}

function resolveEvent(
  type: WatchEvent['type'],
  filePath: string,
  projects: Array<{ id: string; path: string }>
): WatchEvent | null {
  for (const p of projects) {
    const planningDir = join(p.path, '.planning') + '/'
    if (filePath.startsWith(planningDir)) {
      return { type, projectId: p.id, path: filePath.slice(planningDir.length) }
    }
  }
  return null
}
```

### Pattern 5: File Tree as Recursive Component

**What:** A custom recursive component traverses the directory listing from the API. No external tree library needed.

**Example:**
```typescript
// components/viewer/FileTree.tsx
interface TreeNode {
  name: string
  path: string         // relative to .planning/
  type: 'file' | 'dir'
  children?: TreeNode[]
  status?: 'complete' | 'in-progress' | undefined
}

function TreeItem({ node, depth, onSelect, selectedPath }: {
  node: TreeNode
  depth: number
  onSelect: (path: string) => void
  selectedPath: string | null
}) {
  const [open, setOpen] = useState(depth === 0)

  if (node.type === 'dir') {
    return (
      <div>
        <button
          className="flex items-center gap-1 w-full px-2 py-0.5 hover:bg-zinc-800 text-zinc-400"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-xs font-mono">{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <TreeItem key={child.path} node={child} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
        ))}
      </div>
    )
  }

  return (
    <button
      className="flex items-center gap-1.5 w-full px-2 py-0.5 text-left hover:bg-zinc-800"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      onClick={() => onSelect(node.path)}
    >
      {node.status === 'complete' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
      {node.status === 'in-progress' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />}
      <span className="text-xs font-mono text-zinc-300">{node.name}</span>
    </button>
  )
}
```

### Pattern 6: react-markdown with GFM + Syntax Highlighting

**Example:**
```typescript
// components/viewer/DocViewer.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'   // or github-dark — see Discretion below

export function DocViewer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Monospace headings per design decision
        h1: ({ children }) => <h1 className="font-mono text-2xl font-bold text-emerald-400 mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="font-mono text-xl font-semibold text-zinc-200 mb-3">{children}</h2>,
        // Styled tables
        table: ({ children }) => <table className="border-collapse w-full text-sm mb-4">{children}</table>,
        th: ({ children }) => <th className="border border-zinc-700 px-3 py-1.5 text-left font-mono text-zinc-300 bg-zinc-900">{children}</th>,
        td: ({ children }) => <td className="border border-zinc-700 px-3 py-1.5 text-zinc-400">{children}</td>,
        // Task list checkboxes (remark-gfm)
        input: ({ checked }) => (
          <input type="checkbox" checked={checked} readOnly className="mr-2 accent-emerald-500" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

### Anti-Patterns to Avoid

- **Applying CORS middleware globally before the WS route:** Results in "Headers are immutable" errors when upgradeWebSocket() tries to set upgrade headers. Register `/ws` route first, then `app.use('/api/*', cors(...))`.
- **Putting server state in Zustand:** selectedFile, sidebarOpen -> Zustand. Project data, phase list, overview -> TanStack Query. Never store fetched data in Zustand.
- **Watching the entire project root with chokidar:** Watch only `<projectPath>/.planning/` — watching the full project directory causes enormous event volumes for active codebases.
- **No debounce on file watcher:** Editors (especially vim/neovim) often write files in multiple rapid bursts. Use `awaitWriteFinish` in chokidar to coalesce events.
- **Adding rehype-raw without justification:** react-markdown renders safely by default. Adding rehype-raw re-enables raw HTML passthrough and introduces risk. Do not add it unless there is a specific, documented reason.
- **Multiple WebSocket connections per component:** Create one WS connection at the app root (context or top-level hook), not per component. Multiple WS connections to the same server will exhaust connections fast.
- **Scroll position loss on document update:** When invalidating `['doc', projectId, path]` and re-fetching, React will re-render the markdown. Use a ref to capture scrollTop before invalidation and restore it after the new content renders.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser/renderer | react-markdown v10 | CommonMark compliant, safe rendering to React elements, plugin-extensible, 50k+ dependents |
| GFM tables, task lists | Custom markdown extensions | remark-gfm v4 | Plugin for the exact GitHub extensions needed; one import |
| Syntax highlighting | Custom tokenizer | rehype-highlight + highlight.js | 200+ languages, tree-shakeable, drop-in rehype plugin |
| Command palette | Custom modal + search | shadcn Command (cmdk) | Same library powering Linear's command palette; handles fuzzy search, keyboard nav, accessibility |
| Toast notifications | Custom notification system | sonner (via shadcn) | Replaces deprecated shadcn toast; handles queuing, positioning, accessibility |
| WebSocket broadcast tracking | Custom client registry | Set<WSContext> with onOpen/onClose | Simple, sufficient; no external pub-sub needed for single-server local tool |
| Theme tokens | Hard-coded colors | CSS variables via shadcn theming | Enables dark/light switching later; all shadcn components inherit from vars |

**Key insight:** This phase's complexity lives in composition (wiring existing pieces correctly) not in novel algorithms. The hardest part is the WS/CORS ordering constraint and scroll preservation — both are solved patterns.

---

## Common Pitfalls

### Pitfall 1: WebSocket + CORS Header Conflict

**What goes wrong:** `upgradeWebSocket()` internally sets headers on the response. If CORS middleware runs first on the same route, headers become immutable before the upgrade, causing a runtime crash: "TypeError: Cannot set property on immutable object."

**Why it happens:** Node.js HTTP upgrade sequences lock headers at a specific lifecycle point. CORS middleware runs during Hono's request pipeline before the route handler, so it wins the race to set headers.

**How to avoid:** Register the `/ws` route before calling `app.use('/api/*', cors(...))`. Since CORS is scoped to `/api/*` and the WS route is at `/ws`, they don't overlap — no conflict.

**Warning signs:** Server crashes on first WebSocket connection attempt; "Headers are immutable" in stack trace.

### Pitfall 2: chokidar Version / ESM Mismatch

**What goes wrong:** chokidar v5 (released November 2025) is ESM-only and requires Node.js >= 20. Importing it in a CJS context or on Node 18 will fail with `ERR_REQUIRE_ESM` or a Node version error.

**Why it happens:** The backend is already `"type": "module"` (ESM), so chokidar v5 should work — but Node version must be verified.

**How to avoid:** Confirm `node -v` >= 20 before using chokidar v5. If Node 18 is required, pin to chokidar v3 (`npm install chokidar@3`). Note: chokidar v4 removed glob support — if you were using glob patterns in watch paths, v3 is safer.

**Warning signs:** `ERR_REQUIRE_ESM`, `ERR_UNSUPPORTED_ESM_URL_SCHEME`, or "requires Node.js v20+" at startup.

### Pitfall 3: Shared Types Path Resolution in Vite

**What goes wrong:** The frontend imports from `../../shared/types` (outside `frontend/src/`). Vite's default config may not resolve paths outside the project root, causing "file not found" build errors.

**Why it happens:** Vite scopes path resolution to the project root by default. Cross-package imports require explicit configuration.

**How to avoid:** Set `resolve.alias` in `vite.config.ts` for the shared types path, and ensure the frontend's `tsconfig.json` includes the shared directory:
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, '../shared'),
  }
}
```
```json
// tsconfig.json "include"
["src/**/*", "../shared/**/*"]
```

**Warning signs:** TypeScript errors on shared type imports that work fine in the backend.

### Pitfall 4: TanStack Query Stale Data After WS Event

**What goes wrong:** WS event fires, `invalidateQueries` is called, but the component still shows old data for several seconds.

**Why it happens:** By default, TanStack Query refetches only when the window is focused or the query is stale. After invalidation, it refetches immediately but only if there are active observers.

**How to avoid:** When calling `invalidateQueries`, also trigger a `refetch`: `queryClient.invalidateQueries({ queryKey: [...], refetchType: 'active' })`. Set `staleTime` to 0 for queries that should always reflect server state instantly, or use a low value (5_000ms) for overview data.

### Pitfall 5: Scroll Position Lost on Doc Update

**What goes wrong:** The viewed document updates when a file changes. React re-renders the markdown component, resetting scroll to the top.

**Why it happens:** DOM reconciliation replaces the content node, wiping scroll state.

**How to avoid:** Before invalidating the doc query, capture the container's `scrollTop`. After the re-render (via `useEffect` watching the new content), restore `scrollTop`. A ref on the scrollable container plus a `useEffect([content])` that restores the saved value is sufficient.

### Pitfall 6: File Tree Missing New Files / Directories

**What goes wrong:** Chokidar fires `add` for new files, WS broadcasts the event, but the file tree does not show the new file.

**Why it happens:** The file tree query (`['filetree', projectId]`) is not being invalidated when `file:created` events arrive, only the doc content query is.

**How to avoid:** Invalidate BOTH `['filetree', projectId]` AND `['overview', projectId]` on any `file:created` or `file:deleted` event. Only `file:changed` needs to additionally invalidate the specific doc query.

---

## Code Examples

Verified patterns from official sources and current documentation:

### shadcn/ui Dark Theme CSS Variables (Tailwind v4)

```css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
}

:root {
  --background: oklch(0.145 0 0);         /* zinc-950 */
  --foreground: oklch(0.985 0 0);         /* near-white */
  --primary: oklch(0.696 0.17 162.48);    /* emerald-500 */
  --muted: oklch(0.269 0 0);             /* zinc-800 */
  --border: oklch(0.269 0 0);            /* zinc-800 */
}
```

### Backend: Directory Listing Endpoint (new — must be added in Phase 2)

The backend currently only serves raw file content. The frontend needs a directory listing for the file tree. This endpoint must be added in Plan 02-02:

```typescript
// backend/src/routes/docs.ts (addition)
// GET /:id/docs — directory listing as JSON tree
docsRoute.get('/:id/docs', (c) => {
  const { id } = c.req.param()
  const project = ProjectStore.get(id)
  if (!project) return c.json(errorEnvelope('NOT_FOUND', 'Project not found'), 404)

  const planningDir = join(project.path, '.planning')
  const tree = buildTree(planningDir, planningDir)
  return c.json(tree)
})

function buildTree(dir: string, rootDir: string): TreeNode[] {
  // Uses readdirSync recursively; returns sorted array with dirs before files,
  // top-level non-phase files first
}
```

### QueryClient Setup with WebSocket Integration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s default — WS invalidation handles freshness
      retry: 1,
      refetchOnWindowFocus: false,  // WS push handles refresh; window focus poll is noise
    },
  },
})

// main.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shadcn/ui + Tailwind v3 | shadcn/ui + Tailwind v4 | March 2025 (full v4 support) | CSS-first config, OKLCH colors, @theme inline — no tailwind.config.ts needed |
| react-syntax-highlighter | rehype-highlight / shiki | 2024-2025 | react-syntax-highlighter is legacy; rehype pipeline plugins are current standard |
| shadcn/ui toast component | sonner (official replacement) | 2024 | Toast component deprecated; Sonner is the official shadcn/ui recommendation |
| tailwindcss-animate | tw-animate-css | March 2025 | Deprecated with Tailwind v4; tw-animate-css is the drop-in replacement |
| chokidar v3 | chokidar v5 | November 2025 | v5 is ESM-only, Node 20+, 80kb (vs 150kb); no glob support change for simple path watching |
| Custom WebSocket server | @hono/node-ws | Ongoing | `createNodeWebSocket` is the official Hono pattern for Node.js WS |

**Deprecated/outdated:**
- `react-syntax-highlighter`: Still works but actively discouraged; last meaningful update 2023; use rehype plugins instead
- `tailwindcss-animate`: Replaced by `tw-animate-css` in Tailwind v4 projects
- shadcn/ui `toast` component: Deprecated; install with `npx shadcn@latest add sonner`

---

## Open Questions

1. **Node.js version constraint for chokidar v5**
   - What we know: chokidar v5 requires Node >= 20; v3 works on Node >= 8; backend currently unspecified
   - What's unclear: What Node version does the project target / what do users have installed?
   - Recommendation: Add `"engines": { "node": ">=20" }` to `backend/package.json` and use chokidar v5. If Node 18 support is needed, use chokidar v3.

2. **Directory listing API response shape**
   - What we know: No directory listing endpoint exists in Phase 1; the file tree requires one
   - What's unclear: Should the tree be flat (client builds hierarchy) or nested (server pre-sorts)?
   - Recommendation: Return a nested JSON tree from the server (server has easier access to the filesystem and can apply the ordering rule: top-level files first, then phases/ subdirectories). Plan 02-02 must add this endpoint.

3. **Syntax highlighting theme choice (Claude's Discretion)**
   - What we know: Must complement zinc/emerald palette; rehype-highlight requires a highlight.js CSS import
   - What's unclear: Which highlight.js theme looks best on zinc-950 background with emerald accents
   - Recommendation: Start with `atom-one-dark` (dark background, emerald-compatible greens) or `github-dark` (popular, readable). Both are in the highlight.js package — easy to swap during implementation.

4. **WebSocket reconnection strategy (Claude's Discretion)**
   - What we know: This is a local single-user dev tool; if the backend restarts, the user likely knows
   - What's unclear: How important is seamless reconnection vs. simplicity?
   - Recommendation: Simple exponential backoff (1s -> 2s -> 4s -> 8s cap) with a visible "Disconnected" banner. No need for `react-use-websocket` overhead — hand-roll 20 lines.

5. **Watcher scope for dynamically added projects**
   - What we know: The watcher is initialized at server startup with paths from ProjectStore; new projects added via API won't be watched automatically
   - What's unclear: Does Phase 2 need to add projects to the watcher at runtime?
   - Recommendation: Yes — when `POST /api/projects` registers a project, the watcher service must add the new `.planning/` path to the existing chokidar instance (`watcher.add(newPath)`). Export the watcher instance or expose an `addProject(path)` function from the watcher module.

---

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — confirmed full v4 + React 19 support, installation steps, OKLCH color migration
- [Hono WebSocket Helper docs](https://hono.dev/docs/helpers/websocket) — confirmed `@hono/node-ws` pattern, CORS conflict warning
- [GitHub honojs/hono issue #4090](https://github.com/honojs/hono/issues/4090) — confirmed CORS + WS header conflict is a known issue
- [TanStack Query v5 overview](https://tanstack.com/query/v5/docs/framework/react/overview) — confirmed v5 API, `useQuery` signature, `QueryClient`
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) — confirmed v10.1.0 is latest, plugin API
- [remark-gfm GitHub](https://github.com/remarkjs/remark-gfm) — confirmed current version and integration pattern
- [chokidar GitHub releases](https://github.com/paulmillr/chokidar/releases) — confirmed v5 ESM-only, Node 20+, November 2025

### Secondary (MEDIUM confidence)
- [@hono/node-ws npm package](https://www.npmjs.com/package/@hono/node-ws) — `createNodeWebSocket` / `injectWebSocket` example pattern (verified against official Hono docs)
- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite) — current `npx shadcn@latest init` flow with `@tailwindcss/vite` plugin
- [rehype-highlight GitHub](https://github.com/rehypejs/rehype-highlight) — plugin integration with react-markdown
- [sonner (shadcn)](https://ui.shadcn.com/docs/components/radix/sonner) — confirmed replacement for deprecated toast component

### Tertiary (LOW confidence)
- Various Medium/DEV Community blog posts on TanStack Query + Zustand combination — patterns consistent with official docs, cited for community validation
- WebSearch results on react-arborist — confirmed as heavy library; decision to use custom recursive component is based on use case analysis, not benchmarks

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified against official docs and current npm
- Architecture: HIGH — Patterns verified against official Hono, shadcn/ui, TanStack, Zustand docs
- WS/CORS integration: MEDIUM — Known issue #4090 confirmed; workaround pattern is logical but should be validated at implementation time
- Pitfalls: HIGH for identified pitfalls, MEDIUM for edge cases

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable libraries; chokidar v5 and shadcn/ui Tailwind v4 are recent — re-verify breaking changes if implementing after April 2026)
