# Phase 2: Frontend + Document Viewer - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

React SPA where users register projects, switch between them, browse .planning/ files as rendered markdown, and see the dashboard auto-update when files change on disk. No chat, no agent execution, no phase visualization beyond the overview — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Visual aesthetic (based on cc-manager reference UI at /Users/bradley/Code/cc-manager/public/index.html)
- **Primary reference: cc-manager screenshot** — match its exact dark theme, layout density, and feel
- JetBrains Mono as the sole font (all text — headings, body, labels, code)
- Color palette: `--bg: #0e0e10`, `--bg2: #111114`, `--bg3: #151518`, `--bg4: #1a1a1e`, `--border: #1e1e22`, `--border2: #2a2a2e`, `--text: #e8e4de`, `--accent: #c8ff00` (lime-yellow, NOT green)
- Status colors: green `#4ade80` (active), yellow `#facc15` (paused/in-progress), blue `#60a5fa` (completed), red `#f87171` (error)
- Badge style: pill-shaped with colored tinted backgrounds (e.g. `#1a3a2a` bg + `#4ade80` text for active)
- Compact information density — developer tool feel, not spacious consumer app
- 10px border radius on cards/containers, 8px on inputs/buttons, 20px on badges
- Subtle 6px custom scrollbars, `#333` thumbs
- Buttons: primary = accent bg + dark text, secondary = `--border2` bg, ghost = transparent, all 600 weight

### Dashboard layout (mirrors cc-manager structure)
- Fixed header bar: logo (gradient accent badge) + app title (accent-highlighted keyword) + stats subtitle + right-side actions (Settings ghost btn + "New Project" primary btn)
- Left sidebar (340px fixed, not collapsible): search input with icon, filter bar (All/Active/Paused/Completed/Archived pill buttons), scrollable project list below
- Project list items: name + status badge, file path, session/meta counts — selected state with border highlight
- Main content area: project detail header with title, status, path, description, tags — then content below
- Empty state: centered icon + "Select a project" + subtext when no project selected
- Modal system: overlay with backdrop blur, 520px modal with header/body/footer sections
- Toast notifications: fixed bottom-right, slide-up animation, tinted backgrounds matching status colors
- Clicking a phase from overview navigates to the document viewer filtered to that phase's directory

### Document viewer
- Full filesystem tree representation of .planning/ directory — collapsible folders, VS Code explorer style
- Top-level files (ROADMAP.md, STATE.md, etc.) shown first, then phases/ with subdirectories
- GitHub-flavored markdown rendering — tables, task lists, fenced code blocks with syntax highlighting
- Breadcrumb bar for path context (phases > 01-backend > 01-01-PLAN.md), no heading TOC
- Subtle status indicators next to plan files in the tree: green dot for complete (has SUMMARY), yellow for in-progress, no indicator for static files

### Live update behavior
- Everything updates live via WebSocket — overview page, document viewer, and file tree
- Changed files get a brief highlight/glow in the file tree (like git status coloring)
- Document content refreshes silently in-place when the viewed file changes
- New files appear in tree automatically WITH a toast notification ("New file: 02-01-PLAN.md")
- Scroll position preserved when document updates mid-read
- "New content above" indicator when content is added above the viewport — click to scroll up

### Claude's Discretion
- Animation/transition timing and easing (cc-manager uses 0.15s for most, 0.3s for toasts)
- Loading skeleton design
- Error state handling and empty state illustrations
- Command palette scope beyond project switching (future phases may expand it)
- Syntax highlighting theme (should complement the lime-accent/dark palette)
- WebSocket reconnection strategy and debounce timing for rapid file changes

</decisions>

<specifics>
## Specific Ideas

- cc-manager (at /Users/bradley/Code/cc-manager/public/index.html) is the primary visual reference — replicate its dark theme, layout density, and component patterns
- File tree highlights should feel like git status indicators — brief, informative, not distracting
- Phase click from overview should feel like drilling down, not navigating to a separate app
- Command palette (Cmd+K) should feel native and instant — not a modal dialog

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/types/index.ts`: Shared types (Project, Phase, ProjectState, ProjectOverview, ApiError, SessionRecord) — frontend can import directly
- Backend REST API already serves all needed data: projects CRUD, phases, state, overview, raw markdown docs

### Established Patterns
- Hono server with route modules (`routes/projects.ts`, `routes/docs.ts`, `routes/sessions.ts`)
- JSON error envelope pattern: `{ error: { code, message, details? } }`
- PlanningParser service: parses ROADMAP.md, STATE.md, PROJECT.md — returns structured data
- ProjectStore: JSON file persistence at `backend/data/projects.json`
- CORS pre-configured for Vite dev server (ports 5173, 5174)

### Integration Points
- Frontend connects to `http://localhost:3001/api/` for all data
- `GET /api/projects/:id/overview` — combined project + phases + state (ideal for overview page)
- `GET /api/projects/:id/docs/*` — raw markdown content for document viewer
- WebSocket needs to be added to backend (no existing WS infrastructure) — chokidar file watcher
- Shared types in `shared/types/` can be imported by both backend and frontend

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-frontend-document-viewer*
*Context gathered: 2026-03-01*
