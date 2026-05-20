# Pixelcamo — Feature Spec: Locks, Variations, Two-Scale Camo

Three features to implement in order. Each section ends with a checklist.
Do not begin the next feature until the current one is working and confirmed.

---

## Feature 1 — Per-swatch locks

### What it does
Allows the user to lock individual palette swatches so they survive
randomise/regenerate operations. Locked swatches are excluded from palette
rerolls and from cluster colour assignment in the pattern generator.

### State

Add to the existing document state in `App.tsx`:

```typescript
const [locked, setLocked] = useState<boolean[]>(
  () => Array(palette.length).fill(false)
);
```

Keep `locked` parallel to `palette` at all times:
- When a swatch is added: append `false` to `locked`
- When a swatch is removed at index `i`: remove `locked[i]`
- When a preset is reset: reset `locked` to all-false

### UI — PaletteEditor.tsx

Each swatch gets a lock icon overlay, visible on hover and when locked.

```tsx
// On swatch hover, show a small padlock icon top-left
// When locked: icon is always visible, swatch has amber outline

<div
  className={`swatch ${selected === i ? 'selected' : ''} ${locked[i] ? 'locked' : ''}`}
  style={{ background: c }}
  onClick={() => onSelect(i)}
  onDoubleClick={() => onRemove(i)}
>
  <button
    className="lock-btn"
    onClick={(e) => { e.stopPropagation(); onToggleLock(i); }}
    title={locked[i] ? 'Unlock swatch' : 'Lock swatch'}
  >
    {locked[i] ? <LockIcon /> : <LockOpenIcon />}
  </button>
  <span className="hex">{c.toUpperCase().slice(1)}</span>
</div>
```

CSS additions to `styles.css` (match existing design tokens):

```css
/* Lock button — top-left of swatch, hidden until hover or locked */
.swatch .lock-btn {
  position: absolute;
  top: 3px; left: 3px;
  width: 14px; height: 14px;
  background: rgba(0,0,0,0.55);
  border: none;
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  cursor: pointer;
  padding: 0;
  transition: opacity 100ms;
  z-index: 2;
}
.swatch:hover .lock-btn { opacity: 1; }
.swatch.locked .lock-btn { opacity: 1; color: var(--accent); }

/* Locked swatch — amber outline replaces selected outline */
.swatch.locked {
  outline: 1.5px solid var(--accent);
  outline-offset: 1px;
}
.swatch.locked.selected {
  outline: 2px solid var(--accent-hi);
  outline-offset: 1px;
}
```

Lock icons — use existing inline SVG style from `app-parts.jsx`:

```tsx
const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1"/>
    <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1"
          strokeLinecap="round"/>
  </svg>
);

const LockOpenIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1"
          opacity="0.4"/>
    <path d="M3.5 4.5V3a1.5 1.5 0 013 0" stroke="currentColor" strokeWidth="1"
          strokeLinecap="round" opacity="0.4"/>
  </svg>
);
```

### Randomise handler

When the dice button or Space is pressed, only reroll unlocked swatches:

```typescript
const randomisePalette = () => {
  const next = palette.map((colour, i) => {
    if (locked[i]) return colour;  // preserve locked swatches
    // generate a new colour: random hue, constrained saturation and lightness
    // to stay within camo-appropriate range
    const h = Math.floor(rng() * 360);
    const s = 15 + Math.floor(rng() * 30);   // 15–45% saturation
    const l = 20 + Math.floor(rng() * 35);   // 20–55% lightness
    return hslToHex(h, s, l);
  });
  setPalette(next);
  setSeed(Math.floor(Math.random() * 999999));
};
```

If ALL swatches are locked, the dice button should be visually disabled
(reduced opacity, no pointer events) and show a tooltip: "Unlock a swatch
to randomise".

### Pattern generator — camo.ts

Pass `locked` into `generateCamo()` and filter the palette for cluster
seed assignment:

```typescript
function generateCamo({ ..., locked }: PatternOpts) {
  // Build a list of assignable palette indices (unlocked only)
  const assignable = palette
    .map((_, i) => i)
    .filter(i => !locked || !locked[i]);

  // If all locked (shouldn't happen but guard it), use full palette
  const pool = assignable.length > 0 ? assignable : palette.map((_, i) => i);

  // When assigning cluster colour, pick from pool only:
  // c: pool[Math.floor(rand() * pool.length)]
  // instead of: Math.floor(rand() * palette.length)
}
```

### Python export — renderer.py

Pass `locked` in `PatternOpts` and apply the same pool filter in
`_render_camo()`:

```python
locked = opts.get('locked', [False] * len(palette))
assignable = [i for i, lk in enumerate(locked) if not lk]
if not assignable:
    assignable = list(range(len(palette)))
# Use assignable when picking cluster colour:
# c = rand_choice(assignable, rand)
```

