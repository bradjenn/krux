# Phase 5: Chat Interface - Research

**Researched:** 2026-03-02
**Domain:** Streaming chat UI — Anthropic SDK, Streamdown, Dexie, Tauri Channels, React/Zustand
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Chat layout & placement**
- Chat is a **separate tab type** — not inside the GSD plugin. Registered as its own plugin (or top-level tab type) so it's independent and extensible
- **Project-scoped** — Claude has awareness of the active project path and .planning/ context
- Opens from the **+ tab dropdown AND a dedicated keyboard shortcut** (e.g., Cmd+Shift+C)
- **Centered conversation layout** — messages in a ~700px max-width column, not full-width

**Message presentation**
- **Minimal flat style** — clean messages with subtle sender labels, no bubbles. Similar to Slack or Linear's comment style. Fits the dark terminal aesthetic
- Claude's responses render **full markdown** — headings, lists, bold/italic, links, etc.
- **Code blocks**: syntax-highlighted with language label in header and one-click copy button (matching doc viewer style)
- **Streaming**: tokens appear live as they arrive with a blinking cursor/typing indicator showing Claude is still generating
- **User messages**: plain text only, no markdown rendering on the user side

**Input & interactions**
- **Enter to send**, Shift+Enter for newline (standard chat behavior)
- **Auto-growing input** area, capped at ~4 lines before scrolling
- **Copy + Retry** actions on Claude's messages (copy full message, retry re-sends the previous prompt)
- **Stop generating** via both a visible button during streaming AND Escape key

**Session management**
- **One active session per project** — opening chat always resumes where you left off
- **Clear button in header** to start a fresh conversation (previous messages discarded, not archived)
- **50-message history cap** — older messages pruned to keep storage and context manageable
- **Resume jumps straight to conversation** — no welcome screen if history exists, scrolled to bottom

### Claude's Discretion
- Empty state design when no messages exist (welcome message, suggested prompts, etc.)
- Exact typing/cursor indicator animation
- Message timestamp format and visibility
- Error state handling (network issues, API errors, rate limits)
- Loading skeleton/spinner during initial session load
- Exact keyboard shortcut key combo

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can send messages to Claude through a chat interface | Frontend ChatPanel + InputBar + @anthropic-ai/sdk streaming call pattern |
| CHAT-02 | User sees Claude's response streamed in real-time (token by token) | Tauri Channel pattern for streaming from Rust + rAF buffer flushing in useChatStream |
| CHAT-03 | User can resume previous chat sessions across browser sessions | Dexie IndexedDB persistence via chatStore + useLiveQuery for reactive load |
| CHAT-05 | Streaming markdown renders correctly mid-stream (no flash of raw syntax) | Streamdown 2.3.0 with isAnimating prop — purpose-built for streaming AI markdown |
</phase_requirements>

---

## Summary

Phase 5 builds a real-time chat interface with Claude inside a dedicated Tauri tab. The app is a local-first personal tool: CSP is null (`"csp": null` in tauri.conf.json), so the Anthropic SDK can run directly in the Vite/React frontend using `dangerouslyAllowBrowser: true`. This is the correct and simplest architecture — no Rust HTTP proxy needed.

Streaming delivery uses the `@anthropic-ai/sdk` `.stream()` method with `.on('text', ...)` event callbacks. To prevent React re-render storms from rapid token arrival, token chunks are buffered in a `useRef` and flushed on `requestAnimationFrame` cadence (the same rAF pattern already used in the LogViewer for execution output). The streaming text feeds directly into `Streamdown 2.3.0`, a React component purpose-built by Vercel for AI streaming — it handles unterminated markdown blocks gracefully at every token boundary, solving CHAT-05 without any custom logic.

Chat history persists in IndexedDB via Dexie 4.x + `dexie-react-hooks`. Since this is a Tauri WebView, IndexedDB is fully available. Dexie provides a keyed messages table per project, with `useLiveQuery` for reactive load. The 50-message cap is enforced as a Zustand store action that prunes before writing to Dexie. The API key is read from `ANTHROPIC_API_KEY` environment variable via a new `get_env_var` Tauri command, and optionally overridden by a settings entry.

