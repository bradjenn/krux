# Architecture Research

**Domain:** GSD Dashboard v2.0 — Plugin System + Chat + Phase Dashboard integration into existing Hono+React app
**Researched:** 2026-03-01
**Confidence:** HIGH — based on direct codebase inspection plus verified patterns for plugin slot systems and streaming

---

## Context: What Already Exists

This is a subsequent milestone. Three phases are complete. The following is NOT theoretical — it is the actual running codebase:

### Existing Backend (Hono, Node.js, `backend/src/`)

| File | What It Does |
|------|--------------|
| `index.ts` | Hono app setup. Registers WS before CORS middleware (required to avoid header-immutability crash). Mounts 4 route groups. Starts file watcher after `serve()`. |
| `routes/ws.ts` | Single `/ws` endpoint. Maintains `Set<WSContext>` of all connected clients. `broadcast(event)` sends JSON to all. No subscription model — all clients receive all events. |
| `routes/execution.ts` | POST `/api/execution/:phaseId` — starts agent. DELETE `/api/execution/:sessionId` — stops agent. GET `/api/execution/:sessionId` — status. |
| `routes/sessions.ts` | CRUD for session records independent of execution (creation, list, delete). |
| `routes/projects.ts` | CRUD for registered projects (in-memory + JSON file persistence). |
| `routes/docs.ts` | File tree + document content endpoints for `.planning/` directories. |
| `services/agentRunner.ts` | Fire-and-forget IIFE wrapping `query()` from Claude Agent SDK. Broadcasts `execution:*` WS events. Parses `Plan N/M` / `Task N/M` progress from agent text output. |
| `services/sessionRegistry.ts` | `Map<string, SessionRecord>` + `Map<string, AbortController>`. CRUD methods. |
| `services/planningParser.ts` | Reads `.planning/ROADMAP.md`, `STATE.md`, `PROJECT.md` from disk. Returns typed `Phase[]` and `ProjectState`. |
| `services/projectStore.ts` | In-memory + file-backed project list. |
| `lib/watcher.ts` | Chokidar watching registered project `.planning/` dirs. Debounced. |
| `lib/processLifecycle.ts` | Orphan cleanup on startup + SIGTERM handler. |

**Current WebSocket event types** (all go to all clients):
- `file:changed`, `file:created`, `file:deleted` — from file watcher
- `execution:started`, `execution:message`, `execution:progress`, `execution:complete`, `execution:end` — from agent runner

### Existing Frontend (React, Vite, `frontend/src/`)

| File | What It Does |
|------|--------------|
| `App.tsx` | Root layout. Single WS connection via `useWebSocket()`. Conditional main panel: EmptyState / DocumentPage / ExecutionPanel / ProjectOverview. Header has a `rightSlot` prop. |
| `stores/appStore.ts` | Zustand with `persist`. Holds `activeProjectId` and `selectedFile`. |
| `stores/executionStore.ts` | Zustand (no persist). Holds execution status, progress, planSegments, sessionId. |
| `hooks/useWebSocket.ts` | Opens `ws://localhost:3001/ws`. Handles all WS message types. Routes `execution:*` events to executionStore. Routes `file:*` events to `queryClient.invalidateQueries()`. Exports `onExecutionMessage(listener)` — a module-level pub/sub for the rAF buffer pattern. |
| `hooks/useExecution.ts` | `startExecution()`, `stopExecution()`, `restartExecution()` — POST/DELETE to `/api/execution`. Updates executionStore. |
| `hooks/useProjects.ts` | TanStack Query hooks for project list + project overview. |
| `hooks/useDocument.ts` | TanStack Query hook for document content (invalidated by file watcher WS events). |
| `components/execution/LogViewer.tsx` | Uses `onExecutionMessage` listener + rAF buffer to drain streaming text into React state at ~60fps without flooding renders. |
| `components/overview/ProjectOverview.tsx` | Shows phase cards using `planningParser` output. Each `PhaseCard` has an Execute button. |
| `lib/api.ts` | `apiFetch<T>(path, init)` — typed fetch wrapper around `http://localhost:3001/api`. |

**Current navigation model:** `App.tsx` uses Zustand state as a view router — no React Router. The active view is derived from `activeProjectId` and `selectedFile` and execution status.

---

## System Overview: Before and After

### Before (v1.0 — Current State)

```
┌─────────────────────────────────────────────────────────┐
│  App.tsx — view switch via Zustand state                 │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Sidebar    │  │ Main Panel     │  │ Header         │ │
│  │ (projects) │  │ ProjectOverview│  │ rightSlot prop │ │
│  │            │  │ DocumentPage   │  │                │ │
│  │            │  │ ExecutionPanel │  │                │ │
│  └────────────┘  └────────────────┘  └────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ REST + single WS
                    ┌───────▼───────┐
                    │  Hono Backend │
                    │  4 routes     │
                    │  agentRunner  │
                    │  fileWatcher  │
                    └───────────────┘
```

