# Phase 4: Plugin System + App Shell - Research

**Researched:** 2026-03-01
**Domain:** React TypeScript plugin architecture, Zustand state-driven navigation, WebSocket namespace dispatch
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Sidebar composition
- Two-zone sidebar: top zone is project list (app-owned), bottom zone is plugin-contributed content
- Clear visual separator between zones
- When a project is selected, project list zone collapses to a compact strip (project icon/initial + small switcher) to maximize space for the plugin zone
- Plugin zone only appears when a project is active; hidden/empty when no project selected
- GSD plugin contributes: navigation links above the .planning/ file tree — the file tree moves from DocViewer into the sidebar plugin zone
- Nav links include: Overview, Documents, Execute (Dashboard added in Phase 7)

#### View navigation model
- State-driven navigation via Zustand — no URL router, no browser back/forward for views
- Instant swap between views (no transition animations)
- Switching projects resets to the plugin's default view (overview for GSD)
- Plugin declares its own default view — the shell activates the first plugin's default when a project is selected
- ProjectOverview moves into the GSD plugin as its default view (not shell-owned)

#### Shell identity & layout
- Minimal shell: owns header bar, two-zone sidebar frame, main content area, dialogs (add project, settings), command palette, toast system
- Everything else moves to GSD plugin: overview, doc viewer, execution panel, file tree
- Plugin-aware header: plugins can contribute contextual controls via a header slot (existing rightSlot pattern on Header component)
- Command palette stays shell-owned — plugin contributions deferred (PLUG-08)
- No special handling for "no plugin views" edge case — GSD is the only plugin for now

#### Plugin API
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

### Deferred Ideas (OUT OF SCOPE)
- Plugin command palette contributions (PLUG-08) — future requirement, not in v2.0 scope
- Dynamic plugin loading at runtime (PLUG-09) — future requirement
- Plugin settings UI — out of scope per REQUIREMENTS.md
- Plugin sandboxing — out of scope, plugins are trusted local code
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-01 | App provides a typed PluginDefinition interface for compile-time plugin registration | Static PluginDefinition type exported from `src/plugins/types.ts`; imported by plugin array in `src/plugins/index.ts` |
| PLUG-02 | Plugins can inject UI components into named layout slots (sidebar, main content) | `useSlot()` hook pattern reads from plugin registry; slots rendered in shell layout |
| PLUG-03 | Plugins can register navigable views with the app router | `views` array on PluginDefinition; `currentView` in appStore drives which component renders |
| PLUG-04 | App shell restructured — project management and layout are app-owned; all GSD features are behind the plugin boundary | Move ProjectOverview, DocViewer, ExecutionPanel, FileTree into `plugins/gsd/` |
| PLUG-05 | GSD plugin wraps existing features (doc viewer, execution panel, file watcher) as plugin-provided views | Three view entries in GSD plugin: overview, documents, execute — wired to existing components |
| PLUG-06 | Plugins can subscribe to app lifecycle events (project:switched, file:changed, execution:started) | mitt event bus for frontend lifecycle events; namespace prefix check replaces if/else in useWebSocket |
</phase_requirements>

---

## Summary

Phase 4 is a pure refactor — no new user-facing features, but the codebase restructures so that all GSD content sits behind a plugin boundary. The app shell will own layout, dialogs, the command palette, and the project list zone of the sidebar. A new `src/plugins/` directory will hold the GSD plugin, which re-exports the existing `ProjectOverview`, `DocViewer`, `ExecutionPanel`, and `FileTree` components as plugin-registered views.

The key technical pieces are: (1) a `PluginDefinition` TypeScript interface with a `views` array and an optional `headerSlot` component, (2) a Zustand `currentView` state that replaces the `if/else` chain in `App.tsx`, (3) a two-zone `Sidebar` where the top collapses to a compact strip when a project is active and the bottom renders plugin-contributed nav links + file tree, and (4) a `mitt` event bus for plugin lifecycle events, plus a namespace prefix check in `useWebSocket.ts` that dispatches to registered handlers without modifying existing handlers. The type duplication of `WsEvent` between `useWebSocket.ts` and `watcher.ts` must be resolved by moving `FileWsEvent` and `WsEvent` into `shared/types/index.ts` before adding new namespaces.

