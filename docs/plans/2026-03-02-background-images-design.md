# Background Images Feature Design

## Overview

Add optional background wallpaper images to the content area of the app. When selected, the wallpaper shows behind terminal and plugin tabs, which become translucent.

## Requirements

- 8 bundled wallpapers (from existing collection) + custom image via file picker
- Background visible in **content area only** (sidebar/header stay opaque)
- Terminal becomes translucent (xterm.js rgba background)
- Plugin tabs become translucent
- Fixed opacity (~75%) — no user slider
- "None" option to disable
- Setting persisted in `~/.cc-manager/settings.json`

## Data Model

### Settings (Rust)

Add to `Settings` struct in `settings.rs`:

```rust
#[serde(default)]
pub background_image: Option<String>,
```

Values:
- `None` — no background (default)
- `Some("preset:<name>")` — bundled wallpaper (e.g. `"preset:ship-at-sea"`)
- `Some("/absolute/path/to/image.jpg")` — custom image (absolute filesystem path, not copied)

### Zustand Store

Add to `AppState` in `appStore.ts`:

```ts
backgroundImage: string | null
setBackgroundImage: (img: string | null) => void
```

### Settings Interface (TS)

Add to `Settings` in `SettingsPage.tsx`:

```ts
background_image: string | null
```

## Bundled Assets

8 wallpapers copied to `public/wallpapers/`:

| File | Preset ID | Source |
|---|---|---|
| `ship-at-sea.jpg` | `preset:ship-at-sea` | `0-ship-at-sea.jpg` |
| `akane-pagoda.jpg` | `preset:akane-pagoda` | `1-akane.jpg` |
| `everforest.jpg` | `preset:everforest` | `1-everforest.jpg` |
| `gruvbox-ferns.jpg` | `preset:gruvbox-ferns` | `2-gruvbox.jpg` |
| `akane-cliff.jpg` | `preset:akane-cliff` | `4-akane.jpg` |
| `akane-bridge.jpg` | `preset:akane-bridge` | `5-akane.jpg` |
| `akane-mist.jpg` | `preset:akane-mist` | `8.akane.jpg` |
| `pink-lakeside.jpg` | `preset:pink-lakeside` | `1-scenery-pink-...144.png` |

Served as static assets at `/wallpapers/<name>.jpg`.

## Layout (Shell.tsx)

Content area structure when wallpaper is active:

```
Content area wrapper (relative)
  ├── Background image (absolute inset-0, z-0, object-cover)
  ├── Terminal tabs (absolute inset-0, z-10, rgba bg ~0.75 opacity)
  ├── Plugin tabs (absolute inset-0, z-10, rgba bg ~0.75 opacity)
  └── Empty state (z-10)
```

- Background image: `<img>` with `object-fit: cover`
- Presets: `src="/wallpapers/<name>.jpg"`
- Custom paths: `src={convertFileSrc(path)}` from `@tauri-apps/api/core`
- Only renders when `backgroundImage` is non-null

## Terminal Translucency

xterm.js accepts rgba for its `background` theme property.

Add helper in `themes.ts`:

```ts
function hexToRgba(hex: string, alpha: number): string
```

When wallpaper is active, `XTerminal` uses `rgba(r, g, b, 0.75)` instead of the opaque hex background.

## Plugin Tab Translucency

Plugin tab containers swap from `bg-background` to `bg-background/75` (Tailwind opacity modifier) when wallpaper is active.

## Settings UI

New "Background image" row in Appearance section (below theme picker):

- Grid of thumbnail previews for 8 presets
- "None" option (first in grid) to disable
- "Custom..." button opens native file dialog
- Selected wallpaper gets `border-primary` highlight (same pattern as theme picker)

## Rust Backend

Two changes:

1. `settings.rs` — add `background_image: Option<String>` to `Settings` struct
2. New `pick_wallpaper` command — opens native file dialog filtered to image types, returns `Option<String>` path

## Approach

CSS-only compositing. Wallpaper is an `<img>` behind content. Terminal and plugin backgrounds use rgba/opacity to show through. No canvas, WebGL, or blend modes.