**Primary recommendation:** Use `@anthropic-ai/sdk` directly in the browser frontend with `dangerouslyAllowBrowser: true`. Stream via `.on('text', ...)` → rAF buffer → Zustand state. Persist with Dexie. Render with Streamdown. Register chat as a new `PluginDefinition` in `src/plugins/index.ts`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.61+ (latest) | Calls Anthropic API, handles SSE streaming | Official SDK; `.stream()` API is the correct way to consume text deltas |
| `streamdown` | 2.3.0 | Streaming markdown rendering | Built by Vercel specifically for AI streaming; handles unterminated markdown |
| `dexie` | 4.x | IndexedDB wrapper for chat history | Minimal API, TypeScript EntityTable typing, works in Tauri WebView |
| `dexie-react-hooks` | latest (paired with dexie 4.x) | `useLiveQuery` for reactive chat history | Eliminates manual re-sync; hooks into Dexie's change tracking |
| `zustand` | 5.0.11 (already installed) | In-memory chat UI state, streaming buffer flush | Already in project; isolate chat store from appStore |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@streamdown/code` | latest (peer of streamdown) | Shiki syntax highlighting in code blocks | Required for code blocks in Claude responses |
| `lucide-react` | 0.575.0 (already installed) | Stop, Copy, Retry, Send icons | Matches existing icon usage in the project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `streamdown` | `react-markdown` (already in project) | react-markdown cannot handle unterminated/mid-stream markdown — breaks CHAT-05. Streamdown is the right tool. |
| Dexie IndexedDB | localStorage | localStorage has a 5 MB quota (noted in STATE.md as the reason to use Dexie). IndexedDB has no practical limit. |
| Frontend SDK direct | Tauri Rust proxy + Channel | Rust proxy adds complexity with no security benefit for a local personal tool. CSP is null anyway. |
| `@anthropic-ai/sdk` | `@anthropic-ai/claude-agent-sdk` | Agent SDK is for agentic MCP sessions (GSD execution), not simple chat message streaming. Use base SDK. |

**Installation:**
```bash
npm install @anthropic-ai/sdk streamdown @streamdown/code dexie dexie-react-hooks
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/plugins/chat/
├── index.ts              # PluginDefinition export (chatPlugin)
├── ChatTab.tsx           # Top-level tab component (wraps ChatPanel)
├── ChatPanel.tsx         # Conversation layout: header + MessageList + InputBar
├── MessageList.tsx       # Scrollable list, auto-scroll, jump-to-bottom
├── MessageBubble.tsx     # Single message: user (plain text) or assistant (Streamdown)
├── InputBar.tsx          # Auto-growing textarea, Enter/Shift+Enter, Stop button
├── useChatStream.ts      # Hook: manages streaming lifecycle, rAF buffer, abort
└── chatStore.ts          # Zustand store for session state + Dexie persistence

src/lib/chatDb.ts         # Dexie database definition (shared, outside plugin folder)
```

The chat plugin registers exactly like the GSD plugin in `src/plugins/index.ts`.

### Pattern 1: Plugin Registration

**What:** Add chatPlugin to PLUGINS array — it auto-appears in the + dropdown and gets keyboard shortcut via a new menu item in `lib.rs`.
**When to use:** Standard for all Phase 5 feature entry points.

```typescript
// src/plugins/chat/index.ts
import { MessageCircle } from 'lucide-react'
import type { PluginDefinition } from '../types'
import ChatTab from './ChatTab'

export const chatPlugin: PluginDefinition = {
  id: 'chat',
  name: 'Chat',
  icon: MessageCircle,
  defaultTabType: 'chat:main',
  tabTypes: [
    {
      id: 'chat:main',
      label: 'Chat',
      icon: MessageCircle,
      component: ChatTab,
    },
  ],
  // Chat is always available (no .planning/ requirement)
  isAvailable: async () => true,
}

