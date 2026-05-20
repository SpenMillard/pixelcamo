# Pixelcamo v3 — Change List

Changes since v2. v3 has two major moves:

1. **Paper Studio theme** is now the committed visual direction (was: dark studio).
2. **Preset / Palette relationship** is restructured — a preset is now a complete snapshot, not an independent dropdown that confusingly overlapped with the Palette source.

Reference files in this folder:
- `Pixelcamo v3.html` — entry HTML
- `styles-v3.css` — Paper Studio tokens + light-mode adaptations
- `app-v3.jsx` — restructured app with `PRESETS_DATA` library and `presetModified` indicator

The v1/v2 files remain in this folder for diff comparison.

---

## Why this exists

After v2 we tested the live app and surfaced two design problems:

1. **Color scheme**: dark studio felt generic. After exploring 4 directions
   (Amber Field / Cyan Instrument / Olive Manual / Paper Studio), the team
   committed to **Paper Studio** — cream paper + charcoal ink + burnt-amber
   accent. Reads as a textile-designer / architect tool rather than a video
   app. Better fit for users who actually print.
2. **Preset and Palette were overlapping concepts.** Both were top-level
   dropdowns. Users asked: "If I pick 'M81 Woodland' preset, why do I also
   need to pick 'Forest' palette? Aren't those the same thing?" The model was
   muddled.

v3 fixes both.

---

## What changed

### 1. Paper Studio theme (full token swap)

All design tokens in `:root` are replaced. Apply these values to your
production CSS verbatim — they're calibrated for light-mode legibility.

```css
:root {
  /* Backgrounds — cream paper */
  --bg-0: #ddd6c5;          /* desktop / deepest */
  --bg-1: #f4f1ea;          /* window base */
  --bg-2: #ece7da;          /* sidebar */
  --bg-3: #e3dcc9;          /* row hover / inset panels */
  --bg-4: #d6cdb6;          /* control rest */
  --bg-5: #c6bca0;          /* control hover */
  --bg-canvas: #1e1a14;     /* canvas stays dark — contrast for the work */

  /* Lines */
  --line-1: #e1dac6;
  --line-2: #cfc6ad;
  --line-3: #b8ad8e;

  /* Text — charcoal ink */
  --fg-0: #29251a;
  --fg-1: #4a4232;
  --fg-2: #7a7058;
  --fg-3: #a89b7c;
  --fg-4: #c4b89a;

  /* Accent — burnt amber (deeper than the dark theme's amber, for light-mode contrast) */
  --accent: #c4691c;
  --accent-hi: #d97b2a;
  --accent-lo: #9c510f;
  --accent-tint: rgba(196, 105, 28, 0.10);
  --accent-line: rgba(196, 105, 28, 0.40);
  --on-accent: #fbf6ec;     /* NEW token: text color on accent surfaces */

  /* Status */
  --good: #3a8a5d;
  --warn: #c4691c;
  --bad:  #b54040;
}
```

#### Crucial light-mode adaptations

Several v2 styles hardcoded dark-mode values that need patching for light
mode. Update each occurrence:

| Where | v2 (dark) | v3 (Paper Studio) |
|---|---|---|
| `.desktop` bg | `radial-gradient(...#1a1a1f → #050506)` | `radial-gradient(...#e8e0cb → #9d8f6e)` |
| `.menubar` bg | `rgba(20,20,22,0.7)` + white border | `rgba(244,240,230,0.78)` + dark border |
| `.window` box-shadow | `rgba(0,0,0,0.6)` heavy black | `rgba(80,60,30,0.18)` warm sepia |
| `.titlebar` bg | `linear-gradient(#161618 → #131315)` | `linear-gradient(#ede7d6 → #e3dcc9)` |
| `.seg button.active` text | `#1a1102` | `var(--on-accent)` (`#fbf6ec`) |
| `.btn.accent` text | `#1a1102` | `var(--on-accent)` |
| `.toggle.on::after` bg | `#1a1102` | `var(--on-accent)` |
| `.passes button.active` text | `#1a1102` | `var(--on-accent)` |
| `.input:focus` bg | `#000` | `#fffdf6` |
| Slider thumb border | `0.5px solid #000` | `0.5px solid rgba(0,0,0,0.25)` |
| Slider thumb shadow | `rgba(0,0,0,0.5)` | `rgba(80,60,30,0.25)` |
| `.swatch` border | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.12)` |
| `.swatch` shadow | inset white + black | inset white + warm sepia |
| `.swatch.add` bg | `var(--bg-1)` | `var(--bg-3)` (so it reads as recessed against cream) |
| `.canvas-frame` bg | `#000` | `var(--bg-canvas)` |
| `.canvas-frame` shadow | black | dark sepia |
| `.zoom-controls` bg | `rgba(15,15,17,0.85)` | `rgba(244,240,230,0.92)` |
| `.canvas-area` grid lines | `rgba(255,255,255,0.012)` | `rgba(255,255,255,0.04)` (over dark canvas) |
| `.menubar-item:hover` text | `#fff` | `var(--on-accent)` |
| `.harmony-preview .c` border | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |
| `.section.export-section` bg-tint | `rgba(232,149,42,0.025)` | `var(--accent-tint)` |

