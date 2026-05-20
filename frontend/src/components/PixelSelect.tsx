// Custom select: styled div overlaid with an invisible native <select>
// for native OS dropdown behaviour with the handoff visual appearance.
interface PixelSelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}

export function PixelSelect({ value, options, onChange, style }: PixelSelectProps) {
  return (
    <div className="select" style={{ position: 'relative', ...style }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          fontSize: 'inherit',
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <span style={{ pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}
