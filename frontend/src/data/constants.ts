export const PALETTES: Record<string, string[]> = {
  // ── Camo palettes ──────────────────────────────────────────────
  Woodland:  ['#4a5240', '#6b7a5e', '#3d3028', '#8a9278', '#2e3a2a'],

  Desert:    ['#c8a96e', '#a07840', '#786040', '#d4b888', '#5a4830'],
  Urban:     ['#7a7a7a', '#555555', '#9a9a9a', '#3c3c3c', '#b0b0b0'],
  Arctic:    ['#d8dce0', '#a8b4bc', '#eef2f4', '#7a8a94', '#c0c8cc'],
  Jungle:    ['#2d4a1e', '#4a6a30', '#1a2e14', '#6a8a4a', '#3a5a28'],
  Tarmac:    ['#3a3a38', '#282828', '#4e4e4c', '#1e1e1c', '#626260'],
  Concrete:  ['#8a8a82', '#6e6e68', '#a0a098', '#545450', '#bcbcb4'],
  Brick:     ['#7a4a38', '#5c3428', '#9a6248', '#3e2218', '#b87a5a'],
  Gravel:    ['#7a7268', '#5e5850', '#948c80', '#46423c', '#aaa49c'],
  Soil:      ['#4a3828', '#362818', '#5e4c38', '#241a10', '#444444'],
  Midnight:  ['#06070c', '#0d0f18', '#030408', '#14161f', '#020309'],
  Night:     ['#06070c', '#0d0f18', '#030408', '#14161f', '#020309'],
  // ── Dazzle palettes ────────────────────────────────────────────
  'B/W':   ['#000000', '#ffffff', '#1a1a1a', '#e0e0e0'],
  'Blue':  ['#000000', '#ffffff', '#1a3a6e', '#4a8ac8'],
  'Red':   ['#000000', '#ffffff', '#8b0000', '#cc2200'],
  'Gold':  ['#000000', '#f5c400', '#1a1a1a', '#fff8d0'],

  // ── UK Rooftop palettes (Aerial mode) ──────────────────────────
  // 4 swatches: light zone · mid zone · dark/shadow · stain/algae
  'Welsh Slate':           ['#8888a0', '#707080', '#585868', '#404048'],
  'Clay Plain Tile':       ['#a07060', '#906858', '#7a6858', '#504038'],
  'Clay Pantile':          ['#b08878', '#906858', '#786050', '#4a3830'],
  'Concrete Interlocking': ['#908880', '#787068', '#605850', '#484038'],
  'Fibre Cement Slate':    ['#909098', '#787880', '#606068', '#484850'],
  'Flat Bitumen':          ['#2a2820', '#38342c', '#46423a', '#1e1c16'],
  'Flat EPDM':             ['#4e4e56', '#686874', '#38383e', '#28282e'],
  'Flat GRP':              ['#c8c4b8', '#b0ac9c', '#989488', '#787470'],
  'Flat Aggregate':        ['#b0a898', '#908880', '#706860', '#504840'],
};

export const CAMO_PALETTE_NAMES = [
  'Woodland', 'Desert', 'Urban', 'Arctic', 'Jungle',
  'Tarmac', 'Concrete', 'Brick', 'Gravel', 'Soil', 'Midnight', 'Night',
];

export const DAZZLE_PALETTE_NAMES = ['B/W', 'Blue', 'Red', 'Gold'];

export const AERIAL_PALETTE_NAMES = [
  'Welsh Slate', 'Clay Plain Tile', 'Clay Pantile',
  'Concrete Interlocking', 'Fibre Cement Slate',
  'Flat Bitumen', 'Flat EPDM', 'Flat GRP', 'Flat Aggregate',
];

/** Palette names that trigger the flat-roof generator path */
export const FLAT_AERIAL_PALETTES = new Set([
  'Flat Bitumen', 'Flat EPDM', 'Flat GRP', 'Flat Aggregate',
]);

export type PresetSnapshot = {
  mode: 'Camo' | 'Dazzle' | 'Blend';
  paletteName: string;
  palette: string[];
  pixelScale: number;
  density: number;
  passes: 1 | 2 | 3;
  textureType: 'None' | 'Stipple' | 'Hatch' | 'Scratch' | 'Grain' | 'Hex' | 'Streak';
};