// src/plugins/index.ts — add chatPlugin alongside gsdPlugin
export const PLUGINS: PluginDefinition[] = [gsdPlugin, chatPlugin]
```

### Pattern 2: Anthropic SDK Streaming (Frontend Direct)

**What:** Call the Anthropic API directly from the React frontend using `dangerouslyAllowBrowser: true`. The Tauri app's CSP is null, so outbound HTTPS to api.anthropic.com is unrestricted.
**When to use:** Any time the chat component needs to call Claude.

```typescript
// Source: https://platform.claude.com/docs/claude/reference/messages-streaming
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: apiKey,            // from get_api_key Tauri command (reads ANTHROPIC_API_KEY env)
  dangerouslyAllowBrowser: true,
})

// In useChatStream.ts — streaming with abort support
const abortController = new AbortController()

const stream = client.messages.stream(
  {
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    system: `You are a helpful assistant for the project at ${projectPath}. ...`,
    messages: conversationHistory, // array of {role, content} for context
  },
  { signal: abortController.signal }
)

stream.on('text', (chunk) => {
  // Buffer in ref, flush on rAF — do NOT call setState here
  bufferRef.current += chunk
})

stream.on('message', () => {
  // Final message assembled — mark as complete
  setIsStreaming(false)
})
```

### Pattern 3: rAF Buffer Flush (Performance)

**What:** Buffer incoming token chunks in a `useRef` — not state — and flush to state on `requestAnimationFrame`. This prevents React from re-rendering hundreds of times per second during fast streaming.
**When to use:** Any streaming text that produces rapid token callbacks.

```typescript
// Source: rAF buffer pattern — matches ExecutionTab approach in this codebase
const bufferRef = useRef('')
const rafRef = useRef<number | null>(null)

// Called inside stream.on('text', ...)
function appendToken(chunk: string) {
  bufferRef.current += chunk
  if (rafRef.current === null) {
    rafRef.current = requestAnimationFrame(() => {
      // Single setState call per frame — batches all tokens since last frame
      setStreamingContent((prev) => prev + bufferRef.current)
      bufferRef.current = ''
      rafRef.current = null
    })
  }
}
```

### Pattern 4: Streamdown for Streaming Markdown

**What:** Streamdown replaces react-markdown for Claude responses. Pass accumulated text content and `isAnimating={true}` while streaming. Switch to `isAnimating={false}` when done.
**When to use:** All Claude assistant messages.

```typescript
// Source: https://streamdown.ai/docs/usage
import { Streamdown } from 'streamdown'
import code from '@streamdown/code'

// During streaming:
<Streamdown
  plugins={{ code }}
  isAnimating={isStreaming}
  shikiTheme={['github-dark', 'github-dark']}
>
  {message.content}
</Streamdown>
```

**Tailwind v4 integration** — add to `src/index.css`:
```css
@source "../node_modules/streamdown/dist/*.js";
```

This is REQUIRED for streamdown's Tailwind utility classes to be included. The project uses Tailwind v4 with `@tailwindcss/vite` — the `@source` directive is the v4 equivalent of `content` array configuration.

### Pattern 5: Dexie Chat History

**What:** One IndexedDB database (`ChatDb`) with a `messages` table keyed by project path and message id. `useLiveQuery` provides reactive loading.
**When to use:** ChatPanel mount — load history for current project. On message send/receive — persist.

```typescript
// Source: https://github.com/dexie/Dexie.js — EntityTable pattern
// src/lib/chatDb.ts
import { Dexie, type EntityTable } from 'dexie'