#### New token: `--on-accent`

`--on-accent` is the text/icon color used on top of `--accent` surfaces
(active segmented buttons, the primary Regenerate button, toggle knobs).
In dark mode this was hardcoded as `#1a1102`. In light mode it must be
`#fbf6ec` (a near-white cream that reads cleanly on the burnt amber).

**Add `--on-accent` to your token system regardless of theme.** Use it
anywhere you previously hardcoded text color on accent surfaces. This makes
future theme swaps a single-line change.

### 2. Tweaks panel removed

The Tweaks panel was a design-review affordance — we used it during the
exploration phase to live-toggle themes. Paper Studio is now committed, so
the panel is gone in v3.

Production was already meant to drop it (per v1 §9). Just confirming: do not
ship `tweaks.jsx` or `tweaks-panel.jsx`. Remove the `EDITMODE-BEGIN`/`END`
defaults block from the HTML. Remove the `<PixelcamoTweaks />` mount from the
app component.

### 3. Preset = full snapshot

**This is the conceptual change.** A preset is now a complete configuration
that the user can pick to populate everything else, instead of a label that
sat alongside other independent settings.

#### `PRESETS_DATA` library

In your production code, define a preset library as an object keyed by
preset name. Each entry carries the full pattern configuration:

```ts
type Preset = {
  mode: 'Camo' | 'Dazzle' | 'Blend';
  paletteName: string;
  palette: string[];        // hex colors
  pixelScale: number;
  density: number;
  passes: 1 | 2 | 3;
  textureType: 'None' | 'Stipple' | 'Hatch' | 'Scratch';
};

const PRESETS_DATA: Record<string, Preset> = {
  'M81 Woodland':    { mode: 'Camo',   paletteName: 'Forest', palette: PALETTES.Forest, pixelScale: 14, density: 58, passes: 2, textureType: 'None' },
  'MARPAT Digital':  { mode: 'Camo',   paletteName: 'Forest', palette: PALETTES.Forest, pixelScale: 6,  density: 70, passes: 2, textureType: 'None' },
  'Flecktarn Mod':   { mode: 'Camo',   paletteName: 'Forest', palette: PALETTES.Forest, pixelScale: 8,  density: 75, passes: 3, textureType: 'Stipple' },
  'Razzle Dazzle':   { mode: 'Dazzle', paletteName: 'Urban',  palette: PALETTES.Urban,  pixelScale: 22, density: 35, passes: 1, textureType: 'None' },
  'Urban Splinter':  { mode: 'Camo',   paletteName: 'Urban',  palette: PALETTES.Urban,  pixelScale: 12, density: 45, passes: 2, textureType: 'Hatch' },
  'Tiger Stripe':    { mode: 'Camo',   paletteName: 'Forest', palette: PALETTES.Forest, pixelScale: 18, density: 65, passes: 2, textureType: 'Scratch' },
  'Sahara Tan':      { mode: 'Camo',   paletteName: 'Desert', palette: PALETTES.Desert, pixelScale: 16, density: 50, passes: 2, textureType: 'None' },
  'Arctic Splinter': { mode: 'Camo',   paletteName: 'Arctic', palette: PALETTES.Arctic, pixelScale: 14, density: 55, passes: 2, textureType: 'None' },
  'Night Patrol':    { mode: 'Blend',  paletteName: 'Night',  palette: PALETTES.Night,  pixelScale: 10, density: 60, passes: 3, textureType: 'Stipple' },
};
```

The list of names in `PRESETS` from v1's `app-parts.jsx` is now derived from
the keys of `PRESETS_DATA`. The "Norwegian Arctic" v1 entry was renamed —
"Norwegian Arctic" sounded like a palette (a place, implying colors), not a
preset (a camo style). It split into **Sahara Tan** (warm) and **Arctic
Splinter** (cold).

#### `loadPreset(name)`

A single function that atomically populates all state from a preset snapshot:

```ts
function loadPreset(name: string) {
  const p = PRESETS_DATA[name];
  if (!p) return;
  setPreset(name);
  setMode(p.mode);
  setPalette([...p.palette]);
  setPaletteName(p.paletteName);
  setPixelScale(p.pixelScale);
  setDensity(p.density);
  setPasses(p.passes);
  setTextureType(p.textureType);
  setSelectedSwatch(0);
}
```

Wire this to the preset selector's `onChange`. The "Reset to preset" button
just calls `loadPreset(currentPresetName)` — re-applies the snapshot, which
discards any modifications.

#### Initial state seeding

