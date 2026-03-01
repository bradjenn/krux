# Feature Research

**Domain:** GSD Dashboard v2.0 — plugin architecture, chat interface, phase dashboard
**Researched:** 2026-03-01
**Confidence:** HIGH (existing system well-understood; new features grounded in existing patterns, official docs, and direct codebase inspection)

---

## Context: New Features Only (Subsequent Milestone)

Phases 1-3 are complete. This research covers only what is NEW in v2.0:

1. **Plugin system** — compile-time registration, UI slot injection, event hooks, data providers
2. **Chat interface** — streaming markdown, session persistence, GSD slash command integration
3. **Phase dashboard** — phase timeline, plan detail, requirement coverage, STATE.md live card

Existing features (project management, document viewer, execution panel, WebSocket infrastructure, TanStack Query + Zustand patterns, rAF buffer streaming) are built and serve as dependencies.

---

## Feature Landscape: Plugin System

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plugin registration API | Without this there is no plugin system — it is the system | MEDIUM | Compile-time barrel file (`plugins/index.ts`). Each plugin exports a `PluginDefinition` object with `id`, `name`, `slots`, `routes`. No dynamic loading. |
| UI slot injection | Plugins must be able to add sidebar nav items and main-area views | MEDIUM | Named slots in layout components. `Header` already has a `rightSlot` prop — extend this model to sidebar nav and main content area. Pattern: `<Slot name="sidebar-nav" />` renders plugin-contributed items. |
| App shell restructure | GSD-specific code currently lives in App.tsx directly — must be extracted behind the plugin boundary | MEDIUM | App.tsx becomes the plugin host. Routing, layout, and project management remain app-owned. Doc viewer, execution panel, file watcher re-register as GSD plugin contributions. |
| Route contribution | Plugins must be able to add views the router navigates to | LOW | Simple array of `{ path: string, component: React.ComponentType }` registered at startup. No runtime routing needed. |
| TypeScript plugin interface | Without typed contracts the API is unusable and fragile | LOW | Single `PluginDefinition` interface exported from a shared types file. Plugins are type-checked at compile time. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Event hooks (publish/subscribe) | Plugins react to app events (project switched, file changed, execution started) without being tightly coupled to the host | MEDIUM | Simple EventEmitter (mitt, ~200 bytes). GSD plugin subscribes to `project:switched` to reload its state. App shell emits events; plugins listen. |
| Data providers | Plugins expose typed data that the app shell or other plugins can query | MEDIUM | GSD plugin exposes phases, STATE.md content, session metadata. Dashboard queries via `usePluginData(pluginId, key)` hook backed by TanStack Query. |
| Plugin-contributed command palette entries | GSD slash commands surface in the existing CommandPalette without hardcoding them into the shell | LOW | CommandPalette already exists. Plugin registers `{ label, shortcut, action }` entries. App merges them into the palette at startup. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Dynamic / runtime plugin loading | "Install from URL" feels powerful | Requires module federation or dynamic import with unknown sources, adds security surface, breaks type safety, overkill for a personal tool | Compile-time registration. Plugins are local modules imported in `plugins/index.ts`. Hot reload (Vite HMR) is sufficient for development. |
| Plugin marketplace / store | Familiar from VS Code | Requires a server, versioning, security review, distribution infrastructure — far out of scope | Document the `PluginDefinition` interface so users can write local plugins |
| Plugin sandboxing / isolation | Sounds safe | Breaks shared React context, TanStack Query cache, and Zustand stores — plugins need these to work | Trust model: plugins are code you wrote and imported. No sandbox needed for a personal tool. |
| Plugin versioning / compatibility matrix | Enterprise-grade contract | The app and all plugins live in the same repo. They always match. Version drift is impossible. | Single version field on `PluginDefinition` for documentation only |
| Plugin settings UI (per-plugin config panels) | Plugins want to expose configuration | Adds settings registration complexity for zero current benefit — GSD plugin has no runtime config | GSD plugin is configured by the `.planning/` directory structure, which already exists |

---