### After (v2.0 Target)

```
┌─────────────────────────────────────────────────────────────────┐
│  App.tsx — Plugin Host                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PluginRegistry (React Context)                          │   │
│  │  - slots: Map<SlotName, React.ReactNode[]>               │   │
│  │  - eventHooks: Map<EventName, Handler[]>                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────────────────────────┐   │
│  │ Sidebar        │  │ Main Panel (view switcher)           │   │
│  │ [sidebar.item] │  │ ProjectOverview (app-owned)          │   │
│  │ slot           │  │ DocumentPage   (GSD plugin)         │   │
│  └────────────────┘  │ ExecutionPanel (GSD plugin)         │   │
│                       │ ChatPanel      (new feature)        │   │
│  ┌────────────────┐   │ PhaseDashboard (new feature)        │   │
│  │ Header         │   └──────────────────────────────────────┘   │
│  │ rightSlot prop │                                              │
│  │ [header.right] │  ┌──────────────────────────────────────┐   │
│  └────────────────┘  │ GSD Plugin (compile-time registered) │   │
│                       │ - contributes: sidebar.item          │   │
│                       │ - contributes: main.chatPanel        │   │
│                       │ - contributes: main.phaseDashboard   │   │
│                       └──────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST + single WS (extended)
                        ┌───────▼───────────────┐
                        │  Hono Backend          │
                        │  + /api/chat route     │
                        │  + chatRunner service  │
                        │  (extends agentRunner) │
                        └───────────────────────┘
```

---

## Question 1: Where Does the Plugin Registry Live?

**Answer: Frontend-only, implemented as a React Context.**

The plugin registry is pure frontend state. The backend does not need to know about plugins — plugins contribute UI and may call existing backend routes, but the routing and UI injection happen entirely in React.

**Rationale for frontend-only:**
- All three new features (GSD plugin wrapper, Chat, Phase Dashboard) consume the same backend APIs that already exist or will be added as plain routes
- The backend is not plugin-aware; it is a data/computation server
- Compile-time registration means plugin code is bundled into the app at build time — there is no runtime discovery that would require backend coordination
- Keeping the registry in React Context avoids introducing a new IPC boundary

**Plugin registry structure:**

```typescript
// frontend/src/plugins/registry.ts

export interface SlotContribution {
  slotName: string
  component: React.ComponentType
  priority?: number  // render order within slot, lower = first
}

export interface Plugin {
  id: string
  name: string
  slots?: SlotContribution[]
  // Future: eventHooks, dataProviders — not needed for v2.0
}

interface PluginRegistryState {
  plugins: Plugin[]
  getSlot(name: string): React.ComponentType[]
}

const PluginRegistryContext = React.createContext<PluginRegistryState>(...)

// Compile-time registration: plugins array is hardcoded at app startup
export function PluginRegistryProvider({ children }: { children: React.ReactNode }) {
  const plugins: Plugin[] = [
    gsdPlugin,  // imported at build time
  ]
  // derive slot map from plugins
  ...
  return <PluginRegistryContext.Provider value={...}>{children}</PluginRegistryContext.Provider>
}

export function useSlot(name: string): React.ComponentType[] {
  return useContext(PluginRegistryContext).getSlot(name)
}
```

**How this wraps existing code:**

The GSD plugin registers the existing `DocumentPage`, `ExecutionPanel`, `ProjectOverview` behind the plugin boundary:

```typescript
// frontend/src/plugins/gsd/index.ts
export const gsdPlugin: Plugin = {
  id: 'gsd',
  name: 'GSD',
  slots: [
    { slotName: 'sidebar.section', component: GsdSidebarSection },
    // ExecutionPanel and DocumentPage stay in the view switcher —
    // the plugin boundary is at the "what gets registered" level,
    // not at full view replacement
  ],
}
```

For v2.0, the "plugin boundary" is primarily about:
1. Moving GSD-specific sidebar items behind a slot
2. The new Chat and Phase Dashboard features registering as plugin-provided views
3. App-owned layout (Header, Sidebar shell, project management) remaining outside the plugin system

---

## Question 2: How Do Plugins Inject UI into React?

**Answer: Named slot pattern with `useSlot()` hook. No portals, no render props for v2.0.**

### The Slot Pattern

A Slot is a named placeholder in the app shell. Plugins fill slots at registration time (compile-time). The app renders slot contents via `useSlot()`:

