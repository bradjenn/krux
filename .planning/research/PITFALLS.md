# Pitfalls Research

**Domain:** Adding plugin system + chat interface + phase dashboard to existing Hono+React app
**Researched:** 2026-03-01
**Confidence:** HIGH — based on direct codebase analysis and verified patterns. Claims about existing code are facts from reading the source. External research sources noted where used.

---

## Context

This research is milestone-specific: v2.0 adds features to a working v1.0 app. The v1.0 app has:
- Hono backend with 5 route files, WebSocket broadcast, file watcher
- React frontend: Zustand (`appStore`, `executionStore`), TanStack Query, single `useWebSocket` hook
- `App.tsx` uses if/else view routing (no router library), direct store reads
- `agentRunner.ts` uses `@anthropic-ai/claude-agent-sdk` with fire-and-forget async
- `planningParser.ts` reads `.planning/` files synchronously via `readFileSync`
- `WsEvent` union type defined in two places: `shared/types/index.ts` and inline in `useWebSocket.ts`

The pitfalls below are specific to retrofitting these features onto this concrete codebase, not generic web app pitfalls.

---

## Critical Pitfalls

### Pitfall 1: Plugin Abstraction Wider Than the Feature Set Requires

**What goes wrong:**
The plugin system gets designed to handle everything a future plugin might conceivably need — dynamic loading, versioned APIs, lifecycle hooks (onInstall, onUninstall, onActivate, onDeactivate), per-plugin storage namespaces, event buses, capability declarations, permission scoping. None of these are needed to wrap the existing doc viewer, execution panel, and file watcher behind a plugin boundary. The over-engineered API blocks progress because everything requires "the plugin system to be right first."

**Why it happens:**
VS Code is cited as the reference architecture in `PROJECT.md`. VS Code has 45,000+ extensions and a runtime plugin marketplace. This system has one plugin (GSD) and compile-time registration. The scale mismatch causes developers to adopt VS Code's complexity without VS Code's requirements.

**How to avoid:**
Design the plugin API to satisfy exactly what the GSD plugin needs and nothing more. Three concrete contracts:
1. `contributes.routes` — what URL paths the plugin owns
2. `contributes.sidebarItems` — what appears in the nav sidebar
3. `contributes.wsHandlers` — which WebSocket message type prefixes the plugin handles

No plugin lifecycle hooks, no versioning, no permission scoping. Add those when a second real plugin demands them. The compile-time constraint from `PROJECT.md` is the right call — enforce it by making the plugin registry a plain TypeScript array imported at build time, not a dynamic registration API.

**Warning signs:**
- Plugin interface has more than 5-7 fields
- Plugin registration accepts callbacks for `onMount`, `onUnmount`, `onActivate`
- Plugin API includes a "version" field or compatibility range
- Plugin development requires reading documentation before writing a plugin

**Phase to address:**
Plugin system design phase (first phase). Spend one session defining the interface, write the GSD plugin immediately after to validate it covers actual needs. If anything in the interface is not exercised by the GSD plugin, delete it.

---

### Pitfall 2: Refactoring Breaks the Working Execution Panel While Extracting Plugin Boundary

**What goes wrong:**
The execution panel currently works end-to-end: `App.tsx` renders `<ExecutionPanel>` when `executionStatus !== 'idle'`, wired to `useExecutionStore` and `onExecutionMessage` from `useWebSocket`. Moving this behind a plugin boundary changes the import graph and the condition under which the panel renders. If `App.tsx` is modified before the plugin host routing is in place, there is a window where the execution feature is broken — components are moved but not yet wired into the new system.

**Why it happens:**
The refactoring is done file-by-file rather than as an atomic swap. The execution panel is live in production (for the developer using the tool), so every intermediate commit must keep it working.

**How to avoid:**
Use the strangler fig pattern: build the plugin host shell alongside the existing code, then cut over at the last step. Specifically:
1. Create `plugins/gsd/` directory and copy (not move) the execution, viewer, and overview components there
2. Build the plugin registry and routing in parallel, rendering the existing components in the new slots
3. Only delete the old `App.tsx` if/else logic after the new routing is proven working end-to-end
4. Validate after each step: execution panel must still launch, stream logs, and complete

**Warning signs:**
- A commit that moves a component file without updating all import sites
- `App.tsx` has a comment "TODO: move this to plugin" that sits for more than one work session
- The execution panel throws a runtime error after a "non-breaking" refactor commit

**Phase to address:**
App shell refactor phase. Write explicit success criteria: "After this phase, a GSD phase can still be executed from the UI with full streaming output."

