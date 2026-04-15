// ─── Core Types ───

export interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

export enum BladeState {
  OFF = 'off',
  IGNITING = 'igniting',
  ON = 'on',
  RETRACTING = 'retracting',
}

// ─── Style System ───

export interface StyleContext {
  time: number;
  swingSpeed: number; // 0-1 normalized
  bladeAngle: number; // -1 to 1
  twistAngle: number; // -1 to 1
  soundLevel: number; // 0-1 normalized
  batteryLevel: number; // 0-1
  config: BladeConfig;
}

export interface BladeStyle {
  id: string;
  name: string;
  description: string;
  /** Returns the color for a given LED position (0-1) at a given time */
  getColor(position: number, time: number, context: StyleContext): RGB;
}

// ─── Effect System ───

export type EffectType =
  | 'clash'
  | 'lockup'
  | 'blast'
  | 'drag'
  | 'melt'
  | 'lightning'
  | 'stab'
  | 'force';

export interface EffectParams {
  position?: number; // 0-1, where on the blade the effect occurs
  color?: RGB;
  duration?: number; // ms
  segmentId?: string; // target segment for independent effect scoping
}

export interface EffectContext extends StyleContext {
  elapsed: number; // ms since effect triggered
  progress: number; // 0-1, elapsed / duration
}

export interface BladeEffect {
  id: string;
  type: EffectType;
  /** Apply effect color modification at a position */
  apply(color: RGB, position: number, context: EffectContext): RGB;
  /** Whether this effect is currently active */
  isActive(): boolean;
  /** Trigger the effect */
  trigger(params: EffectParams): void;
  /** Release a sustained effect (lockup, drag, etc.) */
  release(): void;
  /** Reset the effect to inactive state */
  reset(): void;
}

// ─── Ignition System ───

export interface IgnitionContext {
  bladeAngle: number;   // -1 to 1
  swingSpeed: number;   // 0-1
  twistAngle: number;   // -1 to 1
  config?: BladeConfig;
}

export interface IgnitionAnimation {
  id: string;
  name: string;
  /** Returns visibility mask (0-1) for a position at a given progress (0-1) */
  getMask(position: number, progress: number, context?: IgnitionContext): number;
}

// ─── Layer System ───

export type LayerDirection = 'hilt-to-tip' | 'tip-to-hilt' | 'center-out' | 'edges-in';
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';

export interface LayerConfig {
  style: string; // style ID
  direction: LayerDirection;
  opacity: number; // 0-1
  blendMode: BlendMode;
}

// ─── Segment & Topology ───

export type SegmentRole =
  | 'main-blade'
  | 'secondary-blade'
  | 'quillon'
  | 'accent-crystal'
  | 'accent-pommel'
  | 'accent-powercell'
  | 'blade-plug'
  | 'ring';

export type EffectScoping = 'independent' | 'mirror-main' | 'ignore';

export interface SegmentAnimationConfig {
  rotationRPM?: number; // for inquisitor ring rotation
  phase?: number; // phase offset 0-1
}

export interface BladeSegment {
  id: string;
  name: string;
  startLED: number;
  endLED: number;
  direction: 'normal' | 'reverse';
  layers: LayerConfig[];
  ignition: string;
  retraction: string;
  ignitionDelay: number; // ms delay after main ignition
  mirrorOf?: string;
  role: SegmentRole;
  effectScoping: EffectScoping;
  dataPinIndex?: number; // which physical data pin (for codegen)
  animationConfig?: SegmentAnimationConfig;
}

// ─── Physical Layout (for UI rendering) ───

export interface SegmentSpatialInfo {
  segmentId: string;
  origin: { x: number; y: number }; // normalized, hilt center = 0,0
  angle: number; // degrees from vertical (0 = straight up)
  length: number; // normalized 0-1
}

export interface PhysicalLayout {
  segments: SegmentSpatialInfo[];
  hiltOrigin: { x: number; y: number };
}

// ─── Topology ───

export type TopologyPresetId =
  | 'single'
  | 'staff'
  | 'crossguard'
  | 'triple'
  | 'quad-star'
  | 'inquisitor'
  | 'split-blade'
  | 'switched'
  | 'custom';

export interface BladeTopology {
  presetId: TopologyPresetId;
  totalLEDs: number;
  segments: BladeSegment[];
  physicalLayout: PhysicalLayout;
  bladeLength?: string; // e.g., '36"'
  switchModes?: BladeTopology[]; // for "switched" topology
}

// ─── Blade Length Presets ───

export interface BladeLengthConfig {
  inches: number;
  ledCount: number;
  ledsPerInch: number;
}

