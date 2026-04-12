// ─── Parameter Group Metadata ───
// UI-consumable definitions for dynamically rendering blade parameter controls.
// This file is purely metadata — no runtime logic.

import type { BladeConfig } from './types';

export interface ParameterOption {
  value: string;
  label: string;
}

export interface ParameterDef {
  key: keyof BladeConfig;
  label: string;
  type: 'slider' | 'color' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default?: number | string;
  unit?: string;
  description: string;
  options?: ParameterOption[];
}

export interface ParameterGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
  params: ParameterDef[];
}

export const PARAMETER_GROUPS: ParameterGroup[] = [
  // ── Noise Parameters ──
  {
    id: 'noise',
    label: 'Noise',
    icon: '\uD83C\uDF0A',
    description: 'Perlin noise-based organic animation and texture on the blade.',
    params: [
      {
        key: 'noiseScale',
        label: 'Scale',
        type: 'slider',
        min: 1,
        max: 100,
        step: 1,
        default: 30,
        description: 'Spatial scale of the Perlin noise pattern. Higher values create larger, smoother blobs.',
      },
      {
        key: 'noiseSpeed',
        label: 'Speed',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 20,
        description: 'How fast the noise pattern animates along the blade.',
      },
      {
        key: 'noiseOctaves',
        label: 'Octaves',
        type: 'slider',
        min: 1,
        max: 6,
        step: 1,
        default: 2,
        description: 'Number of fractal detail layers. More octaves add finer detail at the cost of performance.',
      },
      {
        key: 'noiseTurbulence',
        label: 'Turbulence',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'Distortion applied to the noise field. Creates swirling, chaotic patterns.',
      },
      {
        key: 'noiseIntensity',
        label: 'Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'How strongly the noise pattern affects the blade color and brightness.',
      },
    ],
  },

  // ── Motion Reactivity ──
  {
    id: 'motion',
    label: 'Motion Reactivity',
    icon: '\uD83C\uDFCB\uFE0F',
    description: 'How the blade responds to physical motion — swing, tilt, and twist.',
    params: [
      {
        key: 'motionSwingSensitivity',
        label: 'Swing Sensitivity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'How much swing speed affects the blade style. Higher values react to gentler swings.',
      },
      {
        key: 'motionAngleInfluence',
        label: 'Angle Influence',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 30,
        description: 'How much blade tilt angle affects the style. Creates gravity-like color pooling.',
      },
      {
        key: 'motionTwistResponse',
        label: 'Twist Response',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 20,
        description: 'How much wrist twist affects the blade. Useful for color cycling on spin.',
      },
      {
        key: 'motionSmoothing',
        label: 'Smoothing',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 60,
        description: 'Low-pass filter on motion input. Higher values create smoother, more gradual reactions.',
      },
      {
        key: 'motionSwingColorShift',
        label: 'Swing Color Shift',
        type: 'color',
        description: 'Color the blade shifts toward during swings. Leave unset to keep the base color.',
      },
      {
        key: 'motionSwingBrighten',
        label: 'Swing Brighten',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 30,
        description: 'How much brighter the blade gets during swings.',
        unit: '%',
      },
    ],
  },

  // ── Color Dynamics ──
  {
    id: 'color',
    label: 'Color Dynamics',
    icon: '\uD83C\uDFA8',
    description: 'Automatic color variation over time — hue shifts, flicker, pulsing.',
    params: [
      {
        key: 'colorHueShiftSpeed',
        label: 'Hue Shift Speed',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'Speed of continuous hue rotation. 0 keeps the color static.',
      },
      {
        key: 'colorSaturationPulse',
        label: 'Saturation Pulse',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'Amount of rhythmic saturation breathing. Creates a subtle alive feel.',
        unit: '%',
      },
      {
        key: 'colorBrightnessWave',
        label: 'Brightness Wave',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'Amplitude of brightness wave traveling along the blade.',
        unit: '%',
      },
      {
        key: 'colorFlickerRate',
        label: 'Flicker Rate',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'Frequency of random brightness flicker. Higher values flicker faster.',
      },
      {
        key: 'colorFlickerDepth',
        label: 'Flicker Depth',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 30,
        description: 'How deep the flicker dips in brightness. 100 flickers to full black.',
        unit: '%',
      },
    ],
  },

  // ── Spatial Pattern ──
  {
    id: 'spatial',
    label: 'Spatial Pattern',
    icon: '\uD83C\uDF00',
    description: 'Wave and pattern controls that vary along the blade length.',
    params: [
      {
        key: 'spatialWaveFrequency',
        label: 'Wave Frequency',
        type: 'slider',
        min: 1,
        max: 20,
        step: 0.5,
        default: 3,
        description: 'Number of wave peaks visible along the blade at once.',
      },
      {
        key: 'spatialWaveSpeed',
        label: 'Wave Speed',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 30,
        description: 'How fast the wave pattern scrolls along the blade.',
      },
      {
        key: 'spatialDirection',
        label: 'Direction',
        type: 'select',
        default: 'hilt-to-tip',
        description: 'Which direction the spatial pattern flows.',
        options: [
          { value: 'hilt-to-tip', label: 'Hilt to Tip' },
          { value: 'tip-to-hilt', label: 'Tip to Hilt' },
          { value: 'center-out', label: 'Center Out' },
          { value: 'edges-in', label: 'Edges In' },
        ],
      },
      {
        key: 'spatialSpread',
        label: 'Spread',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'How wide spatial patterns spread across the blade.',
        unit: '%',
      },
      {
        key: 'spatialPhase',
        label: 'Phase Offset',
        type: 'slider',
        min: 0,
        max: 360,
        step: 1,
        default: 0,
        description: 'Phase offset in degrees. Useful for syncing patterns across multiple blades.',
        unit: '\u00B0',
      },
    ],
  },

  // ── Blend & Layer ──
  {
    id: 'blend',
    label: 'Blend & Layer',
    icon: '\uD83D\uDDC2\uFE0F',
    description: 'Layer blending controls for mixing multiple styles together.',
    params: [
      {
        key: 'blendMode',
        label: 'Blend Mode',
        type: 'select',
        default: 'normal',
        description: 'How the primary style composites with layers beneath it.',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'add', label: 'Add (Lighten)' },
          { value: 'multiply', label: 'Multiply (Darken)' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
        ],
      },
      {
        key: 'blendSecondaryStyle',
        label: 'Secondary Style',
        type: 'select',
        default: '',
        description: 'A second style to blend with the primary. Leave empty for single-style mode.',
        options: [], // Populated dynamically from style registry
      },
      {
        key: 'blendSecondaryAmount',
        label: 'Secondary Mix',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: 'How much of the secondary style to mix in. 0 = primary only, 100 = secondary only.',
        unit: '%',
      },
      {
        key: 'blendMaskType',
        label: 'Mask Type',
        type: 'select',
        default: 'none',
        description: 'Pattern used to mask between primary and secondary styles.',
        options: [
          { value: 'none', label: 'None' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'noise', label: 'Noise' },
          { value: 'wave', label: 'Wave' },
        ],
      },
    ],
  },

  // ── Tip & Emitter ──
  {
    id: 'tip',
    label: 'Tip & Emitter',
    icon: '\u2728',
    description: 'Special coloring and effects at the blade tip and emitter end.',
    params: [
      {
        key: 'tipColor',
        label: 'Tip Color',
        type: 'color',
        description: 'Override color for the blade tip. Creates a natural hot-tip or unstable look.',
      },
      {
        key: 'tipLength',
        label: 'Tip Length',
        type: 'slider',
        min: 0,
        max: 50,
        step: 1,
        default: 10,
        description: 'How far the tip color extends from the end of the blade.',
        unit: '%',
      },
      {
        key: 'tipFade',
        label: 'Tip Fade',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'Smoothness of the transition from base color to tip color. 0 = hard edge, 100 = very gradual.',
        unit: '%',
      },
      {
        key: 'emitterFlare',
        label: 'Emitter Flare',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 20,
        description: 'Brightness boost at the hilt/emitter end of the blade.',
        unit: '%',
      },
      {
        key: 'emitterFlareWidth',
        label: 'Emitter Flare Width',
        type: 'slider',
        min: 0,
        max: 50,
        step: 1,
        default: 5,
        description: 'How wide the emitter flare extends up the blade.',
        unit: '%',
      },
    ],
  },
];