export interface ChatMessage {
  id?: number        // auto-increment primary key
  projectId: string  // scopes messages to a project
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const chatDb = new Dexie('ChatDatabase') as Dexie & {
  messages: EntityTable<ChatMessage, 'id'>
}

chatDb.version(1).stores({
  messages: '++id, projectId, timestamp',
})

// chatStore.ts — load messages reactively
import { useLiveQuery } from 'dexie-react-hooks'

export function useChatHistory(projectId: string) {
  return useLiveQuery(
    () =>
      chatDb.messages
        .where('projectId')
        .equals(projectId)
        .sortBy('timestamp'),
    [projectId]
  )
}

// Persist a message and enforce 50-message cap
export async function saveMessage(msg: ChatMessage) {
  await chatDb.messages.add(msg)
  // Enforce 50-message cap: prune oldest if over limit
  const all = await chatDb.messages
    .where('projectId').equals(msg.projectId)
    .sortBy('timestamp')
  if (all.length > 50) {
    const toDelete = all.slice(0, all.length - 50).map((m) => m.id!)
    await chatDb.messages.bulkDelete(toDelete)
  }
}
```

### Pattern 6: API Key via Tauri Command

**What:** Add a new `get_env_var` Rust command that reads `ANTHROPIC_API_KEY` from the process environment. This avoids storing the key in frontend code or localStorage.
**When to use:** ChatTab mount, before creating the Anthropic client.

```rust
// src-tauri/src/lib.rs — add to invoke_handler
#[tauri::command]
fn get_env_var(name: String) -> Option<String> {
    std::env::var(name).ok()
}
```

```typescript
// ChatTab.tsx
const apiKey = await invoke<string | null>('get_env_var', { name: 'ANTHROPIC_API_KEY' })
if (!apiKey) {
  // Show "Set ANTHROPIC_API_KEY in your shell environment" error state
}
```

### Pattern 7: Keyboard Shortcut (Tauri Menu)

**What:** Add a new "Chat" menu item to the View submenu in `src-tauri/src/lib.rs`. Emit `menu-action` with payload `"open-chat"`. Handle it in Shell.tsx's existing menu listener.
**When to use:** Cmd+Shift+C (or similar) to open/focus chat tab.

```rust
// lib.rs — add to view_menu builder
let open_chat = MenuItem::with_id(app, "open-chat", "Chat", true, Some("CmdOrCtrl+Shift+C"))?;
```

```typescript
// Shell.tsx — add case to existing menu-action switch
case 'open-chat':
  if (activeProjectId) {
    const existing = tabs.find(t => t.type === 'chat:main' && t.projectId === activeProjectId)
    if (existing) { setActiveTab(existing.id) }
    else { addTab({ id: crypto.randomUUID(), type: 'chat:main', label: 'Chat', projectId: activeProjectId }) }
  }
  break
```

### Pattern 8: Stop Generating / Abort

**What:** The Anthropic SDK `.stream()` accepts an `AbortSignal`. Store the controller in a ref. Call `abortController.abort()` from Stop button and Escape key handler.
**When to use:** Any time the user wants to stop mid-stream.

```typescript
const abortRef = useRef<AbortController | null>(null)

// To start:
abortRef.current = new AbortController()
const stream = client.messages.stream(params, { signal: abortRef.current.signal })

// To stop:
abortRef.current?.abort()
setIsStreaming(false)
```

### Anti-Patterns to Avoid

- **Calling setState on every token:** Will cause hundreds of re-renders per second. Always buffer with rAF.
- **Using react-markdown for streaming content:** It cannot handle unterminated markdown blocks — use Streamdown.
- **Storing the API key in Zustand or localStorage:** Use Tauri invoke to read `ANTHROPIC_API_KEY` from env at runtime.
- **Mounting a new Anthropic client on every render:** Create it once in the hook with `useRef`, not inline in a render.
- **Storing conversation in Zustand only:** Zustand is in-memory; crashes/reloads lose history. Always write to Dexie.
- **Sending all 50 messages as context every turn:** May exceed token limits on long sessions — consider sending the last N (e.g. 20) messages as context while keeping 50 in storage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming markdown render | Custom parser that re-renders on every token | `streamdown` 2.3.0 | Unterminated block handling is genuinely hard — Streamdown handles every edge case (partial code fences, partial table rows, etc.) |
| IndexedDB access | Direct IndexedDB API calls | `dexie` + `dexie-react-hooks` | The raw IndexedDB API is verbose and error-prone; Dexie provides transactions, versioning, and typed queries |
| Token accumulation during stream | Manual string concatenation with setState | rAF buffer pattern (already used in LogViewer) | Naive setState on every token causes visible jank; rAF batches to display frame rate |
| SSE/streaming HTTP | Custom fetch + SSE parser | `@anthropic-ai/sdk` `.stream()` | SDK handles reconnection, event parsing, ping events, abort signals, and error events |
| Abort/cancel | Custom flag variable | `AbortController` passed to SDK | SDK respects the signal and closes the connection cleanly |

**Key insight:** The two hardest problems in chat UIs are (1) mid-stream markdown rendering correctness and (2) performance at high token rates. Both are solved by existing libraries. Don't touch them.

---

## Common Pitfalls

### Pitfall 1: Streamdown Tailwind Classes Missing
**What goes wrong:** Code blocks and markdown elements render unstyled — no background, no syntax highlighting colors.
**Why it happens:** Tailwind v4's content scanner doesn't scan `node_modules` by default. Streamdown's classes are only in its compiled JS files.
**How to avoid:** Add `@source "../node_modules/streamdown/dist/*.js";` to `src/index.css` before running any dev server.
**Warning signs:** Code blocks appear as plain monospace text with no highlighting. Tables have no borders.

### Pitfall 2: `dangerouslyAllowBrowser` SDK Error
**What goes wrong:** `new Anthropic({ apiKey })` throws an error: "It looks like you're running in a browser-like environment..."
**Why it happens:** The SDK defaults to blocking browser usage to prevent API key exposure.
**How to avoid:** Always instantiate with `dangerouslyAllowBrowser: true`. This is safe for a local Tauri app where the user controls the environment.
**Warning signs:** Error thrown at Anthropic client construction time, not during API call.

### Pitfall 3: Streaming Aborts Not Cleaned Up
**What goes wrong:** Navigating away from the chat tab while a stream is active leaves the HTTP connection open; errors appear in console after unmount.
**Why it happens:** The stream is tied to the component lifecycle but not cleaned up in `useEffect` return.
**How to avoid:** In `useChatStream`, always `abortRef.current?.abort()` in the `useEffect` cleanup function. Also abort on tab visibility change if desired.
**Warning signs:** Console errors mentioning AbortError after unmounting the component.

### Pitfall 4: useLiveQuery Returns `undefined` on First Render
**What goes wrong:** Chat history appears empty briefly on first render, causing a flash of "empty state" even when messages exist.
**Why it happens:** `useLiveQuery` returns `undefined` while the async query is in-flight. The empty state check fires before data loads.
**How to avoid:** Check `messages === undefined` (loading) separately from `messages?.length === 0` (truly empty). Show a loading skeleton for the `undefined` case.
**Warning signs:** Empty state flashes briefly before messages appear on every mount.

### Pitfall 5: Context Length on Long Sessions
**What goes wrong:** After many messages, `messages.create()` fails with a "context length exceeded" error.
**Why it happens:** Sending all 50 stored messages as conversation history on every turn can exceed Claude's context window for very long exchanges.
**How to avoid:** When building `conversationHistory` for the API call, slice to the last 20 messages (not all 50). The 50-message cap is for storage; the API context window is a separate concern.
**Warning signs:** API errors with 400 status and "context_length_exceeded" error type.

### Pitfall 6: Streamdown + Vite SSR Warning
**What goes wrong:** Build error about CSS file processing in SSR context.
**Why it happens:** Streamdown imports CSS that Vite SSR doesn't handle well.
**How to avoid:** This project uses Tauri + Vite without SSR, so this pitfall does not apply. If encountered anyway, add `streamdown` to Vite's `ssr.noExternal`.
**Warning signs:** Build fails with "CSS file can't be processed in SSR" error.

---

## Code Examples

Verified patterns from official sources:

### useChatStream Hook Skeleton

```typescript
// src/plugins/chat/useChatStream.ts
import { useState, useRef, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'aborted'

export function useChatStream(apiKey: string, projectPath: string) {
  const [streamingContent, setStreamingContent] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')

  const bufferRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const clientRef = useRef<Anthropic | null>(null)

  if (!clientRef.current && apiKey) {
    clientRef.current = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  const flush = useCallback(() => {
    if (bufferRef.current) {
      setStreamingContent((prev) => prev + bufferRef.current)
      bufferRef.current = ''
    }
    rafRef.current = null
  }, [])

  const appendToken = useCallback((chunk: string) => {
    bufferRef.current += chunk
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush)
    }
  }, [flush])

  const sendMessage = useCallback(async (
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ) => {
    abortRef.current = new AbortController()
    setStreamingContent('')
    setStatus('streaming')

    const messages = [
      ...history.slice(-20), // send last 20 messages for context
      { role: 'user' as const, content: userMessage },
    ]

    try {
      const stream = clientRef.current!.messages.stream(
        {
          model: 'claude-opus-4-6',
          max_tokens: 8096,
          system: `You are a helpful assistant. The active project is at ${projectPath}.`,
          messages,
        },
        { signal: abortRef.current.signal }
      )

      stream.on('text', appendToken)
      await stream.finalMessage()
      setStatus('done')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('aborted')
      } else {
        setStatus('error')
      }
    }
  }, [projectPath, appendToken])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { streamingContent, status, sendMessage, stop }
}
```

### Dexie Database Definition

```typescript
// Source: Dexie.js EntityTable pattern — https://github.com/dexie/Dexie.js
// src/lib/chatDb.ts
import { Dexie, type EntityTable } from 'dexie'

