import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CanvasPane } from './components/CanvasPane';
import { Statusline } from './components/Statusline';
import { generateCamo, camoToRects, generateDazzle, generateAerial } from './lib/camo';
import { getApi } from './lib/api';
import {
  PALETTES, PRESETS_DATA, DEFAULT_TEXTURE, SIZE_PRESETS,
  FLAT_AERIAL_PALETTES, AERIAL_SIZE_PRESET_NAMES, STANDARD_SIZE_PRESET_NAMES,
} from './data/constants';
import type {
  Mode, TextureType, BlendType, HarmonyType, TextureParams,
  SectionOpen, Passes, ExportFormat, PcmDocument, RoofType,
} from './types';

// Re-export for convenience
export { PALETTES };

interface AppProps {
  isDevWrapper?: boolean;
}

export default function App({ isDevWrapper }: AppProps) {
  // ── State ────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('Camo');
  const [preset, setPreset] = useState('M81 Woodland');
  const [paletteName, setPaletteName] = useState('Woodland');
  const [palette, setPalette] = useState<string[]>([...PALETTES.Woodland]);
  const [selectedSwatch, setSelectedSwatch] = useState(0);
  const [seed, setSeed] = useState(42081);
  const [pixelScale, setPixelScale] = useState(14);
  const [density, setDensity] = useState(58);
  const [passes, setPasses] = useState<Passes>(2);
  const [tile, setTile] = useState(true);
  const [zoom, setZoom] = useState(100);

  const [blendOpacity, setBlendOpacity] = useState(72);
  const [blendType, setBlendType] = useState<BlendType>('Soft-light');
  const [blendBMode, setBlendBMode] = useState<'Camo' | 'Dazzle'>('Camo');
  const [blendBPixelScale, setBlendBPixelScale] = useState(7);
  const [blendBDensity, setBlendBDensity] = useState(78);
  const [blendBPasses, setBlendBPasses] = useState<Passes>(2);

  // ── Aerial state ─────────────────────────────────────────────
  const [roofType, setRoofType] = useState<RoofType>('flat');
  const [sunAngle, setSunAngle] = useState(225);
  const [sunElevation, setSunElevation] = useState(35);
  const [shadowDepth, setShadowDepth] = useState(60);   // 0–100, /100 → 0.0–1.0 in doc
  const [weathering, setWeathering] = useState(40);     // 0–100
  const [zoneCount, setZoneCount] = useState(3);        // 1–6

  const [textureType, setTextureType] = useState<TextureType>('Stipple');
  const [tex, setTex] = useState<TextureParams>({ ...DEFAULT_TEXTURE });
  const setT = useCallback((k: keyof TextureParams, v: TextureParams[keyof TextureParams]) => {
    setTex((prev) => ({ ...prev, [k]: v }));
  }, []);

  const [harmonyBase, setHarmonyBase] = useState('#4a5240');
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('Triadic');

  const [exportSize, setExportSize] = useState('1K Square');
  const [exportW, setExportW] = useState(1024);
  const [exportH, setExportH] = useState(1024);
  const [dpi, setDpi] = useState<number>(300);
  const [format, setFormat] = useState<ExportFormat>('PNG');

  const [open, setOpen] = useState<SectionOpen>({
    pattern: true, palette: true, params: true, texture: true, harmony: false, export: false,
  });
  const toggle = useCallback((k: keyof SectionOpen) => {
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const [dirty, setDirty] = useState(false);
  const [docPath, setDocPath] = useState<string | null>(null);
  const [status, setStatus] = useState<'Idle' | 'Rendering…' | 'Error'>('Idle');

  // ── Canvas box (set by CanvasPane ResizeObserver) ────────────
  const [canvasBox, setCanvasBox] = useState({ w: 640, h: 480 });
  const handleBoxChange = useCallback((w: number, h: number) => {
    setCanvasBox({ w, h });
  }, []);

  // ── Pattern generation ───────────────────────────────────────
  const genMsRef = useRef(0);

  const camoResult = useMemo(() => {
    if (mode === 'Dazzle') return null;
    const t0 = performance.now();
    const result = generateCamo({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale, density, passes, seed, tile,
    });
    genMsRef.current = Math.round(performance.now() - t0);
    return result;
  }, [mode, canvasBox.w, canvasBox.h, palette, pixelScale, density, passes, seed, tile]);

  const rects = useMemo(() => {
    if (!camoResult) return [];
    return camoToRects({ ...camoResult, palette });
  }, [camoResult, palette]);

  const dazzleShapes = useMemo(() => {
    if (mode !== 'Dazzle') return [];
    const t0 = performance.now();
    const result = generateDazzle({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale, density, passes, seed,
    });
    genMsRef.current = Math.round(performance.now() - t0);
    return result;
  }, [mode, canvasBox.w, canvasBox.h, palette, pixelScale, density, passes, seed]);

  // Blend mode — layer B (user-controlled settings, offset seed)
  const blendBSeed = useMemo(() => (seed ^ 0xA5A5A5A5) >>> 0, [seed]);

  const blendCamoResult = useMemo(() => {
    if (mode !== 'Blend' || blendBMode !== 'Camo') return null;
    return generateCamo({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale: blendBPixelScale, density: blendBDensity,
      passes: blendBPasses, seed: blendBSeed, tile,
    });
  }, [mode, blendBMode, canvasBox.w, canvasBox.h, palette, blendBPixelScale, blendBDensity, blendBPasses, blendBSeed, tile]);

  const blendRects = useMemo(() => {
    if (!blendCamoResult) return [];
    return camoToRects({ ...blendCamoResult, palette });
  }, [blendCamoResult, palette]);

  const blendDazzleShapes = useMemo(() => {
    if (mode !== 'Blend' || blendBMode !== 'Dazzle') return [];
    return generateDazzle({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale: blendBPixelScale, density: blendBDensity,
      passes: blendBPasses, seed: blendBSeed,
    });
  }, [mode, blendBMode, canvasBox.w, canvasBox.h, palette, blendBPixelScale, blendBDensity, blendBPasses, blendBSeed]);

  const aerialRects = useMemo(() => {
    if (mode !== 'Aerial') return [];
    return generateAerial({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale, density, passes, seed,
      roofType, zoneCount, paletteName,
    });
  }, [mode, canvasBox.w, canvasBox.h, palette, pixelScale, density, passes, seed, roofType, zoneCount, paletteName]);

  const cols = camoResult?.cols ?? Math.ceil(canvasBox.w / pixelScale);
  const rows = camoResult?.rows ?? Math.ceil(canvasBox.h / pixelScale);
  const rectCount = mode === 'Dazzle' ? dazzleShapes.length : rects.length;

  // ── Aerial: auto-set roofType + sensible scale from palette ─
  const handleAerialPaletteChange = useCallback((name: string) => {
    setPaletteName(name);
    if (name !== 'Custom' && PALETTES[name]) setPalette([...PALETTES[name]]);
    if (FLAT_AERIAL_PALETTES.has(name)) {
      setRoofType('flat');
      if (pixelScale < 40) setPixelScale(80);
    } else if (name !== 'Custom') {
      setRoofType('pitched');
      if (pixelScale > 40) setPixelScale(14);
    }
  }, [pixelScale]);

  // ── v3: loadPreset — atomically populates all state ─────────
  const loadPreset = useCallback((name: string) => {
    const p = PRESETS_DATA[name];
    if (!p) return;
    setPreset(name);
    setMode(p.mode);
    setPalette([...p.palette]);
    setPaletteName(p.paletteName);
    setPixelScale(p.pixelScale);
    setDensity(p.density);
    setPasses(p.passes);
    setTextureType(p.textureType);
    setSelectedSwatch(0);
  }, []);

  // ── v3: seed initial state from default preset (prevents spurious asterisk) ──
  useEffect(() => {
    loadPreset('M81 Woodland');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── v3: presetModified — derived, not stored ─────────────────
  const presetModified = useMemo(() => {
    const p = PRESETS_DATA[preset];
    if (!p) return false;
    return mode !== p.mode
        || pixelScale !== p.pixelScale
        || density !== p.density
        || passes !== p.passes
        || textureType !== p.textureType
        || JSON.stringify(palette) !== JSON.stringify(p.palette);
  }, [preset, mode, pixelScale, density, passes, textureType, palette]);

  // ── Actions ─────────────────────────────────────────────────
  const regenerateNewSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999999));
    setDirty(true);
  }, []);

  const handleApplyHarmony = useCallback(() => {
    // Compute harmony colors — same logic as HarmonyPreview
    const h = harmonyBase.replace('#', '');
    if (h.length !== 6) return;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue *= 60;
    }
    const hslHex = (H: number, S: number, L: number) => {
      H = ((H % 360) + 360) % 360; S = Math.max(0, Math.min(1, S)); L = Math.max(0, Math.min(1, L));
      const c = (1 - Math.abs(2 * L - 1)) * S; const x = c * (1 - Math.abs((H / 60) % 2 - 1)); const m = L - c / 2;
      let rr = 0, gg = 0, bb = 0;
      if (H < 60) { rr = c; gg = x; } else if (H < 120) { rr = x; gg = c; }
      else if (H < 180) { gg = c; bb = x; } else if (H < 240) { gg = x; bb = c; }
      else if (H < 300) { rr = x; bb = c; } else { rr = c; bb = x; }
      const f = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
      return '#' + f(rr) + f(gg) + f(bb);
    };
    const offsets: Record<HarmonyType, number[]> = {
      'Complementary': [0, 180, 30, -30, 120], 'Analogous': [0, -30, -15, 15, 30],
      'Triadic': [0, 120, 240, 60, 180], 'Split-comp': [0, 150, 210, 30, -30],
      'Tetradic': [0, 90, 180, 270, 45], 'Mono': [0, 0, 0, 0, 0],
    };
    const off = offsets[harmonyType];
    const colors = off.map((o, i) =>
      harmonyType === 'Mono' ? hslHex(hue, s, Math.max(0.1, Math.min(0.9, l + (i - 2) * 0.12))) : hslHex(hue + o, s, l)
    );
    setPalette(colors);
    setPaletteName('Custom');
    setDirty(true);
  }, [harmonyBase, harmonyType]);

  // ── Build doc for save/export ────────────────────────────────
  const buildDoc = useCallback((): PcmDocument => ({
    version: 1,
    mode: mode.toLowerCase(),
    preset,
    paletteName,
    palette,
    params: { pixel_scale: pixelScale, density, passes, seed },
    blend: { opacity: blendOpacity, type: blendType.toLowerCase() },
    blendB: { mode: blendBMode.toLowerCase(), pixelScale: blendBPixelScale, density: blendBDensity, passes: blendBPasses },
    aerial: {
      roofType,
      sunAngle,
      sunElevation,
      shadowDepth: shadowDepth / 100,
      weathering: weathering / 100,
      zoneCount,
    },
    texture: {
      type: textureType.toLowerCase(), opacity: tex.opacity, scale: tex.scale,
      density: tex.density, angle: tex.angle, spread: tex.spread, cross: tex.cross,
      length: tex.length, color: tex.color, blend: tex.blend.toLowerCase(),
      intensity: tex.intensity, cellSize: tex.cellSize, lineWeight: tex.lineWeight,
      square: tex.square, direction: tex.direction, waviness: tex.waviness, weight: tex.weight,
    },
    harmony: { base: harmonyBase, type: harmonyType },
    tile,
  }), [mode, preset, paletteName, palette, pixelScale, density, passes, seed,
      blendOpacity, blendType, blendBMode, blendBPixelScale, blendBDensity, blendBPasses,
      roofType, sunAngle, sunElevation, shadowDepth, weathering, zoneCount,
      textureType, tex, harmonyBase, harmonyType, tile]);

  // ── Load doc ─────────────────────────────────────────────────
  const loadDoc = useCallback((doc: PcmDocument) => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    setMode(cap(doc.mode) as Mode);
    setPreset(doc.preset);
    setPalette(doc.palette);
    const name = Object.entries(PALETTES).find(([, c]) => JSON.stringify(c) === JSON.stringify(doc.palette))?.[0] ?? 'Custom';
    setPaletteName(name);
    setPixelScale(doc.params.pixel_scale);
    setDensity(doc.params.density);
    setPasses(doc.params.passes as Passes);
    setSeed(doc.params.seed);
    setBlendOpacity(doc.blend.opacity);
    setBlendType(cap(doc.blend.type) as BlendType);
    const bb = doc.blendB;
    setBlendBMode((cap(bb?.mode ?? 'camo')) as 'Camo' | 'Dazzle');
    setBlendBPixelScale(bb?.pixelScale ?? 7);
    setBlendBDensity(bb?.density ?? 78);
    setBlendBPasses((bb?.passes ?? 2) as Passes);
    const ae = doc.aerial;
    setRoofType((ae?.roofType ?? 'flat') as RoofType);
    setSunAngle(ae?.sunAngle ?? 225);
    setSunElevation(ae?.sunElevation ?? 35);
    setShadowDepth(Math.round((ae?.shadowDepth ?? 0.6) * 100));
    setWeathering(Math.round((ae?.weathering ?? 0.4) * 100));
    setZoneCount(ae?.zoneCount ?? 3);
    const tt = cap(doc.texture.type) as TextureType;
    setTextureType(tt);
    setTex({
      opacity: doc.texture.opacity, scale: doc.texture.scale, density: doc.texture.density,
      angle: doc.texture.angle, spread: doc.texture.spread, cross: doc.texture.cross,
      length: doc.texture.length, color: doc.texture.color, blend: cap(doc.texture.blend),
      intensity: doc.texture.intensity ?? 1.0,
      cellSize: doc.texture.cellSize ?? 40,
      lineWeight: doc.texture.lineWeight ?? 1,
      square: doc.texture.square ?? false,
      direction: doc.texture.direction ?? 90,
      waviness: doc.texture.waviness ?? 0.3,
      weight: doc.texture.weight ?? 1,
    });
    setHarmonyBase(doc.harmony.base);
    setHarmonyType(doc.harmony.type as HarmonyType);
    setTile(doc.tile);
    setDirty(false);
  }, []);

  // ── File operations ──────────────────────────────────────────
  const handleNew = useCallback(() => {
    loadPreset('M81 Woodland');
    setDocPath(null);
    setDirty(false);
    document.title = 'Pixelcamo — Untitled.pcm';
  }, [loadPreset]);

  const handleOpen = useCallback(async () => {
    const doc = await getApi().open_document();
    if (doc) { loadDoc(doc); setDocPath(null); }
  }, [loadDoc]);

  const handleSave = useCallback(async () => {
    const doc = buildDoc();
    if (docPath) doc._path = docPath;
    const path = await getApi().save_document(doc);
    if (!path) return;
    setDocPath(path);
    setDirty(false);
    const name = path.split('/').pop() ?? 'Untitled.pcm';
    document.title = `Pixelcamo — ${name}`;
  }, [buildDoc, docPath]);

  const handleSaveAs = useCallback(async () => {
    const path = await getApi().save_document(buildDoc());
    if (!path) return;
    setDocPath(path);
    setDirty(false);
    const name = path.split('/').pop() ?? 'Untitled.pcm';
    document.title = `Pixelcamo — ${name}`;
  }, [buildDoc]);

  const handleSavePalette = useCallback(async () => {
    await getApi().save_palette(palette);
  }, [palette]);

  const handleLoadPalette = useCallback(async () => {
    const colors = await getApi().load_palette();
    if (colors && colors.length >= 2) {
      setPalette(colors);
      setPaletteName('Custom');
      setSelectedSwatch(0);
      setDirty(true);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setStatus('Rendering…');
    try {
      await getApi().export_pattern(buildDoc(), {
        width: exportW, height: exportH, dpi, format,
      });
    } catch {
      setStatus('Error');
      return;
    }
    setStatus('Idle');
  }, [buildDoc, exportW, exportH, dpi, format]);

  // ── Menu events from Python ──────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      switch (e.detail?.action) {
        case 'new': handleNew(); break;
        case 'open': handleOpen(); break;
        case 'save': handleSave(); break;
        case 'save-as': handleSaveAs(); break;
        case 'export': handleExport(); break;
        case 'reset-preset': loadPreset(preset); break;
        case 'copy-seed': navigator.clipboard?.writeText(String(seed)); break;
        case 'paste-seed':
          navigator.clipboard?.readText().then((t) => {
            const n = parseInt(t.replace(/\D/g, ''), 10);
            if (!isNaN(n)) setSeed(n);
          });
          break;
        case 'toggle-tile': setTile((t) => !t); break;
        case 'toggle-harmony': toggle('harmony'); break;
        case 'zoom-in': setZoom((z) => Math.min(200, z + 25)); break;
        case 'zoom-out': setZoom((z) => Math.max(25, z - 25)); break;
        case 'zoom-actual': setZoom(100); break;
        case 'zoom-fit': setZoom(100); break;
        case 'mode-camo': setMode('Camo'); break;
        case 'mode-dazzle': setMode('Dazzle'); break;
        case 'mode-blend': setMode('Blend'); break;
        case 'regenerate': regenerateNewSeed(); break;
        case 'random-seed': regenerateNewSeed(); break;
      }
    };
    window.addEventListener('pixelcamo:menu', handler as EventListener);
    return () => window.removeEventListener('pixelcamo:menu', handler as EventListener);
  }, [handleNew, handleOpen, handleSave, handleSaveAs, handleExport, loadPreset, preset, seed, toggle, regenerateNewSeed, setSeed, setZoom]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (e.target instanceof HTMLInputElement) return;
      if (cmd && e.key === 'r') { e.preventDefault(); regenerateNewSeed(); }
      else if (cmd && e.key === 'e') { e.preventDefault(); handleExport(); }
      else if (cmd && e.key === 't') { e.preventDefault(); setTile((t) => !t); }
      else if (cmd && e.key === '1') { e.preventDefault(); setMode('Camo'); }
      else if (cmd && e.key === '2') { e.preventDefault(); setMode('Dazzle'); }
      else if (cmd && e.key === '3') { e.preventDefault(); setMode('Blend'); }
      else if (cmd && e.key === '=') { e.preventDefault(); setZoom((z) => Math.min(200, z + 25)); }
      else if (cmd && e.key === '-') { e.preventDefault(); setZoom((z) => Math.max(25, z - 25)); }
      else if (cmd && e.key === '0') { e.preventDefault(); setZoom(100); }
      else if (cmd && e.key === '9') { e.preventDefault(); setZoom(100); }
      else if (e.key === ' ' && !cmd) { e.preventDefault(); regenerateNewSeed(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regenerateNewSeed, handleExport]);

  // ── Aerial: switch export size defaults when entering/leaving ─
  useEffect(() => {
    if (mode === 'Aerial' && !AERIAL_SIZE_PRESET_NAMES.includes(exportSize)) {
      const preset = SIZE_PRESETS['Garage Flat (5×3m)'];
      setExportSize('Garage Flat (5×3m)');
      setExportW(preset.w); setExportH(preset.h); setDpi(preset.dpi as 150 | 300 | 600);
    } else if (mode !== 'Aerial' && !STANDARD_SIZE_PRESET_NAMES.includes(exportSize)) {
      const preset = SIZE_PRESETS['1K Square'];
      setExportSize('1K Square');
      setExportW(preset.w); setExportH(preset.h); setDpi(preset.dpi as 150 | 300 | 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Document title (production) ──────────────────────────────
  useEffect(() => {
    if (isDevWrapper) return;
    const name = docPath ? docPath.split('/').pop() : 'Untitled.pcm';
    document.title = `Pixelcamo — ${name}${dirty ? ' · edited' : ''}`;
  }, [docPath, dirty, isDevWrapper]);

  // ── Render ───────────────────────────────────────────────────
  const appContent = (
    <>
      <div className="app-body" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <Sidebar
          mode={mode} setMode={setMode}
          preset={preset} setPreset={setPreset}
          paletteName={paletteName} setPaletteName={setPaletteName}
          palette={palette} setPalette={setPalette}
          selectedSwatch={selectedSwatch} setSelectedSwatch={setSelectedSwatch}
          seed={seed} setSeed={setSeed}
          pixelScale={pixelScale} setPixelScale={setPixelScale}
          density={density} setDensity={setDensity}
          passes={passes} setPasses={setPasses}
          blendOpacity={blendOpacity} setBlendOpacity={setBlendOpacity}
          blendType={blendType} setBlendType={setBlendType}
          blendBMode={blendBMode} setBlendBMode={setBlendBMode}
          blendBPixelScale={blendBPixelScale} setBlendBPixelScale={setBlendBPixelScale}
          blendBDensity={blendBDensity} setBlendBDensity={setBlendBDensity}
          blendBPasses={blendBPasses} setBlendBPasses={setBlendBPasses}
          textureType={textureType} setTextureType={setTextureType}
          tex={tex} setT={setT}
          harmonyBase={harmonyBase} setHarmonyBase={setHarmonyBase}
          harmonyType={harmonyType} setHarmonyType={setHarmonyType}
          open={open} toggle={toggle}
          onApplyHarmony={handleApplyHarmony}
          presetModified={presetModified}
          loadPreset={loadPreset}
          onRandomiseSeed={regenerateNewSeed}
          onSavePalette={handleSavePalette}
          onLoadPalette={handleLoadPalette}
          roofType={roofType} setRoofType={setRoofType}
          sunAngle={sunAngle} setSunAngle={setSunAngle}
          sunElevation={sunElevation} setSunElevation={setSunElevation}
          shadowDepth={shadowDepth} setShadowDepth={setShadowDepth}
          weathering={weathering} setWeathering={setWeathering}
          zoneCount={zoneCount} setZoneCount={setZoneCount}
          onAerialPaletteChange={handleAerialPaletteChange}
          exportSize={exportSize} setExportSize={setExportSize}
          exportW={exportW} setExportW={setExportW}
          exportH={exportH} setExportH={setExportH}
          dpi={dpi} setDpi={setDpi}
          format={format} setFormat={setFormat}
          onExport={handleExport}
        />
        <CanvasPane
          mode={mode}
          preset={preset}
          paletteName={paletteName}
          passes={passes}
          seed={seed}
          tile={tile} setTile={setTile}
          zoom={zoom} setZoom={setZoom}
          rects={rects}
          blendRects={blendRects}
          blendDazzleShapes={blendDazzleShapes}
          blendBMode={blendBMode}
          aerialRects={aerialRects}
          sunAngle={sunAngle}
          sunElevation={sunElevation}
          shadowDepth={shadowDepth}
          blendOpacity={blendOpacity}
          blendType={blendType}
          dazzleShapes={dazzleShapes}
          textureType={textureType}
          tex={tex}
          palette={palette}
          dpi={dpi}
          exportSize={exportSize}
          exportW={exportSize === 'Custom' ? exportW : (SIZE_PRESETS[exportSize]?.w ?? exportW)}
          exportH={exportSize === 'Custom' ? exportH : (SIZE_PRESETS[exportSize]?.h ?? exportH)}
          presetModified={presetModified}
          onRegenerateNewSeed={regenerateNewSeed}
          onExport={handleExport}
          onBoxChange={handleBoxChange}
        />
      </div>
      <Statusline
        status={status}
        genMs={genMsRef.current}
        cols={cols}
        rows={rows}
        rectCount={rectCount}
      />
    </>
  );

  return appContent;
}
