// ─────────────────────────────────────────────────────────────
// Pixelcamo — main app
// ─────────────────────────────────────────────────────────────

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ── Helpers ─────────────────────────────────────────────────
const PALETTES = {
  Forest:  ['#2d3a26', '#4a5239', '#6e7155', '#2a2622', '#8b7d5e', '#1a1f17'],
  Desert:  ['#c2a373', '#8b6f47', '#5d4528', '#a88a5c', '#3a2a18', '#d8c294'],
  Urban:   ['#3a3a3a', '#5a5a5a', '#1a1a1a', '#7a7a7a', '#2a2a2a', '#9a9a9a'],
  Arctic:  ['#e8e8ec', '#b8c0c8', '#7d8a96', '#4a5560', '#252c35', '#cfd6dc'],
  Night:   ['#0c1320', '#1a2538', '#2c3a55', '#0a0e18', '#3d4f70', '#0e1828'],
  Coral:   ['#e8952a', '#c2421f', '#7a1f12', '#3a1208', '#f5c87a', '#d96930'],
};

const PRESETS = [
  'M81 Woodland',
  'MARPAT Digital',
  'Flecktarn Mod',
  'Razzle Dazzle',
  'Urban Splinter',
  'Norwegian Arctic',
  'Tiger Stripe',
  '— Custom —',
];

const TEXTURE_TYPES = ['None', 'Stipple', 'Hatch', 'Scratch'];
const HARMONY_TYPES = ['Complementary', 'Analogous', 'Triadic', 'Split-comp', 'Tetradic', 'Mono'];
const BLEND_TYPES = ['Normal', 'Multiply', 'Screen', 'Overlay', 'Soft-light', 'Difference'];
const SIZE_PRESETS = {
  'A4 (Portrait)':     { w: 2480, h: 3508, dpi: 300 },
  'A3 (Portrait)':     { w: 3508, h: 4961, dpi: 300 },
  '1K Square':         { w: 1024, h: 1024, dpi: 150 },
  '2K Square':         { w: 2048, h: 2048, dpi: 300 },
  'Tile 512':          { w: 512,  h: 512,  dpi: 72  },
  'Custom':            { w: 1600, h: 1200, dpi: 300 },
};

const fmt = (n) => n.toLocaleString();

// ── Icons (inline SVG) ──────────────────────────────────────
const Icon = {
  chev: <svg width="9" height="9" viewBox="0 0 9 9"><path d="M2.5 1.5 L6 4.5 L2.5 7.5" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  apple: <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M11.4 7.4c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.7-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.2 1 8.3.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.1 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.3zM9.5 1.7c.6-.7 1-1.7 1-2.7-.9 0-2 .6-2.6 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z"/></svg>,
  battery: <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5"/></svg>,
  wifi: <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><path d="M7 10a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zM10.2 6.5c.2.2.6.2.8 0 .2-.2.2-.6 0-.8a5.7 5.7 0 00-8 0c-.2.2-.2.6 0 .8.2.2.6.2.8 0a4.5 4.5 0 016.4 0zM12.3 4.4c.2.2.6.2.8 0 .2-.2.2-.6 0-.8a8.7 8.7 0 00-12.2 0c-.2.2-.2.6 0 .8.2.2.6.2.8 0a7.5 7.5 0 0110.6 0z"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.25"/><path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>,
  cc: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg>,
  dice: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/><circle cx="3.8" cy="3.8" r="0.8" fill="currentColor"/><circle cx="8.2" cy="3.8" r="0.8" fill="currentColor"/><circle cx="6" cy="6" r="0.8" fill="currentColor"/><circle cx="3.8" cy="8.2" r="0.8" fill="currentColor"/><circle cx="8.2" cy="8.2" r="0.8" fill="currentColor"/></svg>,
  refresh: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6a4 4 0 11-1.2-2.8M10 2.2v2.2H7.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>,
  tile: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1"/><rect x="6.5" y="1" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1"/><rect x="1" y="6.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1"/><rect x="6.5" y="6.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1"/></svg>,
  download: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v6.5M3.5 5.5L6 8l2.5-2.5M2 9.5v1h8v-1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  link: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4.5 6.5L6.5 4.5M3.5 7.5l-1 1a1.5 1.5 0 11-2-2l1-1M7.5 3.5l1-1a1.5 1.5 0 112 2l-1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
};

