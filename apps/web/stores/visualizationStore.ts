import { create } from 'zustand';
import {
  type VisualizationLayerId,
  DEFAULT_VISIBLE_LAYER_IDS,
  DEFAULT_LAYER_ORDER,
} from '@/lib/visualizationTypes';

// ─── Types ───

interface VisualizationStore {
  /** Which layers are currently shown in the visualization stack */
  visibleLayers: Set<VisualizationLayerId>;
  /** Top-to-bottom render order of layers */
  layerOrder: VisualizationLayerId[];
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

  // ── Debug / inspection actions ──
  toggleDebugMode: () => void;
  pinPixel: (index: number) => void;
  unpinPixel: (index: number) => void;
  setHoveredPixel: (index: number | null) => void;
}

// ─── Persistence helpers ───

const STORAGE_KEY = 'bladeforge-visualization';

interface PersistedState {
  visibleLayers: VisualizationLayerId[];
  layerOrder: VisualizationLayerId[];
  isDebugMode: boolean;
}

function loadFromStorage(): Partial<PersistedState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Partial<PersistedState>;
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

// ─── Store ───

export const useVisualizationStore = create<VisualizationStore>((set, get) => ({
  visibleLayers: initialVisibleLayers,
  layerOrder: initialLayerOrder,
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
        isDebugMode: state.isDebugMode,
      });
      return { visibleLayers: next };
    });
  },

  resetToDefaults: () => {
    const defaultVisible = new Set<VisualizationLayerId>(DEFAULT_VISIBLE_LAYER_IDS);
    const defaultOrder = [...DEFAULT_LAYER_ORDER];
    saveToStorage({
      visibleLayers: Array.from(defaultVisible),
      layerOrder: defaultOrder,
      isDebugMode: false,
    });
    set({
      visibleLayers: defaultVisible,
      layerOrder: defaultOrder,
      isDebugMode: false,
      pinnedPixels: [],
      hoveredPixel: null,
    });
  },

  toggleDebugMode: () => {
    set((state) => {
      const next = !state.isDebugMode;
      saveToStorage({
        visibleLayers: Array.from(state.visibleLayers),
        layerOrder: state.layerOrder,
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
    // Only update if value actually changed to avoid redundant renders
    if (get().hoveredPixel === index) return;
    set({ hoveredPixel: index });
  },
}));