**Primary recommendation:** Use a static `PluginDefinition` object (not a factory), a `Map<string, ViewDefinition>` as the view registry keyed by view id, `mitt@3.0.1` as the event bus, and Zustand's existing `subscribeWithSelector` middleware pattern for plugins that need to react to store changes. No new dependencies beyond `mitt`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.11 (installed) | View navigation state (`currentView`), plugin-aware shell state | Already used; `subscribeWithSelector` middleware enables plugin event subscriptions |
| mitt | 3.0.1 | Typed frontend event bus for plugin lifecycle events | 200 bytes, zero dependencies, TypeScript generics for event map typing, wildcard support |
| React 19 | 19.2.0 (installed) | Component composition, context for plugin registry | Already used; no additional libraries needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/middleware subscribeWithSelector | (bundled with zustand) | Subscribe to store slices outside React render cycle | Used by plugins that need to react to `activeProjectId` changes |
| lucide-react | 0.575.0 (installed) | Nav link icons in plugin zone | Use existing icons: `LayoutDashboard`, `FileText`, `Play` |
| shadcn/ui separator | (installed via @radix-ui/react-separator) | Visual divider between sidebar zones | Already installed, use `Separator` component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mitt | custom EventTarget | Custom would work but adds 100+ lines; mitt has typed event maps |
| mitt | zustand store as event bus | Store emits state, not one-shot events; awkward for lifecycle signals |
| static PluginDefinition object | factory function receiving app context | Factory adds complexity; plugins can import stores directly instead |
| Map<string, ViewDefinition> as registry | Array lookup | Map provides O(1) lookup by view id; cleaner for activation by id |

**Installation:**
```bash
cd /Users/bradley/Code/get-shit-done/frontend && npm install mitt@3.0.1
```

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── plugins/
│   ├── types.ts              # PluginDefinition, ViewDefinition, PluginSlot interfaces
│   ├── index.ts              # PLUGINS array — compile-time registration point
│   ├── registry.ts           # buildViewRegistry(plugins) + useActivePlugin()
│   ├── events.ts             # mitt bus + typed AppEvents map + subscribe helpers
│   └── gsd/
│       ├── index.ts          # GSD PluginDefinition export
│       ├── views/
│       │   ├── OverviewView.tsx     # wraps ProjectOverview (moved here from overview/)
│       │   ├── DocumentsView.tsx    # wraps DocumentPage (moved here from viewer/)
│       │   └── ExecuteView.tsx      # wraps ExecutionPanel (moved here from execution/)
│       └── headerSlot.tsx    # GSD header contextual controls (back button logic)
├── components/
│   ├── layout/
│   │   ├── Shell.tsx         # renamed/refactored App.tsx — owns two-zone layout
│   │   ├── Sidebar.tsx       # restructured: ProjectStrip + separator + PluginZone
│   │   ├── ProjectStrip.tsx  # collapsed project list (compact strip when project active)
│   │   └── PluginZone.tsx    # renders plugin nav links + plugin sidebar slot
│   ├── execution/            # unchanged — components still live here, GSD plugin imports
│   ├── overview/             # unchanged — components still live here, GSD plugin imports
│   └── viewer/               # unchanged — FileTree stays here, GSD plugin imports
└── stores/
    └── appStore.ts           # add currentView: string | null, setCurrentView action
```

### Pattern 1: Static PluginDefinition Interface

**What:** Plugins are plain TypeScript objects that satisfy a `PluginDefinition` interface. No class inheritance, no factory functions. Plugin components import stores directly.

**When to use:** Always — compile-time only, GSD is the only plugin in v2.0.

```typescript
// src/plugins/types.ts
import type { ComponentType } from 'react'

export interface ViewDefinition {
  id: string                        // e.g. 'gsd:overview'
  label: string                     // displayed in sidebar nav
  icon: ComponentType<{ size?: number; className?: string }>
  component: ComponentType          // the React view component
  isDefault?: boolean               // shell activates this on project switch
}

export interface PluginDefinition {
  id: string                        // e.g. 'gsd'
  views: ViewDefinition[]
  headerSlot?: ComponentType        // rendered in Header rightSlot when plugin is active
}
```

```typescript
// src/plugins/index.ts
import type { PluginDefinition } from './types'
import { gsdPlugin } from './gsd/index'