### .pcm schema extension

```json
"locked": [false, true, false, false, false]
```

Parallel to `palette` array. Omit or default to all-false if absent.

### Checklist — Feature 1
- [ ] `locked` state initialised parallel to palette
- [ ] Lock button visible on swatch hover, always visible when locked
- [ ] Clicking lock button toggles lock, does not select or remove swatch
- [ ] Locked swatch shows persistent amber outline
- [ ] Dice button and Space only reroll unlocked swatches
- [ ] Dice button visually disabled when all swatches locked
- [ ] `generateCamo()` in `camo.ts` respects locked indices
- [ ] `_render_camo()` in `renderer.py` respects locked indices
- [ ] `locked` persists in .pcm save/load
- [ ] Adding/removing swatches keeps `locked` array in sync
- [ ] Preset reset resets `locked` to all-false

---

## Feature 2 — Variations grid

### What it does
Pressing `V` replaces the canvas with a 3×3 grid of nine pattern variants
generated from adjacent seeds (`seed-4` to `seed+4`). The user clicks
one to commit it, or presses `V` / Escape to dismiss without changing anything.

### State

```typescript
const [variationsOpen, setVariationsOpen] = useState(false);
const [hoveredVariation, setHoveredVariation] = useState<number | null>(null);
```

### Keyboard shortcut

Add to the existing `keydown` handler in `App.tsx`:

```typescript
else if (e.key.toLowerCase() === 'v' && e.target.tagName !== 'INPUT') {
  e.preventDefault();
  setVariationsOpen(v => !v);
}
else if (e.key === 'Escape' && variationsOpen) {
  e.preventDefault();
  setVariationsOpen(false);
}
```

Add `V` to the statusline shortcut hints: `⌘R regen · ⌘E export · ⌘T tile · space seed · V vary`

### Toolbar button

Add a Variations button to the canvas toolbar, between the Tile toggle
and the Regenerate button:

```tsx
<button
  className={`btn ghost ${variationsOpen ? 'active-ghost' : ''}`}
  onClick={() => setVariationsOpen(v => !v)}
  title="Variations grid (V)"
>
  <VariationsIcon />
  Vary
</button>
```

```css
.btn.active-ghost {
  background: var(--accent-tint);
  border-color: var(--accent-line);
  color: var(--accent);
}
```

```tsx
const VariationsIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="4.5" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="8" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="1" y="4.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="4.5" y="4.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="8" y="4.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="1" y="8" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="4.5" y="8" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <rect x="8" y="8" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
  </svg>
);
```

### Variations overlay — VariationsGrid.tsx

New component. Replaces the canvas SVG content (not the whole canvas pane)
when `variationsOpen` is true.

```tsx
const SEEDS = [-4, -3, -2, -1, 0, 1, 2, 3, 4]; // offsets from current seed

function VariationsGrid({ seed, palette, pixelScale, density, passes,
                          locked, onCommit, onDismiss }) {
  const variants = useMemo(() =>
    SEEDS.map(offset => {
      const s = ((seed + offset) % 999999 + 999999) % 999999;
      const pattern = generateCamo({
        width: THUMB_W, height: THUMB_H,
        palette, pixelScale, density, passes: Math.min(passes, 2), seed: s,
      });
      return { seed: s, rects: camoToRects({ ...pattern, palette }) };
    }),
    [seed, palette, pixelScale, density, passes]
  );

  return (
    <div className="variations-grid">
      <div className="variations-header">
        <span className="label">9 variants · click to commit · V or Esc to dismiss</span>
      </div>
      <div className="variations-cells">
        {variants.map(({ seed: s, rects }, i) => (
          <div
            key={i}
            className={`variation-cell ${SEEDS[i] === 0 ? 'current' : ''}`}
            onClick={() => onCommit(s)}
            title={`Seed #${String(s).padStart(6, '0')}`}
          >
            <svg viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
                 width="100%" height="100%"
                 shapeRendering="crispEdges">
              {rects.map((r, j) => (
                <rect key={j} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill}/>
              ))}
            </svg>
            <span className="variation-seed">
              {SEEDS[i] === 0 ? 'current' : `${SEEDS[i] > 0 ? '+' : ''}${SEEDS[i]}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Thumbnail size: `THUMB_W = 200`, `THUMB_H = 150`. Renders at reduced
resolution for performance — full canvas resolution not needed for comparison.

Passes capped at 2 for thumbnails even if the main pattern uses 3.
This keeps render time acceptable.

CSS:

```css
.variations-grid {
  position: absolute;
  inset: 0;
  background: var(--bg-canvas);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  animation: reveal 150ms ease;
}

.variations-header .label {
  color: var(--fg-3);
  letter-spacing: 0.06em;
}

.variations-cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 10px;
  max-width: 720px;
  width: 100%;
}