---

### Pitfall 3: WebSocket Message Type Explosion Breaks the Type System

**What goes wrong:**
Currently `useWebSocket.ts` handles two namespaces: `file:*` and `execution:*`. Adding chat adds `chat:*`. Adding phase dashboard live updates adds `phase:*`. Each new feature adds cases to the same `switch` statement and extends the `WsEvent` union. After three features, `useWebSocket.ts` is a god hook that knows about every feature in the system. Type narrowing becomes fragile. Adding a new message type requires modifying the core WebSocket hook even if the new feature is plugin-provided.

There is also pre-existing technical debt: `ExecutionWsEvent` is defined in both `shared/types/index.ts` and duplicated inline in `useWebSocket.ts`. The chat and phase features will make this duplication worse if not resolved first.

**How to avoid:**
Before adding any new message types, fix the existing duplication: remove the inline `ExecutionWsEvent` definition from `useWebSocket.ts` and import from `shared/types`. Then introduce a dispatcher pattern:

```typescript
// useWebSocket.ts becomes the transport layer only
ws.onmessage = (evt) => {
  const event = JSON.parse(evt.data)
  const namespace = event.type.split(':')[0]
  const handler = handlers.get(namespace)
  if (handler) handler(event)
}

// Each plugin registers its own handler
registerWsHandler('chat', handleChatEvent)
registerWsHandler('execution', handleExecutionEvent)
```

The core WebSocket hook knows nothing about specific message types — it only dispatches by namespace prefix. Each feature/plugin registers its own handler. New message namespaces do not require touching `useWebSocket.ts`.

**Warning signs:**
- `WsEvent` union type has more than 3 prefixes in it
- `useWebSocket.ts` imports from feature-specific modules (`executionStore`, `chatStore`)
- Adding a new WebSocket message type requires modifying `useWebSocket.ts`
- The `switch` statement in `ws.onmessage` is longer than 30 lines

**Phase to address:**
Plugin system phase (first phase). The dispatcher refactor must happen before chat or phase dashboard add their message types. This is a prerequisite, not a polish step.

---

### Pitfall 4: Chat Session State Conflicts With Execution Session State

**What goes wrong:**
The existing `executionStore` manages a single active session: `sessionId`, `status`, `progress`. If chat sessions use the same store or a similar pattern in the same flat namespace, state from a running execution bleeds into chat state rendering. Specifically: the `status !== 'idle'` check in `App.tsx` that shows the `ExecutionPanel` will fire for chat sessions if they use the same status field.

The current `App.tsx` renders views as: `!activeProjectId → EmptyState | isDocumentView → DocumentPage | isExecuting → ExecutionPanel | ProjectOverview`. Adding a chat view to this if/else chain without a proper router means adding another special-case condition that interacts with all existing conditions.

**Why it happens:**
The existing pattern worked cleanly with two states (document view and execution view). Adding a third view (chat) and a fourth (phase dashboard) to a condition chain scales badly. Each new feature must understand and not break the existing conditions.

**How to avoid:**
Before adding chat or phase dashboard, replace the `App.tsx` if/else view routing with an explicit router. A minimal approach without a router library: add `currentView: 'overview' | 'document' | 'execution' | 'chat' | 'phase'` to `appStore`. Each view is mutually exclusive. The chat store and execution store are separate Zustand stores with separate state; neither influences the other's rendering condition.

Execution sessions and chat sessions are different concepts: execution sessions run GSD phases on disk, chat sessions are conversations with Claude. Give them separate identifiers, separate stores, and separate API endpoints.

**Warning signs:**
- `chatStore` and `executionStore` share a `status: 'idle' | 'running'` field that triggers the same component
- `App.tsx` view routing conditions nest inside each other (e.g., `isExecuting && !isChatting`)
- A bug report: "Starting a chat also shows the execution panel"

**Phase to address:**
App shell refactor phase, before chat is built. The view routing system must be extended to support N views cleanly before new views are added.

---

### Pitfall 5: Chat Streaming Creates a Second WebSocket Connection Instead of Extending the Existing One

**What goes wrong:**
To add chat streaming, developers create a second WebSocket connection (`/ws/chat`) separate from the existing `/ws`. This means the frontend now manages two WebSocket connections, two reconnection loops, two connection status indicators, and two sets of cleanup logic. Server-side, there are two broadcast mechanisms that must be kept in sync with the same client registry.

