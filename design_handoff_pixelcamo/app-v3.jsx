// ─────────────────────────────────────────────────────────────
// Pixelcamo — main App component
// Loaded after app-parts.jsx (provides Section, LabelSlider, PaletteEditor, TextureControls, HarmonyPreview, PIXELCAMO_DATA)
// ─────────────────────────────────────────────────────────────

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useCB } = React;

function PixelcamoApp() {
  const { PALETTES, PRESETS, TEXTURE_TYPES, HARMONY_TYPES, BLEND_TYPES, SIZE_PRESETS, Icon, fmt } = window.PIXELCAMO_DATA;
  const t = {};

  // ── Preset library: each preset is a complete snapshot ──
  const PRESETS_DATA = {
    'M81 Woodland':    { mode: 'Camo',   paletteName: 'Forest', palette: [...PALETTES.Forest], pixelScale: 14, density: 58, passes: 2, textureType: 'None' },
    'MARPAT Digital':  { mode: 'Camo',   paletteName: 'Forest', palette: [...PALETTES.Forest], pixelScale: 6,  density: 70, passes: 2, textureType: 'None' },
    'Flecktarn Mod':   { mode: 'Camo',   paletteName: 'Forest', palette: [...PALETTES.Forest], pixelScale: 8,  density: 75, passes: 3, textureType: 'Stipple' },
    'Razzle Dazzle':   { mode: 'Dazzle', paletteName: 'Urban',  palette: [...PALETTES.Urban],  pixelScale: 22, density: 35, passes: 1, textureType: 'None' },
    'Urban Splinter':  { mode: 'Camo',   paletteName: 'Urban',  palette: [...PALETTES.Urban],  pixelScale: 12, density: 45, passes: 2, textureType: 'Hatch' },
    'Tiger Stripe':    { mode: 'Camo',   paletteName: 'Forest', palette: [...PALETTES.Forest], pixelScale: 18, density: 65, passes: 2, textureType: 'Scratch' },
    'Sahara Tan':      { mode: 'Camo',   paletteName: 'Desert', palette: [...PALETTES.Desert], pixelScale: 16, density: 50, passes: 2, textureType: 'None' },
    'Arctic Splinter': { mode: 'Camo',   paletteName: 'Arctic', palette: [...PALETTES.Arctic], pixelScale: 14, density: 55, passes: 2, textureType: 'None' },
    'Night Patrol':    { mode: 'Blend',  paletteName: 'Night',  palette: [...PALETTES.Night],  pixelScale: 10, density: 60, passes: 3, textureType: 'Stipple' },
  };
  const PRESET_NAMES = Object.keys(PRESETS_DATA);

  // ── Tweakable / state ──
  const [mode, setMode] = useS('Camo');
  const [preset, setPreset] = useS('M81 Woodland');
  const [paletteName, setPaletteName] = useS('Forest');
  const [palette, setPalette] = useS([...PALETTES.Forest]);
  const [selectedSwatch, setSelectedSwatch] = useS(0);
  const [pixelScale, setPixelScale] = useS(14);
  const [density, setDensity] = useS(58);
  const [passes, setPasses] = useS(2);
  const [seed, setSeed] = useS(42081);
  const [tile, setTile] = useS(true);
  const [zoom, setZoom] = useS(100);

  const [blendOpacity, setBlendOpacity] = useS(72);
  const [blendType, setBlendType] = useS('Soft-light');

  const [textureType, setTextureType] = useS('Stipple');
  const [tex, setTex] = useS({
    opacity: 36, scale: 3, density: 65, angle: 45, spread: 6,
    cross: false, length: 12, color: '#0d0d0e', blend: 'Multiply',
  });
  const setT = (k, v) => setTex(prev => ({ ...prev, [k]: v }));

  const [harmonyOpen, setHarmonyOpen] = useS(false);
  const [harmonyBase, setHarmonyBase] = useS('#e8952a');
  const [harmonyType, setHarmonyType] = useS('Triadic');

  const [exportSize, setExportSize] = useS('1K Square');
  const [dpi, setDpi] = useS(300);
  const [format, setFormat] = useS('PNG');

  // ── Section open state (multi-open) ──
  const [open, setOpen] = useS({
    pattern: true, palette: true, params: true, texture: true, harmony: false, export: false,
  });
  const toggle = (k) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));

  // ── Load a preset (overwrites palette + params + texture + mode) ──
  const loadPreset = (name) => {
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
  };

  // ── Compute whether the current state has diverged from the preset ──
  const presetModified = useM(() => {
    const p = PRESETS_DATA[preset];
    if (!p) return false;
    return mode !== p.mode
        || pixelScale !== p.pixelScale
        || density !== p.density
        || passes !== p.passes
        || textureType !== p.textureType
        || JSON.stringify(palette) !== JSON.stringify(p.palette);
  }, [preset, mode, pixelScale, density, passes, textureType, palette]);

  // ── Seed initial state from the default preset on mount ──
  useE(() => { loadPreset(preset); /* eslint-disable-next-line */ }, []);

  // ── Update palette from preset/tweak palette ──
  useE(() => {
    // when tweak palette changes, swap colors
    if (t.palette && PALETTES[t.palette]) {
      setPaletteName(t.palette);
      setPalette([...PALETTES[t.palette]]);
    }
  }, [t.palette]);

  // ── Canvas sizing (fluid) ──
  const canvasWrapRef = useR(null);
  const [canvasBox, setCanvasBox] = useS({ w: 640, h: 480 });
  useE(() => {
    if (!canvasWrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const el = canvasWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // target frame: fit inside with padding, aspect 4:3 for now
      const pad = 60;
      const aw = rect.width - pad * 2;
      const ah = rect.height - pad * 2;
      const aspect = 4 / 3;
      let w = aw, h = aw / aspect;
      if (h > ah) { h = ah; w = ah * aspect; }
      setCanvasBox({ w: Math.max(120, Math.round(w)), h: Math.max(90, Math.round(h)) });
    });
    ro.observe(canvasWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Pattern generation (memoised) ──
  const pattern = useM(() => {
    return window.generateCamo({
      width: canvasBox.w, height: canvasBox.h,
      palette, pixelScale, density, passes, seed,
    });
  }, [canvasBox.w, canvasBox.h, palette, pixelScale, density, passes, seed]);

  const rects = useM(() => window.camoToRects({ ...pattern, palette }), [pattern, palette]);

  // ── Actions ──
  const regenerate = () => setSeed(Math.floor(Math.random() * 999999));
  const reset = () => loadPreset(preset);
  const copySeed = () => navigator.clipboard?.writeText(String(seed));

  // ── Keyboard shortcuts ──
  useE(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 'r') { e.preventDefault(); regenerate(); }
      else if (cmd && e.key.toLowerCase() === 'e') { e.preventDefault(); /* export */ }
      else if (cmd && e.key.toLowerCase() === 't') { e.preventDefault(); setTile(t => !t); }
      else if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); regenerate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Texture overlay SVG (visual placeholder over canvas) ──
  const textureOverlay = useM(() => {
    if (textureType === 'None') return null;
    const opacity = tex.opacity / 100;

    if (textureType === 'Stipple') {
      const dots = [];
      const r = mulberry32(seed + 13);
      const count = Math.floor((canvasBox.w * canvasBox.h) / (200 - tex.density));
      for (let i = 0; i < count; i++) {
        dots.push(<circle key={i} cx={r() * canvasBox.w} cy={r() * canvasBox.h}
          r={tex.scale * 0.4} fill={tex.color} />);
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() }}>{dots}</g>;
    }
    if (textureType === 'Hatch') {
      const lines = [];
      const spread = tex.spread;
      const angle = tex.angle * Math.PI / 180;
      const diag = Math.hypot(canvasBox.w, canvasBox.h);
      const steps = Math.ceil(diag / spread);
      for (let i = -steps; i < steps; i++) {
        const offset = i * spread;
        const x1 = canvasBox.w/2 + Math.cos(angle) * -diag + Math.sin(angle) * offset;
        const y1 = canvasBox.h/2 + Math.sin(angle) * -diag - Math.cos(angle) * offset;
        const x2 = canvasBox.w/2 + Math.cos(angle) *  diag + Math.sin(angle) * offset;
        const y2 = canvasBox.h/2 + Math.sin(angle) *  diag - Math.cos(angle) * offset;
        lines.push(<line key={'h'+i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={tex.color} strokeWidth={tex.scale * 0.4} />);
      }
      if (tex.cross) {
        const a2 = angle + Math.PI/2;
        for (let i = -steps; i < steps; i++) {
          const offset = i * spread;
          const x1 = canvasBox.w/2 + Math.cos(a2) * -diag + Math.sin(a2) * offset;
          const y1 = canvasBox.h/2 + Math.sin(a2) * -diag - Math.cos(a2) * offset;
          const x2 = canvasBox.w/2 + Math.cos(a2) *  diag + Math.sin(a2) * offset;
          const y2 = canvasBox.h/2 + Math.sin(a2) *  diag - Math.cos(a2) * offset;
          lines.push(<line key={'x'+i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={tex.color} strokeWidth={tex.scale * 0.4} />);
        }
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() }}>{lines}</g>;
    }
    if (textureType === 'Scratch') {
      const r = mulberry32(seed + 99);
      const count = Math.floor(canvasBox.w / tex.spread);
      const strokes = [];
      for (let i = 0; i < count; i++) {
        const cx = r() * canvasBox.w;
        const cy = r() * canvasBox.h;
        const len = (tex.length || 12) * (0.5 + r());
        const ang = r() * Math.PI * 2;
        strokes.push(<line key={i}
          x1={cx} y1={cy}
          x2={cx + Math.cos(ang) * len} y2={cy + Math.sin(ang) * len}
          stroke={tex.color} strokeWidth={tex.scale * 0.3} strokeLinecap="round" />);
      }
      return <g opacity={opacity} style={{ mixBlendMode: tex.blend.toLowerCase() }}>{strokes}</g>;
    }
    return null;
  }, [textureType, tex, canvasBox.w, canvasBox.h, seed]);

  // ── Sidebar density ──
  const dense = t.density === 'Compact';

  // ── Render ──
  return (
    <div className="desktop">
      {/* macOS menubar */}
      <div className="menubar">
        <div className="menubar-left">
          <span className="menubar-apple">{Icon.apple}</span>
          <span className="menubar-app">Pixelcamo</span>
          <span className="menubar-item">File</span>
          <span className="menubar-item">Edit</span>
          <span className="menubar-item">View</span>
          <span className="menubar-item">Pattern</span>
          <span className="menubar-item">Window</span>
          <span className="menubar-item">Help</span>
        </div>
        <div className="menubar-right">
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>●REC seed</span>
          <span className="menubar-icon">{Icon.battery}</span>
          <span className="menubar-icon">{Icon.wifi}</span>
          <span className="menubar-icon">{Icon.search}</span>
          <span className="menubar-icon">{Icon.cc}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>Wed 21 May  10:42</span>
        </div>
      </div>

      <div className="stage">
        <div className="window" data-screen-label="Pixelcamo Main">
          {/* Titlebar */}
          <div className="titlebar">
            <div className="traffic">
              <span className="dot close" />
              <span className="dot min" />
              <span className="dot max" />
            </div>
            <div className="titlebar-title">
              Pixelcamo
              <span className="doc">— Untitled.pcm · edited</span>
            </div>
            <div className="titlebar-right">
              <span className="status-led" />
              <span>READY</span>
            </div>
          </div>

          <div className="app-body">
            {/* ────────── SIDEBAR ────────── */}
            <aside className="sidebar" style={dense ? { ['--row-h']: '24px' } : {}}>
              <div className="sidebar-scroll">

                {/* PATTERN */}
                <Section title="Pattern" badge={`${preset}${presetModified ? '*' : ''}`}
                  open={open.pattern} onToggle={() => toggle('pattern')}>
                  <div className="row">
                    <span className="label" style={{ flexBasis: 60 }}>Style</span>
                    <select className="select mono"
                      style={{ flex: 1, appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'transparent' }}
                      value={preset}
                      onChange={(e) => loadPreset(e.target.value)}>
                      {PRESET_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button className="btn ghost icon-only"
                      title={presetModified ? `Reset to ${preset}` : 'No changes to reset'}
                      onClick={reset}
                      style={{ opacity: presetModified ? 1 : 0.4 }}>
                      {Icon.refresh}
                    </button>
                  </div>

                  <div className="row">
                    <span className="label" style={{ flexBasis: 60 }}>Mode</span>
                    <div className="seg" style={{ flex: 1 }}>
                      {['Camo', 'Dazzle', 'Blend'].map(m => (
                        <button key={m}
                          className={mode === m ? 'active' : ''}
                          onClick={() => setMode(m)}>{m}</button>
                      ))}
                    </div>
                  </div>

                  {mode === 'Blend' && (
                    <div className="conditional reveal">
                      <div className="cond-head">
                        <span className="name">Blend mix</span>
                      </div>
                      <LabelSlider label="Opacity" min={0} max={100} step={1}
                        value={blendOpacity} onChange={setBlendOpacity} suffix="%" width={60} />
                      <div className="row">
                        <span className="label" style={{ flexBasis: 60 }}>Type</span>
                        <div className="select" style={{ flex: 1 }}>{blendType}</div>
                      </div>
                    </div>
                  )}

                  <div className="row">
                    <span className="label" style={{ flexBasis: 60 }}>Seed</span>
                    <input className="input mono num" style={{ flex: 1 }}
                      value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
                    <button className="btn ghost icon-only" title="Randomise (space)" onClick={regenerate}>
                      {Icon.dice}
                    </button>
                  </div>
                </Section>

                {/* PALETTE */}
                <Section title="Palette" badge={`${palette.length}/8 · ${paletteName}`}
                  open={open.palette} onToggle={() => toggle('palette')}>
                  <PaletteEditor
                    colors={palette}
                    selected={selectedSwatch}
                    onSelect={setSelectedSwatch}
                    onChange={(i, c) => {
                      const next = [...palette]; next[i] = c; setPalette(next);
                    }}
                    onAdd={() => setPalette([...palette, '#888888'])}
                    onRemove={(i) => {
                      if (palette.length <= 2) return;
                      const next = palette.filter((_, idx) => idx !== i);
                      setPalette(next);
                      setSelectedSwatch(Math.min(selectedSwatch, next.length - 1));
                    }}
                  />
                </Section>

                {/* PARAMETERS */}
                <Section title="Parameters" badge={`${pixelScale}px · ${density}%`}
                  open={open.params} onToggle={() => toggle('params')}>
                  <LabelSlider label="Pixel scale" min={4} max={40} step={1}
                    value={pixelScale} onChange={setPixelScale} suffix="px" width={84} />
                  <LabelSlider label="Density" min={0} max={100} step={1}
                    value={density} onChange={setDensity} suffix="%" width={84} />
                  <div className="row">
                    <span className="label wide">Passes</span>
                    <div className="passes" style={{ flex: 1 }}>
                      {[1, 2, 3].map(n => (
                        <button key={n}
                          className={passes === n ? 'active' : ''}
                          onClick={() => setPasses(n)}>{n}</button>
                      ))}
                    </div>
                    <span className="value-right" style={{ color: 'var(--fg-2)' }}>
                      {passes === 1 ? 'fast' : passes === 2 ? 'std' : 'rich'}
                    </span>
                  </div>
                </Section>

                {/* TEXTURE */}
                <Section title="Texture" badge={textureType === 'None' ? 'off' : textureType}
                  open={open.texture} onToggle={() => toggle('texture')}>
                  <div className="row">
                    <span className="label wide">Type</span>
                    <div className="seg" style={{ flex: 1 }}>
                      {TEXTURE_TYPES.map(tt => (
                        <button key={tt}
                          className={textureType === tt ? 'active' : ''}
                          onClick={() => setTextureType(tt)}>{tt === 'None' ? '—' : tt}</button>
                      ))}
                    </div>
                  </div>
                  <TextureControls type={textureType} params={tex} set={setT} />
                </Section>

                {/* HARMONY */}
                <Section title="Colour harmony" badge={harmonyType}
                  open={open.harmony} onToggle={() => toggle('harmony')}>
                  <div className="row">
                    <span className="label wide">Base</span>
                    <div className="picker-row" style={{ flex: 1 }}>
                      <input type="color" className="color-chip"
                        value={harmonyBase}
                        onChange={(e) => setHarmonyBase(e.target.value)} />
                      <input type="text" className="input mono"
                        value={harmonyBase.toUpperCase()}
                        onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setHarmonyBase(e.target.value)} />
                    </div>
                  </div>
                  <div className="row">
                    <span className="label wide">Scheme</span>
                    <div className="select" style={{ flex: 1 }}>{harmonyType}</div>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Preview</div>
                    <HarmonyPreview base={harmonyBase} type={harmonyType} />
                  </div>
                  <button className="btn accent" style={{ marginTop: 6, height: 26, justifyContent: 'center' }}>
                    Apply to palette →
                  </button>
                </Section>

              </div>

              {/* ─── EXPORT (pinned at sidebar bottom) ─── */}
              <div className="section export-section open">
                <div className="section-head open" onClick={() => toggle('export')}>
                  <span className="chev" style={{ transform: open.export ? 'rotate(90deg)' : 'none' }}>{Icon.chev}</span>
                  <span className="title">Export</span>
                  <span className="badge">{format} · {dpi}dpi</span>
                </div>
                {open.export && (
                  <div className="section-body" style={{ display: 'flex' }}>
                    <div className="row">
                      <span className="label" style={{ flexBasis: 60 }}>Size</span>
                      <div className="select" style={{ flex: 1 }}>{exportSize}</div>
                    </div>
                    <div className="export-dim-row">
                      <input className="input mono num" value={SIZE_PRESETS[exportSize].w} readOnly />
                      <span className="x">×</span>
                      <input className="input mono num" value={SIZE_PRESETS[exportSize].h} readOnly />
                      <span className="x" style={{ color: 'var(--fg-3)', fontSize: 10 }}>px</span>
                    </div>
                    <div className="row">
                      <span className="label" style={{ flexBasis: 60 }}>DPI</span>
                      <div className="seg" style={{ flex: 1 }}>
                        {[150, 300, 600].map(d => (
                          <button key={d}
                            className={dpi === d ? 'active' : ''}
                            onClick={() => setDpi(d)}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mm-readout">
                      ≈ {Math.round(SIZE_PRESETS[exportSize].w / dpi * 25.4)} × {Math.round(SIZE_PRESETS[exportSize].h / dpi * 25.4)} mm
                    </div>
                    <div className="row">
                      <span className="label" style={{ flexBasis: 60 }}>Format</span>
                      <div className="seg" style={{ flex: 1 }}>
                        {['PNG', 'PDF'].map(f => (
                          <button key={f}
                            className={format === f ? 'active' : ''}
                            onClick={() => setFormat(f)}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <button className="btn accent primary-export" title="⌘E">
                      {Icon.download} Export {format}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* ────────── CANVAS PANE ────────── */}
            <main className="canvas-pane">
              {/* toolbar */}
              <div className="canvas-toolbar">
                <div className="toolbar-left">
                  <span className="mode-badge">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
                    {mode}
                  </span>
                  <span className="crumb">
                    <span className="doc">{preset}{presetModified ? '*' : ''}</span>
                    <span className="crumb-secondary">
                      <span className="sep">›</span>
                      <span>{paletteName}</span>
                      <span className="sep">›</span>
                      <span>{passes}-pass</span>
                    </span>
                  </span>
                </div>
                <div className="toolbar-right">
                  <span className="value mono toolbar-seed" style={{ color: 'var(--accent)' }}>#{seed.toString().padStart(6, '0')}</span>
                  <div className="toolbar-sep" />
                  <button className="btn ghost toolbar-tile" onClick={() => setTile(!tile)} title="Toggle tile (⌘T)">
                    <span style={{ color: tile ? 'var(--accent)' : 'var(--fg-3)' }}>{Icon.tile}</span>
                    <span className="btn-label">Tile</span>
                    <span className="mono" style={{ color: tile ? 'var(--accent)' : 'var(--fg-3)', fontSize: 10 }}>
                      {tile ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button className="btn toolbar-primary" title="⌘E">
                    {Icon.download} <span className="btn-label">Export</span>
                  </button>
                  <button className="btn accent toolbar-primary" onClick={regenerate} title="Regenerate (⌘R)">
                    {Icon.refresh} <span className="btn-label">Regenerate</span>
                  </button>
                </div>
              </div>

              {/* canvas */}
              <div className="canvas-area" ref={canvasWrapRef} onClick={(e) => {
                // click-to-regenerate when clicking empty space
                if (e.target === e.currentTarget) regenerate();
              }}>
                <div className="canvas-frame" style={{
                  width: canvasBox.w * (zoom / 100),
                  height: canvasBox.h * (zoom / 100),
                }} onClick={regenerate}>
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />

                  <span className="canvas-dim">
                    {SIZE_PRESETS[exportSize].w} × {SIZE_PRESETS[exportSize].h}px · {dpi} dpi
                  </span>
                  <span className="canvas-dim right">{paletteName.toUpperCase()} · {palette.length}c</span>

                  <svg className="camo-svg"
                    viewBox={`0 0 ${canvasBox.w} ${canvasBox.h}`}
                    width="100%" height="100%"
                    preserveAspectRatio="xMidYMid slice"
                    shapeRendering="crispEdges">
                    {rects.map((r, i) => (
                      <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
                    ))}
                    {textureOverlay}
                    {/* tile guides */}
                    {tile && (
                      <>
                        <line x1={canvasBox.w/2} y1={0} x2={canvasBox.w/2} y2={canvasBox.h}
                          stroke="rgba(232,149,42,0.25)" strokeWidth="1" strokeDasharray="4 6" />
                        <line x1={0} y1={canvasBox.h/2} x2={canvasBox.w} y2={canvasBox.h/2}
                          stroke="rgba(232,149,42,0.25)" strokeWidth="1" strokeDasharray="4 6" />
                      </>
                    )}
                  </svg>
                </div>

                <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setZoom(Math.max(25, zoom - 25))}>−</button>
                  <span className="zoom-readout">{zoom}%</span>
                  <button onClick={() => setZoom(Math.min(200, zoom + 25))}>+</button>
                  <div style={{ width: 0.5, height: 16, background: 'var(--line-3)', margin: '0 2px' }} />
                  <button onClick={() => setZoom(100)} title="Fit">⤢</button>
                </div>
              </div>

              {/* export bar removed in v2 — moved into sidebar */}
            </main>
          </div>

          {/* statusline */}
          <div className="statusline">
            <div className="item">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)' }} />
              <strong>Idle</strong>
              <span className="sep">·</span>
              <span>generated in 18ms</span>
            </div>
            <div className="item">
              <span>Tiles</span>
              <strong>{pattern.cols} × {pattern.rows}</strong>
              <span className="sep">·</span>
              <strong>{fmt(pattern.cols * pattern.rows)}</strong>
              <span>cells</span>
            </div>
            <div className="item">
              <span>Render</span>
              <strong>{rects.length}</strong>
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
            </div>
          </div>
        </div>
      </div>

      {/* Tweaks panel removed in v3 — Paper Studio is committed */}
    </div>
  );
}

window.PixelcamoApp = PixelcamoApp;