## Feature Landscape: Chat Interface

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Message thread (user / assistant turns) — CHAT-01 | Every chat UI since iMessage — without this it is not a chat | LOW | Chronological list. User messages in distinct color. Assistant messages full-width. Each message is a discrete component. |
| Streaming token-by-token display — CHAT-02 | Users expect to see Claude "typing." Waiting for full response feels broken. | MEDIUM | Backend streaming fan-out via WebSocket already exists from Phase 3. New chat backend route reuses the same pattern. rAF buffer already proven. |
| Streaming markdown with no raw syntax flash — CHAT-05 | Streaming `**bold**` as raw text and then formatting it is jarring | HIGH | The hardest table-stakes item. **Use Streamdown** (Vercel, open source, drop-in react-markdown replacement purpose-built for AI streaming). Resolves incomplete block edge cases automatically. This must be resolved before chat ships. |
| Text input bar with send action — CHAT-01 | Universal chat convention | LOW | `<textarea>` with Ctrl+Enter (or Enter) to send. Auto-resize on content. Disable during streaming. |
| Auto-scroll to latest message | Expected from every chat interface | LOW | `useEffect` scroll-to-bottom on new messages. Override when user manually scrolls up ("scroll paused" state). |
| Thinking / loading indicator | Without this the UI goes silent while Claude processes | LOW | Animated dots or "Claude is thinking..." while waiting for first token. |
| Session persistence across browser sessions — CHAT-03 | Users expect to resume where they left off after closing the tab | MEDIUM | Session ID stored in localStorage (small, survives reload). Full message history stored in IndexedDB via Dexie.js. localStorage alone has ~5MB limit with corruption risk under large chat histories. IndexedDB handles arbitrary size with transactional integrity. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GSD slash command integration — CHAT-04 | Users invoke `/gsd:new-project`, `/gsd:plan-phase`, etc. from the chat UI instead of a terminal. Zero terminal required for the full GSD workflow. | HIGH | Most valuable feature in this milestone. Input parser detects `/` prefix and routes to the Agent SDK with the command string. The SDK's `slash_commands` list (emitted on session init) drives autocomplete and validation. |
| Slash command autocomplete | Shows available GSD commands as the user types `/` | LOW | Filter `slash_commands` from the SDK init message (`message.type === "system" && message.subtype === "init"`). Render a small dropdown above the input bar. |
| Built-in SDK commands exposed via chat | `/compact` and `/clear` are useful for long sessions; surfacing them means users don't need to know the SDK internals | LOW | SDK init message includes built-in slash commands in `slash_commands`. These appear in autocomplete automatically. |
| Command output visually distinct from conversation | GSD slash command runs generate streaming agent output, not conversational prose. Mixing them visually is confusing. | MEDIUM | Messages carry a `type` field: `"chat"` or `"command"`. Chat messages render via Streamdown markdown. Command messages render via the existing ExecutionPanel log viewer (ANSI-aware, rAF-buffered). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Tool call visualization inline in chat — CHAT-06 | Seeing what Claude is calling and the results is useful | HIGH complexity. Tool call events are granular (tool_use start, partial_json, tool_result). Rendering them well requires significant UI work. Deferred to v2 in REQUIREMENTS.md. | Simple "Claude is working..." indicator during active tool calls. Tool details visible in execution panel. |
| Multiple concurrent sessions — CHAT-07 | Power user feature | Requires tab management UI, state multiplexing in Zustand, WebSocket fan-out changes. Deferred to v2 in REQUIREMENTS.md. | Single active session. "New session" replaces the current one. |
| File / image attachments | Multimodal feels obvious | Claude Agent SDK in this context is text-only. Adds backend upload handling, storage, and content type management. | Context is set via the project path. `.planning/` documents are already in Claude's context via the SDK. |
| Message editing and regeneration | Nice ChatGPT feature | Agent SDK sessions are linear — you cannot inject into the middle of a session history. Editing breaks session continuity. | Ask Claude to revise in a follow-up message. |
| Voice input | Trendy | Zero value for a developer tool typing code paths and planning content. Adds Web Speech API complexity and mobile-only UX patterns. | Text input only. |
| Persistent sidebar showing all past sessions | "History panel" like ChatGPT | Requires listing IndexedDB sessions, managing deletion, naming, search. High UI surface for low current value. | Single most-recent session on load. New session clears state. Sessions listed only if explicitly requested. |

---