**Why it happens:**
The existing `/ws` endpoint in `ws.ts` feels "owned" by the execution feature because it was built for that purpose. Chat feels like a separate feature that should have its own connection. But the WebSocket is a transport layer, not a feature.

**How to avoid:**
Extend the existing single WebSocket connection with a `chat:*` message namespace. The dispatcher pattern from Pitfall 3 handles routing. The existing reconnection logic, exponential backoff, and connection status are reused for free. On the server side, the existing `broadcast()` function in `ws.ts` sends chat events to all connected clients — the same as execution events.

The one exception: if chat needs bidirectional messaging (client sends messages over WebSocket rather than HTTP POST), add a `ws.onmessage` handler on the server side that routes by namespace prefix, parallel to the dispatcher on the frontend.

**Warning signs:**
- `frontend/src/hooks/useChatWebSocket.ts` file exists as a separate hook
- Backend has a `/ws/chat` or `/ws2` route
- Frontend shows two connection status indicators
- Chat reconnection logic duplicates the exponential backoff from `useWebSocket.ts`

**Phase to address:**
Chat interface phase. The first decision for the chat backend is "extend existing WebSocket, don't create a new one."

---

### Pitfall 6: Phase Dashboard Shows Stale Data After File Changes

**What goes wrong:**
The phase dashboard reads `.planning/ROADMAP.md` and the `phases/` directory via `planningParser.ts`. This data is already cached by TanStack Query under the `['overview', projectId]` key. The file watcher already invalidates this key on `file:changed` events. However, the phase dashboard adds more granular views — plan detail, requirement coverage, per-phase status — that require additional parsing not covered by the existing overview endpoint.

If the phase dashboard fetches its own additional data (phase-specific files, PLAN.md content) without hooking into the existing file watcher invalidation, those views go stale after a GSD agent completes a phase and writes new files.

**Why it happens:**
The file watcher in `watcher.ts` broadcasts `file:changed` for `.planning/**` paths. The frontend in `useWebSocket.ts` invalidates `['filetree', projectId]` and `['overview', projectId]` on every file event. A new phase-specific query key (e.g., `['phase-detail', projectId, phaseId]`) will not be invalidated by the existing logic unless the WebSocket handler is updated.

**How to avoid:**
When adding phase dashboard queries, audit the file watcher invalidation logic. Either:
1. Invalidate all `['phase-detail']` queries when any `.planning/phases/**` file changes (broadest, safest)
2. Parse the changed file path and invalidate only the specific phase query (more targeted)

Option 1 is appropriate for this tool. In the WS event handler for `file:*` events (after the dispatcher refactor from Pitfall 3), the handler should invalidate phase-detail queries in addition to the existing filetree/overview queries.

**Warning signs:**
- Phase dashboard shows "planned" status for a phase that the agent just completed
- Refreshing the browser fixes the stale data
- The phase detail view has a manual "Refresh" button as a workaround

**Phase to address:**
Phase dashboard phase. Add invalidation for new query keys immediately when those queries are introduced — not as a follow-up.

---

### Pitfall 7: Zustand Store Bloat as Each Feature Adds to `appStore`

**What goes wrong:**
The current `appStore` has two fields: `activeProjectId` and `selectedFile`. It is persisted to `localStorage` via `zustand/middleware/persist`. As chat is added, developers add `activeChatSessionId` to `appStore`. As phase dashboard is added, `selectedPhaseId` is added. As settings grow, preferences go there too. The store becomes a grab-bag of unrelated UI state. Everything that subscribes to `appStore` re-renders whenever any field changes. The persisted blob in `localStorage` grows and can carry stale/incompatible state between app versions.

**Why it happens:**
`appStore` is already imported everywhere. Adding a field is one line. Creating a new store file feels like overhead. The path of least resistance is to keep adding to the existing store.

**How to avoid:**
Establish a rule at the start of v2.0: `appStore` is frozen to navigation concerns only (active project, current view, selected file). New features get their own stores:
- `chatStore.ts` — chat sessions, active conversation, message history
- `phaseStore.ts` — selected phase for dashboard detail view (if needed)

Persist only what needs to survive page refresh. `activeChatSessionId` probably should persist. `selectedPhaseId` probably should not. Evaluate each field explicitly. Keep the persist middleware out of stores that don't need it.

**Warning signs:**
- `appStore` has more than 6 fields
- `appStore` is imported in 10+ component files
- A component subscribes to `appStore` but only uses one field unrelated to navigation
- The `localStorage` key `gsd-app-store` contains chat or phase-specific state