export interface ChatMessage {
  id?: number
  projectId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const MAX_MESSAGES = 50

export const chatDb = new Dexie('ChatDatabase') as Dexie & {
  messages: EntityTable<ChatMessage, 'id'>
}

chatDb.version(1).stores({
  messages: '++id, projectId, timestamp',
})

export async function persistMessage(msg: Omit<ChatMessage, 'id'>) {
  await chatDb.messages.add(msg)
  // Enforce cap
  const all = await chatDb.messages.where('projectId').equals(msg.projectId).sortBy('timestamp')
  if (all.length > MAX_MESSAGES) {
    const toDelete = all.slice(0, all.length - MAX_MESSAGES).map((m) => m.id!)
    await chatDb.messages.bulkDelete(toDelete)
  }
}

export async function clearProjectHistory(projectId: string) {
  await chatDb.messages.where('projectId').equals(projectId).delete()
}
```

### Streamdown with Code Plugin

```typescript
// Source: https://streamdown.ai/docs/usage + https://streamdown.ai/docs/code-blocks
import { Streamdown } from 'streamdown'
import code from '@streamdown/code'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function MessageBubble({ role, content, isStreaming = false }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="py-3 text-foreground whitespace-pre-wrap">{content}</div>
    )
  }

  return (
    <div className="py-3">
      <Streamdown
        plugins={{ code }}
        isAnimating={isStreaming}
        shikiTheme={['github-dark', 'github-dark']}
      >
        {content}
      </Streamdown>
    </div>
  )
}
```

### InputBar with Auto-grow and Enter/Shift+Enter

```typescript
// No library needed — CSS rows + onInput for auto-grow
function InputBar({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const value = ref.current?.value.trim()
      if (value && !disabled) {
        onSend(value)
        if (ref.current) ref.current.value = ''
        // Reset height
        if (ref.current) ref.current.style.height = 'auto'
      }
    }
  }

  const handleInput = () => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    // Cap at ~4 lines (~96px at 24px line-height)
    ref.current.style.height = Math.min(ref.current.scrollHeight, 96) + 'px'
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      placeholder="Message Claude..."
      disabled={disabled}
      className="w-full resize-none bg-transparent text-foreground placeholder:text-dim focus:outline-none"
      style={{ overflow: 'hidden', minHeight: 24, maxHeight: 96 }}
    />
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-markdown` for AI streaming | `streamdown` (react-markdown drop-in) | Feb 2026 (v2.3.0) | Correct mid-stream rendering without flicker |
| Manual localStorage for chat | IndexedDB via Dexie | Ongoing — localStorage 5MB quota hit | No quota limit; typed queries; reactive with useLiveQuery |
| `setState` on every token | rAF buffer batch flush | Community pattern 2024+ | 60fps smooth rendering vs. hundreds of re-renders/sec |
| `@anthropic-ai/claude-code` package | `@anthropic-ai/claude-agent-sdk` | 2025 migration | Agent SDK for agentic sessions; base `@anthropic-ai/sdk` for chat messages |
| Tauri event system for streaming | Tauri Channels (for Rust→frontend) | Tauri v2 | Higher throughput, ordered delivery — but not needed here since SDK runs in frontend |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code`: Renamed to `@anthropic-ai/claude-agent-sdk`. Not needed for this phase (simple chat, not agent orchestration).
- `react-markdown` for streaming: Still valid for static content (DocViewer uses it correctly). Do NOT use for streaming assistant messages.

