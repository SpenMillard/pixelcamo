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
            >
              {cellContent}
              {isCentre && (
                <rect x={0} y={0} width={W} height={H}
                  fill="none"
                  stroke="rgba(232,149,42,0.6)"
                  strokeWidth="1.5" />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}