export const PRESETS_DATA: Record<string, PresetSnapshot> = {
  'M81 Woodland':    { mode: 'Camo',   paletteName: 'Woodland', palette: PALETTES.Woodland,  pixelScale: 14, density: 58, passes: 2, textureType: 'None' },
  'MARPAT Digital':  { mode: 'Camo',   paletteName: 'Woodland', palette: PALETTES.Woodland,  pixelScale: 6,  density: 70, passes: 2, textureType: 'None' },
  'Flecktarn Mod':   { mode: 'Camo',   paletteName: 'Woodland', palette: PALETTES.Woodland,  pixelScale: 8,  density: 75, passes: 3, textureType: 'Stipple' },
  'Razzle Dazzle':   { mode: 'Dazzle', paletteName: 'Urban',  palette: PALETTES.Urban,   pixelScale: 22, density: 35, passes: 1, textureType: 'None' },
  'Urban Splinter':  { mode: 'Camo',   paletteName: 'Urban',  palette: PALETTES.Urban,   pixelScale: 12, density: 45, passes: 2, textureType: 'Hatch' },
  'Tiger Stripe':    { mode: 'Camo',   paletteName: 'Woodland', palette: PALETTES.Woodland,  pixelScale: 18, density: 65, passes: 2, textureType: 'Scratch' },
  'Sahara Tan':      { mode: 'Camo',   paletteName: 'Desert', palette: PALETTES.Desert,  pixelScale: 16, density: 50, passes: 2, textureType: 'None' },
  'Arctic Splinter': { mode: 'Camo',   paletteName: 'Arctic', palette: PALETTES.Arctic,  pixelScale: 14, density: 55, passes: 2, textureType: 'None' },
  'Night Patrol':    { mode: 'Blend',  paletteName: 'Night',  palette: PALETTES.Night,   pixelScale: 10, density: 60, passes: 3, textureType: 'Stipple' },
};

export const PRESETS = Object.keys(PRESETS_DATA);

export const PRESET_PALETTE_MAP: Record<string, string> = {
  'M81 Woodland':   'Forest',
  'MARPAT Digital': 'Woodland',
  'Flecktarn Mod':  'Forest',
  'Razzle Dazzle':  'Urban',
  'Urban Splinter': 'Urban',
  'Tiger Stripe':   'Forest',
  'Sahara Tan':     'Desert',
  'Arctic Splinter': 'Arctic',
  'Night Patrol':   'Night',
};

export const TEXTURE_TYPES = ['None', 'Stipple', 'Hatch', 'Scratch', 'Grain', 'Hex', 'Streak'] as const;
export const HARMONY_TYPES = [
  'Complementary', 'Analogous', 'Triadic', 'Split-comp', 'Tetradic', 'Mono',
] as const;
export const BLEND_TYPES = [
  'Normal', 'Multiply', 'Screen', 'Overlay', 'Soft-light', 'Difference',
] as const;

export const SIZE_PRESETS: Record<string, { w: number; h: number; dpi: number }> = {
  // Standard
  'A4 (Portrait)':          { w: 2480, h: 3508, dpi: 300 },
  'A3 (Portrait)':          { w: 3508, h: 4961, dpi: 300 },
  '1K Square':              { w: 1024, h: 1024, dpi: 150 },
  '2K Square':              { w: 2048, h: 2048, dpi: 300 },
  'Tile 512':               { w: 512,  h: 512,  dpi: 72  },
  // Aerial / tarpaulin print sizes (150dpi = adequate for large-format print)
  'Garage Flat (5×3m)':     { w: 2953, h: 1772, dpi: 150 },
  'Extension Flat (4×4m)':  { w: 2362, h: 2362, dpi: 150 },
  'Terrace Pitched (7×6m)': { w: 4134, h: 3543, dpi: 150 },
  'Large Flat (10×8m)':     { w: 5906, h: 4724, dpi: 150 },
  // Always last
  'Custom':                 { w: 1600, h: 1200, dpi: 300 },
};

export const STANDARD_SIZE_PRESET_NAMES = [
  'A4 (Portrait)', 'A3 (Portrait)', '1K Square', '2K Square', 'Tile 512', 'Custom',
];

export const AERIAL_SIZE_PRESET_NAMES = [
  'Garage Flat (5×3m)', 'Extension Flat (4×4m)',
  'Terrace Pitched (7×6m)', 'Large Flat (10×8m)', 'Custom',
];

export const DEFAULT_TEXTURE = {
  opacity: 36, scale: 3, density: 65, angle: 45, spread: 6,
  cross: false, length: 12, color: '#0d0d0e', blend: 'Multiply',
  // Grain
  intensity: 1.0,
  // Hex
  cellSize: 40, lineWeight: 1, square: false,
  // Streak
  direction: 90, waviness: 0.3, weight: 1,
};