.variation-cell {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--line-2);
  transition: border-color 100ms, transform 100ms;
}
.variation-cell:hover {
  border-color: var(--accent);
  transform: scale(1.02);
  z-index: 1;
}
.variation-cell.current {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 1px var(--accent-line);
}
.variation-seed {
  position: absolute;
  bottom: 4px; right: 6px;
  font-family: var(--mono);
  font-size: 9px;
  color: rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.5);
  padding: 1px 4px;
  border-radius: 2px;
}
```

### Commit handler in App.tsx

```typescript
const commitVariation = (chosenSeed: number) => {
  setSeed(chosenSeed);
  setVariationsOpen(false);
};
```

### Checklist — Feature 2
- [ ] `V` key opens and closes the variations grid
- [ ] Escape closes without committing
- [ ] Vary button in toolbar toggles grid, shows active state when open
- [ ] 3×3 grid renders nine thumbnails, seeds offset ±4 from current
- [ ] Current seed cell has a distinct (but not dominant) visual treatment
- [ ] Hovering a cell scales it slightly and highlights border in amber
- [ ] Clicking a cell commits that seed and closes the grid
- [ ] Passes capped at 2 for thumbnail renders
- [ ] Seed label shown on each thumbnail
- [ ] Statusline hint updated to include `V vary`
- [ ] Grid is not shown in Dazzle mode (Dazzle seeds don't vary usefully
      in a ±4 range — disable the V shortcut and Vary button when Mode = Dazzle)

---

## Feature 3 — Two-scale camo

### What it does
Adds a second fine-scale camo layer (the "micro disruptor") composited over
the primary macro pattern. Replicates the structure of real MARPAT/MultiCam
digital camouflage. The macro layer breaks up silhouette at distance; the
micro layer defeats close-range pattern recognition and adds surface realism.

Only active in Camo and Blend modes. Hidden in Dazzle and Aerial modes.

### State

```typescript
const [microScale, setMicroScale] = useState(6);      // px, 2–20
const [microWeight, setMicroWeight] = useState(35);   // %, 0–100
const [microEnabled, setMicroEnabled] = useState(false);
```

### UI — Parameters section in Sidebar.tsx

Add below the existing Passes control, revealed when `microEnabled` is true:

```tsx
{/* Two-scale toggle */}
<div className="row">
  <span className="label wide">Two-scale</span>
  <div className={`toggle ${microEnabled ? 'on' : ''}`}
       onClick={() => setMicroEnabled(e => !e)} />
  <span className="value-right" style={{ color: 'var(--fg-2)' }}>
    {microEnabled ? 'ON' : 'OFF'}
  </span>
</div>

{/* Micro params — reveal when enabled */}
{microEnabled && (
  <div className="conditional reveal">
    <div className="cond-head">
      <span className="name">Micro disruptor</span>
      <span className="value mono" style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>
        2-scale
      </span>
    </div>
    <LabelSlider label="Micro scale" min={2} max={20} step={1}
      value={microScale} onChange={setMicroScale} suffix="px" width={88} />
    <LabelSlider label="Micro weight" min={0} max={100} step={1}
      value={microWeight} onChange={setMicroWeight} suffix="%" width={88} />
  </div>
)}
```

Enforce that micro scale is always less than pixel scale. If the user drags
micro scale above pixel scale, clamp it to `pixel_scale - 2`:

```typescript
const safeMicroScale = Math.min(microScale, Math.max(2, pixelScale - 2));
```

Show a warning hint if they're within 2px of each other:
```tsx
{safeMicroScale >= pixelScale - 2 && (
  <span style={{ color: 'var(--warn)', fontSize: 9.5 }}>
    micro scale close to macro — increase pixel scale for best results
  </span>
)}
```

### Parameters section badge update

When two-scale is enabled, update the Parameters badge to reflect it:
```typescript
// existing: `${pixelScale}px · ${density}%`
// new when micro enabled: `${pixelScale}+${safeMicroScale}px · ${density}%`
```

### Pattern generator — camo.ts

Add micro layer compositing to the `generateCamo()` call chain:

```typescript
function generateCamoWithMicro(opts: PatternOpts & {
  microScale: number;
  microWeight: number;
}): RectList {
  // Primary macro layer — existing logic, unchanged
  const macro = generateCamo({ ...opts });
  const macroRects = camoToRects({ ...macro, palette: opts.palette });

  // Micro layer — same algorithm, smaller scale, seed shifted
  const microSeed = (opts.seed ^ 0xDEADBEEF) >>> 0;
  const micro = generateCamo({
    ...opts,
    pixelScale: opts.microScale,
    seed: microSeed,
    passes: Math.min(opts.passes, 2), // cap micro passes at 2
  });

  // Micro palette: bias toward darker swatches
  // Build a weighted palette where darker colours appear more often
  const microPalette = buildDarkBiasedPalette(opts.palette);
  const microRects = camoToRects({ ...micro, palette: microPalette });

  // Return both layers — canvas renders macro first, then micro at microWeight opacity
  return { macroRects, microRects, microWeight: opts.microWeight };
}

