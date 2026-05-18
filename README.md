# Pixelcamo — Design Handoff

A macOS desktop app for generating pixelated camouflage, dazzle, and blend patterns.
Built as a **PyWebView** app: Python backend (window chrome, native menu, file I/O,
high-resolution export pipeline) + HTML/CSS/JS frontend (live UI, real-time preview).

---

## 1. About these files

The files in this bundle are **design references created in HTML** — a hi-fi prototype
showing the intended look, layout, and interaction model. They are **not production
code to ship**. The task is to recreate this design inside a PyWebView app, using:

- **Python 3.11+** with [`pywebview`](https://pywebview.flowrl.com/) for the window shell
- A **frontend framework of your choice** — React (matching the mockup), Vue, Svelte, or
  even vanilla JS. The mockup uses React + Babel-in-browser for prototyping speed;
  in production you should bundle (Vite, esbuild) and ship static assets.
- **Pillow** for raster export, **ReportLab** or **CairoSVG** for PDF export
- **NumPy** for the pattern generation grid (faster than pure-Python loops)

The frontend handles the **live preview** at viewport resolution. The Python backend
handles the **export render** at full DPI (the user can request 4961×3508 @ 300dpi —
that's ~17 megapixels, far too slow to render in the browser canvas every keystroke).

**Fidelity: high.** Colors, typography, spacing, and interaction details in the mockup
are final. Recreate them faithfully.

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│  pywebview window (frameless on macOS)      │
│  ┌───────────────────────────────────────┐  │
│  │  HTML + CSS + JS (your bundled SPA)   │  │
│  │  - sidebar controls                   │  │
│  │  - live SVG canvas preview            │  │
│  │  - state held in JS                   │  │
│  └──────┬────────────────────────────────┘  │
│         │ window.pywebview.api.*            │
│         ▼                                   │
│  ┌───────────────────────────────────────┐  │
│  │  Python (api.py)                      │  │
│  │  - file open/save (.pcm JSON)         │  │
│  │  - high-res export (PNG / PDF)        │  │
│  │  - menu actions                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Native NSMenu (set via pywebview menu API) │
└─────────────────────────────────────────────┘
```

### Window
- **Default size:** 1200 × 760
- **Minimum size:** 960 × 620
- **Resizable:** yes; canvas reflows fluidly
- **Use the native macOS title bar** (not the in-app one shown in the mockup — the
  mockup draws its own for rendering reasons, but production should use OS chrome).
  In `pywebview.create_window(...)` pass `frameless=False`, `easy_drag=False`.

### Bridge API (Python → JS via `window.pywebview.api`)
```python
class PixelcamoApi:
    def open_document(self) -> dict:        # returns parsed .pcm or None
    def save_document(self, doc: dict) -> str:   # returns path
    def export_pattern(self, doc: dict, opts: ExportOpts) -> str:  # returns path
    def get_recent(self) -> list[str]:
    def reveal_in_finder(self, path: str) -> None:
```

### Bridge API (JS → Python signals)
The native menu actions need to reach the frontend. Use `window.evaluate_js()` from
Python to dispatch synthetic events the frontend listens for:
```js
window.addEventListener('pixelcamo:menu', (e) => {
  switch (e.detail.action) {
    case 'new': /* ... */ break;
    case 'export': /* ... */ break;
    case 'reset-preset': /* ... */ break;
    case 'copy-seed': /* ... */ break;
    case 'toggle-tile': /* ... */ break;
    case 'toggle-harmony': /* ... */ break;
  }
});
```

---

## 3. Native macOS menu bar

Set via pywebview's menu API. Use `&` for mnemonic-style accelerators where applicable.

```
Pixelcamo
  About Pixelcamo
  ─────
  Preferences…              ⌘,
  ─────
  Quit Pixelcamo            ⌘Q

File
  New                       ⌘N
  Open…                     ⌘O
  ─────
  Save                      ⌘S
  Save As…                  ⇧⌘S
  ─────
  Export…                   ⌘E
  Export Tileable Set…      ⇧⌘E

Edit
  Undo                      ⌘Z
  Redo                      ⇧⌘Z
  ─────
  Reset Preset              ⌥⌘R
  Copy Seed                 ⌘C   (when canvas focused)
  Paste Seed                ⌘V   (when canvas focused)

View
  Toggle Tile Guides        ⌘T
  Toggle Harmony Section    ⌥⌘H
  ─────
  Zoom In                   ⌘=
  Zoom Out                  ⌘−
  Actual Size               ⌘0
  Fit to Window             ⌘9

Pattern
  Regenerate                ⌘R
  Randomise Seed            Space  (canvas focused)
  ─────
  Mode › Camo               ⌘1
  Mode › Dazzle             ⌘2
  Mode › Blend              ⌘3

Window           (standard)
Help             (standard)
```

Implementation note: pywebview's built-in menu support is limited. For full fidelity,
use `pywebview.menu.Menu` for cross-platform menus, or drop to PyObjC and configure
`NSApp.mainMenu` directly for macOS-native polish.

---

## 4. Design tokens

All in `styles.css` as CSS custom properties. Copy these exact values.

### Color — background scale
```
--bg-0   #0a0a0b   desktop / deepest
--bg-1   #0d0d0e   window base
--bg-2   #121214   sidebar
--bg-3   #18181b   row hover / inset panels
--bg-4   #1f1f23   control rest
--bg-5   #2a2a2f   control hover
--bg-canvas   #050506   canvas surround
```

### Color — lines
```
--line-1   #1c1c20   subtle hairlines
--line-2   #26262b   section dividers
--line-3   #34343a   control borders
```

### Color — text
```
--fg-0   #f4f4f5   primary
--fg-1   #c8c8cc   values, secondary
--fg-2   #8a8a90   labels
--fg-3   #5a5a60   hints, off
--fg-4   #3a3a40   disabled
```

### Color — accent (amber)
```
--accent     #e8952a
--accent-hi  #f5a747   hover
--accent-lo  #c47a1c   pressed / border
--accent-tint  rgba(232,149,42,0.14)
--accent-line  rgba(232,149,42,0.35)
```

### Status
```
--good   #4ac08d
--warn   #e8952a
--bad    #e85d5d
```

### Typography
```
--mono   'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace
--sans   -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif

--t-xs   10px   labels (uppercase, letter-spacing 0.06em)
--t-sm   11px   small values
--t-md   12px   body
--t-lg   13px   titles
--t-xl   15px   prominent
```

**Bundle JetBrains Mono with the app** (don't fetch from Google Fonts at runtime —
the app must work offline). Use the OFL-licensed family from the JetBrains Mono repo.

### Spacing rhythm
```
--row-h   28px (or 24px in Compact density)
--section-pad   14px
--sidebar-w   320px
--footer-h   56px
--toolbar-h   44px
```

### Radii
- Window: 12px (handled by OS in production)
- Controls (buttons, inputs, selects): 4px
- Segmented control wrapper: 6px / inner buttons 4px
- Swatches: 5px
- Sidebar mode badge: 11px (pill)

---

## 5. Component inventory

### 5.1 Window chrome
- Native macOS title bar (production). Title format: `Pixelcamo — <doc>.pcm` with `· edited` suffix when dirty.
- Status LED + "READY" / "RENDERING" / "ERROR" in the top-right of the title bar — implement only if your window chrome supports trailing accessory views (skip for first pass).

### 5.2 Sidebar (320 px, left)
A vertically scrolling list of **collapsible sections**. Multiple may be open at once
(NOT accordion). Each section has:
- Header row, 32px tall, with a 9×9 chevron (rotates 90° on open, 120ms ease), an
  uppercase mono title (10.5px, letter-spacing 0.08em), and a right-aligned mono
  badge showing the section's current summary state.
- Body: 14px horizontal padding, 8px gap between rows.

Sections (in order):

1. **Pattern**
   - Mode segmented control: Camo / Dazzle / Blend
   - When Mode = Blend, a sub-panel reveals (180ms reveal animation):
     - Opacity slider (0–100%)
     - Type select (Normal, Multiply, Screen, Overlay, Soft-light, Difference)
   - Preset dropdown + reset-to-preset icon button
   - Seed numeric input + dice icon button (randomise)

2. **Palette**
   - Source dropdown (Forest, Desert, Urban, Arctic, Night, Coral, Custom)
   - 4-column grid of swatches (up to 8), each square, hover scales 1.03, hover reveals hex on a black overlay strip at the bottom
   - "+" placeholder swatch when count < 8
   - Selected swatch gets a 1.5px amber outline with 1px offset
   - Below grid: Hex input row with a native color-chip + text field synced to the selected swatch
   - Bottom: Save palette / Load… ghost buttons

3. **Parameters**
   - Pixel scale slider (4–40 px) with right-aligned mono value
   - Density slider (0–100%) with right-aligned mono value
   - Passes 1/2/3 segmented (with "fast" / "std" / "rich" qualitative label on the right)

4. **Texture**
   - Type segmented: None / Stipple / Hatch / Scratch
   - When type ≠ None, a recessed conditional panel (background `--bg-1`, 0.5px `--line-2` border, 6px radius, 10px padding) animates in showing only that type's params:
     - **Stipple:** Opacity, Scale, Density, Colour, Blend
     - **Hatch:** Opacity, Scale, Angle, Spread, Cross-hatch toggle, Colour, Blend
     - **Scratch:** Opacity, Scale, Length, Spread, Colour, Blend
   - The conditional panel's header line shows the active type name in accent color (`name` style)

5. **Colour harmony** (collapsed by default)
   - Base color picker + hex input row
   - Scheme dropdown: Complementary / Analogous / Triadic / Split-comp / Tetradic / Mono
   - 5-cell preview strip
   - Apply to palette → button (amber accent, full-width)

### 5.3 Canvas pane (fluid, right)
- **Top toolbar** (44px, `--bg-1` background, 0.5px `--line-2` bottom border):
  - Left: Mode pill (amber tint with dot), then breadcrumb crumbs (preset › palette › `n-pass`)
  - Right: Seed label + monospace amber seed value (`#042081` format, zero-padded to 6), separator, Tile toggle button, Link button, then big amber **Regenerate** button
- **Canvas area** (background `--bg-canvas` with a faint 40px dotted grid):
  - Centered canvas frame with 4 corner registration marks (12×12 brackets, fg-2)
  - Top-left dim readout: `<W> × <H>px · <DPI> dpi`
  - Top-right dim readout: `<PALETTE> · <n>c`
  - Pattern SVG fills the frame
  - When Tile = ON, faint amber dashed lines at the H/V midpoints showing tile seams
  - **Click empty canvas area** or the frame itself → regenerate (new seed)
  - Bottom-right floating **zoom controls** pill: −, mono readout, +, separator, fit button (⤢)
- **Export bar** (56px, gradient from `#121214` to `#0f0f11`, top border `--line-2`):
  - "EXPORT" label · Size dropdown (140px) · W input · `×` · H input · `px`
  - Separator · "DPI" segmented (150 / 300 / 600) · mm readout (`≈ 297×210 mm`)
  - Separator · "FORMAT" segmented (PNG / PDF)
  - Right: amber **Export <FORMAT>** button with download icon

### 5.4 Statusline (22px, bottom of window)
Mono 10px, color `--fg-3`:
- LED dot + `<status>` (Idle / Rendering…) · generated time
- `<cols> × <rows>` · `<n>` cells
- `<n>` rects (render complexity)
- Right: shortcut hints — ⌘R regen · ⌘E export · ⌘T tile · space seed

### 5.5 Reusable controls

| Control | Height | Notes |
|---|---|---|
| Button (default) | 24px | `--bg-4` bg, 0.5px `--line-3` border, 4px radius, mono 11px |
| Button (ghost) | 24px | Transparent bg, hover `--bg-3` |
| Button (accent) | 24px | `--accent` bg, color `#1a1102`, weight 600 |
| Icon button | 24×24 | Square variant of ghost |
| Toggle (pill) | 32×18 | 9px radius, white knob → amber knob when on |
| Slider thumb | 14×14 | 3px radius, white, turns amber on hover |
| Slider track | 6px high | `--bg-1` bg with 0.5px `--line-3` border, 3px radius |
| Segmented inner btn | 24px | mono 11px, active = accent bg + dark text + 600 weight |
| Passes button | 28×22 | Special segmented variant |
| Color chip | 24×22 | 4px radius, 0.5px `--line-3` |
| Select (custom) | 24px | 4px radius, 8px right-arrow indicator built with CSS borders |
| Number input | 24px | Same as select; `.num` class right-aligns text |

### 5.6 Interactions
- **Section toggles:** click anywhere on the section header; chevron rotates 120ms ease.
- **Conditional reveals:** 180ms ease, slight downward translateY(2px → 0) + opacity. See `.reveal` keyframe in `styles.css`.
- **Slider drag:** standard `<input type="range">`; thumb color shifts to accent on hover. Value updates live via `oninput`.
- **Swatch interactions:** click → select. Double-click → remove (require palette length > 2). Hover scales 1.03 and reveals hex overlay.
- **Hex input validation:** accepts partial input matching `^#[0-9a-f]{0,6}$` so the user can type without the field rejecting in-progress values.
- **Canvas click-to-regenerate:** clicking the canvas frame or the empty area around it calls the same handler as ⌘R. Zoom controls have `stopPropagation` so they don't trigger it.
- **Tile toggle:** when ON, the seed plus the tile flag means the renderer must produce a seamlessly-tileable pattern. Easiest implementation: generate as if on a torus (wrap nearest-neighbour distance modulo grid size).

---

## 6. Pattern generation algorithm

The mockup uses a JS implementation in `camo.js`. Port it to Python (NumPy) for the
high-resolution export path; the JS version stays for live preview.

### Inputs
```python
@dataclass
class PatternOpts:
    width: int           # pixels
    height: int          # pixels
    palette: list[str]   # 2..8 hex colors
    pixel_scale: int     # 4..40, cell size in pixels
    density: int         # 0..100, controls cluster count
    passes: int          # 1, 2, or 3
    seed: int            # any 32-bit int
    mode: str            # 'camo' | 'dazzle' | 'blend'
    tile: bool
```

### Core algorithm (Camo mode)
1. Cell size = `pixel_scale`. Grid is `cols = ceil(W / cell)` × `rows = ceil(H / cell)`.
2. Cluster count = `max(3, round(6 + (density / 100) * 40))`.
3. For each pass (1..N):
   - Generate `cluster_count` cluster seeds — each has random (x, y) in grid space and a random palette index.
   - For every cell, find the nearest seed (Euclidean in grid space) and assign its color. Apply a small coordinate warp (gaussian noise ±0.18 * cell) to make boundaries organic rather than straight Voronoi edges.
   - On passes ≥ 2, only overwrite a cell with the new pass's value 45% of the time. This layers patterns.
4. If `tile`, treat the grid as a torus during nearest-seed lookup.

### Mode variants
- **Camo:** as above.
- **Dazzle:** instead of nearest-seed, use angled stripes — pick `N` random origin points along the canvas perimeter, draw straight lines at random angles between them, fill each region with a palette color. (Classic naval razzle dazzle.) Suggested impl: pick 4–8 random points on each edge, triangulate, fill triangles.
- **Blend:** generate two layers (a low-frequency noise + a Camo grid), composite with the configured opacity and CSS-equivalent blend mode (use Pillow's `ImageChops` or `blend_modes` package).

### Seeded RNG
Mockup uses Mulberry32 (see `camo.js`). For Python, use `numpy.random.default_rng(seed)` — different RNG, accepted divergence between preview and export. If pixel-identical match between preview and export matters, port Mulberry32 to Python verbatim.

### Render to image
- Build a `cols × rows` array of palette indices (NumPy `uint8`).
- Upscale with `numpy.repeat` × `pixel_scale` along each axis to get the pixel image.
- Convert to a Pillow `Image` via the palette lookup, save as PNG or rasterize for PDF.
- For PDF: render at requested DPI into a Pillow image, then embed in a one-page PDF sized to the requested mm dimensions via ReportLab.

### Texture overlay
Render after the base pattern, in a second pass:
- **Stipple:** randomly distribute dots (count derived from canvas area / (200 − density)), each `scale * 0.4` radius.
- **Hatch:** parallel lines at the configured angle, `spread` apart, `scale * 0.4` stroke width. If `cross`, draw a second set perpendicular.
- **Scratch:** random short strokes, `length` long, `scale * 0.3` stroke width, sparse.

Composite via the chosen blend mode (`blend_modes` Python package or manual Pillow ops).

---

## 7. Document format (.pcm)

JSON file the user saves and re-opens. Schema:

```json
{
  "version": 1,
  "mode": "camo",
  "preset": "M81 Woodland",
  "palette": ["#2d3a26", "#4a5239", "#6e7155", "#2a2622", "#8b7d5e", "#1a1f17"],
  "params": {
    "pixel_scale": 14,
    "density": 58,
    "passes": 2,
    "seed": 42081
  },
  "blend": { "opacity": 72, "type": "soft-light" },
  "texture": {
    "type": "stipple",
    "opacity": 36,
    "scale": 3,
    "density": 65,
    "angle": 45,
    "spread": 6,
    "cross": false,
    "length": 12,
    "color": "#0d0d0e",
    "blend": "multiply"
  },
  "harmony": {
    "base": "#e8952a",
    "type": "Triadic"
  },
  "tile": true
}
```

`Untitled` documents have no path until saved. Track `dirty: bool` in the frontend.

---

## 8. Keyboard shortcuts (frontend-handled)

| Shortcut | Action |
|---|---|
| `⌘R` | Regenerate (new random seed) |
| `⌘E` | Export current pattern |
| `⌘T` | Toggle tile guides |
| `Space` | Randomise seed (when canvas focused; ignore in text inputs) |
| `⌘1` `⌘2` `⌘3` | Switch mode to Camo / Dazzle / Blend |
| `⌘=` `⌘−` `⌘0` `⌘9` | Zoom in / out / 100% / fit |

The shortcut handler in `app.jsx` ignores key events when `e.target.tagName === 'INPUT'`.

---

## 9. Tweaks (developer-facing options)

The mockup includes a Tweaks panel surfacing high-level visual variants. These are
**not user-facing in production** — they were live-tunable knobs for the design review.
Production app ships with the **amber + near-black + cozy + Forest default** combo.

If you want to expose any of these to users in production, surface them via
**Preferences → Appearance** rather than a floating panel.

---

## 10. Assets

- **Fonts:** JetBrains Mono (OFL 1.1) — bundle in `static/fonts/`. System fonts elsewhere.
- **Icons:** All inline SVG in `app-parts.jsx` under the `Icon` namespace. Copy them or replace with [Lucide](https://lucide.dev/) / [Phosphor](https://phosphoricons.com/) at the same visual weight (1.25 stroke).
- **No bitmap assets** — everything is CSS + SVG.

---

## 11. Files in this bundle

- `Pixelcamo.html` — entry HTML, mount point, script wiring
- `styles.css` — all visual tokens + component styles
- `camo.js` — seeded pattern generator (port this to Python for export)
- `app-parts.jsx` — reusable controls (Section, LabelSlider, PaletteEditor, TextureControls, HarmonyPreview) + data constants
- `app.jsx` — main `PixelcamoApp` component, state, layout, canvas, export bar, statusline
- `tweaks.jsx` + `tweaks-panel.jsx` — the Tweaks panel (design review only; drop in production)
- `macos-window.jsx` — unused starter, included for reference

Open `Pixelcamo.html` in a browser to see the live mockup.

---

## 12. Suggested build steps

1. `pip install pywebview pillow numpy reportlab blend-modes`
2. Scaffold a Vite + React project for the frontend in `frontend/`.
3. Port the JS in `app.jsx` / `app-parts.jsx` / `camo.js` into the React project.
   Replace inline-Babel quirks (the `useS`/`useE`/`useM` aliases) with normal hooks.
4. Build frontend → static files in `dist/`.
5. Python entry `main.py`:
   ```python
   import webview
   from api import PixelcamoApi
   webview.create_window(
       'Pixelcamo', 'dist/index.html',
       js_api=PixelcamoApi(),
       width=1200, height=760,
       min_size=(960, 620),
   )
   webview.start(menu=build_menu())
   ```
6. Implement `api.py` — file dialogs, JSON serialisation, NumPy renderer, Pillow export.
7. Wire native menu actions to dispatch `pixelcamo:menu` CustomEvents into the webview via `window.evaluate_js`.
8. Polish: dark vibrancy on the title bar (PyObjC), code-sign + notarise for distribution.

---

Open `Pixelcamo.html` for the visual ground truth. Match it pixel-for-pixel.
