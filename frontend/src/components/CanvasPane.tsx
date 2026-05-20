import { useRef, useEffect, useState, useMemo } from 'react';
import { Icon } from '../icons';
import { SIZE_PRESETS } from '../data/constants';
import { mulberry32 } from '../lib/camo';
import type { CamoRect, DazzleShape } from '../lib/camo';
import type { Mode, TextureParams, TextureType } from '../types';
import { VariationsGrid, VariationsIcon } from './VariationsGrid';

interface CanvasPaneProps {
  mode: Mode;
  preset: string;
  paletteName: string;
  passes: number;
  seed: number;
  tile: boolean; setTile: (v: boolean) => void;
  zoom: number; setZoom: (v: number) => void;
  rects: CamoRect[];
  blendRects: CamoRect[];
  blendDazzleShapes: DazzleShape[];
  blendBMode: string;
  blendOpacity: number;
  blendType: string;
  dazzleShapes: DazzleShape[];
  aerialRects: CamoRect[];
  sunAngle: number;
  sunElevation: number;
  shadowDepth: number; // 0–100
  textureType: TextureType;
  tex: TextureParams;
  palette: string[];
  dpi: number;
  exportSize: string;
  exportW: number;
  exportH: number;
  pixelScale: number;
  density: number;
  presetModified: boolean;
  locked?: boolean[];
  variationsOpen: boolean;
  onToggleVariations: () => void;
  onCommitVariation: (seed: number) => void;
  onRegenerateNewSeed: () => void;
  onExport: () => void;
  onBoxChange: (w: number, h: number) => void;
}

