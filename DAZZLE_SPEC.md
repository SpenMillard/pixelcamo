# Pixelcamo — Dazzle Mode Specification

This file clarifies the Dazzle algorithm for Claude Code.
It supersedes the naval razzle-dazzle description in `README.md §6`.

---

## Background

The README describes naval razzle-dazzle (triangulated regions from
perimeter points). The implemented algorithm is different: **CV Dazzle**,
developed by Adam Harvey (2010), which targets facial detection systems
rather than naval silhouette disruption. The two produce visually
distinct output and serve different use cases. CV Dazzle is the correct
implementation for this application.

---

## What CV Dazzle is

CV Dazzle disrupts facial recognition by:

1. Breaking the bilateral symmetry that face detectors expect
2. Obscuring the eye and nose-bridge regions with high-contrast geometry
3. Using diagonal shapes that cross facial landmark boundaries rather than
   aligning with them

The output reads as bold geometric abstract pattern — not organic camo —
which is intentional. The visual disruption is the point.

---

## Algorithm (JS preview + Python export)

### Inputs (same PatternOpts as Camo, all fields used)

```
width, height   — canvas dimensions in pixels
palette         — 2–8 hex colours (see PALETTES.md for dazzle palettes)
pixel_scale     — controls shape size (mapped to a 0.2–5.0 multiplier)
density         — controls shape count / detail level
passes          — 1, 2, or 3 (controls which rendering passes run)
seed            — any 32-bit int for deterministic output
tile            — bool (wrap geometry on torus for seamless repeats)
```

### Shape vocabulary

Four shape types, all convex polygons:

```
triangle       — isoceles, point up
parallelogram  — horizontal rhombus, slight offset
wedge          — wide asymmetric quadrilateral
slash          — thin elongated rectangle (used for diagonal bars)
```

All shapes are rotated by an arbitrary angle before placement,
so they never align to the pixel grid.

### Rotation helper

```python
def rotate_point(x, y, cx, cy, angle_deg):
    a = math.radians(angle_deg)
    dx, dy = x - cx, y - cy
    return (
        cx + dx * math.cos(a) - dy * math.sin(a),
        cy + dx * math.sin(a) + dy * math.cos(a)
    )

def make_polygon(cx, cy, shape, size, angle_deg):
    s = size
    if shape == 'triangle':
        pts = [(cx, cy-s), (cx-s, cy+s*0.6), (cx+s, cy+s*0.6)]
    elif shape == 'parallelogram':
        pts = [(cx-s, cy-s*0.4), (cx+s*0.4, cy-s*0.4),
               (cx+s, cy+s*0.4), (cx-s*0.4, cy+s*0.4)]
    elif shape == 'wedge':
        pts = [(cx-s*1.2, cy), (cx+s*0.2, cy-s*0.9),
               (cx+s*1.2, cy), (cx+s*0.2, cy+s*0.3)]
    else:  # slash
        w = s * 0.22
        pts = [(cx-s, cy-w), (cx+s, cy-w),
               (cx+s, cy+w), (cx-s, cy+w)]
    return [rotate_point(px, py, cx, cy, angle_deg) for px, py in pts]
```

### Rendering passes

The `passes` parameter (1, 2, or 3) gates which layers render.
Higher passes = more detail, slower render.

**Pass 1 — Large asymmetric background shapes** (always rendered)

```
count:   6–10 shapes  (scaled by density)
size:    18%–40% of canvas width  (scaled by pixel_scale)
angle:   random, ±65°
colours: darkest colours in palette only
placement rule:
  — each shape is given a left/right bias (random ±1)
  — x position = canvas_cx + bias × random(5%–35% of canvas_w)
  — y position = random(10%–90% of canvas_h)
  — this enforces asymmetry: shapes cluster to one side
```

**Pass 2 — Diagonal slash bars** (rendered when passes ≥ 2)

Targets the eye-level and nose-bridge zones by crossing them diagonally.

```
count:   4–7 slashes  (scaled by density)
size:    15%–35% of canvas width
angle:   constrained to either +25° to +55°  OR  -55° to -25°
         (random choice per slash — avoids horizontals and verticals)
colours: first 1–2 palette entries (highest contrast)
placement: random across canvas, concentrated in vertical centre
```

