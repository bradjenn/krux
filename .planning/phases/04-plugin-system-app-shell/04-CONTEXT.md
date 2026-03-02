# Phase 4: Plugin System + App Shell - Context

**Gathered:** 2026-03-02 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Refine the existing plugin system and app shell. The tab-based architecture is already working — GSD registers as a plugin with tab types, the shell renders plugin tabs alongside terminal tabs. This phase cleans up the plugin API, removes the sidebar plugin zone, adds auto-open behavior, and polishes the GSD plugin's internal navigation. No new user-facing capabilities — the app should work the same but with a cleaner plugin boundary.

</domain>

<decisions>
## Implementation Decisions

### Sidebar composition
- Remove the plugin sidebar zone entirely — sidebar is project list only
- No GsdSidebar component needed — delete it
- Sidebar stays fixed at 340px, no resize
- Plugin access moves to the + tab dropdown and auto-open behavior

### Tab auto-open behavior
- When a project is selected and has `.planning/`, auto-open a GSD tab alongside the auto-created Terminal tab
- Use plugin `isAvailable?` check to determine if auto-open should happen
- Future plugins can opt into auto-open via a flag on PluginDefinition

### Tab dropdown (+ button)
- One entry per plugin in the dropdown — plugins handle sub-views internally
- Always show all registered plugins in dropdown
- If a plugin's `isAvailable` returns false, show it in a disabled state with tooltip (e.g., "No .planning/ found")
- Single GSD tab per project — opening GSD focuses existing tab if one exists

### Plugin API (PluginDefinition)
- Simplify to: id, name, icon, tabTypes[], isAvailable?, defaultTabType?, autoOpen?
- Remove `sidebarSection` from the type — no plugin sidebar zone
- Plugins are tab providers, nothing more
- Menu items stay hardcoded in Rust — no plugin menu contribution system
- `isAvailable` check runs on project select to gate the + dropdown and auto-open

### GSD internal navigation
- Keep the internal sidebar pattern within GsdTab (Overview / Documents / Execute nav)
- GSD manages its own sub-views — shell doesn't know about them
- File tree stays contained within the Documents view, not shared across views
- Auto-switch to Execute view when execution starts
- Overview includes inline quick-action buttons (e.g., "Execute Phase X") — not read-only

### Claude's Discretion
- Exact disabled state styling for unavailable plugins in dropdown
- How auto-open check integrates with the existing project selection flow in appStore
- Whether auto-open happens via addTab in setActiveProject or as a useEffect in Shell
- Internal sidebar width/styling refinements within GsdTab
- Toast or badge pattern for execution notifications

</decisions>

<specifics>
## Specific Ideas

- Plugin zone removal means GsdSidebar.tsx can be deleted — simplifies the sidebar significantly
- The + dropdown already works with PLUGINS array — just needs disabled state for unavailable plugins
- Auto-open should feel seamless: select project → Terminal + GSD tab appear, GSD tab focuses if `.planning/` exists
- Single GSD tab per project means the "open-gsd" menu action should focus existing tab, not create duplicates (already works this way)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PluginDefinition` type (`plugins/types.ts`): Already has tabTypes, isAvailable — just needs sidebarSection removed and autoOpen added
- `PLUGINS` registry (`plugins/index.ts`): getAllPluginTabTypes(), getPlugin() helpers already work
- `GsdTab` (`plugins/gsd/GsdTab.tsx`): Internal sidebar with Overview/Documents/Execute already functional
- `TabBar` (`components/layout/TabBar.tsx`): + dropdown already renders PLUGINS — needs disabled state logic
- `Shell.tsx`: Auto-creates terminal tab on project select via useEffect — same pattern for GSD auto-open

### Established Patterns
- Tab creation via `addTab()` in appStore with type matching plugin tabType IDs
- Plugin availability check is async (filesystem check for `.planning/`)
- Menu actions use `stateRef` pattern to avoid stale closures in event listeners
- `cn()` utility for conditional class merging

### Integration Points
- `appStore.setActiveProject()`: Currently auto-activates first tab — needs to trigger auto-open for GSD
- `Shell.tsx` useEffect for auto-tab creation: Model for GSD auto-open
- `TabBar` dropdown: Add disabled state rendering
- `GsdSidebar.tsx`: Delete after removing sidebarSection from PluginDefinition
- `Sidebar.tsx` PluginSidebar component: Delete (internal component that renders plugin sidebar sections)

</code_context>

<deferred>
## Deferred Ideas

- Plugin command palette contributions (PLUG-08) — future requirement
- Dynamic plugin loading at runtime (PLUG-09) — future requirement
- Plugin-contributed menu items — keep hardcoded in Rust for now
- Plugin settings UI — out of scope per REQUIREMENTS.md
- Tab persistence across sessions (remember which tabs were open) — future enhancement

</deferred>

---

*Phase: 04-plugin-system-app-shell*
*Context gathered: 2026-03-02*
