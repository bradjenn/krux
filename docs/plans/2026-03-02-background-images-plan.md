# Background Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional wallpaper backgrounds to the content area, with bundled presets, custom file picker, and terminal translucency.

**Architecture:** CSS-only compositing — wallpaper `<img>` sits behind content area, terminal and plugin backgrounds use rgba to show through. Settings persisted via existing Rust `Settings` struct. Tauri `dialog` plugin for native file picker. Tauri `convertFileSrc` for custom image paths.

**Tech Stack:** Tauri v2, React, Zustand, xterm.js, tauri-plugin-dialog

---

### Task 1: Copy bundled wallpapers into public/

**Files:**
- Create: `public/wallpapers/ship-at-sea.jpg`
- Create: `public/wallpapers/akane-pagoda.jpg`
- Create: `public/wallpapers/everforest.jpg`
- Create: `public/wallpapers/gruvbox-ferns.jpg`
- Create: `public/wallpapers/akane-cliff.jpg`
- Create: `public/wallpapers/akane-bridge.jpg`
- Create: `public/wallpapers/akane-mist.jpg`
- Create: `public/wallpapers/pink-lakeside.jpg`

**Step 1: Create directory and copy files**

```bash
mkdir -p public/wallpapers
cp ~/dotfiles/wallpapers/0-ship-at-sea.jpg public/wallpapers/ship-at-sea.jpg
cp ~/dotfiles/wallpapers/1-akane.jpg public/wallpapers/akane-pagoda.jpg
cp ~/dotfiles/wallpapers/1-everforest.jpg public/wallpapers/everforest.jpg
cp ~/dotfiles/wallpapers/2-gruvbox.jpg public/wallpapers/gruvbox-ferns.jpg
cp ~/dotfiles/wallpapers/4-akane.jpg public/wallpapers/akane-cliff.jpg
cp ~/dotfiles/wallpapers/5-akane.jpg public/wallpapers/akane-bridge.jpg
cp ~/dotfiles/wallpapers/8.akane.jpg public/wallpapers/akane-mist.jpg
cp ~/dotfiles/wallpapers/1-scenery-pink-lakeside-sunset-lake-landscape-scenic-panorama-7680x3215-144.png public/wallpapers/pink-lakeside.jpg
```

Note: The last file is a .png but we rename to .jpg — it will still render fine in `<img>`. If the browser rejects it, convert with `sips -s format jpeg`.

**Step 2: Verify files exist**

```bash
ls -la public/wallpapers/
```

Expected: 8 image files.

**Step 3: Commit**

```bash
git add public/wallpapers/
git commit -m "feat: add bundled wallpaper images"
```

---

### Task 2: Add wallpaper preset registry

**Files:**
- Create: `src/lib/wallpapers.ts`

**Step 1: Create the wallpaper presets file**

```ts
// src/lib/wallpapers.ts

export interface WallpaperPreset {
  id: string       // e.g. "preset:ship-at-sea"
  name: string     // display name
  file: string     // filename in public/wallpapers/
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: 'preset:ship-at-sea', name: 'Ship at Sea', file: 'ship-at-sea.jpg' },
  { id: 'preset:akane-pagoda', name: 'Akane Pagoda', file: 'akane-pagoda.jpg' },
  { id: 'preset:everforest', name: 'Everforest', file: 'everforest.jpg' },
  { id: 'preset:gruvbox-ferns', name: 'Gruvbox Ferns', file: 'gruvbox-ferns.jpg' },
  { id: 'preset:akane-cliff', name: 'Akane Cliff', file: 'akane-cliff.jpg' },
  { id: 'preset:akane-bridge', name: 'Akane Bridge', file: 'akane-bridge.jpg' },
  { id: 'preset:akane-mist', name: 'Akane Mist', file: 'akane-mist.jpg' },
  { id: 'preset:pink-lakeside', name: 'Pink Lakeside', file: 'pink-lakeside.jpg' },
]

/**
 * Resolve a wallpaper setting value to a URL the webview can render.
 * - Presets: "/wallpapers/<file>"
 * - Custom paths: use convertFileSrc for asset:// protocol
 * - null: no wallpaper
 */
export function resolveWallpaperUrl(value: string | null): string | null {
  if (!value) return null
  const preset = WALLPAPER_PRESETS.find((p) => p.id === value)
  if (preset) return `/wallpapers/${preset.file}`
  // Custom absolute path — use Tauri asset protocol
  // convertFileSrc is imported where this is called, or we inline it here
  // For now, return the raw path — Shell.tsx will handle convertFileSrc
  return value
}
```

**Step 2: Commit**

```bash
git add src/lib/wallpapers.ts
git commit -m "feat: add wallpaper preset registry"
```

---

### Task 3: Add `background_image` to Rust Settings + `pick_wallpaper` command

**Files:**
- Modify: `src-tauri/Cargo.toml` (add `tauri-plugin-dialog`)
- Modify: `src-tauri/src/settings.rs` (add field + pick command)
- Modify: `src-tauri/src/lib.rs` (register plugin + command)
- Modify: `src-tauri/capabilities/default.json` (add dialog + asset permissions)