---

## Open Questions

1. **API Key UI flow**
   - What we know: `ANTHROPIC_API_KEY` is read via Tauri `get_env_var` command. If absent, show an error.
   - What's unclear: Should the error state offer a text field to enter the key at runtime (stored in Dexie or settings)? Or is "set it in your shell and restart" sufficient?
   - Recommendation: For Phase 5, "set in shell environment" is sufficient. An in-app key entry form is Claude's Discretion — defer to Phase 5 implementation.

2. **System prompt for project context**
   - What we know: Chat is project-scoped; `projectPath` is available as a prop.
   - What's unclear: Should the system prompt read `.planning/STATE.md` content to give Claude richer context? Or just pass the project path?
   - Recommendation: For Phase 5, pass the project path only. Reading STATE.md is a nice enhancement but not required for CHAT-01–CHAT-05.

3. **Streamdown shikiTheme matching project palette**
   - What we know: Shiki theme `'github-dark'` is a safe default. The project uses a custom accent color (#c8ff00).
   - What's unclear: Whether Shiki supports custom themes that match the project's exact color scheme.
   - Recommendation: Use `'github-dark'` for Phase 5. Custom theme matching is Claude's Discretion — can be improved later.

---

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/claude/reference/messages-streaming` — Anthropic SDK TypeScript streaming API, `.stream()`, `.on('text', ...)`, AbortController pattern
- `https://streamdown.ai/docs/usage` — Streamdown React API, `isAnimating` prop, plugin system
- `https://streamdown.ai/docs/code-blocks` — Code block customization, `@streamdown/code`, `shikiTheme` prop, copy button
- `https://streamdown.ai/docs/faq` — Tailwind v4 `@source` requirement, known issues
- `https://v2.tauri.app/develop/calling-frontend/` — Tauri Channels vs Events for streaming; confirms Channel is for ordered high-throughput
- `https://github.com/dexie/Dexie.js` — EntityTable pattern, `useLiveQuery`, version 4.x schema definition
- `https://github.com/vercel/streamdown` — Streamdown library source, confirms v2.3.0, Vercel authorship, purpose

### Secondary (MEDIUM confidence)
- WebSearch + streamdown.ai docs: Streamdown `@source` directive requirement verified with official docs
- WebSearch + Tauri docs: Confirmed `"csp": null` in tauri.conf.json means no restrictions on outbound requests from frontend
- WebSearch + Anthropic SDK issues: `dangerouslyAllowBrowser: true` is the correct option for browser environments; well-documented pattern

### Tertiary (LOW confidence)
- Medium article on Dexie + React chatbot: General Dexie chat schema pattern. Verified against official Dexie GitHub for correctness.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs/GitHub
- Architecture (Frontend SDK): HIGH — CSP null confirmed in tauri.conf.json; `dangerouslyAllowBrowser` is documented
- Streamdown integration: HIGH — official docs read directly, v2.3.0 confirmed
- Dexie schema patterns: HIGH — EntityTable pattern from official GitHub
- rAF buffer: MEDIUM — community pattern, verified as best practice by multiple 2024/2025 sources; matches existing ExecutionTab LogViewer pattern in this codebase
- Pitfalls: HIGH — Tailwind @source pitfall confirmed by official streamdown FAQ; others from direct code analysis

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable libraries; streamdown is actively developed so check for updates)
