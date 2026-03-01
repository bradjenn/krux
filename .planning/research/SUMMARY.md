# Project Research Summary

**Project:** GSD Dashboard v2.0 — Plugin System, Chat Interface, Phase Dashboard
**Domain:** React SPA + Hono API + Claude Agent SDK (subsequent milestone — Phases 1-3 complete)
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

This is a subsequent milestone, not a greenfield project. Phases 1-3 are complete and working: a Hono backend with WebSocket streaming, a React frontend with TanStack Query + Zustand state management, an execution panel with rAF-buffered log streaming, and a Claude Agent SDK integration. The v2.0 milestone adds three capabilities — a compile-time plugin system, a streaming chat interface, and a phase dashboard — to this working base. Research confirms the existing architecture is sound and capable of extending to all three features with minimal new dependencies: three frontend packages (`streamdown`, `dexie`, `dexie-react-hooks`) and no backend library additions.

The recommended build order has a hard first step: plugin system and app shell refactor must precede all other work. The app's current `App.tsx` if/else view routing and hard-coded GSD components must be replaced with a `PluginRegistryContext` and a named view registry before new views are added. This is the highest-risk work in the milestone because it touches the working execution pipeline. After that, chat backend → chat frontend → GSD slash commands → phase dashboard follows a clear dependency chain. The chat feature introduces SSE for streaming (not extending the existing WebSocket broadcast bus) — this is the key transport decision, confirmed correct by Hono's first-class `streamSSE()` support and the need to avoid adding session-routing complexity to the broadcast mechanism.

The most dangerous pitfalls are all front-loaded in the app shell refactor phase: over-engineering the plugin API to VS Code scale, breaking the working execution panel during the refactor, mixing chat and execution session state in a single Zustand store, and allowing WebSocket message type explosion without a namespace dispatcher. Each is preventable with explicit success criteria and the strangler-fig refactor pattern. The phase dashboard is the lowest-risk feature in the milestone — it requires no new backend routes, no new dependencies, and builds entirely on data already served by the existing `planningParser.ts` overview endpoint.

## Key Findings

### Recommended Stack

The v2.0 stack additions are minimal by design. The plugin system requires zero new libraries — it is a TypeScript `Map`, a `React.createContext`, and a `useSlot()` hook (~60 lines total). The phase timeline uses existing `shadcn/ui` + Tailwind primitives as a custom ~100-line stepper component; no charting or Gantt library is warranted (those libraries are designed for calendar scheduling, not sequential step visualization). The two genuine additions are `streamdown` for streaming markdown in the chat component (built by Vercel in February 2026, purpose-built for AI streaming — handles incomplete markdown blocks that `react-markdown` renders as broken HTML), and `dexie` + `dexie-react-hooks` for IndexedDB-backed chat session persistence (`localStorage` is rejected due to its 5MB quota, which a single long chat session can approach).

**Core new technologies:**
- `streamdown@2.3.0`: Streaming markdown renderer for `ChatMessage.tsx` only — handles unterminated blocks during token streaming. Required for chat to ship without raw syntax flash. Requires `@source` directive in `globals.css` for Tailwind v4 content scanning.
- `dexie@4.3.x` + `dexie-react-hooks@4.x`: IndexedDB wrapper for chat history persistence — avoids the localStorage 5MB quota failure mode. `useLiveQuery` provides reactive updates matching TanStack Query's `useQuery` pattern.
- Plugin registry (native React, no library): `Map<slotName, Component[]>` + `React.createContext` + `useSlot()` hook. Full implementation is ~60 lines. Adding a plugin framework library would add abstraction without solving anything the native pattern does not.

**What NOT to add:** Gantt/timeline library, Framer Motion (pulled in by shadcn community timeline components), `react-plugin` or `@grlt-hub/react-slots` (unnecessary over native `Map` + Context), `idb-keyval` (key-value only; cannot query messages by sessionId), Zustand persist with localStorage for chat history.

### Expected Features

The v2.0 feature set is fully defined in REQUIREMENTS.md. Research confirms the prioritization and identifies the correct deferral boundaries.

**Must have (table stakes — P1):**
- App shell plugin refactor: `PluginDefinition` interface, `useSlot()`, `PluginRegistryProvider`, view registry replacing `App.tsx` if/else, `currentView` state in `appStore`
- Chat message thread with streaming display and auto-scroll (user/assistant turns, loading indicator, disable input during stream)
- Streaming markdown via `streamdown` — blocks chat shipping; raw syntax flash during streaming is not acceptable
- GSD slash command integration (`/gsd:new-project`, `/gsd:plan-phase`, etc.) invoked from chat input — the core v2.0 differentiator
- Session persistence (IndexedDB for message history via Dexie; localStorage for session ID only)
- Phase timeline with status badges (done / in-progress / not-started) from existing `planningParser` data
- Live STATUS card from STATE.md frontmatter with file watcher live updates

