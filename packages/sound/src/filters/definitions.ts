import type { AudioFilterType } from './types.js';

export interface ParameterSchema {
  displayName: string;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface FilterDefinition {
  type: AudioFilterType;
  name: string;
  description: string;
  category: 'eq' | 'dynamics' | 'modulation' | 'time' | 'distortion' | 'special';
  parameters: Record<string, ParameterSchema>;
}

export const FILTER_DEFINITIONS: Record<AudioFilterType, FilterDefinition> = {
  lowpass: {
    type: 'lowpass',
    name: 'Low-Pass Filter',
    description: 'Attenuates frequencies above the cutoff point',
    category: 'eq',
    parameters: {
      frequency: {
        displayName: 'Frequency',
        defaultValue: 1000,
        min: 20,
        max: 20000,
        step: 1,
        unit: 'Hz',
      },
      Q: {
        displayName: 'Resonance (Q)',
        defaultValue: 1,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
    },
  },

  highpass: {
    type: 'highpass',
    name: 'High-Pass Filter',
    description: 'Attenuates frequencies below the cutoff point',
    category: 'eq',
    parameters: {
      frequency: {
        displayName: 'Frequency',
        defaultValue: 200,
        min: 20,
        max: 20000,
        step: 1,
        unit: 'Hz',
      },
      Q: {
        displayName: 'Resonance (Q)',
        defaultValue: 1,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
    },
  },

  bandpass: {
    type: 'bandpass',
    name: 'Band-Pass Filter',
    description: 'Passes frequencies within a range and attenuates outside it',
    category: 'eq',
    parameters: {
      frequency: {
        displayName: 'Center Frequency',
        defaultValue: 1000,
        min: 20,
        max: 20000,
        step: 1,
        unit: 'Hz',
      },
      Q: {
        displayName: 'Bandwidth (Q)',
        defaultValue: 1,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
    },
  },

  distortion: {
    type: 'distortion',
    name: 'Distortion',
    description: 'Adds harmonic distortion with controllable drive and tone',
    category: 'distortion',
    parameters: {
      drive: {
        displayName: 'Drive',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      tone: {
        displayName: 'Tone',
        defaultValue: 2000,
        min: 200,
        max: 8000,
        step: 1,
        unit: 'Hz',
      },
      type: {
        displayName: 'Type',
        defaultValue: 0,
        min: 0,
        max: 2,
        step: 1,
      },
    },
  },

  reverb: {
    type: 'reverb',
    name: 'Reverb',
    description: 'Simulates acoustic space with configurable room size and decay',
    category: 'time',
    parameters: {
      roomSize: {
        displayName: 'Room Size',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      decay: {
        displayName: 'Decay',
        defaultValue: 2,
        min: 0.1,
        max: 10,
        step: 0.1,
        unit: 's',
      },
      preDelay: {
        displayName: 'Pre-Delay',
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 1,
        unit: 'ms',
      },
    },
  },

  delay: {
    type: 'delay',
    name: 'Delay',
    description: 'Echoes the signal with configurable time and feedback',
    category: 'time',
    parameters: {
      time: {
        displayName: 'Delay Time',
        defaultValue: 300,
        min: 10,
        max: 2000,
        step: 1,
        unit: 'ms',
      },
      feedback: {
        displayName: 'Feedback',
        defaultValue: 0.3,
        min: 0,
        max: 0.95,
        step: 0.01,
      },
      mix: {
        displayName: 'Mix',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
  },

  tremolo: {
    type: 'tremolo',
    name: 'Tremolo',
    description: 'Modulates volume at a periodic rate',
    category: 'modulation',
    parameters: {
      rate: {
        displayName: 'Rate',
        defaultValue: 5,
        min: 0.1,
        max: 20,
        step: 0.1,
        unit: 'Hz',
      },
      depth: {
        displayName: 'Depth',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      waveform: {
        displayName: 'Waveform',
        defaultValue: 0,
        min: 0,
        max: 2,
        step: 1,
      },
    },
  },

  chorus: {
    type: 'chorus',
    name: 'Chorus',
    description: 'Creates a thicker sound with multiple detuned voices',
    category: 'modulation',
    parameters: {
      rate: {
        displayName: 'Rate',
        defaultValue: 1.5,
        min: 0.1,
        max: 5,
        step: 0.1,
        unit: 'Hz',
      },
      depth: {
        displayName: 'Depth',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      voices: {
        displayName: 'Voices',
        defaultValue: 3,
        min: 2,
        max: 5,
        step: 1,
      },
    },
  },

  flanger: {
    type: 'flanger',
    name: 'Flanger',
    description: 'Creates a sweeping comb filter effect',
    category: 'modulation',
    parameters: {
      rate: {
        displayName: 'Rate',
        defaultValue: 0.5,
        min: 0.05,
        max: 5,
        step: 0.01,
        unit: 'Hz',
      },
      depth: {
        displayName: 'Depth',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      feedback: {
        displayName: 'Feedback',
        defaultValue: 0.5,
        min: 0,
        max: 0.95,
        step: 0.01,
      },
    },
  },

  phaser: {
    type: 'phaser',
    name: 'Phaser',
    description: 'Creates phase-shifted sweeps through allpass filters',
    category: 'modulation',
    parameters: {
      rate: {
        displayName: 'Rate',
        defaultValue: 0.5,
        min: 0.05,
        max: 5,
        step: 0.01,
        unit: 'Hz',
      },
      stages: {
        displayName: 'Stages',
        defaultValue: 4,
        min: 2,
        max: 12,
        step: 2,
      },
      depth: {
        displayName: 'Depth',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      feedback: {
        displayName: 'Feedback',
        defaultValue: 0.3,
        min: 0,
        max: 0.8,
        step: 0.01,
      },
    },
  },

  bitcrusher: {
    type: 'bitcrusher',
    name: 'Bitcrusher',
    description: 'Reduces bit depth and sample rate for a lo-fi effect',
    category: 'special',
    parameters: {
      bitDepth: {
        displayName: 'Bit Depth',
        defaultValue: 8,
        min: 1,
        max: 16,
        step: 1,
      },
      sampleRate: {
        displayName: 'Sample Rate',
        defaultValue: 11025,
        min: 500,
        max: 44100,
        step: 1,
        unit: 'Hz',
      },
    },
  },

  'pitch-shift': {
    type: 'pitch-shift',
    name: 'Pitch Shift',
    description: 'Shifts the pitch of the audio up or down',
    category: 'special',
    parameters: {
      semitones: {
        displayName: 'Semitones',
        defaultValue: 0,
        min: -12,
        max: 12,
        step: 1,
      },
      detune: {
        displayName: 'Detune',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'cents',
      },
    },
  },

  compressor: {
    type: 'compressor',
    name: 'Compressor',
    description: 'Reduces dynamic range by compressing loud signals',
    category: 'dynamics',
    parameters: {
      threshold: {
        displayName: 'Threshold',
        defaultValue: -24,
        min: -60,
        max: 0,
        step: 0.5,
        unit: 'dB',
      },
      ratio: {
        displayName: 'Ratio',
        defaultValue: 4,
        min: 1,
        max: 20,
        step: 0.5,
      },
      attack: {
        displayName: 'Attack',
        defaultValue: 10,
        min: 0.1,
        max: 100,
        step: 0.1,
        unit: 'ms',
      },
      release: {
        displayName: 'Release',
        defaultValue: 250,
        min: 10,
        max: 1000,
        step: 1,
        unit: 'ms',
      },
      knee: {
        displayName: 'Knee',
        defaultValue: 10,
        min: 0,
        max: 40,
        step: 0.5,
        unit: 'dB',
      },
    },
  },
};
