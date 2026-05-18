// Pixelcamo — Tweaks panel
// Live-tweakable visual variants for the dark studio app.

function PixelcamoTweaks() {
  const [t, setTweak] = useTweaks(window.PIXELCAMO_TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement;

    // Accent palette derived from hex
    const a = t.accent;
    const lighten = (hex, amt = 0.12) => {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      r = Math.min(255, Math.round(r + (255 - r) * amt));
      g = Math.min(255, Math.round(g + (255 - g) * amt));
      b = Math.min(255, Math.round(b + (255 - b) * amt));
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const darken = (hex, amt = 0.18) => {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      r = Math.max(0, Math.round(r * (1 - amt)));
      g = Math.max(0, Math.round(g * (1 - amt)));
      b = Math.max(0, Math.round(b * (1 - amt)));
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent-hi', lighten(a));
    root.style.setProperty('--accent-lo', darken(a));
    root.style.setProperty('--accent-tint', a + '24');
    root.style.setProperty('--accent-line', a + '5a');

    // Background tone
    const tones = {
      'Near-black': { bg0:'#0a0a0b', bg1:'#0d0d0e', bg2:'#121214', bg3:'#18181b', bg4:'#1f1f23', bg5:'#2a2a2f' },
      'Charcoal':   { bg0:'#141416', bg1:'#1a1a1d', bg2:'#202024', bg3:'#27272c', bg4:'#2e2e35', bg5:'#3a3a42' },
      'Warm dark':  { bg0:'#0e0c0a', bg1:'#13110e', bg2:'#1a1814', bg3:'#221f1a', bg4:'#2a2620', bg5:'#34302a' },
      'Slate':      { bg0:'#0b0f15', bg1:'#0f141b', bg2:'#141a23', bg3:'#1a2230', bg4:'#22293a', bg5:'#2c3447' },
    };
    const T = tones[t.tone] || tones['Near-black'];
    Object.entries(T).forEach(([k, v]) => root.style.setProperty('--' + k.replace('bg', 'bg-'), v));

    window.__tweaks = t;
  }, [t.accent, t.tone, t.density, t.palette]);

  return (
    <TweaksPanel title="Pixelcamo">
      <TweakSection label="Accent" />
      <TweakColor label="Studio accent" value={t.accent}
        options={['#e8952a', '#27c2c2', '#d6479a', '#b4d635']}
        onChange={(v) => setTweak('accent', v)} />

      <TweakSection label="Window" />
      <TweakSelect label="Background tone" value={t.tone}
        options={['Near-black', 'Charcoal', 'Warm dark', 'Slate']}
        onChange={(v) => setTweak('tone', v)} />
      <TweakRadio label="Density" value={t.density}
        options={['Compact', 'Cozy']}
        onChange={(v) => setTweak('density', v)} />

      <TweakSection label="Pattern" />
      <TweakSelect label="Default palette" value={t.palette}
        options={['Forest', 'Desert', 'Urban', 'Arctic', 'Night', 'Coral']}
        onChange={(v) => setTweak('palette', v)} />
    </TweaksPanel>
  );
}

window.PixelcamoTweaks = PixelcamoTweaks;