export const BLADE_LENGTH_PRESETS: Record<string, BladeLengthConfig> = {
  '24"': { inches: 24, ledCount: 88, ledsPerInch: 3.66 },
  '28"': { inches: 28, ledCount: 103, ledsPerInch: 3.66 },
  '32"': { inches: 32, ledCount: 117, ledsPerInch: 3.66 },
  '36"': { inches: 36, ledCount: 132, ledsPerInch: 3.66 },
  '40"': { inches: 40, ledCount: 147, ledsPerInch: 3.66 },
};

// ─── Easing ───

export type EasingFunction = (t: number) => number;

export interface CubicBezierEasing {
  type: 'cubic-bezier';
  controlPoints: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface PresetEasing {
  type: 'preset';
  name: string;
}

export type EasingConfig = CubicBezierEasing | PresetEasing;

// ─── Blade Configuration ───

export interface BladeConfig {
  name?: string;
  baseColor: RGB;
  clashColor: RGB;
  lockupColor: RGB;
  blastColor: RGB;
  dragColor?: RGB;
  meltColor?: RGB;
  lightningColor?: RGB;
  style: string; // style ID
  ignition: string; // ignition ID
  retraction: string; // retraction ID
  ignitionMs: number;
  retractionMs: number;
  ignitionEasing?: EasingConfig;
  retractionEasing?: EasingConfig;
  shimmer: number; // 0-1
  ledCount: number; // typically 144

  // Style-specific params
  gradientEnd?: RGB;
  edgeColor?: RGB;
  gradientInterpolation?: 'linear' | 'smooth' | 'step';

  // Blade painting
  colorPositions?: Array<{ position: number; color: RGB; width: number }>;

  // ── Noise Parameters ──
  noiseScale?: number;          // Perlin noise spatial scale (1-100, default 30)
  noiseSpeed?: number;          // Animation speed (0-100, default 20)
  noiseOctaves?: number;        // Fractal detail layers (1-6, default 2)
  noiseTurbulence?: number;     // Distortion amount (0-100, default 0)
  noiseIntensity?: number;      // How much noise affects the blade (0-100, default 50)

  // ── Motion Reactivity ──
  motionSwingSensitivity?: number;  // How much swing affects blade (0-100, default 50)
  motionAngleInfluence?: number;    // How much tilt affects blade (0-100, default 30)
  motionTwistResponse?: number;     // How much twist affects blade (0-100, default 20)
  motionSmoothing?: number;         // Smoothing factor for motion input (0-100, default 60)
  motionSwingColorShift?: RGB;      // Color to shift toward on swing
  motionSwingBrighten?: number;     // Brightness boost on swing (0-100, default 30)

  // ── Color Dynamics ──
  colorHueShiftSpeed?: number;      // Hue rotation speed (0-100, 0 = static)
  colorSaturationPulse?: number;    // Saturation breathing amount (0-100, default 0)
  colorBrightnessWave?: number;     // Brightness wave amplitude (0-100, default 0)
  colorFlickerRate?: number;        // Random flicker frequency (0-100, default 0)
  colorFlickerDepth?: number;       // How deep flicker dips (0-100, default 30)

  // ── Spatial Pattern ──
  spatialWaveFrequency?: number;    // Wave pattern frequency (1-20, default 3)
  spatialWaveSpeed?: number;        // Wave movement speed (0-100, default 30)
  spatialDirection?: LayerDirection; // Pattern direction
  spatialSpread?: number;           // How wide patterns spread (0-100, default 50)
  spatialPhase?: number;            // Phase offset for multi-blade sync (0-360, default 0)

  // ── Blend & Layer ──
  blendMode?: BlendMode;            // Primary blend mode
  blendSecondaryStyle?: string;     // Optional second style to blend with
  blendSecondaryAmount?: number;    // Mix amount for secondary (0-100, default 0)
  blendMaskType?: 'none' | 'gradient' | 'noise' | 'wave'; // Mask pattern between layers

  // ── Tip & Emitter ──
  tipColor?: RGB;                   // Different color at blade tip
  tipLength?: number;               // How far tip color extends (0-50, % of blade, default 10)
  tipFade?: number;                 // Smoothness of tip transition (0-100, default 50)
  emitterFlare?: number;            // Brightness boost at emitter end (0-100, default 20)
  emitterFlareWidth?: number;       // Width of emitter flare (0-50, default 5)

  // ── Image Scroll (Light Painting) ──
  imageData?: Uint8Array;           // RGB pixel data (3 bytes per pixel, row-major)
  imageWidth?: number;              // Image width in pixels (columns = scroll frames)
  imageHeight?: number;             // Image height in pixels (rows = blade LEDs)
  scrollSpeed?: number;             // Pixels per second (default 30)
  scrollDirection?: 'left-to-right' | 'right-to-left' | 'bidirectional';
  scrollRepeatMode?: 'once' | 'loop' | 'pingpong';

