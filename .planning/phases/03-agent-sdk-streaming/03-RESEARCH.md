# Phase 3: Agent SDK + Streaming - Research

**Researched:** 2026-03-01
**Domain:** Claude Agent SDK integration, WebSocket streaming fan-out, React streaming output display
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Execution Trigger**
- Execute button lives on each phase row in the project overview — contextual, not a separate panel
- Only the next executable phase shows the Execute button — enforces GSD's linear flow, prevents out-of-order execution
- Clicking Execute starts immediately — no confirmation dialog, the stop button is the safety net
- Auto-navigate to the streaming output panel on execution start, with a "Back to Overview" link (reuses existing BackToOverviewButton pattern from App.tsx)

**Streaming Output Display**
- Simple scrolling log viewer with ANSI color support — not a full terminal emulator (xterm.js), not structured blocks
- Split view: progress summary as a fixed header at top, streaming log output below in a scrollable area
- Auto-scroll follows new output by default; pauses when user scrolls up to read earlier output; "Jump to bottom" button appears to resume auto-scroll
- Distinct terminal feel — slightly darker/different background from rest of app, border glow while running, to make the output area feel "live" and distinct from static content
- Use rAF (requestAnimationFrame) buffering to prevent browser choke on fast output

**Progress Summary**
- Fixed header bar at top of execution panel showing phase name, plan progress, task progress, and current plan/task names
- Format: "Plan 2/4: Agent Service • Task 3/8: Create session registry" — medium info density with names, not just counts
- Segmented progress bar — one segment per plan, colored by status (green=done, blue=running, gray=pending)
- Plan completion/failure: segment color transitions (green/red with brief pulse animation) PLUS toast notification via existing Sonner pattern

**Stop & Abort**
- Stop button lives in the fixed progress header bar — always visible during execution, styled as a red/destructive action
- No confirmation required — click Stop, it stops immediately
- After stopping: output and progress bar freeze at last state, "Restart Phase" button appears (no resume, restart from scratch only)
- Agent errors (not user-stopped): red error banner in progress header ("Phase failed: [reason]"), full output preserved for debugging, Restart button available

### Claude's Discretion
- Session continuation implementation approach (SDK warm pool, persistent sessions, etc.)
- WebSocket channel design for streaming fan-out (extend existing /ws or new endpoint)
- Output buffer size limits and virtualization strategy
- ANSI color parsing library choice
- Exact spacing, typography, and animation details for the execution panel
- How to parse plan/task progress from agent output stream

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | User can trigger phase execution from the UI | Execute button in PhaseCard row; POST /api/execution/:phaseId; SDK query() call with cwd set to project path |
| EXEC-02 | User can stop/abort a running agent | AbortController passed to SDK query(); backend DELETE /api/execution/:sessionId calls query.close(); WS event fan-out notifies frontend |
| EXEC-03 | User sees progress summary (Plan N/M, Task X/Y) | Parse SDKAssistantMessage content for GSD plan/task markers; update Zustand executionStore; WS push to frontend |
| EXEC-04 | User can expand to see full streaming agent output | WS stream of output chunks; rAF-buffered append to log lines array; ansi_up renders ANSI codes to safe HTML spans in scrollable div |
</phase_requirements>

## Summary

Phase 3 integrates the `@anthropic-ai/claude-agent-sdk` (v0.2.63 as of research date) into the Hono backend to run GSD phase execution, stream output to the browser via the existing WebSocket infrastructure, and display a live execution panel in React. The three primary technical problems are: (1) running the SDK and capturing its async output stream server-side, (2) fan-outing that stream to connected browser clients over WebSocket without blocking, and (3) rendering fast-arriving output in the browser without choking React's render loop.

The SDK's `query()` function returns an async generator of typed `SDKMessage` objects — each message is either system init, assistant response, user message, result, or various status messages. The generator is naturally async-iterable, so the backend can `for await` it in a background async IIFE (not blocking the Hono request handler) and broadcast each chunk as a WS event. Abort is handled by passing an `AbortController` to the query options and calling `query.close()` from the stop endpoint.

