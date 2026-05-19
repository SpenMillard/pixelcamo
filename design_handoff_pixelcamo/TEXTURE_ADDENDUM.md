# Pixelcamo — Texture Addendum (Types 4–6)

This addendum extends the texture system specified in `CLAUDE_CODE_PROMPT.md`.
The existing three texture types (Stipple, Hatch, Scratch) are v1. This document
specifies three additional types to be added to the same system using the same
architecture: offscreen canvas composited over the base pattern with opacity,
blend mode, colour, and type-specific sliders.

Add these to the texture type segmented control:
**None / Stipple / Hatch / Scratch / Grain / Hex / Streak**

The conditional panel pattern is identical to existing types — show only the
relevant controls for the selected type.

---

## Type 4 — Grain

Fine random pixel noise. Simulates photographic film grain, fabric weave
texture, or print halftone noise. Very subtle at low intensity; reads as
surface texture rather than a visible pattern.

### Parameters
| Slider | Range | Default | Description |
|--------|-------|---------|-------------|
| Opacity | 0–100% | 25% | Overall blend strength |
| Intensity | 0.2–3.0 | 1.0 | Noise amplitude — how dark/light each grain pixel can be |
| Scale | 1–4 px | 1 px | Grain particle size. 1 = single pixel, 4 = 4×4 block |
| Colour | Dark / Light / Custom | Dark | Tint of noise particles |
| Blend | dropdown | Overlay | Blend mode for compositing |

### Algorithm

```python
def render_grain(ctx, W, H, intensity, scale, colour, seed):
    rng = mulberry32(seed + 3000)
    cell = max(1, int(scale))
    # iterate over grid of cells
    for y in range(0, H, cell):
        for x in range(0, W, cell):
            # random value in [-intensity, +intensity]
            v = (rng() * 2 - 1) * intensity
            # clamp to [0, 1] for alpha
            alpha = min(1.0, max(0.0, abs(v)))
            # draw cell with colour at computed alpha
            ctx.fillStyle = colour_at_alpha(colour, alpha)
            ctx.fillRect(x, y, cell, cell)
```

For the JS preview, use a single `ImageData` pixel write loop for performance
(avoid thousands of individual fillRect calls):

```javascript
function drawGrain(ctx, W, H, intensity, scale, col, seed) {
  const rng = mulberry32(seed + 3000);
  const cell = Math.max(1, Math.round(scale));
  const [r, g, b] = hexToRgb(col);
  const img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const v = (rng() * 2 - 1) * intensity;
      const a = Math.min(255, Math.round(Math.abs(v) * 255));
      const i = (py * W + px) * 4;
      img.data[i]   = r;
      img.data[i+1] = g;
      img.data[i+2] = b;
      img.data[i+3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
}
```

Grain at scale > 1 should write the same noise value to all pixels in each
cell (compute once per cell, fill the block) — this gives fabric-weave rather
than pure film grain.

### Recommended blend modes
- Overlay — increases contrast while adding texture (best for camo)
- Screen — lightening grain, good for worn/bleached look
- Multiply — darkening grain, good for shadow/grime

---

## Type 5 — Hex Mesh

A hexagonal grid overlay. Thins to near-invisible at large cell sizes; becomes
a dense tessellation at small sizes. Gives a technical or urban feel — good
over Concrete, Urban, and Midnight palettes. A square mesh variant is
provided via a toggle.

### Parameters
| Slider | Range | Default | Description |
|--------|-------|---------|-------------|
| Opacity | 0–100% | 30% | Overall blend strength |
| Cell size | 10–120 px | 40 px | Diameter of each hexagonal cell |
| Line weight | 0.5–4 px | 1 px | Stroke width of grid lines |
| Colour | Dark / Light / Custom | Light | Grid line colour |
| Blend | dropdown | Normal | Blend mode |
| Square | toggle | Off | Switch from hex to square grid |

### Algorithm — Hexagonal grid

A flat-topped hexagon grid. For each cell at grid position (col, row):