  // ── Dual-Mode Ignition ──
  dualModeIgnition?: boolean;
  ignitionUp?: string;              // ignition ID when blade angled up
  ignitionDown?: string;            // ignition ID when blade angled down
  ignitionAngleThreshold?: number;  // 0-1, default 0.3
  retractionUp?: string;
  retractionDown?: string;

  // ── Custom Ignition Curve ──
  ignitionCurve?: [number, number, number, number]; // cubic bezier [x1, y1, x2, y2]
  retractionCurve?: [number, number, number, number];

  // ── Blade Hardware ──
  stripType?: 'single' | 'dual-neo' | 'tri-neo' | 'quad-neo' | 'penta-neo' | 'tri-cree' | 'quad-cree' | 'penta-cree';
  bladeType?: 'neopixel' | 'in-hilt-led';
  customLedCount?: number | null; // override auto-calculated count

  // Extensible
  [key: string]: unknown;
}

// ─── Default Segment Helper ───

function makeSegment(overrides: Partial<BladeSegment> & Pick<BladeSegment, 'id' | 'name' | 'startLED' | 'endLED'>): BladeSegment {
  return {
    direction: 'normal',
    layers: [{ style: 'stable', direction: 'hilt-to-tip', opacity: 1, blendMode: 'normal' }],
    ignition: 'standard',
    retraction: 'standard',
    ignitionDelay: 0,
    role: 'main-blade',
    effectScoping: 'mirror-main',
    ...overrides,
  };
}

// ─── Topology Presets ───

export const DEFAULT_TOPOLOGY: BladeTopology = {
  presetId: 'single',
  totalLEDs: 132,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.85 },
    segments: [{ segmentId: 'main', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.7 }],
  },
  segments: [
    makeSegment({ id: 'main', name: 'Main Blade', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'mirror-main' }),
  ],
};

export const CROSSGUARD_TOPOLOGY: BladeTopology = {
  presetId: 'crossguard',
  totalLEDs: 144,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.85 },
    segments: [
      { segmentId: 'main', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.7 },
      { segmentId: 'quillon-left', origin: { x: 0.5, y: 0.85 }, angle: -90, length: 0.1 },
      { segmentId: 'quillon-right', origin: { x: 0.5, y: 0.85 }, angle: 90, length: 0.1 },
    ],
  },
  segments: [
    makeSegment({ id: 'main', name: 'Main Blade', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'mirror-main' }),
    makeSegment({ id: 'quillon-left', name: 'Crossguard Left', startLED: 132, endLED: 137, role: 'quillon', effectScoping: 'mirror-main', ignitionDelay: 200 }),
    makeSegment({ id: 'quillon-right', name: 'Crossguard Right', startLED: 138, endLED: 143, role: 'quillon', effectScoping: 'mirror-main', ignitionDelay: 200 }),
  ],
};

export const STAFF_TOPOLOGY: BladeTopology = {
  presetId: 'staff',
  totalLEDs: 264,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.5 },
    segments: [
      { segmentId: 'blade-1', origin: { x: 0.5, y: 0.5 }, angle: 0, length: 0.4 },
      { segmentId: 'blade-2', origin: { x: 0.5, y: 0.5 }, angle: 180, length: 0.4 },
    ],
  },
  segments: [
    makeSegment({ id: 'blade-1', name: 'Blade 1', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'independent', dataPinIndex: 0 }),
    makeSegment({ id: 'blade-2', name: 'Blade 2', startLED: 132, endLED: 263, role: 'secondary-blade', effectScoping: 'independent', dataPinIndex: 1 }),
  ],
};

export const TRIPLE_TOPOLOGY: BladeTopology = {
  presetId: 'triple',
  totalLEDs: 396,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.65 },
    segments: [
      { segmentId: 'blade-1', origin: { x: 0.5, y: 0.65 }, angle: 0, length: 0.5 },
      { segmentId: 'blade-2', origin: { x: 0.5, y: 0.65 }, angle: 120, length: 0.35 },
      { segmentId: 'blade-3', origin: { x: 0.5, y: 0.65 }, angle: -120, length: 0.35 },
    ],
  },
  segments: [
    makeSegment({ id: 'blade-1', name: 'Main Blade', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'independent', dataPinIndex: 0 }),
    makeSegment({ id: 'blade-2', name: 'Blade 2', startLED: 132, endLED: 263, role: 'secondary-blade', effectScoping: 'independent', dataPinIndex: 1 }),
    makeSegment({ id: 'blade-3', name: 'Blade 3', startLED: 264, endLED: 395, role: 'secondary-blade', effectScoping: 'independent', dataPinIndex: 2 }),
  ],
};

