---
phase: 01-backend-foundation
plan: 02
subsystem: api
tags: [hono, typescript, node, process-lifecycle, session-registry, sigterm, pid-file]

# Dependency graph
requires:
  - phase: 01-01
    provides: Hono server entry, ProjectStore, shared SessionRecord type, data/ directory
provides:
  - SessionRegistry singleton with in-memory CRUD for session records
  - processLifecycle module with orphan cleanup on startup and SIGTERM/SIGINT graceful shutdown
  - REST endpoints GET/POST/GET:id/DELETE:id at /api/sessions
  - Server startup sequence: cleanupOrphans → app setup → serve → setupSigtermHandler
affects:
  - 03-websocket (WebSocket server extends this Hono app with lifecycle already wired)
  - 04-agent-sdk (Phase 3 Agent SDK will populate SessionRegistry with live sessions)
  - 02-frontend-shell (session endpoints available for frontend consumption)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level singleton for in-memory registry backed by Map<string, T>
    - PID file tracking (.gsd-pids) for orphan process cleanup on startup
    - SIGTERM/SIGINT graceful shutdown with 5s escalation from SIGTERM to SIGKILL
    - serve() return value captured as server reference for setupSigtermHandler
    - Signal handlers registered inside serve() callback (after confirmed listening)

key-files:
  created:
    - backend/src/services/sessionRegistry.ts
    - backend/src/lib/processLifecycle.ts
    - backend/src/routes/sessions.ts
  modified:
    - backend/src/index.ts

key-decisions:
  - "setupSigtermHandler registered inside serve() callback to avoid 'Server is not running' errors — signal handlers must not be registered before the server is listening"
  - "serve() return value used as server reference for graceful shutdown (not the AddressInfo callback param)"
  - "cleanupOrphans deletes PID file unconditionally after sweep (even with 0 pids) — safe because writePids is only called when tracking live agent processes"

patterns-established:
  - "Map-backed singleton registry: module-level Map + exported object with CRUD methods"
  - "PID file location: backend/data/.gsd-pids relative to import.meta.url of processLifecycle.ts"
  - "Lifecycle sequence: cleanupOrphans() top-level await → app config → serve() → setupSigtermHandler(server) in callback"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 1 Plan 2: Session Registry and Process Lifecycle Summary

**SessionRegistry (in-memory CRUD) + processLifecycle (orphan cleanup + SIGTERM/SIGINT graceful shutdown) + /api/sessions REST endpoints wired into the Hono server**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T09:22:14Z
- **Completed:** 2026-03-01T09:24:34Z
- **Tasks:** 2 (Task 1: session registry + process lifecycle; Task 2: session routes + server wiring)
- **Files modified:** 3 created, 1 modified

## Accomplishments
- SessionRegistry module-level singleton with create/get/update/delete/list/listByProject/clear backed by Map<string, SessionRecord>
- processLifecycle module: readPids/writePids for .gsd-pids file, cleanupOrphans kills orphaned processes and deletes PID file on startup, setupSigtermHandler registers SIGTERM/SIGINT with 5s escalation to SIGKILL
- Session REST API at /api/sessions with GET (list + ?projectId= filter), POST (validates project exists), GET /:id, DELETE /:id — all with proper error envelopes
- index.ts updated: await cleanupOrphans() before app setup, sessionsRoute mounted, setupSigtermHandler wired inside serve() callback
- 28 existing vitest tests still passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Session registry and process lifecycle module** - `5ea9814` (feat)
2. **Task 2: Session routes and lifecycle wiring** - `3bfc467` (feat)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified
- `backend/src/services/sessionRegistry.ts` - In-memory session CRUD singleton backed by Map
- `backend/src/lib/processLifecycle.ts` - PID file read/write, orphan cleanup on startup, SIGTERM/SIGINT graceful shutdown
- `backend/src/routes/sessions.ts` - Hono sub-app: GET/POST/GET:id/DELETE:id with error envelopes and ProjectStore validation
- `backend/src/index.ts` - Wired cleanupOrphans, sessionsRoute, and setupSigtermHandler

## Decisions Made
- **Signal handler registration timing**: `setupSigtermHandler(server)` is called inside the `serve()` callback (after server confirmed listening), not before. This avoids "Server is not running" errors where `server.close()` fails because the server hasn't started yet.
- **Server reference via serve() return value**: `serve()` from `@hono/node-server` returns `ServerType` (the underlying `http.Server`). This reference is captured and passed to `setupSigtermHandler`, giving the shutdown handler a valid server object.
- **cleanupOrphans unconditional PID file deletion**: The PID file is deleted after every cleanup sweep regardless of how many PIDs were found. This is safe because `writePids` is only called when agent processes are tracked (Phase 3+). Deleting an already-absent file is caught with try/catch.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Port 3001 collision during manual verification (leftover from previous test). Resolved with `lsof -ti:3001 | xargs kill -9`. Not a code issue.

## User Setup Required
None - no external service configuration required. Run `cd backend && npm run dev` to start.

## Next Phase Readiness
- Session registry is ready for Phase 3 (Agent SDK) to populate with live agent sessions
- Graceful shutdown ensures Claude agent processes are killed on server stop (preventing orphans accumulating)
- /api/sessions endpoints available for Phase 2 frontend to display session status
- All 28 vitest tests passing — no regressions from this plan's changes

---
*Phase: 01-backend-foundation*
*Completed: 2026-03-01*

## Self-Check: PASSED

- All 4 key files exist on disk (3 created, 1 modified)
- Both task commits verified in git log (5ea9814, 3bfc467)
- TypeScript compiles cleanly (npx tsc --noEmit)
- 28/28 vitest tests passing
