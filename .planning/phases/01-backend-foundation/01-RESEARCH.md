# Phase 1: Backend Foundation - Research

**Researched:** 2026-03-01
**Domain:** Hono REST API, Node.js process lifecycle, .planning/ markdown parsing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Project Persistence**
- Store registered project paths in a JSON file (`projects.json`) inside the `backend/data/` directory
- Derive project display name from the directory name (e.g., `/Users/me/Code/my-app` → "my-app"), with optional user-provided display name override
- Validate that the registered path has a `.planning/` directory; reject registration if missing
- Frontend tracks the "active project" — server is stateless per-request, project ID sent with every API call (RESTful, supports multi-tab)

**Parser Depth**
- Structured parsing — backend extracts phase status, plan completion, and state data into typed JSON objects
- Reference parsing patterns from existing `gsd-tools.cjs` and replicate in TypeScript for format compatibility
- Serve both structured data AND raw markdown: `GET /api/projects/:id/phases` returns structured JSON, `GET /api/projects/:id/docs/:path` returns raw markdown content
- Phase 1 parser covers core files only: ROADMAP.md (phases, status, plans), STATE.md (current position), PROJECT.md (name, description). REQUIREMENTS.md and phase-level files deferred to later phases.

**Orphan Cleanup Strategy**
- Kill orphaned Claude processes at server startup only (no periodic sweep)
- Use PID file tracking: server writes child PIDs to a `.gsd-pids` file, reads and kills stale PIDs on startup
- Graceful shutdown on SIGTERM: send abort signal to running agents, wait up to 5 seconds, then force kill
- Log cleanup actions to stdout (e.g., "Killed orphaned Claude process (PID 12345)")

**API Contract Design**
- Consistent error envelope: `{ error: { code: "NOT_FOUND", message: "Project not found", details?: any } }` with appropriate HTTP status codes
- Shared TypeScript types between frontend and backend (shared `types/` directory in the monorepo)
- Unversioned API routes: `/api/projects`, not `/api/v1/projects`
- Dev server port: Claude's discretion

### Claude's Discretion
- Dev server port selection
- Internal code organization within the architecture doc's recommended structure
- Middleware choices (CORS, logging, request parsing)
- Test framework setup and test structure
- Error code taxonomy (which specific error codes to define)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | User can register project paths to the dashboard | `POST /api/projects` endpoint; validate .planning/ dir exists; persist to projects.json; see Projects Storage pattern |
| PROJ-02 | User can remove registered projects | `DELETE /api/projects/:id` endpoint; remove from projects.json; see Projects Storage pattern |
| PROJ-03 | User can switch between registered projects | `GET /api/projects/:id/phases`, `GET /api/projects/:id/docs/:path`; stateless per-request via project ID; see .planning/ Parser section |

Note: These requirements are fully implemented in Phase 1 at the data layer. Phase 2 adds the browser-facing UI. The backend APIs built here are what Phase 2's frontend builds against.
</phase_requirements>

---

## Summary

Phase 1 builds a Hono Node.js server with REST endpoints, a .planning/ file parser, a session registry data structure, and orphan process cleanup. The technical domain is well-understood — Hono 4.12 is stable and thoroughly documented, Node.js process signal handling is a solved problem, and the .planning/ parsing patterns already exist in `gsd-tools.cjs` and need only be replicated in TypeScript.

The two design areas requiring the most care are (1) the .planning/ parser, which must produce output identical in structure to what `gsd-tools.cjs` produces (future phases will depend on this contract), and (2) the process lifecycle management, which must be correct from day one — the orphan cleanup problem confirmed in GitHub issue #142 (47 orphaned processes, ~3GB RAM after 24h) cannot be retrofitted later without redesigning the session management layer.

The session registry in Phase 1 is a pure data structure (a `Map<string, SessionRecord>`). No actual agent invocation happens in this phase. The registry is established here so that Phase 3 (agent SDK integration) can write to it without architectural changes.

