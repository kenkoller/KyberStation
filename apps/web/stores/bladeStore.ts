import { create } from 'zustand';
import type { BladeConfig, BladeTopology, BladeState } from '@bladeforge/engine';
import { DEFAULT_TOPOLOGY } from '@bladeforge/engine';

// Default config matching the prototype's Obi-Wan ANH preset
const DEFAULT_CONFIG: BladeConfig = {
  name: 'Obi-Wan ANH',
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 800,
  shimmer: 0.1,
  ledCount: 144,
};

export interface BladeStore {
  // Configuration
  config: BladeConfig;
  topology: BladeTopology;
  activeSegmentId: string;

  // Runtime state
  bladeState: BladeState;
  isOn: boolean;
  fps: number;

  // Motion simulation
  motionSim: {
    swing: number;
    angle: number;
    twist: number;
    autoSwing: boolean;
    autoDuel: boolean;
  };

  // Effect log
  effectLog: string[];

  // A/B comparison
  candidateConfig: BladeConfig | null;

  // Actions
  updateConfig: (partial: Partial<BladeConfig>) => void;
  setConfig: (config: BladeConfig) => void;
  setCandidateConfig: (config: BladeConfig | null) => void;
  applyCandidateConfig: () => void;
  setStyle: (styleId: string) => void;
  setColor: (key: string, color: { r: number; g: number; b: number }) => void;
  setIgnition: (id: string) => void;
  setRetraction: (id: string) => void;
  setBladeState: (state: BladeState) => void;
  setIsOn: (on: boolean) => void;
  setFps: (fps: number) => void;
  setMotionSim: (partial: Partial<BladeStore['motionSim']>) => void;
  addEffectLog: (entry: string) => void;
  setTopology: (topology: BladeTopology) => void;
  setActiveSegment: (segmentId: string) => void;
  loadPreset: (config: BladeConfig) => void;
}

export const useBladeStore = create<BladeStore>((set) => ({
  config: DEFAULT_CONFIG,
  topology: DEFAULT_TOPOLOGY,
  activeSegmentId: 'main',
  bladeState: 'off' as BladeState,
  isOn: false,
  fps: 0,
  motionSim: {
    swing: 0,
    angle: 50,
    twist: 50,
    autoSwing: false,
    autoDuel: false,
  },
  effectLog: [],
  candidateConfig: null,

  setCandidateConfig: (config) => set({ candidateConfig: config }),

  applyCandidateConfig: () =>
    set((state) => {
      if (!state.candidateConfig) return state;
      return { config: { ...state.candidateConfig }, candidateConfig: null };
    }),

  updateConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  setConfig: (config) => set({ config }),

  setStyle: (styleId) =>
    set((state) => ({ config: { ...state.config, style: styleId } })),

  setColor: (key, color) =>
    set((state) => ({ config: { ...state.config, [key]: color } })),

  setIgnition: (id) =>
    set((state) => ({ config: { ...state.config, ignition: id } })),

  setRetraction: (id) =>
    set((state) => ({ config: { ...state.config, retraction: id } })),

  setBladeState: (bladeState) => set({ bladeState }),

  setIsOn: (isOn) => set({ isOn }),

  setFps: (fps) => set({ fps }),

  setMotionSim: (partial) =>
    set((state) => ({ motionSim: { ...state.motionSim, ...partial } })),

  addEffectLog: (entry) =>
    set((state) => ({
      effectLog: [entry, ...state.effectLog].slice(0, 20),
    })),

  setTopology: (topology) => set({ topology }),

  setActiveSegment: (segmentId) => set({ activeSegmentId: segmentId }),

  loadPreset: (config) =>
    set((state) => {
      // If the preset's ledCount differs from the current topology, rebuild
      // the topology so the engine's LEDArray matches the expected LED count.
      if (config.ledCount && config.ledCount !== state.topology.totalLEDs) {
        const newEndLED = config.ledCount - 1;
        const updatedTopology: BladeTopology = {
          ...state.topology,
          totalLEDs: config.ledCount,
          segments: state.topology.segments.map((seg, i) =>
            i === 0 ? { ...seg, endLED: newEndLED } : seg,
          ),
        };
        return { config, topology: updatedTopology };
      }
      return { config };
    }),
}));
