# Roadmap: GSD Dashboard

## Milestones

- ✅ **v1.0 Foundation** — Phases 1-3 (shipped 2026-03-01)
- 🚧 **v2.0 Standalone App + Plugin Architecture** — Phases 4-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Foundation (Phases 1-3) — SHIPPED 2026-03-01</summary>

### Phase 1: Backend Foundation
**Goal**: A running Hono server that serves project data via REST, manages agent sessions safely, and parses .planning/ files — ready for the frontend to build against
**Depends on**: Nothing (first phase)
**Requirements**: PROJ-01, PROJ-02, PROJ-03
**Success Criteria** (what must be TRUE):
  1. Server starts and responds to REST requests for projects, phases, and document content
  2. Registering and removing a project path persists across server restarts
  3. Switching the active project returns the correct .planning/ document list
  4. Server startup kills any orphaned Claude processes from previous runs
  5. SIGTERM handler fires before exit and cleans up all tracked child processes
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Hono server scaffold, shared types, project store, planning parser, REST endpoints, and server entry point
- [x] 01-02-PLAN.md — Session registry, process lifecycle management (orphan cleanup + SIGTERM), and session routes

### Phase 2: Frontend + Document Viewer
**Goal**: Users can register projects, switch between them, browse .planning/ files as rendered markdown, and see the dashboard auto-update when files change on disk — all from the browser, no terminal needed
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. User can register a project path and see it appear in the project list
  2. User can remove a project and switch between registered projects without page reload
  3. User sees a project overview card showing phase count, progress, and current status
  4. User can browse .planning/ files via a file tree sidebar and view them as formatted markdown with syntax-highlighted code blocks
  5. Dashboard refreshes project data automatically when .planning/ files change on disk
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — React + Vite + Tailwind v4 + shadcn/ui scaffold with dark terminal aesthetic, project management UI (sidebar, command palette, overview)
- [x] 02-02-PLAN.md — Document viewer with backend directory listing, file tree sidebar, react-markdown GFM rendering, syntax highlighting, breadcrumbs
- [x] 02-03-PLAN.md — WebSocket infrastructure (@hono/node-ws), chokidar file watcher, live dashboard updates (toasts, file highlights, scroll preservation)

### Phase 3: Agent SDK + Streaming
**Goal**: Users can trigger phase execution from the UI, watch live streaming output, and stop a running agent — with sessions that continue without the 12-second cold-start penalty
**Depends on**: Phase 2
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04
**Success Criteria** (what must be TRUE):
  1. User can trigger phase execution from the UI and see the agent start within 2 seconds on subsequent calls
  2. User can stop a running agent and see it terminate cleanly
  3. User sees a progress summary (Plan N/M, Task X/Y) updating in real-time during execution
  4. User can expand a panel to see the full streaming agent output without browser choke
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Backend agent service: SDK integration, execution routes (POST/DELETE), session continuation, progress parsing, and WebSocket streaming fan-out
- [x] 03-02-PLAN.md — Frontend execution panel: Execute button on PhaseCard, progress header with segmented bar, ANSI log viewer with rAF buffering, stop/restart controls

</details>

### 🚧 v2.0 Standalone App + Plugin Architecture (In Progress)

**Milestone Goal:** Refactor the GSD Dashboard into a standalone app with a plugin system. GSD becomes the first plugin. Complete the remaining v1 features (chat, phase dashboard) as plugin-provided capabilities.

#### Phase 4: Plugin System + App Shell
**Goal**: The app has a working plugin registry and GSD features are behind the plugin boundary — every subsequent feature registers through this system
**Depends on**: Phase 3
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06
**Success Criteria** (what must be TRUE):
  1. A new plugin can be registered at compile time by adding a PluginDefinition to the plugin array — no changes to App.tsx or the router
  2. The execution panel streams correctly after the App.tsx if/else routing is replaced by the plugin view registry
  3. GSD sidebar items, doc viewer, and execution panel appear as plugin-contributed slots (not hardcoded in the shell)
  4. Subscribing to a lifecycle event (project:switched, file:changed, execution:started) from a plugin triggers the plugin's handler
  5. Adding a new event namespace to the WebSocket handler does not require touching existing namespace handlers
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Plugin API cleanup: simplified PluginDefinition (isAvailable, autoOpen, no sidebarSection), mitt event bus, project-list-only sidebar, tab dropdown disabled state, auto-open GSD tab on project select
- [ ] 04-02-PLAN.md — GSD plugin definition: three views (Overview, Documents, Execute) as plugin-contributed views, headerSlot with contextual back buttons, shell-only App.tsx via view registry, FileTree navigation wiring