**Primary recommendation:** Build `backend/` as a standalone Node.js package with Hono, tsx for dev, and direct `fs` module for projects.json persistence. Keep services thin and testable. Reference `gsd-tools.cjs` roadmap.cjs and state.cjs parsing regex patterns directly when building the TypeScript parser.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | 4.12.x | HTTP framework for REST endpoints | Ultralight, TypeScript-first, web-standard APIs; explicitly chosen in project decisions |
| @hono/node-server | 1.x | Node.js HTTP adapter for Hono | Required — Hono core targets Web Standards; this adapter bridges to Node.js HTTP server |
| typescript | 5.x | Type safety throughout | Required for shared types contract with frontend; strict mode needed |
| tsx | latest | TypeScript runner for Node.js dev | No separate compile step in dev; `--watch` replaces nodemon+ts-node combo |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hono/cors | (built-in) | CORS middleware | Required — browser frontend on different port will fail preflight without it |
| hono/logger | (built-in) | Request logging | Use in dev; helps debug route problems |
| node:fs | (built-in) | projects.json read/write | Native fs is sufficient for a single JSON file; no library needed |
| node:path | (built-in) | Path manipulation | Resolving .planning/ paths cross-platform |
| node:process | (built-in) | PID existence check (`process.kill(pid, 0)`) | Used only in orphan cleanup; no spawning in Phase 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fs.writeFileSync` | `write-file-atomic` npm package | Atomic writes prevent corruption on crash; for a single-user local tool writing a small JSON file, native fs + rename is sufficient |
| tsx | ts-node | tsx is faster (no type-checking overhead in dev), simpler setup, built-in watch mode; ts-node requires `tsconfig.json` tuning |
| tsx | Native Node.js --experimental-strip-types | Node 22+ has native TS support but it's still experimental; tsx is more stable for project use |

**Installation:**
```bash
# From the backend/ directory (new package)
npm install hono @hono/node-server
npm install -D tsx typescript @types/node
```

---

## Architecture Patterns

### Recommended Project Structure

```
├── backend/                    # Hono Node.js server (new package)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── projects.ts     # GET/POST/DELETE /api/projects, /api/projects/:id/phases
│   │   │   └── docs.ts         # GET /api/projects/:id/docs/:path
│   │   ├── services/
│   │   │   ├── projectStore.ts    # projects.json CRUD (read/write/validate)
│   │   │   ├── planningParser.ts  # ROADMAP.md, STATE.md, PROJECT.md structured parse
│   │   │   └── sessionRegistry.ts # Map<sessionId, SessionRecord> CRUD (data only)
│   │   ├── types/
│   │   │   └── index.ts           # Project, Phase, Plan, PlanningDoc, SessionRecord, ApiError
│   │   ├── lib/
│   │   │   └── processLifecycle.ts # PID file read/write, orphan kill on startup, SIGTERM handler
│   │   └── index.ts               # Hono app setup, middleware, route mounting, server start
│   ├── data/
│   │   └── .gitkeep               # projects.json and .gsd-pids live here at runtime
│   ├── package.json
│   └── tsconfig.json
│
└── shared/
    └── types/
        └── index.ts            # Types shared between frontend and backend (Phase 2 dependency)
```

The `shared/types/` directory is created in Phase 1 even though the frontend doesn't exist yet — it establishes the contract the frontend will build against in Phase 2.

### Pattern 1: Hono Server Setup

**What:** Hono app with middleware, route mounting, and a `serve()` call with SIGTERM cleanup.

**When to use:** This is the entry point (`src/index.ts`). All middleware and route mounting happens here.

**Example:**
```typescript
// Source: https://hono.dev/docs/getting-started/nodejs
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { projectsRoute } from './routes/projects.js'
import { docsRoute } from './routes/docs.js'
import { cleanupOrphans, setupSigtermHandler } from './lib/processLifecycle.js'

// Run orphan cleanup before accepting any requests
await cleanupOrphans()

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('/api/*', cors({ origin: 'http://localhost:5173' })) // Vite dev server default

// Routes
app.route('/api/projects', projectsRoute)
app.route('/api', docsRoute)

// Global error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500)
})

const PORT = 3001 // avoids conflict with common 3000, 8080, 5173 (Vite)

