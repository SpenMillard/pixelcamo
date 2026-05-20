# Pixelcamo — Aerial / Rooftop Mode Spec

This document specifies the Aerial mode for Claude Code implementation.
Read alongside `PALETTES_UK_ROOFTOP.md` (palette values and tile geometry)
and the existing `CLAUDE_CODE_PROMPT.md` (architecture and conventions).

---

## Overview

Aerial mode generates printed tarpaulin-ready rooftop camouflage patterns
calibrated to UK urban building stock as seen from altitude (drone, aircraft,
or satellite). Output is designed to be printed at scale and laid over or
applied to structures to alter their aerial appearance.

Two sub-modes driven by palette selection:

- **Pitched** — tile-based repeat pattern (slate, clay, concrete, pantile)
- **Flat** — zone-based surface pattern (bitumen, EPDM, GRP, aggregate)

Both sub-modes share a common shadow/weathering pass applied after the
base pattern.

---

## UI changes required

### Mode selector
Add `Aerial` as a fourth mode button in the Pattern section:
```
Camo  |  Dazzle  |  Blend  |  Aerial
```

### Aerial sub-panel (reveals when Mode = Aerial)
A conditional panel below the mode selector containing:

```
ROOF TYPE     [Pitched ▾] / [Flat ▾]   (segmented, auto-set by palette)
SUN ANGLE     ——●——————  225°           (0–360°, 180° = south, 225° = SW default for UK)
SUN ELEVATION ———●—————  35°            (10–70°, 35° = typical UK summer midday)
SHADOW DEPTH  ———————●—  60%            (0–100%, controls shadow opacity)
WEATHERING    ————●———  40%             (0–100%, controls streak/stain intensity)
ZONE COUNT    ——●———————  3              (1–6, flat mode only — number of material zones)
```

Sun angle and elevation together drive the shadow layer geometry. UK defaults:
- South-west `225°` and `35°` elevation represent a reasonable mid-season
  approximation for England. User adjusts for their target latitude/season.

### Palette source dropdown in Aerial mode
Shows UK rooftop palettes from `PALETTES_UK_ROOFTOP.md`:
```
Welsh Slate / Clay Plain Tile / Clay Pantile / Concrete Interlocking /
Fibre Cement Slate / Flat Bitumen / Flat EPDM / Flat GRP /
Flat Aggregate / Custom
```
Selecting a pitched palette auto-sets Roof Type to Pitched.
Selecting a flat palette auto-sets Roof Type to Flat.

### Parameters section in Aerial mode
Pixel Scale is repurposed as **Tile Scale** (pitched) or **Zone Scale** (flat):
- Pitched: controls tile size relative to canvas. Default 14px = ~300mm tile
  at A3/300dpi. Range 8–40px.
- Flat: controls Voronoi zone cell size. Range 40–200px.

Density retains its meaning — controls colour variation and weathering detail.
Passes retains its meaning — controls layer count (1 = base only, 3 = full detail).

---

## Python renderer — new functions required

### `_render_tiles()`

Generates a pitched roof tile repeat pattern.

```python
def _render_tiles(
    width: int, height: int,
    palette: list[str],
    tile_scale: int,
    density: int,
    passes: int,
    seed: int,
    tile_type: str,  # 'slate' | 'plain' | 'pantile' | 'concrete' | 'fibre_cement'
    colour_variation: float,  # 0.0–1.0, derived from tile_type defaults
) -> Image.Image:
```

**Tile geometry** — use the parameters from `PALETTES_UK_ROOFTOP.md`.
Scale all mm dimensions by `tile_scale / 14.0` (14px = reference scale).

**Colour variation per tile** — each tile gets a small random lightness
offset derived from Mulberry32. Use `colour_variation` to scale the range:
```python
variation_range = colour_variation * 40  # max ±40 lightness units
offset = (rand() - 0.5) * 2 * variation_range
tile_colour = lighten_or_darken(base_colour, offset)
```

**Bond pattern**:
- Broken bond: `x_offset = (row % 2) * (tile_w / 2)`
- Straight bond (pantile): no offset

**Barrel profile for pantile** — approximate the S-curve with three
horizontal rectangular strips per tile, each slightly lighter or darker:
```
top strip    (30% of tile height): base_colour lightened +12
mid strip    (40% of tile height): base_colour (unchanged)
bottom strip (30% of tile height): base_colour darkened -10
inter-tile trough (5px): palette shadow colour darkened -20
```

**Render approach** — use `ImageDraw.rectangle()` for all tiles.
For pantile barrel effect, draw three rectangles per tile in the three
tonal variants above. This is faster than polygon rendering and sufficient
for the scale at which these patterns are viewed.

**Tile joint lines** — draw thin lines (1–2px) between tiles in the shadow
swatch colour (palette index 3). For slate and plain tile, joint lines are
horizontal between rows and vertical between columns. For pantile, only
horizontal joint lines at the row boundaries — the barrel overlap conceals
column joints.

---

### `_render_flat_roof()`

Generates a flat roof zone-based pattern.

