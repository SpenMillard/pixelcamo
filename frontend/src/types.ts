export type Mode = 'Camo' | 'Dazzle' | 'Blend';
export type TextureType = 'None' | 'Stipple' | 'Hatch' | 'Scratch' | 'Grain' | 'Hex' | 'Streak';
export type BlendType = 'Normal' | 'Multiply' | 'Screen' | 'Overlay' | 'Soft-light' | 'Difference';
export type HarmonyType = 'Complementary' | 'Analogous' | 'Triadic' | 'Split-comp' | 'Tetradic' | 'Mono';
export type ExportFormat = 'PNG' | 'PDF';
export type Passes = 1 | 2 | 3;

export interface TextureParams {
  opacity: number;
  scale: number;
  density: number;
  angle: number;
  spread: number;
  cross: boolean;
  length: number;
  color: string;
  blend: string;
  // Grain
  intensity: number;
  // Hex
  cellSize: number;
  lineWeight: number;
  square: boolean;
  // Streak
  direction: number;
  waviness: number;
  weight: number;
}

export interface SectionOpen {
  pattern: boolean;
  palette: boolean;
  params: boolean;
  texture: boolean;
  harmony: boolean;
  export: boolean;
}

export interface PcmDocument {
  version: number;
  mode: string;
  preset: string;
  palette: string[];
  params: {
    pixel_scale: number;
    density: number;
    passes: number;
    seed: number;
  };
  blend: { opacity: number; type: string };
  blendB?: { mode: string; pixelScale: number; density: number; passes: number };
  texture: {
    type: string;
    opacity: number;
    scale: number;
    density: number;
    angle: number;
    spread: number;
    cross: boolean;
    length: number;
    color: string;
    blend: string;
    intensity?: number;
    cellSize?: number;
    lineWeight?: number;
    square?: boolean;
    direction?: number;
    waviness?: number;
    weight?: number;
  };
  harmony: { base: string; type: string };
  tile: boolean;
  _path?: string;
}

export interface ExportOpts {
  width: number;
  height: number;
  dpi: number;
  format: string;
}

export interface PatternShape {
  pts: [number, number][];
  fill: string;
}