**Important:** seed initial state from the default preset on mount, not via
hardcoded `useState` defaults. Otherwise the initial UI shows a spurious
"modified" indicator because the hardcoded defaults don't match the preset.

```ts
const [preset, setPreset] = useState('M81 Woodland');
// ... other useState calls with arbitrary defaults ...

useEffect(() => {
  loadPreset(preset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // mount only
```

#### `presetModified` computed reactively

Compare current state to the preset's snapshot. Don't track this as a
separate boolean state — derive it.

```ts
const presetModified = useMemo(() => {
  const p = PRESETS_DATA[preset];
  if (!p) return false;
  return mode !== p.mode
      || pixelScale !== p.pixelScale
      || density !== p.density
      || passes !== p.passes
      || textureType !== p.textureType
      || JSON.stringify(palette) !== JSON.stringify(p.palette);
}, [preset, mode, pixelScale, density, passes, textureType, palette]);
```

Surface this in two places:
- **Pattern section badge:** `M81 Woodland*` when modified.
- **Canvas toolbar breadcrumb:** same `*` after the preset name.

The Reset icon button in the Pattern section dims to 40% opacity when
`presetModified === false` (nothing to reset).

### 4. Pattern section UI

Replace the old `<select>`-displaying-a-div with a native `<select>` for
accessibility and keyboard navigation:

```jsx
<div className="row">
  <span className="label">Style</span>
  <select className="select mono" value={preset}
    onChange={(e) => loadPreset(e.target.value)}>
    {Object.keys(PRESETS_DATA).map(n => <option key={n} value={n}>{n}</option>)}
  </select>
  <button className="btn ghost icon-only"
    title={presetModified ? `Reset to ${preset}` : 'No changes to reset'}
    onClick={() => loadPreset(preset)}
    style={{ opacity: presetModified ? 1 : 0.4 }}>
    {ResetIcon}
  </button>
</div>
```

#### `select.select` styling

Native `<select>` elements don't pick up the `::after` chevron used by the
div-based custom select in v1/v2. Add explicit `select.select` styles:

```css
select.select {
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--bg-1);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path fill='%23a89b7c' d='M0 0h8L4 6z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 9px center;
  padding-right: 24px;
  cursor: pointer;
}
select.select:hover { background-color: var(--bg-3); }
select.select::after { display: none; }
```

**For dark theme, change the SVG `fill` color** in the data URI to `'%235a5a60'`
(or whatever `--fg-3` is in that theme). The fill is baked into the URL — it
can't pick up a CSS variable. Either inline the SVG via JSX, or have two
selector rules (one per theme).

### 5. Palette section UI

**Remove the "Source" dropdown row entirely.** The palette name now lives in
the section badge:

```jsx
<Section title="Palette" badge={`${palette.length}/8 · ${paletteName}`} ...>
  <PaletteEditor ... />   {/* swatches + hex editor only */}
</Section>
```

The user edits individual swatches directly. To swap to a different theme
palette, they load a different preset.

(Optional future: a "Replace palette →" subaction in the Palette section
that swaps just the colors without changing pixel scale / density. Not v3.)

---

## Verification checklist

After porting, verify:

- [ ] All Paper Studio colors render correctly. Sample any element with the
      browser inspector and confirm cream backgrounds, charcoal text, burnt
      amber accent.
- [ ] Canvas frame is dark (`#1e1a14`) inside the cream window.
- [ ] On first paint, Pattern section badge shows "M81 Woodland" with NO
      asterisk.
- [ ] On first paint, toolbar breadcrumb shows "M81 Woodland" with NO
      asterisk.
- [ ] Drag the pixel-scale slider one tick. Both badges immediately update to
      "M81 Woodland*". Reset icon goes from 40% opacity to 100%.
- [ ] Click the Reset icon. Pixel scale returns to 14, asterisk disappears.
- [ ] Open the preset dropdown. Pick "Sahara Tan". Palette becomes Desert,
      pixel scale becomes 16, mode stays Camo, no asterisk. Pick "Razzle
      Dazzle". Mode switches to Dazzle, palette swaps to Urban.
- [ ] Edit one swatch. Both badges show the asterisk. Reset returns to the
      preset's palette.
- [ ] Palette section no longer has a "Source" dropdown row.
- [ ] Tweaks panel is gone — no floating control in the bottom-right.
- [ ] All existing v2 verifications still pass (responsive toolbar, no
      overflow at 960×620, etc.).

---

## Files in this folder for reference

- `Pixelcamo v3.html` + `styles-v3.css` + `app-v3.jsx` — the v3 ground truth
- `Pixelcamo v2.html` + `styles-v2.css` + `app-v2.jsx` — v2 for diff
- `Pixelcamo.html` + `styles.css` + `app.jsx` — original v1
- `camo.js`, `app-parts.jsx` — shared between all versions, unchanged

Open `Pixelcamo v3.html` in a browser to see the target. Match pixel-for-pixel.
