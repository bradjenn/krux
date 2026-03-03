# Start Screen Design

## Overview

LazyVim-style start screen shown every time Archon launches (when no project is selected). Displays the Archon SVG logo and a list of keyboard-shortcut-driven actions.

## Architecture

Replace the existing empty state in `Shell.tsx` (the `!activeProjectId` block) with a new `StartScreen.tsx` component. No routing or view system changes needed — the start screen IS the no-project-selected state.

## Layout

- Archon SVG logo rendered large (~120px) and centered with subtle glow
- Horizontal divider
- Menu items: icon + label + right-aligned key badge
- Footer: version + project count

## Menu Actions

| Action | Key | Behavior |
|--------|-----|----------|
| Add Project | `a` | Opens DiscoverDialog |
| Switch Project | `p` | Opens ProjectSwitcher modal |
| Resume Last Session | `r` | Selects the most recently active project |
| Settings | `s` | Sets activeView to 'settings' |
| Quit | `q` | Calls Tauri process.exit() |

Single-key shortcuts only active when start screen is visible and no modals are open.

## State Changes

- `appStore.ts`: Add `lastActiveProjectId: string | null` to track last active project for "Resume Last Session"

## Files

1. **Create** `src/components/layout/StartScreen.tsx`
2. **Modify** `src/components/layout/Shell.tsx` — replace empty state
3. **Modify** `src/stores/appStore.ts` — add lastActiveProjectId tracking