// Compile-time registration — add new plugins here, nowhere else
export const PLUGINS: PluginDefinition[] = [gsdPlugin]
```

```typescript
// src/plugins/gsd/index.ts
import { LayoutDashboard, FileText, Play } from 'lucide-react'
import type { PluginDefinition } from '../types'
import { OverviewView } from './views/OverviewView'
import { DocumentsView } from './views/DocumentsView'
import { ExecuteView } from './views/ExecuteView'
import { GsdHeaderSlot } from './headerSlot'

export const gsdPlugin: PluginDefinition = {
  id: 'gsd',
  views: [
    { id: 'gsd:overview',   label: 'Overview',   icon: LayoutDashboard, component: OverviewView,   isDefault: true },
    { id: 'gsd:documents',  label: 'Documents',  icon: FileText,         component: DocumentsView },
    { id: 'gsd:execute',    label: 'Execute',    icon: Play,             component: ExecuteView },
  ],
  headerSlot: GsdHeaderSlot,
}
```

### Pattern 2: View Registry + currentView in appStore

**What:** `buildViewRegistry` creates a `Map<string, ViewDefinition>` from all plugins. `appStore` gains `currentView: string | null` and `setCurrentView`. The shell renders `registry.get(currentView)?.component`.

**When to use:** Replaces the `if/else` chain in `App.tsx`.

```typescript
// src/plugins/registry.ts
import type { PluginDefinition, ViewDefinition } from './types'

export function buildViewRegistry(plugins: PluginDefinition[]): Map<string, ViewDefinition> {
  const map = new Map<string, ViewDefinition>()
  for (const plugin of plugins) {
    for (const view of plugin.views) {
      map.set(view.id, view)
    }
  }
  return map
}

export function getDefaultViewId(plugins: PluginDefinition[]): string | null {
  for (const plugin of plugins) {
    const defaultView = plugin.views.find((v) => v.isDefault)
    if (defaultView) return defaultView.id
  }
  return plugins[0]?.views[0]?.id ?? null
}
```

```typescript
// src/stores/appStore.ts — add to existing store
interface AppState {
  activeProjectId: string | null
  selectedFile: string | null
  currentView: string | null          // NEW: replaces implicit if/else routing
  setActiveProject: (id: string | null) => void
  setSelectedFile: (path: string | null) => void
  setCurrentView: (viewId: string | null) => void  // NEW
}

// In setActiveProject — reset view to plugin default
setActiveProject: (id) => set({
  activeProjectId: id,
  selectedFile: null,
  currentView: id ? getDefaultViewId(PLUGINS) : null,  // NEW
}),
```

```typescript
// Shell.tsx — main content area (replaces if/else in App.tsx)
import { buildViewRegistry } from '@/plugins/registry'
import { PLUGINS } from '@/plugins/index'

const viewRegistry = buildViewRegistry(PLUGINS)