**Should have (differentiators — P2):**
- Slash command autocomplete dropdown from SDK init message `slash_commands` list
- Plan detail expand/collapse from phase dashboard rows
- Requirement coverage tags per phase (PHASE-03 requirement traceability)
- Jump-to-document links from plan names (reuses Phase 2 doc viewer at zero infrastructure cost)
- Completion count badge per phase ("3/5 plans")
- Progress percentage bar on STATUS card

**Defer (v2+):**
- Tool call visualization inline in chat (CHAT-06) — high complexity, confirmed deferred in REQUIREMENTS.md
- Multiple concurrent chat sessions (CHAT-07) — requires tab management and WS fan-out changes
- Past sessions history panel — single most-recent session is sufficient for now
- Gantt chart with dates — GSD phases have no due dates; status badges convey the same information
- Phase dependency graph — GSD phases are sequential; a dependency graph of a linear list adds no insight

### Architecture Approach

The architecture is additive, not a rewrite. The backend gains one new route group (`/api/chat/*`) with two new services (`chatRunner.ts` and `chatSessionRegistry.ts`) mirroring the existing `agentRunner.ts` / `sessionRegistry.ts` pattern. The frontend gains a plugin registry (React Context), a `chatStore` (Zustand), two new component directories (`components/chat/`, `components/phase/`), and one new hook (`useChatStream.ts`). Eleven existing backend files remain unchanged. The WebSocket broadcast bus stays unchanged — chat streaming uses SSE instead (`GET /api/chat/:sessionId/stream`) to avoid adding session-routing complexity to the broadcast mechanism.

**Major components:**
1. `plugins/registry.ts` — `PluginRegistryContext`, `PluginRegistryProvider`, `useSlot()`, `viewRegistry` Map; replaces `App.tsx` if/else view routing; compile-time plugin array hardcoded at app startup
2. `plugins/gsd/index.ts` — GSD plugin definition; registers sidebar items, doc viewer, execution panel, chat panel, and phase dashboard as named slots and views
3. `routes/chat.ts` + `services/chatRunner.ts` + `services/chatSessionRegistry.ts` — new backend trio; SSE-streamed chat turns; session continuation via Claude Agent SDK `resume` flag; mirrors existing execution pattern exactly
4. `components/chat/ChatPanel.tsx` + `hooks/useChatStream.ts` + `stores/chatStore.ts` — chat frontend; EventSource + rAF buffer (same pattern as `LogViewer`); `streamdown` for streaming markdown; Dexie for persistence
5. `components/phase/PhaseDashboard.tsx` + `PhaseTimeline.tsx` + `PlanDetail.tsx` — phase dashboard frontend; consumes existing `useProjectOverview()` TanStack Query hook; no new backend routes; custom Tailwind stepper (~100 lines)

**Key patterns:**
- Compile-time plugin registration: plugin array is a hardcoded TypeScript import, not dynamic `import()`
- SSE per chat turn + WebSocket broadcast bus for file/execution events: two channels, different transports, no changes to existing WS infrastructure
- rAF buffer pattern shared: `LogViewer` (execution) and `ChatPanel` (chat) both buffer in `useRef`, drain to React state at 60fps
- Zustand store isolation: `appStore` (navigation only, frozen), `executionStore` (execution status only), `chatStore` (new, chat sessions and history)

### Critical Pitfalls

1. **Plugin API over-engineering** — VS Code is cited as the reference, but it has 45,000+ extensions and a runtime marketplace; this system has one plugin and compile-time registration. Keep the `Plugin` interface under 7 fields. Write the GSD plugin immediately after defining the interface; delete any field the GSD plugin does not exercise. Warning sign: plugin registration requires reading documentation before writing a plugin.

2. **Execution panel broken during App.tsx refactor** — the working execution pipeline is the most valuable existing feature. Use the strangler-fig pattern: build the plugin host and new view routing in parallel with existing code; cut over only after end-to-end execution streaming is validated through the new routing system; delete old code last. Success criterion: a GSD phase launches and streams after every commit during the refactor.

3. **WebSocket message type explosion** — `useWebSocket.ts` handles `file:*` and `execution:*` namespaces today. Adding `chat:*` and `phase:*` to the same switch statement without a dispatcher turns the hook into a god object. Before adding any new event types: fix the pre-existing `WsEvent` type duplication between `shared/types/index.ts` and inline in `useWebSocket.ts`, then introduce a namespace dispatcher (`handlers.get(event.type.split(':')[0])`). This is a prerequisite, not polish.

