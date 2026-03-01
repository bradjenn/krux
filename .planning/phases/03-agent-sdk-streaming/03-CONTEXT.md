# Phase 3: Agent SDK + Streaming - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can trigger phase execution from the UI, watch live streaming output, and stop a running agent — with session continuation to avoid the 12-second cold-start penalty on subsequent calls. This phase delivers the Claude Agent SDK integration on the backend and the execution/streaming UI on the frontend. Chat interface, GSD slash commands, and session persistence across page reloads are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Execution Trigger
- Execute button lives on each phase row in the project overview — contextual, not a separate panel
- Only the next executable phase shows the Execute button — enforces GSD's linear flow, prevents out-of-order execution
- Clicking Execute starts immediately — no confirmation dialog, the stop button is the safety net
- Auto-navigate to the streaming output panel on execution start, with a "Back to Overview" link (reuses existing BackToOverviewButton pattern from App.tsx)

### Streaming Output Display
- Simple scrolling log viewer with ANSI color support — not a full terminal emulator (xterm.js), not structured blocks
- Split view: progress summary as a fixed header at top, streaming log output below in a scrollable area
- Auto-scroll follows new output by default; pauses when user scrolls up to read earlier output; "Jump to bottom" button appears to resume auto-scroll
- Distinct terminal feel — slightly darker/different background from rest of app, border glow while running, to make the output area feel "live" and distinct from static content
- Use rAF (requestAnimationFrame) buffering to prevent browser choke on fast output

### Progress Summary
- Fixed header bar at top of execution panel showing phase name, plan progress, task progress, and current plan/task names
- Format: "Plan 2/4: Agent Service • Task 3/8: Create session registry" — medium info density with names, not just counts
- Segmented progress bar — one segment per plan, colored by status (green=done, blue=running, gray=pending)
- Plan completion/failure: segment color transitions (green/red with brief pulse animation) PLUS toast notification via existing Sonner pattern

### Stop & Abort
- Stop button lives in the fixed progress header bar — always visible during execution, styled as a red/destructive action
- No confirmation required — click Stop, it stops immediately
- After stopping: output and progress bar freeze at last state, "Restart Phase" button appears (no resume, restart from scratch only)
- Agent errors (not user-stopped): red error banner in progress header ("Phase failed: [reason]"), full output preserved for debugging, Restart button available

### Claude's Discretion
- Session continuation implementation approach (SDK warm pool, persistent sessions, etc.)
- WebSocket channel design for streaming fan-out (extend existing /ws or new endpoint)
- Output buffer size limits and virtualization strategy
- ANSI color parsing library choice
- Exact spacing, typography, and animation details for the execution panel
- How to parse plan/task progress from agent output stream

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SessionRegistry` (backend/src/services/sessionRegistry.ts): In-memory Map tracking sessions with `idle | running | done | error | cancelled` status. Needs extension for process handles and streaming, but the CRUD interface is ready.
- `setupWebSocket` + `broadcast` (backend/src/routes/ws.ts): WebSocket infrastructure with client Set and broadcast pattern. Currently flat (no channels/topics) — will need extension for session-scoped streaming.
- `useWebSocket` (frontend/src/hooks/useWebSocket.ts): Client-side WebSocket with reconnect logic, exponential backoff, and TanStack Query invalidation. Pattern can be extended for streaming events.
- `BackToOverviewButton` (frontend/src/App.tsx): Existing "Back to Overview" UI pattern — reuse for execution panel navigation.
- `Sonner` toasts: Already integrated for notifications (file changes). Reuse for plan completion/failure notifications.
- `appStore` (frontend/src/stores/appStore.ts): Zustand + persist store. Will need extension for execution state (running session, current progress).

### Established Patterns
- Hono routes with JSON error responses (`ApiError` type) — follow for new execution endpoints
- TanStack Query for data fetching + WebSocket for live updates — same pattern for execution state
- shadcn/ui components — use for new UI elements (buttons, badges, scroll areas)
- CSS custom properties (`var(--color-*)`) for theming — follow for execution panel styling
- Zustand with `persist` middleware for client state — follow for execution panel state

### Integration Points
- Phase row in `ProjectOverview` component — add Execute button here
- App.tsx main content routing — add execution panel as a new view state (alongside overview and document view)
- Backend server index.ts — mount new execution routes
- WebSocket broadcast — extend for streaming events alongside file-watcher events

</code_context>

<specifics>
## Specific Ideas

- Progress bar should feel like a build pipeline visualization — segmented, colored by status, clear at a glance
- The streaming output panel should feel like watching a CI job run — live, scrolling, with that "something is happening" energy
- Terminal-distinct background gives it an embedded-terminal feel without the complexity of xterm.js

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-agent-sdk-streaming*
*Context gathered: 2026-03-01*