**Phase to address:**
App shell refactor phase. Define the store boundaries before any new feature adds state. This is a one-time architectural decision that is cheap to get right upfront and expensive to untangle later.

---

### Pitfall 8: Chat History Grows Unbounded in Memory and localStorage

**What goes wrong:**
Chat messages are stored in React state (or Zustand) with no size limit. A long conversation with streaming responses generates thousands of tokens per turn. After 20-30 turns, the in-memory conversation history is large. If persisted to `localStorage`, it hits the browser's 5MB storage limit (sometimes lower). On limit breach, `localStorage.setItem` throws a `DOMException: QuotaExceededError` that is not caught, silently breaking persistence for all stored data including the active project ID.

**Why it happens:**
In development, conversations are short. The limit is never hit. The bug appears only after real use over days. By then, the storage is corrupt and the fix is manual (clear all localStorage).

**How to avoid:**
- Cap stored chat history to the last N messages (e.g., 50 messages per session)
- For display, keep all messages in memory during a session; for persistence, write only a summary or the last 50
- Catch `QuotaExceededError` in the persist layer and degrade gracefully (warn user, stop persisting, don't crash)
- Use session-scoped storage rather than the global `appStore` persist blob for chat history

**Warning signs:**
- Chat history Zustand slice has no max-size logic
- The persist middleware is applied to the chat store without a size guard
- Developer console shows `DOMException: QuotaExceededError` after a long session

**Phase to address:**
Chat interface phase. Build the size cap into the initial chat store design.

---

### Pitfall 9: planningParser.ts Blocking I/O Amplified by Per-Phase Dashboard Requests

**What goes wrong:**
`planningParser.ts` uses `readFileSync` throughout. This is synchronous and blocks the Node.js event loop while reading files. Currently this is called from route handlers in a single-user personal tool, so it is acceptable. If the phase dashboard adds additional endpoints that call `parseRoadmap` or `parseState` per-phase (e.g., multiple browser tabs, or a dashboard that issues several fetches on mount), Node.js event loop blocking will cause other requests to queue behind the slowest parse.

**Why it happens:**
`readFileSync` is simpler than `fs.promises.readFile`. For a personal tool with one user, it is fine. The risk is that the phase dashboard makes multiple parallel reads on initial load (one per phase), amplifying the blocking behavior.

**How to avoid:**
Do not rewrite `planningParser.ts` unless parallelism actually becomes a problem. The constraint is: do not make the phase dashboard issue more than one concurrent parse request per user action. Design the phase dashboard backend endpoint to return all required phase data in a single call, not N calls per phase.

If per-phase detail endpoints are added, consider migrating `parseRoadmap` to async — it is a self-contained module and the migration is straightforward (swap `readFileSync` for `await fs.promises.readFile`).

**Warning signs:**
- Phase dashboard frontend issues N simultaneous fetches on mount (one per phase card)
- Server response time correlates with number of phases in the project
- Backend route handler for phase detail calls `parseRoadmap` to parse the full ROADMAP.md for every single phase request

**Phase to address:**
Phase dashboard backend phase. Design the API as "one request returns all phases" rather than "one request per phase."

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add chat fields to `appStore` instead of a new store | No new file, one-line change | Store re-renders everything on chat state changes; persist blob grows; semantically wrong | Never — create `chatStore.ts` |
| Duplicate `WsEvent` types instead of fixing the import | Avoids touching shared module | Two sources of truth diverge; adding a message type requires two edits | Never — fix the import before adding new types |
| Create `/ws/chat` separate WebSocket endpoint | Chat feels isolated and cleaner | Two reconnection loops, two connection states, duplicated backoff logic | Never — extend the existing connection |
| Implement plugin system without writing the GSD plugin first | Design feels cleaner | Plugin API has unused abstractions; real needs discovered too late to change the API | Never — write the GSD plugin before finalizing the plugin interface |
| Keep `App.tsx` if/else view routing and add more conditions | Avoids router refactor | Each new view must account for all existing conditions; bugs from unexpected interactions | Only if guaranteed exactly one more view will ever be added |
| Use `readFileSync` in new phase-detail endpoints | Simpler, consistent with existing code | Event loop blocks if multiple requests arrive simultaneously | Acceptable if API returns all data in one call |
| Skip session isolation between execution and chat | Less code | Running a phase shows as "chat active"; chat errors show in execution UI | Never — separate stores and separate status fields |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Plugin + App shell | Plugin registers components that directly import from `appStore` | Plugin components receive active project via props or plugin context; `appStore` is app-owned, not plugin-owned |
| Plugin + WebSocket | Plugin registers a WebSocket handler that calls `broadcast()` directly | Plugin handler is registered in the dispatcher; it receives events from the transport layer |
| Chat + Claude Agent SDK | Using `query()` for chat messages expecting low latency | Use session continuation (`resume` flag) so the Claude process is not re-spawned per message; see v1.0 PITFALLS.md Pitfall 1 |
| Chat + existing execution | Sharing `sessionRegistry` for both execution and chat sessions | Chat sessions and execution sessions are different record types; keep separate registries or add a `type: 'execution' | 'chat'` discriminant |
| Phase dashboard + file watcher | Phase detail query keys not registered for invalidation | Every new TanStack Query key that reads `.planning/` files must be added to the WS file event invalidation handler |
| Phase dashboard + planningParser | Calling `parseRoadmap` once per phase in the API | Design one endpoint that returns all phases; parse once per request |
| Compile-time plugin registry + TypeScript | Plugin array typed as `any[]` for flexibility | Define a `Plugin` interface; the array is `Plugin[]`; TypeScript catches missing required fields at build time |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Phase dashboard fetches N endpoints on mount (one per phase) | N parallel requests on every project switch; server blocks on N parse calls | Single `/api/projects/:id/overview` endpoint returns all phase data | With 10+ phases |
| Chat message list re-renders on every token without rAF buffering | CPU spike during streaming, scroll jump | Reuse the rAF buffer pattern from `LogViewer.tsx` for chat message streaming | Immediately at normal Claude token velocity |
| Streaming markdown re-parses full content per token | CPU peg at 100% during chat streaming | Use `streamdown` or equivalent streaming-safe parser; append-only rendering | After ~5 streaming messages in a session |
| Chat state in `appStore` causes layout re-renders on every token | All layout components re-render during chat streaming | Keep chat state in dedicated `chatStore` | Immediately if chat updates are frequent |
| localStorage quota exceeded from unbounded chat history | Silent `DOMException`; all localStorage persistence fails | Cap stored messages to last N; catch `QuotaExceededError` | After ~20-30 long chat turns |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering chat responses via raw innerHTML without sanitization | XSS if any HTML/script in Claude response | Use `ansi_up` for execution output (already done); use `streamdown` or `react-markdown` with sanitized renderers for chat — never raw innerHTML injection |
| Chat messages processed without shape validation | If any local app connects to the WebSocket, it can inject malformed chat events | Validate incoming WebSocket message shape with Zod before processing, even in a single-user tool |
| Phase detail API accepts `phaseId` from URL without path validation | Path traversal if `phaseId` is `../../etc/passwd` | Validate `phaseId` matches `\d+[\d.]*` before constructing filesystem paths; use `path.resolve` and verify the result is under `.planning/` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Chat input active while execution is running | User tries to chat during a phase run, gets confused by mixed output in the same panel | Disable chat input or show a clear indicator when a phase execution is active; these are separate contexts |
| Phase dashboard shows phase status from the last page load, not live status | User runs a phase, completes it, switches to dashboard, still sees "planned" status | File watcher invalidation of phase query keys (see Pitfall 6) ensures live status without a refresh |
| Plugin sidebar items appear in a different visual style from the app's own sidebar | UI looks inconsistent; plugin feels bolted on | Plugin `contributes.sidebarItems` provides a label and icon; the app renders them using its own sidebar component with the app's design system |
| Chat streaming output flashes raw markdown syntax during token delivery | Jarring experience; feels broken | Use streaming-aware markdown renderer (`streamdown` or equivalent) from the first implementation |
| No visual distinction between chat session and execution session | User doesn't know which "session" they're managing | Chat panel and execution panel are separate views with distinct headers and color coding |

---

## "Looks Done But Isn't" Checklist

- [ ] **Plugin system:** Often missing — GSD plugin exercises every interface field. Verify no plugin interface fields are unused after the GSD plugin is implemented.
- [ ] **Plugin system:** Often missing — existing execution panel still works after refactor. Verify a GSD phase can be launched and streamed after the app shell refactor completes.
- [ ] **WebSocket dispatcher:** Often missing — all existing message types still handled after the dispatcher refactor. Verify file watcher events still invalidate TanStack queries and execution events still update `executionStore`.
- [ ] **Chat streaming:** Often missing — streaming-safe markdown renderer. Verify a response containing a code block streams without showing raw backtick characters mid-stream.
- [ ] **Chat history:** Often missing — size cap on persistence. Verify that after 50+ chat messages, the app does not throw `QuotaExceededError` and previously stored project state is intact.
- [ ] **Phase dashboard:** Often missing — file watcher invalidation for new query keys. Verify that completing a GSD phase updates the phase dashboard status without a manual browser refresh.
- [ ] **Phase dashboard:** Often missing — single endpoint design. Verify the dashboard mounts with exactly one network request, not one per phase.
- [ ] **Store isolation:** Often missing — chat and execution status are independent. Verify that initiating a chat does not trigger the execution panel to render.
- [ ] **View routing:** Often missing — all existing views still reachable after adding new views. Verify doc viewer, project overview, and execution panel are all accessible after the routing refactor.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Plugin API over-engineered, GSD plugin can't be written cleanly | MEDIUM | Rewrite the plugin interface to match what GSD actually needs; the GSD plugin implementation is the spec |
| Execution panel broken by refactor | MEDIUM | Revert the move commits; use strangler fig approach instead (parallel build + cutover) |
| `WsEvent` type duplicated and diverged across three files | LOW | Audit all three locations; consolidate into `shared/types/index.ts`; remove duplicates |
| Chat and execution session state mixed in one store | HIGH | Requires auditing all components that read the mixed store, splitting into two stores, retesting all execution and chat flows |
| Phase dashboard fetches N endpoints per mount | LOW | Merge N phase endpoints into one overview endpoint; update frontend to use single query |
| localStorage quota exceeded from chat history | LOW | Add a size-capped selector to the chat persist config; add a `QuotaExceededError` catch handler |
| Second WebSocket connection created for chat | MEDIUM | Merge chat events into the existing WS namespace; update frontend to use the existing `useWebSocket` hook's dispatcher |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Plugin API over-engineering | Plugin system phase | GSD plugin written with under 100 lines of registration code; no unused interface fields |
| Execution panel broken during refactor | App shell refactor phase | GSD phase can execute and stream after refactor commit |
| WebSocket message type explosion | Plugin system phase (before chat) | `useWebSocket.ts` has no feature-specific imports; new message types don't require editing the hook |
| Chat/execution session state conflict | App shell refactor phase | Chat and execution have separate Zustand stores; separate status fields; separate rendering conditions |
| Second WebSocket connection for chat | Chat interface phase | Network tab shows exactly one WebSocket connection during chat |
| Phase dashboard stale data | Phase dashboard phase | Completing a phase updates dashboard status without browser refresh |
| `appStore` bloat | App shell refactor phase | `appStore` has 6 or fewer fields; no chat or phase-specific state in it |
| Chat history unbounded | Chat interface phase | After 60 messages, no `QuotaExceededError`; stored messages capped at 50 |
| Blocking I/O with per-phase fetches | Phase dashboard backend phase | Phase dashboard issues exactly 1 API call on mount |

---

## Sources

- Direct codebase analysis — `frontend/src/hooks/useWebSocket.ts`, `backend/src/routes/ws.ts`, `frontend/src/stores/`, `backend/src/services/agentRunner.ts`, `backend/src/services/planningParser.ts` — HIGH confidence
- [`PROJECT.md` v2.0 milestone definition](/.planning/PROJECT.md) — HIGH confidence (primary source)
- [Zustand: One global store or separate stores for separate concerns — discussion #2486](https://github.com/pmndrs/zustand/discussions/2486) — HIGH confidence
- [TanStack Query: Query Invalidation documentation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) — HIGH confidence
- [Vercel Streamdown: streaming-safe react-markdown replacement](https://github.com/vercel/streamdown) — MEDIUM confidence (2025 release)
- [Preventing Flash of Incomplete Markdown when streaming AI responses (HN discussion)](https://news.ycombinator.com/item?id=44182941) — MEDIUM confidence
- [Leaky abstractions lead to implicit coupling](https://medium.com/@josep.rodriguez/leaky-abstractions-lead-to-implicit-coupling-fd05275244c) — MEDIUM confidence
- [Hono WebSocket CORS middleware conflict — issue #4090](https://github.com/honojs/hono/issues/4090) — HIGH confidence (preserved from v1 research)
- [WebSocket architecture best practices — Ably](https://ably.com/topic/websocket-architecture-best-practices) — MEDIUM confidence
- [Claude Agent SDK session management docs](https://platform.claude.com/docs/en/agent-sdk/sessions) — HIGH confidence

---

*Pitfalls research for: v2.0 — plugin system + chat + phase dashboard on existing Hono+React app*
*Researched: 2026-03-01*
