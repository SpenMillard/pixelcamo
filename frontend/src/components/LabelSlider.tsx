interface LabelSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  labelWidth?: number;
}

export function LabelSlider({ label, min, max, step, value, onChange, suffix = '', labelWidth = 70 }: LabelSliderProps) {
  return (
    <div className="row">
      <span className="label" style={{ flexBasis: labelWidth }}>{label}</span>
      <div className="control slider">
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <span className="value-right">{value}{suffix}</span>
    </div>
  );
}