## Feature Landscape: Phase Dashboard

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Phase timeline with status indicators — PHASE-01 | It is called a "phase dashboard." Without phases it is not a dashboard. | LOW | Vertical list (or card grid) of phases. Each has a status badge: done (green), in-progress (yellow/amber), not-started (muted). Phase data already parsed by Phase 1 backend from ROADMAP.md. |
| Plan detail on expand / click — PHASE-02 | Users need to see what is inside a phase before they can understand its progress | LOW | Expand/collapse on click. Show plan list with filenames and read-only completion indicator. Plan count in collapsed summary. |
| Requirement coverage per phase — PHASE-03 | Answers "what did this phase deliver?" without reading raw ROADMAP.md | MEDIUM | Parse requirement IDs (e.g., `PROJ-01`, `CHAT-02`) from phase descriptions in ROADMAP.md. Render as small tags per phase. Match against REQUIREMENTS.md status. Backend does the parsing; frontend renders tags. |
| Live STATUS card from STATE.md — PHASE-04 | The most useful single read of project position. More useful than any other feature in the dashboard. | MEDIUM | Parse YAML frontmatter from STATE.md (`milestone`, `current_plan`, `status`, `progress.*`, `last_updated`). Render as a structured card. Live update via existing file watcher WebSocket — no new infrastructure needed. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Progress percentage bar on STATUS card | Instantly readable — "60% done" beats reading raw numbers | LOW | `progress.percent` is already in STATE.md frontmatter. `<progress>` element or styled div. |
| Jump to plan document from phase list | Clicking a plan name navigates to the document in the existing doc viewer | LOW | Call `setSelectedFile(planPath)` from appStore. Zero new infrastructure — reuses Phase 2's doc viewer. High bang-for-buck. |
| Completion count badge on phases | "3/5 plans complete" in the collapsed phase row sets expectations without expanding | LOW | Count completed vs total plans. Render as `X/Y` in the phase row. |
| Blocked / at-risk status propagation | If a phase has a blocker in STATE.md, surface it visually | MEDIUM | Parse `blockers` from STATE.md content section. Display warning indicator on STATUS card. Not tracked per-phase currently — would need STATE.md convention. Low priority. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Gantt chart with dates | "Real" project management feel | GSD phases have no due dates. Any dates shown would be fake. Adds date management complexity for zero data. | Status-based indicators (done / in-progress / todo) convey the same information without requiring fake dates |
| Editable requirements / plans from UI | Users want to mark progress directly from the dashboard | Violates the "UI is read-only, CLI/chat creates documents" constraint from PROJECT.md. Creates state drift between UI and filesystem. | Chat interface is the write path. Dashboard is strictly read-only. |
| Per-plan time estimates | Metadata that feels useful | Not tracked in the `.planning/` structure. Would require schema extension. | Plan count / completion ratio is the right proxy. |
| Dependency graph visualization | "Show me which phases depend on which" | GSD phases are always sequential. A dependency graph of a linear list is a list. Adds layout complexity for zero insight. | Sequential numbering (Phase 1, 2, 3...) plus the "Depends on" field in each phase header is sufficient. |
| Multi-project phase comparison | "Show all Phase 3s across my 5 projects" | Complex aggregation query. Niche use case. Context-switches between projects break the single-active-project mental model. | One project at a time. The project switcher handles this. |

---

## Feature Dependencies

```
[Plugin System — App Shell Restructure]
    ├──required by──> [Chat Interface as plugin-contributed view]
    ├──required by──> [Phase Dashboard as plugin-contributed view]
    └──required by──> [GSD Plugin (doc viewer + execution + file watcher re-registration)]

[Phase 3: Agent SDK + Streaming] (BUILT)
    └──extended by──> [Chat backend route]
        └──provides──> [Token streaming to frontend]
            └──required by──> [Chat message thread UI]
                ├──required by──> [GSD slash command integration]
                └──required by──> [Session persistence]

[Phase 1: Backend session registry] (BUILT)
    └──extended by──> [Chat session re-attachment]

[Phase 2: WebSocket infrastructure] (BUILT)
    ├──reused by──> [Chat streaming fan-out]
    └──reused by──> [STATE.md live updates for dashboard]

[Phase 1: .planning/ parser + REST API] (BUILT)
    └──extended by──> [Phase dashboard data (phases, plans, STATE.md)]

[Streamdown streaming markdown renderer]
    └──blocks──> [Chat interface shipping — MUST resolve before chat is usable]

[IndexedDB / Dexie.js]
    └──required by──> [Session persistence — CHAT-03]
    └──new dependency (not in current stack)]

[SDK slash_commands from init message]
    └──required by──> [GSD slash command integration — CHAT-04]
    └──required by──> [Slash command autocomplete]
    └──integration point: Phase 3 backend must capture and relay init message to frontend]
```

