import { Section } from './Section';
import { LabelSlider } from './LabelSlider';
import { PaletteEditor } from './PaletteEditor';
import { TextureControls } from './TextureControls';
import { HarmonyPreview } from './HarmonyPreview';
import { PixelSelect } from './PixelSelect';
import { Icon } from '../icons';
import {
  PRESETS_DATA, TEXTURE_TYPES, HARMONY_TYPES, BLEND_TYPES,
  CAMO_PALETTE_NAMES, DAZZLE_PALETTE_NAMES, AERIAL_PALETTE_NAMES,
  PALETTES, SIZE_PRESETS, STANDARD_SIZE_PRESET_NAMES, AERIAL_SIZE_PRESET_NAMES,
} from '../data/constants';
import type {
  Mode, TextureType, BlendType, HarmonyType, TextureParams, SectionOpen, Passes, ExportFormat, RoofType,
} from '../types';

interface SidebarProps {
  mode: Mode; setMode: (m: Mode) => void;
  preset: string; setPreset: (p: string) => void;
  paletteName: string; setPaletteName: (n: string) => void;
  palette: string[]; setPalette: (p: string[]) => void;
  selectedSwatch: number; setSelectedSwatch: (i: number) => void;
  seed: number; setSeed: (v: number) => void;
  pixelScale: number; setPixelScale: (v: number) => void;
  density: number; setDensity: (v: number) => void;
  passes: Passes; setPasses: (v: Passes) => void;
  blendOpacity: number; setBlendOpacity: (v: number) => void;
  blendType: BlendType; setBlendType: (v: BlendType) => void;
  blendBMode: 'Camo' | 'Dazzle'; setBlendBMode: (v: 'Camo' | 'Dazzle') => void;
  blendBPixelScale: number; setBlendBPixelScale: (v: number) => void;
  blendBDensity: number; setBlendBDensity: (v: number) => void;
  blendBPasses: Passes; setBlendBPasses: (v: Passes) => void;
  // Aerial
  roofType: RoofType; setRoofType: (v: RoofType) => void;
  sunAngle: number; setSunAngle: (v: number) => void;
  sunElevation: number; setSunElevation: (v: number) => void;
  shadowDepth: number; setShadowDepth: (v: number) => void;
  weathering: number; setWeathering: (v: number) => void;
  zoneCount: number; setZoneCount: (v: number) => void;
  onAerialPaletteChange: (name: string) => void;
  // Texture
  textureType: TextureType; setTextureType: (v: TextureType) => void;
  tex: TextureParams;
  setT: (k: keyof TextureParams, v: TextureParams[keyof TextureParams]) => void;
  harmonyBase: string; setHarmonyBase: (v: string) => void;
  harmonyType: HarmonyType; setHarmonyType: (v: HarmonyType) => void;
  open: SectionOpen; toggle: (k: keyof SectionOpen) => void;
  locked: boolean[];
  onToggleLock: (i: number) => void;
  microEnabled: boolean; setMicroEnabled: (v: boolean) => void;
  microScale: number; setMicroScale: (v: number) => void;
  microWeight: number; setMicroWeight: (v: number) => void;
  safeMicroScale: number;
  onApplyHarmony: () => void;
  presetModified: boolean;
  loadPreset: (name: string) => void;
  onRandomisePalette: () => void;
  onAddSwatch: () => void;
  onRemoveSwatch: (i: number) => void;
  onSavePalette: () => void;
  onLoadPalette: () => void;
  // Export section
  exportSize: string; setExportSize: (v: string) => void;
  exportW: number; setExportW: (v: number) => void;
  exportH: number; setExportH: (v: number) => void;
  dpi: number; setDpi: (v: number) => void;
  format: ExportFormat; setFormat: (v: ExportFormat) => void;
  onExport: () => void;
}

