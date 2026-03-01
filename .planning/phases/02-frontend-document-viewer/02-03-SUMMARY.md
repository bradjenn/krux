---
phase: 02-frontend-document-viewer
plan: 03
subsystem: ui
tags: [websocket, chokidar, hono, tanstack-query, react, live-updates, file-watcher]

# Dependency graph
requires:
  - phase: 02-01
    provides: queryClient singleton, Zustand appStore (activeProjectId, selectedFile)
  - phase: 02-02
    provides: DocumentPage, FileTree, DocViewer components, useDocument/useFileTree hooks
provides:
  - WebSocket server at ws://localhost:3001/ws using @hono/node-ws
  - Chokidar file watcher watching .planning/ dirs for all registered projects
  - useWebSocket hook: auto-connect + exponential backoff reconnection + cache invalidation
  - useRecentChange hook: track recently modified files for highlight glow
  - Toast notifications (sonner) for new files
  - Highlight glow effect on changed/created files in FileTree
  - Scroll position preservation on WS-triggered document updates
  - "New content above" indicator when content grows above viewport
  - "Disconnected" banner in App when WS is offline
affects: [03-chat-interface, 04-sdk-integration]

# Tech tracking
tech-stack:
  added: [@hono/node-ws, chokidar, ws, @types/ws]
  patterns:
    - WebSocket before CORS middleware registration (avoids hono header-immutability crash)
    - Broadcast callback pattern: watcher.ts receives broadcast fn, calls it on events
    - TanStack Query cache invalidation as sole UI update mechanism (no manual state sync)
    - Module-level recentChanges Map for cross-component highlight state

key-files:
  created:
    - backend/src/lib/watcher.ts
    - backend/src/routes/ws.ts
    - frontend/src/hooks/useWebSocket.ts
  modified:
    - backend/src/index.ts
    - backend/src/lib/processLifecycle.ts
    - frontend/src/App.tsx
    - frontend/src/components/viewer/FileTree.tsx
    - frontend/src/components/viewer/DocumentPage.tsx

key-decisions:
  - "Register /ws route BEFORE app.use('*', logger()) and CORS middleware to avoid hono header-immutability crash on WebSocket upgrade"
  - "injectWebSocket(server) called immediately after serve() returns (outside callback) -- required by @hono/node-ws"
  - "createWatcher called inside serve() callback (after server is confirmed listening) to avoid race conditions"
  - "setupSigtermHandler extended with optional onShutdown callback to support closeWatcher() in graceful shutdown"
  - "Single WebSocket connection at App root -- useWebSocket called once in App(), not per-component"
  - "Module-level recentChanges Map (not React state) for highlight tracking -- avoids prop drilling and re-render overhead"
  - "refetchType: 'active' on invalidateQueries ensures immediate refetch for currently-visible queries only"

patterns-established:
  - "WS route registration ordering: /ws MUST come before any middleware that touches headers (logger, cors)"
  - "Cache-driven updates: WS events invalidate TanStack Query cache, React Query re-fetches automatically -- no manual state sync"
  - "Exponential backoff reconnection: 1s -> 2s -> 4s -> 8s cap with unmounted guard to prevent memory leaks"

requirements-completed: [PROJ-05]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 2 Plan 03: WebSocket Live Updates Summary

**WebSocket server with chokidar file watcher, frontend hook with exponential backoff reconnection, and live UI effects: toast for new files, highlight glow for changes, scroll preservation on updates**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-01T11:07:28Z
- **Completed:** 2026-03-01T11:10:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Backend WebSocket endpoint at /ws with client set management and broadcast function
- Chokidar watches all registered projects' .planning/ directories for file changes
- Frontend useWebSocket hook with auto-connect, exponential backoff, and TanStack Query cache invalidation
- Full live update pipeline: file change on disk -> WS event -> cache invalidation -> React re-render

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend WebSocket server + chokidar file watcher** - `ec46c7c` (feat)
2. **Task 2: Frontend WebSocket client + live update effects** - `c55542e` (feat)

**Plan metadata:** _(to be committed with SUMMARY.md)_

## Files Created/Modified
- `backend/src/lib/watcher.ts` - Chokidar watcher service: watches .planning/ dirs, broadcasts WsEvent via callback; supports addWatchPath/removeWatchPath for dynamic project management
- `backend/src/routes/ws.ts` - WebSocket route at /ws using @hono/node-ws; client Set management; broadcast() function for sending events to all connected clients
- `backend/src/index.ts` - Updated: /ws route registered BEFORE CORS/logger middleware; createWatcher called inside serve() callback; injectWebSocket called after serve()
- `backend/src/lib/processLifecycle.ts` - Updated: setupSigtermHandler accepts optional onShutdown async callback for watcher cleanup
- `frontend/src/hooks/useWebSocket.ts` - WebSocket client hook: auto-connect, exponential backoff (1s/2s/4s/8s), TanStack Query cache invalidation, toast notifications, useRecentChange hook for highlight glow
- `frontend/src/App.tsx` - Calls useWebSocket() at app root; shows "Disconnected" banner when WS offline
- `frontend/src/components/viewer/FileTree.tsx` - TreeItem uses useRecentChange for accent color glow (2s fade) on changed/created files
- `frontend/src/components/viewer/DocumentPage.tsx` - Scroll position preserved on content update via requestAnimationFrame; "New content above" clickable indicator

## Decisions Made
- Register /ws BEFORE middleware: avoids hono issue #4090 (header-immutability crash on WebSocket upgrade when CORS middleware runs first)
- Single WS connection at App root: one useWebSocket() call in App(), not per-component, to avoid multiple connections
- Cache-driven UI updates: WS events only invalidate TanStack Query cache; actual data re-fetching handled by React Query observers - no manual state synchronization needed
- Module-level recentChanges Map: avoids prop drilling through FileTree/TreeItem hierarchy; cleans up after 2s automatically
- setupSigtermHandler extended with optional callback: backward-compatible addition allowing watcher cleanup on graceful shutdown

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useRef initial value TypeScript error**
- **Found during:** Task 2 (Frontend WebSocket client)
- **Issue:** `useRef<string | undefined>()` caused TS2554 error ("Expected 1 arguments, but got 0") with strict TypeScript settings
- **Fix:** Changed to `useRef<string | undefined>(undefined)` with explicit initial value
- **Files modified:** frontend/src/components/viewer/DocumentPage.tsx
- **Verification:** `npm run build` passes cleanly
- **Committed in:** c55542e (part of Task 2 commit)

**2. [Rule 2 - Missing Critical] Added unmounted guard to WebSocket hook**
- **Found during:** Task 2 (Frontend WebSocket client)
- **Issue:** Plan's reconnect loop didn't guard against calling connect() after component unmounts, which would cause state updates on unmounted component and memory leaks
- **Fix:** Added `unmounted` ref, checked in onopen/onmessage/onclose; cleared reconnect timer in cleanup function
- **Files modified:** frontend/src/hooks/useWebSocket.ts
- **Verification:** Cleanup function in useEffect properly cancels reconnect timer and closes WS
- **Committed in:** c55542e (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- None beyond the TypeScript error documented above

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WebSocket infrastructure complete; ready for Phase 3 (chat interface)
- Any future real-time features can reuse the broadcast() function pattern
- Dynamic project watch path management (addWatchPath/removeWatchPath) ready for project add/remove integration in ProjectStore routes

---
*Phase: 02-frontend-document-viewer*
*Completed: 2026-03-01*
