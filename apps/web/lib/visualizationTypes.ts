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
  },
  {
    id: 'pixel-strip',
    label: 'Pixels',
    description: 'Individual LED pixel dots showing exact per-pixel color output.',
    category: 'core',
    defaultVisible: true,
    color: '#ffffff',
    height: 24,
  },
  {
    id: 'channel-r',
    label: 'R',
    description: 'Red channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#ff4444',
    height: 40,
  },
  {
    id: 'channel-g',
    label: 'G',
    description: 'Green channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#44ff88',
    height: 40,
  },
  {
    id: 'channel-b',
    label: 'B',
    description: 'Blue channel intensity waveform across all blade pixels.',
    category: 'core',
    defaultVisible: true,
    color: '#4488ff',
    height: 40,
  },
  {
    id: 'luminance',
    label: 'Luma',
    description: 'Perceived luminance (brightness) waveform — useful for clash detection tuning.',
    category: 'core',
    defaultVisible: false,
    color: '#cccccc',
    height: 40,
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
  },
  {
    id: 'hue',
    label: 'Hue',
    description: 'Per-pixel hue angle (0–360°) plotted across the blade length.',
    category: 'extended',
    defaultVisible: false,
    color: '#cc88ff',
    height: 40,
  },
  {
    id: 'saturation',
    label: 'Sat',
    description: 'Per-pixel color saturation (0–100%) across the blade.',
    category: 'extended',
    defaultVisible: false,
    color: '#ff88cc',
    height: 40,
  },
  {
    id: 'effect-overlay',
    label: 'Effects',
    description: 'Highlight regions currently active with clash, lockup, blast, or other effects.',
    category: 'extended',
    defaultVisible: false,
    color: '#ffdd44',
    height: 32,
  },
  {
    id: 'swing-response',
    label: 'Swing',
    description: 'Swing-speed response curve showing how style intensity tracks motion.',
    category: 'extended',
    defaultVisible: false,
    color: '#44ffee',
    height: 40,
  },
  {
    id: 'transition-progress',
    label: 'Trans',
    description: 'Ignition or retraction mask position — how far along the transition animation is.',
    category: 'extended',
    defaultVisible: false,
    color: '#88aaff',
    height: 32,
  },
  {
    id: 'storage-budget',
    label: 'Budget',
    description: 'Flash memory storage budget indicator — estimated space used by this style config.',
    category: 'extended',
    defaultVisible: false,
    color: '#aaffaa',
    height: 28,
  },
];

// ─── Helpers ───

export const CORE_LAYERS = VISUALIZATION_LAYERS.filter((l) => l.category === 'core');
export const EXTENDED_LAYERS = VISUALIZATION_LAYERS.filter((l) => l.category === 'extended');

export const DEFAULT_VISIBLE_LAYER_IDS = new Set<VisualizationLayerId>(
  VISUALIZATION_LAYERS.filter((l) => l.defaultVisible).map((l) => l.id)
);

export const DEFAULT_LAYER_ORDER: VisualizationLayerId[] = VISUALIZATION_LAYERS.map((l) => l.id);

export function getLayerById(id: VisualizationLayerId): VisualizationLayer | undefined {
  return VISUALIZATION_LAYERS.find((l) => l.id === id);
}
