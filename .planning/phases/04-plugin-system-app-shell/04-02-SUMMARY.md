---
phase: 04-plugin-system-app-shell
plan: 02
subsystem: ui
tags: [react, mitt, tauri, plugins, gsd, event-bus]

# Dependency graph
requires:
  - phase: 04-01
    provides: Typed mitt event bus (AppEvents) with onAppEvent helper, simplified PluginDefinition
provides:
  - GsdTab subscribes to execution:started event bus, auto-switches to Execute view on agent spawn
  - OverviewTab phase cards with inline Execute quick-action buttons navigating to execution view
  - ExecutionTab emits execution:started after agent spawn success
  - GsdSidebar.tsx deleted (dead code eliminated)
  - autoOpen removed from PluginDefinition — plugins open on demand via + dropdown only
affects: [05-gsd-plugin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event bus subscription cleanup pattern: useEffect returns onAppEvent unsubscribe function
    - Callback prop threading: GsdTab passes setActiveView as onNavigate to OverviewTab -> PhaseCard
    - Event emit on action: appEvents.emit at point of side effect (agent spawn), not at intent

key-files:
  created: []
  modified:
    - src/plugins/gsd/GsdTab.tsx
    - src/plugins/gsd/OverviewTab.tsx
    - src/plugins/gsd/ExecutionTab.tsx
    - src/components/layout/Shell.tsx
    - src/plugins/types.ts
    - src/plugins/gsd/index.ts
  deleted:
    - src/plugins/gsd/GsdSidebar.tsx

key-decisions:
  - "GsdView type duplicated in OverviewTab (not imported from GsdTab) to keep OverviewTab self-contained"
  - "Execute button only shown on non-complete phases — complete phases do not need an execute action"
  - "appEvents.emit placed after cmd.spawn() succeeds (not at startExecution entry) — only emits when agent actually starts"
  - "autoOpen removed from PluginDefinition per user feedback — plugins open on demand via + dropdown only"

patterns-established:
  - "Event bus cleanup: return onAppEvent(...) directly from useEffect — the helper returns the unsubscribe fn"
  - "Prop threading for navigation: parent passes setActiveView as onNavigate, child calls it on action"

requirements-completed: [PLUG-04, PLUG-05, PLUG-06]

# Metrics
duration: 30min
completed: 2026-03-02
---

# Phase 4 Plan 02: GSD Plugin Event Bus + Quick Actions + Dead Code Cleanup Summary

**GSD tab auto-switches to Execute view via mitt event bus, phase cards get inline Execute buttons, GsdSidebar deleted, and auto-open behavior removed per user feedback**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-02T08:46:49Z
- **Completed:** 2026-03-02T09:15:50Z
- **Tasks:** 2 (1 auto + 1 checkpoint approved) + 1 post-checkpoint fix
- **Files modified:** 6 modified, 1 deleted

## Accomplishments
- GsdTab.tsx subscribes to `execution:started` via `onAppEvent`, auto-switches internal nav to Execute view
- OverviewTab.tsx accepts `onNavigate` prop, PhaseCard renders an Execute button on non-complete phases
- ExecutionTab.tsx emits `appEvents.emit('execution:started')` after agent spawns successfully
- GsdSidebar.tsx deleted — zero dead code remains in the GSD plugin directory
- TypeScript compiles clean with zero errors
- `autoOpen` field removed from PluginDefinition type and Shell.tsx per user feedback after checkpoint verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire event bus for auto-switch to Execute view, add Overview quick-action, delete GsdSidebar** - `0475124` (feat)
2. **Post-checkpoint: Remove auto-open plugin tab on project select** - `2fd3e4c` (fix)

**Plan metadata:** `d6741e5` (docs: checkpoint pending human-verify)

## Files Created/Modified
- `src/plugins/gsd/GsdTab.tsx` - Added `onAppEvent('execution:started')` subscription in useEffect; passes `onNavigate={setActiveView}` to OverviewTab
- `src/plugins/gsd/OverviewTab.tsx` - Added `GsdView` type, `onNavigate?` to PhaseCard and OverviewTabProps; renders Execute button on non-complete phases; imports `Play` from lucide-react
- `src/plugins/gsd/ExecutionTab.tsx` - Added `appEvents` import; emits `execution:started` with sessionId and phaseId after agent spawn succeeds
- `src/plugins/gsd/GsdSidebar.tsx` - Deleted (dead code — not imported anywhere since Plan 01 removed sidebarSection)
- `src/components/layout/Shell.tsx` - Removed auto-open useEffect that iterated PLUGINS for autoOpen flag
- `src/plugins/types.ts` - Removed `autoOpen?: boolean` from PluginDefinition interface
- `src/plugins/gsd/index.ts` - Removed `autoOpen: true` from GSD plugin registration

## Decisions Made
- `GsdView` type is defined inline in `OverviewTab.tsx` rather than imported from `GsdTab.tsx` to keep OverviewTab self-contained (avoids circular dep risk and makes the component portable)
- Execute button only appears on `disk_status !== 'complete'` phases — complete phases need no execute action
- `appEvents.emit('execution:started')` fires after `cmd.spawn()` resolves, ensuring the event only fires when the agent process actually starts (not merely when the user clicks Execute)
- `autoOpen` removed from PluginDefinition entirely per user feedback — plugins should not automatically open on project selection; users open tabs explicitly via the + dropdown

## Deviations from Plan

### Post-Checkpoint User Feedback Fix

**[User-requested] Removed auto-open plugin tab behavior**
- **Found during:** Checkpoint human-verify approval
- **Issue:** User determined that auto-opening GSD tab on project select was undesirable UX — unexpected tab spawning on project switch
- **Fix:** Removed `autoOpen?: boolean` from PluginDefinition type, removed the useEffect in Shell.tsx iterating PLUGINS for autoOpen, removed `autoOpen: true` from GSD plugin registration
- **Files modified:** src/plugins/types.ts, src/components/layout/Shell.tsx, src/plugins/gsd/index.ts
- **Verification:** TypeScript compiles clean; no auto-open behavior on project switch
- **Committed in:** `2fd3e4c` (fix)

---

**Total deviations:** 1 user-requested post-checkpoint change
**Impact on plan:** Plan 01 introduced autoOpen; this plan removes it per user preference. Cleanup is net-positive — simpler PluginDefinition type, less Shell.tsx logic.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GSD plugin internal navigation is fully wired with event bus auto-switching
- Phase 4 Plan 02 complete — checkpoint approved, post-checkpoint fix committed
- Shell.tsx and Sidebar.tsx confirmed GSD-component-import-free
- PluginDefinition is lean: id, name, icon, tabTypes, defaultTabType, isAvailable (no autoOpen, no sidebarSection)
- Ready for Phase 5 (GSD plugin deeper features) or next Phase 4 plan

## Self-Check: PASSED

- `src/plugins/gsd/GsdSidebar.tsx` MISSING (expected — deleted in 0475124)
- `src/plugins/gsd/GsdTab.tsx` FOUND with `onAppEvent` subscription (0475124)
- `src/plugins/gsd/OverviewTab.tsx` FOUND with `onNavigate` prop and Execute buttons (0475124)
- `src/plugins/gsd/ExecutionTab.tsx` FOUND with `appEvents.emit` (0475124)
- `src/components/layout/Shell.tsx` FOUND without auto-open logic (2fd3e4c)
- Task 1 commit `0475124` confirmed in git log
- Post-checkpoint fix `2fd3e4c` confirmed in git log
- TypeScript: zero errors

---
*Phase: 04-plugin-system-app-shell*
*Completed: 2026-03-02*
