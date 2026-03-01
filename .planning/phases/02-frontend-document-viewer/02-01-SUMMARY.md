---
phase: 02-frontend-document-viewer
plan: "01"
subsystem: ui
tags: [react, vite, tailwindcss-v4, shadcn-ui, tanstack-query, zustand, typescript]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: REST API at localhost:3001 with /api/projects, /api/projects/:id/overview, /api/projects/:id/phases

provides:
  - React SPA at localhost:5173 with dark terminal theme (cc-manager aesthetic)
  - Zustand appStore with activeProjectId + selectedFile (persisted to localStorage)
  - TanStack Query hooks for project CRUD and overview data
  - Project sidebar (340px) with search, filter pills, and project list
  - Command palette (Cmd+K) for project switching and add action
  - Add Project dialog (path + optional display name, POST /api/projects)
  - Settings dialog with project removal (DELETE /api/projects/:id)
  - ProjectOverview with phase grid, progress bar, and state card
  - PhaseCard with disk_status badges, roadmap icon, and plan counts
  - setSelectedFile hook for 02-02 document viewer integration

affects:
  - 02-02-document-viewer (consumes selectedFile from appStore)
  - 02-03-chat-interface (builds on same layout shell and appStore)

# Tech tracking
tech-stack:
  added:
    - "vite 7.3.1 + @vitejs/plugin-react (React bundler)"
    - "@tailwindcss/vite (Tailwind v4 vite plugin)"
    - "tw-animate-css (animations for Tailwind v4, NOT tailwindcss-animate)"
    - "shadcn/ui components: button, input, dialog, command, sonner, badge, scroll-area, separator"
    - "@radix-ui/* (radix primitives via shadcn)"
    - "cmdk (command palette via shadcn Command)"
    - "sonner (toast notifications)"
    - "@tanstack/react-query (server state)"
    - "zustand + persist middleware (UI state)"
    - "lucide-react (icons)"
    - "clsx + tailwind-merge + class-variance-authority (shadcn utils)"
  patterns:
    - "apiFetch<T> helper in src/lib/api.ts for all API calls (throws on error, returns T)"
    - "TanStack Query keys: ['projects'] and ['overview', projectId]"
    - "Zustand for UI state only (activeProjectId, selectedFile) -- server state in React Query"
    - "Dark class on document.documentElement for shadcn dark mode"
    - "Inline style objects using CSS variables for theme colors (var(--color-accent) etc.)"

key-files:
  created:
    - "frontend/src/index.css - Dark terminal theme with @theme block, shadcn CSS variable mappings"
    - "frontend/src/lib/api.ts - apiFetch helper pointing to localhost:3001"
    - "frontend/src/lib/queryClient.ts - TanStack Query client (30s stale, retry 1)"
    - "frontend/src/lib/utils.ts - shadcn cn() utility (clsx + tailwind-merge)"
    - "frontend/src/stores/appStore.ts - Zustand store with activeProjectId + selectedFile"
    - "frontend/src/hooks/useProjects.ts - useProjects, useProjectOverview, useAddProject, useRemoveProject"
    - "frontend/src/components/layout/Header.tsx - GSD badge logo, settings, new project button"
    - "frontend/src/components/layout/Sidebar.tsx - 340px sidebar with search + filter + project list"
    - "frontend/src/components/layout/CommandPalette.tsx - Cmd+K command palette"
    - "frontend/src/components/layout/AddProjectDialog.tsx - Add project modal"
    - "frontend/src/components/layout/SettingsDialog.tsx - Project removal settings"
    - "frontend/src/components/overview/ProjectOverview.tsx - Phase grid + progress bar"
    - "frontend/src/components/overview/PhaseCard.tsx - Per-phase card with status badges"
    - "frontend/src/App.tsx - Root layout wiring all components together"
  modified:
    - "frontend/vite.config.ts - Added @tailwindcss/vite and path aliases (@/ and @shared/)"
    - "frontend/tsconfig.app.json - Added paths config and ../shared include"
    - "frontend/index.html - JetBrains Mono Google Fonts preconnect + link"
    - "frontend/src/main.tsx - QueryClientProvider + document.documentElement.classList.add('dark')"
    - "frontend/components.json - shadcn config with correct src-relative aliases"

key-decisions:
  - "shadcn components placed manually in src/components/ui/ after shadcn init wrote to @/ literally instead of src/"
  - "sonner.tsx fixed to import from 'sonner' package directly (shadcn generated circular self-import)"
  - "next-themes removed from sonner wrapper (not needed -- dark theme hardcoded via document.documentElement class)"
  - "Sidebar filter pills: only All/Active show real data (status would require fetching all overviews, deferred to avoid N+1)"
  - "SettingsDialog uses inline confirm (click twice) instead of AlertDialog to reduce component count"

patterns-established:
  - "Theme colors: always use CSS variables (var(--color-accent), var(--color-bg3)) in inline styles, never hardcode hex"
  - "Border radius: var(--radius-sm)=8px buttons, var(--radius-md)=10px cards, var(--radius-lg)=12px panels, var(--radius-badge)=20px pills"
  - "Font: all text uses fontFamily: var(--font-mono) explicitly to ensure JetBrains Mono everywhere"
  - "Button styling: primary = accent bg + #0e0e10 text + font-semibold, ghost = transparent + text2 color"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04]

# Metrics
duration: 8min
completed: 2026-03-01
---

# Phase 2 Plan 01: Frontend Scaffold and Project Management UI Summary

**Vite + React + Tailwind v4 SPA with cc-manager dark terminal aesthetic, TanStack Query, Zustand, and full project CRUD (register, remove, switch, overview) via shadcn/ui components**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-01T10:51:14Z
- **Completed:** 2026-03-01T10:59:01Z
- **Tasks:** 2
- **Files modified:** 30 created, 5 modified