```typescript
// In Sidebar component
function Sidebar() {
  const sidebarSections = useSlot('sidebar.section')
  return (
    <aside>
      {/* App-owned sidebar content */}
      <ProjectList />
      {/* Plugin-contributed sidebar sections */}
      {sidebarSections.map((Component, i) => <Component key={i} />)}
    </aside>
  )
}
```

### Defined Slots for v2.0

| Slot Name | Where Rendered | What Goes There |
|-----------|---------------|-----------------|
| `sidebar.section` | Bottom of Sidebar, below project list | GSD plugin's document-tree navigation (currently hardcoded in Sidebar) |
| `header.right` | Already exists as `rightSlot` prop in Header | Back buttons, status indicators — keep as prop, no slot needed |

**There are no other slots needed for v2.0.** The Chat and Phase Dashboard are full views, not injected fragments — they slot into the main panel view switcher by being registered as named views, not via the slot system.

### Main Panel View Registration

Rather than slots, the main panel uses a view registry — a map from view name to component:

```typescript
// frontend/src/plugins/registry.ts (extended)
export interface ViewContribution {
  viewId: string
  component: React.ComponentType
  // No icon/label needed — views are activated by app logic, not menus
}

// App.tsx view switch becomes:
const activeView = deriveView(appStore, executionStore, chatStore)
const ViewComponent = viewRegistry.get(activeView) ?? EmptyState
return <ViewComponent />
```

Views registered by the GSD plugin: `'document'`, `'execution'`, `'chat'`, `'phaseDashboard'`
Views owned by the app shell: `'empty'`, `'projectOverview'`

**Why not portals:** React portals render outside the component tree's DOM position but still inside the React tree — they are useful for modals and tooltips, not for feature injection. The slot/context pattern is cleaner for this use case.

**Why not render props:** Render props would require the host component (Sidebar, App) to know about plugin-specific shapes. The slot pattern keeps hosts ignorant of slot contents.

---

## Question 3: How Does Chat Streaming Differ from Execution Streaming?

**Key differences:**

| Concern | Execution Streaming (existing) | Chat Streaming (new) |
|---------|-------------------------------|---------------------|
| Transport | WebSocket (existing `/ws`) | SSE via `GET /api/chat/:sessionId/stream` |
| Direction | Server-to-client only | Client sends message via POST, then SSE streams response |
| Session model | One execution per project at a time | Multiple chat sessions, user selects |
| Message structure | Raw text lines (ANSI) | Markdown-formatted assistant messages |
| Rendering | `LogViewer` with `ansi_up` + rAF buffer | `ChatPanel` with streaming markdown renderer |
| History | Not persisted — ephemeral execution log | Must persist across page reloads (localStorage + server) |
| Multiple turns | No — one prompt per execution | Yes — conversation threads |
| User input | None during execution | User sends messages; agent responds |
| Stop control | AbortController-based DELETE | Same — AbortController-based DELETE |

### Why SSE for Chat (not WebSocket)

The existing WebSocket is a broadcast bus — it sends all events to all clients. Adding chat streaming to it requires message routing by sessionId, which the current implementation does not support (it broadcasts to all connected clients). Two options:

1. **Extend WS with session routing:** Add `{ sessionId, ...event }` filtering and track client subscriptions. This is the pattern described in the original ARCHITECTURE.md. It works but adds complexity to the existing `broadcast()` function.

2. **SSE per chat session:** Each chat stream is a separate HTTP connection. The frontend opens `EventSource('/api/chat/:sessionId/stream')` after posting the user message. Natural fit for the unidirectional streaming pattern. No changes to the existing WS infrastructure.

**Recommendation: SSE for chat streaming.** Reasons:
- Preserves the existing WS broadcast pattern without adding session-routing complexity
- SSE auto-reconnect is built into `EventSource` — no custom reconnect logic needed
- Hono has first-class `streamSSE()` support
- Chat is inherently unidirectional per turn (user sends via REST POST, server streams response via SSE)
- The rAF buffer pattern can be applied identically — SSE text chunks land in a module-level buffer, React drains at 60fps

**SSE pattern for Hono backend:**

```typescript
// routes/chat.ts
chatRoute.get('/:sessionId/stream', async (c) => {
  const sessionId = c.req.param('sessionId')
  // Validate session exists and belongs to active project
  return streamSSE(c, async (stream) => {
    const ac = new AbortController()
    stream.onAbort(() => ac.abort())

    // Start agent query for the pending user message
    for await (const message of query({ prompt, options: { cwd, abortController: ac } })) {
      if (message.type === 'assistant') {
        const text = extractText(message)
        if (text) {
          await stream.writeSSE({ data: JSON.stringify({ type: 'delta', text }) })
        }
      }
    }
    await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) })
  })
})
```

**SSE pattern for React frontend:**

