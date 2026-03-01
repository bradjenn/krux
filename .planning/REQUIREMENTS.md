# Requirements: GSD Dashboard

**Defined:** 2026-03-01
**Core Value:** Users can manage development projects and run AI-powered workflows through a visual interface with a plugin architecture.

## v2.0 Requirements

Requirements for milestone v2.0: Standalone App + Plugin Architecture.

### Plugin System

- [ ] **PLUG-01**: App provides a typed PluginDefinition interface for compile-time plugin registration
- [ ] **PLUG-02**: Plugins can inject UI components into named layout slots (sidebar, main content)
- [ ] **PLUG-03**: Plugins can register navigable views with the app router
- [ ] **PLUG-04**: App shell restructured — project management and layout are app-owned; all GSD features are behind the plugin boundary
- [ ] **PLUG-05**: GSD plugin wraps existing features (doc viewer, execution panel, file watcher) as plugin-provided views
- [ ] **PLUG-06**: Plugins can subscribe to app lifecycle events (project:switched, file:changed, execution:started)

### Chat Interface

- [ ] **CHAT-01**: User can send messages to Claude through a chat interface
- [ ] **CHAT-02**: User sees Claude's response streamed in real-time (token by token)
- [ ] **CHAT-03**: User can resume previous chat sessions across browser sessions
- [ ] **CHAT-04**: User can invoke GSD slash commands from the chat input
- [ ] **CHAT-05**: Streaming markdown renders correctly mid-stream (no flash of raw syntax)
- [ ] **CHAT-08**: User sees slash command autocomplete when typing "/" in the chat input
- [ ] **CHAT-09**: GSD command output renders visually distinct from conversational messages

### Phase Dashboard

- [ ] **PHASE-01**: User sees all phases in a timeline with done/in-progress/todo status indicators
- [ ] **PHASE-02**: User can click a phase to see its plans and completion status
- [ ] **PHASE-03**: User can see which requirements each phase covers
- [ ] **PHASE-04**: User sees a live STATUS card reflecting STATE.md (phase, plan, progress)
- [ ] **PHASE-05**: STATUS card shows a progress percentage bar
- [ ] **PHASE-06**: User can click a plan name to jump to that document in the viewer
- [ ] **PHASE-07**: Each phase row shows a completion count badge (e.g., "3/5 plans")

## v1.0 Validated Requirements

Shipped in v1.0. These are locked — the plugin refactor must preserve them.

### Project Management

- ✓ **PROJ-01**: User can register project paths to the dashboard — v1.0 Phase 2
- ✓ **PROJ-02**: User can remove registered projects — v1.0 Phase 2
- ✓ **PROJ-03**: User can switch between registered projects — v1.0 Phase 2
- ✓ **PROJ-04**: User sees project overview (phase count, progress, current status) — v1.0 Phase 2
- ✓ **PROJ-05**: Dashboard auto-updates when .planning/ files change on disk — v1.0 Phase 2

### Document Viewer

- ✓ **DOCS-01**: User can view .planning/ files rendered as formatted markdown — v1.0 Phase 2
- ✓ **DOCS-02**: User can navigate .planning/ directory via file tree sidebar — v1.0 Phase 2
- ✓ **DOCS-03**: Code blocks in documents have syntax highlighting — v1.0 Phase 2

### Agent Execution

- ✓ **EXEC-01**: User can trigger phase execution from the UI — v1.0 Phase 3
- ✓ **EXEC-02**: User can stop/abort a running agent — v1.0 Phase 3
- ✓ **EXEC-03**: User sees progress summary (Plan N/M, Task X/Y) — v1.0 Phase 3
- ✓ **EXEC-04**: User can expand to see full streaming agent output — v1.0 Phase 3

## Future Requirements

Deferred beyond v2.0. Tracked but not in current roadmap.

### Chat Enhancements

- **CHAT-06**: User sees tool use visualization (what Claude is calling, arguments, results)
- **CHAT-07**: User can have multiple concurrent chat sessions

### Agent Execution Enhancements

- **EXEC-05**: User can run multiple concurrent agent sessions
- **EXEC-06**: User sees agent cost/token usage per session

### Plugin System Enhancements

- **PLUG-07**: Plugins can expose typed data providers queryable by other components
- **PLUG-08**: Plugins can contribute entries to the command palette
- **PLUG-09**: Dynamic plugin loading at runtime (vs compile-time)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Document editing from UI | CLI/chat creates documents, UI views them — prevents state drift |
| Mobile support | Desktop browser only — personal dev tool |
| Multi-user / authentication | Single user, runs locally |
| Deployment / hosting | Runs via `npm run dev` locally |
| Non-Claude agent frameworks | GSD plugin is first; other frameworks are future plugins |
| Plugin marketplace / dynamic loading | v2.0 plugins are compile-time only |
| Plugin sandboxing | Plugins are trusted local code in a personal tool |
| Plugin settings UI | GSD plugin is configured by .planning/ directory structure |
| Gantt chart with dates | GSD phases have no due dates — status indicators suffice |
| Phase dependency graph | Phases are sequential; graph adds complexity for no insight |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 4 | Pending |
| PLUG-02 | Phase 4 | Pending |
| PLUG-03 | Phase 4 | Pending |
| PLUG-04 | Phase 4 | Pending |
| PLUG-05 | Phase 4 | Pending |
| PLUG-06 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-05 | Phase 5 | Pending |
| CHAT-04 | Phase 6 | Pending |
| CHAT-08 | Phase 6 | Pending |
| CHAT-09 | Phase 6 | Pending |
| PHASE-01 | Phase 7 | Pending |
| PHASE-02 | Phase 7 | Pending |
| PHASE-03 | Phase 7 | Pending |
| PHASE-04 | Phase 7 | Pending |
| PHASE-05 | Phase 7 | Pending |
| PHASE-06 | Phase 7 | Pending |
| PHASE-07 | Phase 7 | Pending |

**Coverage:**
- v2.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after v2.0 roadmap creation*