## Accomplishments

- Vite React+TypeScript SPA scaffolded with Tailwind v4, shadcn/ui (8 components), TanStack Query, Zustand
- Dark terminal theme implemented matching cc-manager exactly: #0e0e10 bg, #c8ff00 accent, JetBrains Mono font
- Full project management UI: add project dialog, settings/remove dialog, 340px sidebar with search + filter pills
- Command palette (Cmd+K) for keyboard-first project switching
- Project overview with phase grid, status badges, roadmap completion icons, and progress bar
- Shared types from `@shared/types` (../shared) importable without errors
- Production build: 380KB JS (117KB gzip), 26KB CSS -- clean 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React + Tailwind v4 + shadcn/ui with dark terminal theme** - `aa78474` (feat)
2. **Task 2: Project management UI -- sidebar, command palette, overview, modals** - `def9f50` (feat)

## Files Created/Modified

- `frontend/vite.config.ts` - Tailwind v4 plugin + @/ and @shared/ path aliases
- `frontend/tsconfig.app.json` - paths config, ../shared/** include
- `frontend/index.html` - JetBrains Mono Google Fonts
- `frontend/components.json` - shadcn config with proper src-relative aliases
- `frontend/src/index.css` - Full dark terminal theme with @theme block + shadcn CSS var mappings
- `frontend/src/main.tsx` - QueryClientProvider + dark class on documentElement
- `frontend/src/App.tsx` - Root layout: Header + Sidebar + main + CommandPalette + dialogs
- `frontend/src/lib/api.ts` - apiFetch<T> helper (throws on error, handles 204/text/json)
- `frontend/src/lib/queryClient.ts` - QueryClient (staleTime 30s, retry 1, no refetchOnFocus)
- `frontend/src/lib/utils.ts` - cn() for shadcn (clsx + tailwind-merge)
- `frontend/src/stores/appStore.ts` - Zustand with activeProjectId + selectedFile + persist
- `frontend/src/hooks/useProjects.ts` - 4 hooks for project CRUD + overview
- `frontend/src/components/layout/Header.tsx` - GSD badge, settings button, New Project button
- `frontend/src/components/layout/Sidebar.tsx` - Search, filter pills, scrollable project list
- `frontend/src/components/layout/CommandPalette.tsx` - Cmd+K with project search + Add action
- `frontend/src/components/layout/AddProjectDialog.tsx` - 520px modal with path + displayName
- `frontend/src/components/layout/SettingsDialog.tsx` - Project list with inline remove confirm
- `frontend/src/components/overview/ProjectOverview.tsx` - Phase grid + progress bar + state card
- `frontend/src/components/overview/PhaseCard.tsx` - Phase card with status badges + roadmap icon
- `frontend/src/components/ui/` - 8 shadcn components (button, input, dialog, command, sonner, badge, scroll-area, separator)

## Decisions Made

- **shadcn init workaround:** shadcn wrote components to literal `@/` directory (not `src/`). Manually created `components.json` first, then moved generated files to `src/components/ui/` and created `src/lib/utils.ts` manually.
- **Sonner circular import fix:** shadcn generated `sonner.tsx` that imported `Toaster` from itself. Fixed to import from `"sonner"` package directly and removed `next-themes` dependency.
- **Filter pills simplified:** Full status filtering would require fetching all project overviews (N+1 calls). Simplified to All/Active only with a note -- full filtering deferred.
- **Inline confirm for remove:** Used a two-click inline confirmation in SettingsDialog instead of a separate AlertDialog component, keeping component count lower.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed shadcn sonner.tsx circular self-import**
- **Found during:** Task 1 (build verification)
- **Issue:** shadcn@3.8.5 generated sonner.tsx that imported `Toaster as Sonner` from `"@/components/ui/sonner"` (itself), causing TypeScript circular reference error
- **Fix:** Rewrote sonner.tsx to import from `"sonner"` package directly, removed `next-themes` dependency (not needed with hardcoded dark theme)
- **Files modified:** `frontend/src/components/ui/sonner.tsx`
- **Verification:** `npm run build` passes cleanly
- **Committed in:** `aa78474` (Task 1 commit)

**2. [Rule 3 - Blocking] Created components.json and moved shadcn components manually**
- **Found during:** Task 1 (shadcn init)
- **Issue:** `npx shadcn init --yes` failed validation -- needed Tailwind CSS already set up and tsconfig path aliases. shadcn then wrote components to `./@ /components/ui/` literally instead of `src/components/ui/`
- **Fix:** Pre-created `components.json` with correct config, ran `npx shadcn add` directly, moved files from `@/` dir to `src/components/ui/`, created `src/lib/utils.ts` manually
- **Files modified:** `components.json`, entire `src/components/ui/` structure
- **Verification:** All imports resolve, build passes
- **Committed in:** `aa78474` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes required to complete Task 1. No scope changes.

## Issues Encountered

- shadcn@3.8.5 init behavior differs from documented -- uses `--yes --defaults` flags but still requires pre-existing Tailwind config and tsconfig paths before it will run. Resolved by manually pre-creating components.json then using `npx shadcn add` directly.

## User Setup Required

None - no external service configuration required beyond having the backend running on port 3001.

## Next Phase Readiness

- Frontend SPA ready for Plan 02-02 (document viewer/markdown reader)
- `setSelectedFile(path)` in appStore is the integration point for 02-02 to consume
- `activeProjectId` available for any component needing current project context
- All 8 shadcn components installed; additional components can be added with `npx shadcn add <component>`
- Backend must be running on port 3001 for data to load (CORS pre-configured for localhost:5173)

---
*Phase: 02-frontend-document-viewer*
*Completed: 2026-03-01*
