import { useMemo } from 'react';
import { generateCamo, camoToRects } from '../lib/camo';

const SEEDS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const THUMB_W = 200;
const THUMB_H = 150;

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

export { VariationsIcon };

interface VariationsGridProps {
  seed: number;
  palette: string[];
  locked?: boolean[];
  pixelScale: number;
  density: number;
  passes: number;
  onCommit: (seed: number) => void;
  onDismiss: () => void;
}

export function VariationsGrid({ seed, palette, locked, pixelScale, density, passes, onCommit, onDismiss }: VariationsGridProps) {
  const variants = useMemo(() =>
    SEEDS.map(offset => {
      const s = ((seed + offset) % 999999 + 999999) % 999999;
      const pattern = generateCamo({
        width: THUMB_W, height: THUMB_H,
        palette, pixelScale, density,
        passes: Math.min(passes, 2),
        seed: s,
        locked,
      });
      return { seed: s, rects: camoToRects({ ...pattern, palette }), offset };
    }),
    [seed, palette, pixelScale, density, passes, locked]
  );

  return (
    <div className="variations-grid">
      <div className="variations-header">
        <span className="label">9 variants · click to commit · V or Esc to dismiss</span>
      </div>
      <div className="variations-cells">
        {variants.map(({ seed: s, rects, offset }, i) => (
          <div
            key={i}
            className={`variation-cell${offset === 0 ? ' current' : ''}`}
            onClick={() => onCommit(s)}
            title={`Seed #${String(s).padStart(6, '0')}`}
          >
            <svg
              viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
              width="100%" height="100%"
              shapeRendering="crispEdges"
            >
              {rects.map((r, j) => (
                <rect key={j} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
              ))}
            </svg>
            <span className="variation-seed">
              {offset === 0 ? 'current' : `${offset > 0 ? '+' : ''}${offset}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
