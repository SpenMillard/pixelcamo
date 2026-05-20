// ─────────────────────────────────────────────────────────────
// Pixelcamo — pattern generator (TypeScript port of camo.js)
// ─────────────────────────────────────────────────────────────

export interface CamoOpts {
  width: number;
  height: number;
  palette: string[];
  pixelScale: number;
  density: number;
  passes: number;
  seed: number;
  tile?: boolean;
}

export interface CamoResult {
  grid: number[][];
  cell: number;
  cols: number;
  rows: number;
}

export interface CamoRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface DazzleShape {
  pts: [number, number][];
  fill: string;
}

// Mulberry32 PRNG — verbatim port for seed parity
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Camo mode ─────────────────────────────────────────────────

export function generateCamo({ width, height, palette, pixelScale, density, passes, seed, tile }: CamoOpts): CamoResult {
  const cell = Math.max(4, Math.min(60, Math.round(pixelScale)));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const clusterCount = Math.max(3, Math.round(6 + (density / 100) * 40));

  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(0));

  const rand = mulberry32(seed);

  for (let p = 0; p < passes; p++) {
    const points: { x: number; y: number; c: number }[] = [];
    for (let i = 0; i < clusterCount; i++) {
      points.push({ x: rand() * cols, y: rand() * rows, c: Math.floor(rand() * palette.length) });
    }

    const noiseScale = 0.18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c + (rand() - 0.5) * 2 * noiseScale * cell;
        const wy = r + (rand() - 0.5) * 2 * noiseScale * cell;
        let best = 0, bestD = Infinity;

        for (let i = 0; i < points.length; i++) {
          let dx = points[i].x - wx;
          let dy = points[i].y - wy;
          if (tile) {
            // Toroidal distance
            if (dx > cols / 2) dx -= cols;
            else if (dx < -cols / 2) dx += cols;
            if (dy > rows / 2) dy -= rows;
            else if (dy < -rows / 2) dy += rows;
          }
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = i; }
        }

        if (p === 0 || rand() < 0.45) {
          grid[r][c] = points[best].c;
        }
      }
    }
  }

  return { grid, cell, cols, rows };
}

export function camoToRects({ grid, cell, cols, rows, palette }: CamoResult & { palette: string[] }): CamoRect[] {
  const rects: CamoRect[] = [];
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    let runColor = grid[r][0];
    for (let c = 1; c <= cols; c++) {
      const cur = c < cols ? grid[r][c] : -1;
      if (cur !== runColor) {
        rects.push({
          x: runStart * cell, y: r * cell,
          w: (c - runStart) * cell, h: cell,
          fill: palette[runColor % palette.length],
        });
        runStart = c;
        runColor = cur;
      }
    }
  }
  return rects;
}

// ── Dazzle mode (CV Dazzle) ────────────────────────────────────

function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

function makePolygon(
  cx: number, cy: number,
  shape: 'triangle' | 'parallelogram' | 'wedge' | 'slash',
  size: number, angleDeg: number,
): [number, number][] {
  const s = size;
  let pts: [number, number][];
  if (shape === 'triangle') {
    pts = [[cx, cy - s], [cx - s, cy + s * 0.6], [cx + s, cy + s * 0.6]];
  } else if (shape === 'parallelogram') {
    pts = [[cx - s, cy - s * 0.4], [cx + s * 0.4, cy - s * 0.4], [cx + s, cy + s * 0.4], [cx - s * 0.4, cy + s * 0.4]];
  } else if (shape === 'wedge') {
    pts = [[cx - s * 1.2, cy], [cx + s * 0.2, cy - s * 0.9], [cx + s * 1.2, cy], [cx + s * 0.2, cy + s * 0.3]];
  } else {
    // slash
    const w = s * 0.22;
    pts = [[cx - s, cy - w], [cx + s, cy - w], [cx + s, cy + w], [cx - s, cy + w]];
  }
  return pts.map(([px, py]) => rotatePoint(px, py, cx, cy, angleDeg));
}

// Hex colour to [r, g, b] luminance sum helper
function hexLum(hex: string): number {
  const h = hex.replace('#', '');
  return parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4, 6), 16);
}

