// ─── Visualization Layer IDs ───

export type VisualizationLayerId =
  // Core (visible by default)
  | 'blade'               // The main blade visual
  | 'pixel-strip'         // Individual LED dots
  | 'channel-r'           // Red channel graph
  | 'channel-g'           // Green channel graph
  | 'channel-b'           // Blue channel graph
  | 'luminance'           // Luminance waveform
  // Extended (hidden by default, opt-in)
  | 'power-draw'          // mA per pixel graph
  | 'hue'                 // Hue angle (0-360) graph
  | 'saturation'          // Saturation graph
  | 'effect-overlay'      // Active effect highlight regions
  | 'swing-response'      // Swing speed response curve
  | 'transition-progress' // Ignition/retraction mask position
  | 'storage-budget';     // Storage budget indicator

// ─── Layer Shape ───
//
// Added 2026-04-21 in Lane C (OV5 AnalysisRail split). Each layer
// declares its geometry so the split between "stays with the blade
// preview" and "moves to the left-side AnalysisRail" can be driven by
// data rather than a heuristic in the component:
//
//   'pixel'     — per-LED renderer (blade, pixel-strip, effect-overlay).
//                 Occupies the full blade render width and must share
//                 the same `bladeRenderWidth` as the blade canvas
//                 (OV2 parity). Stays in the blade preview region.
//
//   'line-graph'— cross-blade analytical waveform (luminance, power,
//                 hue, saturation, RGB channels, swing, transition).
//                 Narrow-column layout; moves to the AnalysisRail.
//
//   'scalar'    — single-value gauge (storage-budget). Belongs on the
//                 Delivery rail as a tier-colored dot rather than a
//                 blade-width renderer. Not rendered inside either
//                 stack — the Delivery rail reads its own storage math
//                 directly.
export type VisualizationLayerShape = 'pixel' | 'line-graph' | 'scalar';

// ─── Layer Metadata ───

export interface VisualizationLayer {
  id: VisualizationLayerId;
  label: string;
  description: string;
  category: 'core' | 'extended';
  defaultVisible: boolean;
  /** CSS color for the graph line/fill */
  color: string;
  /** Default height in pixels for this layer */
  height: number;
  /**
   * Shape classification per OV5. Drives the split between blade-
   * anchored renderers and AnalysisRail waveforms. See
   * `VisualizationLayerShape` above for the three categories.
   */
  shape: VisualizationLayerShape;
}

// ─── Layer Registry ───

