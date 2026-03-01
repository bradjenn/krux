---
phase: 01-backend-foundation
plan: 01
subsystem: api
tags: [hono, typescript, node, rest-api, json-persistence]

# Dependency graph
requires: []
provides:
  - Hono REST server on port 3001 with project CRUD and .planning/ file parsing
  - ProjectStore with atomic JSON persistence and .planning/ validation
  - PlanningParser with ROADMAP.md phase extraction and STATE.md field parsing
  - Typed REST API: GET/POST/DELETE /api/projects, /phases, /state, /overview, /docs/*
  - Shared TypeScript types (Project, Phase, ProjectState, ProjectOverview, ApiError, SessionRecord)
affects:
  - 01-02 (process lifecycle / orphan cleanup builds on this server entry point)
  - 02-frontend-shell (frontend builds REST client against these endpoints)
  - 03-websocket (WebSocket server extends this Hono app)

# Tech tracking
tech-stack:
  added: [hono@4.12, "@hono/node-server@1.0", tsx@4, typescript@5, vitest@4]
  patterns:
    - Module-level singleton for service objects (ProjectStore, PlanningParser)
    - Atomic write-then-rename pattern for JSON file persistence
    - Hono sub-app route composition (app.route('/api/projects', subrouter))
    - Result<T> discriminated union for service error handling
    - Dual-format field extraction (bold **Field:** and plain Field: patterns)

key-files:
  created:
    - shared/types/index.ts
    - backend/src/types/index.ts
    - backend/src/services/projectStore.ts
    - backend/src/services/planningParser.ts
    - backend/src/routes/projects.ts
    - backend/src/routes/docs.ts
    - backend/src/index.ts
    - backend/package.json
    - backend/tsconfig.json
    - backend/src/tests/planningParser.test.ts
    - backend/src/tests/routes.test.ts
  modified: []

key-decisions:
  - "docsRoute mounted before projectsRoute at /api/projects to ensure /:id/docs/* matched before /:id"
  - "tsconfig rootDir removed (noEmit:true makes it unnecessary) to allow shared/ types outside src/"
  - "parseState supports both bold (**Field:**) and plain (Field:) formats for STATE.md compatibility"
  - "vitest chosen as test framework for ESM-native compatibility with tsx/Node16 module resolution"
  - "NODE_ENV guard in index.ts prevents HTTP server startup during tests (app.fetch used directly)"

patterns-established:
  - "Error envelope: { error: { code, message } } with appropriate HTTP status codes"
  - "Singleton service objects: export const ServiceName = { method1, method2 }"
  - "Result<T> type: { ok: true; data: T } | { ok: false; code: string; message: string }"
  - "Atomic file writes: writeFileSync(tmp) then renameSync(tmp, real)"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

# Metrics
duration: 7min
completed: 2026-03-01
---

# Phase 1 Plan 1: Backend Foundation Summary

**Hono REST server on port 3001 with ProjectStore (atomic JSON persistence), PlanningParser (ROADMAP.md + STATE.md), and 7 REST endpoints — 28 vitest tests passing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-01T09:10:35Z
- **Completed:** 2026-03-01T09:17:00Z
- **Tasks:** 2 (Task 1: scaffold + types + store; Task 2: parser + routes + server — TDD)
- **Files modified:** 13 created, 0 modified

## Accomplishments
- Hono server scaffolded with CORS, logging, health check, and modular route composition
- ProjectStore with add/remove/list/get backed by atomic JSON persistence, .planning/ validation
- PlanningParser replicating gsd-tools.cjs parsing: phase extraction from ROADMAP.md, state from STATE.md
- 7 REST endpoints: GET/POST/DELETE /api/projects, phases/state/overview/docs/* with error envelopes
- 28 vitest tests (15 parser + 13 routes) all passing with TDD workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold, shared types, project store** - `0e7e58c` (feat)
2. **Task 2 RED: Failing tests for parser + routes** - `737bff1` (test)
3. **Task 2 GREEN: Implement parser, routes, server** - `eaefe6e` (feat)

_Note: Task 2 used TDD — test commit (RED) followed by implementation commit (GREEN)_

## Files Created/Modified
- `shared/types/index.ts` - Project, Phase, ProjectState, ProjectOverview, ApiError, SessionRecord
- `backend/src/types/index.ts` - Re-exports shared types + Result<T> backend type
- `backend/src/services/projectStore.ts` - CRUD with atomic JSON persistence
- `backend/src/services/planningParser.ts` - parseRoadmap, parseState, parseProjectMeta
- `backend/src/routes/projects.ts` - GET/POST/DELETE /api/projects + phases/state/overview
- `backend/src/routes/docs.ts` - GET /:id/docs/* with path traversal protection
- `backend/src/index.ts` - Hono app with middleware, route mounting, error handler
- `backend/package.json` - Hono, @hono/node-server, tsx, typescript, vitest
- `backend/tsconfig.json` - Node16 module resolution, strict mode, noEmit
- `backend/src/tests/planningParser.test.ts` - 15 tests for PlanningParser
- `backend/src/tests/routes.test.ts` - 13 tests for REST endpoints

## Decisions Made
- **docsRoute mounting order**: docsRoute mounted before projectsRoute at `/api/projects` so `/:id/docs/*` is matched before `/:id` general params. Hono matches routes in registration order.
- **tsconfig without rootDir**: Removed `rootDir` from tsconfig since `noEmit: true` makes it unnecessary, allowing the shared/ types directory outside src/ to be included without TS6059 errors.
- **Dual-format STATE.md parsing**: Added fallback from `**Field:**` to plain `Field:` format in parseState, since the actual STATE.md generated by gsd-tools uses plain text for Current Position fields.
- **vitest for testing**: ESM-native, works seamlessly with Node16 module resolution and tsx. No additional transform config needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tsconfig rootDir conflict with shared/ types**
- **Found during:** Task 1 (TypeScript compile verification)
- **Issue:** `rootDir: "./src"` rejected shared types in `../shared/` with TS6059 error
- **Fix:** Removed `rootDir` from tsconfig (unnecessary with `noEmit: true`)
- **Files modified:** `backend/tsconfig.json`
- **Verification:** `tsc --noEmit` passes cleanly
- **Committed in:** `0e7e58c` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed parseState to support plain-text STATE.md field format**
- **Found during:** Task 2 GREEN (test failure)
- **Issue:** Parser only handled `**Field:**` bold format, but actual STATE.md uses plain `Field:` in Current Position section
- **Fix:** Added fallback regex pattern `^FieldName:\s+(.+)` after bold pattern match fails
- **Files modified:** `backend/src/services/planningParser.ts`
- **Verification:** All 15 planningParser tests pass
- **Committed in:** `eaefe6e` (Task 2 GREEN commit)

**3. [Rule 1 - Bug] Fixed docs route mounting to prevent route shadowing**
- **Found during:** Task 2 GREEN (test failure — docs endpoint returning 404)
- **Issue:** docsRoute mounted at `/api` with path `/projects/:id/docs/*` was shadowed by projectsRoute mounted at `/api/projects`; Hono matched `/api/projects/:id/docs/...` against projectsRoute which had no docs handler
- **Fix:** Moved docsRoute to use `/:id/docs/*` path and mount at `/api/projects` before projectsRoute
- **Files modified:** `backend/src/routes/docs.ts`, `backend/src/index.ts`
- **Verification:** All 13 route tests pass including docs endpoint
- **Committed in:** `eaefe6e` (Task 2 GREEN commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs)
**Impact on plan:** All three fixes required for correctness. No scope creep — plan artifacts delivered exactly as specified.

## Issues Encountered
- Port 3001 collision during verification due to background process not terminating cleanly. Used `lsof -ti:3001 | xargs kill -9` to clear. Not a code issue.

## User Setup Required
None - no external service configuration required. Run `cd backend && npm run dev` to start.

## Next Phase Readiness
- Hono server is ready for Plan 01-02 to add process lifecycle management (orphan cleanup, SIGTERM handler, PID file)
- All REST endpoints documented and tested — Phase 2 frontend can build against them immediately
- Shared types in `shared/types/index.ts` ready to be consumed by the React frontend

---
*Phase: 01-backend-foundation*
*Completed: 2026-03-01*

## Self-Check: PASSED

- All 7 key files exist on disk
- All 3 task commits verified in git log
- 28/28 vitest tests passing
