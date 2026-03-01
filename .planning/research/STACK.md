# Stack Research

**Domain:** AI Agent Dashboard UI (React SPA + Hono API + Claude Agent SDK)
**Researched:** 2026-03-01
**Confidence:** HIGH (core stack verified via official docs and Context7; library versions verified via npm/official sources)

---

## Scope: v2.0 Stack Additions Only

The v1.0 stack is validated and working. This document covers ONLY what's needed for the four new capability areas:

1. Compile-time plugin registration system (UI slots, event hooks, data providers)
2. Real-time chat interface with streaming markdown rendering
3. Phase dashboard with timeline visualization
4. Session persistence (chat history across browser sessions)

**Already handled by the existing stack — do not re-add:**
- Hono backend, REST API, WebSocket (`@hono/node-ws`) — already working
- React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui — already working
- Claude Agent SDK integration (`@anthropic-ai/claude-agent-sdk`) — already working
- TanStack Query for server state, Zustand for UI state — already working
- `chokidar` file watcher, `react-markdown` + `remark-gfm` + `rehype-highlight` — already working
- `@radix-ui/react-slot`, `clsx`, `tailwind-merge`, `lucide-react` — already working

---

## Critical Note: SDK Rename (from v1.0 research)

The project context references `@anthropic-ai/claude-code` SDK. **This package has been renamed.**

| Old | New |
|-----|-----|
| `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |

Source: [Official Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) — HIGH confidence.

---

## New Stack Additions

### 1. Plugin System — No New Library Needed

**Verdict: Build with native React patterns. Zero new dependencies.**

The compile-time plugin system described in PROJECT.md (UI slots, event hooks, data providers) maps directly to established React patterns. The React Cosmos project demonstrates this architecture at production scale — its entire UI is built from a `<Slot name="root" />` root — but the GSD plugin system is simpler and doesn't need a framework.

**Pattern: Plugin Registry + Context API**

```typescript
// plugin-registry.ts — the entire "framework" is this module
export interface GSDPlugin {
  id: string
  // UI slots: named React components to inject
  slots?: Record<string, React.ComponentType>
  // Sidebar nav items, header actions, etc.
  navItems?: NavItem[]
  // Event hooks: called on app lifecycle events
  onProjectChange?: (projectId: string) => void
  // Data providers: functions returning data for the app shell
  dataProviders?: Record<string, () => unknown>
}

const registry = new Map<string, GSDPlugin>()

export function registerPlugin(plugin: GSDPlugin) {
  registry.set(plugin.id, plugin)
}

export function getSlot(slotName: string): React.ComponentType | null {
  for (const plugin of registry.values()) {
    if (plugin.slots?.[slotName]) return plugin.slots[slotName]
  }
  return null
}
```

```typescript
// PluginSlot.tsx — renders whatever a plugin puts in a named slot
export function PluginSlot({ name, fallback }: { name: string; fallback?: React.ReactNode }) {
  const Component = getSlot(name)
  return Component ? <Component /> : <>{fallback}</>
}
```

```typescript
// gsd-plugin/index.ts — the GSD plugin wires itself in at app startup
import { registerPlugin } from '../plugin-registry'
import { DocViewer } from './DocViewer'
import { ExecutionPanel } from './ExecutionPanel'