**Step 1: Add tauri-plugin-dialog dependency**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
tauri-plugin-dialog = "2"
```

Also install the JS binding:

```bash
npm install @tauri-apps/plugin-dialog
```

**Step 2: Add `background_image` field to Settings struct**

In `src-tauri/src/settings.rs`, add to the `Settings` struct:

```rust
#[serde(default)]
pub background_image: Option<String>,
```

And update `Default` impl to include:

```rust
background_image: None,
```

**Step 3: Add `pick_wallpaper` command**

In `src-tauri/src/settings.rs`, add:

```rust
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn pick_wallpaper(app: tauri::AppHandle) -> Option<String> {
    let file = app.dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "gif", "webp", "bmp"])
        .blocking_pick_file();
    file.map(|f| f.path.to_string_lossy().to_string())
}
```

**Step 4: Register plugin and command in lib.rs**

In `src-tauri/src/lib.rs`:

- Add `.plugin(tauri_plugin_dialog::init())` to the builder chain (after `tauri_plugin_shell::init()`)
- Add `settings::pick_wallpaper` to the `invoke_handler` list

**Step 5: Add permissions to capabilities**

In `src-tauri/capabilities/default.json`, add to the `permissions` array:

```json
"dialog:default"
```

Also add asset protocol scope so `convertFileSrc` works for custom images:

```json
{
  "identifier": "core:asset:default",
  "allow": [{ "path": "**" }]
}
```

**Step 6: Verify Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: compiles cleanly.

**Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/settings.rs src-tauri/src/lib.rs src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "feat: add background_image setting + pick_wallpaper command"
```

---

### Task 4: Add `backgroundImage` to Zustand store

**Files:**
- Modify: `src/stores/appStore.ts`

**Step 1: Add state and setter**

In `AppState` interface, add:

```ts
backgroundImage: string | null
setBackgroundImage: (img: string | null) => void
```

In the store implementation, add:

```ts
backgroundImage: null,
setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
```

**Step 2: Load from settings on startup**

In `src/components/layout/Shell.tsx`, in the `load_settings` effect (line ~52-72), add after the other `store.set*` calls:

```ts
store.setBackgroundImage(s.background_image ?? null)
```

Also update the `Settings` type parameter on the `invoke<{...}>` call to include `background_image: string | null`.

**Step 3: Commit**

```bash
git add src/stores/appStore.ts src/components/layout/Shell.tsx
git commit -m "feat: add backgroundImage to Zustand store"
```

---

### Task 5: Add `hexToRgba` helper to themes.ts

**Files:**
- Modify: `src/lib/themes.ts`

**Step 1: Export the hex-to-rgba helper**

The file already has a private `hexToGlow` function (line 479). Rename it to be more general or add a public export:

```ts
/**
 * Convert hex color to rgba string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
```

Refactor `hexToGlow` to call `hexToRgba` since they do the same thing:

```ts
function hexToGlow(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha)
}
```

**Step 2: Commit**

```bash
git add src/lib/themes.ts
git commit -m "feat: export hexToRgba helper from themes"
```

---

### Task 6: Render wallpaper layer in Shell.tsx

**Files:**
- Modify: `src/components/layout/Shell.tsx`

**Step 1: Add wallpaper background to content area**

Import at top of file:

```ts
import { convertFileSrc } from '@tauri-apps/api/core'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'
```

Subscribe to store:

```ts
const backgroundImage = useAppStore((s) => s.backgroundImage)
```

Add a `wallpaperUrl` memo:

```ts
const wallpaperUrl = useMemo(() => {
  if (!backgroundImage) return null
  const preset = WALLPAPER_PRESETS.find((p) => p.id === backgroundImage)
  if (preset) return `/wallpapers/${preset.file}`
  return convertFileSrc(backgroundImage)
}, [backgroundImage])
```

Inside the content area div (`<div className="flex-1 min-h-0 relative">`), add as the first child:

```tsx
{wallpaperUrl && (
  <img
    src={wallpaperUrl}
    alt=""
    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
  />
)}
```

**Step 2: Make terminal containers translucent when wallpaper active**

Change the terminal tab wrapper div (around line 222):

From: `"absolute inset-0 transition-opacity duration-100"`
To: `cn("absolute inset-0 transition-opacity duration-100", wallpaperUrl ? "z-10" : "")`

The terminal container `<div>` itself needs no bg change — the `XTerminal` component handles its own background.

**Step 3: Make plugin tab containers translucent**

Change the plugin tab wrapper div (around line 247):

From: `"absolute inset-0 overflow-auto bg-background transition-opacity duration-100"`
To: `cn("absolute inset-0 overflow-auto transition-opacity duration-100", wallpaperUrl ? "z-10 bg-background/75" : "bg-background")`

**Step 4: Make empty state translucent**

The empty state div (line 261) — add z-10 when wallpaper active:

```tsx
className={cn("flex flex-col items-center justify-center h-full gap-4 text-dim", wallpaperUrl && "z-10")}
```

**Step 5: Commit**

```bash
git add src/components/layout/Shell.tsx
git commit -m "feat: render wallpaper layer in content area"
```

---

