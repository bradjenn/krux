---
phase: 02-frontend-document-viewer
plan: "02"
subsystem: ui
tags: [react, react-markdown, remark-gfm, rehype-highlight, highlight.js, tanstack-query, zustand, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: apiFetch helper, useAppStore (activeProjectId + selectedFile), shadcn ScrollArea, dark terminal theme CSS vars

provides:
  - GET /api/projects/:id/docs endpoint returning nested JSON tree of .planning/ directory
  - useFileTree TanStack Query hook consuming the tree endpoint
  - FileTree recursive component with collapsible folders, status dots, VS Code explorer style
  - useDocument TanStack Query hook fetching raw markdown content
  - DocViewer react-markdown renderer with GFM, tables, task lists, syntax highlighting via rehype-highlight
  - Breadcrumb component with clickable path segments
  - DocumentPage layout combining FileTree (280px left panel) + DocViewer (right panel)
  - Updated App.tsx switching between ProjectOverview and DocumentPage views via selectedFile state
  - BackToOverviewButton in Header rightSlot for navigation back from document view

affects:
  - 02-03-chat-interface (builds on same layout shell and appStore)

# Tech tracking
tech-stack:
  added:
    - "react-markdown ^10 (React markdown renderer)"
    - "remark-gfm (GitHub Flavored Markdown: tables, task lists, strikethrough)"
    - "rehype-highlight (syntax highlighting via highlight.js)"
    - "highlight.js (syntax highlighting library with atom-one-dark theme)"
  patterns:
    - "Markdown rendering: react-markdown + remark-gfm + rehype-highlight (NOT react-syntax-highlighter)"
    - "Component overrides via react-markdown components prop for all element types"
    - "Block vs inline code detection: className?.startsWith('hljs') || className?.startsWith('language-')"
    - "Tree building: recursive readdirSync with dirs-first sort, status via SUMMARY sibling detection"
    - "App view switching: selectedFile null -> ProjectOverview, non-null -> DocumentPage (no router needed)"
    - "Header rightSlot: optional ReactNode prop for contextual action buttons"

key-files:
  created:
    - "backend/src/routes/docs.ts - Added GET /:id/docs tree endpoint (before wildcard route)"
    - "frontend/src/hooks/useFileTree.ts - TanStack Query hook for directory tree"
    - "frontend/src/hooks/useDocument.ts - TanStack Query hook for raw markdown content"
    - "frontend/src/components/viewer/FileTree.tsx - Recursive VS Code-style file tree"
    - "frontend/src/components/viewer/DocViewer.tsx - react-markdown with GFM + syntax highlighting"
    - "frontend/src/components/viewer/Breadcrumb.tsx - Clickable path breadcrumb bar"
    - "frontend/src/components/viewer/DocumentPage.tsx - DocumentPage layout wrapper with skeletons"
  modified:
    - "frontend/src/App.tsx - Added DocumentPage view switching + BackToOverviewButton"
    - "frontend/src/components/layout/Header.tsx - Added optional rightSlot ReactNode prop"
    - "frontend/src/index.css - Added .hljs background override for theme integration"

key-decisions:
  - "Header rightSlot pattern: optional ReactNode prop allows contextual action injection without Header refactor per view"
  - "App view switching via selectedFile state (null=overview, non-null=document) avoids introducing a router for 2-state navigation"
  - "Inline CSS variables used throughout (var(--color-accent) etc.) consistent with 02-01 patterns"
  - "No rehype-raw added - react-markdown renders safely by default, raw HTML passthrough is an unnecessary security risk"
  - "Block vs inline code detection: className check for 'hljs' or 'language-' prefix (rehype-highlight adds these)"

patterns-established:
  - "Document viewer: FileTree + DocViewer + Breadcrumb pattern for any file-based navigation"
  - "Skeleton loaders: animate-pulse divs with bg4/bg3 colors for loading states"
  - "Status indicators: w-1.5 h-1.5 rounded-full dots (#4ade80=complete, #facc15=in-progress)"

requirements-completed: [DOCS-01, DOCS-02, DOCS-03]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 2 Plan 02: Document Viewer Summary

**React-markdown document viewer with recursive VS Code-style file tree, GFM tables/task-lists, rehype-highlight syntax highlighting, and clickable breadcrumb navigation for browsing .planning/ files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T11:02:21Z
- **Completed:** 2026-03-01T11:08:30Z
- **Tasks:** 2
- **Files modified:** 10 created, 3 modified

## Accomplishments

- Backend GET /:id/docs endpoint returns nested JSON tree with dirs-first sort and PLAN status detection
- FileTree component: collapsible folders, green/yellow status dots, selected file accent highlight
- DocViewer: react-markdown with remark-gfm + rehype-highlight -- renders tables, task lists, fenced code blocks with syntax highlighting
- Breadcrumb component: path segments clickable for folder navigation, accent-colored current file
- DocumentPage layout: 280px tree panel + scrollable content panel with skeleton loaders
- App.tsx view switching: selectedFile null -> ProjectOverview, non-null -> DocumentPage
- Header updated with optional rightSlot for contextual "Back to Overview" button
- Production build: 725KB JS (221KB gzip) -- clean TypeScript, 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend directory listing endpoint + frontend file tree component** - `d076924` (feat)
2. **Task 2: Markdown viewer with GFM, syntax highlighting, and breadcrumbs** - `0f783d2` (feat)

## Files Created/Modified

- `backend/src/routes/docs.ts` - Added GET /:id/docs tree endpoint with buildTree + detectPlanStatus helpers
- `frontend/src/hooks/useFileTree.ts` - TanStack Query hook, queryKey ['filetree', projectId], staleTime 30s
- `frontend/src/hooks/useDocument.ts` - TanStack Query hook, queryKey ['doc', projectId, filePath], staleTime 30s
- `frontend/src/components/viewer/FileTree.tsx` - Recursive TreeItem component, depth-0 open by default
- `frontend/src/components/viewer/DocViewer.tsx` - react-markdown + remark-gfm + rehype-highlight with full component overrides
- `frontend/src/components/viewer/Breadcrumb.tsx` - Fragment-based path segments with ChevronRight separators
- `frontend/src/components/viewer/DocumentPage.tsx` - Layout with TreeSkeleton, DocSkeleton, FileNotFound states
- `frontend/src/App.tsx` - View switching logic + BackToOverviewButton component
- `frontend/src/components/layout/Header.tsx` - Added rightSlot?: ReactNode prop
- `frontend/src/index.css` - Added .hljs background/color override for theme integration

## Decisions Made

- **No rehype-raw:** react-markdown renders safely by default. rehype-raw enables raw HTML passthrough and introduces XSS risk -- excluded per plan instruction.
- **Header rightSlot pattern:** Optional ReactNode prop on Header allows per-view contextual buttons without per-view Header variants.
- **View switching via selectedFile:** Two-state navigation (overview/document) via Zustand state avoids introducing a router. Revisit if more views needed in 02-03.
- **Inline code detection:** `className?.startsWith('hljs') || className?.startsWith('language-')` reliably distinguishes block code (processed by rehype-highlight) from inline code (no className).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added rightSlot prop to Header component**
- **Found during:** Task 2 (App.tsx integration)
- **Issue:** App.tsx needs to inject BackToOverviewButton into Header for document view navigation, but Header had no extension point
- **Fix:** Added optional `rightSlot?: ReactNode` prop to HeaderProps interface, rendered before settings/new-project buttons
- **Files modified:** `frontend/src/components/layout/Header.tsx`
- **Verification:** TypeScript compiles, build passes cleanly
- **Committed in:** `0f783d2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for correct "Back to Overview" navigation integration. No scope creep.

## Issues Encountered

- Large bundle warning (725KB) after adding highlight.js -- expected, not an error. highlight.js includes all language grammars. Can be addressed with dynamic imports or cherry-picked languages in a future optimization pass.

## User Setup Required

None - no external service configuration required beyond having the backend running on port 3001.

## Next Phase Readiness

- Document viewer fully functional: tree sidebar + markdown rendering + breadcrumbs
- `selectedFile` in appStore drives navigation between overview and document view
- Phase card click (from 02-01 PhaseCard) sets selectedFile to phase directory path, auto-navigating to document viewer
- Backend /api/projects/:id/docs endpoint ready for 02-03 or any other consumers
- All viewer components in `frontend/src/components/viewer/` -- isolated and reusable

---
*Phase: 02-frontend-document-viewer*
*Completed: 2026-03-01*
