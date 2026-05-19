# Pixelcamo — Claude Code Build Prompt

## Repo
https://github.com/SpenMillard/pixelcamo

The `design_handoff_pixelcamo/` folder is a complete design handoff.
Read these files end-to-end before writing any code:

1. `README.md` — architecture, components, algorithm, .pcm format, keyboard shortcuts
2. `PALETTES.md` — canonical palette hex values (supersedes palettes in `app-parts.jsx`)
3. `DAZZLE_SPEC.md` — dazzle algorithm spec (supersedes §6 of README)
4. `styles.css` — all design tokens and component styles (use verbatim)
5. `Pixelcamo.html` — open in a browser for the visual ground truth

The production build must match `Pixelcamo.html` pixel-for-pixel.

---

## Stack

- Python 3.11+ with pywebview for the window shell
- React + Vite + TypeScript for the frontend in `frontend/`, output to `frontend/dist/`
- Pillow + NumPy for the export render path
- ReportLab for PDF export
- Bundle JetBrains Mono into `static/fonts/` — no runtime CDN calls, app must work offline

---

## Order of operations

**Step 1** — Scaffold `frontend/` with Vite + React + TypeScript. Port the JSX in the
handoff (`app.jsx`, `app-parts.jsx` — drop `tweaks.jsx` and `tweaks-panel.jsx` for
production per §9 of the README) into proper components. Move `camo.js` to
`frontend/src/lib/camo.ts`. Keep all CSS tokens from `styles.css` verbatim.

**Step 2** — Verify the frontend looks identical to `Pixelcamo.html` running standalone.
Show a screenshot before moving on. Do not proceed to Step 3 without confirmation.

**Step 3** — Scaffold the Python side: `main.py` (entry point), `api.py` (bridge class
per §2 of README), `renderer.py` (NumPy port of `camo.js` per §6 of README,
and Pillow polygon renderer for Dazzle mode per `DAZZLE_SPEC.md`). Build the
.pcm JSON load/save per §7 of README.

**Step 4** — Wire the native macOS menu per §3 of README, with all keyboard shortcuts
from §8. Use `pywebview.menu.Menu` first; if menu fidelity is poor on macOS,
drop to PyObjC for `NSApp.mainMenu`.

**Step 5** — Implement the export pipeline: take a .pcm doc + size/dpi/format,
render at full resolution in Python, save to disk. Both PNG and PDF.

**Step 6** — Verify keyboard shortcuts, file open/save round-trip, and a 300 DPI
A3 export completes in under 5 seconds on Apple Silicon.

---

## Decisions already made — do not relitigate

- Use the native macOS title bar, not the in-app one shown in the mockup.
  Pass `frameless=False`, `easy_drag=False` to `pywebview.create_window()`.
- Default window: 1200 × 760px. Minimum: 960 × 620px. Resizable, canvas reflows.
- Export rendering is server-side in Python, not in the browser canvas.
  Browser canvas is preview-only.
- The Tweaks panel (`tweaks.jsx`, `tweaks-panel.jsx`) is design-review only.
  Do not port it. Production ships with amber + near-black + cozy + Forest defaults.
- Preview-vs-export bit-parity is not required for v1. Document the divergence
  in user-facing help.
- Sidebar width: 320px (as per `--sidebar-w` in `styles.css`).

---

## Palette library

Use the palettes defined in `PALETTES.md` exactly. These supersede the six
placeholder palettes in `app-parts.jsx`. There are 15 palettes total:
11 camo (Woodland, Desert, Urban, Arctic, Jungle, Tarmac, Concrete, Brick,
Gravel, Soil, Midnight) and 4 dazzle (B/W, Blue, Red, Gold).

The Source dropdown shows camo palettes in Camo/Blend mode and dazzle palettes
in Dazzle mode. See `PALETTES.md` for the full preset-to-palette mapping.

---

## Dazzle mode algorithm

Use the CV Dazzle algorithm specified in `DAZZLE_SPEC.md`. This supersedes
the naval razzle-dazzle description in `README.md §6`. Key points:

- Four shape types: triangle, parallelogram, wedge, slash — all rotated arbitrarily
- Three passes gated by the `passes` parameter (1, 2, or 3)
- Pass 1: large asymmetric shapes with left/right placement bias (enforces asymmetry)
- Pass 2: diagonal slash bars at ±25°–55° (disrupts eye/nose landmark zones)
- Pass 3: medium detail shapes + fine pixel noise
- Lightest palette colour is the base fill (opposite to Camo mode)
- Port Mulberry32 to Python verbatim for seed parity (see `DAZZLE_SPEC.md`)
- Use Pillow `ImageDraw.polygon()` for export — no NumPy grid needed for Dazzle

---

## Texture overlay

Three texture types are implemented in the frontend (see `app-parts.jsx`
`TextureControls` component and `app.jsx` `textureOverlay` useMemo):

- **Stipple** — scattered dots (opacity, scale, density, colour, blend)
- **Hatch** — parallel lines (opacity, scale, angle, spread, cross-hatch toggle,
  colour, blend)
- **Scratch** — short random strokes (opacity, scale, length, spread, colour, blend)

For the Python export path, render textures as a second pass after the base
pattern using Pillow drawing primitives, then composite via the chosen blend mode.
See `README.md §6` (Texture overlay section) for the Python implementation notes.

---

## App icon

A 1024×1024 PNG app icon using the Woodland camo palette is available in the
repo at `static/pixelcamo_icon.png`. Reference it in the PyWebView window setup.

---

## Adversarial mode — defer to v2

An adversarial patch generator (using PyTorch + FaceNet InceptionResnetV1 with
Expectation over Transformation) was developed but is excluded from v1 due to
its computational requirements and additional dependencies. It is documented
in `ROADMAP.md` for the v2 milestone. Do not implement it in v1.

---

## .pcm document format

Defined in `README.md §7`. The schema already covers all v1 features including
texture parameters. Untitled documents have no path until saved. Track
`dirty: bool` in the frontend. Title bar format:
`Pixelcamo — <filename>.pcm` with `· edited` suffix when dirty.

---

## Definition of done for v1

- [ ] App launches, native macOS menu visible with all items from §3 of README
- [ ] All sidebar sections (Pattern, Palette, Parameters, Texture, Colour Harmony)
      render and function per the README
- [ ] Live preview updates under slider drag without jank
- [ ] File → New / Open / Save / Save As round-trip a .pcm file correctly
- [ ] File → Export produces a correct PNG and PDF at the configured size/DPI
- [ ] All keyboard shortcuts in §8 of README work
- [ ] Window respects 960 × 620 minimum size, canvas reflows fluidly
- [ ] All 15 palettes from `PALETTES.md` are present and correctly assigned
- [ ] Dazzle mode uses the CV Dazzle algorithm from `DAZZLE_SPEC.md`
- [ ] Texture overlay renders correctly in preview and export for all three types
- [ ] App icon displays correctly in the Dock and Finder

---

## Ask clarifying questions before starting if anything in the spec is ambiguous.
## Stop and check in after Step 2 (frontend visual parity) before continuing.
