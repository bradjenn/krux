# Phase 4: Plugin System + App Shell - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the app so GSD features register through a plugin system. The app shell owns project management and layout; everything else is plugin-contributed. Every subsequent feature (chat, slash commands, dashboard) registers through this system. No new user-facing capabilities — the app should look and behave the same after the refactor, but with a plugin boundary in place.

</domain>

<decisions>
## Implementation Decisions

### Sidebar composition
- Two-zone sidebar: top zone is project list (app-owned), bottom zone is plugin-contributed content
- Clear visual separator between zones
- When a project is selected, project list zone collapses to a compact strip (project icon/initial + small switcher) to maximize space for the plugin zone
- Plugin zone only appears when a project is active; hidden/empty when no project selected
- GSD plugin contributes: navigation links above the .planning/ file tree — the file tree moves from DocViewer into the sidebar plugin zone
- Nav links include: Overview, Documents, Execute (Dashboard added in Phase 7)

### View navigation model
- State-driven navigation via Zustand — no URL router, no browser back/forward for views
- Instant swap between views (no transition animations)
- Switching projects resets to the plugin's default view (overview for GSD)
- Plugin declares its own default view — the shell activates the first plugin's default when a project is selected
- ProjectOverview moves into the GSD plugin as its default view (not shell-owned)

### Shell identity & layout
- Minimal shell: owns header bar, two-zone sidebar frame, main content area, dialogs (add project, settings), command palette, toast system
- Everything else moves to GSD plugin: overview, doc viewer, execution panel, file tree
- Plugin-aware header: plugins can contribute contextual controls via a header slot (existing rightSlot pattern on Header component)
- Command palette stays shell-owned — plugin contributions deferred (PLUG-08)
- No special handling for "no plugin views" edge case — GSD is the only plugin for now

### Plugin API
- Plugins declare views as an array with metadata: id, component, label, icon, default flag
- Each view gets a nav item in the sidebar plugin zone
- Plugin folder per feature: `plugins/gsd/` (index.ts, views/, etc.), future `plugins/chat/` for Phase 5
- Clean, typed, minimal — no specific reference pattern (not VS Code, not Grafana)
- Build only what PLUG-01 through PLUG-06 require, nothing more

### Claude's Discretion
- Plugin definition shape: static object vs factory function that receives app context
- Event system design: how plugins subscribe to lifecycle events, namespace dispatching for WebSocket
- useSlot() hook implementation and slot naming conventions
- How the view registry Map is structured internally
- File tree component refactoring approach (currently lives in DocViewer)
- Exact visual design of the collapsed project list strip

</decisions>

<specifics>
## Specific Ideas

- "The file tree moves into the sidebar plugin zone with nav links above it" — sidebar becomes primary navigation AND document browsing
- Project list should collapse to icons/compact strip, not disappear — switching projects stays one click away
- Plugin-aware header reuses the existing rightSlot pattern already on Header component
- No over-engineering: GSD is the only plugin for v2.0, don't design for hypothetical multi-plugin scenarios

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Header` component: already has a `rightSlot` prop — natural plugin header slot
- `FileTree` component (`viewer/FileTree.tsx`): needs to move from DocViewer's main area into sidebar plugin zone
- `ScrollArea` component: used in current Sidebar, reusable for plugin zone
- `CommandPalette`: stays shell-owned, no changes needed
- shadcn/ui primitives: button, input, badge, dialog, separator all available

### Established Patterns
- Zustand with persist middleware for state management (`appStore.ts`, `executionStore.ts`)
- Custom CSS variables for theming (`--color-*`, `--font-mono`, `--radius-*`)
- TanStack Query for server state (useProjects, useDocument, useFileTree hooks)
- WebSocket via `useWebSocket` hook with broadcast pattern on backend

### Integration Points
- `App.tsx` if/else routing: must be replaced by plugin view registry
- `Sidebar.tsx`: must be restructured into two zones (app-owned project list + plugin zone)
- `ws.ts` broadcast: must support namespace dispatching for PLUG-06 events
- `watcher.ts` WsEvent union: must be extensible for new event namespaces without touching existing handlers
- `appStore.ts`: needs `currentView` state to replace the implicit if/else view logic
- Backend `index.ts` route mounting: no changes needed (backend stays as-is, plugin system is frontend-only)

</code_context>

<deferred>
## Deferred Ideas

- Plugin command palette contributions (PLUG-08) — future requirement, not in v2.0 scope
- Dynamic plugin loading at runtime (PLUG-09) — future requirement
- Plugin settings UI — out of scope per REQUIREMENTS.md
- Plugin sandboxing — out of scope, plugins are trusted local code

</deferred>

---

*Phase: 04-plugin-system-app-shell*
*Context gathered: 2026-03-01*