registerPlugin({
  id: 'gsd',
  slots: {
    'main.docviewer': DocViewer,
    'main.execution': ExecutionPanel,
  },
  navItems: [{ label: 'Docs', icon: FileText, slotKey: 'main.docviewer' }],
})
```

**Why no library:** The VS Code-inspired architecture in PROJECT.md calls for compile-time registration, not dynamic loading. The registry is a `Map`, slots are React components, hooks are function calls. Adding a framework (like `react-plugin` or `@grlt-hub/react-slots`) would add abstraction without solving anything that `Map` + `Context` doesn't already solve. MEDIUM confidence — this is a well-established React pattern, not a contested area.

**What about event hooks?** Zustand already in the project handles this. Each plugin can subscribe to Zustand store changes in its `onProjectChange` callback. No separate event bus needed.

---

### 2. Streaming Markdown Rendering — `streamdown`

**Verdict: Replace `react-markdown` in the chat component (only) with `streamdown`.**

The existing `react-markdown@10.1.0` is correct for the doc viewer (static markdown). For streaming AI chat output, it has a critical flaw: every token triggers a full re-parse and re-render of the entire message, and it renders incomplete Markdown (e.g., unclosed code blocks, partial bold) as broken HTML.

`streamdown` (by Vercel, February 2026) is purpose-built to solve this:
- Handles unterminated blocks gracefully during streaming
- Memoized rendering — only re-renders the paragraph that changed
- Shiki-powered syntax highlighting (no extra install needed)
- GitHub Flavored Markdown + math (KaTeX) + Mermaid built-in as optional plugins
- Drop-in API compatible with `react-markdown`

**Do NOT replace `react-markdown` globally.** The doc viewer (`DocViewer.tsx`) doesn't stream — `react-markdown` is the right tool there. Only the chat message bubble component uses `streamdown`.

| Component | Use |
|-----------|-----|
| `DocViewer.tsx` | `react-markdown` (keep as-is) |
| `ChatMessage.tsx` (new) | `streamdown` |

```typescript
// ChatMessage.tsx
import { Streamdown } from 'streamdown'

export function ChatMessage({ content, isStreaming }: ChatMessageProps) {
  return (
    <Streamdown
      content={content}
      animated={isStreaming}
      isAnimating={isStreaming}
    />
  )
}
```

**Tailwind v4 integration required** — after install, add to `globals.css`:
```css
@source "../node_modules/streamdown/dist/*.js";
```

**Version:** 2.3.0 (February 19, 2026) — MEDIUM confidence (confirmed via GitHub release, npm page).

---

### 3. Chat Session Persistence — Dexie.js + dexie-react-hooks

**Verdict: Use Dexie.js for IndexedDB-backed chat history. Do not use Zustand `persist` with `localStorage`.**

**Why not Zustand persist + localStorage:**
- localStorage is capped at 5MB per origin
- A single long chat session with code blocks can easily exceed 500KB
- 10 sessions = 5MB = quota exceeded error, crashing the app silently
- localStorage is synchronous — large writes block the main thread during re-renders

**Why Dexie.js:**
- IndexedDB is effectively unlimited (browsers allow up to 60% of available disk)
- Dexie is the established, minimal wrapper — 25KB gzipped, zero deps
- `useLiveQuery` hook gives reactive queries that update the component when the DB changes — this is the key React integration
- TypeScript-first since v4 — schema is defined in TypeScript, no `@types` needed
- v4.x (current: 4.3.x) is backward compatible with v3 — safe to adopt

**Schema design for chat history:**

```typescript
// db.ts
import Dexie, { type Table } from 'dexie'

export interface ChatSession {
  id: string             // Claude Agent SDK session_id
  projectId: string
  title: string          // First user message, truncated
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

class GSDDatabase extends Dexie {
  sessions!: Table<ChatSession>
  messages!: Table<ChatMessage>

