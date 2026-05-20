# Pixelcamo — Feature Spec: Seamless Tile Preview & Export

Read alongside `FEATURES_SPEC.md` (locks, variations, two-scale).
Implement after those three features are confirmed working.

---

## Overview

Two related additions:

1. **Tile preview** — pressing `⌘T` (already wired to toggle tile guides)
   is extended so a second press switches the canvas into a live 3×3 repeat
   view. Three states cycle: guides off → guides on → 3×3 preview → guides off.

2. **Tileable export** — `File → Export Tileable Set…` (⇧⌘E) exports the
   seamless repeat unit as a PNG at the configured DPI, confirmed mathematically
   seamless by the Python renderer.

Both features require `tile=True` to be active. When tile is OFF, the ⌘T
cycle skips the 3×3 preview state and ⇧⌘E shows an alert:
"Enable Tile to export a tileable pattern."

---

## Feature 1 — Tile preview (3×3 repeat view)

### State

Replace the existing `tile: boolean` with a three-state cycle:

```typescript
type TileState = 'off' | 'guides' | 'preview';
const [tileState, setTileState] = useState<TileState>('guides');
```

Update all existing references to `tile` boolean:
- `tile === true` → `tileState !== 'off'` (for renderer)
- Tile button label: OFF / ON / 3×3 (cycling)
- Dashed guide lines: shown when `tileState === 'guides'`
- 3×3 preview: shown when `tileState === 'preview'`

### ⌘T keyboard handler

```typescript
else if (cmd && e.key.toLowerCase() === 't') {
  e.preventDefault();
  setTileState(s => {
    if (s === 'off')     return 'guides';
    if (s === 'guides')  return 'preview';
    return 'off';
  });
}
```

### Tile button in canvas toolbar

```tsx
<button className="btn ghost" onClick={() => setTileState(s => {
  if (s === 'off') return 'guides';
  if (s === 'guides') return 'preview';
  return 'off';
})}>
  <span style={{ color: tileState !== 'off' ? 'var(--accent)' : 'var(--fg-3)' }}>
    {Icon.tile}
  </span>
  Tile
  <span className="mono" style={{
    color: tileState !== 'off' ? 'var(--accent)' : 'var(--fg-3)',
    fontSize: 10
  }}>
    {tileState === 'off' ? 'OFF' : tileState === 'guides' ? 'ON' : '3×3'}
  </span>
</button>
```

### 3×3 preview canvas — TilePreview.tsx

New component. Shown inside the canvas frame when `tileState === 'preview'`.
Renders the pattern SVG tiled 3×3 — the centre cell is the repeat unit,
the surrounding eight cells are copies showing the seam.

```tsx
function TilePreview({ rects, canvasBox, palette, textureOverlay }) {
  // The repeat unit is canvasBox.w × canvasBox.h
  // The preview shows it 3×3, so total size is 3W × 3H
  // Scale down to fit within the canvas frame using a viewBox transform

  const W = canvasBox.w;
  const H = canvasBox.h;

  return (
    <svg
      className="camo-svg"
      viewBox={`0 0 ${W * 3} ${H * 3}`}
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
    >
      {/* 3×3 grid of the repeat unit */}
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => (
          <g key={`${row}-${col}`}
             transform={`translate(${col * W}, ${row * H})`}
             opacity={row === 1 && col === 1 ? 1 : 0.85}>
            {rects.map((r, i) => (
              <rect key={i} x={r.x} y={r.y}
                    width={r.w} height={r.h} fill={r.fill}/>
            ))}
            {textureOverlay}
            {/* Highlight the centre repeat unit */}
            {row === 1 && col === 1 && (
              <rect x={0} y={0} width={W} height={H}
                    fill="none"
                    stroke="rgba(232,149,42,0.5)"
                    strokeWidth="2"/>
            )}
          </g>
        ))
      )}
      {/* Seam grid lines */}
      <line x1={W} y1={0} x2={W} y2={H*3}
            stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6"/>
      <line x1={W*2} y1={0} x2={W*2} y2={H*3}
            stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6"/>
      <line x1={0} y1={H} x2={W*3} y2={H}
            stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6"/>
      <line x1={0} y1={H*2} x2={W*3} y2={H*2}
            stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6"/>
    </svg>
  );
}
```

The surrounding eight cells are rendered at 85% opacity so the centre
repeat unit reads clearly as the tile being examined.

### Canvas area integration

In `CanvasPane.tsx`, replace the existing SVG conditional with:

```tsx
<div className="canvas-frame" style={{ width: ..., height: ... }}>
  {/* corner marks, dim readouts etc. unchanged */}

  {tileState === 'preview' ? (
    <TilePreview
      rects={rects}
      canvasBox={canvasBox}
      palette={palette}
      textureOverlay={textureOverlay}
    />
  ) : (
    <svg className="camo-svg" ...>
      {/* existing pattern + guides */}
    </svg>
  )}
</div>
```

### Canvas dim readout in preview mode

When `tileState === 'preview'`, update the top-left readout to show:

```
repeat unit: {W} × {H}px · 3×3 shown
```

### Checklist — Tile preview
- [ ] `tileState` replaces `tile` boolean throughout
- [ ] ⌘T cycles off → guides → preview → off
- [ ] Tile button label cycles OFF / ON / 3×3
- [ ] Dashed guides shown only in `guides` state
- [ ] 3×3 preview SVG renders correctly with centre tile highlighted
- [ ] Surrounding cells at 85% opacity
- [ ] Seam grid lines visible at tile boundaries
- [ ] Canvas dim readout updates in preview mode
- [ ] Preview updates live when parameters change
- [ ] Texture overlay included in each tile cell
- [ ] Preview state skipped when `tileState` cycles if tile is toggled off
      (i.e. cycling from `guides` goes to `off`, not `preview`, when user
      just turned tile off mid-cycle — reset to `off` when tile is disabled)