#### Phase 5: Chat Interface
**Goal**: Users can have a real-time conversation with Claude in the browser, see responses stream token by token with correctly rendered markdown, and resume previous sessions after a page reload
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User sends a message and sees Claude's response appear token by token in the chat panel
  2. Streaming markdown renders correctly mid-stream — no flash of raw syntax or broken code blocks at any point during the stream
  3. User closes and reopens the browser, navigates to the chat view, and sees their previous message history intact
  4. User can send a follow-up message and Claude responds with awareness of the prior conversation
**Plans**: TBD

Plans:
- [ ] 05-01-PLAN.md — Chat backend: routes/chat.ts (session CRUD, message POST, SSE stream, cancel), chatRunner.ts (SSE-streamed agent turns, resume flag), chatSessionRegistry.ts
- [ ] 05-02-PLAN.md — Chat frontend: ChatPanel.tsx, MessageList.tsx, MessageBubble.tsx (streamdown), InputBar.tsx, useChatStream.ts (EventSource + rAF), chatStore.ts (Zustand + Dexie, 50-message cap), GSD plugin registration

#### Phase 6: GSD Slash Commands
**Goal**: Users can invoke GSD workflows directly from the chat input with autocomplete and see command output rendered distinctly from conversational messages
**Depends on**: Phase 5
**Requirements**: CHAT-04, CHAT-08, CHAT-09
**Success Criteria** (what must be TRUE):
  1. User types "/" in the chat input and sees an autocomplete dropdown of available GSD commands
  2. User selects /gsd:plan-phase, the agent executes the GSD workflow, and the output appears in the chat
  3. GSD command output is visually distinct from conversational messages — rendered as agent log output, not chat bubbles
**Plans**: TBD

Plans:
- [ ] 06-01-PLAN.md — Slash command autocomplete (InputBar dropdown from SDK init slash_commands list), command routing in chatRunner, LogViewer rendering for command output

#### Phase 7: Phase Dashboard
**Goal**: Users can understand the state of their GSD project at a glance — phase timeline, plan completion, requirement coverage, and live STATUS — without opening any markdown files
**Depends on**: Phase 4
**Requirements**: PHASE-01, PHASE-02, PHASE-03, PHASE-04, PHASE-05, PHASE-06, PHASE-07
**Success Criteria** (what must be TRUE):
  1. User sees all phases in a vertical timeline with done/in-progress/not-started status badges, each showing a completion count (e.g., "3/5 plans")
  2. User clicks a phase row and sees its plans expand with completion status and a list of requirements covered
  3. User clicks a plan name in the expanded view and the doc viewer navigates to that document
  4. User sees a live STATUS card showing current phase, current plan, and a progress percentage bar — card updates automatically when STATE.md changes on disk
**Plans**: TBD

Plans:
- [ ] 07-01-PLAN.md — PhaseDashboard.tsx, PhaseTimeline.tsx (vertical stepper), PlanDetail.tsx (expand/collapse), requirement coverage tags, jump-to-doc links, completion badges, GSD plugin registration
- [ ] 07-02-PLAN.md — STATUS card from STATE.md frontmatter, progress bar, file watcher invalidation for all new TanStack Query keys

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Backend Foundation | v1.0 | 2/2 | Complete | 2026-03-01 |
| 2. Frontend + Document Viewer | v1.0 | 3/3 | Complete | 2026-03-01 |
| 3. Agent SDK + Streaming | v1.0 | 2/2 | Complete | 2026-03-01 |
| 4. Plugin System + App Shell | 2/2 | Complete   | 2026-03-02 | - |
| 5. Chat Interface | v2.0 | 0/2 | Not started | - |
| 6. GSD Slash Commands | v2.0 | 0/1 | Not started | - |
| 7. Phase Dashboard | v2.0 | 0/2 | Not started | - |
