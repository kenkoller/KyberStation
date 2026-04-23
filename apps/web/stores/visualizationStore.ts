import { create } from 'zustand';
import {
  type VisualizationLayerId,
  DEFAULT_VISIBLE_LAYER_IDS,
  DEFAULT_LAYER_ORDER,
  VISUALIZATION_LAYERS,
} from '@/lib/visualizationTypes';

// ─── Types ───

/** Per-channel visibility inside the composite `rgb-luma` layer. */
export interface RgbLumaChannels {
  r: boolean;
  g: boolean;
  b: boolean;
  l: boolean;
}

export type RgbLumaChannelKey = keyof RgbLumaChannels;

interface VisualizationStore {
  /** Which layers are currently shown in the visualization stack */
  visibleLayers: Set<VisualizationLayerId>;
  /** Top-to-bottom render order of layers */
  layerOrder: VisualizationLayerId[];
  /** Per-channel visibility for the composite rgb-luma layer */
  rgbLumaChannels: RgbLumaChannels;
  /** Per-pixel debug/inspection mode */
  isDebugMode: boolean;
  /** Pixel indices pinned for side-by-side comparison */
  pinnedPixels: number[];
  /** Index of the pixel currently under the cursor */
  hoveredPixel: number | null;

  // ── Layer visibility actions ──
  toggleLayer: (id: VisualizationLayerId) => void;
  setLayerVisible: (id: VisualizationLayerId, visible: boolean) => void;
  resetToDefaults: () => void;

  // ── rgb-luma per-channel actions ──
  toggleRgbLumaChannel: (channel: RgbLumaChannelKey) => void;
  setRgbLumaChannel: (channel: RgbLumaChannelKey, visible: boolean) => void;

  // ── Debug / inspection actions ──
  toggleDebugMode: () => void;
  pinPixel: (index: number) => void;
  unpinPixel: (index: number) => void;
  setHoveredPixel: (index: number | null) => void;
}

// ─── Defaults ───

const DEFAULT_RGB_LUMA_CHANNELS: RgbLumaChannels = {
  r: true,
  g: true,
  b: true,
  l: true,
};

// ─── Persistence helpers ───

const STORAGE_KEY = 'kyberstation-visualization';

interface PersistedState {
  visibleLayers: VisualizationLayerId[];
  layerOrder: VisualizationLayerId[];
  rgbLumaChannels: RgbLumaChannels;
  isDebugMode: boolean;
}

/** Known set of current layer ids — used to drop stale persisted entries
 *  from older schema versions (e.g. the pre-merge channel-r/g/b/luminance
 *  ids that now live inside the rgb-luma composite). Pre-launch, this is
 *  cheap to ship inline rather than a versioned migration. */
const KNOWN_LAYER_IDS = new Set<string>(VISUALIZATION_LAYERS.map((l) => l.id));

function isKnownLayer(id: string): id is VisualizationLayerId {
  return KNOWN_LAYER_IDS.has(id);
}

function migrateVisibleLayers(
  raw: readonly string[] | undefined,
): VisualizationLayerId[] | undefined {
  if (!raw) return undefined;
  // Drop ids that no longer exist (channel-r/g/b/luminance). Promote to
  // rgb-luma when at least one of the legacy channel ids was visible.
  const hadLegacyRgb = raw.some(
    (id) => id === 'channel-r' || id === 'channel-g' || id === 'channel-b' || id === 'luminance',
  );
  const kept = raw.filter(isKnownLayer);
  if (hadLegacyRgb && !kept.includes('rgb-luma')) {
    kept.push('rgb-luma');
  }
  // W1 (2026-04-22): the eyeball hide affordance is gone, and the
  // product contract is "every analytical waveform is always on". Fold
  // every currently-default-visible layer into the migrated set so
  // existing installs pick up the new defaults immediately instead of
  // waiting for resetToDefaults.
  const keptSet = new Set(kept);
  for (const id of DEFAULT_VISIBLE_LAYER_IDS) {
    if (!keptSet.has(id)) kept.push(id);
  }
  return kept;
}

function migrateLayerOrder(
  raw: readonly string[] | undefined,
): VisualizationLayerId[] | undefined {
  if (!raw) return undefined;
  const kept = raw.filter(isKnownLayer);
  // Ensure rgb-luma is present + append any newly-added registry ids so
  // the order stays total over the known set.
  const present = new Set(kept);
  for (const id of DEFAULT_LAYER_ORDER) {
    if (!present.has(id)) kept.push(id);
  }
  return kept;
}