### Task 7: Make XTerminal translucent when wallpaper active

**Files:**
- Modify: `src/components/terminal/XTerminal.tsx`

**Step 1: Subscribe to backgroundImage and use rgba background**

Add import:

```ts
import { hexToRgba } from '../../lib/themes'
```

Add store subscription:

```ts
const backgroundImage = useAppStore((s) => s.backgroundImage)
```

Change the terminal theme computation (currently line 34):

From:

```ts
const termTheme = getTerminalTheme(theme)
```

To:

```ts
const baseTermTheme = getTerminalTheme(theme)
const termTheme = backgroundImage
  ? { ...baseTermTheme, background: hexToRgba(baseTermTheme.background ?? '#000000', 0.75) }
  : baseTermTheme
```

**Step 2: Update the settings-change effect**

In the effect at line 57 that updates `term.options.theme`, it currently calls `getTerminalTheme(theme)`. Update it to also account for `backgroundImage`:

```ts
const baseTheme = getTerminalTheme(theme)
term.options.theme = backgroundImage
  ? { ...baseTheme, background: hexToRgba(baseTheme.background ?? '#000000', 0.75) }
  : baseTheme
```

Add `backgroundImage` to the effect's dependency array.

**Step 3: Update the container div background**

The container div (line 143-150) currently uses `style={{ background: termTheme.background }}`. This already uses the computed `termTheme` which now includes rgba when wallpaper is active, so this should work as-is. But double-check the `termTheme` variable is used (not `terminalTheme` or something else).

**Step 4: Commit**

```bash
git add src/components/terminal/XTerminal.tsx
git commit -m "feat: make terminal translucent when wallpaper active"
```

---

### Task 8: Add wallpaper picker to Settings UI

**Files:**
- Modify: `src/components/layout/SettingsPage.tsx`

**Step 1: Add background_image to Settings interface**

```ts
interface Settings {
  // ... existing fields
  background_image: string | null
}
```

**Step 2: Import dependencies**

```ts
import { invoke } from '@tauri-apps/api/core'
import { WALLPAPER_PRESETS } from '@/lib/wallpapers'
```

(invoke is already imported)

**Step 3: Subscribe to backgroundImage from store**

In the destructured `useAppStore()` call, add `backgroundImage` and `setBackgroundImage`.

**Step 4: Add wallpaper change handler**

```ts
const handleWallpaperChange = (value: string | null) => {
  setBackgroundImage(value)
  if (settings) save({ ...settings, background_image: value })
}

const handlePickCustomWallpaper = async () => {
  const path = await invoke<string | null>('pick_wallpaper')
  if (path) handleWallpaperChange(path)
}
```

**Step 5: Add wallpaper setting row in appearance section**

After the theme `SettingRow` (after line 121), add:

```tsx
<SettingRow label="Background image" description="Show a wallpaper behind the content area">
  <div className="grid grid-cols-4 gap-2">
    {/* None option */}
    <button
      onClick={() => handleWallpaperChange(null)}
      className={cn(
        "flex items-center justify-center h-16 rounded-md text-xs border transition-all duration-150 cursor-pointer",
        !backgroundImage
          ? "border-primary bg-primary/[0.06] text-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-dim"
      )}
    >
      None
    </button>
    {/* Preset thumbnails */}
    {WALLPAPER_PRESETS.map((preset) => (
      <button
        key={preset.id}
        onClick={() => handleWallpaperChange(preset.id)}
        className={cn(
          "relative h-16 rounded-md overflow-hidden border transition-all duration-150 cursor-pointer",
          backgroundImage === preset.id
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-dim"
        )}
      >
        <img
          src={`/wallpapers/${preset.file}`}
          alt={preset.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
          <span className="text-[10px] text-white/90">{preset.name}</span>
        </div>
      </button>
    ))}
    {/* Custom option */}
    <button
      onClick={handlePickCustomWallpaper}
      className={cn(
        "flex items-center justify-center h-16 rounded-md text-xs border border-dashed transition-all duration-150 cursor-pointer",
        backgroundImage && !backgroundImage.startsWith('preset:')
          ? "border-primary bg-primary/[0.06] text-foreground"
          : "border-border text-muted-foreground hover:border-dim"
      )}
    >
      Custom...
    </button>
  </div>
</SettingRow>
```

**Step 6: Commit**

```bash
git add src/components/layout/SettingsPage.tsx
git commit -m "feat: add wallpaper picker in settings UI"
```

---

### Task 9: Verify end-to-end

**Step 1: Run the dev server**

```bash
npm run tauri dev
```

**Step 2: Manual verification checklist**

- [ ] Open Settings > Appearance
- [ ] Wallpaper thumbnails render in a grid
- [ ] Clicking a preset shows it behind content area
- [ ] Terminal becomes translucent (text readable over wallpaper)
- [ ] Plugin tabs (GSD, Chat) become translucent
- [ ] "None" removes the wallpaper
- [ ] "Custom..." opens native file dialog
- [ ] Selecting a custom image works
- [ ] Quit and reopen — setting persisted
- [ ] Header and sidebar remain opaque

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: wallpaper adjustments from manual testing"
```