// Weight palette toward darker colours (index 0 typically darkest in our palettes)
function buildDarkBiasedPalette(palette: string[]): string[] {
  // Sort by luminance ascending (darkest first)
  const sorted = [...palette].sort((a, b) => luminance(a) - luminance(b));
  // Create a biased pool: darkest colour appears 3×, others 1×
  return [sorted[0], sorted[0], sorted[0], ...sorted.slice(1)];
}
```

In the canvas SVG renderer, render macro rects first then micro rects
at `microWeight` opacity:

```tsx
<svg ...>
  {/* Macro layer */}
  {macroRects.map((r, i) => (
    <rect key={`m${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill}/>
  ))}
  {/* Micro layer */}
  <g opacity={microWeight / 100} style={{ mixBlendMode: 'multiply' }}>
    {microRects.map((r, i) => (
      <rect key={`u${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill}/>
    ))}
  </g>
  {textureOverlay}
</svg>
```

### Python export — renderer.py

In `render_pattern()`, add micro layer compositing for Camo/Blend modes:

```python
micro_enabled = opts.get('microEnabled', False)

if micro_enabled:
    micro_seed = (seed ^ 0xDEADBEEF) & 0xFFFFFFFF
    micro_opts = {**opts,
        'pixel_scale': opts.get('microScale', 6),
        'seed': micro_seed,
        'passes': min(passes, 2),
    }
    micro_img = _render_camo(micro_opts, palette=_dark_biased_palette(palette))
    micro_weight = opts.get('microWeight', 35) / 100.0

    # Composite micro over macro using Multiply at micro_weight opacity
    # blend_modes.multiply returns float array — convert back to Image
    from PIL import ImageChops
    import numpy as np

    macro_arr = np.array(img).astype(float) / 255.0
    micro_arr = np.array(micro_img).astype(float) / 255.0

    try:
        from blend_modes import multiply
        blended = multiply(
            np.dstack([macro_arr, np.ones(macro_arr.shape[:2])]),
            np.dstack([micro_arr, np.ones(micro_arr.shape[:2]) * micro_weight]),
            micro_weight
        )[:, :, :3]
    except ImportError:
        # Fallback: simple alpha composite
        blended = macro_arr * (1 - micro_weight) + (macro_arr * micro_arr) * micro_weight

    img = Image.fromarray((blended * 255).astype(np.uint8))


def _dark_biased_palette(palette: list[str]) -> list[str]:
    """Return palette sorted darkest-first with darkest colour repeated 3×."""
    def lum(h):
        r, g, b = hex_to_rgb(h)
        return 0.299 * r + 0.587 * g + 0.114 * b
    sorted_p = sorted(palette, key=lum)
    return [sorted_p[0], sorted_p[0], sorted_p[0]] + sorted_p[1:]
```

### .pcm schema extension

```json
"params": {
  "pixel_scale": 14,
  "density": 58,
  "passes": 3,
  "seed": 42081,
  "microEnabled": true,
  "microScale": 6,
  "microWeight": 35
}
```

### Checklist — Feature 3
- [ ] Two-scale toggle appears in Parameters section (Camo/Blend mode only)
- [ ] Toggle is hidden in Dazzle and Aerial modes
- [ ] Conditional micro disruptor panel reveals when toggle is ON
- [ ] Micro scale and Micro weight sliders functional
- [ ] Micro scale is clamped to always be less than pixel scale
- [ ] Warning hint shown when scales are too close
- [ ] Parameters badge shows `14+6px` format when micro enabled
- [ ] Canvas preview renders macro + micro layers correctly
- [ ] Micro layer uses Multiply blend at micro weight opacity
- [ ] Micro palette is dark-biased (darkest swatch appears ~3× more often)
- [ ] Micro seed is deterministic but distinct from macro seed
- [ ] `renderer.py` composites micro layer at export resolution
- [ ] Micro passes capped at 2 regardless of main passes setting
- [ ] `microEnabled`, `microScale`, `microWeight` persist in .pcm save/load

---

## Implementation order

Work through features in the order listed: Locks → Variations → Two-scale.
Confirm each checklist is complete before starting the next.

Locks and Variations are frontend-only changes — no Python needed.
Two-scale requires both frontend and Python changes.

Show a screenshot after completing each feature.