// ── Section wrapper ─────────────────────────────────────────
function Section({ id, title, badge, open, onToggle, children }) {
  return (
    <div className={`section ${open ? 'open' : ''}`}>
      <div className={`section-head ${open ? 'open' : ''}`} onClick={onToggle}>
        <span className="chev">{Icon.chev}</span>
        <span className="title">{title}</span>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

// ── Slider with label & value ──────────────────────────────
function LabelSlider({ label, min, max, step, value, onChange, suffix = '', width = 70 }) {
  return (
    <div className="row">
      <span className="label" style={{ flexBasis: width }}>{label}</span>
      <div className="control slider">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      <span className="value-right">{value}{suffix}</span>
    </div>
  );
}

// ── Palette editor ──────────────────────────────────────────
function PaletteEditor({ colors, selected, onSelect, onChange, onAdd, onRemove }) {
  return (
    <div>
      <div className="palette">
        {colors.map((c, i) => (
          <div key={i}
            className={`swatch ${selected === i ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onRemove(i)}
            title={c}>
            <span className="hex">{c.toUpperCase().slice(1)}</span>
          </div>
        ))}
        {colors.length < 8 && (
          <div className="swatch add" onClick={onAdd} title="Add colour">{Icon.plus}</div>
        )}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="label" style={{ flexBasis: 60 }}>Hex</span>
        <div className="picker-row" style={{ flex: 1 }}>
          <input type="color" className="color-chip"
            value={colors[selected] || '#000000'}
            onChange={(e) => onChange(selected, e.target.value)}
            style={{ background: colors[selected] }} />
          <input type="text" className="input mono"
            value={(colors[selected] || '').toUpperCase()}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-f]{0,6}$/i.test(v)) onChange(selected, v);
            }} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn ghost tiny">Save palette</button>
        <button className="btn ghost tiny" style={{ marginLeft: 'auto' }}>Load…</button>
      </div>
    </div>
  );
}

// ── Texture conditional UI ─────────────────────────────────
function TextureControls({ type, params, set }) {
  if (type === 'None') return null;
  return (
    <div className="conditional reveal">
      <div className="cond-head">
        <span className="name">{type} parameters</span>
        <span className="value mono" style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>
          {type === 'Stipple' && 'noise-based'}
          {type === 'Hatch' && 'parallel lines'}
          {type === 'Scratch' && 'sparse strokes'}
        </span>
      </div>
      <LabelSlider label="Opacity" min={0} max={100} step={1}
        value={params.opacity} onChange={(v) => set('opacity', v)} suffix="%" width={66} />
      <LabelSlider label="Scale" min={1} max={20} step={1}
        value={params.scale} onChange={(v) => set('scale', v)} suffix="px" width={66} />

      {type === 'Stipple' && (
        <LabelSlider label="Density" min={0} max={100} step={1}
          value={params.density} onChange={(v) => set('density', v)} suffix="%" width={66} />
      )}

      {type === 'Hatch' && (
        <>
          <LabelSlider label="Angle" min={0} max={180} step={1}
            value={params.angle} onChange={(v) => set('angle', v)} suffix="°" width={66} />
          <LabelSlider label="Spread" min={1} max={40} step={1}
            value={params.spread} onChange={(v) => set('spread', v)} suffix="px" width={66} />
          <div className="row">
            <span className="label" style={{ flexBasis: 66 }}>Cross-hatch</span>
            <div className={`toggle ${params.cross ? 'on' : ''}`}
              onClick={() => set('cross', !params.cross)} />
            <span className="value-right" style={{ color: 'var(--fg-2)' }}>
              {params.cross ? 'ON' : 'OFF'}
            </span>
          </div>
        </>
      )}

      {type === 'Scratch' && (
        <>
          <LabelSlider label="Length" min={1} max={40} step={1}
            value={params.length || 12} onChange={(v) => set('length', v)} suffix="px" width={66} />
          <LabelSlider label="Spread" min={1} max={40} step={1}
            value={params.spread} onChange={(v) => set('spread', v)} suffix="px" width={66} />
        </>
      )}

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
        <div className="select" style={{ flex: 1 }}>{params.blend}</div>
      </div>
    </div>
  );
}

// ── Harmony controls ───────────────────────────────────────
function HarmonyPreview({ base, type }) {
  // Generate harmony colors from a base hex
  const colors = useMemo(() => {
    // hex → hsl
    const h = base.replace('#', '');
    if (h.length !== 6) return [base, base, base, base, base];
    const r = parseInt(h.slice(0,2),16)/255;
    const g = parseInt(h.slice(2,4),16)/255;
    const b = parseInt(h.slice(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let hue = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max === r) hue = ((g-b)/d + (g<b?6:0));
      else if (max === g) hue = (b-r)/d + 2;
      else hue = (r-g)/d + 4;
      hue *= 60;
    }
    const hslHex = (H,S,L) => {
      H = ((H%360)+360)%360;
      S = Math.max(0,Math.min(1,S));
      L = Math.max(0,Math.min(1,L));
      const c = (1-Math.abs(2*L-1))*S;
      const x = c*(1-Math.abs(((H/60)%2)-1));
      const m = L - c/2;
      let rr=0,gg=0,bb=0;
      if(H<60){rr=c;gg=x;}
      else if(H<120){rr=x;gg=c;}
      else if(H<180){gg=c;bb=x;}
      else if(H<240){gg=x;bb=c;}
      else if(H<300){rr=x;bb=c;}
      else{rr=c;bb=x;}
      const f = v => Math.round((v+m)*255).toString(16).padStart(2,'0');
      return '#' + f(rr) + f(gg) + f(bb);
    };
    const offsets = {
      'Complementary': [0, 180, 30, -30, 120],
      'Analogous':     [0, -30, -15, 15, 30],
      'Triadic':       [0, 120, 240, 60, 180],
      'Split-comp':    [0, 150, 210, 30, -30],
      'Tetradic':      [0, 90, 180, 270, 45],
      'Mono':          [0, 0, 0, 0, 0],
    };
    const off = offsets[type] || offsets.Complementary;
    return off.map((o, i) => {
      if (type === 'Mono') return hslHex(hue, s, Math.max(0.1, Math.min(0.9, l + (i-2)*0.12)));
      return hslHex(hue + o, s, l);
    });
  }, [base, type]);
  return (
    <div className="harmony-preview">
      {colors.map((c, i) => <div key={i} className="c" style={{ background: c }} title={c} />)}
    </div>
  );
}

window.Section = Section;
window.LabelSlider = LabelSlider;
window.PaletteEditor = PaletteEditor;
window.TextureControls = TextureControls;
window.HarmonyPreview = HarmonyPreview;
window.PIXELCAMO_DATA = { PALETTES, PRESETS, TEXTURE_TYPES, HARMONY_TYPES, BLEND_TYPES, SIZE_PRESETS, Icon, fmt };