```python
def hex_center(col, row, cell_size):
    """Flat-topped hexagons."""
    w = cell_size
    h = cell_size * math.sqrt(3) / 2
    x = col * w * 1.5
    y = row * h * 2 + (col % 2) * h
    return x, y

def hex_vertices(cx, cy, r):
    """Six vertices of a flat-topped hexagon, radius r."""
    return [
        (cx + r * math.cos(math.radians(a)),
         cy + r * math.sin(math.radians(a)))
        for a in range(0, 360, 60)
    ]
```

Draw only the grid lines (stroke, no fill). Extend the grid 1–2 cells beyond
the canvas boundary in all directions to avoid edge gaps.

For the square grid variant, replace with a simple line grid:
```python
# Vertical lines
for x in range(0, W + cell_size, cell_size):
    draw.line([(x, 0), (x, H)], fill=colour, width=line_weight)
# Horizontal lines
for y in range(0, H + cell_size, cell_size):
    draw.line([(0, y), (W, y)], fill=colour, width=line_weight)
```

### Tile behaviour
When `tile = True`, the grid is already inherently tileable — no special
handling needed.

---

## Type 6 — Erosion Streaks

Directional streaks suggesting weathering, rain run-off, rust bleed, or
wear. Unlike Scratch (which is short random strokes), Streaks are long,
thin, and directional — they flow consistently in one direction with
slight waviness. Gives patterns a sense of being on an exposed surface.

### Parameters
| Slider | Range | Default | Description |
|--------|-------|---------|-------------|
| Opacity | 0–100% | 35% | Overall blend strength |
| Direction | 0–360° | 90° | Angle of flow (90° = downward, 0° = rightward) |
| Length | 20–200 px | 80 px | Mean streak length |
| Density | 0.1–3.0 | 0.5 | Number of streaks per unit area |
| Waviness | 0–1.0 | 0.3 | How much each streak deviates from the direction (0 = straight) |
| Weight | 0.5–3 px | 1 px | Stroke width |
| Colour | Dark / Light / Custom | Dark | Streak colour |
| Blend | dropdown | Multiply | Blend mode |

### Algorithm

```python
def render_streaks(ctx, W, H, direction_deg, length, density,
                   waviness, weight, colour, seed):
    rng = mulberry32(seed + 4000)
    n = int(W * H * density * 0.001)
    base_angle = math.radians(direction_deg)

    ctx.strokeStyle = colour
    ctx.lineWidth = weight
    ctx.lineCap = 'round'

    for _ in range(n):
        # Random start point
        x = rng() * W
        y = rng() * H
        streak_len = length * (0.4 + rng() * 1.2)

        ctx.beginPath()
        ctx.moveTo(x, y)

        # Draw streak as a series of small segments with slight waviness
        steps = max(2, int(streak_len / 8))
        seg_len = streak_len / steps
        angle = base_angle

        for _ in range(steps):
            # Add slight angular deviation per step
            angle += (rng() - 0.5) * waviness * 0.4
            dx = math.cos(angle) * seg_len
            dy = math.sin(angle) * seg_len
            x += dx
            y += dy
            ctx.lineTo(x, y)

        ctx.stroke()
```

Streaks taper naturally because the waviness causes them to spread slightly —
no explicit taper needed. For a stronger taper effect, reduce lineWidth
progressively through segments.

### Tile behaviour
When `tile = True`, streaks that exit one edge should re-enter from the
opposite edge (torus wrapping). Implement by checking if the current point
has left the canvas bounds and wrapping modulo W/H.

---

## Integration checklist

- [ ] Add Grain, Hex, Streak to the `TEXTURE_TYPES` array in `app-parts.jsx`
- [ ] Add a `TextureControls` branch for each new type showing only its relevant sliders
- [ ] Implement JS preview render functions for all four types in `camo.ts`
- [ ] Implement Python export render functions for all four types in `renderer.py`
- [ ] Add new parameters to the `.pcm` schema (extend the `texture` object in §7 of README)
- [ ] Verify all eight texture types composite correctly with all blend modes
- [ ] Verify tile behaviour for Streaks when `tile = True`
      at 640×480. If not, reduce scale factor or cap point count.
