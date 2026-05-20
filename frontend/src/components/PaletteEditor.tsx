import { Icon } from '../icons';

interface PaletteEditorProps {
  colors: string[];
  selected: number;
  onSelect: (i: number) => void;
  onChange: (i: number, c: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onSave: () => void;
  onLoad: () => void;
}

export function PaletteEditor({ colors, selected, onSelect, onChange, onAdd, onRemove, onSave, onLoad }: PaletteEditorProps) {
  return (
    <div>
      <div className="palette">
        {colors.map((c, i) => (
          <div
            key={i}
            className={`swatch${selected === i ? ' selected' : ''}`}
            style={{ background: c }}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onRemove(i)}
            title={c}
          >
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