4. **Chat and execution session state conflict** — the `App.tsx` `isExecuting` guard shows `ExecutionPanel`; if chat sessions use the same status field or store, it fires falsely for chat. Introduce `currentView: 'overview' | 'document' | 'execution' | 'chat' | 'phase'` to `appStore` as the explicit view router before adding chat or phase dashboard views. Keep `chatStore` and `executionStore` fully separate.

5. **Chat history unbounded in localStorage** — `localStorage.setItem` throws an uncaught `DOMException: QuotaExceededError` after ~20-30 long chat turns, silently breaking all persistence including the active project ID. Cap stored messages to 50 in `chatStore`'s persist slice; catch `QuotaExceededError` and degrade gracefully; store full history in IndexedDB (Dexie); store only the session ID and last 50 messages in localStorage.

## Implications for Roadmap

The existing milestone structure from MILESTONES.md is validated by research. The suggested phase structure below maps directly to the v2.0 milestone work.

### Phase 4: Plugin System + App Shell Refactor

**Rationale:** Every subsequent feature must register through the plugin system. This is a hard dependency. The app shell refactor is also the highest-risk work in the milestone and must be isolated before chat and phase dashboard complexity is added. Doing it first contains the risk.

**Delivers:** `PluginRegistryContext`, `useSlot()`, `viewRegistry`, GSD plugin definition (sidebar items, doc viewer, execution panel re-registered as plugin contributions), explicit `currentView` state in `appStore` replacing if/else routing, WebSocket namespace dispatcher refactor (prerequisite for all new event types).

**Addresses:** Plugin registration, app shell restructure, route contribution, TypeScript plugin interface.

**Avoids:** Plugin API over-engineering (write GSD plugin immediately to validate interface), execution panel regression (strangler-fig pattern with streaming validation after each commit), WebSocket event type explosion (dispatcher before new message namespaces), view routing chaos (add `currentView` before new views), appStore bloat (freeze appStore to navigation concerns only).

**Research flag:** Standard patterns — no per-phase research needed. The plugin slot pattern (WordPress Gutenberg SlotFill, React Cosmos) is well-documented. The implementation is ~60 lines.

### Phase 5: Chat Backend

**Rationale:** Backend before frontend. Chat backend can be built and curl-tested before any React code is written. SSE streaming can be validated independently. No dependency on the plugin system (backend is not plugin-aware).

**Delivers:** `routes/chat.ts` (6 endpoints: session CRUD, message POST, SSE stream, cancel), `services/chatRunner.ts` (SSE-based agent streaming with `resume` flag for session continuation), `services/chatSessionRegistry.ts` (message history, SDK session ID tracking, AbortController for cancellation), mounted at `app.route('/api/chat', chatRoute)`.

**Uses:** Hono `streamSSE()`, Claude Agent SDK `query()` with `resume` option, existing `agentRunner.ts` pattern (mirrors it exactly, does not modify it).

**Avoids:** Second WebSocket connection for chat (use SSE; do not extend broadcast bus with session routing), chat/execution session registry sharing (separate `ChatSessionRegistry`).

**Research flag:** Standard patterns — Hono SSE is documented and confirmed. The chatRunner/agentRunner mirror pattern is direct and validated.

### Phase 6: Chat Frontend

**Rationale:** Depends on Plugin Registry (to register `ChatPanel` as a named view) and Chat Backend (to stream from). The streaming markdown problem (`streamdown`) must be validated early in this phase — it is the hardest table-stakes requirement.

**Delivers:** `components/chat/ChatPanel.tsx`, `MessageList.tsx`, `MessageBubble.tsx` (with `streamdown`), `InputBar.tsx` (with slash command autocomplete), `hooks/useChatStream.ts` (EventSource + rAF buffer), `stores/chatStore.ts` (Zustand + Dexie persistence with 50-message cap), GSD plugin registration of the chat view.

**Uses:** `streamdown@2.3.0` (install in this phase; add `@source` directive to `globals.css`), `dexie@4.3.x` + `dexie-react-hooks@4.x` (install in this phase), existing rAF buffer pattern from `LogViewer.tsx`.

**Avoids:** Streaming text in Zustand store (use `useRef` buffer + rAF drain), streaming markdown syntax flash (use `streamdown` for `ChatMessage.tsx`; keep `react-markdown` in `DocViewer.tsx`), chat state in `appStore` (use dedicated `chatStore`), unbounded chat history (50-message persist cap + `QuotaExceededError` catch).

