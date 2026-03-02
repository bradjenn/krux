---
phase: 05-chat-interface
plan: 01
subsystem: ui
tags: [anthropic-sdk, streamdown, dexie, zustand, tauri, chat, streaming]

# Dependency graph
requires:
  - phase: 04-plugin-system
    provides: PluginDefinition interface, PLUGINS array, plugin tab rendering in Shell
provides:
  - Dexie IndexedDB schema for chat messages (chatDb) with 50-message cap
  - Zustand store for streaming UI state (useChatStore, useChatHistory)
  - rAF-buffered streaming hook (useChatStream) with abort support
  - Chat plugin registered in PLUGINS array — visible in + tab dropdown
  - get_env_var Tauri command for reading shell env vars
  - Streamdown Tailwind v4 @source directive for scanned CSS classes
affects:
  - 05-chat-interface plan 02 (full UI components depend on all contracts from this plan)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk — Anthropic streaming client, dangerouslyAllowBrowser mode"
    - "streamdown@2.3.0 — streaming markdown renderer"
    - "@streamdown/code — code block syntax highlighting for streamdown"
    - "dexie — IndexedDB ORM with EntityTable typing"
    - "dexie-react-hooks — useLiveQuery for reactive Dexie queries"
  patterns:
    - "rAF buffer pattern: tokens buffered in ref, flushed to React state via requestAnimationFrame"
    - "appendStreamingContent (Zustand action) used instead of functional state updater for rAF flush"
    - "get_env_var Rust command: std::env::var().ok() for optional env var access"
    - "Dexie EntityTable<ChatMessage, 'id'> with ++id primary key and compound indexes"

key-files:
  created:
    - src/lib/chatDb.ts
    - src/plugins/chat/chatStore.ts
    - src/plugins/chat/useChatStream.ts
    - src/plugins/chat/ChatTab.tsx
    - src/plugins/chat/index.ts
  modified:
    - package.json
    - src/index.css
    - src/plugins/index.ts
    - src-tauri/src/lib.rs

key-decisions:
  - "appendStreamingContent Zustand action used for rAF flush (not functional state updater — Zustand setX takes value not function)"
  - "useChatStream status tracked in statusRef (not Zustand) — local to hook instance, avoids re-renders"
  - "Last 20 messages sent to Claude API for context window (not all 50 stored — balances context vs cost)"
  - "Chat plugin isAvailable always returns true — no project structure detection needed"

patterns-established:
  - "rAF buffer: bufferRef accumulates tokens, rafRef tracks frame ID, flush() drains buffer to Zustand"
  - "Dexie 50-message cap: add message then query oldest, bulkDelete if count > MAX_MESSAGES"
  - "Tauri env var access: invoke('get_env_var', { name: 'ANTHROPIC_API_KEY' }) in useEffect on mount"

requirements-completed: [CHAT-02, CHAT-03, CHAT-05]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 5 Plan 01: Chat Interface — Data Layer Summary

**Dexie IndexedDB chat history, Zustand streaming state, rAF-buffered Anthropic SDK streaming hook, and chat plugin registered in PLUGINS — full data layer for Plan 02 UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T12:02:18Z
- **Completed:** 2026-03-02T12:04:47Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed 5 npm packages (@anthropic-ai/sdk, streamdown, @streamdown/code, dexie, dexie-react-hooks) and added Tailwind @source directive for Streamdown CSS scanning
- Created full chat data layer: Dexie DB with 50-message cap, Zustand store with streaming state, rAF-buffered streaming hook with abort support
- Registered chatPlugin in PLUGINS array — Chat tab appears in + dropdown for all projects

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, Tailwind config, and Rust get_env_var command** - `3bdfa27` (feat)
2. **Task 2: Create chat data layer — Dexie DB, Zustand store, streaming hook, and plugin registration** - `f6a0c52` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/chatDb.ts` - Dexie database with ChatMessage interface, persistMessage (with 50-msg cap), clearProjectHistory
- `src/plugins/chat/chatStore.ts` - Zustand store for streaming UI state + useChatHistory reactive hook via useLiveQuery
- `src/plugins/chat/useChatStream.ts` - Streaming hook with rAF buffer, abort support, StreamStatus type
- `src/plugins/chat/ChatTab.tsx` - Stub tab: loads API key via Tauri, shows error state or placeholder
- `src/plugins/chat/index.ts` - chatPlugin PluginDefinition with MessageCircle icon
- `src/plugins/index.ts` - Added chatPlugin import and registered in PLUGINS array
- `src-tauri/src/lib.rs` - Added get_env_var command, Chat menu item (CmdOrCtrl+Shift+C), open-chat in menu events
- `src/index.css` - Added @source directive for Streamdown Tailwind v4 scanning
- `package.json` - Added 5 new dependencies

## Decisions Made
- Used `appendStreamingContent` Zustand action for the rAF flush instead of a functional updater — Zustand's generated setters only accept values, not `(prev) => next` functions. This is the correct pattern with this store shape.
- Streaming status tracked in `statusRef` (local hook ref) rather than Zustand — avoids unnecessary re-renders during token streaming. Status only matters at stream start/end.
- Last 20 messages from history sent to the Claude API for context (not all 50 stored) — balances context richness vs API token cost.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useChatStream setStreamingContent functional updater incompatibility**
- **Found during:** Task 2 (useChatStream.ts rAF flush implementation)
- **Issue:** Plan specified `setStreamingContent(prev => prev + chunk)` but Zustand's `setStreamingContent` action takes a `string` value, not a function updater — TypeScript build failed with TS2345
- **Fix:** Used `appendStreamingContent(chunk)` from the store (which already implements the append logic internally) for the rAF flush, and for the final flush after `stream.finalMessage()`
- **Files modified:** src/plugins/chat/useChatStream.ts
- **Verification:** `npm run build` passes, tsc --noEmit passes
- **Committed in:** f6a0c52 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Required fix for TypeScript compilation. The existing `appendStreamingContent` store action is the correct API for the rAF buffer pattern — no behavior change.

## Issues Encountered
- `streamdown` package is ESM-only with no CJS exports main — the plan's verification command used `require.resolve()` which fails for ESM packages. Verified package installation via direct file system check instead.

## User Setup Required
None — no external service configuration required at this stage. ANTHROPIC_API_KEY is read at runtime from the shell environment; the app shows an error state if it's not set.

## Next Phase Readiness
- All data layer contracts are stable: chatDb, useChatStore, useChatHistory, useChatStream — Plan 02 can build the full chat UI against these
- TypeScript compiles cleanly, Vite build succeeds
- Chat plugin appears in + tab dropdown (plugin registration verified)
- Streamdown CSS classes will be scanned by Tailwind v4 (@source directive in place)
- No blockers for Plan 02

---
*Phase: 05-chat-interface*
*Completed: 2026-03-02*
