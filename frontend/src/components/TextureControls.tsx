import { LabelSlider } from './LabelSlider';
import { PixelSelect } from './PixelSelect';
import { BLEND_TYPES } from '../data/constants';
import type { TextureParams, TextureType } from '../types';

interface TextureControlsProps {
  type: TextureType;
  params: TextureParams;
  set: (k: keyof TextureParams, v: TextureParams[keyof TextureParams]) => void;
}

const SUBTITLE: Partial<Record<TextureType, string>> = {
  Stipple: 'noise-based',
  Hatch:   'parallel lines',
  Scratch: 'sparse strokes',
  Grain:   'film noise',
  Hex:     'grid overlay',
  Streak:  'weathering',
};

export function TextureControls({ type, params, set }: TextureControlsProps) {
  if (type === 'None') return null;

  return (
    <div className="conditional reveal">
      <div className="cond-head">
        <span className="name">{type} parameters</span>
        <span className="value mono" style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>
          {SUBTITLE[type] ?? ''}
        </span>
      </div>

      {/* Opacity — shared by all types */}
      <LabelSlider label="Opacity" min={0} max={100} step={1}
        value={params.opacity} onChange={(v) => set('opacity', v)} suffix="%" labelWidth={66} />

      {/* Scale — Stipple / Hatch / Scratch */}
      {(type === 'Stipple' || type === 'Hatch' || type === 'Scratch') && (
        <LabelSlider label="Scale" min={1} max={20} step={1}
          value={params.scale} onChange={(v) => set('scale', v)} suffix="px" labelWidth={66} />
      )}

      {/* ── Stipple ── */}
      {type === 'Stipple' && (
        <LabelSlider label="Density" min={0} max={100} step={1}
          value={params.density} onChange={(v) => set('density', v)} suffix="%" labelWidth={66} />
      )}

      {/* ── Hatch ── */}
      {type === 'Hatch' && (
        <>
          <LabelSlider label="Angle" min={0} max={180} step={1}
            value={params.angle} onChange={(v) => set('angle', v)} suffix="°" labelWidth={66} />
          <LabelSlider label="Spread" min={1} max={40} step={1}
            value={params.spread} onChange={(v) => set('spread', v)} suffix="px" labelWidth={66} />
          <div className="row">
            <span className="label" style={{ flexBasis: 66 }}>Cross-hatch</span>
            <div className={`toggle${params.cross ? ' on' : ''}`} onClick={() => set('cross', !params.cross)} />
            <span className="value-right" style={{ color: 'var(--fg-2)' }}>
              {params.cross ? 'ON' : 'OFF'}
            </span>
          </div>
        </>
      )}

      {/* ── Scratch ── */}
      {type === 'Scratch' && (
        <>
          <LabelSlider label="Length" min={1} max={40} step={1}
            value={params.length} onChange={(v) => set('length', v)} suffix="px" labelWidth={66} />
          <LabelSlider label="Spread" min={1} max={40} step={1}
            value={params.spread} onChange={(v) => set('spread', v)} suffix="px" labelWidth={66} />
        </>
      )}

      {/* ── Grain ── */}
      {type === 'Grain' && (
        <>
          <LabelSlider label="Scale" min={1} max={4} step={0.5}
            value={params.scale} onChange={(v) => set('scale', v)} suffix="px" labelWidth={66} />
          <LabelSlider label="Intensity" min={0.1} max={3.0} step={0.1}
            value={params.intensity} onChange={(v) => set('intensity', v)} labelWidth={66} />
        </>
      )}

      {/* ── Hex ── */}
      {type === 'Hex' && (
        <>
          <LabelSlider label="Cell size" min={10} max={120} step={2}
            value={params.cellSize} onChange={(v) => set('cellSize', v)} suffix="px" labelWidth={66} />
          <LabelSlider label="Line" min={0.5} max={4} step={0.5}
            value={params.lineWeight} onChange={(v) => set('lineWeight', v)} suffix="px" labelWidth={66} />
          <div className="row">
            <span className="label" style={{ flexBasis: 66 }}>Square</span>
            <div className={`toggle${params.square ? ' on' : ''}`} onClick={() => set('square', !params.square)} />
            <span className="value-right" style={{ color: 'var(--fg-2)' }}>
              {params.square ? 'ON' : 'OFF'}
            </span>
          </div>
        </>
      )}

      {/* ── Streak ── */}
      {type === 'Streak' && (
        <>
          <LabelSlider label="Direction" min={0} max={360} step={1}
            value={params.direction} onChange={(v) => set('direction', v)} suffix="°" labelWidth={66} />
          <LabelSlider label="Length" min={20} max={200} step={5}
            value={params.length} onChange={(v) => set('length', v)} suffix="px" labelWidth={66} />
          <LabelSlider label="Density" min={1} max={100} step={1}
            value={params.density} onChange={(v) => set('density', v)} suffix="%" labelWidth={66} />
          <LabelSlider label="Waviness" min={0} max={1.0} step={0.05}
            value={params.waviness} onChange={(v) => set('waviness', v)} labelWidth={66} />
          <LabelSlider label="Weight" min={0.5} max={3} step={0.5}
            value={params.weight} onChange={(v) => set('weight', v)} suffix="px" labelWidth={66} />
        </>
      )}

      {/* Colour + Blend — shared by all types */}
      <div className="row">
        <span className="label" style={{ flexBasis: 66 }}>Colour</span>
        <div className="picker-row" style={{ flex: 1 }}>
          <input type="color" className="color-chip"
            value={params.color} onChange={(e) => set('color', e.target.value)} />
          <input type="text" className="input mono" value={params.color.toUpperCase()} readOnly />
        </div>
      </div>
      <div className="row">
        <span className="label" style={{ flexBasis: 66 }}>Blend</span>
        <PixelSelect
          value={params.blend}
          options={[...BLEND_TYPES]}
          onChange={(v) => set('blend', v)}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  );
}
