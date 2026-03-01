---
phase: 03-agent-sdk-streaming
plan: 01
subsystem: api
tags: [claude-agent-sdk, websocket, hono, typescript, session-management, streaming]

# Dependency graph
requires:
  - phase: 02-frontend-document-viewer
    provides: WebSocket broadcast infrastructure (broadcast fn, WsEvent type, ws.ts route)
  - phase: 01-backend-foundation
    provides: SessionRegistry, ProjectStore, Hono app structure, route mounting pattern
provides:
  - startAgentExecution() fire-and-forget SDK wrapper with WS broadcasting
  - POST /api/execution/:phaseId endpoint to start agent execution
  - DELETE /api/execution/:sessionId endpoint to abort running agent
  - GET /api/execution/:sessionId endpoint for status polling
  - ExecutionProgress and ExecutionWsEvent types in shared types
  - AbortController storage in SessionRegistry for stop functionality
  - sdkSessionId capture from system:init for warm resume
affects: [03-02-frontend-execution-ui, 04-chat-interface]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk@0.2.63"]
  patterns:
    - Fire-and-forget IIFE for SDK query that runs for minutes without blocking HTTP handler
    - Discriminated union WsEvent (FileWsEvent | ExecutionWsEvent) for type-safe broadcasting
    - Parallel AbortController Map alongside SessionRecord Map for runtime-only state

key-files:
  created:
    - backend/src/services/agentRunner.ts
    - backend/src/routes/execution.ts
  modified:
    - shared/types/index.ts
    - backend/src/lib/watcher.ts
    - backend/src/services/sessionRegistry.ts
    - backend/src/index.ts
    - backend/package.json

key-decisions:
  - "permissionMode: bypassPermissions requires allowDangerouslySkipPermissions: true -- added after reading SDK types"
  - "FileWsEvent | ExecutionWsEvent union: resolveEvent() uses FileWsEvent type to avoid type widening"
  - "Content block cast to Array<{type:string;text?:string}> for strict mode compatibility -- BetaMessage content type not re-exported"
  - "SDKResultError uses errors[] array (not message.error string) -- discovered from SDK type declarations"

patterns-established:
  - "Fire-and-forget IIFE: void (async () => { ... })()" for SDK query execution
  - "Runtime-only state parallel Map pattern: abortControllers alongside registry for non-serializable references"
  - "WsEvent union extension: add new event type to ExecutionWsEvent, watcher.ts union auto-updates"

requirements-completed: [EXEC-01, EXEC-02, EXEC-03]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 03 Plan 01: Backend Agent SDK Integration Summary

**Fire-and-forget Claude Agent SDK wrapper with POST/DELETE execution routes, WS event broadcasting, and AbortController-based stop -- using @anthropic-ai/claude-agent-sdk@0.2.63**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T14:11:53Z
- **Completed:** 2026-03-01T14:15:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended SessionRecord with phaseId, sdkSessionId, and error fields for execution lifecycle
- Extended WsEvent to FileWsEvent | ExecutionWsEvent discriminated union for type-safe broadcasting
- Added AbortController parallel Map to SessionRegistry for runtime-only stop control
- Created agentRunner.ts service that fires SDK query in background, streams all output as WS events
- Captures sdkSessionId from system:init message for warm session resume
- Created execution routes: POST (start), DELETE (stop via abort), GET (status polling)
- Mounted at /api/execution in index.ts following existing route pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend shared types and session registry for execution** - `c7fe32c` (feat)
2. **Task 2: Create agent runner service and execution routes** - `0220e4a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `shared/types/index.ts` - Added phaseId/sdkSessionId/error to SessionRecord; new ExecutionProgress and ExecutionWsEvent types
- `backend/src/lib/watcher.ts` - Split WsEvent into FileWsEvent | ExecutionWsEvent union
- `backend/src/services/sessionRegistry.ts` - Added AbortController storage methods, phaseId param to create()
- `backend/src/services/agentRunner.ts` - NEW: fire-and-forget SDK wrapper with WS broadcasting and progress parsing
- `backend/src/routes/execution.ts` - NEW: POST/:phaseId, DELETE/:sessionId, GET/:sessionId endpoints
- `backend/src/index.ts` - Added executionRoute import and /api/execution mount
- `backend/package.json` - Added @anthropic-ai/claude-agent-sdk dependency

## Decisions Made
- `permissionMode: 'bypassPermissions'` requires `allowDangerouslySkipPermissions: true` per SDK types -- added after reading actual type declarations (plan didn't include this required field)
- Used `FileWsEvent['type']` instead of `WsEvent['type']` in `resolveEvent()` to avoid type widening issues after union extension
- Cast BetaMessage content to `Array<{type:string;text?:string}>` because BetaMessage content types are not re-exported from the claude-agent-sdk package and strict mode requires explicit types
- SDKResultError uses `errors: string[]` array (not `message.error` string) -- discovered from SDK type declarations, plan's pseudo-code used wrong field name

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added required allowDangerouslySkipPermissions flag**
- **Found during:** Task 2 (agentRunner.ts creation)
- **Issue:** Plan specified `permissionMode: 'bypassPermissions'` but SDK requires `allowDangerouslySkipPermissions: true` alongside it (TypeScript would have caught this at compile time)
- **Fix:** Added `allowDangerouslySkipPermissions: true` to the options object
- **Files modified:** backend/src/services/agentRunner.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 0220e4a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed SDKResultError error field access**
- **Found during:** Task 2 (agentRunner.ts result handling)
- **Issue:** Plan used `message.error` but SDKResultError type has `errors: string[]` array
- **Fix:** Changed to `'errors' in message ? message.errors.join('\n') : message.subtype` pattern
- **Files modified:** backend/src/services/agentRunner.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 0220e4a (Task 2 commit)

**3. [Rule 1 - Bug] Fixed watcher.ts resolveEvent type signature**
- **Found during:** Task 1 (WsEvent union extension)
- **Issue:** resolveEvent() used `WsEvent['type']` which would now be a union of all event type strings, incompatible with FileWsEvent return
- **Fix:** Changed parameter type to `FileWsEvent['type']` and return type to `FileWsEvent | null`
- **Files modified:** backend/src/lib/watcher.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** c7fe32c (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bugs from plan pseudo-code vs actual SDK types)
**Impact on plan:** All auto-fixes required for TypeScript strict mode correctness. No scope creep.

## Issues Encountered
- SDK import path for shared types in watcher.ts needed path correction (`../../../shared/` not `../../shared/`) -- discovered on first tsc run, fixed immediately

## User Setup Required
None - no external service configuration required. ANTHROPIC_API_KEY is expected in environment when agent runner executes, but is standard SDK requirement, not new setup.

## Next Phase Readiness
- Backend infrastructure complete: POST/DELETE endpoints working, WS broadcasting ready
- Phase 03-02 can build the frontend execution UI against these endpoints
- sdkSessionId stored in session for warm resume -- frontend just needs to pass it in `resumeSessionId` on next execution
- Progress parsing regex needs validation against real GSD agent output -- may need adjustment in 03-02

---
*Phase: 03-agent-sdk-streaming*
*Completed: 2026-03-01*
