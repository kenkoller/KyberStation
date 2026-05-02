import { create } from 'zustand';
import type {
  BladeConfig,
  BladeTopology,
  BladeState,
  SerializedBinding,
  ModulationPayload,
} from '@kyberstation/engine';
import { DEFAULT_TOPOLOGY } from '@kyberstation/engine';

// BladeConfig with modulation — optional field, additive per v1.1 spec.
// Stored as the engine's `BladeConfigWithModulation` shape. Friday v1.0
// Preview uses bare-source bindings only (no expressions until v1.1).
type BladeConfigPlusModulation = BladeConfig & { modulation?: ModulationPayload };

// Default config matching the prototype's Obi-Wan ANH preset
const DEFAULT_CONFIG: BladeConfigPlusModulation = {
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
  // modulation: intentionally undefined by default — most blades have no bindings.
};

export interface BladeStore {
  // Configuration
  config: BladeConfigPlusModulation;
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
  candidateConfig: BladeConfigPlusModulation | null;

  // Actions
  updateConfig: (partial: Partial<BladeConfigPlusModulation>) => void;
  setConfig: (config: BladeConfigPlusModulation) => void;
  setCandidateConfig: (config: BladeConfigPlusModulation | null) => void;
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
  loadPreset: (config: BladeConfigPlusModulation) => void;

  // ── Modulation routing (v1.0 Preview / v1.1 Core) ──
  /**
   * Append a new binding to `config.modulation.bindings`. If the config
   * has no `modulation` payload yet, one is seeded with `version: 1`.
   */
  addBinding: (binding: SerializedBinding) => void;
  removeBinding: (bindingId: string) => void;
  updateBinding: (bindingId: string, partial: Partial<SerializedBinding>) => void;
  toggleBindingBypass: (bindingId: string) => void;
  clearAllBindings: () => void;

  // ── Import preservation (Phase 2B, 2026-05-02) ──
  /**
   * Strip `importedRawCode` / `importedAt` / `importedSource` from the
   * current config. Subsequent exports regenerate from BladeConfig
   * fields rather than re-emitting the imported code verbatim.
   *
   * One-way operation — the imported code cannot be recovered after
   * this without re-pasting. Bound to the "Convert to Native" button
   * surfaced in the OUTPUT panel's import banner.
   */
  convertImportToNative: () => void;
}

export const useBladeStore = create<BladeStore>((set) => ({
  config: DEFAULT_CONFIG,
  topology: DEFAULT_TOPOLOGY,
  activeSegmentId: 'main',
  // W1 (2026-04-22): saber default-on so the analysis rail panels
  // have a lit blade to visualise on first load — empty waveforms
  // read as "nothing working" to new users. Users can still retract
  // via the action bar any time.
  bladeState: 'on' as BladeState,
  isOn: true,
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

  convertImportToNative: () =>
    set((state) => {
      // Spread, then explicitly overwrite the import fields with undefined
      // so they're stripped from the JSON shape on the next persist /
      // export. Using delete on a frozen object would throw under strict
      // mode; omitting via destructuring + spread keeps the operation
      // immutable and avoids leaking the typing escape hatch.
      const {
        importedRawCode: _importedRawCode,
        importedAt: _importedAt,
        importedSource: _importedSource,
        ...rest
      } = state.config;
      return { config: rest };
    }),

  // ── Modulation routing actions ──

  addBinding: (binding) =>
    set((state) => {
      const existing = state.config.modulation;
      const modulation: ModulationPayload = existing
        ? { ...existing, bindings: [...existing.bindings, binding] }
        : { version: 1, bindings: [binding] };
      return { config: { ...state.config, modulation } };
    }),

  removeBinding: (bindingId) =>
    set((state) => {
      const existing = state.config.modulation;
      if (!existing) return state;
      const bindings = existing.bindings.filter((b) => b.id !== bindingId);
      // If the last binding was removed, leave the modulation payload in
      // place (empty) rather than deleting it — simpler invariant for
      // consumers that check `config.modulation !== undefined`.
      const modulation: ModulationPayload = { ...existing, bindings };
      return { config: { ...state.config, modulation } };
    }),

  updateBinding: (bindingId, partial) =>
    set((state) => {
      const existing = state.config.modulation;
      if (!existing) return state;
      const bindings = existing.bindings.map((b) =>
        b.id === bindingId ? { ...b, ...partial } : b,
      );
      const modulation: ModulationPayload = { ...existing, bindings };
      return { config: { ...state.config, modulation } };
    }),

  toggleBindingBypass: (bindingId) =>
    set((state) => {
      const existing = state.config.modulation;
      if (!existing) return state;
      const bindings = existing.bindings.map((b) =>
        b.id === bindingId ? { ...b, bypassed: !b.bypassed } : b,
      );
      const modulation: ModulationPayload = { ...existing, bindings };
      return { config: { ...state.config, modulation } };
    }),

  clearAllBindings: () =>
    set((state) => {
      if (!state.config.modulation) return state;
      const modulation: ModulationPayload = { ...state.config.modulation, bindings: [] };
      return { config: { ...state.config, modulation } };
    }),
}));
