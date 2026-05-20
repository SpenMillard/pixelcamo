import type { CamoRect } from '../lib/camo';

interface TilePreviewProps {
  rects: CamoRect[];
  microRects?: CamoRect[];
  microWeight?: number;
  canvasBox: { w: number; h: number };
  textureOverlay: React.ReactNode;
}

export function TilePreview({ rects, microRects, microWeight, canvasBox, textureOverlay }: TilePreviewProps) {
  const W = canvasBox.w;
  const H = canvasBox.h;

  const cellContent = (
    <>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
      {microRects && microRects.length > 0 && (
        <g opacity={(microWeight ?? 35) / 100} style={{ mixBlendMode: 'multiply' }}>
          {microRects.map((r, i) => (
            <rect key={`u${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
          ))}
        </g>
      )}
      {textureOverlay}
    </>
  );

  return (
    <svg
      className="camo-svg"
      viewBox={`0 0 ${W * 3} ${H * 3}`}
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
    >
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => {
          const isCentre = row === 1 && col === 1;
          return (
            <g
              key={`${row}-${col}`}
              transform={`translate(${col * W}, ${row * H})`}
              opacity={isCentre ? 1 : 0.85}
            >
              {cellContent}
              {isCentre && (
                <rect x={0} y={0} width={W} height={H}
                  fill="none"
                  stroke="rgba(232,149,42,0.5)"
                  strokeWidth="2" />
              )}
            </g>
          );
        })
      )}
      {/* Seam grid lines */}
      <line x1={W}   y1={0}    x2={W}   y2={H * 3} stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6" />
      <line x1={W*2} y1={0}    x2={W*2} y2={H * 3} stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6" />
      <line x1={0}   y1={H}    x2={W*3} y2={H}     stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6" />
      <line x1={0}   y1={H*2}  x2={W*3} y2={H*2}   stroke="rgba(232,149,42,0.2)" strokeWidth="1" strokeDasharray="4 6" />
    </svg>
  );
}