// Register signal handlers inside the serve callback — after server is confirmed listening
const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`GSD backend running on http://localhost:${info.port}`)
  setupSigtermHandler(server)
})
```

**Port choice rationale (Claude's discretion):** Port 3001 avoids conflicts with Vite's default 5173, common dev servers on 3000, and Hono's example port 8787. Configurable via `PORT` environment variable.

### Pattern 2: Route Handler (Thin Handler, Service Call)

**What:** Route handlers stay thin — they parse the request, call a service function, and return the response. All business logic lives in services. This is the official Hono best practice.

**When to use:** Every route file follows this pattern.

**Example:**
```typescript
// Source: https://hono.dev/docs/guides/best-practices
// src/routes/projects.ts
import { Hono } from 'hono'
import { ProjectStore } from '../services/projectStore.js'
import { PlanningParser } from '../services/planningParser.js'
import type { ApiError } from '../types/index.js'

export const projectsRoute = new Hono()

projectsRoute.get('/', (c) => {
  const projects = ProjectStore.list()
  return c.json(projects)
})

projectsRoute.post('/', async (c) => {
  const body = await c.req.json()
  const result = ProjectStore.add(body.path, body.displayName)
  if (!result.ok) {
    return c.json<ApiError>({ error: { code: result.code, message: result.message } }, 400)
  }
  return c.json(result.project, 201)
})

projectsRoute.delete('/:id', (c) => {
  const id = c.req.param('id')
  const ok = ProjectStore.remove(id)
  if (!ok) {
    return c.json<ApiError>({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404)
  }
  return c.body(null, 204)
})

projectsRoute.get('/:id/phases', (c) => {
  const id = c.req.param('id')
  const project = ProjectStore.get(id)
  if (!project) {
    return c.json<ApiError>({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404)
  }
  const phases = PlanningParser.parseRoadmap(project.path)
  return c.json(phases)
})
```

### Pattern 3: projects.json Storage

**What:** A single JSON file at `backend/data/projects.json` holds the array of registered projects. Read on every request (file is tiny; OS caches it). Write using a write-then-rename pattern for safety.

**Why no library:** For a single-user local tool writing a <10KB JSON file, native `node:fs` is sufficient.

**Example:**
```typescript
// src/services/projectStore.ts
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Project } from '../types/index.js'

const DATA_DIR = path.join(import.meta.dirname, '../../data')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')

function readProjects(): Project[] {
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
  } catch {
    return []  // Returns [] on ENOENT (first run) or parse error
  }
}

function writeProjects(projects: Project[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = PROJECTS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(projects, null, 2), 'utf-8')
  fs.renameSync(tmp, PROJECTS_FILE)  // rename() is atomic on POSIX
}

export const ProjectStore = {
  list: () => readProjects(),
  get: (id: string) => readProjects().find(p => p.id === id) ?? null,
  add(projectPath: string, displayName?: string) {
    const resolved = path.resolve(projectPath)
    if (!fs.existsSync(path.join(resolved, '.planning'))) {
      return { ok: false as const, code: 'INVALID_PATH', message: 'Path has no .planning/ directory' }
    }
    const projects = readProjects()
    if (projects.some(p => p.path === resolved)) {
      return { ok: false as const, code: 'ALREADY_EXISTS', message: 'Project already registered' }
    }
    const name = displayName ?? path.basename(resolved)
    const project: Project = { id: randomUUID(), path: resolved, name }
    writeProjects([...projects, project])
    return { ok: true as const, project }
  },
  remove(id: string): boolean {
    const projects = readProjects()
    const next = projects.filter(p => p.id !== id)
    if (next.length === projects.length) return false
    writeProjects(next)
    return true
  },
}
```

**Note:** `import.meta.dirname` requires `"type": "module"` in package.json. For CommonJS, use `__dirname` instead.

### Pattern 4: .planning/ Parser (Replicate gsd-tools.cjs Patterns)

**What:** TypeScript functions that parse ROADMAP.md, STATE.md, and PROJECT.md using the same regex patterns from `gsd-tools.cjs`. Produces typed objects matching the format the frontend will consume.

**Critical:** The parsing output must be structurally compatible with what `gsd-tools.cjs` already produces. Study the existing patterns closely before writing the TypeScript version.

**Key patterns from gsd-tools.cjs to replicate:**

```typescript
// Source: gsd-tools.cjs lib/roadmap.cjs (cmdRoadmapAnalyze function)

