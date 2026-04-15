import { create } from 'zustand';
import type { AudioFilterChainConfig } from '@bladeforge/sound';
import { FILTER_CHAIN_PRESETS } from '@bladeforge/sound';

// ---------------------------------------------------------------------------
// Mixer slider value map — matches the SoundFontPanel MIXER_CONTROLS ids.
// These are the "friendly" UI values (dB, %, semitones) that are converted
// to an AudioFilterChainConfig before being sent to the engine.
// ---------------------------------------------------------------------------

export interface MixerValues {
  bass: number;       // -12..12  dB
  mid: number;        // -12..12  dB
  treble: number;     // -12..12  dB
  distortion: number; // 0..100   %
  reverb: number;     // 0..100   %
  delay: number;      // 0..100   %
  chorus: number;     // 0..100   %
  phaser: number;     // 0..100   %
  bitcrusher: number; // 0..100   %
  pitchShift: number; // -12..12  semitones
  compressor: number; // 0..100   %
  volume: number;     // 0..100   %
}

const DEFAULT_MIXER_VALUES: MixerValues = {
  bass: 0,
  mid: 0,
  treble: 0,
  distortion: 0,
  reverb: 0,
  delay: 0,
  chorus: 0,
  phaser: 0,
  bitcrusher: 0,
  pitchShift: 0,
  compressor: 0,
  volume: 80,
};

// Mapping from UI preset id -> FILTER_CHAIN_PRESETS key
const PRESET_KEY_MAP: Record<string, string> = {
  clean: 'clean',
  'kylo-unstable': 'kylo-unstable',
  'cave-echo': 'cave-echo',
  'lo-fi-retro': 'lofi-retro',
  underwater: 'underwater',
  'force-tunnel': 'force-tunnel',
};

// UI-friendly mixer values for each preset (matching the old switch/case)
const PRESET_MIXER_OVERRIDES: Record<string, Partial<MixerValues>> = {
  'kylo-unstable': { distortion: 60, treble: 4, bass: -3 },
  'cave-echo': { reverb: 80, delay: 50, bass: 3 },
  'lo-fi-retro': { bitcrusher: 70, treble: -6, bass: 2 },
  underwater: { treble: -10, bass: 6, chorus: 40 },
  'force-tunnel': { phaser: 60, reverb: 50, pitchShift: -2 },
};

export interface AudioMixerStore {
  /** Current slider values */
  mixerValues: MixerValues;
  /** Currently selected preset id */
  activePresetId: string;

  /** Set a single mixer slider value */
  setMixerValue: (id: keyof MixerValues, value: number) => void;
  /** Apply a named preset (updates both slider values and activePresetId) */
  applyPreset: (presetId: string) => void;
  /** Reset all sliders to defaults and preset to 'clean' */
  resetToDefaults: () => void;

  /**
   * Build an AudioFilterChainConfig from the current mixer slider values.
   * This is the bridge between the simple UI sliders and the full filter
   * chain config the engine needs.
   */
  buildFilterChainConfig: () => AudioFilterChainConfig;
}

// ---------------------------------------------------------------------------
// Helper: convert the simple mixer slider values into a full
// AudioFilterChainConfig that the AudioFilterChain engine understands.
// ---------------------------------------------------------------------------

function staticSource(value: number) {
  return { type: 'static' as const, value, outputMin: value, outputMax: value };
}

function makeParam(
  name: string,
  displayName: string,
  value: number,
  min: number,
  max: number,
  unit?: string,
) {
  return {
    name,
    displayName,
    source: staticSource(value),
    defaultValue: value,
    min,
    max,
    unit,
  };
}

function mixParam(value: number) {
  return makeParam('mix', 'Mix', value, 0, 1);
}

let _filterId = 0;
function nextFilterId(): string {
  _filterId++;
  return `mixer-filter-${_filterId}`;
}

