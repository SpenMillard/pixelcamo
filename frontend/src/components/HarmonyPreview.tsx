import { useMemo } from 'react';
import type { HarmonyType } from '../types';

interface HarmonyPreviewProps {
  base: string;
  type: HarmonyType;
}

export function HarmonyPreview({ base, type }: HarmonyPreviewProps) {
  const colors = useMemo(() => {
    const h = base.replace('#', '');
    if (h.length !== 6) return Array(5).fill(base) as string[];
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
      H = ((H % 360) + 360) % 360;
      S = Math.max(0, Math.min(1, S));
      L = Math.max(0, Math.min(1, L));
      const c = (1 - Math.abs(2 * L - 1)) * S;
      const x = c * (1 - Math.abs((H / 60) % 2 - 1));
      const m = L - c / 2;
      let rr = 0, gg = 0, bb = 0;
      if (H < 60) { rr = c; gg = x; }
      else if (H < 120) { rr = x; gg = c; }
      else if (H < 180) { gg = c; bb = x; }
      else if (H < 240) { gg = x; bb = c; }
      else if (H < 300) { rr = x; bb = c; }
      else { rr = c; bb = x; }
      const f = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
      return '#' + f(rr) + f(gg) + f(bb);
    };

    const offsets: Record<HarmonyType, number[]> = {
      'Complementary': [0, 180, 30, -30, 120],
      'Analogous':     [0, -30, -15, 15, 30],
      'Triadic':       [0, 120, 240, 60, 180],
      'Split-comp':    [0, 150, 210, 30, -30],
      'Tetradic':      [0, 90, 180, 270, 45],
      'Mono':          [0, 0, 0, 0, 0],
    };

    const off = offsets[type] ?? offsets['Complementary'];
    return off.map((o, i) => {
      if (type === 'Mono') return hslHex(hue, s, Math.max(0.1, Math.min(0.9, l + (i - 2) * 0.12)));
      return hslHex(hue + o, s, l);
    });
  }, [base, type]);

  return (
    <div className="harmony-preview">
      {colors.map((c, i) => (
        <div key={i} className="c" style={{ background: c }} title={c} />
      ))}
    </div>
  );
}