```typescript
// hooks/useChatStream.ts
export function useChatStream(sessionId: string | null) {
  // On each new user message:
  // 1. POST /api/chat/sessions/:id/messages { role: 'user', content }
  // 2. Open EventSource to /api/chat/:sessionId/stream
  // 3. Buffer incoming text deltas in moduleRef (not React state)
  // 4. rAF drain to React state (same pattern as LogViewer)
  // 5. Close EventSource on 'done' event
}
```

### rAF Buffer Pattern — Shared for Both

The rAF buffer pattern from `LogViewer` applies identically to chat streaming:

```typescript
// Module-level buffer (outside React — no re-render on push)
const chatBuffer: string[] = []

// In EventSource onmessage:
es.onmessage = (e) => {
  const { type, text } = JSON.parse(e.data)
  if (type === 'delta') chatBuffer.push(text)
}

// In component useEffect (same as LogViewer):
useEffect(() => {
  let raf: number
  function flush() {
    if (chatBuffer.length > 0) {
      const batch = chatBuffer.splice(0)
      setCurrentMessage(prev => prev + batch.join(''))
    }
    raf = requestAnimationFrame(flush)
  }
  raf = requestAnimationFrame(flush)
  return () => cancelAnimationFrame(raf)
}, [])
```

### Chat Message History

Execution streaming discards the log on reset. Chat requires persistence.

**Storage model:**
- **Backend:** `ChatSessionRegistry` (new) — same pattern as `SessionRegistry`. Stores message history as `{ role, content, timestamp }[]`. Keyed by chat session ID.
- **Frontend:** `chatStore` (Zustand with `persist`) — stores message history in localStorage keyed by session ID. This provides instant load on page reload without a server roundtrip for recent messages.
- **Sync:** On page load, frontend checks localStorage first. If session exists on server but localStorage is empty/stale, GET `/api/chat/:sessionId` to fetch full history.

**Session persistence model:**
```typescript
// frontend: chatStore.ts
interface ChatSession {
  id: string
  projectId: string
  sdkSessionId?: string  // for Claude SDK resume
  messages: ChatMessage[]
  createdAt: number
}

// Zustand with persist middleware (same as appStore pattern)
export const useChatStore = create<ChatState>()(
  persist(...)
)
```

---

## Question 4: What New Backend Routes/Services Are Needed?

### New Routes

| Route | Method | Purpose | Notes |
|-------|--------|---------|-------|
| `POST /api/chat/sessions` | POST | Create new chat session | Body: `{ projectId }`. Returns `{ sessionId }`. |
| `GET /api/chat/sessions` | GET | List chat sessions, optionally `?projectId=X` | Same pattern as `/api/sessions` |
| `GET /api/chat/sessions/:id` | GET | Get session with full message history | Used for reload/reconnect |
| `POST /api/chat/sessions/:id/messages` | POST | Send a user message | Body: `{ content: string }`. Stores message, returns 201. Triggers server-side agent query. |
| `GET /api/chat/sessions/:id/stream` | GET (SSE) | Stream the in-progress agent response | `streamSSE()`. Returns `{ type: 'delta', text }` events then `{ type: 'done' }`. |
| `DELETE /api/chat/sessions/:id/stream` | DELETE | Cancel an in-progress response | Calls AbortController. Same pattern as execution stop. |

**Route mounting in `index.ts`:**
```typescript
import { chatRoute } from './routes/chat.js'
app.route('/api/chat', chatRoute)
```

### New Services

**`services/chatRunner.ts`** (new) — mirrors `agentRunner.ts` but for chat:

Differences from `agentRunner`:
- Uses SSE stream instead of WS broadcast
- Accumulates message text for history storage
- Supports multi-turn via `resume: sdkSessionId`
- Does NOT parse `Plan N/M` progress (chat is conversational, not phase execution)
- Returns text as markdown (not ANSI) — no `ansi_up` needed on frontend

```typescript
// Conceptual shape
export async function startChatTurn(
  sessionId: string,
  userMessage: string,
  projectPath: string,
  sdkSessionId: string | undefined,
  sseStream: SSEStreamingApi  // from Hono streamSSE callback
): Promise<void> {
  const ac = new AbortController()
  ChatSessionRegistry.setAbortController(sessionId, ac)

  const q = query({
    prompt: userMessage,
    options: {
      cwd: projectPath,
      abortController: ac,
      permissionMode: 'bypassPermissions',
      ...(sdkSessionId ? { resume: sdkSessionId } : {}),
    },
  })

  let fullResponse = ''
  for await (const message of q) {
    if (message.type === 'system' && message.subtype === 'init') {
      ChatSessionRegistry.update(sessionId, { sdkSessionId: message.session_id })
    }
    if (message.type === 'assistant') {
      const text = extractText(message)
      if (text) {
        fullResponse += text
        await sseStream.writeSSE({ data: JSON.stringify({ type: 'delta', text }) })
      }
    }
  }

  // Persist the completed assistant message
  ChatSessionRegistry.appendMessage(sessionId, { role: 'assistant', content: fullResponse })
  await sseStream.writeSSE({ data: JSON.stringify({ type: 'done' }) })
}
```