// Phase header pattern — matches "## Phase N: Name" and "### Phase N: Name"
const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:\s*([^\n]+)/gi

// Goal extraction from section
const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i)

// Depends on extraction
const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i)

// Checkbox status — "[x]" = complete, "[ ]" = pending
const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${escapedPhase}`, 'i')

// Plan file detection
const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md')
const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md')

// disk_status logic (in order of precedence):
// summaryCount >= planCount && planCount > 0 → 'complete'
// summaryCount > 0                            → 'partial'
// planCount > 0                               → 'planned'
// hasResearch                                 → 'researched'
// hasContext                                  → 'discussed'
// directory exists but empty                  → 'empty'
// no directory found                          → 'no_directory'

// Source: gsd-tools.cjs lib/state.cjs
// Bold field extraction: **FieldName:** value
const fieldPattern = new RegExp(`\\*\\*${escapedField}:\\*\\*\\s*(.*)`, 'i')

// Section extraction: ## SectionName
const sectionPattern = new RegExp(`##\\s*${escapedSection}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, 'i')
```

**Typed output shapes for Phase 1:**
```typescript
// shared/types/index.ts

export interface Project {
  id: string
  path: string      // absolute path to project root
  name: string      // basename or user-provided display name
}

export interface Phase {
  number: string    // "1", "2", "2.1" etc.
  name: string      // "Backend Foundation"
  goal: string | null
  depends_on: string | null
  plan_count: number
  summary_count: number
  disk_status: 'no_directory' | 'empty' | 'discussed' | 'researched' | 'planned' | 'partial' | 'complete'
  roadmap_complete: boolean
}

export interface ProjectState {
  phase: string | null
  plan: string | null
  status: string | null
  progress: string | null
}

export interface ProjectOverview {
  project: Project
  phases: Phase[]
  state: ProjectState
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Phase 1 session registry — data structure only, no agent logic
export interface SessionRecord {
  id: string
  projectId: string
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled'
  createdAt: number
  // Phase 3 will add: sdkSessionId, generator, messages
}
```

### Pattern 5: Process Lifecycle Management

**What:** On server startup, read `.gsd-pids` file, check each PID for existence using `process.kill(pid, 0)`, kill any that still exist with SIGTERM. On SIGTERM, send SIGTERM to all tracked PIDs, wait 5 seconds, then SIGKILL any remaining, then close the server.

**Phase 1 note:** In Phase 1, no actual Claude processes are spawned — the cleanup mechanism is set up and validated here. The PID file write logic is added in Phase 3 when agent spawning begins.

**Example:**
```typescript
// src/lib/processLifecycle.ts
import fs from 'node:fs'
import path from 'node:path'
import type { Server } from 'node:http'

const DATA_DIR = path.join(import.meta.dirname, '../../data')
const PID_FILE = path.join(DATA_DIR, '.gsd-pids')

function readPids(): number[] {
  try {
    return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0)  // signal 0 = existence check only, does not kill
    return true
  } catch {
    return false
  }
}

export async function cleanupOrphans(): Promise<void> {
  if (!fs.existsSync(PID_FILE)) return

  const pids = readPids()
  let killed = 0

  for (const pid of pids) {
    if (pidExists(pid)) {
      try {
        process.kill(pid, 'SIGTERM')
        console.log(`Killed orphaned Claude process (PID ${pid})`)
        killed++
      } catch {
        // Process disappeared between the existence check and kill — ignore
      }
    }
  }

  // Always clear PID file after cleanup sweep
  try { fs.unlinkSync(PID_FILE) } catch { /* already gone */ }

  if (killed > 0) {
    console.log(`Orphan cleanup complete: killed ${killed} process(es)`)
  }
}

