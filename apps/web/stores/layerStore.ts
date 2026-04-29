import { create } from 'zustand';

// ─── Types ───

/**
 * Layer types supported by the compositor.
 *
 * The visual types — base / effect / accent / mix — each output per-pixel
 * RGB into the LED buffer. The `smoothswing` type is a *modulator plate*:
 * it produces no pixel output of its own; instead it configures the
 * audio-side SmoothSwing crossfade that pairs swingl/swingh files. It
 * lives in the layer stack so that it reorders and duplicates with the
 * rest of the saber design (Bitwig's plate-in-device-chain pattern), and
 * so audition controls (bypass/mute/solo) can isolate the swing engine
 * the same way they isolate a visual layer.
 */
export type LayerType = 'base' | 'effect' | 'accent' | 'mix' | 'smoothswing';

/**
 * Layer blend mode. Per `docs/HARDWARE_FIDELITY_PRINCIPLE.md`, only
 * `'normal'` (alpha-over via lerp) round-trips to a ProffieOS template.
 * The 4 legacy values (`add` / `multiply` / `screen` / `overlay`) were
 * dropped 2026-04-29 — the codegen never emitted them anyway, so users
 * setting them got a different look in the visualizer than on real
 * hardware. Persisted state with legacy values silently coerces to
 * `'normal'` on load via `migrateLegacyLayer` below; any layer-shaped
 * payload from network/IndexedDB/glyph should funnel through that
 * helper. Mirrors `BlendMode` in `packages/engine/src/types.ts`.
 */
export type BlendMode = 'normal';

/**
 * Algorithm version for the SmoothSwing crossfade engine. V2 is the
 * ProffieOS 7.x default (per-pair seamless looping with speed-reactive
 * crossfade). V1 is legacy and kept for config round-trips only.
 */
export type SmoothSwingVersion = 'V1' | 'V2';

/**
 * Full configuration for a SmoothSwing modulator plate. These map 1:1
 * to the ProffieOS SmoothSwing defines; `version` additionally selects
 * between the V1 and V2 algorithms at emit-time.
 */
export interface SmoothSwingLayerConfig {
  version: SmoothSwingVersion;
  swingThreshold: number;    // 0–500    min speed to trigger swing audio
  swingSharpness: number;    // 0.0–5.0  crossfade reactivity
  swingStrength: number;     // 0–2000   volume scaling for swing sounds
  humVolume: number;         // 0–5      background hum volume
  accentSwingSpeed: number;  // 0–600    threshold for accent swings
  accentSwingLength: number; // 50–500ms accent overlay duration
}

/** Safe defaults sourced from ProffieOS 7.x SmoothSwing V2 recommendations. */
export const SMOOTHSWING_DEFAULTS: SmoothSwingLayerConfig = {
  version: 'V2',
  swingThreshold: 250,
  swingSharpness: 1.75,
  swingStrength: 700,
  humVolume: 3,
  accentSwingSpeed: 300,
  accentSwingLength: 150,
};

export interface BladeLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  /**
   * Ableton device-chain semantics for per-layer audition controls:
   *   bypass — skip the layer entirely in the compositor (zero CPU cost).
   *   mute   — composite but output is black (still pays engine cost,
   *            so the CPU profile is honest).
   *   solo   — render ONLY soloed layers; all others temporarily muted.
   *            Multiple layers can be soloed simultaneously.
   *
   * These flags live alongside (not instead of) `visible`. `visible`
   * is the persistent "eye" toggle in the row; `mute` is the transient
   * audition toggle that can stack with solo group logic.
   */
  bypass: boolean;
  mute: boolean;
  solo: boolean;
  config: Record<string, unknown>; // layer-specific params
}

// For 'base' layers:        config has { style: string, color: RGB }
// For 'effect' layers:       config has { effectType: string, color: RGB, size: number }
// For 'accent' layers:       config has { style: string, color: RGB, position: number, width: number }
// For 'mix' layers:          config has { mixRatio: number, styleA: string, styleB: string }
// For 'smoothswing' layers:  config has SmoothSwingLayerConfig fields (see above)

/**
 * Effective render state for a layer after applying bypass / mute / solo logic.
 *
 *   skipped — layer is bypassed and the compositor should not invoke it at all.
 *   muted   — layer is composited but outputs black (pays CPU cost).
 *   active  — layer renders normally.
 *
 * `isAnyLayerSoloed()` → when TRUE, any non-soloed layer is effectively muted
 * (unless it is also bypassed, in which case bypass wins).
 */
export type LayerRenderState = 'skipped' | 'muted' | 'active';

export interface LayerStore {
  layers: BladeLayer[];
  selectedLayerId: string | null;