export function CanvasPane({
  mode, preset, paletteName, passes, seed, tile, setTile, zoom, setZoom,
  rects, blendRects, blendDazzleShapes, blendBMode, blendOpacity, blendType,
  dazzleShapes, aerialRects, sunAngle, sunElevation, shadowDepth,
  textureType, tex, palette, locked, pixelScale, density,
  dpi, exportSize, exportW, exportH, presetModified,
  variationsOpen, onToggleVariations, onCommitVariation,
  onRegenerateNewSeed, onExport, onBoxChange,
}: CanvasPaneProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [canvasBox, setCanvasBox] = useState({ w: 640, h: 480 });

  useEffect(() => {
    if (!canvasWrapRef.current) return;
    const el = canvasWrapRef.current;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const pad = 60;
      const aw = rect.width - pad * 2;
      const ah = rect.height - pad * 2;
      const aspect = Math.max(0.25, exportW / exportH); // clamp to sane range
      let w = aw, h = aw / aspect;
      if (h > ah) { h = ah; w = ah * aspect; }
      const nw = Math.max(120, Math.round(w));
      const nh = Math.max(90, Math.round(h));
      setCanvasBox({ w: nw, h: nh });
      onBoxChange(nw, nh);
    };
    compute(); // rerun immediately when export dims change
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [exportW, exportH, onBoxChange]);

  // Texture overlay SVG
  const textureOverlay = useMemo(() => {
    if (textureType === 'None') return null;
    const { w, h } = canvasBox;
    const opacity = tex.opacity / 100;

    if (textureType === 'Stipple') {
      const dots: React.ReactElement[] = [];
      const r = mulberry32(seed + 13);
      const count = Math.floor((w * h) / (200 - Math.min(tex.density, 195)));
      for (let i = 0; i < count; i++) {
        dots.push(<circle key={i} cx={r() * w} cy={r() * h} r={tex.scale * 0.4} fill={tex.color} />);
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>{dots}</g>;
    }

    if (textureType === 'Hatch') {
      const lines: React.ReactElement[] = [];
      const spread = tex.spread;
      const angle = tex.angle * Math.PI / 180;
      const diag = Math.hypot(w, h);
      const steps = Math.ceil(diag / spread);
      for (let i = -steps; i < steps; i++) {
        const offset = i * spread;
        const x1 = w/2 + Math.cos(angle) * -diag + Math.sin(angle) * offset;
        const y1 = h/2 + Math.sin(angle) * -diag - Math.cos(angle) * offset;
        const x2 = w/2 + Math.cos(angle) *  diag + Math.sin(angle) * offset;
        const y2 = h/2 + Math.sin(angle) *  diag - Math.cos(angle) * offset;
        lines.push(<line key={'h'+i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={tex.color} strokeWidth={tex.scale * 0.4} />);
      }
      if (tex.cross) {
        const a2 = angle + Math.PI / 2;
        for (let i = -steps; i < steps; i++) {
          const offset = i * spread;
          const x1 = w/2 + Math.cos(a2) * -diag + Math.sin(a2) * offset;
          const y1 = h/2 + Math.sin(a2) * -diag - Math.cos(a2) * offset;
          const x2 = w/2 + Math.cos(a2) *  diag + Math.sin(a2) * offset;
          const y2 = h/2 + Math.sin(a2) *  diag - Math.cos(a2) * offset;
          lines.push(<line key={'x'+i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={tex.color} strokeWidth={tex.scale * 0.4} />);
        }
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>{lines}</g>;
    }

    if (textureType === 'Scratch') {
      const r = mulberry32(seed + 99);
      const count = Math.floor(canvasBox.w / tex.spread);
      const strokes: React.ReactElement[] = [];
      for (let i = 0; i < count; i++) {
        const cx = r() * w, cy = r() * h;
        const len = tex.length * (0.5 + r());
        const ang = r() * Math.PI * 2;
        strokes.push(<line key={i}
          x1={cx} y1={cy}
          x2={cx + Math.cos(ang) * len} y2={cy + Math.sin(ang) * len}
          stroke={tex.color} strokeWidth={tex.scale * 0.3} strokeLinecap="round" />);
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>{strokes}</g>;
    }

    // ── Grain — SVG feTurbulence filter ──────────────────────────
    if (textureType === 'Grain') {
      const filterId = `grain-${seed}-${tex.scale}-${tex.intensity}`;
      const freq = 1 / (Math.max(1, tex.scale) * 8);
      return (
        <>
          <defs>
            <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={1} seed={seed % 65535} stitchTiles="stitch" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
              <feComponentTransfer in="grey" result="masked">
                <feFuncA type="linear" slope={tex.intensity * 2.5} intercept={-0.5} />
              </feComponentTransfer>
              <feFlood floodColor={tex.color} result="col" />
              <feComposite in="col" in2="masked" operator="in" />
            </filter>
          </defs>
          <rect x={0} y={0} width={w} height={h}
            filter={`url(#${filterId})`}
            opacity={opacity}
            style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}
          />
        </>
      );
    }

    // ── Hex mesh ─────────────────────────────────────────────────
    if (textureType === 'Hex') {
      const elems: React.ReactElement[] = [];
      if (tex.square) {
        const step = Math.max(10, tex.cellSize);
        for (let x = 0; x <= w + step; x += step)
          elems.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={tex.color} strokeWidth={tex.lineWeight} />);
        for (let y = 0; y <= h + step; y += step)
          elems.push(<line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke={tex.color} strokeWidth={tex.lineWeight} />);
      } else {
        // Flat-topped hexagons: cell_size = full diameter (2r)
        const r = Math.max(5, tex.cellSize / 2);
        const hexH = r * Math.sqrt(3);
        const colCount = Math.ceil(w / (r * 3)) + 2;
        const rowCount = Math.ceil(h / hexH) + 2;
        for (let col = -1; col < colCount; col++) {
          for (let row = -1; row < rowCount; row++) {
            const cx = col * r * 3;
            const cy = row * hexH * 2 + (col % 2) * hexH;
            const pts = Array.from({ length: 6 }, (_, i) => {
              const a = i * 60 * (Math.PI / 180);
              return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
            }).join(' ');
            elems.push(<polygon key={`${col},${row}`} points={pts} fill="none"
              stroke={tex.color} strokeWidth={tex.lineWeight} />);
          }
        }
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>{elems}</g>;
    }

    // ── Erosion streaks ───────────────────────────────────────────
    if (textureType === 'Streak') {
      const r2 = mulberry32(seed + 4000);
      const n = Math.max(1, Math.floor(w * h * (tex.density / 100) * 3 * 0.001));
      const baseAngle = tex.direction * (Math.PI / 180);
      const strokes: React.ReactElement[] = [];
      for (let i = 0; i < n; i++) {
        let sx = r2() * w;
        let sy = r2() * h;
        const len = tex.length * (0.4 + r2() * 1.2);
        const steps = Math.max(2, Math.floor(len / 8));
        const segLen = len / steps;
        let angle = baseAngle;
        let d = `M${sx.toFixed(1)},${sy.toFixed(1)}`;
        for (let s = 0; s < steps; s++) {
          angle += (r2() - 0.5) * tex.waviness * 0.4;
          sx += Math.cos(angle) * segLen;
          sy += Math.sin(angle) * segLen;
          d += ` L${sx.toFixed(1)},${sy.toFixed(1)}`;
        }
        strokes.push(<path key={i} d={d} stroke={tex.color} strokeWidth={tex.weight}
          fill="none" strokeLinecap="round" />);
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>{strokes}</g>;
    }

    return null;
  }, [textureType, tex, canvasBox.w, canvasBox.h, seed]);

  const sizePreset = SIZE_PRESETS[exportSize] ?? SIZE_PRESETS['1K Square'];
  const displayW = sizePreset.w;
  const displayH = sizePreset.h;

  const scaledW = canvasBox.w * (zoom / 100);
  const scaledH = canvasBox.h * (zoom / 100);

  return (
    <main className="canvas-pane">
      {/* ── Toolbar ───────────────────────────── */}
      <div className="canvas-toolbar">
        <div className="toolbar-left">
          <span className="mode-badge">
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            {mode}
          </span>
          <span className="crumb">
            <span className="doc">{preset}{presetModified ? '*' : ''}</span>
            <span className="crumb-secondary">
              <span className="sep">›</span>
              <span>{paletteName}</span>
              <span className="sep">›</span>
              <span>{passes}-pass</span>
            </span>
          </span>
        </div>
        <div className="toolbar-right">
          <span className="value mono toolbar-seed" style={{ color: 'var(--accent)' }}>
            #{seed.toString().padStart(6, '0')}
          </span>
          <div className="toolbar-sep" />
          <button className="btn ghost toolbar-tile" onClick={() => setTile(!tile)} title="Toggle tile (⌘T)">
            <span style={{ color: tile ? 'var(--accent)' : 'var(--fg-3)' }}>{Icon.tile}</span>
            <span className="btn-label">Tile</span>
            <span className="mono" style={{ color: tile ? 'var(--accent)' : 'var(--fg-3)', fontSize: 10 }}>
              {tile ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            className={`btn ghost toolbar-primary${variationsOpen ? ' active-ghost' : ''}`}
            onClick={onToggleVariations}
            title="Variations grid (V)"
            disabled={mode === 'Dazzle'}
            style={{ opacity: mode === 'Dazzle' ? 0.35 : 1 }}
          >
            <VariationsIcon />
            <span className="btn-label">Vary</span>
          </button>
          <button className="btn toolbar-primary" onClick={onExport} title="Export (⌘E)">
            {Icon.download} <span className="btn-label">Export</span>
          </button>
          <button className="btn accent toolbar-primary" onClick={onRegenerateNewSeed} title="Regenerate (⌘R)">
            {Icon.refresh} <span className="btn-label">Regenerate</span>
          </button>
        </div>
      </div>

      {/* ── Canvas area ───────────────────────── */}
      <div
        className="canvas-area"
        ref={canvasWrapRef}
        onClick={(e) => { if (e.target === e.currentTarget) onRegenerateNewSeed(); }}
        style={{ position: 'relative' }}
      >
        {variationsOpen && (
          <VariationsGrid
            seed={seed}
            palette={palette}
            locked={locked}
            pixelScale={pixelScale}
            density={density}
            passes={passes}
            onCommit={onCommitVariation}
            onDismiss={onToggleVariations}
          />
        )}
        <div
          className="canvas-frame"
          style={{ width: scaledW, height: scaledH }}
          onClick={onRegenerateNewSeed}
        >
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />

          <span className="canvas-dim">
            {displayW} × {displayH}px · {dpi} dpi
          </span>
          <span className="canvas-dim right">
            {paletteName.toUpperCase()} · {palette.length}c
          </span>

          <svg
            className="camo-svg"
            viewBox={`0 0 ${canvasBox.w} ${canvasBox.h}`}
            width="100%" height="100%"
            preserveAspectRatio="xMidYMid slice"
            shapeRendering="crispEdges"
          >
            {mode === 'Dazzle'
              ? dazzleShapes.map((s, i) => (
                  <polygon key={i} points={s.pts.map(([x, y]) => `${x},${y}`).join(' ')} fill={s.fill} />
                ))
              : mode === 'Blend'
              ? <>
                  <g>{rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />)}</g>
                  <g opacity={blendOpacity / 100}
                     style={{ mixBlendMode: blendType.toLowerCase() as React.CSSProperties['mixBlendMode'] }}>
                    {blendBMode === 'Dazzle'
                      ? blendDazzleShapes.map((s, i) => <polygon key={i} points={s.pts.map(([x, y]) => `${x},${y}`).join(' ')} fill={s.fill} />)
                      : blendRects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />)
                    }
                  </g>
                </>
              : mode === 'Aerial'
              ? (() => {
                  // Base tile / zone pattern
                  const shadowDir = (sunAngle + 180) % 360;
                  const sdRad = (shadowDir * Math.PI) / 180;
                  const sx = Math.sin(sdRad);   // +ve = east/right
                  const sy = -Math.cos(sdRad);  // +ve = south/down (SVG)
                  const elevRad = (sunElevation * Math.PI) / 180;
                  const lf = 1 / Math.tan(elevRad);
                  const sw = Math.max(4, Math.round(canvasBox.w * 0.04 * lf));
                  const opacity = (shadowDepth / 100) * 0.72;
                  const { w, h } = canvasBox;
                  return (
                    <>
                      <g>
                        {aerialRects.map((r, i) =>
                          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                        )}
                      </g>
                      {/* Parapet / edge shadow strips */}
                      <g>
                        {sy < -0.2 && <rect x={0} y={0} width={w} height={sw} fill="#1e1c14" opacity={opacity} />}
                        {sy > 0.2  && <rect x={0} y={h - sw} width={w} height={sw} fill="#1e1c14" opacity={opacity} />}
                        {sx < -0.2 && <rect x={0} y={0} width={sw} height={h} fill="#1e1c14" opacity={opacity} />}
                        {sx > 0.2  && <rect x={w - sw} y={0} width={sw} height={h} fill="#1e1c14" opacity={opacity} />}
                      </g>
                    </>
                  );
                })()
              : rects.map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                ))
            }
            {textureOverlay}
            {tile && (
              <rect x={1} y={1} width={canvasBox.w - 2} height={canvasBox.h - 2}
                fill="none" stroke="rgba(196,105,28,0.5)" strokeWidth={2} strokeDasharray="10 7" />
            )}
          </svg>
        </div>

        <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setZoom(Math.max(25, zoom - 25))}>−</button>
          <span className="zoom-readout">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 25))}>+</button>
          <div style={{ width: 0.5, height: 16, background: 'var(--line-3)', margin: '0 2px' }} />
          <button onClick={() => setZoom(100)} title="Fit">⤢</button>
        </div>
      </div>

    </main>
  );
}