function buildConfigFromValues(values: MixerValues): AudioFilterChainConfig {
  _filterId = 0;
  const filters: AudioFilterChainConfig['filters'] = [];

  // ── EQ: bass (lowshelf-like via lowpass boost), mid (bandpass), treble (highpass) ──
  // We model bass/mid/treble as biquad filters with gain mapped to Q and frequency
  if (values.bass !== 0) {
    const gain = Math.pow(10, Math.abs(values.bass) / 20);
    // Boost: low-pass at 250 Hz with moderate Q
    // Cut: high-pass at 250 Hz (inverted approach via low-pass + reduced gain)
    // For simplicity, use a lowpass filter with frequency and Q derived from gain
    filters.push({
      id: nextFilterId(),
      type: values.bass > 0 ? 'lowpass' : 'highpass',
      enabled: true,
      parameters: {
        frequency: makeParam('frequency', 'Frequency', 250, 20, 20000, 'Hz'),
        Q: makeParam('Q', 'Resonance', Math.min(gain * 0.8, 5), 0.1, 20),
      },
      appliesTo: 'all',
      mix: mixParam(Math.min(Math.abs(values.bass) / 12, 1)),
    });
  }

  if (values.mid !== 0) {
    const qScale = Math.abs(values.mid) / 12;
    filters.push({
      id: nextFilterId(),
      type: 'bandpass',
      enabled: true,
      parameters: {
        frequency: makeParam('frequency', 'Center Frequency', 1000, 20, 20000, 'Hz'),
        Q: makeParam('Q', 'Bandwidth', 1 + qScale * 3, 0.1, 20),
      },
      appliesTo: 'all',
      mix: mixParam(Math.min(Math.abs(values.mid) / 12, 1) * 0.5),
    });
  }

  if (values.treble !== 0) {
    const gain = Math.pow(10, Math.abs(values.treble) / 20);
    filters.push({
      id: nextFilterId(),
      type: values.treble > 0 ? 'highpass' : 'lowpass',
      enabled: true,
      parameters: {
        frequency: makeParam('frequency', 'Frequency', 4000, 20, 20000, 'Hz'),
        Q: makeParam('Q', 'Resonance', Math.min(gain * 0.6, 5), 0.1, 20),
      },
      appliesTo: 'all',
      mix: mixParam(Math.min(Math.abs(values.treble) / 12, 1)),
    });
  }

  // ── Distortion ──
  if (values.distortion > 0) {
    const drive = values.distortion / 100;
    filters.push({
      id: nextFilterId(),
      type: 'distortion',
      enabled: true,
      parameters: {
        drive: makeParam('drive', 'Drive', drive, 0, 1),
        tone: makeParam('tone', 'Tone', 2000 + drive * 4000, 200, 8000, 'Hz'),
        type: makeParam('type', 'Type', drive > 0.6 ? 1 : 0, 0, 2),
      },
      appliesTo: 'all',
      mix: mixParam(drive),
    });
  }

  // ── Reverb ──
  if (values.reverb > 0) {
    const amount = values.reverb / 100;
    filters.push({
      id: nextFilterId(),
      type: 'reverb',
      enabled: true,
      parameters: {
        roomSize: makeParam('roomSize', 'Room Size', amount * 0.8, 0, 1),
        decay: makeParam('decay', 'Decay', 0.5 + amount * 4, 0.1, 10, 's'),
        preDelay: makeParam('preDelay', 'Pre-Delay', 10 + amount * 30, 0, 100, 'ms'),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  // ── Delay ──
  if (values.delay > 0) {
    const amount = values.delay / 100;
    filters.push({
      id: nextFilterId(),
      type: 'delay',
      enabled: true,
      parameters: {
        time: makeParam('time', 'Delay Time', 100 + amount * 600, 10, 2000, 'ms'),
        feedback: makeParam('feedback', 'Feedback', amount * 0.6, 0, 0.95),
        mix: makeParam('mix', 'Mix', amount * 0.5, 0, 1),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  // ── Chorus ──
  if (values.chorus > 0) {
    const amount = values.chorus / 100;
    filters.push({
      id: nextFilterId(),
      type: 'chorus',
      enabled: true,
      parameters: {
        rate: makeParam('rate', 'Rate', 0.5 + amount * 2, 0.1, 5, 'Hz'),
        depth: makeParam('depth', 'Depth', amount, 0, 1),
        voices: makeParam('voices', 'Voices', Math.round(2 + amount * 3), 2, 5),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  // ── Phaser ──
  if (values.phaser > 0) {
    const amount = values.phaser / 100;
    filters.push({
      id: nextFilterId(),
      type: 'phaser',
      enabled: true,
      parameters: {
        rate: makeParam('rate', 'Rate', 0.2 + amount * 2, 0.05, 5, 'Hz'),
        stages: makeParam('stages', 'Stages', Math.round(2 + amount * 8), 2, 12),
        depth: makeParam('depth', 'Depth', amount, 0, 1),
        feedback: makeParam('feedback', 'Feedback', amount * 0.5, 0, 0.8),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  // ── Bitcrusher ──
  if (values.bitcrusher > 0) {
    const amount = values.bitcrusher / 100;
    filters.push({
      id: nextFilterId(),
      type: 'bitcrusher',
      enabled: true,
      parameters: {
        bitDepth: makeParam('bitDepth', 'Bit Depth', Math.round(16 - amount * 12), 1, 16),
        sampleRate: makeParam('sampleRate', 'Sample Rate', Math.round(44100 - amount * 36000), 500, 44100, 'Hz'),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  // ── Pitch Shift ──
  if (values.pitchShift !== 0) {
    filters.push({
      id: nextFilterId(),
      type: 'pitch-shift',
      enabled: true,
      parameters: {
        semitones: makeParam('semitones', 'Semitones', values.pitchShift, -12, 12),
        detune: makeParam('detune', 'Detune', 0, -100, 100, 'cents'),
      },
      appliesTo: 'all',
      mix: mixParam(1),
    });
  }

  // ── Compressor ──
  if (values.compressor > 0) {
    const amount = values.compressor / 100;
    filters.push({
      id: nextFilterId(),
      type: 'compressor',
      enabled: true,
      parameters: {
        threshold: makeParam('threshold', 'Threshold', -10 - amount * 30, -60, 0, 'dB'),
        ratio: makeParam('ratio', 'Ratio', 1 + amount * 15, 1, 20),
        attack: makeParam('attack', 'Attack', 5 + amount * 20, 0.1, 100, 'ms'),
        release: makeParam('release', 'Release', 100 + amount * 400, 10, 1000, 'ms'),
        knee: makeParam('knee', 'Knee', 10, 0, 40, 'dB'),
      },
      appliesTo: 'all',
      mix: mixParam(amount),
    });
  }

  return {
    id: 'mixer-chain',
    name: 'Mixer',
    filters,
    masterVolume: values.volume / 100,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAudioMixerStore = create<AudioMixerStore>((set, get) => ({
  mixerValues: { ...DEFAULT_MIXER_VALUES },
  activePresetId: 'clean',

  setMixerValue: (id, value) =>
    set((state) => ({
      mixerValues: { ...state.mixerValues, [id]: value },
      // Clear preset when user manually adjusts a slider
      activePresetId: '',
    })),

  applyPreset: (presetId) => {
    // If a matching engine preset exists, we could apply it directly.
    // But we also update the UI sliders so the panel stays in sync.
    const overrides = PRESET_MIXER_OVERRIDES[presetId];
    const newValues = { ...DEFAULT_MIXER_VALUES, ...overrides };
    set({ mixerValues: newValues, activePresetId: presetId });
  },

  resetToDefaults: () =>
    set({
      mixerValues: { ...DEFAULT_MIXER_VALUES },
      activePresetId: 'clean',
    }),

  buildFilterChainConfig: () => {
    const { activePresetId, mixerValues } = get();

    // If an engine preset exists for the active preset, use it directly
    // for more nuanced parameter mapping
    const engineKey = PRESET_KEY_MAP[activePresetId];
    if (engineKey && FILTER_CHAIN_PRESETS[engineKey]) {
      const preset = FILTER_CHAIN_PRESETS[engineKey];
      return {
        ...preset,
        masterVolume: mixerValues.volume / 100,
      };
    }

    // Otherwise, build from the slider values
    return buildConfigFromValues(mixerValues);
  },
}));
