"""
renderer.py — high-resolution pattern generation for Pixelcamo.

Camo mode  : Mulberry32-seeded Voronoi grid → NumPy upscale → Pillow Image
Dazzle mode: Mulberry32-seeded CV-Dazzle polygons → Pillow ImageDraw directly
Blend mode : two Camo layers composited via opacity + blend mode

Public surface:
    render_pattern(doc: dict, opts: dict) -> PIL.Image.Image
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from PIL import Image, ImageDraw


# ---------------------------------------------------------------------------
# Mulberry32 — verbatim port from camo.js for seed parity with the preview
# ---------------------------------------------------------------------------

def mulberry32(seed: int) -> Callable[[], float]:
    a = seed & 0xFFFFFFFF

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rand


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _luminance(rgb: tuple[int, int, int]) -> int:
    return rgb[0] + rgb[1] + rgb[2]


def _rotate_point(
    x: float, y: float, cx: float, cy: float, angle_deg: float
) -> tuple[float, float]:
    a = math.radians(angle_deg)
    dx, dy = x - cx, y - cy
    return (
        cx + dx * math.cos(a) - dy * math.sin(a),
        cy + dx * math.sin(a) + dy * math.cos(a),
    )


def _make_polygon(
    cx: float, cy: float, shape: str, size: float, angle_deg: float
) -> list[tuple[float, float]]:
    s = size
    if shape == 'triangle':
        pts: list[tuple[float, float]] = [
            (cx, cy - s), (cx - s, cy + s * 0.6), (cx + s, cy + s * 0.6)
        ]
    elif shape == 'parallelogram':
        pts = [
            (cx - s, cy - s * 0.4), (cx + s * 0.4, cy - s * 0.4),
            (cx + s, cy + s * 0.4), (cx - s * 0.4, cy + s * 0.4),
        ]
    elif shape == 'wedge':
        pts = [
            (cx - s * 1.2, cy), (cx + s * 0.2, cy - s * 0.9),
            (cx + s * 1.2, cy), (cx + s * 0.2, cy + s * 0.3),
        ]
    else:  # slash
        w = s * 0.22
        pts = [
            (cx - s, cy - w), (cx + s, cy - w),
            (cx + s, cy + w), (cx - s, cy + w),
        ]
    return [_rotate_point(px, py, cx, cy, angle_deg) for px, py in pts]


# ---------------------------------------------------------------------------
# Camo mode (NumPy Voronoi grid)
# ---------------------------------------------------------------------------

def _render_camo(
    width: int, height: int,
    palette: list[str],
    pixel_scale: int,
    density: int,
    passes: int,
    seed: int,
    tile: bool,
    locked: list[bool] | None = None,
) -> Image.Image:
    cell = max(4, min(60, pixel_scale))
    cols = math.ceil(width / cell)
    rows = math.ceil(height / cell)
    cluster_count = max(3, round(6 + (density / 100) * 40))
    noise_scale = 0.18

    # Build pool of assignable palette indices (exclude locked swatches)
    if locked:
        assignable = [i for i, lk in enumerate(locked) if not lk]
    else:
        assignable = list(range(len(palette)))
    if not assignable:
        assignable = list(range(len(palette)))

    grid = np.zeros((rows, cols), dtype=np.uint8)
    rand = mulberry32(seed)

    for p in range(passes):
        # Pick cluster centres — colour drawn from assignable pool only
        px_arr = np.array([rand() * cols for _ in range(cluster_count)])
        py_arr = np.array([rand() * rows for _ in range(cluster_count)])
        pc_arr = np.array([assignable[int(rand() * len(assignable)) % len(assignable)] for _ in range(cluster_count)])

        # Build coordinate arrays with warp noise
        c_idx = np.arange(cols)
        r_idx = np.arange(rows)
        # We need per-cell random numbers — generate them in sequence with mulberry32
        noise = np.array([rand() for _ in range(rows * cols * 2)], dtype=np.float64)
        noise = noise.reshape(rows, cols, 2)

        wx = c_idx[np.newaxis, :] + (noise[:, :, 0] - 0.5) * 2 * noise_scale * cell
        wy = r_idx[:, np.newaxis] + (noise[:, :, 1] - 0.5) * 2 * noise_scale * cell

        if tile:
            # Toroidal nearest-seed distance
            dx = wx[:, :, np.newaxis] - px_arr[np.newaxis, np.newaxis, :]
            dy = wy[:, :, np.newaxis] - py_arr[np.newaxis, np.newaxis, :]
            dx = dx - cols * np.round(dx / cols)
            dy = dy - rows * np.round(dy / rows)
        else:
            dx = wx[:, :, np.newaxis] - px_arr[np.newaxis, np.newaxis, :]
            dy = wy[:, :, np.newaxis] - py_arr[np.newaxis, np.newaxis, :]

        dist2 = dx * dx + dy * dy
        best = np.argmin(dist2, axis=2).astype(np.uint8)
        best_color = pc_arr[best]

        if p == 0:
            grid[:, :] = best_color
        else:
            # Overwrite 45% of cells on subsequent passes
            mask_vals = np.array([rand() for _ in range(rows * cols)], dtype=np.float32)
            mask = mask_vals.reshape(rows, cols) < 0.45
            grid[mask] = best_color[mask]

    # Build palette RGB array
    rgb_palette = [_hex_to_rgb(c) for c in palette]
    # Upscale grid via numpy.repeat
    grid_clipped = np.clip(grid, 0, len(rgb_palette) - 1)
    r_channel = np.array([rgb_palette[i][0] for i in range(len(rgb_palette))], dtype=np.uint8)
    g_channel = np.array([rgb_palette[i][1] for i in range(len(rgb_palette))], dtype=np.uint8)
    b_channel = np.array([rgb_palette[i][2] for i in range(len(rgb_palette))], dtype=np.uint8)

    r_img = r_channel[grid_clipped]
    g_img = g_channel[grid_clipped]
    b_img = b_channel[grid_clipped]

    rgb_array = np.stack([r_img, g_img, b_img], axis=2)
    # Upscale
    rgb_array = np.repeat(np.repeat(rgb_array, cell, axis=0), cell, axis=1)
    # Crop to exact width×height
    rgb_array = rgb_array[:height, :width]

    return Image.fromarray(rgb_array, 'RGB')


# ---------------------------------------------------------------------------
# Dazzle mode (CV Dazzle — Pillow polygon renderer)
# ---------------------------------------------------------------------------

SHAPES = ('triangle', 'parallelogram', 'wedge', 'slash')


def _draw_shape_with_tiling(
    draw: ImageDraw.ImageDraw,
    cx: float, cy: float,
    shape: str, size: float, angle_deg: float,
    fill: tuple[int, int, int],
    width: int, height: int,
    tile: bool,
) -> None:
    offsets = [(0, 0)]
    if tile:
        offsets += [(-width, 0), (width, 0), (0, -height), (0, height),
                    (-width, -height), (width, -height), (-width, height), (width, height)]

    for ox, oy in offsets:
        pts = _make_polygon(cx + ox, cy + oy, shape, size, angle_deg)
        # Only draw if any vertex is on-canvas
        if tile or any(0 <= px <= width and 0 <= py <= height for px, py in pts):
            draw.polygon([(px, py) for px, py in pts], fill=fill)


def _render_dazzle(
    width: int, height: int,
    palette: list[str],
    pixel_scale: int,
    density: int,
    passes: int,
    seed: int,
    tile: bool,
) -> Image.Image:
    rgbs = [_hex_to_rgb(c) for c in palette]
    base_colour = max(rgbs, key=_luminance)
    dark_colours = [c for c in rgbs if _luminance(c) < _luminance(base_colour)]
    if not dark_colours:
        dark_colours = [rgbs[0]]
    light_colours = sorted(rgbs, key=_luminance, reverse=True)[:2]

    rand = mulberry32(seed)
    img = Image.new('RGB', (width, height), base_colour)
    draw = ImageDraw.Draw(img)

    cx_canvas = width / 2
    cy_canvas = height / 2
    cw = width
    ch = height

    # ---- Pass 1: large asymmetric background shapes ----
    scale_mult = 0.2 + (pixel_scale - 4) / 36 * 4.8  # 0.2–5.0
    n_large = round(6 + (density / 100) * 4)  # 6–10
    for _ in range(n_large):
        shape = SHAPES[int(rand() * len(SHAPES))]
        size = (0.18 + rand() * 0.22) * cw * scale_mult
        angle = (rand() - 0.5) * 130  # ±65°
        bias = 1 if rand() < 0.5 else -1
        cx = cx_canvas + bias * (0.05 + rand() * 0.30) * cw
        cy = (0.10 + rand() * 0.80) * ch
        colour = dark_colours[int(rand() * len(dark_colours))]
        _draw_shape_with_tiling(draw, cx, cy, shape, size, angle, colour, width, height, tile)

    if passes < 2:
        return img

    # ---- Pass 2: diagonal slash bars ----
    n_slashes = round(4 + (density / 100) * 3)  # 4–7
    for _ in range(n_slashes):
        size = (0.15 + rand() * 0.20) * cw * scale_mult
        # angle constrained to ±25°–55° (positive or negative)
        base_angle = 25 + rand() * 30  # 25–55
        angle = base_angle if rand() < 0.5 else -base_angle
        cx = rand() * cw
        cy = (0.25 + rand() * 0.50) * ch  # concentrated vertically
        colour_idx = int(rand() * min(2, len(rgbs)))
        colour = rgbs[colour_idx]
        _draw_shape_with_tiling(draw, cx, cy, 'slash', size, angle, colour, width, height, tile)

    if passes < 3:
        return img

    # ---- Pass 3: medium geometric detail ----
    n_medium = round(10 + (density / 100) * 8)  # 10–18
    for _ in range(n_medium):
        shape = SHAPES[int(rand() * len(SHAPES))]
        size = (0.04 + rand() * 0.10) * cw * scale_mult
        angle = (rand() - 0.5) * 180
        cx = rand() * cw
        cy = rand() * ch
        colour = rgbs[int(rand() * len(rgbs))]
        _draw_shape_with_tiling(draw, cx, cy, shape, size, angle, colour, width, height, tile)

    # ---- Pass 3 continued: fine pixel noise ----
    cell_size = max(1, round(3 * pixel_scale * 0.5))
    canvas_area = width * height
    n_noise = round(canvas_area * 0.012 * density / (cell_size * cell_size))
    sorted_rgbs = sorted(rgbs, key=_luminance)
    darkest = sorted_rgbs[0]
    lightest = sorted_rgbs[-1]
    for i in range(n_noise):
        nx = int(rand() * (width - cell_size))
        ny = int(rand() * (height - cell_size))
        colour = darkest if i % 2 == 0 else lightest
        draw.rectangle([nx, ny, nx + cell_size, ny + cell_size], fill=colour)

    return img


# ---------------------------------------------------------------------------
# Texture overlay
# ---------------------------------------------------------------------------

def _apply_texture(
    base: Image.Image,
    tex: dict,
    rand_seed: int,
) -> Image.Image:
    tex_type = tex.get('type', 'none')
    if tex_type == 'none':
        return base

    opacity = tex.get('opacity', 50) / 100.0
    scale = max(1, tex.get('scale', 3))
    density = tex.get('density', 50)
    color_hex = tex.get('color', '#000000')
    fill_rgb = _hex_to_rgb(color_hex)
    blend_mode = tex.get('blend', 'multiply').lower()

    width, height = base.size
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rand = mulberry32(rand_seed ^ 0xDEADBEEF)

    if tex_type == 'stipple':
        dot_r = max(1, round(scale * 0.4))
        n_dots = round(width * height / max(1, 200 - density))
        for _ in range(n_dots):
            x = int(rand() * width)
            y = int(rand() * height)
            draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r],
                         fill=(*fill_rgb, 255))

    elif tex_type == 'hatch':
        angle = tex.get('angle', 45)
        spread = max(1, tex.get('spread', 6))
        cross = tex.get('cross', False)
        stroke_w = max(1, round(scale * 0.4))

        def draw_lines(a: float) -> None:
            ra = math.radians(a)
            cos_a, sin_a = math.cos(ra), math.sin(ra)
            diag = int(math.hypot(width, height))
            for d in range(-diag, diag + width, spread):
                x0 = int(d * cos_a - diag * (-sin_a))
                y0 = int(d * sin_a - diag * cos_a)
                x1 = int(d * cos_a + diag * (-sin_a))
                y1 = int(d * sin_a + diag * cos_a)
                draw.line([(x0, y0), (x1, y1)], fill=(*fill_rgb, 255), width=stroke_w)

        draw_lines(angle)
        if cross:
            draw_lines(angle + 90)

    elif tex_type == 'scratch':
        length = max(4, tex.get('length', 12))
        stroke_w = max(1, round(scale * 0.3))
        n_scratches = round(width * height * 0.00005 * density)
        for _ in range(n_scratches):
            x = rand() * width
            y = rand() * height
            a = rand() * 360
            ra = math.radians(a)
            x1 = x + math.cos(ra) * length / 2
            y1 = y + math.sin(ra) * length / 2
            x0 = x - math.cos(ra) * length / 2
            y0 = y - math.sin(ra) * length / 2
            draw.line([(x0, y0), (x1, y1)], fill=(*fill_rgb, 255), width=stroke_w)

    elif tex_type == 'grain':
        intensity = float(tex.get('intensity', 1.0))
        cell = max(1, int(scale))
        rng = mulberry32(rand_seed ^ 0x12345678)
        if cell == 1:
            noise_vals = np.array([rng() for _ in range(width * height)], dtype=np.float32)
            noise_vals = noise_vals.reshape(height, width)
        else:
            cell_cols = math.ceil(width / cell)
            cell_rows = math.ceil(height / cell)
            noise_vals = np.array([rng() for _ in range(cell_cols * cell_rows)], dtype=np.float32)
            noise_vals = noise_vals.reshape(cell_rows, cell_cols)
            noise_vals = np.repeat(np.repeat(noise_vals, cell, axis=0), cell, axis=1)
            noise_vals = noise_vals[:height, :width]
        v = (noise_vals * 2.0 - 1.0) * intensity
        alphas = np.minimum(1.0, np.abs(v))
        alpha_ch = (alphas * 255).astype(np.uint8)
        overlay_arr = np.zeros((height, width, 4), dtype=np.uint8)
        overlay_arr[:, :, 0] = fill_rgb[0]
        overlay_arr[:, :, 1] = fill_rgb[1]
        overlay_arr[:, :, 2] = fill_rgb[2]
        overlay_arr[:, :, 3] = alpha_ch
        overlay = Image.fromarray(overlay_arr, 'RGBA')

    elif tex_type == 'hex':
        cell_size = max(10, int(tex.get('cellSize', 40)))
        line_weight = max(1, round(tex.get('lineWeight', 1)))
        square_mode = bool(tex.get('square', False))
        if square_mode:
            for x in range(0, width + cell_size, cell_size):
                draw.line([(x, 0), (x, height)], fill=(*fill_rgb, 255), width=line_weight)
            for y in range(0, height + cell_size, cell_size):
                draw.line([(0, y), (width, y)], fill=(*fill_rgb, 255), width=line_weight)
        else:
            # Flat-topped hexagons; cell_size = diameter (2r)
            r_hex = cell_size / 2.0
            hex_h = r_hex * math.sqrt(3)
            col_count = math.ceil(width / (r_hex * 3)) + 2
            row_count = math.ceil(height / (hex_h * 2)) + 2
            for col in range(-1, col_count):
                for row in range(-1, row_count):
                    cx = col * r_hex * 3
                    cy = row * hex_h * 2 + (col % 2) * hex_h
                    pts = [
                        (cx + r_hex * math.cos(math.radians(a)),
                         cy + r_hex * math.sin(math.radians(a)))
                        for a in range(0, 360, 60)
                    ]
                    draw.polygon([(round(px), round(py)) for px, py in pts],
                                 outline=(*fill_rgb, 255), width=line_weight)

    elif tex_type == 'streak':
        direction = float(tex.get('direction', 90))
        streak_length = max(20, float(tex.get('length', 80)))
        streak_density = max(1, float(tex.get('density', 50)))
        waviness = max(0.0, float(tex.get('waviness', 0.3)))
        stroke_w = max(1, round(float(tex.get('weight', 1))))
        n = int(width * height * (streak_density / 100) * 3 * 0.001)
        base_angle = math.radians(direction)
        rng = mulberry32(rand_seed ^ 0x4321ABCD)
        for _ in range(n):
            x = rng() * width
            y = rng() * height
            seg_len_total = streak_length * (0.4 + rng() * 1.2)
            steps = max(2, int(seg_len_total / 8))
            seg = seg_len_total / steps
            angle = base_angle
            pts = [(x, y)]
            for _ in range(steps):
                angle += (rng() - 0.5) * waviness * 0.4
                x += math.cos(angle) * seg
                y += math.sin(angle) * seg
                pts.append((x, y))
            for i in range(len(pts) - 1):
                draw.line([pts[i], pts[i + 1]], fill=(*fill_rgb, 255), width=stroke_w)

    # Composite overlay onto base
    base_rgba = base.convert('RGBA')
    try:
        import blend_modes as bm
        base_arr = np.array(base_rgba, dtype=np.float32)
        over_arr = np.array(overlay, dtype=np.float32)
        mode_map = {
            'multiply': bm.multiply,
            'screen': bm.screen,
            'overlay': bm.overlay,
            'soft-light': bm.soft_light,
            'difference': bm.difference,
            'normal': bm.normal,
        }
        blend_fn = mode_map.get(blend_mode, bm.multiply)
        blended_arr = blend_fn(base_arr, over_arr, opacity)
        result = Image.fromarray(blended_arr.astype(np.uint8), 'RGBA')
    except Exception:
        # Fallback: simple alpha composite
        result = Image.alpha_composite(base_rgba, overlay)

    return result.convert('RGB')


# ---------------------------------------------------------------------------
# Aerial mode
# ---------------------------------------------------------------------------

def _lighten_or_darken(
    rgb: tuple[int, int, int], delta: float
) -> tuple[int, int, int]:
    """Shift all three RGB channels by delta (−255…+255), clamped to 0–255."""
    return (
        max(0, min(255, round(rgb[0] + delta))),
        max(0, min(255, round(rgb[1] + delta))),
        max(0, min(255, round(rgb[2] + delta))),
    )


TILE_TYPE_MAP = {
    'welsh slate':           'slate',
    'clay plain tile':       'plain',
    'clay pantile':          'pantile',
    'concrete interlocking': 'concrete',
    'fibre cement slate':    'fibre_cement',
}


def _palette_name_to_tile_type(palette_name: str) -> str:
    return TILE_TYPE_MAP.get(palette_name.lower().strip(), 'plain')


COLOUR_VARIATION = {
    'slate':        0.60,
    'plain':        1.00,
    'pantile':      0.60,
    'concrete':     0.30,
    'fibre_cement': 0.20,
}


def _tile_colour_variation(tile_type: str) -> float:
    return COLOUR_VARIATION.get(tile_type, 0.5)


# Tile geometry (mm dimensions, scaled by tile_scale / 14.0)
# tw = (min_mm, max_mm), th = (min_mm, max_mm)
_TILE_GEOM: dict[str, dict] = {
    'slate':        {'tw': (300, 500), 'th': (200, 300), 'lap': 87,  'margin': 6,  'bond': 'broken',   'profile': 'flat'},
    'plain':        {'tw': (165, 165), 'th': (265, 265), 'lap': 65,  'margin': 3,  'bond': 'broken',   'profile': 'flat'},
    'pantile':      {'tw': (335, 335), 'th': (390, 390), 'lap': 75,  'margin': 25, 'bond': 'straight', 'profile': 'barrel'},
    'concrete':     {'tw': (420, 420), 'th': (330, 330), 'lap': 75,  'margin': 30, 'bond': 'broken',   'profile': 'rib'},
    'fibre_cement': {'tw': (600, 600), 'th': (300, 300), 'lap': 90,  'margin': 3,  'bond': 'broken',   'profile': 'flat'},
}


def _render_tiles(
    width: int, height: int,
    palette: list[str],
    tile_scale: int,
    density: int,
    passes: int,
    seed: int,
    tile_type: str,
    colour_variation: float,
) -> Image.Image:
    """Render a pitched-roof tile repeat pattern."""
    sf = max(0.1, tile_scale / 14.0)
    rand = mulberry32(seed)
    geom = _TILE_GEOM.get(tile_type, _TILE_GEOM['plain'])

    # Pixel dimensions
    tw_min = max(4, round(geom['tw'][0] * sf))
    tw_max = max(tw_min, round(geom['tw'][1] * sf))
    th_px  = max(4, round(((geom['th'][0] + geom['th'][1]) / 2) * sf))
    lap_px = max(1, round(geom['lap'] * sf))
    mrg_px = max(1, round(geom['margin'] * sf))

    visible_h = max(2, th_px - lap_px)   # exposed tile strip height
    bond      = geom['bond']
    profile   = geom['profile']
    var_range = colour_variation * 40     # ±brightness units

    rgb_pal    = [_hex_to_rgb(c) for c in palette]
    col_light  = rgb_pal[0] if len(rgb_pal) > 0 else (160, 160, 160)
    col_mid    = rgb_pal[1] if len(rgb_pal) > 1 else col_light
    col_joint  = rgb_pal[3] if len(rgb_pal) > 3 else (rgb_pal[-1] if rgb_pal else (60, 55, 50))

    img  = Image.new('RGB', (width, height), col_mid)
    draw = ImageDraw.Draw(img)
    num_rows = math.ceil(height / max(1, visible_h)) + 2

    for row in range(num_rows):
        y_top    = row * visible_h
        y_vis_bt = y_top + visible_h
        x_offset = (row % 2) * (tw_min // 2) if bond == 'broken' else 0
        num_cols = math.ceil(width / max(1, tw_min - mrg_px)) + 3

        for col in range(num_cols):
            tw = tw_min + int(rand() * (tw_max - tw_min)) if tw_min != tw_max else tw_min
            x_l = col * (tw - mrg_px) - x_offset
            x_r = x_l + tw - mrg_px - 1
            if x_l >= width or x_r < 0:
                continue
            x_r = min(width - 1, x_r)
            if x_r < x_l:
                continue

            base_c = col_mid if rand() > 0.35 else col_light
            delta  = (rand() - 0.5) * 2 * var_range
            tile_c = _lighten_or_darken(base_c, delta)

            if profile == 'barrel':
                top_h = max(1, round(visible_h * 0.30))
                mid_h = max(1, round(visible_h * 0.40))
                bot_h = max(1, visible_h - top_h - mid_h)
                draw.rectangle([x_l, y_top,            x_r, y_top + top_h - 1],          fill=_lighten_or_darken(tile_c, +12))
                draw.rectangle([x_l, y_top + top_h,    x_r, y_top + top_h + mid_h - 1],  fill=tile_c)
                draw.rectangle([x_l, y_top + top_h + mid_h, x_r, y_vis_bt - 1],          fill=_lighten_or_darken(tile_c, -10))
                # Inter-tile trough at right edge
                tx = x_r + 1
                if mrg_px > 1 and tx < width:
                    draw.rectangle([tx, y_top, min(width - 1, tx + mrg_px - 1), y_vis_bt - 1],
                                   fill=_lighten_or_darken(col_joint, -20))
            elif profile == 'rib':
                draw.rectangle([x_l, y_top, x_r, y_vis_bt - 1], fill=tile_c)
                rib_x = x_l + max(1, mrg_px // 2)
                if rib_x <= x_r:
                    draw.line([(rib_x, y_top), (rib_x, y_vis_bt - 1)],
                              fill=_lighten_or_darken(tile_c, 15),
                              width=max(1, mrg_px // 3))
            else:
                draw.rectangle([x_l, y_top, x_r, y_vis_bt - 1], fill=tile_c)

        # Horizontal joint line at row boundary
        jy = y_vis_bt
        if 0 <= jy < height:
            draw.line([(0, jy), (width, jy)], fill=col_joint, width=max(1, round(sf * 0.8)))

        # Vertical joint lines — all profiles except pantile (passes ≥ 2)
        if profile != 'barrel' and passes >= 2:
            jw_v = max(1, round(sf * 0.5))
            for col in range(math.ceil(width / max(1, tw_min - mrg_px)) + 3):
                vx = col * (tw_min - mrg_px) - x_offset
                if 0 <= vx < width:
                    draw.line([(vx, y_top), (vx, y_vis_bt)], fill=col_joint, width=jw_v)

    return img


def _render_flat_roof(
    width: int, height: int,
    palette: list[str],
    zone_scale: int,
    density: int,
    passes: int,
    seed: int,
    zone_count: int,
    palette_name: str = '',
) -> Image.Image:
    """Render a flat-roof zone-based pattern."""
    pname = rand_flat = palette_name.lower()
    rand  = mulberry32(seed ^ 0xF0F0F0F0)
    sf    = zone_scale / 14.0

    # GRP: suppress zones — near-uniform surface
    if 'grp' in pname:
        eff_scale   = max(zone_scale, 120)
        zone_density = max(0, min(100, round((zone_count - 3) * 20)))
        img = _render_camo(width, height, palette, eff_scale, zone_density, 1, seed, False)
    else:
        zone_density = max(0, min(100, round((zone_count - 3) * 25)))
        img = _render_camo(width, height, palette, max(40, zone_scale), zone_density, 1, seed, False)

    draw    = ImageDraw.Draw(img)
    rgb_pal = [_hex_to_rgb(c) for c in palette]
    shadow_c = rgb_pal[3] if len(rgb_pal) > 3 else rgb_pal[-1]
    light_c  = rgb_pal[1] if len(rgb_pal) > 1 else rgb_pal[0]

    if 'bitumen' in pname:
        # Horizontal lap joint lines (600–900mm equivalent spacing)
        spacing = max(20, round(650 * sf * 0.04))
        y = spacing + int(rand() * spacing * 0.3)
        while y < height:
            draw.line([(0, y), (width, y)], fill=shadow_c, width=max(2, round(sf * 0.08)))
            y += max(10, int(spacing * (0.85 + rand() * 0.30)))

    elif 'epdm' in pname:
        # 2–3 sparse, near-invisible seam lines
        n_seams = 2 + int(rand() * 2)
        seam_c  = _lighten_or_darken(light_c, 12)
        for _ in range(n_seams):
            if rand() < 0.5:
                draw.line([(int(rand() * width), 0), (int(rand() * width), height)], fill=seam_c, width=2)
            else:
                draw.line([(0, int(rand() * height)), (width, int(rand() * height))], fill=seam_c, width=2)

    elif 'grp' in pname:
        # Faint vertical banding from fibreglass lay direction
        band_sp = max(30, round(180 * sf * 0.04))
        band_c  = _lighten_or_darken(light_c, 8)
        x = band_sp
        while x < width:
            draw.line([(x, 0), (x, height)], fill=band_c, width=1)
            x += band_sp

    return img


def _apply_shadow_layer(
    base: Image.Image,
    palette: list[str],
    sun_angle_deg: float,
    sun_elevation_deg: float,
    shadow_depth: float,
    seed: int,
    roof_type: str,
) -> Image.Image:
    """Apply trompe-l'œil parapet / ridge / equipment shadow layer."""
    if shadow_depth <= 0:
        return base

    width, height = base.size

    shadow_dir = (sun_angle_deg + 180) % 360
    elev       = max(5.0, min(85.0, sun_elevation_deg))
    shadow_lf  = 1.0 / math.tan(math.radians(elev))   # shadow length factor

    # Shadow direction components (compass bearing → image coords)
    sd_rad  = math.radians(shadow_dir)
    s_east  = math.sin(sd_rad)    # +ve → east / right
    s_south = -math.cos(sd_rad)   # +ve → south / down (SVG coords)

    rgb_pal     = [_hex_to_rgb(c) for c in palette]
    shadow_rgb  = rgb_pal[0] if rgb_pal else (30, 28, 20)
    alpha       = int(shadow_depth * 220)

    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw    = ImageDraw.Draw(overlay)
    fill    = (*shadow_rgb, alpha)

    # Parapet strip width: 2% of canvas ≈ 300mm on a 5m canvas × shadow_lf
    parapet_px    = max(6, round(width * 0.02))
    shadow_strip  = max(4, min(round(width * 0.15), round(parapet_px * shadow_lf)))

    if roof_type == 'pitched':
        # Ridge shadow band at top ~6% of canvas
        ridge_h = max(4, round(height * 0.06))
        draw.rectangle([0, 0, width, ridge_h], fill=(*shadow_rgb, int(alpha * 0.5)))

    else:  # flat
        if s_south < -0.2:  draw.rectangle([0, 0, width, shadow_strip], fill=fill)               # north/top
        if s_south > 0.2:   draw.rectangle([0, height - shadow_strip, width, height], fill=fill)  # south/bottom
        if s_east  < -0.2:  draw.rectangle([0, 0, shadow_strip, height], fill=fill)               # west/left
        if s_east  > 0.2:   draw.rectangle([width - shadow_strip, 0, width, height], fill=fill)   # east/right

        # Equipment shadows (HVAC units, plant boxes)
        rand_eq  = mulberry32(seed ^ 0x7F3A9C12)
        n_eq     = 3 + int(rand_eq() * 5)
        c_scale  = width / 2953.0   # normalise to reference 5 m canvas
        for _ in range(n_eq):
            bw = max(8,  round((15 + rand_eq() * 35) * c_scale))
            bh = max(6,  round((10 + rand_eq() * 25) * c_scale))
            bx = int(rand_eq() * max(1, width  - bw - shadow_strip * 2)) + shadow_strip
            by = int(rand_eq() * max(1, height - bh - shadow_strip * 2)) + shadow_strip
            # Shadow (drawn first — behind body)
            ddx = round(s_east  * bh * shadow_lf * 0.6)
            ddy = round(s_south * bh * shadow_lf * 0.6)
            draw.rectangle([bx + ddx, by + ddy, bx + ddx + bw, by + ddy + bh],
                           fill=(*shadow_rgb, int(alpha * 0.75)))
            # Equipment body (lighter)
            draw.rectangle([bx, by, bx + bw, by + bh],
                           fill=(*_lighten_or_darken(shadow_rgb, 50), int(alpha * 0.40)))

    # Composite via Multiply blend
    base_rgba = base.convert('RGBA')
    try:
        import blend_modes as bm
        base_arr = np.array(base_rgba,  dtype=np.float32)
        over_arr = np.array(overlay,    dtype=np.float32)
        result   = Image.fromarray(bm.multiply(base_arr, over_arr, 1.0).astype(np.uint8), 'RGBA')
    except Exception:
        result = Image.alpha_composite(base_rgba, overlay)

    return result.convert('RGB')