function MainContent() {
  const currentView = useAppStore((s) => s.currentView)
  const activeProjectId = useAppStore((s) => s.activeProjectId)

  if (!activeProjectId) {
    return <EmptyState />
  }

  const view = currentView ? viewRegistry.get(currentView) : null
  if (!view) return null

  const ViewComponent = view.component
  return <ViewComponent />
}
```

### Pattern 3: Two-Zone Sidebar

**What:** Sidebar splits into `ProjectStrip` (top, collapses when project selected) and `PluginZone` (bottom, appears when project selected). A `Separator` divides the two zones.

**When to use:** Always — this is the locked sidebar composition decision.

```typescript
// Sidebar.tsx structure
export function Sidebar({ onNewProject }: SidebarProps) {
  const activeProjectId = useAppStore((s) => s.activeProjectId)

  return (
    <aside className="flex flex-col shrink-0 border-r" style={{ width: '280px', ... }}>
      {/* Top zone: project list (full when no project, compact strip when project active) */}
      {activeProjectId ? (
        <ProjectStrip />
      ) : (
        <ProjectList onNewProject={onNewProject} />
      )}

      {/* Separator + Plugin zone — only when project is active */}
      {activeProjectId && (
        <>
          <Separator style={{ background: 'var(--color-border)' }} />
          <PluginZone />
        </>
      )}
    </aside>
  )
}
```

```typescript
// ProjectStrip.tsx — compact strip with project name + switcher button
export function ProjectStrip() {
  const { activeProjectId, setActiveProject } = useAppStore()
  const { data: projects = [] } = useProjects()
  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: 'var(--color-bg2)' }}>
      {/* Project initial badge */}
      <div className="flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0"
        style={{ background: 'var(--color-accent)', color: '#0e0e10' }}>
        {activeProject?.name.charAt(0).toUpperCase()}
      </div>
      {/* Project name truncated */}
      <span className="text-xs truncate flex-1" style={{ color: 'var(--color-text2)' }}>
        {activeProject?.name}
      </span>
      {/* Switch button */}
      <button onClick={() => setActiveProject(null)}
        className="text-xs shrink-0" style={{ color: 'var(--color-text4)' }}
        title="Switch project">
        switch
      </button>
    </div>
  )
}
```

```typescript
// PluginZone.tsx — plugin nav links + sidebar slot (file tree)
export function PluginZone() {
  const { currentView, setCurrentView } = useAppStore()
  const { activeProjectId } = useAppStore()
  const { data: tree } = useFileTree(activeProjectId)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Nav links from GSD plugin views */}
      <nav className="flex flex-col gap-0.5 px-2 pt-2 pb-1 shrink-0">
        {gsdPlugin.views.map((view) => (
          <button key={view.id}
            onClick={() => setCurrentView(view.id)}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left"
            style={{
              background: currentView === view.id ? 'var(--color-bg4)' : 'transparent',
              color: currentView === view.id ? 'var(--color-accent)' : 'var(--color-text2)',
            }}>
            <view.icon size={14} />
            {view.label}
          </button>
        ))}
      </nav>

      {/* File tree (moved from DocumentPage — always visible in plugin zone) */}
      <ScrollArea className="flex-1">
        {tree && <FileTree nodes={tree} />}
      </ScrollArea>
    </div>
  )
}
```

### Pattern 4: mitt Event Bus for Plugin Lifecycle Events (PLUG-06)

**What:** A typed `mitt` emitter in `src/plugins/events.ts` dispatches app lifecycle events. Plugins subscribe via `appEvents.on(...)`. The `useWebSocket` hook emits `file:changed` and `execution:started` on the bus in addition to existing behavior.

**When to use:** Anywhere a plugin needs to react to app lifecycle without coupling to store internals.

```typescript
// src/plugins/events.ts
import mitt from 'mitt'

export type AppEvents = {
  'project:switched': { projectId: string | null }
  'file:changed':     { projectId: string; path: string }
  'execution:started': { sessionId: string; phaseId: string }
}

// Module-level singleton — imported by plugins and by useWebSocket
export const appEvents = mitt<AppEvents>()

// Helper: subscribe with automatic cleanup (call in useEffect)
export function onAppEvent<K extends keyof AppEvents>(
  event: K,
  handler: (payload: AppEvents[K]) => void
): () => void {
  appEvents.on(event, handler)
  return () => appEvents.off(event, handler)
}
```

```typescript
// In appStore.ts setActiveProject — emit project:switched
setActiveProject: (id) => {
  set({ activeProjectId: id, selectedFile: null, currentView: id ? getDefaultViewId(PLUGINS) : null })
  appEvents.emit('project:switched', { projectId: id })
},
```

```typescript
// In useWebSocket.ts — emit app events alongside existing behavior
// After resolving file:changed event:
appEvents.emit('file:changed', { projectId, path })

// After resolving execution:started event:
appEvents.emit('execution:started', { sessionId: execEvent.sessionId, phaseId: execEvent.phaseId })
```

```typescript
// Plugin subscribing to lifecycle events (example)
useEffect(() => {
  return onAppEvent('project:switched', ({ projectId }) => {
    if (projectId) {
      // React to project switch — e.g., reset panel state
    }
  })
}, [])
```

### Pattern 5: WsEvent Namespace Dispatch (PLUG-06 backend side)

**What:** Move `FileWsEvent` + `WsEvent` union type to `shared/types/index.ts` to resolve the known duplication. Add a namespace prefix check in `useWebSocket.ts` that dispatches to a registered handler map rather than an `if/else` chain. New event namespaces register handlers without touching existing ones.

**When to use:** Before adding any new WebSocket event namespaces (per STATE.md concern).

```typescript
// shared/types/index.ts — ADD these types (currently in watcher.ts only):
export type FileWsEvent = {
  type: 'file:changed' | 'file:created' | 'file:deleted'
  projectId: string
  path: string
}