**`services/chatSessionRegistry.ts`** (new) — extends session registry concept for chat:

```typescript
interface ChatSessionRecord {
  id: string
  projectId: string
  sdkSessionId?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>
  status: 'idle' | 'streaming' | 'done' | 'error'
  createdAt: number
}
```

### Modified Backend Files

| File | Change |
|------|--------|
| `index.ts` | Add `import { chatRoute }` and `app.route('/api/chat', chatRoute)` |
| `types/index.ts` | Add `ChatSessionRecord`, `ChatMessage` types |
| `shared/types/index.ts` | Add `ChatMessage`, `ChatSession` types for frontend |

**No changes needed to:**
- `routes/ws.ts` — chat uses SSE, not WebSocket
- `routes/execution.ts` — unchanged
- `services/agentRunner.ts` — unchanged
- `services/planningParser.ts` — unchanged (phase dashboard reads from existing endpoints)
- `lib/watcher.ts` — unchanged

### Phase Dashboard: No New Backend Routes Required

The Phase Dashboard consumes data that is already served:
- `GET /api/projects/:id/overview` — returns `{ project, phases, state }` (from `planningParser`)
- File watcher WS events already trigger `queryClient.invalidateQueries(['overview', projectId])`

The Phase Dashboard is a **new view component** that displays the existing `ProjectOverview` data in a richer way — timeline visualization, plan detail expansion, requirement coverage. It does not need new API endpoints.

---

## Question 5: Suggested Build Order

### Dependency Graph

```
Plugin Registry (frontend only, no backend changes)
    ↓
App Shell Refactor (extract GSD-specific code behind plugin boundary)
    ↓
Chat Backend (new chatRoute + chatRunner + chatSessionRegistry)
    ↓
Chat Frontend (ChatPanel, useChatStream, chatStore, streaming markdown)
    ↓
GSD Slash Commands (extend chatRunner to detect /gsd: prefixes)
    ↓
Phase Dashboard (new view component, no backend changes)
```

### Build Order with Rationale

**Step 1: Plugin Registry + App Shell Refactor**
Build first because every subsequent feature registers through the plugin system. The registry is pure TypeScript/React — no backend changes, low risk. The app shell refactor is surgical: extract the existing GSD-specific view switch logic into a GSD plugin, define the `useSlot()` hook, wrap `App.tsx` in `PluginRegistryProvider`. This is the riskiest refactor (touches `App.tsx` and routing logic) but must happen before any new views are added.

**Step 2: Chat Backend**
Build before Chat Frontend because the frontend needs real endpoints to consume. The `chatRoute` + `chatRunner` + `ChatSessionRegistry` can be built and tested with `curl` before touching any React code. The SSE streaming can be validated independently. No dependency on the plugin system.

**Step 3: Chat Frontend**
Depends on: Plugin Registry (to register the ChatPanel view), Chat Backend (to stream from). Build the `ChatPanel` component, `useChatStream` hook, `chatStore`, and streaming markdown renderer. Wire the ChatPanel into the plugin system as a registered view.

**Step 4: GSD Slash Commands**
Depends on: Chat Frontend (chat input handles command parsing). The slash command parser (`/gsd:new-project`, `/gsd:plan-phase`) runs in the `chatRunner` on the backend — detects the command and substitutes a GSD workflow prompt. Low complexity, adds to Chat Backend without changing the SSE contract.

**Step 5: Phase Dashboard**
Depends on: Plugin Registry (to register the view), App Shell Refactor (for the view switcher). No backend changes needed. The Phase Dashboard is a new React component consuming the already-available `ProjectOverview` data. Build last because it is independent of chat infrastructure and adds polish without dependencies that could block other work.

### Build Order Summary

