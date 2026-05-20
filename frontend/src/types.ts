export type Mode = 'Camo' | 'Dazzle' | 'Blend' | 'Aerial';
export type TextureType = 'None' | 'Stipple' | 'Hatch' | 'Scratch' | 'Grain' | 'Hex' | 'Streak';
export type BlendType = 'Normal' | 'Multiply' | 'Screen' | 'Overlay' | 'Soft-light' | 'Difference';
export type HarmonyType = 'Complementary' | 'Analogous' | 'Triadic' | 'Split-comp' | 'Tetradic' | 'Mono';
export type ExportFormat = 'PNG' | 'PDF';
export type Passes = 1 | 2 | 3;
export type RoofType = 'pitched' | 'flat';
export type TileState = 'off' | 'guides' | 'preview';

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
  paletteName?: string;
  palette: string[];
  locked?: boolean[];
  params: {
    pixel_scale: number;
    density: number;
    passes: number;
    seed: number;
    microEnabled?: boolean;
    microScale?: number;
    microWeight?: number;
  };
  blend: { opacity: number; type: string };
  blendB?: { mode: string; pixelScale: number; density: number; passes: number };
  aerial?: {
    roofType: string;
    sunAngle: number;
    sunElevation: number;
    shadowDepth: number;
    weathering: number;
    zoneCount: number;
  };
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