export type WsEvent = FileWsEvent | ExecutionWsEvent
// (ExecutionWsEvent already exists in shared/types/index.ts)
```

```typescript
// useWebSocket.ts — namespace dispatch pattern
// Replace the if/else chain with a handler map:
type WsNamespaceHandler = (event: WsEvent, queryClient: ReturnType<typeof useQueryClient>) => void

const wsHandlers: Record<string, WsNamespaceHandler> = {
  'file:': handleFileEvent,       // handles file:changed, file:created, file:deleted
  'execution:': handleExecutionEvent,  // handles all execution: events
}

ws.onmessage = (evt) => {
  const event: WsEvent = JSON.parse(evt.data as string)
  const namespace = event.type.split(':')[0] + ':'
  const handler = wsHandlers[namespace]
  if (handler) handler(event, queryClient)
}
```

### Anti-Patterns to Avoid

- **Putting plugin logic in App.tsx:** Shell should only render layout. Plugin-specific logic (back buttons, view switching) belongs in plugin's `headerSlot` component.
- **Making PluginZone depend on PLUGINS array directly:** `PluginZone` should receive the active plugin's views as props or read from a store, not import PLUGINS directly — keeps it testable.
- **Persisting `currentView` across sessions:** `currentView` should NOT be in the Zustand `persist` middleware (views reset on project switch anyway). Remove it from the persist partialize if added.
- **Removing FileTree from DocumentPage before adding to PluginZone:** Move incrementally — add to sidebar first, verify it works, then remove from DocumentPage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typed event bus | Custom EventTarget wrapper | `mitt@3.0.1` | TypeScript generics on event map, wildcard support, 200 bytes |
| Subscription cleanup | Manual add/remove in useEffect | Return unsubscribe fn from `onAppEvent` helper | Consistent cleanup pattern, easy to use in effects |
| View registry lookup | If/else chain | `Map<string, ViewDefinition>` | O(1) lookup, easy to extend, TypeScript infers value types |
| Plugin component rendering | Dynamic import()/lazy | Static import in plugin index.ts | Compile-time only for v2.0, no runtime overhead |

**Key insight:** The plugin system for v2.0 is fundamentally a data structure problem (PluginDefinition → Map → render). Don't over-engineer it — mitt + a Map + Zustand state covers all 6 requirements without additional infrastructure.

---

## Common Pitfalls

### Pitfall 1: Execution Panel Streaming Breaks After View Registry Refactor

**What goes wrong:** The `ExecutionPanel` currently receives `onBack` prop from `App.tsx`. After refactoring, if `ExecuteView` in the GSD plugin doesn't wire `onBack` correctly, streaming output continues but the back button breaks or the view doesn't switch.

**Why it happens:** The `onBack` callback called `useExecutionStore.getState().reset()`. After refactoring, "back" should be `setCurrentView('gsd:overview')`, not a store reset. The reset and view switch must happen together.

**How to avoid:** In `ExecuteView`, wire `onBack` to call both `setCurrentView('gsd:overview')` AND the existing `useExecutionStore.getState().reset()`. Test streaming specifically in the new plugin context before considering it done.

**Warning signs:** Back button click changes URL/state but streaming log disappears without showing overview.

### Pitfall 2: currentView State Not Reset on Project Switch

**What goes wrong:** User switches from Project A (on 'gsd:execute' view) to Project B. Since `currentView` persists, Project B opens on the Execute view even though no execution is running.

**Why it happens:** `setActiveProject` doesn't reset `currentView` to the plugin default.

**How to avoid:** In `appStore.ts`, `setActiveProject` must call `setCurrentView(getDefaultViewId(PLUGINS))` atomically in the same `set()` call. Verified in the code example in Pattern 2.

**Warning signs:** Wrong view shown after project switch, especially when returning to a project that was previously on Execute view.

### Pitfall 3: FileTree Duplicated in Two Places

**What goes wrong:** FileTree appears in both the DocumentPage sidebar panel (current location) and the new PluginZone sidebar. Files appear twice, scroll state is duplicated, and WS highlight effects fire twice.

**Why it happens:** Moving FileTree is a two-step process (add to PluginZone, remove from DocumentPage). If the removal step is forgotten, both render.

**How to avoid:** Plan the migration as atomic: DocumentsView in the plugin should render only the document content area (no embedded FileTree panel). The file tree selection must still work via the shared `selectedFile` store state.

**Warning signs:** Two file trees visible simultaneously; WS highlight glow fires on both.

### Pitfall 4: WsEvent Type Duplication Causes New Namespace to Compile but Not Dispatch

**What goes wrong:** A new `chat:` namespace event is added to `shared/types/index.ts` but `useWebSocket.ts` still has its own local `WsEvent` type that doesn't include `chat:` events. The TypeScript compiler accepts it on the frontend but the handler is never called.

**Why it happens:** The local type in `useWebSocket.ts` (lines 6–19) shadows the shared type. Both need to match.

**How to avoid:** In Phase 4, consolidate: move `FileWsEvent` to `shared/types/index.ts`, delete the local definitions in `useWebSocket.ts`, and import from `@shared/types`. Verified by checking that `WsEvent` has exactly one source of truth.

**Warning signs:** TypeScript passes but a new namespace event handler is never invoked.

### Pitfall 5: Plugin Zone Renders Before Project Is Loaded

**What goes wrong:** `PluginZone` renders before `useProjects` resolves, showing a flash of empty nav links or a broken file tree.

**Why it happens:** `activeProjectId` is set in the store (from localStorage persist) before the project list is fetched. The sidebar renders plugin zone but `useFileTree` hasn't loaded yet.

**How to avoid:** `PluginZone` should show a minimal loading state while `useFileTree` resolves. The nav links can render immediately (they don't depend on data). The file tree uses `isLoading` guard — already has `TreeSkeleton` in `DocumentPage` that can be reused.

**Warning signs:** Empty/crashed plugin zone on first load; file tree spinner doesn't appear.

---

## Code Examples

Verified patterns from analysis of existing codebase + confirmed library APIs:

### Zustand subscribeWithSelector for Plugin Reactions
```typescript
// Source: Zustand v5 docs + project's existing zustand@5.0.11
import { subscribeWithSelector } from 'zustand/middleware'