| Step | What | New Files | Modified Files | Risk |
|------|------|-----------|----------------|------|
| 1a | Plugin Registry | `plugins/registry.ts`, `plugins/gsd/index.ts` | — | Low |
| 1b | App Shell Refactor | — | `App.tsx`, `components/layout/Sidebar.tsx` | Medium (touches root) |
| 2 | Chat Backend | `routes/chat.ts`, `services/chatRunner.ts`, `services/chatSessionRegistry.ts` | `index.ts`, `types/index.ts`, `shared/types/index.ts` | Low |
| 3 | Chat Frontend | `components/chat/ChatPanel.tsx`, `components/chat/MessageList.tsx`, `components/chat/InputBar.tsx`, `hooks/useChatStream.ts`, `stores/chatStore.ts` | `plugins/gsd/index.ts` (register view) | Medium |
| 4 | Slash Commands | (extends chatRunner) | `services/chatRunner.ts`, `routes/chat.ts` | Low |
| 5 | Phase Dashboard | `components/phase/PhaseDashboard.tsx`, `components/phase/PhaseTimeline.tsx`, `components/phase/PlanDetail.tsx` | `plugins/gsd/index.ts` (register view) | Low |

---

## Recommended Project Structure Changes

### New Directories

```
├── frontend/
│   └── src/
│       ├── plugins/                    # NEW — plugin registry + plugin definitions
│       │   ├── registry.ts             # PluginRegistryContext, useSlot, useView
│       │   └── gsd/
│       │       └── index.ts            # GSD plugin definition (slots, views)
│       ├── components/
│       │   ├── chat/                   # NEW — chat feature components
│       │   │   ├── ChatPanel.tsx       # Full chat view (message list + input bar)
│       │   │   ├── MessageList.tsx     # Scrolling message thread
│       │   │   ├── MessageBubble.tsx   # Single message with markdown renderer
│       │   │   └── InputBar.tsx        # Text input + send button + slash commands
│       │   └── phase/                  # NEW — phase dashboard components
│       │       ├── PhaseDashboard.tsx  # Full phase dashboard view
│       │       ├── PhaseTimeline.tsx   # Vertical timeline of phases
│       │       └── PlanDetail.tsx      # Expandable plan file list
│       ├── hooks/
│       │   └── useChatStream.ts        # NEW — SSE connection + rAF buffer for chat
│       └── stores/
│           └── chatStore.ts            # NEW — Zustand + persist for chat sessions
│
└── backend/
    └── src/
        ├── routes/
        │   └── chat.ts                 # NEW — chat endpoints + SSE streaming
        └── services/
            ├── chatRunner.ts           # NEW — SSE-based agent streaming for chat
            └── chatSessionRegistry.ts  # NEW — chat session + message history store
```

### Files NOT Changed

- `routes/ws.ts` — unchanged
- `routes/execution.ts` — unchanged
- `routes/projects.ts` — unchanged
- `routes/docs.ts` — unchanged
- `routes/sessions.ts` — unchanged
- `services/agentRunner.ts` — unchanged
- `services/planningParser.ts` — unchanged
- `lib/watcher.ts` — unchanged
- `lib/processLifecycle.ts` — unchanged
- `hooks/useWebSocket.ts` — unchanged
- `hooks/useExecution.ts` — unchanged
- `stores/executionStore.ts` — unchanged

---

## Architectural Patterns

### Pattern 1: Compile-Time Plugin Registration

**What:** Plugins are statically imported TypeScript modules. Registration happens at app startup when `PluginRegistryProvider` mounts — not at runtime via dynamic `import()`. The plugin list is a hardcoded array in `PluginRegistryProvider`.

**When to use:** Single-user personal tool where dynamic plugin loading would add complexity without benefit. All plugins are known at build time.

**Trade-offs:**
- Pro: No dynamic loading complexity, TypeScript type safety, tree-shakeable
- Con: Adding a plugin requires a code change and rebuild. Acceptable for a personal tool — this is explicitly in-scope per PROJECT.md

**Example:**
```typescript
// plugins/registry.ts
import { gsdPlugin } from './gsd'

const REGISTERED_PLUGINS: Plugin[] = [gsdPlugin]  // hardcoded at build time

export function PluginRegistryProvider({ children }: { children: React.ReactNode }) {
  const slotMap = useMemo(() => buildSlotMap(REGISTERED_PLUGINS), [])
  return (
    <PluginRegistryContext.Provider value={{ getSlot: (name) => slotMap.get(name) ?? [] }}>
      {children}
    </PluginRegistryContext.Provider>
  )
}
```

### Pattern 2: SSE for Chat + WebSocket for File/Execution Events

**What:** Two real-time channels with different transports:
- WebSocket (`/ws`): Broadcast bus for file watcher events and execution events. Used as before. No changes.
- SSE (`/api/chat/:id/stream`): Per-turn chat streaming. One SSE connection per user message turn. Automatically closed by server after `{ type: 'done' }` event.

**When to use:** When the existing WebSocket transport serves a broadcast model that would be complicated by per-session routing. SSE is a natural fit for the request-response streaming pattern of chat.

**Trade-offs:**
- Pro: Zero changes to existing WS infrastructure. SSE auto-reconnect is free. Clean separation of concerns.
- Con: Two different real-time protocols to explain. EventSource has CORS implications (use `credentials: 'include'` if needed, though for localhost it is not an issue).