export function Sidebar(props: SidebarProps) {
  const {
    mode, setMode, preset, paletteName, setPaletteName,
    palette, setPalette, selectedSwatch, setSelectedSwatch,
    seed, setSeed, pixelScale, setPixelScale, density, setDensity,
    passes, setPasses, blendOpacity, setBlendOpacity, blendType, setBlendType,
    blendBMode, setBlendBMode, blendBPixelScale, setBlendBPixelScale,
    blendBDensity, setBlendBDensity, blendBPasses, setBlendBPasses,
    roofType, setRoofType, sunAngle, setSunAngle, sunElevation, setSunElevation,
    shadowDepth, setShadowDepth, weathering, setWeathering, zoneCount, setZoneCount,
    onAerialPaletteChange,
    textureType, setTextureType, tex, setT,
    harmonyBase, setHarmonyBase, harmonyType, setHarmonyType,
    locked, onToggleLock,
    microEnabled, setMicroEnabled, microScale, setMicroScale, microWeight, setMicroWeight, safeMicroScale,
    open, toggle, onApplyHarmony, presetModified, loadPreset, onRandomisePalette,
    onAddSwatch, onRemoveSwatch,
    onSavePalette, onLoadPalette,
    exportSize, setExportSize, exportW, setExportW, exportH, setExportH,
    dpi, setDpi, format, setFormat, onExport,
  } = props;

  const paletteSourceOptions = mode === 'Dazzle'
    ? [...DAZZLE_PALETTE_NAMES, 'Custom']
    : mode === 'Aerial'
    ? [...AERIAL_PALETTE_NAMES, 'Custom']
    : [...CAMO_PALETTE_NAMES, 'Custom'];

  // Parameters section — label + range adapt to Aerial mode
  const psLabel = mode === 'Aerial' ? (roofType === 'pitched' ? 'Tile scale' : 'Zone scale') : 'Pixel scale';
  const [psMin, psMax] = mode === 'Aerial'
    ? (roofType === 'flat' ? [40, 200] : [8, 40])
    : [4, 40];

  const exportSizeOptions = mode === 'Aerial' ? AERIAL_SIZE_PRESET_NAMES : STANDARD_SIZE_PRESET_NAMES;

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">

        {/* ── PATTERN ─────────────────────────────────── */}
        <Section title="Pattern" badge={`${preset}${presetModified ? '*' : ''}`}
          open={open.pattern} onToggle={() => toggle('pattern')}>

          <div className="row">
            <span className="label" style={{ flexBasis: 60 }}>Mode</span>
            <div className="seg" style={{ flex: 1 }}>
              {(['Camo', 'Dazzle', 'Blend', 'Aerial'] as Mode[]).map((m) => (
                <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
          </div>

          {mode === 'Blend' && (
            <div className="conditional reveal">
              <div className="cond-head"><span className="name">Blend mix</span></div>
              <LabelSlider label="Opacity" min={0} max={100} step={1}
                value={blendOpacity} onChange={setBlendOpacity} suffix="%" labelWidth={60} />
              <div className="row">
                <span className="label" style={{ flexBasis: 60 }}>Type</span>
                <PixelSelect
                  value={blendType}
                  options={[...BLEND_TYPES]}
                  onChange={(v) => setBlendType(v as BlendType)}
                  style={{ flex: 1 }}
                />
              </div>

              <div className="cond-head" style={{ marginTop: 8 }}>
                <span className="name">Layer B</span>
              </div>
              <div className="row">
                <span className="label" style={{ flexBasis: 60 }}>Mode</span>
                <div className="seg" style={{ flex: 1 }}>
                  {(['Camo', 'Dazzle'] as const).map((m) => (
                    <button key={m} className={blendBMode === m ? 'active' : ''}
                      onClick={() => setBlendBMode(m)}>{m}</button>
                  ))}
                </div>
              </div>
              <LabelSlider label="Pixel scale" min={4} max={40} step={1}
                value={blendBPixelScale} onChange={setBlendBPixelScale} suffix="px" labelWidth={60} />
              <LabelSlider label="Density" min={0} max={100} step={1}
                value={blendBDensity} onChange={setBlendBDensity} suffix="%" labelWidth={60} />
              <div className="row">
                <span className="label" style={{ flexBasis: 60 }}>Passes</span>
                <div className="passes" style={{ flex: 1 }}>
                  {([1, 2, 3] as Passes[]).map((n) => (
                    <button key={n} className={blendBPasses === n ? 'active' : ''}
                      onClick={() => setBlendBPasses(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'Aerial' && (
            <div className="conditional reveal">
              <div className="cond-head"><span className="name">Roof type</span></div>
              <div className="row">
                <span className="label" style={{ flexBasis: 60 }}>Type</span>
                <div className="seg" style={{ flex: 1 }}>
                  {(['pitched', 'flat'] as RoofType[]).map((t) => (
                    <button key={t} className={roofType === t ? 'active' : ''}
                      onClick={() => setRoofType(t)}
                      style={{ textTransform: 'capitalize' }}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="cond-head" style={{ marginTop: 8 }}><span className="name">Sun</span></div>
              <LabelSlider label="Angle" min={0} max={360} step={1}
                value={sunAngle} onChange={setSunAngle} suffix="°" labelWidth={60} />
              <LabelSlider label="Elevation" min={10} max={70} step={1}
                value={sunElevation} onChange={setSunElevation} suffix="°" labelWidth={60} />

              <div className="cond-head" style={{ marginTop: 8 }}><span className="name">Weathering</span></div>
              <LabelSlider label="Shadow" min={0} max={100} step={1}
                value={shadowDepth} onChange={setShadowDepth} suffix="%" labelWidth={60} />
              <LabelSlider label="Streaks" min={0} max={100} step={1}
                value={weathering} onChange={setWeathering} suffix="%" labelWidth={60} />

              {roofType === 'flat' && (
                <>
                  <div className="cond-head" style={{ marginTop: 8 }}><span className="name">Zones</span></div>
                  <LabelSlider label="Count" min={1} max={6} step={1}
                    value={zoneCount} onChange={setZoneCount} suffix="" labelWidth={60} />
                </>
              )}
            </div>
          )}

          <div className="row">
            <span className="label" style={{ flexBasis: 60 }}>Style</span>
            <select className="select mono" value={preset}
              onChange={(e) => loadPreset(e.target.value)}
              style={{ flex: 1 }}>
              {Object.keys(PRESETS_DATA).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button className="btn ghost icon-only"
              title={presetModified ? `Reset to ${preset}` : 'No changes to reset'}
              onClick={() => loadPreset(preset)}
              style={{ opacity: presetModified ? 1 : 0.4 }}>
              {Icon.refresh}
            </button>
          </div>

          <div className="row">
            <span className="label" style={{ flexBasis: 60 }}>Seed</span>
            <input
              className="input mono num" style={{ flex: 1 }}
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
            />
            <button
              className="btn ghost icon-only"
              title={locked.every(Boolean) ? 'Unlock a swatch to randomise' : 'Randomise (space)'}
              onClick={onRandomisePalette}
              style={{ opacity: locked.every(Boolean) ? 0.35 : 1, pointerEvents: locked.every(Boolean) ? 'none' : 'auto' }}
            >
              {Icon.dice}
            </button>
          </div>
        </Section>

        {/* ── PALETTE ─────────────────────────────────── */}
        <Section title="Palette" badge={`${palette.length}/8 · ${paletteName}`}
          open={open.palette} onToggle={() => toggle('palette')}>
          <div className="row" style={{ marginBottom: 2 }}>
            <span className="label" style={{ flexBasis: 60 }}>Source</span>
            <PixelSelect
              value={paletteName}
              options={paletteSourceOptions}
              onChange={(v) => {
                if (mode === 'Aerial') {
                  onAerialPaletteChange(v);
                } else {
                  setPaletteName(v);
                  if (v !== 'Custom' && PALETTES[v]) setPalette([...PALETTES[v]]);
                }
              }}
              style={{ flex: 1 }}
            />
          </div>
          <PaletteEditor
            colors={palette}
            selected={selectedSwatch}
            locked={locked}
            onSelect={setSelectedSwatch}
            onChange={(i, c) => {
              const next = [...palette]; next[i] = c; setPalette(next);
              setPaletteName('Custom');
            }}
            onAdd={onAddSwatch}
            onRemove={onRemoveSwatch}
            onToggleLock={onToggleLock}
            onSave={onSavePalette}
            onLoad={onLoadPalette}
          />
        </Section>

        {/* ── PARAMETERS ──────────────────────────────── */}
        <Section
          title="Parameters"
          badge={microEnabled && (mode === 'Camo' || mode === 'Blend')
            ? `${pixelScale}+${safeMicroScale}px · ${density}%`
            : `${pixelScale}px · ${density}%`}
          open={open.params} onToggle={() => toggle('params')}>
          <LabelSlider label={psLabel} min={psMin} max={psMax} step={1}
            value={pixelScale} onChange={setPixelScale} suffix="px" labelWidth={84} />
          <LabelSlider label="Density" min={0} max={100} step={1}
            value={density} onChange={setDensity} suffix="%" labelWidth={84} />
          <div className="row">
            <span className="label wide">Passes</span>
            <div className="passes" style={{ flex: 1 }}>
              {([1, 2, 3] as Passes[]).map((n) => (
                <button key={n} className={passes === n ? 'active' : ''} onClick={() => setPasses(n)}>{n}</button>
              ))}
            </div>
            <span className="value-right" style={{ color: 'var(--fg-2)' }}>
              {passes === 1 ? 'fast' : passes === 2 ? 'std' : 'rich'}
            </span>
          </div>
          {/* ── Two-scale (Camo / Blend only) ──────── */}
          {(mode === 'Camo' || mode === 'Blend') && (<>
            <div className="row">
              <span className="label wide">Two-scale</span>
              <div className={`toggle ${microEnabled ? 'on' : ''}`}
                   onClick={() => setMicroEnabled(!microEnabled)} />
              <span className="value-right" style={{ color: 'var(--fg-2)' }}>
                {microEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            {microEnabled && (
              <div className="conditional reveal">
                <div className="cond-head">
                  <span className="name">Micro disruptor</span>
                  <span className="value mono" style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>
                    2-scale
                  </span>
                </div>
                <LabelSlider label="Micro scale" min={2} max={20} step={1}
                  value={microScale} onChange={setMicroScale} suffix="px" labelWidth={84} />
                <LabelSlider label="Micro weight" min={0} max={100} step={1}
                  value={microWeight} onChange={setMicroWeight} suffix="%" labelWidth={84} />
                {safeMicroScale >= pixelScale - 2 && (
                  <span style={{ color: 'var(--warn)', fontSize: 9.5, padding: '2px 0', display: 'block' }}>
                    micro scale close to macro — increase pixel scale for best results
                  </span>
                )}
              </div>
            )}
          </>)}
        </Section>

        {/* ── TEXTURE ─────────────────────────────────── */}
        <Section title="Texture" badge={textureType === 'None' ? 'off' : textureType}
          open={open.texture} onToggle={() => toggle('texture')}>
          <div className="row">
            <span className="label wide">Type</span>
            <PixelSelect
              value={textureType}
              options={[...TEXTURE_TYPES]}
              onChange={(v) => setTextureType(v as TextureType)}
              style={{ flex: 1 }}
            />
          </div>
          <TextureControls type={textureType} params={tex} set={setT} />
        </Section>

        {/* ── COLOUR HARMONY ──────────────────────────── */}
        <Section title="Colour harmony" badge={harmonyType}
          open={open.harmony} onToggle={() => toggle('harmony')}>
          <div className="row">
            <span className="label wide">Base</span>
            <div className="picker-row" style={{ flex: 1 }}>
              <input type="color" className="color-chip"
                value={harmonyBase} onChange={(e) => setHarmonyBase(e.target.value)} />
              <input type="text" className="input mono"
                value={harmonyBase.toUpperCase()}
                onChange={(e) => {
                  if (/^#[0-9a-f]{0,6}$/i.test(e.target.value)) setHarmonyBase(e.target.value);
                }} />
            </div>
          </div>
          <div className="row">
            <span className="label wide">Scheme</span>
            <PixelSelect
              value={harmonyType}
              options={[...HARMONY_TYPES]}
              onChange={(v) => setHarmonyType(v as HarmonyType)}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ marginTop: 4 }}>
            <div className="label" style={{ marginBottom: 6 }}>Preview</div>
            <HarmonyPreview base={harmonyBase} type={harmonyType} />
          </div>
          <button
            className="btn accent"
            style={{ marginTop: 6, height: 26, justifyContent: 'center', width: '100%' }}
            onClick={onApplyHarmony}
          >
            Apply to palette →
          </button>
        </Section>

      </div>

      {/* ── EXPORT (pinned at sidebar bottom, outside scroll) ── */}
      {(() => {
        const sizePreset = SIZE_PRESETS[exportSize] ?? SIZE_PRESETS['1K Square'];
        const displayW = exportSize === 'Custom' ? exportW : sizePreset.w;
        const displayH = exportSize === 'Custom' ? exportH : sizePreset.h;
        const mmW = Math.round(displayW / dpi * 25.4);
        const mmH = Math.round(displayH / dpi * 25.4);
        return (
          <div className={`section export-section${open.export ? ' open' : ''}`}>
            <div
              className={`section-head${open.export ? ' open' : ''}`}
              onClick={() => toggle('export')}
            >
              <span className="chev">{Icon.chev}</span>
              <span className="title">Export</span>
              <span className="badge">{format} · {dpi}dpi</span>
            </div>
            {open.export && (
              <div className="section-body" style={{ display: 'flex' }}>
                <div className="row">
                  <span className="label" style={{ flexBasis: 60 }}>Size</span>
                  <PixelSelect
                    value={exportSize}
                    options={exportSizeOptions}
                    onChange={(v) => {
                      setExportSize(v);
                      if (v !== 'Custom') {
                        setExportW(SIZE_PRESETS[v].w);
                        setExportH(SIZE_PRESETS[v].h);
                        setDpi(SIZE_PRESETS[v].dpi as 150 | 300 | 600);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="export-dim-row">
                  <input
                    className="input mono num"
                    value={displayW}
                    readOnly={exportSize !== 'Custom'}
                    onChange={(e) => exportSize === 'Custom' && setExportW(Number(e.target.value) || 1)}
                  />
                  <span className="x">×</span>
                  <input
                    className="input mono num"
                    value={displayH}
                    readOnly={exportSize !== 'Custom'}
                    onChange={(e) => exportSize === 'Custom' && setExportH(Number(e.target.value) || 1)}
                  />
                  <span className="x" style={{ color: 'var(--fg-3)', fontSize: 10 }}>px</span>
                </div>
                <div className="row">
                  <span className="label" style={{ flexBasis: 60 }}>DPI</span>
                  <div className="seg" style={{ flex: 1 }}>
                    {([150, 300, 600] as const).map((d) => (
                      <button key={d} className={dpi === d ? 'active' : ''} onClick={() => setDpi(d)}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="mm-readout">≈ {mmW} × {mmH} mm</div>
                <div className="row">
                  <span className="label" style={{ flexBasis: 60 }}>Format</span>
                  <div className="seg" style={{ flex: 1 }}>
                    {(['PNG', 'PDF'] as ExportFormat[]).map((f) => (
                      <button key={f} className={format === f ? 'active' : ''} onClick={() => setFormat(f)}>{f}</button>
                    ))}
                  </div>
                </div>
                <button className="btn accent primary-export" title="⌘E" onClick={onExport}>
                  {Icon.download} Export {format}
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </aside>
  );
}