```python
def _render_flat_roof(
    width: int, height: int,
    palette: list[str],
    zone_scale: int,
    density: int,
    passes: int,
    seed: int,
    zone_count: int,  # 1–6
) -> Image.Image:
```

**Zone generation** — run `_render_camo()` at very large pixel_scale
(`zone_scale`, range 40–200) with `passes=1` and `cluster_count=zone_count`.
This produces a coarse Voronoi map where each region is one material zone.

**Per-zone material texture** — for each zone region, apply a second pass
of `_render_camo()` at normal pixel_scale (8–16px) using only the palette
colours assigned to that zone's tonal range. This gives each zone its own
internal texture while maintaining visual zone separation.

**Lap joint lines** (bitumen/felt only, detected from palette name) —
horizontal lines at regular intervals (every 600–900mm equivalent in pixels)
in the dark swatch colour, width 2–3px. These simulate felt roll joins.

**EPDM seam simulation** — for EPDM palette, draw 2–3 faint vertical or
horizontal lines across the canvas in a slightly lighter tone. Single-ply
sheets are large (up to 15m wide) so seam lines are sparse and near-invisible
from altitude. Keep opacity ≤ 20%.

**GRP uniformity** — for GRP palette, suppress Voronoi zone generation
entirely. Render as a near-uniform surface with very low colour variation
(density parameter should not exceed effective 20% regardless of user setting).
Add faint banding lines in the lay direction.

---

### `_apply_shadow_layer()`

Applied to both pitched and flat results after base pattern render.

```python
def _apply_shadow_layer(
    base: Image.Image,
    shadow_palette: list[str],  # shadow swatch colours from palette
    sun_angle_deg: float,       # 0–360, compass bearing of sun
    sun_elevation_deg: float,   # 10–70, sun elevation above horizon
    shadow_depth: float,        # 0.0–1.0 opacity
    seed: int,
    roof_type: str,             # 'pitched' | 'flat'
) -> Image.Image:
```

**Shadow geometry** — shadow direction is the *opposite* of sun bearing:
```python
shadow_direction = (sun_angle_deg + 180) % 360
shadow_length_factor = 1.0 / math.tan(math.radians(sun_elevation_deg))
```

At `sun_elevation=35°`, `shadow_length_factor ≈ 1.43` — shadows are 1.43×
the height of the casting object.

**Parapet shadow** (flat roofs) — a strip along two edges of the canvas
(the north and west edges for a typical SW sun angle). Width proportional
to assumed parapet height (default 300mm equivalent in pixels) × shadow
length factor:
```python
parapet_h_px = max(4, round(tile_scale * 0.8))
shadow_w = round(parapet_h_px * shadow_length_factor)
# Draw along edges corresponding to shadow_direction
```

**Ridge shadow** (pitched roofs, passes ≥ 2) — a horizontal band at the
ridge line (canvas top third) slightly darker, suggesting the ridge capping
and its downslope shadow.

**Equipment shadows** (flat roofs, passes ≥ 2) — generate 3–8 small
rectangular shadows using Mulberry32. Each shadow has:
- A slightly lighter "equipment body" rectangle (the HVAC unit, plant box etc.)
- A darker shadow offset in the shadow direction by `shadow_length_factor`
- Body size: 15–50px wide, 10–35px tall (at reference scale)
- Shadow colour: palette shadow swatch at `shadow_depth` opacity

**Drainage stain streaks** (all, passes ≥ 2) — call `_apply_texture()`
with `tex_type='streak'`, direction aligned to fall direction (gravity =
downslope for pitched, outward from drain points for flat), using the algae
stain swatch (`palette[3]`), at weathering intensity. Streak density scales
with the weathering parameter.

**Compositing** — apply shadow layer with Multiply blend at `shadow_depth`
opacity. Multiply is correct here: shadows darken, never lighten.

---

### `render_pattern()` changes

Add Aerial mode handling to the existing `render_pattern()` function:

```python
elif mode == 'aerial':
    aerial_cfg = doc.get('aerial', {})
    roof_type   = aerial_cfg.get('roofType', 'flat')
    sun_angle   = float(aerial_cfg.get('sunAngle', 225))
    sun_elev    = float(aerial_cfg.get('sunElevation', 35))
    shadow_depth = float(aerial_cfg.get('shadowDepth', 0.6))
    weathering  = float(aerial_cfg.get('weathering', 0.4))
    zone_count  = int(aerial_cfg.get('zoneCount', 3))

    tile_type = _palette_name_to_tile_type(doc.get('paletteName', ''))

    if roof_type == 'pitched':
        img = _render_tiles(
            width, height, palette, pixel_scale, density, passes, seed,
            tile_type=tile_type,
            colour_variation=_tile_colour_variation(tile_type),
        )
    else:
        img = _render_flat_roof(
            width, height, palette, pixel_scale, density, passes, seed,
            zone_count=zone_count,
        )

    # Shadow / weathering pass always applied in Aerial mode
    img = _apply_shadow_layer(
        img, palette, sun_angle, sun_elev, shadow_depth, seed, roof_type
    )

    # Standard texture overlay if set
    tex = doc.get('texture', {})
    if tex.get('type', 'none') != 'none':
        img = _apply_texture(img, tex, seed)
```

