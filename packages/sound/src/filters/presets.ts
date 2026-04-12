import type {
  AudioFilterChainConfig,
  AudioFilterConfig,
  FilterParameter,
  ParameterSource,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers for building preset configs concisely
// ---------------------------------------------------------------------------

function staticSource(value: number): ParameterSource {
  return {
    type: 'static',
    value,
    outputMin: value,
    outputMax: value,
  };
}

function dynamicSource(
  type: ParameterSource['type'],
  outputMin: number,
  outputMax: number,
  smoothing?: number,
): ParameterSource {
  return {
    type,
    outputMin,
    outputMax,
    smoothing,
  };
}

function param(
  name: string,
  displayName: string,
  value: number,
  min: number,
  max: number,
  source?: ParameterSource,
  unit?: string,
): FilterParameter {
  return {
    name,
    displayName,
    source: source ?? staticSource(value),
    unit,
    defaultValue: value,
    min,
    max,
  };
}

function mixParam(value: number): FilterParameter {
  return param('mix', 'Mix', value, 0, 1);
}

let filterIdCounter = 0;

function filter(
  type: AudioFilterConfig['type'],
  parameters: Record<string, FilterParameter>,
  mix = 1.0,
): AudioFilterConfig {
  filterIdCounter++;
  return {
    id: `preset-filter-${filterIdCounter}`,
    type,
    enabled: true,
    parameters,
    appliesTo: 'all',
    mix: mixParam(mix),
  };
}

// Reset counter between presets
function resetIds(): void {
  filterIdCounter = 0;
}

// ---------------------------------------------------------------------------
// Preset: Clean (empty chain)
// ---------------------------------------------------------------------------

function createCleanPreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-clean',
    name: 'Clean',
    filters: [],
    masterVolume: 1.0,
  };
}

// ---------------------------------------------------------------------------
// Preset: Kylo Unstable
// ---------------------------------------------------------------------------

function createKyloUnstablePreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-kylo-unstable',
    name: 'Kylo Unstable',
    filters: [
      filter('distortion', {
        drive: param('drive', 'Drive', 0.7, 0, 1),
        tone: param('tone', 'Tone', 2000, 200, 8000, undefined, 'Hz'),
        type: param('type', 'Type', 1, 0, 2), // hard
      }),
      filter('highpass', {
        frequency: param(
          'frequency',
          'Frequency',
          200,
          20,
          20000,
          undefined,
          'Hz',
        ),
        Q: param('Q', 'Resonance', 1, 0.1, 20),
      }),
    ],
    masterVolume: 0.9,
  };
}

// ---------------------------------------------------------------------------
// Preset: Cave Echo
// ---------------------------------------------------------------------------

function createCaveEchoPreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-cave-echo',
    name: 'Cave Echo',
    filters: [
      filter('reverb', {
        roomSize: param('roomSize', 'Room Size', 0.8, 0, 1),
        decay: param('decay', 'Decay', 3, 0.1, 10, undefined, 's'),
        preDelay: param('preDelay', 'Pre-Delay', 20, 0, 100, undefined, 'ms'),
      }),
      filter('delay', {
        time: param('time', 'Delay Time', 400, 10, 2000, undefined, 'ms'),
        feedback: param('feedback', 'Feedback', 0.5, 0, 0.95),
        mix: param('mix', 'Mix', 0.4, 0, 1),
      }),
    ],
    masterVolume: 0.85,
  };
}

// ---------------------------------------------------------------------------
// Preset: Lo-Fi Retro
// ---------------------------------------------------------------------------

function createLoFiRetroPreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-lofi-retro',
    name: 'Lo-Fi Retro',
    filters: [
      filter('bitcrusher', {
        bitDepth: param('bitDepth', 'Bit Depth', 8, 1, 16),
        sampleRate: param(
          'sampleRate',
          'Sample Rate',
          8000,
          500,
          44100,
          undefined,
          'Hz',
        ),
      }),
      filter('lowpass', {
        frequency: param(
          'frequency',
          'Frequency',
          4000,
          20,
          20000,
          undefined,
          'Hz',
        ),
        Q: param('Q', 'Resonance', 1, 0.1, 20),
      }),
    ],
    masterVolume: 0.9,
  };
}

// ---------------------------------------------------------------------------
// Preset: Underwater
// ---------------------------------------------------------------------------

function createUnderwaterPreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-underwater',
    name: 'Underwater',
    filters: [
      filter('lowpass', {
        frequency: param(
          'frequency',
          'Frequency',
          800,
          20,
          20000,
          undefined,
          'Hz',
        ),
        Q: param('Q', 'Resonance', 5, 0.1, 20),
      }),
      filter('chorus', {
        rate: param('rate', 'Rate', 0.3, 0.1, 5, undefined, 'Hz'),
        depth: param('depth', 'Depth', 0.6, 0, 1),
        voices: param('voices', 'Voices', 3, 2, 5),
      }),
    ],
    masterVolume: 0.8,
  };
}

// ---------------------------------------------------------------------------
// Preset: Force Tunnel
// ---------------------------------------------------------------------------

function createForceTunnelPreset(): AudioFilterChainConfig {
  resetIds();
  return {
    id: 'preset-force-tunnel',
    name: 'Force Tunnel',
    filters: [
      filter('phaser', {
        rate: param('rate', 'Rate', 0.5, 0.05, 5, undefined, 'Hz'),
        stages: param('stages', 'Stages', 6, 2, 12),
        depth: param('depth', 'Depth', 0.7, 0, 1),
        feedback: param('feedback', 'Feedback', 0.4, 0, 0.8),
      }),
      filter('reverb', {
        roomSize: param('roomSize', 'Room Size', 0.6, 0, 1),
        decay: param('decay', 'Decay', 2, 0.1, 10, undefined, 's'),
        preDelay: param('preDelay', 'Pre-Delay', 15, 0, 100, undefined, 'ms'),
      }),
      filter('pitch-shift', {
        semitones: param(
          'semitones',
          'Semitones',
          0,
          -12,
          12,
          dynamicSource('swing-speed', -3, 3, 0.8),
        ),
        detune: param('detune', 'Detune', 0, -100, 100, undefined, 'cents'),
      }),
    ],
    masterVolume: 0.85,
  };
}

// ---------------------------------------------------------------------------
// Export all presets
// ---------------------------------------------------------------------------

export const FILTER_CHAIN_PRESETS: Record<string, AudioFilterChainConfig> = {
  clean: createCleanPreset(),
  'kylo-unstable': createKyloUnstablePreset(),
  'cave-echo': createCaveEchoPreset(),
  'lofi-retro': createLoFiRetroPreset(),
  underwater: createUnderwaterPreset(),
  'force-tunnel': createForceTunnelPreset(),
};