The cold-start problem (12-second SDK process initialization per `query()` call) is a known architectural characteristic. The recommended Anthropic solution is streaming input mode / persistent sessions — but this is complex to maintain. For Phase 3's single-execution-at-a-time use case, accepting the 12-second first-start is acceptable because subsequent calls within a session resume warmly (~2-3s). Session continuation via `resume: sessionId` (passing the session ID from the `system:init` message) eliminates cold-start on follow-up executions.

**Primary recommendation:** Use `query()` with `AbortController` for clean abort, capture session ID from the `system:init` message for session resume, broadcast SDK messages as WS events with structured types, buffer output chunks in a ref and flush via `requestAnimationFrame` in React, and render ANSI with `ansi_up` (zero-dependency, browser-compatible, HTML-escapes before conversion).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.63 | Run Claude agent, capture streaming output | Only official Anthropic TypeScript SDK for agentic execution |
| `ansi_up` | 6.0.6 | Convert ANSI escape sequences to safe HTML spans | Zero dependencies, single ESM file, browser-native, HTML-escapes before ANSI conversion (XSS-safe by design) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-virtual` | ^3.x | Virtualize long output log lines | Use if log output exceeds ~5,000 lines (DOM count risk). Optional for Phase 3 — assess at implementation time |
| `sonner` | Already installed (^2.0.7) | Plan completion/failure toast notifications | Already in frontend — reuse existing pattern |
| `zustand` | Already installed (^5.0.11) | Execution state (current session, progress, log lines) | Already in frontend — extend appStore or create executionStore |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ansi_up` | `ansi-to-html` | `ansi-to-html` requires Node.js stream API, heavier; `ansi_up` is pure browser-compatible |
| `ansi_up` | `fancy-ansi` | `fancy-ansi` has a React component and Tailwind integration; heavier dependency for same output |
| rAF buffering | Throttle with `setTimeout` | rAF aligns to display refresh rate (60fps = 16.67ms), prevents jank; `setTimeout` drifts; use rAF |
| WS extension | SSE (Server-Sent Events) | SSE is unidirectional only (no stop signal from browser to server); WS already exists and supports bidirectional |

**Installation:**
```bash
# Backend (in backend/)
npm install @anthropic-ai/claude-agent-sdk

# Frontend (in frontend/)
npm install ansi_up
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
  routes/
    ws.ts              # Extend: add session-scoped WS events
    execution.ts       # NEW: POST /:phaseId, DELETE /:sessionId
    sessions.ts        # Existing: extend SessionRecord type
  services/
    sessionRegistry.ts # Extend: add abortController, sdkSessionId, phaseId fields
    agentRunner.ts     # NEW: wraps SDK query(), manages abort, streams to WS
  lib/
    processLifecycle.ts # Extend: register agent processes in PID tracking

frontend/src/
  components/
    overview/
      PhaseCard.tsx       # Extend: add Execute button for next executable phase
    execution/            # NEW directory
      ExecutionPanel.tsx  # Root panel: progress header + log viewer
      ProgressHeader.tsx  # Fixed bar: phase name, plan/task, stop button
      SegmentedBar.tsx    # Plan segments colored by status
      LogViewer.tsx       # Scrollable ANSI log output with rAF buffering
  stores/
    executionStore.ts     # NEW: Zustand store for active execution state
  hooks/
    useExecution.ts       # NEW: execution trigger, stop, WS event subscription
```

### Pattern 1: Backend Agent Runner (Non-blocking Execution)

**What:** The execution POST endpoint starts the SDK query in a background async IIFE and returns immediately with the session ID. The WS broadcast carries all output.

**When to use:** Always — never await the SDK query in the HTTP handler, or the request will timeout.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
// backend/src/services/agentRunner.ts

import { query } from '@anthropic-ai/claude-agent-sdk'
import { broadcast } from '../routes/ws.js'
import { SessionRegistry } from './sessionRegistry.js'