// If appStore needs to be subscribed to outside React:
// (subscribeWithSelector wraps the store, not needed if plugins use onAppEvent)
useAppStore.subscribe(
  (state) => state.activeProjectId,
  (newId, prevId) => {
    if (newId !== prevId) {
      appEvents.emit('project:switched', { projectId: newId })
    }
  }
)
// Note: standard zustand subscribe() supports a selector as first arg in v5
// without needing subscribeWithSelector middleware (that's for 3-arg form)
```

### mitt Typed Event Bus (verified: mitt@3.0.1)
```typescript
// Source: https://github.com/developit/mitt (v3.0.1, July 2023)
import mitt, { type Emitter } from 'mitt'

type AppEvents = {
  'project:switched': { projectId: string | null }
  'file:changed': { projectId: string; path: string }
  'execution:started': { sessionId: string; phaseId: string }
}

const appEvents: Emitter<AppEvents> = mitt<AppEvents>()

// Subscribe
appEvents.on('project:switched', ({ projectId }) => { ... })

// Emit
appEvents.emit('project:switched', { projectId: 'abc' })

// Unsubscribe
const handler = (payload: AppEvents['project:switched']) => { ... }
appEvents.on('project:switched', handler)
appEvents.off('project:switched', handler)
```

### View Registry (Map-based, no third-party libs)
```typescript
// Source: analysis of phase requirements + TypeScript Map API
const registry = new Map<string, ViewDefinition>()

// Build once at module level
PLUGINS.forEach(plugin =>
  plugin.views.forEach(view => registry.set(view.id, view))
)