  // Actions
  addLayer: (layer: Omit<BladeLayer, 'id' | 'bypass' | 'mute' | 'solo'>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  toggleVisibility: (id: string) => void;
  setOpacity: (id: string, opacity: number) => void;
  // 2026-04-29: setBlendMode retired with the Hardware Fidelity tighten —
  // BlendMode is a single literal ('normal') so the setter has no
  // useful range. See docs/HARDWARE_FIDELITY_PRINCIPLE.md.
  updateLayerConfig: (id: string, config: Record<string, unknown>) => void;
  updateLayerName: (id: string, name: string) => void;
  duplicateLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;

  // Audition controls
  toggleBypass: (id: string) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  clearSolo: () => void;

  // Selectors / derived state helpers (pure; safe to call inside render)
  isAnyLayerSoloed: () => boolean;
  getRenderState: (id: string) => LayerRenderState;
}

// ─── Helpers ───

let nextId = 1;

function generateId(): string {
  return `layer-${Date.now()}-${nextId++}`;
}

// ─── Default layers ───

const DEFAULT_LAYERS: BladeLayer[] = [
  {
    id: 'layer-default-base',
    type: 'base',
    name: 'Base Style',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    bypass: false,
    mute: false,
    solo: false,
    config: {
      style: 'stable',
      color: { r: 0, g: 140, b: 255 },
    },
  },
];

// ─── Store ───

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: DEFAULT_LAYERS,
  selectedLayerId: 'layer-default-base',

  addLayer: (layer) => {
    const newLayer: BladeLayer = {
      ...layer,
      id: generateId(),
      bypass: false,
      mute: false,
      solo: false,
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));
  },

  removeLayer: (id) =>
    set((state) => {
      const filtered = state.layers.filter((l) => l.id !== id);
      // If we deleted the selected layer, select the top layer (or null)
      const newSelected =
        state.selectedLayerId === id
          ? filtered.length > 0
            ? filtered[filtered.length - 1].id
            : null
          : state.selectedLayerId;
      return { layers: filtered, selectedLayerId: newSelected };
    }),

  moveLayer: (id, direction) =>
    set((state) => {
      const idx = state.layers.findIndex((l) => l.id === id);
      if (idx === -1) return state;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= state.layers.length) return state;
      const newLayers = [...state.layers];
      const temp = newLayers[idx];
      newLayers[idx] = newLayers[targetIdx];
      newLayers[targetIdx] = temp;
      return { layers: newLayers };
    }),

  toggleVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),

  setOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
      ),
    })),

  updateLayerConfig: (id, config) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, config: { ...l.config, ...config } } : l
      ),
    })),

  updateLayerName: (id, name) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, name } : l
      ),
    })),

  duplicateLayer: (id) =>
    set((state) => {
      const source = state.layers.find((l) => l.id === id);
      if (!source) return state;
      // A duplicate inherits the source's persistent settings (opacity,
      // blend mode, visible, config) but always starts with a clean
      // audition state — bypass/mute/solo are transient per-layer controls
      // that shouldn't silently copy over.
      const duplicate: BladeLayer = {
        ...source,
        id: generateId(),
        name: `${source.name} (copy)`,
        bypass: false,
        mute: false,
        solo: false,
        config: { ...source.config },
      };
      const idx = state.layers.findIndex((l) => l.id === id);
      const newLayers = [...state.layers];
      newLayers.splice(idx + 1, 0, duplicate);
      return { layers: newLayers, selectedLayerId: duplicate.id };
    }),

  selectLayer: (id) => set({ selectedLayerId: id }),

  // ─── Audition controls ─────────────────────────────────────────────

  toggleBypass: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, bypass: !l.bypass } : l
      ),
    })),

  toggleMute: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, mute: !l.mute } : l
      ),
    })),

  toggleSolo: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, solo: !l.solo } : l
      ),
    })),

  clearSolo: () =>
    set((state) => {
      // Only touch layers that currently have solo=true so we don't
      // create needless object churn if no-one is soloed.
      if (!state.layers.some((l) => l.solo)) return state;
      return {
        layers: state.layers.map((l) => (l.solo ? { ...l, solo: false } : l)),
      };
    }),

  // ─── Derived selectors ──────────────────────────────────────────────

  isAnyLayerSoloed: () => get().layers.some((l) => l.solo),

  getRenderState: (id) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === id);
    if (!layer) return 'skipped';
    // Bypass wins unconditionally — it's a compositor-level skip.
    if (layer.bypass) return 'skipped';
    const anySolo = state.layers.some((l) => l.solo);
    // When a solo group is active, non-soloed layers are muted.
    if (anySolo && !layer.solo) return 'muted';
    if (layer.mute) return 'muted';
    return 'active';
  },
}));