export function startAgentExecution(
  sessionId: string,
  projectPath: string,
  phasePrompt: string,
  resumeSessionId?: string,
): void {
  const ac = new AbortController()
  SessionRegistry.update(sessionId, { status: 'running', abortController: ac })

  // Fire-and-forget: return to caller immediately, run async in background
  void (async () => {
    try {
      const q = query({
        prompt: phasePrompt,
        options: {
          cwd: projectPath,
          abortController: ac,
          permissionMode: 'bypassPermissions',
          allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
          settingSources: ['project'],
          ...(resumeSessionId ? { resume: resumeSessionId } : {}),
        },
      })

      for await (const message of q) {
        if (message.type === 'system' && message.subtype === 'init') {
          SessionRegistry.update(sessionId, { sdkSessionId: message.session_id })
        }
        broadcast({ type: 'execution:message', sessionId, message })
      }

      SessionRegistry.update(sessionId, { status: 'done' })
      broadcast({ type: 'execution:complete', sessionId })
    } catch (err) {
      const reason = ac.signal.aborted ? 'cancelled' : 'error'
      SessionRegistry.update(sessionId, {
        status: reason === 'cancelled' ? 'cancelled' : 'error',
        error: err instanceof Error ? err.message : String(err),
      })
      broadcast({ type: 'execution:end', sessionId, reason, error: String(err) })
    }
  })()
}
```

### Pattern 2: Abort via AbortController

**What:** Stop endpoint retrieves the AbortController from the session registry and aborts it. The SDK `query()` respects the abort signal and terminates the subprocess.

**When to use:** For the Stop button action.

```typescript
// backend/src/routes/execution.ts
executionRoute.delete('/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId')
  const session = SessionRegistry.get(sessionId)
  if (!session || !session.abortController) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Session not found' } }, 404)
  }
  // Abort the AbortController — SDK propagates SIGTERM to its Claude subprocess
  session.abortController.abort()
  return new Response(null, { status: 204 })
})
```

### Pattern 3: rAF-Buffered Log Rendering (React)

**What:** Incoming WS chunks are pushed to a mutable buffer ref. A `requestAnimationFrame` loop drains the buffer into React state at display refresh rate (60fps). This prevents React from re-rendering on every single WS message (potentially hundreds/second).

**When to use:** Always for streaming log output — never call setState on each WS message directly.

Note on HTML rendering: `ansi_up.ansi_to_html()` HTML-escapes all content before processing ANSI codes. The output is safe to inject as inner HTML because angle brackets, quotes, and other HTML-special characters are escaped first. This is documented behavior of ansi_up, not a workaround.

```typescript
// Source: SitePoint "Streaming Backends & React: Controlling Re-render Chaos"
// frontend/src/components/execution/LogViewer.tsx

import { useEffect, useRef, useState } from 'react'
import AnsiUp from 'ansi_up'

const ansiUp = new AnsiUp()