export const QUAD_STAR_TOPOLOGY: BladeTopology = {
  presetId: 'quad-star',
  totalLEDs: 288,
  bladeLength: '24"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.5 },
    segments: [
      { segmentId: 'blade-1', origin: { x: 0.5, y: 0.5 }, angle: 0, length: 0.35 },
      { segmentId: 'blade-2', origin: { x: 0.5, y: 0.5 }, angle: 90, length: 0.35 },
      { segmentId: 'blade-3', origin: { x: 0.5, y: 0.5 }, angle: 180, length: 0.35 },
      { segmentId: 'blade-4', origin: { x: 0.5, y: 0.5 }, angle: -90, length: 0.35 },
    ],
  },
  segments: [
    makeSegment({ id: 'blade-1', name: 'Blade N', startLED: 0, endLED: 71, role: 'main-blade', effectScoping: 'independent', dataPinIndex: 0 }),
    makeSegment({ id: 'blade-2', name: 'Blade E', startLED: 72, endLED: 143, role: 'secondary-blade', effectScoping: 'mirror-main', dataPinIndex: 1 }),
    makeSegment({ id: 'blade-3', name: 'Blade S', startLED: 144, endLED: 215, role: 'secondary-blade', effectScoping: 'mirror-main', dataPinIndex: 2 }),
    makeSegment({ id: 'blade-4', name: 'Blade W', startLED: 216, endLED: 287, role: 'secondary-blade', effectScoping: 'mirror-main', dataPinIndex: 3 }),
  ],
};

export const INQUISITOR_TOPOLOGY: BladeTopology = {
  presetId: 'inquisitor',
  totalLEDs: 156,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.85 },
    segments: [
      { segmentId: 'main', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.7 },
      { segmentId: 'ring', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.12 },
    ],
  },
  segments: [
    makeSegment({ id: 'main', name: 'Main Blade', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'mirror-main' }),
    makeSegment({ id: 'ring', name: 'Spinning Ring', startLED: 132, endLED: 155, role: 'ring', effectScoping: 'ignore', animationConfig: { rotationRPM: 120, phase: 0 } }),
  ],
};

export const SPLIT_BLADE_TOPOLOGY: BladeTopology = {
  presetId: 'split-blade',
  totalLEDs: 144,
  bladeLength: '32"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.85 },
    segments: [
      { segmentId: 'base', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.3 },
      { segmentId: 'split-left', origin: { x: 0.5, y: 0.55 }, angle: -15, length: 0.4 },
      { segmentId: 'split-right', origin: { x: 0.5, y: 0.55 }, angle: 15, length: 0.4 },
    ],
  },
  segments: [
    makeSegment({ id: 'base', name: 'Base Blade', startLED: 0, endLED: 47, role: 'main-blade', effectScoping: 'mirror-main' }),
    makeSegment({ id: 'split-left', name: 'Split Left', startLED: 48, endLED: 95, role: 'secondary-blade', effectScoping: 'mirror-main' }),
    makeSegment({ id: 'split-right', name: 'Split Right', startLED: 96, endLED: 143, role: 'secondary-blade', effectScoping: 'mirror-main' }),
  ],
};

export const ACCENT_TOPOLOGY: BladeTopology = {
  presetId: 'custom',
  totalLEDs: 148,
  bladeLength: '36"',
  physicalLayout: {
    hiltOrigin: { x: 0.5, y: 0.85 },
    segments: [
      { segmentId: 'main', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.7 },
      { segmentId: 'crystal', origin: { x: 0.48, y: 0.88 }, angle: 0, length: 0.02 },
      { segmentId: 'pommel', origin: { x: 0.5, y: 0.95 }, angle: 0, length: 0.02 },
    ],
  },
  segments: [
    makeSegment({ id: 'main', name: 'Main Blade', startLED: 0, endLED: 131, role: 'main-blade', effectScoping: 'mirror-main' }),
    makeSegment({ id: 'crystal', name: 'Crystal Chamber', startLED: 132, endLED: 139, role: 'accent-crystal', effectScoping: 'ignore' }),
    makeSegment({ id: 'pommel', name: 'Pommel Accent', startLED: 140, endLED: 147, role: 'accent-pommel', effectScoping: 'ignore' }),
  ],
};

/** All topology presets indexed by ID */
export const TOPOLOGY_PRESETS: Record<string, BladeTopology> = {
  single: DEFAULT_TOPOLOGY,
  crossguard: CROSSGUARD_TOPOLOGY,
  staff: STAFF_TOPOLOGY,
  triple: TRIPLE_TOPOLOGY,
  'quad-star': QUAD_STAR_TOPOLOGY,
  inquisitor: INQUISITOR_TOPOLOGY,
  'split-blade': SPLIT_BLADE_TOPOLOGY,
  accent: ACCENT_TOPOLOGY,
};