### Pattern 3: Shared rAF Buffer Pattern

**What:** Both `LogViewer` (execution) and `ChatPanel` (chat) use the same pattern: a module-level array receives raw events at full network speed; a `requestAnimationFrame` loop drains the buffer into React state at ~60fps.

**When to use:** Any streaming text that arrives faster than React can re-render (both chat and execution fall in this category).

**Key implementation detail — module-level buffer must be per-session:**
```typescript
// Bad: shared module-level buffer leaks between sessions
const buffer: string[] = []

// Good: ref-based buffer scoped to component instance
const bufferRef = useRef<string[]>([])
```

The `LogViewer` already uses `bufferRef` (not module-level) for the buffer. The chat implementation should follow the same pattern.

### Pattern 4: Zustand Persist for Chat History

**What:** `chatStore` uses Zustand's `persist` middleware (same as `appStore`) to write chat session message history to `localStorage`. This provides instant history restore on page reload without a server roundtrip.

**When to use:** Any data that must survive page reloads for a single-user personal tool. localStorage is appropriate at this scale.

**Sync strategy:**
```typescript
// On app load with an active chat session:
// 1. Load from localStorage immediately (instant)
// 2. If sdkSessionId exists in localStorage, server can resume the session
// 3. On message send, POST updates both localStorage (via chatStore) and server
```

---

## Data Flow Changes

### New Flow: Chat Turn

```
User types message + hits Send
    ↓
InputBar: POST /api/chat/sessions/:id/messages { content: "..." }
    ↓
Backend: ChatSessionRegistry.appendMessage(id, { role: 'user', content })
Backend: Prepares query() with resume: sdkSessionId
    ↓
Frontend: opens new EventSource('/api/chat/:id/stream')
    ↓
Backend (streamSSE): for await (msg of query(...)) → writeSSE({ type: 'delta', text })
    ↓
EventSource.onmessage: push text to bufferRef.current
    ↓
rAF flush: setCurrentMessage(prev => prev + batch.join(''))
    ↓
MessageBubble: renders currentMessage through streaming markdown renderer
    ↓
Server sends { type: 'done' } → EventSource closes
Backend: ChatSessionRegistry.appendMessage(id, { role: 'assistant', content: fullText })
    ↓
chatStore: persistedMessages updated
```

### Unchanged Flows

- File watcher → WS → TanStack Query invalidation → DocumentPage re-render: unchanged
- Execute phase → POST /api/execution → WS events → executionStore → ExecutionPanel: unchanged
- Project list, document content, project overview: unchanged

---

## Integration Points Summary

### New vs Modified vs Unchanged

| Component | Status | Change |
|-----------|--------|--------|
| `App.tsx` | Modified | Wrap in `PluginRegistryProvider`; replace hardcoded view switch with `viewRegistry` lookup |
| `Sidebar.tsx` | Modified | Add `useSlot('sidebar.section')` rendering below project list |
| `Header.tsx` | Unchanged | `rightSlot` prop already works as a slot |
| `ProjectOverview.tsx` | Unchanged | Remains an app-shell view |
| `ExecutionPanel.tsx` | Unchanged | GSD plugin registers it as a view |
| `DocumentPage.tsx` | Unchanged | GSD plugin registers it as a view |
| `useWebSocket.ts` | Unchanged | Chat streaming uses SSE, not WS |
| `executionStore.ts` | Unchanged | |
| `appStore.ts` | Unchanged | |
| `agentRunner.ts` | Unchanged | Chat has its own `chatRunner` |
| `sessionRegistry.ts` | Unchanged | Chat has its own `ChatSessionRegistry` |
| `planningParser.ts` | Unchanged | Phase dashboard reuses existing data |
| `routes/ws.ts` | Unchanged | |
| `routes/execution.ts` | Unchanged | |
| `index.ts` (backend) | Modified | Add `chatRoute` import and mount |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| PluginRegistry ↔ App shell | React Context (`useSlot`, `useView`) | No prop drilling; slots resolved at render time |
| Chat Frontend ↔ Chat Backend (turn) | POST REST + SSE stream | POST to send message, SSE to receive streaming response |
| Chat Frontend ↔ Chat Backend (history) | GET REST | On page load, fetch session history if localStorage is stale |
| Phase Dashboard ↔ Backend | TanStack Query (already exists) | Reuses `['overview', projectId]` query; no new backend routes |
| chatStore ↔ localStorage | Zustand `persist` middleware | Same pattern as `appStore` |
| chatRunner ↔ chatSessionRegistry | Direct function calls (same process) | Same pattern as agentRunner ↔ sessionRegistry |
| chatRunner ↔ Claude Agent SDK | `for await (const msg of query(...))` | Same pattern as agentRunner; add `resume: sdkSessionId` for continuity |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding Chat Events to the Existing WebSocket