function loadFromStorage(): Partial<PersistedState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const raw = JSON.parse(stored) as {
      visibleLayers?: string[];
      layerOrder?: string[];
      rgbLumaChannels?: Partial<RgbLumaChannels>;
      isDebugMode?: boolean;
    };
    return {
      visibleLayers: migrateVisibleLayers(raw.visibleLayers),
      layerOrder: migrateLayerOrder(raw.layerOrder),
      rgbLumaChannels: raw.rgbLumaChannels
        ? { ...DEFAULT_RGB_LUMA_CHANNELS, ...raw.rgbLumaChannels }
        : undefined,
      isDebugMode: raw.isDebugMode,
    };
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Initial state from storage ───

const stored = loadFromStorage();

const initialVisibleLayers: Set<VisualizationLayerId> = stored.visibleLayers
  ? new Set<VisualizationLayerId>(stored.visibleLayers)
  : new Set<VisualizationLayerId>(DEFAULT_VISIBLE_LAYER_IDS);

const initialLayerOrder: VisualizationLayerId[] =
  stored.layerOrder ?? [...DEFAULT_LAYER_ORDER];

const initialRgbLumaChannels: RgbLumaChannels =
  stored.rgbLumaChannels ?? { ...DEFAULT_RGB_LUMA_CHANNELS };

// ─── Store ───

export const useVisualizationStore = create<VisualizationStore>((set, get) => ({
  visibleLayers: initialVisibleLayers,
  layerOrder: initialLayerOrder,
  rgbLumaChannels: initialRgbLumaChannels,
  isDebugMode: stored.isDebugMode ?? false,
  pinnedPixels: [],
  hoveredPixel: null,

  toggleLayer: (id) => {
    set((state) => {
      const next = new Set(state.visibleLayers);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveToStorage({
        visibleLayers: Array.from(next),
        layerOrder: state.layerOrder,
        rgbLumaChannels: state.rgbLumaChannels,
        isDebugMode: state.isDebugMode,
      });
      return { visibleLayers: next };
    });
  },

  setLayerVisible: (id, visible) => {
    set((state) => {
      const next = new Set(state.visibleLayers);
      if (visible) {
        next.add(id);
      } else {
        next.delete(id);
      }
      saveToStorage({
        visibleLayers: Array.from(next),
        layerOrder: state.layerOrder,
        rgbLumaChannels: state.rgbLumaChannels,
        isDebugMode: state.isDebugMode,
      });
      return { visibleLayers: next };
    });
  },

  resetToDefaults: () => {
    const defaultVisible = new Set<VisualizationLayerId>(DEFAULT_VISIBLE_LAYER_IDS);
    const defaultOrder = [...DEFAULT_LAYER_ORDER];
    const defaultChannels = { ...DEFAULT_RGB_LUMA_CHANNELS };
    saveToStorage({
      visibleLayers: Array.from(defaultVisible),
      layerOrder: defaultOrder,
      rgbLumaChannels: defaultChannels,
      isDebugMode: false,
    });
    set({
      visibleLayers: defaultVisible,
      layerOrder: defaultOrder,
      rgbLumaChannels: defaultChannels,
      isDebugMode: false,
      pinnedPixels: [],
      hoveredPixel: null,
    });
  },

  toggleRgbLumaChannel: (channel) => {
    set((state) => {
      const next = { ...state.rgbLumaChannels, [channel]: !state.rgbLumaChannels[channel] };
      saveToStorage({
        visibleLayers: Array.from(state.visibleLayers),
        layerOrder: state.layerOrder,
        rgbLumaChannels: next,
        isDebugMode: state.isDebugMode,
      });
      return { rgbLumaChannels: next };
    });
  },

  setRgbLumaChannel: (channel, visible) => {
    set((state) => {
      if (state.rgbLumaChannels[channel] === visible) return state;
      const next = { ...state.rgbLumaChannels, [channel]: visible };
      saveToStorage({
        visibleLayers: Array.from(state.visibleLayers),
        layerOrder: state.layerOrder,
        rgbLumaChannels: next,
        isDebugMode: state.isDebugMode,
      });
      return { rgbLumaChannels: next };
    });
  },

  toggleDebugMode: () => {
    set((state) => {
      const next = !state.isDebugMode;
      saveToStorage({
        visibleLayers: Array.from(state.visibleLayers),
        layerOrder: state.layerOrder,
        rgbLumaChannels: state.rgbLumaChannels,
        isDebugMode: next,
      });
      return { isDebugMode: next };
    });
  },

  pinPixel: (index) => {
    set((state) => {
      if (state.pinnedPixels.includes(index)) return state;
      return { pinnedPixels: [...state.pinnedPixels, index] };
    });
  },

  unpinPixel: (index) => {
    set((state) => ({
      pinnedPixels: state.pinnedPixels.filter((i) => i !== index),
    }));
  },

  setHoveredPixel: (index) => {
    if (get().hoveredPixel === index) return;
    set({ hoveredPixel: index });
  },
}));