### Dependency Notes

- **Plugin system first:** Chat and phase dashboard should be plugin-contributed views. If the plugin system is not built first, chat and dashboard land directly in App.tsx (acceptable short-term) and must be extracted later. Building plugin-first avoids the extraction rework. However: if plugin system design stalls, chat and dashboard can ship in App.tsx and be wrapped in the plugin boundary afterward. Do not block shipping on plugin system perfection.
- **Streamdown blocks chat:** CHAT-05 (no raw syntax flash during streaming) is the hardest technical problem in the chat feature set. It must be resolved before chat ships. Streamdown is purpose-built for this and is the correct choice. Do not attempt a custom streaming parser.
- **GSD slash commands require SDK init message relay:** The Agent SDK emits `slash_commands` on session init. The chat backend must capture this event and relay it to the frontend (via WebSocket or REST). This is a new integration point between Phase 3's backend service and Phase 4's chat backend.
- **IndexedDB adds a new dependency:** Dexie.js (~26KB gzipped) is the recommended IndexedDB wrapper. localStorage is insufficient for chat history at scale. This must be added to the frontend package.json.
- **Phase dashboard has zero new backend infrastructure requirements:** It reads data the backend already exposes (phases from ROADMAP.md parser, STATE.md content). The only backend addition is a STATE.md frontmatter parse endpoint (or a new field on the existing project data response). Lowest-risk feature in this milestone.

---

## MVP Definition

This is a subsequent milestone. "MVP" means: what ships in which phase, and what is explicitly deferred.

### Phase 4: Chat Interface — Ship With

- [x] Message thread UI (user/assistant turns, auto-scroll, loading indicator) — CHAT-01
- [x] Streaming token display via existing WebSocket fan-out — CHAT-02
- [x] Streaming markdown via Streamdown — CHAT-05
- [x] Text input bar (Ctrl+Enter to send, auto-resize, disabled during stream) — CHAT-01
- [x] GSD slash command integration (`/gsd:new-project`, `/gsd:plan-phase`, etc.) — CHAT-04
- [x] Slash command autocomplete from SDK init message
- [x] Session persistence (IndexedDB via Dexie.js for history, localStorage for session ID) — CHAT-03

### Phase 4: Chat Interface — Explicitly Defer

- [ ] Multiple concurrent sessions — CHAT-07 (v2 requirements, deferred in REQUIREMENTS.md)
- [ ] Tool call visualization — CHAT-06 (v2 requirements, deferred in REQUIREMENTS.md)
- [ ] Past sessions history panel — add only if time permits after P1 features complete

### Phase 5: Phase Dashboard — Ship With

- [x] Phase timeline with status badges (done / in-progress / not-started) — PHASE-01
- [x] Plan detail expand/collapse — PHASE-02
- [x] Requirement coverage tags per phase — PHASE-03
- [x] Live STATUS card from STATE.md frontmatter with file watcher updates — PHASE-04
- [x] Progress percentage bar on STATUS card
- [x] Jump-to-document links from plan names (reuses Phase 2 doc viewer)
- [x] Completion count badge per phase (e.g., "3/5 plans")

### Phase 5: Phase Dashboard — Explicitly Defer

- [ ] Phase dependency graph — phases are sequential; graph adds complexity for no insight
- [ ] Blocked/at-risk status propagation — no per-phase blocker tracking in current STATE.md schema
- [ ] Diff-from-last-session view — high complexity for marginal value

### Plugin System — Threaded Through Phases 4 and 5