**What people do:** Add `chat:delta`, `chat:done` event types to the existing `broadcast()` function in `ws.ts`.

**Why it's wrong:** The current `broadcast()` sends to ALL connected clients. There is no session routing. Adding chat events would require tracking which WS client is subscribed to which chat session. This adds significant complexity to a working system.

**Do this instead:** SSE per chat turn. Each turn opens its own `EventSource` connection, streams to that specific client, and closes. No routing required.

### Anti-Pattern 2: Over-Engineering the Plugin System

**What people do:** Build a VS Code-style extension manifest system with JSON schemas, dynamic `import()`, plugin sandboxing, and plugin marketplace infrastructure.

**Why it's wrong:** There is exactly one plugin (GSD) and it will always be bundled with the app. The complexity has zero payoff.

**Do this instead:** A plain TypeScript array of plugin definitions, a `Map<slotName, Component[]>` for slot lookup, and a `PluginRegistryContext`. The entire registry can fit in 60 lines.

### Anti-Pattern 3: React Router for the View Switcher

**What people do:** Introduce React Router to handle the `ProjectOverview` → `ChatPanel` → `PhaseDashboard` transitions.

**Why it's wrong:** The existing app uses Zustand state as the view router and it works. Adding React Router would require URL design for an app with no bookmarkable URLs, route wrapping for the entire component tree, and navigation logic in two places.

**Do this instead:** Extend the existing Zustand-state-based view switcher to support the new named views. The view derivation logic in `App.tsx` becomes a `deriveView()` function that maps `{ activeProjectId, selectedFile, executionStatus, activeView }` to a view name.

### Anti-Pattern 4: Storing Chat Streaming State in a Zustand Store

**What people do:** Add a `streamingText` field to `chatStore` and call `set({ streamingText: streamingText + delta })` on every SSE delta event.

**Why it's wrong:** SSE deltas arrive at token speed (potentially 100+ per second). Each `set()` call triggers a Zustand notification and a React re-render of all subscribers. Same problem that the rAF buffer pattern was invented to solve in `LogViewer`.

**Do this instead:** Buffer SSE deltas in `useRef` at the component level. Drain into React state via `requestAnimationFrame`. Only commit the completed message to `chatStore` when the SSE stream closes.

### Anti-Pattern 5: New Backend Service for Phase Dashboard Data

**What people do:** Create a new `/api/phases` endpoint that re-parses the roadmap and returns enhanced phase data for the dashboard.

**Why it's wrong:** `planningParser.ts` already parses the roadmap, counts plans and summaries, reads STATE.md, and returns everything the Phase Dashboard needs. The `GET /api/projects/:id/overview` endpoint already returns this data. File watcher events already trigger re-fetches.

**Do this instead:** Build the Phase Dashboard as a React component that consumes the existing `useProjectOverview(projectId)` TanStack Query hook. The Phase Dashboard is purely a presentation difference, not a data difference.

---

## Sources

- Hono SSE Official Docs: [hono.dev/docs/helpers/streaming](https://hono.dev/docs/helpers/streaming) — HIGH confidence. Confirmed `streamSSE()` API, `writeSSE({ data, event, id })`, `stream.onAbort()` for client disconnect.
- WordPress Gutenberg SlotFill: [developer.wordpress.org/block-editor/reference-guides/components/slot-fill](https://developer.wordpress.org/block-editor/reference-guides/components/slot-fill/) — HIGH confidence. Reference implementation for the named slot / fill pattern.
- SSE vs WebSocket with Hono (DEV.to): [dev.to/itaybenami/sse-websockets-or-polling-build-a-real-time-stock-app-with-react-and-hono-1h1g](https://dev.to/itaybenami/sse-websockets-or-polling-build-a-real-time-stock-app-with-react-and-hono-1h1g) — MEDIUM confidence. Practical SSE + Hono pattern with EventEmitter-based broadcast.
- Streamdown (Vercel): [github.com/vercel/streamdown](https://github.com/vercel/streamdown) — MEDIUM confidence. Drop-in replacement for react-markdown optimized for AI streaming; handles incomplete/unterminated Markdown blocks.
- Streaming markdown with react-markdown memoization: [ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization](https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization) — MEDIUM confidence. Memoization approach to prevent full re-parse on each token.
- Direct codebase inspection: `frontend/src/`, `backend/src/` — HIGH confidence. All integration points derived from reading the actual running code.

---
*Architecture research for: GSD Dashboard v2.0 — Plugin System + Chat + Phase Dashboard*
*Researched: 2026-03-01*
