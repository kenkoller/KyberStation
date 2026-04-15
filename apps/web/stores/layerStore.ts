import { create } from 'zustand';

// ─── Types ───

export type LayerType = 'base' | 'effect' | 'accent' | 'mix';
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';

export interface BladeLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  config: Record<string, unknown>; // layer-specific params
}

// For 'base' layers:   config has { style: string, color: RGB }
// For 'effect' layers:  config has { effectType: string, color: RGB, size: number }
// For 'accent' layers:  config has { style: string, color: RGB, position: number, width: number }
// For 'mix' layers:     config has { mixRatio: number, styleA: string, styleB: string }

export interface LayerStore {
  layers: BladeLayer[];
  selectedLayerId: string | null;

  // Actions
  addLayer: (layer: Omit<BladeLayer, 'id'>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  toggleVisibility: (id: string) => void;
  setOpacity: (id: string, opacity: number) => void;
  setBlendMode: (id: string, blendMode: BlendMode) => void;
  updateLayerConfig: (id: string, config: Record<string, unknown>) => void;
  updateLayerName: (id: string, name: string) => void;
  duplicateLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
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
    config: {
      style: 'stable',
      color: { r: 0, g: 140, b: 255 },
    },
  },
];

// ─── Store ───

export const useLayerStore = create<LayerStore>((set) => ({
  layers: DEFAULT_LAYERS,
  selectedLayerId: 'layer-default-base',

  addLayer: (layer) => {
    const newLayer: BladeLayer = { ...layer, id: generateId() };
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

  setBlendMode: (id, blendMode) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, blendMode } : l
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
      const duplicate: BladeLayer = {
        ...source,
        id: generateId(),
        name: `${source.name} (copy)`,
        config: { ...source.config },
      };
      const idx = state.layers.findIndex((l) => l.id === id);
      const newLayers = [...state.layers];
      newLayers.splice(idx + 1, 0, duplicate);
      return { layers: newLayers, selectedLayerId: duplicate.id };
    }),

  selectLayer: (id) => set({ selectedLayerId: id }),
}));
