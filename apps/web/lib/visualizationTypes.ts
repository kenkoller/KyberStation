// ─── Visualization Layer IDs ───

export type VisualizationLayerId =
  // Core (visible by default)
  | 'blade'               // The main blade visual
  | 'pixel-strip'         // Individual LED dots
  | 'rgb-luma'            // Composite R/G/B + Luma overlay (per-channel chips live in the row header)
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
  /**
   * Full descriptive label (ALL CAPS). Shown in AnalysisRail row
   * headers + the ExpandedAnalysisSlot header when there's enough
   * horizontal room. Post-W1 (2026-04-22) every user-facing label
   * got upgraded from an abbreviation (e.g. `POWER`) to a more
   * self-explanatory phrase (e.g. `POWER DRAW`). The responsive
   * fallback below keeps the abbreviations alive for narrow widths.
   */
  label: string;
  /**
   * Shortened fallback label (still ALL CAPS). Used by the
   * AnalysisRail when the container width drops below the threshold
   * at which `label` would truncate with ellipsis.
   */
  shortLabel: string;
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
    label: 'BLADE PREVIEW',
    shortLabel: 'BLADE',
    description: 'Full photorealistic blade render with glow and bloom.',
    category: 'core',
    defaultVisible: true,
    color: '#e0f0ff',
    height: 160,
    shape: 'pixel',
  },
  {
    id: 'pixel-strip',
    label: 'LED PIXELS',
    shortLabel: 'PIXELS',
    description: 'Individual LED pixel dots showing exact per-pixel color output along the blade.',
    category: 'core',
    defaultVisible: true,
    color: '#ffffff',
    height: 24,
    shape: 'pixel',
  },
  {
    // Composite — R/G/B channel waveforms + Luma overlay on a single
    // canvas. Per-channel chips now live on the ExpandedAnalysisSlot
    // header (W1 2026-04-22) so the AnalysisRail row can stay minimal.
    id: 'rgb-luma',
    label: 'RGB + LUMA',
    shortLabel: 'RGB+L',
    description: 'R, G, B channel waveforms overlaid with perceived luminance. Useful for spotting channel clipping, color drift, and overall brightness shifts. Click to inspect; toggle individual traces in the expanded-view header.',
    category: 'core',
    defaultVisible: true,
    // Row-header dot color — use the luma neutral so the dot reads as
    // "composite" rather than biased toward one channel.
    color: '#e8e8e8',
    height: 40,
    shape: 'line-graph',
  },

  // ── Extended layers — post-W1 (2026-04-22) now default-visible
  //    too. User wants all analytical waveforms on-screen at once so
  //    the rail is immediately informative; hide-via-eyeball was
  //    dropped in the same pass (no per-row visibility toggle). The
  //    category split below is retained only as documentation of
  //    which layers are "analytical" vs "reference" per OV5.
  {
    id: 'power-draw',
    label: 'POWER DRAW',
    shortLabel: 'POWER',
    description: 'Estimated milliamp draw per LED at the current brightness. Dashed line marks the per-pixel budget at the 5A board limit.',
    category: 'extended',
    defaultVisible: true,
    color: '#ffaa00',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'hue',
    label: 'HUE ANGLE',
    shortLabel: 'HUE',
    description: 'Per-pixel hue angle (0–360°) across the blade. The dominant-hue readout is the circular mean — useful for spotting color-drift along the blade.',
    category: 'extended',
    defaultVisible: true,
    color: '#cc88ff',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'saturation',
    label: 'SATURATION',
    shortLabel: 'SAT',
    description: 'Per-pixel color saturation (0–100%) across the blade. High saturation = a pure colored blade; low = washed-out / pastel.',
    category: 'extended',
    defaultVisible: true,
    color: '#ff88cc',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'effect-overlay',
    label: 'EFFECT OVERLAY',
    shortLabel: 'EFFECTS',
    description: 'Highlights LEDs currently lit by a clash, lockup, blast, or other effect.',
    category: 'extended',
    defaultVisible: false,
    color: '#ffdd44',
    height: 32,
    shape: 'pixel',
  },
  {
    id: 'swing-response',
    label: 'SWING RESPONSE',
    shortLabel: 'SWING',
    description: 'Swing-speed response curve — how aggressively the current style reacts to motion. Moves as you simulate swings.',
    category: 'extended',
    defaultVisible: true,
    color: '#44ffee',
    height: 40,
    shape: 'line-graph',
  },
  {
    id: 'transition-progress',
    label: 'TRANSITION',
    shortLabel: 'TRANS',
    description: 'Ignition / retraction mask position — visualises how far along the current transition animation is.',
    category: 'extended',
    defaultVisible: true,
    color: '#88aaff',
    height: 32,
    shape: 'line-graph',
  },
  {
    id: 'storage-budget',
    label: 'STORAGE BUDGET',
    shortLabel: 'BUDGET',
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
