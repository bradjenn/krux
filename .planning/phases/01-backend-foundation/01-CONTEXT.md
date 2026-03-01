# Phase 1: Backend Foundation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A running Hono server that serves project data via REST, manages agent sessions safely, and parses .planning/ files — ready for the frontend to build against. No frontend, no agent execution, no WebSocket streaming.

</domain>

<decisions>
## Implementation Decisions

### Project Persistence
- Store registered project paths in a JSON file (`projects.json`) inside the `backend/data/` directory
- Derive project display name from the directory name (e.g., `/Users/me/Code/my-app` → "my-app"), with optional user-provided display name override
- Validate that the registered path has a `.planning/` directory; reject registration if missing
- Frontend tracks the "active project" — server is stateless per-request, project ID sent with every API call (RESTful, supports multi-tab)

### .planning/ Parser Depth
- Structured parsing — backend extracts phase status, plan completion, and state data into typed JSON objects
- Reference parsing patterns from existing `gsd-tools.cjs` and replicate in TypeScript for format compatibility
- Serve both structured data AND raw markdown: `GET /api/projects/:id/phases` returns structured JSON, `GET /api/projects/:id/docs/:path` returns raw markdown content
- Phase 1 parser covers core files only: ROADMAP.md (phases, status, plans), STATE.md (current position), PROJECT.md (name, description). REQUIREMENTS.md and phase-level files deferred to later phases.

### Orphan Cleanup Strategy
- Kill orphaned Claude processes at server startup only (no periodic sweep)
- Use PID file tracking: server writes child PIDs to a `.gsd-pids` file, reads and kills stale PIDs on startup
- Graceful shutdown on SIGTERM: send abort signal to running agents, wait up to 5 seconds, then force kill
- Log cleanup actions to stdout (e.g., "Killed orphaned Claude process (PID 12345)")

### API Contract Design
- Consistent error envelope: `{ error: { code: "NOT_FOUND", message: "Project not found", details?: any } }` with appropriate HTTP status codes
- Shared TypeScript types between frontend and backend (shared `types/` directory in the monorepo)
- Unversioned API routes: `/api/projects`, not `/api/v1/projects` — personal tool, no backwards compatibility concerns
- Dev server port: Claude's discretion (pick something that avoids common conflicts)

### Claude's Discretion
- Dev server port selection
- Internal code organization within the architecture doc's recommended structure
- Middleware choices (CORS, logging, request parsing)
- Test framework setup and test structure
- Error code taxonomy (which specific error codes to define)

</decisions>

<specifics>
## Specific Ideas

- The existing `gsd-tools.cjs` has mature .planning/ parsing logic — study its ROADMAP.md parser for phase extraction patterns, STATE.md parser for current position, and the `init phase-op` function for how it resolves phase directories
- Architecture research doc recommends `backend/src/` with `routes/`, `services/`, `types/` directories — follow this structure
- Session registry in Phase 1 is just the data structure (Map) and CRUD — actual agent integration comes in Phase 3

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gsd-tools.cjs`: Contains parsers for ROADMAP.md, STATE.md, PROJECT.md — reference for format compatibility
- `gsd-tools.cjs init phase-op`: Shows how to resolve phase directories, check for plans, context, research
- `gsd-tools.cjs` roadmap parsing: Extracts phase names, status, plan counts, dependencies

### Established Patterns
- .planning/ directory structure is well-defined: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md at root; `phases/XX-name/` subdirectories
- Markdown files use consistent patterns: checkbox lists for status (`- [ ]` / `- [x]`), `**Bold:**` for metadata, tables for traceability
- Phase directories follow `NN-slug-name` convention (e.g., `01-backend-foundation`)

### Integration Points
- Backend reads the same `.planning/` files that GSD CLI creates — must parse identically
- Project paths point to existing repos that have `.planning/` directories created by `gsd-tools.cjs`
- cc-manager is a standalone repo (extracted from GSD repo's ui/ directory)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-backend-foundation*
*Context gathered: 2026-03-01*
