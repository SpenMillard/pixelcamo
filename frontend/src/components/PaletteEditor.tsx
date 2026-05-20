import { Icon } from '../icons';

const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1"/>
    <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1"
          strokeLinecap="round"/>
  </svg>
);

const LockOpenIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1"
          opacity="0.4"/>
    <path d="M3.5 4.5V3a1.5 1.5 0 013 0" stroke="currentColor" strokeWidth="1"
          strokeLinecap="round" opacity="0.4"/>
  </svg>
);

interface PaletteEditorProps {
  colors: string[];
  selected: number;
  locked: boolean[];
  onSelect: (i: number) => void;
  onChange: (i: number, c: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onToggleLock: (i: number) => void;
  onSave: () => void;
  onLoad: () => void;
}

export function PaletteEditor({ colors, selected, locked, onSelect, onChange, onAdd, onRemove, onToggleLock, onSave, onLoad }: PaletteEditorProps) {
  return (
    <div>
      <div className="palette">
        {colors.map((c, i) => (
          <div
            key={i}
            className={`swatch${selected === i ? ' selected' : ''}${locked[i] ? ' locked' : ''}`}
            style={{ background: c }}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onRemove(i)}
            title={c}
          >
            <button
              className="lock-btn"
              onClick={(e) => { e.stopPropagation(); onToggleLock(i); }}
              title={locked[i] ? 'Unlock swatch' : 'Lock swatch'}
            >
              {locked[i] ? <LockIcon /> : <LockOpenIcon />}
            </button>
            <span className="hex">{c.toUpperCase().slice(1)}</span>
          </div>
        ))}
        {colors.length < 8 && (
          <div className="swatch add" onClick={onAdd} title="Add colour">
            {Icon.plus}
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="label" style={{ flexBasis: 60 }}>Hex</span>
        <div className="picker-row" style={{ flex: 1 }}>
          <input
            type="color"
            className="color-chip"
            value={colors[selected] || '#000000'}
            onChange={(e) => onChange(selected, e.target.value)}
            style={{ background: colors[selected] }}
          />
          <input
            type="text"
            className="input mono"
            value={(colors[selected] || '').toUpperCase()}
            onChange={(e) => {
              if (/^#[0-9a-f]{0,6}$/i.test(e.target.value)) onChange(selected, e.target.value);
            }}
          />
        </div>
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn ghost tiny" onClick={onSave}>Save palette</button>
        <button className="btn ghost tiny" style={{ marginLeft: 'auto' }} onClick={onLoad}>Load…</button>
      </div>
    </div>
  );
}