**Research flag:** Low risk, but validate `streamdown@2.3.0` + Tailwind v4 `@source` directive in this project's `globals.css` early in the phase before building the full component tree. Confirmed working in official docs but unverified in this specific project setup.

### Phase 7: GSD Slash Commands

**Rationale:** Depends on Chat Frontend (input handles command parsing) and Chat Backend (command routing in `chatRunner`). The highest-value v2.0 differentiator — turns the chat from a generic Claude interface into a GSD-native workflow tool. Straightforward extension once chat is working.

**Delivers:** `/gsd:new-project`, `/gsd:plan-phase`, and other GSD commands invokable from the chat input. Slash command autocomplete dropdown (filtered from SDK `slash_commands` init message). Visually distinct command output (command messages render via existing `LogViewer` component, not `streamdown`, since output is ANSI-formatted agent logs).

**Uses:** Claude Agent SDK `slash_commands` from `system.init` message (`message.type === "system" && message.subtype === "init"` — confirmed in official docs at HIGH confidence), existing `LogViewer` for command output rendering.

**Avoids:** Tool call visualization inline in chat (defer to v2 per REQUIREMENTS.md), multiple concurrent sessions (defer to v2).

**Research flag:** Standard patterns — slash command integration is documented in official Claude Agent SDK docs at HIGH confidence. No research phase needed.

### Phase 8: Phase Dashboard

**Rationale:** Last because it is the lowest-risk feature in the milestone. No new backend routes, no new dependencies, no changes to existing services. The Phase Dashboard is a presentation difference, not a data difference — it visualizes data already served by `GET /api/projects/:id/overview`. File watcher invalidation must be extended to cover any new TanStack Query keys the dashboard introduces.

**Delivers:** `components/phase/PhaseDashboard.tsx`, `PhaseTimeline.tsx` (vertical stepper, ~100 lines Tailwind), `PlanDetail.tsx` (expand/collapse plan file list), live STATUS card from STATE.md frontmatter, requirement coverage tags, jump-to-document links, completion count badges, GSD plugin registration of the phase dashboard view.

**Uses:** Existing `useProjectOverview()` TanStack Query hook (no new endpoints), existing file watcher WebSocket invalidation (extended to cover new query keys at introduction time, not as a follow-up).

**Avoids:** New backend endpoints for phase detail (one existing overview endpoint returns all phases), per-phase API requests on dashboard mount (one request, not N per phase card), Gantt chart library, Framer Motion, stale dashboard data (extend WS file event handler to invalidate all new query keys immediately when those keys are introduced).

**Research flag:** Standard patterns — no research needed. Phase dashboard consumes existing backend data with established TanStack Query patterns.

### Phase Ordering Rationale

- Plugin system is a hard prerequisite because every new view registers through it. Building chat or phase dashboard directly in `App.tsx` creates extraction rework that costs more than doing it first.
- Chat backend before chat frontend follows backend-before-frontend discipline: SSE endpoints can be curl-tested and validated before any React is written, preventing mid-build discovery of API contract mismatches.
- GSD slash commands after chat frontend because command input parsing runs in `InputBar` and autocomplete requires the `slash_commands` relay to be wired from the chat backend.
- Phase dashboard last because it is genuinely independent of chat infrastructure. Deferring it means chat (the higher-value feature) ships sooner.
- The WebSocket dispatcher refactor is scheduled in Phase 4 (plugin system phase) because it is a prerequisite for adding new message namespaces in later phases — it must precede chat backend development.

### Research Flags

Phases with standard patterns — no per-phase research needed:
- **Phase 4 (Plugin System):** Named slot/fill pattern is well-documented. Implementation is ~60 lines.
- **Phase 5 (Chat Backend):** Hono `streamSSE()` is documented and confirmed. ChatRunner mirrors existing AgentRunner pattern exactly.
- **Phase 7 (Slash Commands):** Claude Agent SDK slash command API is documented at HIGH confidence.
- **Phase 8 (Phase Dashboard):** Reuses existing TanStack Query hooks and file watcher infrastructure.