export function setupSigtermHandler(server: Server): void {
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down...`)

    const pids = readPids()

    // Phase 1: SIGTERM to all tracked PIDs
    for (const pid of pids) {
      try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
    }

    // Wait up to 5 seconds, then SIGKILL any survivors
    const forceKillTimer = setTimeout(() => {
      for (const pid of pids) {
        if (pidExists(pid)) {
          try { process.kill(pid, 'SIGKILL') } catch { /* already gone */ }
        }
      }
      server.close(() => process.exit(0))
    }, 5000)

    // Don't keep process alive just for this timer
    forceKillTimer.unref()

    server.close(() => {
      clearTimeout(forceKillTimer)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
```

### Pattern 6: Session Registry (Data Structure Only)

**What:** An in-memory `Map<string, SessionRecord>` singleton. Phase 1 establishes the CRUD interface. Phase 3 populates it with live sessions.

**Example:**
```typescript
// src/services/sessionRegistry.ts
import { randomUUID } from 'node:crypto'
import type { SessionRecord } from '../types/index.js'

const registry = new Map<string, SessionRecord>()

export const SessionRegistry = {
  create(projectId: string): SessionRecord {
    const session: SessionRecord = {
      id: randomUUID(),
      projectId,
      status: 'idle',
      createdAt: Date.now(),
    }
    registry.set(session.id, session)
    return session
  },
  get: (id: string) => registry.get(id) ?? null,
  update(id: string, patch: Partial<SessionRecord>): void {
    const existing = registry.get(id)
    if (existing) registry.set(id, { ...existing, ...patch })
  },
  delete: (id: string) => registry.delete(id),
  list: () => Array.from(registry.values()),
}
```

### Anti-Patterns to Avoid

- **Storing active project in server memory:** The decision is that the frontend sends the project ID with every request. Do not add a server-side "current project" concept — it breaks multi-tab support.
- **Parsing .planning/ files from scratch without studying gsd-tools.cjs:** The existing CJS parser has edge cases handled (decimal phase numbers, malformed ROADMAP, archived phases). Port the logic — do not reinvent it.
- **Registering SIGTERM handlers before the server is listening:** Call `setupSigtermHandler()` inside the `serve()` callback (after server confirms it's listening), not immediately after the `serve()` call.
- **Using `fs.writeFileSync(PROJECTS_FILE, ...)` directly:** The write-then-rename pattern (`writeFileSync(tmp)` + `renameSync(tmp, dest)`) protects against corruption if the process crashes mid-write.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP routing with TypeScript types | Custom router | Hono | Type inference prevents runtime errors; `app.route()` is clean and documented |
| CORS preflight headers | Manual header management | `hono/cors` | CORS edge cases (preflight caching, credentials, wildcard) are subtle |
| Markdown section extraction | Custom regex parser from scratch | Port patterns from `gsd-tools.cjs` | Existing parser handles decimal phases, malformed files, archived milestones |
| Process existence check | `/proc/${pid}/status` on Linux | `process.kill(pid, 0)` | Signal 0 is the standard POSIX pattern; works on macOS and Linux |
| TypeScript Node.js runner | ts-node + nodemon combo | tsx | One devDependency, built-in watch, no config file needed |

**Key insight:** The highest-risk custom solution in this phase is a .planning/ parser that diverges from `gsd-tools.cjs` patterns. Every future phase depends on the parser's output shape. Get it right by porting the existing regex patterns rather than redesigning.

---

## Common Pitfalls

### Pitfall 1: Parser Output Shape Mismatch with gsd-tools.cjs

**What goes wrong:** The TypeScript parser produces different field names or data shapes than `gsd-tools.cjs`. Future phases (Phase 5 especially) will parse the same files client-side and expect consistent shapes. The frontend's phase timeline will break silently if field names differ.

**Why it happens:** Developer writes the TypeScript parser from memory rather than directly studying the existing CJS parser's output.

**How to avoid:** Read `gsd-tools.cjs lib/roadmap.cjs` before writing a single line of TypeScript parsing code. Match field names exactly: `plan_count`, `summary_count`, `disk_status`, `roadmap_complete` — not camelCase equivalents.

**Warning signs:** If the TypeScript `Phase` type doesn't match the field names in `roadmap.cjs`'s `phases.push({...})` object, something is wrong.

### Pitfall 2: SIGTERM Handler Not Firing

**What goes wrong:** `server.close()` is called but cleanup code doesn't run, or signal handlers are registered at the wrong time (before the server starts listening).

**Why it happens:** `serve()` from `@hono/node-server` returns a server reference, but the server may not be fully listening yet when signal handlers are registered synchronously after the call.

**How to avoid:** Register signal handlers inside the `serve()` callback (the second argument), not after the `serve()` call returns. The callback fires after the server is confirmed listening.

**Warning signs:** SIGTERM causes an abrupt process exit with no cleanup log output; `server.close()` throws "Server is not running".

### Pitfall 3: projects.json Not Found on First Run

**What goes wrong:** `readProjects()` throws because `data/projects.json` doesn't exist yet. Every endpoint that reads the project list crashes on a fresh install.

**Why it happens:** No initialization logic creates the file on first run.

**How to avoid:** `readProjects()` must catch any file read error and return `[]`. `writeProjects()` must call `fs.mkdirSync(DATA_DIR, { recursive: true })` before writing.

**Warning signs:** `GET /api/projects` returns 500 on first run; error message mentions ENOENT.

### Pitfall 4: Orphan Cleanup Crashes on Stale PID File

**What goes wrong:** `.gsd-pids` contains PIDs from a previous run that no longer exist. `process.kill(pid, 'SIGTERM')` throws `ESRCH` (no such process). If uncaught, this crashes the server at startup before it accepts any requests.

**Why it happens:** The `try/catch` around the kill call is missing or the catch block re-throws.

**How to avoid:** Every `process.kill()` call must be wrapped in `try/catch` with the catch block doing nothing — a stale PID is expected and normal. After the cleanup loop, always delete the PID file.

**Warning signs:** Server crashes at startup with `ESRCH` error before logging "GSD backend running on...".

### Pitfall 5: CORS Blocking Frontend in Phase 2

**What goes wrong:** Phase 2 frontend (likely on `http://localhost:5173` with Vite) gets blocked by CORS when calling the backend on `http://localhost:3001`. All fetch calls fail with a CORS error.

**Why it happens:** CORS middleware was omitted or configured with the wrong origin.

**How to avoid:** Apply `cors()` middleware to all `/api/*` routes in Phase 1. Allow `http://localhost:5173` (Vite default). Use an environment variable for the allowed origin.

**Warning signs:** Browser console shows "blocked by CORS policy"; network tab shows OPTIONS requests returning 404.

### Pitfall 6: Phase Directory Detection Misses Decimal Phases

**What goes wrong:** Phase number normalization is wrong. Phase "1" should match directory `01-backend-foundation`, not `01-01-hono-scaffold` (a plan directory pattern if they existed at that level).

**Why it happens:** Overly simple string matching fails on phase number padding (`"1"` vs `"01"`) or decimal phases (`"2.1"` vs `"02.1"`).

**How to avoid:** Use `normalizePhaseName()` from `gsd-tools.cjs core.cjs`: `"1"` → `"01"`, `"2.1"` → `"02.1"`. Match directories with `startsWith(padded + '-')`. Only scan immediate children of `.planning/phases/`, not recursively.

**Warning signs:** `GET /api/projects/:id/phases` returns empty array even when phases exist on disk.

---

## Code Examples

Verified patterns from official sources and gsd-tools.cjs:

### Hono Route with Error Envelope

```typescript
// Source: https://hono.dev/docs/api/routing, locked error envelope from CONTEXT.md
projectsRoute.post('/', async (c) => {
  let body: { path?: string; displayName?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, 400)
  }
  if (!body.path) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'path is required' } }, 400)
  }
  const result = ProjectStore.add(body.path, body.displayName)
  if (!result.ok) {
    return c.json({ error: { code: result.code, message: result.message } }, 409)
  }
  return c.json(result.project, 201)
})
```

### ROADMAP.md Phase Extraction (TypeScript port)

```typescript
// Source: Ported from gsd-tools.cjs lib/roadmap.cjs cmdRoadmapAnalyze()
import fs from 'node:fs'
import path from 'node:path'
import type { Phase } from '../../shared/types/index.js'

export function parseRoadmap(projectPath: string): Phase[] {
  const roadmapPath = path.join(projectPath, '.planning', 'ROADMAP.md')
  if (!fs.existsSync(roadmapPath)) return []

  const content = fs.readFileSync(roadmapPath, 'utf-8')
  const phasesDir = path.join(projectPath, '.planning', 'phases')

  const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:\s*([^\n]+)/gi
  const phases: Phase[] = []
  let match: RegExpExecArray | null

  while ((match = phasePattern.exec(content)) !== null) {
    const phaseNum = match[1]
    const phaseName = match[2].replace(/\(INSERTED\)/i, '').trim()

    const sectionStart = match.index
    const restOfContent = content.slice(sectionStart)
    const nextHeader = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i)
    const sectionEnd = nextHeader ? sectionStart + (nextHeader.index ?? 0) : content.length
    const section = content.slice(sectionStart, sectionEnd)

    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i)
    const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i)

    // Normalize: "1" → "01", "2.1" → "02.1"  (matches gsd-tools.cjs normalizePhaseName)
    const padded = phaseNum.replace(/^(\d+)/, n => n.padStart(2, '0'))

    let disk_status: Phase['disk_status'] = 'no_directory'
    let plan_count = 0
    let summary_count = 0

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true })
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
      const dirMatch = dirs.find(d => d.startsWith(padded + '-') || d === padded)

      if (dirMatch) {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dirMatch))
        plan_count = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length
        summary_count = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length
        const hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md'))
        const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md'))

        if (summary_count >= plan_count && plan_count > 0) disk_status = 'complete'
        else if (summary_count > 0) disk_status = 'partial'
        else if (plan_count > 0) disk_status = 'planned'
        else if (hasResearch) disk_status = 'researched'
        else if (hasContext) disk_status = 'discussed'
        else disk_status = 'empty'
      }
    } catch { /* phases dir may not exist yet */ }

    const escapedPhase = phaseNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${escapedPhase}`, 'i')
    const checkboxMatch = content.match(checkboxPattern)

    phases.push({
      number: phaseNum,
      name: phaseName,
      goal: goalMatch ? goalMatch[1].trim() : null,
      depends_on: dependsMatch ? dependsMatch[1].trim() : null,
      plan_count,
      summary_count,
      disk_status,
      roadmap_complete: checkboxMatch ? checkboxMatch[1] === 'x' : false,
    })
  }

  return phases
}
```

### STATE.md Current Position Extraction

```typescript
// Source: Ported from gsd-tools.cjs lib/state.cjs cmdStateGet()
export function parseState(projectPath: string): ProjectState {
  const statePath = path.join(projectPath, '.planning', 'STATE.md')
  if (!fs.existsSync(statePath)) {
    return { phase: null, plan: null, status: null, progress: null }
  }

  const content = fs.readFileSync(statePath, 'utf-8')

  function getField(fieldName: string): string | null {
    const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = content.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.*)`, 'i'))
    return match ? match[1].trim() : null
  }

  return {
    phase: getField('Phase'),
    plan: getField('Plan'),
    status: getField('Status'),
    progress: getField('Progress'),
  }
}
```

### package.json Scripts for Backend

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx --watch src/index.ts",
    "start": "node --import tsx/esm src/index.ts",
    "build": "tsc --noEmit",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.12.0",
    "@hono/node-server": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "latest",
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node for TypeScript dev | tsx (no config, faster, built-in watch) | 2023+ | Simpler dev setup; `npm run dev` just works |
| nodemon + ts-node combo | tsx --watch single command | 2023+ | One devDependency instead of two |
| Express for Node.js APIs | Hono for TypeScript-first APIs | 2023-2024 | Better type inference, smaller bundle, same ergonomics |
| `process.on('exit', ...)` for cleanup | `process.on('SIGTERM', ...)` + `process.on('SIGINT', ...)` | Always | `exit` event fires too late for async cleanup; SIGTERM/SIGINT are correct |

**No deprecated patterns identified** for the Phase 1 stack. The Hono 4.12 + @hono/node-server + tsx combination is the current established approach as of early 2026.

---

## Open Questions

1. **ESM vs CommonJS for the backend package**
   - What we know: The existing `gsd-tools.cjs` is CommonJS; `@hono/node-server` works with both; tsx handles both
   - What's unclear: `"type": "module"` in `backend/package.json` affects import path extensions (`.js` required in ESM TypeScript) and `import.meta.dirname` vs `__dirname`
   - Recommendation: Use ESM (`"type": "module"`) — it's the modern standard and Hono examples use ESM imports. Requires `.js` extensions in TypeScript import paths. tsx handles this transparently in dev.

2. **Where `ui/` lives in the monorepo**
   - What we know: Architecture doc specifies `backend/` and `frontend/`; the GSD repo root is at `/Users/bradley/Code/get-shit-done`; `ui/` is not in the npm package `files` array
   - What's unclear: Git strategy — tracked on branch vs git-ignored
   - Recommendation: Create `ui/` at the project root; the STATE.md notes it "Lives on a branch for now" — work on a dedicated branch is appropriate

3. **Session registry ID in Phase 1 vs Phase 3**
   - What we know: Phase 3 will assign SDK-provided session IDs from `message.session_id` on init; Phase 1 only establishes the data structure
   - Recommendation: Use `randomUUID()` for `SessionRecord.id` in Phase 1. When Phase 3 adds SDK integration, add a `sdkSessionId: string | undefined` field without changing the existing `id` field. This matches the architecture doc's `AgentSession` shape exactly.

---

## Sources

### Primary (HIGH confidence)
- [Hono Getting Started: Node.js](https://hono.dev/docs/getting-started/nodejs) — Server setup, `serve()` API, port config, SIGTERM pattern — verified by direct fetch 2026-03-01
- [Hono API: Routing](https://hono.dev/docs/api/routing) — Route grouping with `app.route()`, path params, middleware order — verified by direct fetch 2026-03-01
- [Hono CORS Middleware](https://hono.dev/docs/middleware/builtin/cors) — `cors()` usage, origin configuration — verified by direct fetch 2026-03-01
- [Hono Logger Middleware](https://hono.dev/docs/middleware/builtin/logger) — `logger()` usage — verified by direct fetch 2026-03-01
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices) — Thin handler pattern, `app.route()` for scale — verified by direct fetch 2026-03-01
- [Node.js process docs](https://nodejs.org/api/process.html) — `process.kill(pid, 0)` existence check, SIGTERM/SIGKILL patterns — verified by direct fetch 2026-03-01
- [tsx Getting Started](https://tsx.is/getting-started) — Installation, package.json scripts, `--watch` mode — verified by direct fetch 2026-03-01
- `/Users/bradley/.claude/get-shit-done/bin/lib/roadmap.cjs` — Phase extraction regex, plan/summary detection, disk_status logic — read directly
- `/Users/bradley/.claude/get-shit-done/bin/lib/state.cjs` — `**Field:**` pattern extraction — read directly
- `/Users/bradley/.claude/get-shit-done/bin/lib/core.cjs` — `normalizePhaseName()`, directory scan patterns — read directly

### Secondary (MEDIUM confidence)
- [WebSearch: Node.js SIGTERM + process cleanup](https://nodejs.org/api/child_process.html) — Confirmed SIGTERM + SIGKILL fallback pattern; 5-second timeout is community standard
- [WebSearch: orphaned Node.js processes cleanup patterns](https://medium.com/@arunangshudas/5-tips-for-cleaning-orphaned-node-js-processes-196ceaa6d85e) — Confirmed PID file tracking approach
- [WebSearch: tsx 2025 best practices](https://dev.to/_staticvoid/how-to-run-typescript-natively-in-nodejs-with-tsx-3a0c) — tsx --watch as nodemon replacement confirmed

### Tertiary (LOW confidence)
None — all key claims verified via PRIMARY or SECONDARY sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Hono 4.12, tsx, @hono/node-server verified via official docs fetched 2026-03-01
- Architecture: HIGH — Route patterns from official Hono best practices; service layer from established patterns; structure from existing ARCHITECTURE.md research
- Parser patterns: HIGH — Read directly from gsd-tools.cjs source; regex patterns copied verbatim
- Process lifecycle: HIGH — Node.js `process.kill()` and signal handling from official Node.js docs
- Pitfalls: HIGH — Most pitfalls from direct code analysis; SIGTERM pitfall from official Hono pattern

**Research date:** 2026-03-01
**Valid until:** 2026-09-01 (stable libraries; Hono 4.x API is stable; Node.js signal handling is long-stable)