---

## Feature 2 — Tileable export (⇧⌘E)

### What it exports

The seamless repeat unit only — not the 3×3 preview. The exported PNG is
exactly `width × height` pixels at the configured DPI, rendered with
`tile=True` in the Python renderer (toroidal distance already guarantees
mathematical seamlessness). The file can be tiled infinitely without visible
seams.

### Keyboard shortcut

Add to the existing `keydown` handler:

```typescript
else if (cmd && e.shiftKey && e.key.toLowerCase() === 'e') {
  e.preventDefault();
  if (tileState === 'off') {
    // Show a brief status message rather than a modal
    setStatusMessage('Enable Tile to export a tileable pattern');
    setTimeout(() => setStatusMessage(null), 3000);
  } else {
    handleTileableExport();
  }
}
```

### Menu item

Already specced in `README.md §3` as:
```
File → Export Tileable Set…    ⇧⌘E
```

Wire the existing menu action to `handleTileableExport()` via the
`pixelcamo:menu` CustomEvent system (action: `'export-tile'`).

### Export handler — App.tsx

```typescript
const handleTileableExport = async () => {
  const doc = buildCurrentDoc();  // existing helper
  const exportOpts = {
    width:  exportSizePreset.w,
    height: exportSizePreset.h,
    dpi:    dpi,
    format: 'PNG',     // tileable export is PNG only — PDF tiling is complex
    tile:   true,      // always true for tileable export
    tileable_suffix: true,  // signals Python to append '_tile' to filename
  };
  await window.pywebview.api.export_pattern(doc, exportOpts);
};
```

### Python — api.py

In `export_pattern()`, detect `tileable_suffix` and adjust the filename:

```python
def export_pattern(self, doc: dict, opts: dict) -> str:
    # existing logic...
    if opts.get('tileable_suffix'):
        base, ext = os.path.splitext(path)
        path = f"{base}_tile{ext}"

    # Force tile=True in the doc for this export
    doc = dict(doc)
    doc['tile'] = True

    # rest of existing export logic unchanged
```

### Python — renderer.py

No changes required. The existing `tile=True` path in `_render_camo()`
already uses toroidal distance for seamless generation. The export simply
calls the same render path with `tile=True` forced.

### Verification pass (optional, passes ≥ 3 only)

When `passes=3`, add a seam verification step in Python before saving.
This checks that the left/right and top/bottom edges of the rendered image
match within a tolerance, confirming mathematical seamlessness:

```python
def _verify_seamless(img: Image.Image, tolerance: int = 8) -> bool:
    """
    Checks that left col matches right col and top row matches bottom row.
    Returns True if seamless within tolerance (per-channel pixel difference).
    """
    arr = np.array(img)
    left_col  = arr[:, 0, :]
    right_col = arr[:, -1, :]
    top_row   = arr[0, :, :]
    bottom_row = arr[-1, :, :]

    h_diff = np.abs(left_col.astype(int) - right_col.astype(int)).max()
    v_diff = np.abs(top_row.astype(int) - bottom_row.astype(int)).max()

    return h_diff <= tolerance and v_diff <= tolerance
```

If verification fails (should be rare — only if floating-point drift
occurs at certain canvas sizes), log a warning to the statusline but
still save the file. Do not block the export.

### Export bar addition

Add a **Tile Export** button next to the existing Export button when
`tileState !== 'off'`:

```tsx
{tileState !== 'off' && (
  <button
    className="btn ghost"
    style={{ height: 30, padding: '0 12px' }}
    onClick={handleTileableExport}
    title="Export seamless tile (⇧⌘E)"
  >
    {Icon.tile} Export Tile
  </button>
)}
```

This sits to the left of the main amber Export button so both are
accessible without using the keyboard shortcut.

### Filename convention

Regular export:  `pattern_seed042081.png`
Tileable export: `pattern_seed042081_tile.png`

The `_tile` suffix is the signal to anyone receiving the file that it
is a confirmed seamless repeat unit, distinct from a large flat export.

### Status message after export

On successful tileable export, update the statusline:

```
✓ Tile exported — pattern_seed042081_tile.png · 2048×2048px · seamless
```

If the verification pass ran and flagged a warning:
```
⚠ Tile exported with seam warning — check edges before use
```

### Checklist — Tileable export
- [ ] ⇧⌘E triggers tileable export when `tileState !== 'off'`
- [ ] ⇧⌘E shows status message when tile is off
- [ ] `File → Export Tileable Set…` menu item wired to same handler
- [ ] Export Tile button appears in export bar when tile is active
- [ ] Export forces `tile=True` in renderer regardless of UI state
- [ ] Filename gets `_tile` suffix
- [ ] PDF option suppressed for tileable export (PNG only)
- [ ] Seam verification runs on passes=3 exports
- [ ] Verification warning shown in statusline if seam check fails
- [ ] Success message shown in statusline after export
- [ ] Export size uses the currently configured size preset and DPI

---

## .pcm schema — no changes required

`tile` is already in the schema. The tileable export reads the existing
`tile` flag and forces it to `true` — no new schema fields needed.

---

## Implementation note

The 3×3 tile preview is frontend-only and should be straightforward.
The tileable export is also simple — it reuses the existing export
pipeline with `tile=True` forced and a filename suffix added.

The seam verification is optional polish. Implement it last and only
if time allows — the toroidal renderer already produces correct seamless
output, so the verification is a safety net, not load-bearing.
