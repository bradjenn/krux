---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Standalone App + Plugin Architecture
status: in_progress
stopped_at: "Completed 04-plugin-system-app-shell/04-01-PLAN.md"
last_updated: "2026-03-02T08:44:12Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 9
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** Users can manage development projects and run AI-powered workflows through a visual interface with a plugin architecture.
**Current focus:** Phase 4 — Plugin System + App Shell

## Current Position

Phase: 4 of 7 (Plugin System + App Shell) — v2.0 first phase
Plan: 01 complete (04-01-PLAN.md)
Status: In progress — Phase 4 Plan 01 complete
Last activity: 2026-03-02 — Plugin API cleanup, event bus, sidebar simplification, auto-open behavior

Progress (v2.0): [##░░░░░░░░] ~12%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Package name is `@anthropic-ai/claude-agent-sdk` (NOT deprecated `@anthropic-ai/claude-code`)
- TanStack Query for server state, Zustand for UI state — keep stores isolated per concern
- rAF buffer pattern for streaming output — reuse in chat (same as LogViewer)
- ARCH-01: Standalone app + plugin architecture — GSD is a plugin, not the host
- SSE (not WebSocket) for chat streaming — avoids session-routing complexity in broadcast bus
- Compile-time plugin registration — no dynamic loading, plugin array is a hardcoded TS import
- `streamdown@2.3.0` for streaming markdown in chat — `react-markdown` stays in DocViewer
- `dexie` + `dexie-react-hooks` for chat history — avoids localStorage 5MB quota failure
- Sidebar is project-list-only: PluginSidebar removed, PLUGINS import removed from Sidebar
- Auto-open logic lives in Shell.tsx useEffect (not appStore) to keep store side-effect free
- GSD Init terminal action preserved in dropdown when GSD unavailable (no .planning/)

### Pending Todos

- GsdSidebar.tsx is dead code (unreferenced) — can be deleted in cleanup phase

### Blockers/Concerns

- Phase 4 is highest-risk: strangler-fig refactor must not break the working execution pipeline
- WsEvent type duplication (shared/types/index.ts vs inline in useWebSocket.ts) must be fixed in Phase 4 before new namespaces are added
- `streamdown@2.3.0` + Tailwind v4 `@source` directive integration unverified in this project — validate early in Phase 5

## Session Continuity

**Last session:** 2026-03-02T08:44:12Z
**Stopped At:** Completed 04-plugin-system-app-shell/04-01-PLAN.md
**Resume file:** .planning/phases/04-plugin-system-app-shell/04-01-SUMMARY.md