Phases warranting a validation spike before full implementation:
- **Phase 6 (Chat Frontend):** Validate `streamdown@2.3.0` + Tailwind v4 `@source` directive integration in this project's CSS setup before committing to the full component build. Low risk, but unverified in this specific environment.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v1.0 stack is running code. `streamdown` and `dexie` confirmed via official docs and npm. Plugin registry is a native React pattern with no library choice to validate. `streamdown` Tailwind v4 integration documented but unverified in this project specifically. |
| Features | HIGH | Grounded in existing REQUIREMENTS.md (primary source), direct codebase inspection, and official Claude Agent SDK docs. Feature prioritization matches REQUIREMENTS.md exactly. |
| Architecture | HIGH | Based on direct codebase inspection of all 13 backend and frontend files. SSE vs WebSocket decision is confirmed correct by Hono SSE docs and existing broadcast model constraints. Eleven unchanged backend files confirm the additive approach. |
| Pitfalls | HIGH | Derived from direct codebase analysis. Pitfalls reference specific existing code (e.g., `WsEvent` duplication between `shared/types/index.ts` and `useWebSocket.ts`, `readFileSync` in `planningParser.ts`), not generic web app pitfalls. |

**Overall confidence:** HIGH

### Gaps to Address

- **`streamdown` Tailwind v4 integration in this project:** The `@source "../node_modules/streamdown/dist/*.js"` directive is documented but not verified against this project's specific `vite.config.ts` and `globals.css` setup. Validate early in Phase 6 before building the full component tree.
- **Claude Agent SDK `resume` flag under session expiry:** Session continuation via `resume: sdkSessionId` is documented at HIGH confidence, but behavior when the original session has expired server-side (after a long gap) is not documented. Plan a fallback: if `resume` fails, start a new session and inform the user their message history is preserved locally but the conversation context has reset.
- **Dexie schema migration strategy:** Research specifies schema v1. If schema changes are needed during development (adding an index, adding a field), Dexie's version migration API must be used. Plan the schema conservatively to minimize migrations.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `frontend/src/`, `backend/src/` — all architecture decisions grounded in actual running code
- [Claude Agent SDK — Slash Commands](https://platform.claude.com/docs/en/agent-sdk/slash-commands) — `slash_commands` in system init message, built-in commands, custom command paths
- [Claude Agent SDK — Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) — `resume` flag for session continuation
- [Claude Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) — `@anthropic-ai/claude-code` renamed to `@anthropic-ai/claude-agent-sdk`
- [Hono Streaming Helpers](https://hono.dev/docs/helpers/streaming) — `streamSSE()` API, `writeSSE()`, `stream.onAbort()`
- [Dexie.js npm](https://www.npmjs.com/package/dexie) — v4.3.x, TypeScript-first, zero peer deps
- [dexie-react-hooks npm](https://www.npmjs.com/package/dexie-react-hooks) — `useLiveQuery()` reactive query API
- [MDN: Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage 5MB limit per origin
- [Zustand discussions: store separation](https://github.com/pmndrs/zustand/discussions/2486) — one store per concern
- [TanStack Query: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) — file watcher invalidation pattern
- [Hono WebSocket CORS issue #4090](https://github.com/honojs/hono/issues/4090) — WS must register before CORS middleware (preserved from v1.0 research, confirmed fix in place)
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/MILESTONES.md` — primary project source documents

### Secondary (MEDIUM confidence)
- [streamdown GitHub (vercel/streamdown)](https://github.com/vercel/streamdown) — v2.3.0 (Feb 19 2026), drop-in react-markdown replacement for AI streaming, Tailwind integration
- [streamdown.ai/docs](https://streamdown.ai/docs) — streaming-safe markdown rendering, incomplete block handling
- [React Cosmos UI Plugins docs](https://reactcosmos.org/docs/plugins/ui-plugins) — slot/plug pattern reference for plugin registry design
- [WordPress Gutenberg SlotFill](https://developer.wordpress.org/block-editor/reference-guides/components/slot-fill/) — named slot/fill pattern reference implementation
- [SSE vs WebSocket with Hono (DEV.to)](https://dev.to/itaybenami/sse-websockets-or-polling-build-a-real-time-stock-app-with-react-and-hono-1h1g) — practical SSE + Hono pattern
- [assistant-ui — React AI chat component patterns](https://github.com/assistant-ui/assistant-ui) — table-stakes UX pattern reference (auto-scroll, streaming, tool call rendering)
- [IndexedDB vs localStorage for chat history](https://dev.to/armstrong2035/9-differences-between-indexeddb-and-localstorage-30ai) — confirms Dexie for message history, localStorage for session ID only
- [SVAR React Gantt comparison 2026](https://svar.dev/blog/top-react-gantt-charts/) — confirms Gantt libraries are for calendar scheduling, not sequential steps
- [VS Code Extension API — Contribution Points](https://code.visualstudio.com/api/extension-capabilities/overview) — design reference for plugin contributes pattern (GSD plugin system is a simplified version)

### Tertiary (LOW confidence)
- [shadcn-timeline GitHub](https://github.com/timDeHof/shadcn-timeline) — confirmed Framer Motion dependency; decision to avoid (single source)

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