const SHAPES = ['triangle', 'parallelogram', 'wedge', 'slash'] as const;

export function generateDazzle({ width, height, palette, pixelScale, density, passes, seed }: CamoOpts): DazzleShape[] {
  const rand = mulberry32(seed);
  const shapes: DazzleShape[] = [];

  // Determine base (lightest) and dark colours
  const sorted = [...palette].sort((a, b) => hexLum(b) - hexLum(a));
  const baseFill = sorted[0];
  const darkColours = sorted.slice(1).length > 0 ? sorted.slice(1) : [sorted[0]];

  const cx = width / 2;
  const cy = height / 2;
  const scaleMul = 0.2 + (pixelScale / 40) * 4.8; // 0.2–5.0
  const densityMul = 0.5 + (density / 100) * 1.5;  // 0.5–2.0

  // Fill background with base colour (represented as first rect)
  shapes.push({ pts: [[0, 0], [width, 0], [width, height], [0, height]], fill: baseFill });

  // ── Pass 1: large asymmetric background shapes ─────────────
  const n1 = Math.round((6 + density / 100 * 4) * densityMul);
  for (let i = 0; i < n1; i++) {
    const size = (0.18 + rand() * 0.22) * width * scaleMul * 0.4;
    const angle = (rand() - 0.5) * 130; // ±65°
    const bias = rand() > 0.5 ? 1 : -1;
    const x = cx + bias * (0.05 + rand() * 0.30) * width;
    const y = (0.10 + rand() * 0.80) * height;
    const shape = SHAPES[Math.floor(rand() * 3)] as 'triangle' | 'parallelogram' | 'wedge'; // no slash in pass 1
    const fill = darkColours[Math.floor(rand() * darkColours.length)];
    shapes.push({ pts: makePolygon(x, y, shape, size, angle), fill });
  }

  if (passes < 2) return shapes;

  // ── Pass 2: diagonal slash bars ───────────────────────────
  const n2 = Math.round((4 + rand() * 3) * densityMul);
  for (let i = 0; i < n2; i++) {
    const size = (0.15 + rand() * 0.20) * width * scaleMul * 0.35;
    // angle constrained to ±25°–55°
    const sign = rand() > 0.5 ? 1 : -1;
    const angle = sign * (25 + rand() * 30);
    const x = rand() * width;
    const y = height * (0.2 + rand() * 0.6); // concentrated in vertical centre
    const fill = palette[Math.floor(rand() * Math.min(2, palette.length))];
    shapes.push({ pts: makePolygon(x, y, 'slash', size, angle), fill });
  }

  if (passes < 3) return shapes;

  // ── Pass 3a: medium detail shapes ─────────────────────────
  const n3 = Math.round((10 + rand() * 8) * densityMul);
  for (let i = 0; i < n3; i++) {
    const size = (0.04 + rand() * 0.10) * width * scaleMul * 0.4;
    const angle = (rand() - 0.5) * 180;
    const x = rand() * width;
    const y = rand() * height;
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];
    const fill = palette[Math.floor(rand() * palette.length)];
    shapes.push({ pts: makePolygon(x, y, shape, size, angle), fill });
  }

  // ── Pass 3b: fine pixel noise ──────────────────────────────
  const ns = Math.max(1, Math.round(3 * pixelScale * 0.5));
  const noiseCount = Math.round((width * height * 0.012 * density) / (ns * ns));
  const lum = palette.map(hexLum);
  const darkest = palette[lum.indexOf(Math.min(...lum))];
  const lightest = palette[lum.indexOf(Math.max(...lum))];
  for (let i = 0; i < noiseCount; i++) {
    const nx = Math.floor(rand() * (width / ns)) * ns;
    const ny = Math.floor(rand() * (height / ns)) * ns;
    const fill = i % 2 === 0 ? darkest : lightest;
    shapes.push({
      pts: [[nx, ny], [nx + ns, ny], [nx + ns, ny + ns], [nx, ny + ns]],
      fill,
    });
  }

  return shapes;
}