The plugin system is not a standalone phase. It ships as the first task of the new milestone: app shell restructure and `PluginDefinition` interface. Then chat plugs in as a GSD plugin view. Then phase dashboard plugs in. Compile-time only.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| App shell plugin refactor (PluginDefinition + slots) | HIGH — enables everything | MEDIUM | P1 |
| Chat message thread + streaming display | HIGH — core interaction model | MEDIUM | P1 |
| Streamdown streaming markdown | HIGH — chat is broken without it | LOW (use library) | P1 |
| GSD slash command integration | HIGH — core value proposition | HIGH | P1 |
| Session persistence (IndexedDB / Dexie.js) | HIGH — chat feels broken without it | MEDIUM | P1 |
| Phase timeline with status badges | HIGH — core dashboard value | LOW | P1 |
| Live STATUS card from STATE.md | HIGH — most useful single widget | MEDIUM | P1 |
| Plan detail expand/collapse | MEDIUM — needed to understand phases | LOW | P2 |
| Requirement coverage tags | MEDIUM — traceability value | MEDIUM | P2 |
| Slash command autocomplete | MEDIUM — UX polish | LOW | P2 |
| Progress bar on STATUS card | MEDIUM — instant readability | LOW | P2 |
| Jump-to-document from plan name | MEDIUM — zero infrastructure cost | LOW | P2 |
| Plugin event hooks | LOW — only GSD uses them now | MEDIUM | P2 |
| Plugin data providers | LOW — only GSD uses them now | MEDIUM | P2 |
| Plugin command palette entries | LOW — nice but not required | LOW | P3 |
| Session history selector panel | LOW — single session is fine | MEDIUM | P3 |
| Tool call visualization (CHAT-06) | MEDIUM — useful for observability | HIGH | P3 (v2) |
| Multiple concurrent sessions (CHAT-07) | LOW | HIGH | P3 (v2) |

**Priority key:**
- P1: Must ship in this milestone
- P2: Should have, add when capacity allows in same milestone
- P3: Explicitly deferred to future milestone

---

## Competitor Feature Analysis

| Feature | Claude.ai | Cursor Chat | VS Code Extensions | Our Approach |
|---------|-----------|-------------|-------------------|--------------|
| Streaming markdown | Smooth, full-featured | Code-focused, smooth | N/A | Streamdown — purpose-built for AI streaming, handles incomplete blocks |
| Tool use display | Inline collapsible | Inline with file diffs | Extension webviews | Defer to v2. Simple "working..." indicator. |
| Session persistence | Full history, server-side | Workspace-scoped | Extension state API | IndexedDB (Dexie.js) client-side + server session ID for re-attachment |
| Slash commands | No | /command patterns for IDE ops | Contributes commands | GSD slash commands via SDK init message; autocomplete from `slash_commands` list |
| Plugin / extension system | Closed | Closed | Full API (contributes, events, activation) | Compile-time registration, named slots, event hooks — simpler than VS Code, sufficient for personal tool |
| Phase / project status timeline | None | None | None (Jira via extension) | Phase timeline + STATUS card — differentiating; nothing in this category exists in Claude.ai or Cursor |
| Requirement traceability | None | None | None | PHASE-03 requirement coverage tags — GSD-specific, unique |

---

## Sources

- [Claude Agent SDK — Slash Commands (official docs)](https://platform.claude.com/docs/en/agent-sdk/slash-commands) — HIGH confidence. Verified: `slash_commands` in system init message, `/compact` and `/clear` built-ins, custom commands via `.claude/commands/`. Used directly to design CHAT-04 integration.
- [Streamdown — Vercel open source streaming markdown renderer](https://vercel.com/changelog/introducing-streamdown) — HIGH confidence. Purpose-built for AI streaming. Handles incomplete markdown blocks. Drop-in react-markdown replacement. Correct choice for CHAT-05.
- [assistant-ui — React AI chat component patterns](https://github.com/assistant-ui/assistant-ui) — MEDIUM confidence. Reference for table-stakes patterns (auto-scroll, streaming, tool call rendering). Not adopting directly — existing shadcn/ui + rAF pattern is proven.
- [VS Code Extension API — Contribution Points](https://code.visualstudio.com/api/extension-capabilities/overview) — HIGH confidence (official docs). Design reference for the plugin contributes pattern (commands, views, slots, activation events). GSD plugin system is a simplified version of this.
- [IndexedDB vs localStorage for chat history](https://dev.to/armstrong2035/9-differences-between-indexeddb-and-localstorage-30ai) — MEDIUM confidence. Multiple sources agree: use IndexedDB (Dexie.js wrapper) for message history; localStorage only for session ID. localStorage corruption risk and 5MB cap documented.
- App.tsx, appStore.ts, REQUIREMENTS.md, ROADMAP.md, STATE.md, PROJECT.md, MILESTONES.md — HIGH confidence (primary source, read directly from codebase).

---

*Feature research for: GSD Dashboard v2.0 — plugin system, chat interface, phase dashboard*
*Researched: 2026-03-01*
