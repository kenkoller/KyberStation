export type AudioFilterType =
  | 'pitch-shift'
  | 'reverb'
  | 'distortion'
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'tremolo'
  | 'chorus'
  | 'delay'
  | 'flanger'
  | 'phaser'
  | 'bitcrusher'
  | 'compressor';

export type ParameterSourceType =
  | 'static'
  | 'swing-speed'
  | 'blade-angle'
  | 'twist-angle'
  | 'sound-level'
  | 'battery-level'
  | 'ignition-progress'
  | 'random-noise'
  | 'lfo'
  | 'manual';

export type LFOWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface ParameterSource {
  type: ParameterSourceType;
  value?: number;
  inputMin?: number;
  inputMax?: number;
  outputMin: number;
  outputMax: number;
  lfoWaveform?: LFOWaveform;
  lfoRate?: number;
  lfoPhase?: number;
  smoothing?: number;
}

export interface FilterParameter {
  name: string;
  displayName: string;
  source: ParameterSource;
  unit?: string;
  defaultValue: number;
  min: number;
  max: number;
}

export interface AudioFilterConfig {
  id: string;
  type: AudioFilterType;
  enabled: boolean;
  parameters: Record<string, FilterParameter>;
  appliesTo: string[] | 'all';
  mix: FilterParameter;
}

export interface AudioFilterChainConfig {
  id: string;
  name: string;
  filters: AudioFilterConfig[];
  masterVolume: number;
}

export interface DynamicParameterSources {
  swingSpeed: number;
  bladeAngle: number;
  twistAngle: number;
  soundLevel: number;
  batteryLevel: number;
  ignitionProgress: number;
  time: number;
}