def _dark_biased_palette(palette: list[str]) -> list[str]:
    """Return palette sorted darkest-first with darkest colour repeated 3× (mirrors TS buildDarkBiasedPalette)."""
    def _lum(h: str) -> float:
        r, g, b = _hex_to_rgb(h)
        return 0.299 * r + 0.587 * g + 0.114 * b
    sorted_p = sorted(palette, key=_lum)
    return [sorted_p[0], sorted_p[0], sorted_p[0]] + sorted_p[1:]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def render_pattern(doc: dict, opts: dict) -> Image.Image:
    """
    Render a Pixelcamo document to a Pillow Image at the requested size/DPI.

    doc  : .pcm document dict (same shape as the JSON file)
    opts : { 'width': int, 'height': int, 'dpi': int, 'format': 'PNG'|'PDF' }
    """
    mode = doc.get('mode', 'camo')
    palette = doc.get('palette', ['#2d3a26', '#4a5239', '#6e7155', '#2a2622'])
    locked = doc.get('locked', [False] * len(palette))
    params = doc.get('params', {})
    pixel_scale = int(params.get('pixel_scale', 14))
    density = int(params.get('density', 58))
    passes = int(params.get('passes', 2))
    seed = int(params.get('seed', 42081))
    tile = bool(doc.get('tile', False))

    width = int(opts.get('width', 1920))
    height = int(opts.get('height', 1080))

    if mode == 'dazzle':
        img = _render_dazzle(width, height, palette, pixel_scale, density, passes, seed, tile)
    elif mode == 'blend':
        blend_cfg = doc.get('blend', {})
        opacity_frac = blend_cfg.get('opacity', 72) / 100.0
        blend_type = blend_cfg.get('type', 'normal').lower()
        blend_b = doc.get('blendB', {})
        b_mode = blend_b.get('mode', 'camo').lower()
        b_pixel_scale = int(blend_b.get('pixelScale', max(4, pixel_scale // 2)))
        b_density = int(blend_b.get('density', min(100, density + 20)))
        b_passes = int(blend_b.get('passes', passes))
        b_seed = (seed ^ 0xA5A5A5A5) & 0xFFFFFFFF
        layer_a = _render_camo(width, height, palette, pixel_scale, density, passes, seed, tile, locked)
        if b_mode == 'dazzle':
            layer_b = _render_dazzle(width, height, palette, b_pixel_scale, b_density, b_passes, b_seed, tile)
        else:
            layer_b = _render_camo(width, height, palette, b_pixel_scale, b_density, b_passes, b_seed, tile, locked)
        try:
            import blend_modes as bm
            mode_map = {
                'normal':     bm.normal,
                'multiply':   bm.multiply,
                'screen':     bm.screen,
                'overlay':    bm.overlay,
                'soft-light': bm.soft_light,
                'difference': bm.difference,
            }
            blend_fn = mode_map.get(blend_type, bm.normal)
            base_arr = np.array(layer_a.convert('RGBA'), dtype=np.float32)
            over_arr = np.array(layer_b.convert('RGBA'), dtype=np.float32)
            img = Image.fromarray(
                blend_fn(base_arr, over_arr, opacity_frac).astype(np.uint8), 'RGBA'
            ).convert('RGB')
        except Exception:
            img = Image.blend(layer_a, layer_b, opacity_frac)
    elif mode == 'aerial':
        aerial_cfg = doc.get('aerial', {})
        roof_type    = aerial_cfg.get('roofType', 'flat')
        sun_angle    = float(aerial_cfg.get('sunAngle', 225))
        sun_elev     = float(aerial_cfg.get('sunElevation', 35))
        shadow_depth = float(aerial_cfg.get('shadowDepth', 0.6))
        weathering   = float(aerial_cfg.get('weathering', 0.4))
        zone_count   = int(aerial_cfg.get('zoneCount', 3))
        palette_name = doc.get('paletteName', '')
        tile_type    = _palette_name_to_tile_type(palette_name)

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
                palette_name=palette_name,
            )

        img = _apply_shadow_layer(
            img, palette, sun_angle, sun_elev, shadow_depth, seed, roof_type
        )

        if passes >= 2 and weathering > 0:
            stain_col = palette[3] if len(palette) > 3 else palette[-1]
            streak_tex = {
                'type': 'streak',
                'opacity': int(weathering * 60),
                'density': int(weathering * 80),
                'length': max(20, round(width * 0.08)),
                'direction': 180.0,
                'waviness': 0.4,
                'weight': max(1, round(pixel_scale * 0.04)),
                'color': stain_col,
                'blend': 'multiply',
            }
            img = _apply_texture(img, streak_tex, seed ^ 0x5C3A1F00)

        # Apply texture overlay (standard, e.g. noise/grain) if set
        tex = doc.get('texture', {})
        if tex.get('type', 'none') != 'none':
            img = _apply_texture(img, tex, seed)

        return img

    else:
        img = _render_camo(width, height, palette, pixel_scale, density, passes, seed, tile, locked)

    # ── Micro disruptor (Camo / Blend modes only) ───────────────────────────
    micro_enabled = params.get('microEnabled', False)
    if micro_enabled and mode in ('camo', 'blend'):
        micro_scale = max(2, min(int(params.get('microScale', 6)), max(2, pixel_scale - 2)))
        micro_weight = int(params.get('microWeight', 35)) / 100.0
        micro_seed = (seed ^ 0xDEADBEEF) & 0xFFFFFFFF
        micro_img = _render_camo(
            width, height,
            _dark_biased_palette(palette),
            micro_scale, density, min(passes, 2), micro_seed, tile, locked,
        )
        # Multiply composite at micro_weight opacity
        macro_arr = np.array(img.convert('RGB')).astype(np.float32) / 255.0
        micro_arr = np.array(micro_img).astype(np.float32) / 255.0
        try:
            import blend_modes as bm
            macro_f32 = np.dstack([macro_arr, np.ones(macro_arr.shape[:2], dtype=np.float32)])
            micro_f32 = np.dstack([micro_arr, np.ones(micro_arr.shape[:2], dtype=np.float32) * micro_weight])
            blended = bm.multiply(macro_f32, micro_f32, micro_weight)[:, :, :3]
        except Exception:
            # Simple fallback: macro * (1 - w) + macro*micro * w = multiply composite
            blended = macro_arr * (1 - micro_weight) + (macro_arr * micro_arr) * micro_weight
        img = Image.fromarray((np.clip(blended, 0, 1) * 255).astype(np.uint8))

    # Apply texture overlay
    tex = doc.get('texture', {})
    if tex.get('type', 'none') != 'none':
        img = _apply_texture(img, tex, seed)

    return img