---

### Helper: `_palette_name_to_tile_type()`

```python
TILE_TYPE_MAP = {
    'welsh slate':           'slate',
    'clay plain tile':       'plain',
    'clay pantile':          'pantile',
    'concrete interlocking': 'concrete',
    'fibre cement slate':    'fibre_cement',
}

def _palette_name_to_tile_type(palette_name: str) -> str:
    key = palette_name.lower().strip()
    return TILE_TYPE_MAP.get(key, 'plain')
```

---

### Helper: `_tile_colour_variation()`

```python
COLOUR_VARIATION = {
    'slate':        0.60,   # high — each stone unique
    'plain':        1.00,   # very high — handmade clay variation
    'pantile':      0.60,   # medium-high
    'concrete':     0.30,   # low — uniform manufacture
    'fibre_cement': 0.20,   # very low
}

def _tile_colour_variation(tile_type: str) -> float:
    return COLOUR_VARIATION.get(tile_type, 0.5)
```

---

## .pcm schema extension

Add an `aerial` key to the document schema:

```json
{
  "version": 1,
  "mode": "aerial",
  "paletteName": "Clay Pantile",
  "palette": ["#b08878", "#906858", "#786050", "#4a3830"],
  "params": {
    "pixel_scale": 14,
    "density": 55,
    "passes": 3,
    "seed": 72419
  },
  "aerial": {
    "roofType": "pitched",
    "sunAngle": 225,
    "sunElevation": 35,
    "shadowDepth": 0.6,
    "weathering": 0.4,
    "zoneCount": 3
  },
  "tile": false
}
```

---

## Frontend preview — `camo.ts` additions

The live preview does not need to implement the full tile render pipeline.
A simplified approximation is acceptable — preview vs export divergence is
documented and acceptable per the existing architecture decision.

**Pitched preview approximation:**
- Draw horizontal lines at tile-row intervals using the dark swatch colour
  (simulates tile row joints)
- Draw vertical lines at tile-column intervals using the dark swatch colour
- Fill the grid cells with per-cell colour variation using Mulberry32
- For pantile: add a lighter horizontal band at the top 30% of each tile row

This gives a recognisable tile impression in preview without implementing
full geometry, which would require complex clipping in SVG.

**Flat preview approximation:**
- Use existing `generateCamo()` at large pixel_scale for zone generation
- Composite a directional shadow strip along the appropriate canvas edges

**Shadow preview:**
- A semi-transparent dark rectangle along 1–2 canvas edges, width proportional
  to sun elevation, direction derived from sun angle
- Opacity = shadowDepth × 0.8 (slightly lighter in preview than export)

---

## Export size considerations

Typical tarpaulin print sizes for UK rooftop applications:
- Single garage flat roof: ~5m × 3m
- Terrace house rear extension flat roof: ~4m × 4m
- Semi-detached pitched roof section: ~7m × 6m
- Commercial flat roof (small): ~10m × 8m

At 150 DPI (adequate for large-format tarpaulin printing):
- 5m × 3m = 2953 × 1772 px
- 10m × 8m = 5906 × 4724 px

Add these as named size presets to the Export section when Aerial mode is active:
```
Garage Flat (5×3m)  → 2953 × 1772 @ 150dpi
Extension Flat (4×4m) → 2362 × 2362 @ 150dpi
Terrace Pitched (7×6m) → 4134 × 3543 @ 150dpi
Large Flat (10×8m)  → 5906 × 4724 @ 150dpi
```

---

## Integration checklist

- [ ] `Aerial` button added to mode selector in `Sidebar.tsx`
- [ ] Aerial sub-panel (Roof Type, Sun Angle, Sun Elevation, Shadow Depth,
      Weathering, Zone Count) renders when Mode = Aerial
- [ ] Palette Source dropdown shows UK rooftop palettes in Aerial mode
- [ ] Roof Type auto-sets when a palette is selected
- [ ] Pixel Scale label changes to Tile Scale / Zone Scale in Aerial mode
- [ ] `_render_tiles()` implemented in `renderer.py` for all 5 tile types
- [ ] `_render_flat_roof()` implemented in `renderer.py`
- [ ] `_apply_shadow_layer()` implemented with parapet, ridge, equipment, streak
- [ ] `render_pattern()` extended with Aerial mode branch
- [ ] `.pcm` schema extended with `aerial` key
- [ ] Frontend preview approximation for pitched and flat
- [ ] Aerial size presets added to export bar when Mode = Aerial
- [ ] All 10 UK rooftop palettes from `PALETTES_UK_ROOFTOP.md` present in
      `constants.ts`
- [ ] `paletteName` field added to document state (needed for tile type lookup)

---

## Do not implement in this milestone

- Multi-spectral / NIR band simulation (v3 research feature)
- Automatic palette extraction from reference photos (v3 feature)
- Real-world geolocation integration (OpenStreetMap roof outline import)
- Print bleed / crop mark output for Aerial mode (defer to export polish pass)