**Pass 3 — Medium geometric detail** (rendered when passes = 3)

```
count:   10–18 shapes  (scaled by density)
size:    4%–14% of canvas width  (scaled by pixel_scale)
angle:   fully random, ±90°
colours: any palette colour
placement: fully random
```

**Pass 3 continued — Fine pixel noise**

Replicates the dazzle noise effect the user identified as visually
useful in the Dazzle preview. Applied after all polygon passes.

```
cell_size:   max(1, round(3 × pixel_scale × 0.5))
count:       canvas_area × 0.012 × density / cell_size²
colours:     strictly alternates darkest palette colour and lightest
             (hard contrast only — no mid-tones in this pass)
```

### Seeded RNG

Use Mulberry32 (see `camo.js`) for the JS preview.
For Python export, port Mulberry32 verbatim for parity:

```python
def mulberry32(seed):
    """Port of the JS Mulberry32 PRNG for seed-parity with the preview."""
    a = seed & 0xFFFFFFFF
    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rand
```

---

## Colour selection rules

The lightest colour in the palette is used as the **base fill**.
(This differs from Camo mode, which uses the darkest.)

Rationale: high-contrast dazzle reads better on a light background —
dark shapes on white are more visually disruptive than white shapes
on black at typical viewing distances.

```python
rgbs = [hex_to_rgb(c) for c in palette]
base_colour = max(rgbs, key=lambda c: sum(c))   # lightest
dark_colours = [c for c in rgbs if sum(c) < sum(base_colour)]
if not dark_colours:
    dark_colours = [rgbs[0]]
```

Pass 1 draws only from `dark_colours`.
Passes 2 and 3 draw from the full palette.

---

## Tile mode

When `tile = True`, shapes that extend beyond the canvas edge should
wrap on a torus so the pattern tiles seamlessly. Implementation:

- After generating shape vertices, check if the bounding box extends
  beyond the canvas boundary on any edge.
- If it does, draw the shape a second time translated by ±width or
  ±height as needed (up to 3 additional copies for corner shapes).

---

## Render to image (Python / NumPy export)

Unlike Camo mode, Dazzle output is vector-native (polygons). For the
export render path, use Pillow's `ImageDraw.polygon()` directly rather
than a NumPy grid:

```python
from PIL import Image, ImageDraw

def render_dazzle(opts: PatternOpts) -> Image.Image:
    img = Image.new('RGB', (opts.width, opts.height), base_colour)
    draw = ImageDraw.Draw(img)
    rand = mulberry32(opts.seed)

    # Pass 1
    for _ in range(n_large):
        pts = make_polygon(...)
        draw.polygon(pts, fill=colour)

    # Pass 2 (if passes >= 2)
    for _ in range(n_slashes):
        pts = make_polygon(...)
        draw.polygon(pts, fill=colour)

    # Pass 3 (if passes == 3)
    for _ in range(n_medium):
        pts = make_polygon(...)
        draw.polygon(pts, fill=colour)

    # Noise pass (if passes == 3)
    for _ in range(n_noise):
        draw.rectangle([x, y, x+ns, y+ns], fill=colour)

    return img
```

This renders identically to the canvas preview at any resolution
without NumPy upscaling artefacts.

---

## JS preview implementation

The live preview in the webview uses an SVG `<polygon>` element per
shape, exactly mirroring the Python polygon approach. This gives
genuine render parity between preview and export — unlike the Camo
mode which uses canvas rects at preview resolution and a NumPy grid
at export resolution.

See the `dDaz()` function in the existing `camo.js` / studio widget
for the reference JS implementation to port into the React frontend.

---

## What NOT to implement

The README's naval razzle-dazzle description (triangulated regions from
perimeter points) should not be implemented. It produces a different
visual output and does not address facial recognition disruption.

If a naval/ship-camouflage mode is wanted in future, add it as a
fifth mode (`Naval`) rather than replacing Dazzle. See `ROADMAP.md`.
