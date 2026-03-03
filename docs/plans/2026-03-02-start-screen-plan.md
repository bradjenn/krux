# Start Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a LazyVim-style start screen that appears when no project is selected, with the Archon logo and keyboard-driven menu actions.

**Architecture:** Replace the existing empty state in Shell.tsx (lines 408-436) with a new StartScreen component. Add `lastActiveProjectId` to the Zustand store for "Resume Last Session". Single-key shortcuts (a/p/r/s/q) only fire when the start screen is visible.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 4, Tauri 2 (for quit), Hugeicons + Lucide (icons)

---

### Task 1: Add lastActiveProjectId to appStore

**Files:**
- Modify: `src/stores/appStore.ts:20-83`

**Step 1: Add state field and setter to the interface**

In `AppState` interface (line 20), add after `setActiveProject`:

```typescript
lastActiveProjectId: string | null
```

**Step 2: Track last active project in setActiveProject**

In the `setActiveProject` implementation (line 69), update so that when `id` is non-null, we also store it as `lastActiveProjectId`:

```typescript
setActiveProject: (id) => {
  set({ activeProjectId: id, activeView: 'projects', ...(id ? { lastActiveProjectId: id } : {}) })
  // ... rest unchanged
```

**Step 3: Add initial value**

After `activeProjectId: null` (line 67), add:

```typescript
lastActiveProjectId: null,
```

**Step 4: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: track lastActiveProjectId in app store for resume session"
```

---

### Task 2: Create StartScreen component

**Files:**
- Create: `src/components/layout/StartScreen.tsx`

**Step 1: Create the component**

```tsx
import { exit } from '@tauri-apps/plugin-process'
import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface StartScreenProps {
  onAddProject: () => void
  onSwitchProject: () => void
  wallpaperActive: boolean
  backgroundOpacity: number
}

interface MenuItem {
  key: string
  label: string
  icon: string
  action: () => void
}

export default function StartScreen({
  onAddProject,
  onSwitchProject,
  wallpaperActive,
  backgroundOpacity,
}: StartScreenProps) {
  const { projects, lastActiveProjectId, setActiveProject, setActiveView } = useAppStore()

  const menuItems: MenuItem[] = [
    { key: 'a', label: 'Add Project', icon: '+', action: onAddProject },
    { key: 'p', label: 'Switch Project', icon: '⌘', action: onSwitchProject },
    ...(lastActiveProjectId && projects.find((p) => p.id === lastActiveProjectId)
      ? [{ key: 'r', label: 'Resume Last Session', icon: '↩', action: () => setActiveProject(lastActiveProjectId) }]
      : []),
    { key: 's', label: 'Settings', icon: '⚙', action: () => setActiveView('settings') },
    { key: 'q', label: 'Quit', icon: '⏻', action: () => exit(0) },
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle bare keys (no modifiers) to avoid conflicting with Cmd/Ctrl shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Don't handle if focused inside an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const item = menuItems.find((m) => m.key === e.key)
      if (item) {
        e.preventDefault()
        item.action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full select-none',
        wallpaperActive && 'relative z-10',
      )}
      style={
        wallpaperActive
          ? { background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)` }
          : undefined
      }
    >
      {/* Logo */}
      <img
        src="/logo.svg"
        alt="Archon"
        className="w-28 h-28 mb-8 drop-shadow-[0_0_30px_rgba(0,255,239,0.3)]"
        draggable={false}
      />

      {/* Divider */}
      <div className="w-48 h-px bg-border mb-8 opacity-50" />

      {/* Menu */}
      <div className="flex flex-col gap-1 w-64">
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.action}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-surface',
              'cursor-pointer text-sm',
            )}
          >
            <span className="w-5 text-center text-secondary opacity-70">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            <kbd className="text-xs text-dim font-mono">{item.key}</kbd>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 text-xs text-dim">
        v0.1.0{projects.length > 0 && ` · ${projects.length} project${projects.length !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/layout/StartScreen.tsx
git commit -m "feat: create StartScreen component with keyboard-driven menu"
```

---

### Task 3: Wire StartScreen into Shell

**Files:**
- Modify: `src/components/layout/Shell.tsx:1-17,408-436`

**Step 1: Add import**

After line 16 (`import WallpaperSwitcher from './WallpaperSwitcher'`), add:

```typescript
import StartScreen from './StartScreen'
```

**Step 2: Replace the empty state block**

Replace the entire empty state block (lines 408-436):

```tsx
          {/* Empty state */}
          {!activeProjectId && (
            <div
              className={cn(
                'flex flex-col items-center justify-center h-full gap-4 text-dim',
                wallpaperUrl && 'relative z-10',
              )}
              style={
                wallpaperUrl
                  ? {
                      background: `color-mix(in srgb, var(--bg) ${Math.round(backgroundOpacity * 100)}%, transparent)`,
                    }
                  : undefined
              }
            >
              <div
                className="flex items-center justify-center"
                style={{ fontSize: 28, opacity: 0.3, fontWeight: 300 }}
              >
                <span className="text-muted-foreground">&gt;_</span>
              </div>
              <div className="text-center">
                <div className="text-base font-medium text-muted-foreground">Select a project</div>
                <div className="text-xs mt-1">
                  Choose a project from the sidebar to manage its Claude Code sessions
                </div>
              </div>
            </div>
          )}
```

With:

```tsx
          {/* Start screen */}
          {!activeProjectId && (
            <StartScreen
              onAddProject={() => setDiscoverOpen(true)}
              onSwitchProject={() => setSwitcherOpen(true)}
              wallpaperActive={!!wallpaperUrl}
              backgroundOpacity={backgroundOpacity}
            />
          )}
```

**Step 3: Verify the app compiles**

Run: `npm run dev` or `npm run build`
Expected: No TypeScript errors, app renders the start screen when no project is selected.

**Step 4: Commit**

```bash
git add src/components/layout/Shell.tsx
git commit -m "feat: replace empty state with StartScreen in Shell"
```

---

### Task 4: Install Tauri process plugin (if not already present)

**Files:**
- Check: `src-tauri/Cargo.toml` and `package.json`

**Step 1: Check if tauri-plugin-process is available**

```bash
grep "plugin-process" src-tauri/Cargo.toml package.json
```

If NOT present, install it:

```bash
npm run tauri add process
```

If already present, skip this task.

**Step 2: Commit (if changes)**

```bash
git add -A
git commit -m "feat: add tauri-plugin-process for quit functionality"
```

---

### Task 5: Manual QA and polish

**Step 1: Launch the app and verify:**

1. App opens → start screen visible with logo, menu items, version footer
2. Press `a` → Discover Dialog opens
3. Press Escape, then `p` → Project Switcher opens
4. Press Escape, then `s` → Settings page opens
5. Press Escape, then `q` → App quits
6. Re-open, add a project, select it, then deselect → start screen reappears
7. Select project again, close app, re-open → `r` (Resume Last Session) visible and works
8. With wallpaper active → start screen has transparent overlay

**Step 2: Final commit if any polish needed**