export function LogViewer({ sessionId }: { sessionId: string }) {
  const [lines, setLines] = useState<string[]>([])
  const bufferRef = useRef<string[]>([])
  const rafRef = useRef<number>(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // WS subscription pushes to bufferRef (not state) — see useExecution hook
  // bufferRef.current.push(ansiUp.ansi_to_html(rawText))

  // Drain buffer to state on rAF cadence (~60fps)
  useEffect(() => {
    function flush() {
      if (bufferRef.current.length > 0) {
        const batch = bufferRef.current.splice(0)
        setLines((prev) => [...prev, ...batch])
      }
      rafRef.current = requestAnimationFrame(flush)
    }
    rafRef.current = requestAnimationFrame(flush)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [lines, autoScroll])

  return (
    <div
      className="overflow-y-auto h-full p-4 font-mono text-xs"
      style={{ background: 'var(--color-bg2)' }}
      onScroll={(e) => {
        const el = e.currentTarget
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
        setAutoScroll(atBottom)
      }}
    >
      {lines.map((htmlLine, i) => (
        // Safe: ansi_up HTML-escapes all content before ANSI processing
        <div key={i} dangerouslySetInnerHTML={{ __html: htmlLine }} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

### Pattern 4: Session ID Capture for Resume

**What:** The first message from the SDK is always `type: "system", subtype: "init"` and contains `session_id`. Capture this ID and store it in the session registry. Pass it as `resume: sdkSessionId` on next execution to avoid the 12-second cold-start.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/sessions
for await (const message of q) {
  if (message.type === 'system' && message.subtype === 'init') {
    const sdkSessionId = message.session_id
    SessionRegistry.update(dashboardSessionId, { sdkSessionId })
  }
}

// On next execution for same project (warm start):
query({
  prompt: nextPhasePrompt,
  options: {
    resume: storedSdkSessionId,  // avoids ~12s cold start on second call
    cwd: projectPath,
  },
})
```

### Pattern 5: WS Event Type Extension

**What:** Extend the existing WS broadcast system with execution-specific event types. The existing `WsEvent` type covers file watcher events; add execution events as a discriminated union extension.

```typescript
// Extend backend/src/lib/watcher.ts WsEvent type:
export type WsEvent =
  | { type: 'file:changed' | 'file:created' | 'file:deleted'; projectId: string; path: string }
  | { type: 'execution:message'; sessionId: string; message: SDKMessage }
  | { type: 'execution:complete'; sessionId: string }
  | { type: 'execution:end'; sessionId: string; reason: 'cancelled' | 'error'; error?: string }
```

The existing `broadcast()` function and `useWebSocket` hook handle all event types via the single `/ws` endpoint — no second WebSocket endpoint needed.

### Pattern 6: Progress Parsing from SDK Messages

**What:** GSD plan execution outputs structured text markers. Parse these from `SDKAssistantMessage.message.content` text blocks server-side and emit structured progress events.

Note: The exact GSD output format must be validated against a real execution before finalizing the regex. This is a best-effort pattern.

```typescript
// Simple regex-based progress parser
function parseProgress(text: string): ProgressUpdate | null {
  const planMatch = text.match(/Plan (\d+)\/(\d+):\s*(.+?)(?:\s*[|]|$)/m)
  const taskMatch = text.match(/Task (\d+)\/(\d+):\s*(.+?)(?:\n|$)/m)
  if (!planMatch && !taskMatch) return null
  return {
    planCurrent: planMatch ? parseInt(planMatch[1], 10) : undefined,
    planTotal:   planMatch ? parseInt(planMatch[2], 10) : undefined,
    planName:    planMatch ? planMatch[3].trim() : undefined,
    taskCurrent: taskMatch ? parseInt(taskMatch[1], 10) : undefined,
    taskTotal:   taskMatch ? parseInt(taskMatch[2], 10) : undefined,
    taskName:    taskMatch ? taskMatch[3].trim() : undefined,
  }
}
```

### Pattern 7: Segmented Progress Bar (Pure CSS Flex)

No external library needed. One flex child per plan, colored by status, transitions with CSS.

```tsx
function SegmentedBar({ plans }: { plans: Array<{ status: 'done' | 'running' | 'pending' }> }) {
  return (
    <div className="flex gap-0.5 h-1.5 w-full overflow-hidden rounded-full">
      {plans.map((plan, i) => (
        <div
          key={i}
          className="flex-1 h-full rounded-sm transition-colors duration-300"
          style={{
            background:
              plan.status === 'done'    ? 'var(--color-status-green)' :
              plan.status === 'running' ? 'var(--color-accent)' :
                                          'var(--color-bg4)',
          }}
        />
      ))}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Awaiting SDK query in HTTP handler:** The SDK query can run for minutes. Always fire-and-forget in a background IIFE, return session ID immediately.
- **setState on every WS message:** At high throughput (dozens/sec) this causes React render thrashing. Always buffer in a ref and flush on rAF.
- **Passing raw agent output to inner HTML without ansi_up:** Raw output may contain angle brackets from compiler errors, tool outputs, etc. Always pass through `ansi_up.ansi_to_html()` which HTML-escapes first.
- **Spawning a new `query()` call per phase without reusing session ID:** Always capture and store the `session_id` from the `system:init` message. Pass it as `resume:` on next call to avoid 12-second cold starts.
- **Registering WebSocket AFTER CORS/logger middleware:** Known Hono issue #4090 — the project already handles this correctly. Maintain this ordering when adding execution routes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ANSI escape sequence parsing | Custom regex ANSI parser | `ansi_up` | ANSI has 50+ codes, bold/dim/italic/underline/blinking/reverse/cursor-movement — edge cases everywhere |
| Agent subprocess management | Custom child_process spawn + stdio pipe | `query()` async generator | SDK handles process spawn, tool execution loop, session persistence, abort signal propagation |
| Output virtualization | Custom windowed list | `@tanstack/react-virtual` | Only if line count exceeds ~5,000; don't prematurely optimize |
| WebSocket reconnection logic | Custom backoff reconnect | Already built in `useWebSocket.ts` | Exponential backoff with cap already implemented |
| Abort/process cleanup | Custom SIGKILL / PID tracking | `AbortController` + SDK | SDK propagates abort to Claude subprocess correctly via its internal process management |

**Key insight:** The SDK's async generator interface is the key abstraction — it turns the complex agent loop (process spawn, IPC, tool calls, streaming responses) into a simple `for await (const message of query(...))` pattern.

## Common Pitfalls

### Pitfall 1: Cold Start Surprise on First Execution
**What goes wrong:** User clicks Execute, waits 12+ seconds before seeing any output — feels broken.
**Why it happens:** The SDK spawns a fresh Claude Code subprocess on each new `query()` call. Process initialization takes ~12 seconds.
**How to avoid:** (1) Show an immediate "Starting agent..." spinner in the UI on Execute click, before any WS output arrives. (2) On the `system:init` message arriving, transition to "Running" state. (3) Store `sdkSessionId` for resume on next execution.
**Warning signs:** If the first WS event takes >15 seconds, the process may have failed to start.

### Pitfall 2: React Render Thrashing from High-Frequency WS Messages
**What goes wrong:** Browser UI freezes or becomes unresponsive during heavy agent output.
**Why it happens:** Each `setState` call in React triggers a reconciliation pass. At 50+ messages/second, this saturates the main thread.
**How to avoid:** Always use the rAF buffer pattern — push to `bufferRef.current`, never call `setState` directly in the WS `onmessage` handler for streaming output.
**Warning signs:** Input lag in the Stop button, "Jump to bottom" button becomes unresponsive.

### Pitfall 3: AbortController Not Propagated to SDK
**What goes wrong:** User clicks Stop, gets 204 OK response, but agent keeps running and WS events keep arriving.
**Why it happens:** `AbortController` must be passed at query creation time as `options.abortController`. If it's created after `query()` is called, or not stored in the session registry, the signal can't reach the SDK.
**How to avoid:** Create `AbortController` before calling `query()`, store it in `SessionRegistry` keyed on session ID, retrieve it in the DELETE handler.
**Warning signs:** WS `execution:message` events continue arriving after the stop endpoint returns 204.

### Pitfall 4: `system:init` Message Missed for Session ID Capture
**What goes wrong:** Every execution pays the 12-second cold start because resume session ID is never stored.
**Why it happens:** The `system:init` message is the very first message emitted. The type check is `message.type === 'system' && message.subtype === 'init'`. Both fields must be checked.
**How to avoid:** Check both `type` and `subtype`. Store `message.session_id` synchronously inside the loop immediately when matched.
**Warning signs:** Execution always takes 12+ seconds even for second and subsequent executions.

### Pitfall 5: WS Event Type Collision
**What goes wrong:** Frontend receives execution events and treats them as file watcher events (or vice versa), breaking both features.
**Why it happens:** The existing `WsEvent` type only has `file:` prefixed types. New execution events added without updating the discriminated union or the `useWebSocket` switch statement.
**How to avoid:** Add `execution:` prefix to all new WS event types. Update `WsEvent` type in `watcher.ts`, and update `useWebSocket.ts` message handler to dispatch execution events separately from file events.
**Warning signs:** File tree stops updating, or execution panel shows file change toasts instead of execution output.

### Pitfall 6: Hono Route Ordering with WebSocket
**What goes wrong:** Server crashes on WebSocket upgrade attempt with header-immutability error.
**Why it happens:** Hono issue #4090 — CORS middleware modifies headers after WebSocket upgrade.
**How to avoid:** The existing codebase already handles this correctly (WS setup happens before `app.use('*', logger())` and `app.use('/api/*', cors(...))`). When adding the new execution route, mount it after the WS registration, which is already correct order.
**Warning signs:** Server throws `TypeError: Cannot set headers after they are sent` on WebSocket connections.

### Pitfall 7: Restart Phase Using `resume:` Instead of Fresh Session
**What goes wrong:** "Restart Phase" replays prior session history, confusing the agent with completed work context.
**Why it happens:** `resume: sdkSessionId` continues the exact prior conversation. For a restart, we want clean state.
**How to avoid:** For "Restart Phase" action, call `query()` without `resume:`. Only use `resume:` for warm continuation of an in-progress session (e.g., network disconnect and reconnect).
**Warning signs:** Agent outputs "I already completed Plan 1..." when restarting a phase.

## Code Examples

Verified patterns from official sources:

### Starting a Query with AbortController
```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from '@anthropic-ai/claude-agent-sdk'

const ac = new AbortController()

const q = query({
  prompt: 'Execute GSD phase 3 plans',
  options: {
    cwd: '/path/to/project',
    abortController: ac,
    permissionMode: 'bypassPermissions',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    settingSources: ['project'],
  },
})

// Abort from stop endpoint:
// ac.abort()
// or equivalently: q.close()

for await (const message of q) {
  console.log(message.type)
}
```

### Capturing Session ID from System Init Message
```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/sessions
for await (const message of q) {
  if (message.type === 'system' && message.subtype === 'init') {
    const sdkSessionId = message.session_id
    // Store in registry for warm resume on next execution
    SessionRegistry.update(dashboardSessionId, { sdkSessionId })
  }
}
```

### Resuming a Session (Warm Restart, ~2-3s vs 12s cold)
```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/sessions
const q = query({
  prompt: 'Continue phase execution',
  options: {
    resume: storedSdkSessionId,
    cwd: projectPath,
    permissionMode: 'bypassPermissions',
  },
})
```

### SDKMessage Type Discrimination
```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript (Message Types section)
for await (const message of q) {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') { /* capture session_id */ }
      break
    case 'assistant': {
      // message.message.content is array of BetaMessage content blocks
      const textContent = message.message.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text as string)
        .join('')
      // Use textContent for ANSI rendering and progress parsing
      break
    }
    case 'result':
      if (message.subtype === 'success') { /* execution complete */ }
      else { /* error: message.errors[] */ }
      break
  }
}
```

### ANSI-to-HTML with ansi_up (safe for inner HTML injection)
```typescript
// Source: https://github.com/drudru/ansi_up
// ansi_up HTML-escapes all content before ANSI processing — angle brackets become &lt; &gt;
// This makes the output safe to inject as inner HTML (no XSS risk from agent output)
import AnsiUp from 'ansi_up'

const ansiUp = new AnsiUp()
const safeHtml = ansiUp.ansi_to_html('\x1b[32mGreen text\x1b[0m <not-a-tag>')
// Output: '<span style="color:rgb(0,187,0)">Green text</span> &lt;not-a-tag&gt;'
// The angle brackets are escaped — safe to render as inner HTML
```

### rAF Buffer Pattern (prevent React render thrashing)
```typescript
// Source: SitePoint "Streaming Backends & React: Controlling Re-render Chaos" (2026)
// Buffer in ref, flush to state on rAF cadence (~60fps on typical displays)
const bufferRef = useRef<string[]>([])
const rafRef = useRef<number>(0)

useEffect(() => {
  function flush() {
    if (bufferRef.current.length > 0) {
      const batch = bufferRef.current.splice(0)
      setLines(prev => [...prev, ...batch])
    }
    rafRef.current = requestAnimationFrame(flush)
  }
  rafRef.current = requestAnimationFrame(flush)
  return () => cancelAnimationFrame(rafRef.current)
}, [])

// In WS onmessage — push to buffer, NOT to state:
bufferRef.current.push(ansiUp.ansi_to_html(rawText))
```

### Extended SessionRecord Type
```typescript
// shared/types/index.ts — extend SessionRecord
export interface SessionRecord {
  id: string
  projectId: string
  phaseId?: string
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled'
  createdAt: number
  sdkSessionId?: string         // Captured from system:init for resume
  abortController?: AbortController  // Stored for stop endpoint
  error?: string
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/claude-code` (deprecated name) | `@anthropic-ai/claude-agent-sdk` | SDK rename 2025 | Import paths changed; old name still works but deprecated |
| New `query()` call per user interaction | Persistent session with `resume:` option | Issue #34 resolution 2025 | Warm subsequent calls: 12s cold start reduced to 2-3s |
| Manual process spawning + stdio pipe | `query()` async generator | SDK v0.1+ | No manual process management needed |
| `unstable_v2_createSession` / `unstable_v2_prompt` | `query()` + `resume:` option | SDK v0.2+ | Stable API replaces experimental v2 session APIs |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code`: Still functional but package is now named `@anthropic-ai/claude-agent-sdk`. Use the new name.
- `unstable_v2_createSession` / `unstable_v2_resumeSession` / `unstable_v2_prompt`: Experimental session APIs from early SDK versions. The stable `query()` + `options.resume` pattern is the current approach per official docs.

## Open Questions

1. **Progress Parsing: GSD output format**
   - What we know: GSD plan execution produces agent output; the progress format "Plan N/M: Name" and "Task N/M: Name" was specified in user decisions as the target format for the progress header display
   - What's unclear: Whether these markers appear in `SDKAssistantMessage` text content blocks or in `Bash` tool output blocks. The exact output format of the GSD agent running plans needs empirical validation.
   - Recommendation: In the first implementation task, run a test execution and log all raw SDK message types. Build the parser against real output, not assumptions. Design the backend to emit raw text first and parse in a second pass.

2. **Session Resume Scope for Restart Phase**
   - What we know: `resume: sessionId` continues the exact prior session including all file context and conversation history. Restart Phase means running all plans from scratch.
   - What's unclear: Whether a resuming session that previously completed Plans 1-3 would interfere with re-running Plans 1-3 again.
   - Recommendation: For "Restart Phase", always use a fresh `query()` call (no `resume:`). Reserve `resume:` for warm continuation only, not restart. Store old `sdkSessionId` but do not pass it on Restart.

3. **Output Buffer Size**
   - What we know: Keeping all log lines in React state grows unboundedly during long executions
   - What's unclear: Whether Phase 3's typical GSD execution (30-60 minute run) will produce enough output to cause browser memory issues. Estimate: ~500-2,000 lines for a typical phase.
   - Recommendation: Cap at 10,000 lines with a rolling buffer. Only add `@tanstack/react-virtual` if performance issues are observed during testing — premature virtualization adds complexity.

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/agent-sdk/typescript` — Full TypeScript API reference: `query()`, `Options`, `Query` object, `SDKMessage` types, `AbortController` usage, session management
- `https://platform.claude.com/docs/en/agent-sdk/overview` — SDK overview, streaming pattern, session tab with `resume:` example
- `https://platform.claude.com/docs/en/agent-sdk/sessions` — Session capture, resume, fork patterns with TypeScript code examples
- `https://platform.claude.com/docs/en/agent-sdk/hosting` — Production deployment patterns, cold-start context, Long-Running Sessions pattern
- `https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md` — Version history; confirmed v0.2.63 is current, `query.close()`, `listSessions()`, `getSessionMessages()`, task_progress events

### Secondary (MEDIUM confidence)
- `https://github.com/anthropics/claude-agent-sdk-typescript/issues/34` — Cold start issue closed as expected behavior; streaming input mode / warm sessions recommended by Anthropic team; 12s first call, 2-3s subsequent calls confirmed
- `https://github.com/drudru/ansi_up` — `ansi_up` v6.0.6, zero-dependency ESM, HTML-escapes before ANSI conversion (XSS-safety documentation)
- `https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/` — rAF buffer pattern for high-frequency WS streams; ref-based buffer flushed to setState on rAF cadence

### Tertiary (LOW confidence)
- WebSearch result: `ansi_up` v6.0.6, 135 npm dependents, last published 9 months ago (unverified against npm directly due to 403 on npmjs.com)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK from official Anthropic docs; `ansi_up` from npm search + GitHub verification
- Architecture: HIGH — SDK patterns verified against official TypeScript reference; WS extension follows existing codebase patterns directly
- Pitfalls: HIGH for cold-start and AbortController (GitHub issue + official docs); MEDIUM for progress parsing (GSD-specific output format not yet validated empirically)
- Session resume: HIGH — official docs + GitHub issue confirmed warm session behavior

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (SDK is fast-moving at v0.2.x; check CHANGELOG before implementation for breaking changes)