// Render active view
const view = registry.get(currentView ?? '')
const ViewComponent = view?.component
return ViewComponent ? <ViewComponent /> : null
```

### Compact Project Strip
```typescript
// Source: locked design from CONTEXT.md + existing CSS variable patterns
export function ProjectStrip() {
  const { data: projects = [] } = useProjects()
  const { activeProjectId, setActiveProject } = useAppStore()
  const active = projects.find(p => p.id === activeProjectId)
  const initial = active?.name.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-2 px-3 py-2 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
        style={{ background: 'var(--color-accent)', color: '#0e0e10', borderRadius: 'var(--radius-sm)' }}>
        {initial}
      </div>
      <span className="text-xs truncate flex-1 font-medium" style={{ color: 'var(--color-text2)' }}>
        {active?.name}
      </span>
      <button
        onClick={() => setActiveProject(null)}
        className="text-xs shrink-0 transition-colors duration-100"
        style={{ color: 'var(--color-text4)', fontFamily: 'var(--font-mono)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text4)' }}
        title="Switch project">
        switch
      </button>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| If/else routing in App.tsx | Map-based view registry + Zustand currentView | This phase | New views added by adding a view entry in plugin definition — App.tsx untouched |
| WsEvent type duplicated in frontend and backend | WsEvent in shared/types/index.ts | This phase | Single source of truth; adding new namespace in shared types is sufficient |
| ProjectOverview/DocViewer/ExecutionPanel in shell components | All in plugins/gsd/ | This phase | Shell has no GSD-specific imports; future plugins follow same pattern |
| FileTree embedded in DocumentPage side panel | FileTree in sidebar PluginZone | This phase | Always-visible navigation; document view shows only content |

**Deprecated/outdated after this phase:**
- `App.tsx` if/else view switching: replaced by `currentView` store + view registry
- `components/overview/` direct shell import: moved behind plugin boundary
- Local `WsEvent`/`FileWsEvent` types in `useWebSocket.ts`: moved to shared types

---

## Open Questions

1. **Should `currentView` be persisted in localStorage?**
   - What we know: `appStore` uses `persist` middleware with key `gsd-app-store`; `activeProjectId` and `selectedFile` are persisted
   - What's unclear: If `currentView` is persisted, a refresh on the Execute view while no execution is running would show an empty Execute panel
   - Recommendation: Do NOT persist `currentView` — initialize it to `null` and set it to the plugin default whenever `setActiveProject` is called. Use Zustand `partialize` to exclude `currentView` from localStorage.

2. **How does `DocumentsView` know which file to show without `selectedFile` being set?**
   - What we know: `selectedFile` is in appStore; DocumentPage reads it directly; FileTree sets it via `setSelectedFile`
   - What's unclear: When user navigates to Documents view with no `selectedFile` set, does it show the tree prompt or crash?
   - Recommendation: `DocumentsView` wraps `DocumentPage` as-is; the "Select a file from the tree" empty state already handles `selectedFile === null`. No change needed.

3. **Does the GSD `headerSlot` replace or augment the existing `rightSlot` content in Header?**
   - What we know: Header has `rightSlot?: ReactNode`; currently App.tsx passes a BackToOverview button conditionally
   - What's unclear: With plugin-aware header, should shell pass `plugin.headerSlot` as `rightSlot`, or does the plugin slot completely own that area?
   - Recommendation: Shell passes `<GsdHeaderSlot />` as `rightSlot` when GSD plugin is active and a project is selected. `GsdHeaderSlot` contains all the contextual button logic (back button for docs view, execute state indicator). Shell has zero view-specific button logic.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis (`frontend/src/`) — current App.tsx if/else structure, Sidebar layout, appStore shape, useWebSocket handler pattern, shared/types duplication
- `frontend/package.json` — confirmed zustand@5.0.11, react@19.2.0, all existing dependencies
- `shared/types/index.ts` — confirmed `ExecutionWsEvent` already in shared types; `FileWsEvent` and `WsEvent` missing
- `frontend/src/hooks/useWebSocket.ts` — confirmed type duplication and dispatch structure
- `backend/src/lib/watcher.ts` — confirmed `WsEvent` definition and canonical `FileWsEvent`

### Secondary (MEDIUM confidence)
- https://github.com/developit/mitt — confirmed v3.0.1 current, API: on/off/emit/all, TypeScript generics
- https://pmnd.rs/blog/announcing-zustand-v5 — confirmed no breaking changes to subscribe API or persist middleware in v5
- Zustand subscribeWithSelector search results — confirmed middleware API for selector-based subscriptions

### Tertiary (LOW confidence)
- WebSearch results on React plugin architecture patterns — general patterns, not verified against a specific framework version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all key libraries are already installed (zustand, react, lucide-react); only mitt is new addition, verified at v3.0.1
- Architecture: HIGH — patterns derived from direct codebase analysis; PluginDefinition shape is original design matching locked CONTEXT.md decisions
- Pitfalls: HIGH — all pitfalls identified from specific code paths in the existing codebase (exact files and line ranges referenced)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable patterns; mitt and zustand APIs don't change frequently)
