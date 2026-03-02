---
phase: 04-plugin-system-app-shell
plan: 01
subsystem: ui
tags: [react, zustand, mitt, tauri, plugins, tabs]

# Dependency graph
requires: []
provides:
  - Simplified PluginDefinition type with isAvailable and autoOpen, no sidebarSection
  - Typed mitt event bus (AppEvents) with project:switched, file:changed, execution:started
  - Project-list-only sidebar (PluginSidebar component removed)
  - Tab dropdown with disabled state for unavailable plugins
  - Auto-open GSD tab on project select when .planning/ directory exists
  - appStore emits project:switched via appEvents on setActiveProject
affects: [04-02, 04-03, 05-gsd-plugin]

# Tech tracking
tech-stack:
  added: [mitt@3.0.1]
  patterns:
    - Plugin availability gating via async isAvailable(projectPath) check
    - Auto-open tab pattern in Shell.tsx useEffect iterating PLUGINS with autoOpen flag
    - Generic handleOpenPlugin() focusing existing tab or creating new one
    - Typed event bus pattern via mitt for decoupled lifecycle events

key-files:
  created:
    - src/plugins/events.ts
  modified:
    - src/plugins/types.ts
    - src/plugins/gsd/index.ts
    - src/components/layout/Sidebar.tsx
    - src/components/layout/TabBar.tsx
    - src/components/layout/Shell.tsx
    - src/stores/appStore.ts
    - package.json

key-decisions:
  - "Sidebar is now project-list-only: PluginSidebar component removed, PLUGINS import removed"
  - "GSD Init terminal action preserved in dropdown when GSD is unavailable (no .planning/)"
  - "Auto-open runs via useEffect in Shell.tsx (not in appStore.setActiveProject) to keep store pure"
  - "pluginAvailability state in TabBar re-checks on activeProject change for responsive UI"

patterns-established:
  - "Plugin availability: async isAvailable(path) -> boolean, checked per project on selection"
  - "Tab deduplication: always check for existing tab by type+projectId before addTab"
  - "Event bus: import appEvents from @/plugins/events, emit after state update in store"

requirements-completed: [PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-06]

# Metrics
duration: 15min
completed: 2026-03-02
---

# Phase 4 Plan 01: Plugin API Cleanup + Event Bus + Auto-open Summary

**Simplified PluginDefinition to tab-provider-only model with mitt event bus, disabled dropdown state for unavailable plugins, and auto-open GSD tab on project select when .planning/ exists**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-02T08:29:00Z
- **Completed:** 2026-03-02T08:44:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Removed sidebarSection from PluginDefinition — plugins are now tab providers only
- Created typed mitt event bus (AppEvents) with onAppEvent() subscription helper
- Sidebar is now project-list-only: PluginSidebar component deleted, PLUGINS import removed
- GSD plugin now has isAvailable (checks .planning/ via Tauri path_exists) and autoOpen: true
- Tab dropdown shows disabled state with tooltip for unavailable plugins
- Shell auto-opens GSD tab alongside Terminal when project has .planning/
- appStore.setActiveProject emits project:switched for plugin lifecycle subscribers

## Task Commits

Each task was committed atomically:

1. **Task 1: Update PluginDefinition type, create event bus, clean up sidebar and plugin registration** - `c64baba` (feat)
2. **Task 2: Add tab dropdown disabled state and auto-open GSD tab on project select** - `0aabf2f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/plugins/types.ts` - Removed sidebarSection, added isAvailable and autoOpen to PluginDefinition
- `src/plugins/events.ts` - New: mitt event bus with AppEvents type and onAppEvent helper
- `src/plugins/gsd/index.ts` - Removed GsdSidebar import/sidebarSection, added autoOpen:true and isAvailable via path_exists
- `src/components/layout/Sidebar.tsx` - Removed PluginSidebar component and PLUGINS import entirely
- `src/components/layout/TabBar.tsx` - Added pluginAvailability state, disabled plugin buttons, generic handleOpenPlugin(), GSD Init when unavailable
- `src/components/layout/Shell.tsx` - Added auto-open useEffect iterating PLUGINS with autoOpen flag
- `src/stores/appStore.ts` - Added appEvents.emit('project:switched') in setActiveProject
- `package.json` + `package-lock.json` - Added mitt@3.0.1

## Decisions Made
- Sidebar plugin zone removed entirely rather than kept as empty placeholder — cleaner
- GSD Init terminal action (runs `claude "/gsd:new-project"`) preserved in dropdown when GSD is unavailable, so users can initialize GSD for a project without an existing .planning/
- Auto-open logic lives in Shell.tsx useEffect (not in appStore) to keep store free of side effects
- pluginAvailability state checked on activeProject change in TabBar for responsive dropdown state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plugin API is clean: PluginDefinition is a tab provider only, no sidebar zone
- Event bus ready for plugins to subscribe to lifecycle events
- Auto-open behavior working: GSD tab appears alongside Terminal when .planning/ exists
- GsdSidebar.tsx is now dead code (not imported anywhere) — can be deleted in cleanup
- Ready for Phase 4 Plan 02 (GSD plugin internal navigation refinement)

## Self-Check: PASSED

All files verified present. Both task commits (c64baba, 0aabf2f) confirmed in git log.

---
*Phase: 04-plugin-system-app-shell*
*Completed: 2026-03-02*
