// ─────────────────────────────────────────────────────────────
// Pixelcamo — pattern generator
// Deterministic Voronoi/blocky camo from seed + palette + params
// Exports to window: generateCamo(opts)
// ─────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a 2D grid of palette indices using nearest-seed clustering.
// `pixelScale` controls cell size, `density` controls cluster count,
// `passes` overlays multiple generations for layered camo.
function generateCamo({ width, height, palette, pixelScale, density, passes, seed }) {
  // pixelScale: 4..40 → cell size in px
  const cell = Math.max(4, Math.min(60, Math.round(pixelScale)));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);

  // density 0..100 → number of cluster seeds
  const clusterCount = Math.max(3, Math.round(6 + (density / 100) * 40));

  // base grid filled with palette[0]
  const grid = new Array(rows);
  for (let r = 0; r < rows; r++) grid[r] = new Array(cols).fill(0);

  const rand = mulberry32(seed);

  for (let p = 0; p < passes; p++) {
    // pick cluster centers
    const points = [];
    for (let i = 0; i < clusterCount; i++) {
      points.push({
        x: rand() * cols,
        y: rand() * rows,
        c: Math.floor(rand() * palette.length),
      });
    }

    // nearest-neighbour assign, with a slight noise warp
    const noiseScale = 0.18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // warp coords for organic edges
        const wx = c + (rand() - 0.5) * 2 * noiseScale * cell;
        const wy = r + (rand() - 0.5) * 2 * noiseScale * cell;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < points.length; i++) {
          const dx = points[i].x - wx, dy = points[i].y - wy;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = i; }
        }
        // on subsequent passes, overlay sparingly
        if (p === 0 || rand() < 0.45) {
          grid[r][c] = points[best].c;
        }
      }
    }
  }

  return { grid, cell, cols, rows };
}

// Render a camo grid as SVG <rect> string array
function camoToRects({ grid, cell, cols, rows, palette }) {
  // Run-length encode horizontally to reduce rect count
  const rects = [];
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    let runColor = grid[r][0];
    for (let c = 1; c <= cols; c++) {
      const cur = c < cols ? grid[r][c] : -1;
      if (cur !== runColor) {
        rects.push({
          x: runStart * cell,
          y: r * cell,
          w: (c - runStart) * cell,
          h: cell,
          fill: palette[runColor % palette.length],
        });
        runStart = c;
        runColor = cur;
      }
    }
  }
  return rects;
}

window.generateCamo = generateCamo;
window.camoToRects = camoToRects;
window.mulberry32 = mulberry32;