  constructor() {
    super('gsd-dashboard')
    this.version(1).stores({
      sessions: 'id, projectId, updatedAt',
      messages: 'id, sessionId, timestamp',
    })
  }
}

export const db = new GSDDatabase()
```

```typescript
// In a chat component
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

function ChatHistory({ sessionId }: { sessionId: string }) {
  const messages = useLiveQuery(
    () => db.messages.where('sessionId').equals(sessionId).sortBy('timestamp'),
    [sessionId]
  )
  // messages updates reactively when DB changes
}
```

**Zustand still handles ephemeral UI state:** which chat session is active, whether the input is focused, streaming in-progress state. Dexie handles what persists.

**Packages:**
| Package | Version | Purpose |
|---------|---------|---------|
| `dexie` | 4.3.x | IndexedDB wrapper |
| `dexie-react-hooks` | 4.x | `useLiveQuery` hook for reactive queries |

---

### 4. Phase Dashboard Timeline — Custom Component with Existing Stack

**Verdict: Build a custom timeline component. No new charting library needed.**

The phase dashboard needs to show:
- Phases as sequential steps with status (complete / active / pending)
- Progress within the active phase
- Milestone markers

**Why no library:**
- Existing libraries (react-chrono, SVAR Gantt, KendoReact) are for calendar-based scheduling. The GSD phase dashboard is a sequential progress view, not a Gantt chart.
- The data model is simple: ordered list of phases with status and completion percentage
- Tailwind + shadcn/ui gives enough primitives to build this in ~100 lines
- Commercial libraries (DHTMLX, KendoReact) are $400–$750/developer. Unnecessary for a personal tool.
- Open-source options (react-chrono, react-vertical-timeline-component) add 50–200KB for a feature that's 100 lines of Tailwind

**The required component is a vertical stepper, not a Gantt chart:**

```
● Phase 1: Foundation        [COMPLETE]  ████████████ 100%
│
● Phase 2: Plugin System     [ACTIVE]    ██████░░░░░░  48%
│
○ Phase 3: Chat Interface    [PENDING]
│
○ Phase 4: Phase Dashboard   [PENDING]
```

**Implementation approach:** Build `PhaseTimeline.tsx` using:
- Existing `shadcn/ui` primitives (no new ones needed)
- Tailwind for the vertical connector line and step dots
- Data from the existing planning parser (`planningParser.ts` already parses phase data)
- Zustand for UI state (expanded/collapsed phase detail)

**If animated progress bars are needed:** `tw-animate-css` is already installed. No additional animation library required.

**Shadcn "stepper" registry components** exist (shadcn-stepper, shadcn-timeline from timdehof) but they add Framer Motion as a dependency. Given that `tw-animate-css` is already installed and the animation needs are minimal (phase status dots, progress bar), adding Framer Motion (180KB) is not justified.

---

## Summary: New Dependencies

| Package | Version | Purpose | Area |
|---------|---------|---------|------|
| `streamdown` | 2.3.0 | Streaming markdown renderer for chat | Chat |
| `dexie` | 4.3.x | IndexedDB wrapper for session persistence | Persistence |
| `dexie-react-hooks` | 4.x | `useLiveQuery` for reactive DB queries in React | Persistence |

**Total new runtime dependencies: 3**

No new backend dependencies. No new Radix UI components. No charting libraries. No plugin framework.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Zustand `persist` + `localStorage` for chat | 5MB limit crashes on large chat history; synchronous writes block UI | `dexie` + `dexie-react-hooks` |
| `react-markdown` for chat streaming | Re-parses full content on each token; breaks on incomplete Markdown | `streamdown` (only for chat components) |
| Gantt chart library (SVAR, DHTMLX, KendoReact) | Designed for calendar scheduling, not sequential phase steps; $400–750 commercial OR 200KB+ open-source | Custom Tailwind stepper component |
| `react-chrono` / `react-vertical-timeline-component` | Adds 50–200KB dependency for a feature that's 100 lines of Tailwind | Custom component |
| `react-plugin` / `@grlt-hub/react-slots` | Plugin framework for a system that's just a `Map` + React `Context` | Native `Map` registry + `PluginSlot` component |
| Framer Motion | Pulled in by shadcn-timeline community components; 180KB for animations already handled by `tw-animate-css` | `tw-animate-css` (already installed) |
| `idb-keyval` | Minimal but lacks querying (key-value only); can't efficiently query messages by sessionId | Dexie (has full query API) |
| `socket.io` | Already rejected in v1.0; 100KB+ for what WebSocket handles natively | Existing `@hono/node-ws` |

---

## Integration Points with Existing Stack

### Plugin System + App.tsx

The current `App.tsx` uses conditional rendering (`isDocumentView`, `isExecuting`) to switch between views. The plugin refactor replaces those conditions with `<PluginSlot>` components:

```typescript
// Current (to be refactored):
{isDocumentView ? <DocumentPage /> : isExecuting ? <ExecutionPanel /> : <ProjectOverview />}

// After plugin refactor:
<PluginSlot name="main.content" fallback={<ProjectOverview />} />
```

The plugin registry is initialized before `ReactDOM.render()` in `main.tsx`. Import order = registration order.

### Chat + Backend: SSE Endpoint

The existing execution route (`execution.ts`) uses `startAgentExecution` which writes to WebSocket. For chat, add a new `/api/chat` route that uses Hono's `streamSSE()` helper — this is already documented in v1.0 STACK.md. The Claude Agent SDK session ID from the `system/init` message becomes the Dexie `ChatSession.id`.

### Dexie + TanStack Query

Do not mix them for the same data. Rule:
- Chat messages and sessions → Dexie (`useLiveQuery`)
- Backend API responses (project list, phase status, file tree) → TanStack Query
- UI state (active session, panel layout) → Zustand

`useLiveQuery` and `useQuery` both return `undefined` while loading — same pattern, no conflict.

### streamdown + Tailwind v4

`streamdown` uses Tailwind utility classes internally. The required CSS directive tells Tailwind v4 to scan streamdown's output for class names. Add to `frontend/src/index.css`:

```css
@import "tailwindcss";
@source "../node_modules/streamdown/dist/*.js";   /* required for streamdown */
```

Without this line, streamdown's syntax highlighting and code block styles will be purged by Tailwind v4's content scanning.

---

## Installation

```bash
# From frontend/
npm install streamdown dexie dexie-react-hooks
```

No backend changes. No shadcn/ui additions (the existing Button, ScrollArea, Separator, Input cover the chat UI). The `@radix-ui/react-slot` already installed covers the `PluginSlot` wrapper if needed.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `streamdown` | `react-markdown` with memoization (AI SDK cookbook pattern) | If you need to avoid any new dependency; manually implement memoized block parsing. More work, same result |
| `streamdown` | `@assistant-ui/react-streamdown` | Fork with extra AI SDK bindings — only useful if you're using Vercel AI SDK's `useChat` hook, which this project does not |
| `dexie` + `dexie-react-hooks` | `idb-keyval` | Only if you need pure key-value storage with no query capabilities; can't query by sessionId efficiently |
| `dexie` + `dexie-react-hooks` | `rxdb` | Only if you need multi-tab sync, replication, or offline-first sync with a server; overkill for a single-user local tool |
| Custom timeline component | `react-chrono` | If you need rich card content, media embedding, or interactive zoom in the timeline |
| Plugin registry (custom Map) | `react-plugin` (from React Cosmos) | If the plugin system grows to need public methods, cross-plugin event emission, or config management; migrate then |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `streamdown@2.3.0` | React 19, Tailwind v4 | Requires `@source` directive in CSS for Tailwind v4 purging |
| `dexie@4.3.x` | React 19 | No peer dep on React; works with any version |
| `dexie-react-hooks@4.x` | `dexie@4.x`, React 16.8+ | Major version must match dexie major version |
| `streamdown@2.3.0` | `react-markdown@10.1.0` | Use in different components — no conflict |

---

## Sources

- [streamdown GitHub (vercel/streamdown)](https://github.com/vercel/streamdown) — Version 2.3.0 (Feb 19, 2026), API, Tailwind integration, React usage — MEDIUM confidence
- [streamdown.ai/docs](https://streamdown.ai/docs) — Official docs confirming drop-in replacement status — MEDIUM confidence
- [Dexie.js npm](https://www.npmjs.com/package/dexie) — Version 4.2.0–4.3.x, TypeScript support — HIGH confidence
- [dexie-react-hooks npm](https://www.npmjs.com/package/dexie-react-hooks) — `useLiveQuery` API — HIGH confidence
- [useLiveQuery() Dexie docs](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) — Reactive query pattern, deps array — HIGH confidence
- [React Cosmos UI Plugins docs](https://reactcosmos.org/docs/plugins/ui-plugins) — Slot/plug pattern reference for plugin registry design — MEDIUM confidence
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage 5MB limit per origin — HIGH confidence
- [Hono Streaming Helpers](https://hono.dev/docs/helpers/streaming) — `streamSSE()` already in v1.0 stack — HIGH confidence
- [shadcn-timeline GitHub](https://github.com/timDeHof/shadcn-timeline) — Confirmed it adds Framer Motion dep; decision to avoid — LOW confidence (single source)
- [SVAR React Gantt — top 5 comparison 2026](https://svar.dev/blog/top-react-gantt-charts/) — Confirmed Gantt libraries are for scheduling, not sequential steps — MEDIUM confidence

---

*Stack research for: GSD Dashboard v2.0 — Plugin system, chat, phase dashboard, session persistence*
*Researched: 2026-03-01*