export const VISUALIZATION_LAYERS: VisualizationLayer[] = [
  // ── Core layers ──
  {
    id: 'blade',
    label: 'Blade',
    description: 'Full photorealistic blade render with glow and bloom.',
    category: 'core',
    defaultVisible: true,
    color: '#e0f0ff',
    height: 160,
    shape: 'pixel',
  },
  {
    id: 'pixel-strip',
    label: 'Pixels',
    description: 'Individual LED pixel dots showing exact per-pixel color output.',
    category: 'core',
    defaultVisible: true,
    color: '#ffffff',
    height: 24,
    shape: 'pixel',
  },
  {
    id: 'channel-r',
    label: 'R',
    description: 'Red channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#ff4444',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'channel-g',
    label: 'G',
    description: 'Green channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#44ff88',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'channel-b',
    label: 'B',
    description: 'Blue channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#4488ff',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'luminance',
    label: 'Luma',
    description: 'Perceived luminance (brightness) waveform — useful for clash detection tuning.',
    category: 'core',
    defaultVisible: false,
    color: '#cccccc',
    height: 40,
    shape: 'line-graph',
  },

  // ── Extended layers ──
  {
    id: 'power-draw',
    label: 'Power',
    description: 'Estimated milliamp draw per pixel at the current brightness setting.',
    category: 'extended',
    defaultVisible: false,
    color: '#ffaa00',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'hue',
    label: 'Hue',
    description: 'Per-pixel hue angle (0–360°) plotted across the blade length.',
    category: 'extended',
    defaultVisible: false,
    color: '#cc88ff',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'saturation',
    label: 'Sat',
    description: 'Per-pixel color saturation (0–100%) across the blade.',
    category: 'extended',
    defaultVisible: false,
    color: '#ff88cc',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'effect-overlay',
    label: 'Effects',
    description: 'Highlight regions currently active with clash, lockup, blast, or other effects.',
    category: 'extended',
    defaultVisible: false,
    color: '#ffdd44',
    height: 32,
    // effect-overlay is per-LED (highlights "hot" pixels along the
    // blade). Stays with the blade preview so the highlight region
    // aligns with the blade canvas's pixel positions.
    shape: 'pixel',
  },
  {
    id: 'swing-response',
    label: 'Swing',
    description: 'Swing-speed response curve showing how style intensity tracks motion.',
    category: 'extended',
    defaultVisible: false,
    color: '#44ffee',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'transition-progress',
    label: 'Trans',
    description: 'Ignition or retraction mask position — how far along the transition animation is.',
    category: 'extended',
    defaultVisible: false,
    color: '#88aaff',
    height: 32,
    shape: 'line-graph',
  },
  {
    id: 'storage-budget',
    label: 'Budget',
    description: 'Flash memory storage budget indicator — estimated space used by this style config.',
    category: 'extended',
    defaultVisible: false,
    color: '#aaffaa',
    height: 28,
    // scalar — moves to the Delivery rail's STORAGE segment (OV4).
    // Not rendered inside either stack.
    shape: 'scalar',
  },
];

// ─── Helpers ───

export const CORE_LAYERS = VISUALIZATION_LAYERS.filter((l) => l.category === 'core');
export const EXTENDED_LAYERS = VISUALIZATION_LAYERS.filter((l) => l.category === 'extended');

/**
 * Layers that stay with the blade preview region (OV5). These have
 * shape === 'pixel' — their x-axis must match the blade canvas width
 * pixel-for-pixel (OV2 parity).
 */
export const PIXEL_SHAPED_LAYERS = VISUALIZATION_LAYERS.filter(
  (l) => l.shape === 'pixel',
);

/**
 * Layers that move to the left-side AnalysisRail (OV5). These have
 * shape === 'line-graph' — they're narrow cross-blade waveforms.
 */
export const LINE_GRAPH_SHAPED_LAYERS = VISUALIZATION_LAYERS.filter(
  (l) => l.shape === 'line-graph',
);

/**
 * Scalar-shaped layers — currently only storage-budget, which moves
 * to the Delivery rail (OV4). Exported for completeness so the three
 * shapes collectively cover every layer id (asserted in tests).
 */
export const SCALAR_SHAPED_LAYERS = VISUALIZATION_LAYERS.filter(
  (l) => l.shape === 'scalar',
);

/**
 * Set of pixel-shaped layer ids — fast lookup for the
 * VisualizationStack SKIP_LAYERS guard.
 */
export const PIXEL_SHAPED_LAYER_IDS = new Set<VisualizationLayerId>(
  PIXEL_SHAPED_LAYERS.map((l) => l.id),
);

/**
 * Set of line-graph-shaped layer ids — AnalysisRail iterates this set.
 */
export const LINE_GRAPH_SHAPED_LAYER_IDS = new Set<VisualizationLayerId>(
  LINE_GRAPH_SHAPED_LAYERS.map((l) => l.id),
);

export const DEFAULT_VISIBLE_LAYER_IDS = new Set<VisualizationLayerId>(
  VISUALIZATION_LAYERS.filter((l) => l.defaultVisible).map((l) => l.id)
);

export const DEFAULT_LAYER_ORDER: VisualizationLayerId[] = VISUALIZATION_LAYERS.map((l) => l.id);

export function getLayerById(id: VisualizationLayerId): VisualizationLayer | undefined {
  return VISUALIZATION_LAYERS.find((l) => l.id === id);
}
