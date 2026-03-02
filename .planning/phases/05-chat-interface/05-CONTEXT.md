# Phase 5: Chat Interface - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time conversation with Claude in the browser. Users send messages and see responses stream token by token with correctly rendered markdown. Sessions persist across browser reloads. Slash commands (Phase 6) and multiple concurrent sessions (CHAT-07) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Chat layout & placement
- Chat is a **separate tab type** — not inside the GSD plugin. Registered as its own plugin (or top-level tab type) so it's independent and extensible
- **Project-scoped** — Claude has awareness of the active project path and .planning/ context
- Opens from the **+ tab dropdown AND a dedicated keyboard shortcut** (e.g., Cmd+Shift+C)
- **Centered conversation layout** — messages in a ~700px max-width column, not full-width

### Message presentation
- **Minimal flat style** — clean messages with subtle sender labels, no bubbles. Similar to Slack or Linear's comment style. Fits the dark terminal aesthetic
- Claude's responses render **full markdown** — headings, lists, bold/italic, links, etc.
- **Code blocks**: syntax-highlighted with language label in header and one-click copy button (matching doc viewer style)
- **Streaming**: tokens appear live as they arrive with a blinking cursor/typing indicator showing Claude is still generating
- **User messages**: plain text only, no markdown rendering on the user side

### Input & interactions
- **Enter to send**, Shift+Enter for newline (standard chat behavior)
- **Auto-growing input** area, capped at ~4 lines before scrolling
- **Copy + Retry** actions on Claude's messages (copy full message, retry re-sends the previous prompt)
- **Stop generating** via both a visible button during streaming AND Escape key

### Session management
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

</decisions>

<specifics>
## Specific Ideas

- Flat message style should feel like Slack or Linear comments — clean, not cluttered, fits the dark terminal aesthetic
- Code blocks should match the doc viewer's existing syntax highlighting style for visual consistency
- The stop button + Escape key pattern mirrors the execution tab's stop controls

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PluginDefinition` interface (`src/plugins/types.ts`): Chat can register as a new plugin with its own tab type
- `appEvents` mitt bus (`src/plugins/events.ts`): Chat can emit/subscribe to app events (e.g., `project:switched`)
- `@tauri-apps/plugin-shell` Command API: Used in `ExecutionTab.tsx` to run `claude --print` and stream stdout — potential pattern for chat backend
- PTY system (`src-tauri/src/pty.rs`): Full interactive terminal support — alternative for interactive Claude sessions
- Existing UI components: `Button`, `Input`, `Dialog`, `Select` in `src/components/ui/`
- Theme system (`src/lib/themes.ts`): Terminal themes with color palettes for consistent styling

### Established Patterns
- **Plugin registration**: Add `PluginDefinition` to plugins array → tab type auto-rendered in Shell
- **Sub-view routing**: GSD plugin uses internal state for view switching (overview/documents/execution)
- **State management**: Zustand stores (`src/stores/appStore.ts`) for global state
- **Tab management**: Zustand-managed tabs with type, projectId, optional terminalId
- **Streaming output**: `Command.create()` with stdout/stderr event listeners in ExecutionTab
- **Auto-scroll**: ExecutionTab pattern — track scroll position, show "jump to bottom" button

### Integration Points
- `Shell.tsx`: Renders plugin tabs via `getAllPluginTabTypes()` lookup — chat tab will be rendered here
- `TabBar.tsx`: Tab bar with + dropdown for adding new tab types
- `src/plugins/index.ts`: Plugin registry where new plugins are registered
- Native menu (`menu-action` events in Shell.tsx): Keyboard shortcut for opening chat tab
- Tauri Rust commands: May need new commands for chat session management if using PTY or Claude SDK

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-chat-interface*
*Context gathered: 2026-03-02*
