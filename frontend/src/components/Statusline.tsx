interface StatuslineProps {
  status: 'Idle' | 'Rendering…' | 'Error';
  genMs: number;
  cols: number;
  rows: number;
  rectCount: number;
}

export function Statusline({ status, genMs, cols, rows, rectCount }: StatuslineProps) {
  const statusColor = status === 'Error' ? 'var(--bad)' : status === 'Rendering…' ? 'var(--warn)' : 'var(--good)';
  return (
    <div className="statusline">
      <div className="item">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <strong>{status}</strong>
        <span className="sep">·</span>
        <span>generated in {genMs}ms</span>
      </div>
      <div className="item">
        <span>Tiles</span>
        <strong>{cols} × {rows}</strong>
        <span className="sep">·</span>
        <strong>{(cols * rows).toLocaleString()}</strong>
        <span>cells</span>
      </div>
      <div className="item">
        <span>Render</span>
        <strong>{rectCount}</strong>
        <span>rects</span>
      </div>
      <div style={{ marginLeft: 'auto' }} className="item">
        <span>⌘R</span><span>regen</span>
        <span className="sep">·</span>
        <span>⌘E</span><span>export</span>
        <span className="sep">·</span>
        <span>⌘T</span><span>tile</span>
        <span className="sep">·</span>
        <span>space</span><span>seed</span>
        <span className="sep">·</span>
        <span>V</span><span>vary</span>
      </div>
    </div>
  );
}
