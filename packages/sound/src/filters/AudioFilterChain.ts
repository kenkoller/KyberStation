import type {
  AudioFilterType,
  AudioFilterChainConfig,
  DynamicParameterSources,
} from './types.js';
import { ParameterResolver } from './ParameterResolver.js';

// ---------------------------------------------------------------------------
// AudioFilterNodeWrapper – thin abstraction over Web Audio filter graphs
// ---------------------------------------------------------------------------

interface AudioFilterNodeWrapper {
  type: AudioFilterType;
  inputNode: AudioNode;
  outputNode: AudioNode;
  updateParam(name: string, value: number): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Helper: distortion curve generation
// ---------------------------------------------------------------------------

type DistortionType = 'soft' | 'hard' | 'fuzz';

const DISTORTION_TYPES: DistortionType[] = ['soft', 'hard', 'fuzz'];

function makeDistortionCurve(
  drive: number,
  type: DistortionType,
): Float32Array<ArrayBuffer> {
  const samples = 44100;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    switch (type) {
      case 'soft':
        curve[i] = Math.tanh(x * (1 + drive * 10));
        break;
      case 'hard':
        curve[i] = Math.max(-1, Math.min(1, x * (1 + drive * 20)));
        break;
      case 'fuzz':
        curve[i] =
          Math.sign(x) * Math.pow(Math.abs(x), 1 / (1 + drive * 5));
        break;
    }
  }
  return curve;
}

// ---------------------------------------------------------------------------
// Helper: algorithmic impulse response generation
// ---------------------------------------------------------------------------

function generateImpulseResponse(
  context: AudioContext,
  duration: number,
  decay: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * decay));
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Factory functions for each filter type
// ---------------------------------------------------------------------------

function createBiquadFilter(
  context: AudioContext,
  type: BiquadFilterType,
): AudioFilterNodeWrapper {
  const filter = context.createBiquadFilter();
  filter.type = type;
  return {
    type: type as AudioFilterType,
    inputNode: filter,
    outputNode: filter,
    updateParam(name: string, value: number) {
      if (name === 'frequency') {
        filter.frequency.setTargetAtTime(value, context.currentTime, 0.01);
      } else if (name === 'Q') {
        filter.Q.setTargetAtTime(value, context.currentTime, 0.01);
      }
    },
    dispose() {
      filter.disconnect();
    },
  };
}

function createDistortionFilter(
  context: AudioContext,
): AudioFilterNodeWrapper {
  const waveshaper = context.createWaveShaper();
  const toneFilter = context.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 2000;
  waveshaper.connect(toneFilter);

  let currentDrive = 0.5;
  let currentType: DistortionType = 'soft';
  waveshaper.curve = makeDistortionCurve(currentDrive, currentType);

  return {
    type: 'distortion',
    inputNode: waveshaper,
    outputNode: toneFilter,
    updateParam(name: string, value: number) {
      if (name === 'drive') {
        currentDrive = value;
        waveshaper.curve = makeDistortionCurve(currentDrive, currentType);
      } else if (name === 'tone') {
        toneFilter.frequency.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      } else if (name === 'type') {
        currentType = DISTORTION_TYPES[Math.round(value)] ?? 'soft';
        waveshaper.curve = makeDistortionCurve(currentDrive, currentType);
      }
    },
    dispose() {
      waveshaper.disconnect();
      toneFilter.disconnect();
    },
  };
}

function createReverbFilter(context: AudioContext): AudioFilterNodeWrapper {
  const convolver = context.createConvolver();
  const preDelayNode = context.createDelay(0.1);
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const merger = context.createGain();

  // Input splits to dry + pre-delay -> convolver (wet)
  const inputSplitter = context.createGain();
  inputSplitter.connect(dryGain);
  inputSplitter.connect(preDelayNode);
  preDelayNode.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(merger);
  wetGain.connect(merger);

  dryGain.gain.value = 0.5;
  wetGain.gain.value = 0.5;

  let currentRoomSize = 0.5;
  let currentDecay = 2;

  // Generate initial impulse response
  const duration = currentRoomSize * 4 + 0.5;
  convolver.buffer = generateImpulseResponse(context, duration, currentDecay);

  return {
    type: 'reverb',
    inputNode: inputSplitter,
    outputNode: merger,
    updateParam(name: string, value: number) {
      if (name === 'roomSize') {
        currentRoomSize = value;
        const dur = currentRoomSize * 4 + 0.5;
        convolver.buffer = generateImpulseResponse(
          context,
          dur,
          currentDecay,
        );
      } else if (name === 'decay') {
        currentDecay = value;
        const dur = currentRoomSize * 4 + 0.5;
        convolver.buffer = generateImpulseResponse(
          context,
          dur,
          currentDecay,
        );
      } else if (name === 'preDelay') {
        preDelayNode.delayTime.setTargetAtTime(
          value / 1000,
          context.currentTime,
          0.01,
        );
      }
    },
    dispose() {
      inputSplitter.disconnect();
      preDelayNode.disconnect();
      convolver.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      merger.disconnect();
    },
  };
}

function createDelayFilter(context: AudioContext): AudioFilterNodeWrapper {
  const inputGain = context.createGain();
  const delayNode = context.createDelay(2.0);
  const feedbackGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const outputGain = context.createGain();

  // Dry path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Wet path with feedback loop
  inputGain.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode); // feedback loop
  delayNode.connect(wetGain);
  wetGain.connect(outputGain);

  delayNode.delayTime.value = 0.3;
  feedbackGain.gain.value = 0.3;
  dryGain.gain.value = 1;
  wetGain.gain.value = 0.5;

  return {
    type: 'delay',
    inputNode: inputGain,
    outputNode: outputGain,
    updateParam(name: string, value: number) {
      if (name === 'time') {
        delayNode.delayTime.setTargetAtTime(
          value / 1000,
          context.currentTime,
          0.01,
        );
      } else if (name === 'feedback') {
        feedbackGain.gain.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      } else if (name === 'mix') {
        wetGain.gain.setTargetAtTime(value, context.currentTime, 0.01);
        dryGain.gain.setTargetAtTime(1 - value, context.currentTime, 0.01);
      }
    },
    dispose() {
      inputGain.disconnect();
      delayNode.disconnect();
      feedbackGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      outputGain.disconnect();
    },
  };
}

function createTremoloFilter(context: AudioContext): AudioFilterNodeWrapper {
  const inputGain = context.createGain();
  const tremoloGain = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  inputGain.connect(tremoloGain);

  // LFO modulates the gain
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  lfo.connect(lfoGain);
  lfoGain.connect(tremoloGain.gain);
  lfoGain.gain.value = 0.5; // depth
  tremoloGain.gain.value = 0.5; // center (1 - depth/2)
  lfo.start();

  const WAVEFORM_TYPES: OscillatorType[] = ['sine', 'triangle', 'square'];

  return {
    type: 'tremolo',
    inputNode: inputGain,
    outputNode: tremoloGain,
    updateParam(name: string, value: number) {
      if (name === 'rate') {
        lfo.frequency.setTargetAtTime(value, context.currentTime, 0.01);
      } else if (name === 'depth') {
        lfoGain.gain.setTargetAtTime(value / 2, context.currentTime, 0.01);
        tremoloGain.gain.setTargetAtTime(
          1 - value / 2,
          context.currentTime,
          0.01,
        );
      } else if (name === 'waveform') {
        lfo.type = WAVEFORM_TYPES[Math.round(value)] ?? 'sine';
      }
    },
    dispose() {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      inputGain.disconnect();
      tremoloGain.disconnect();
    },
  };
}

function createChorusFilter(context: AudioContext): AudioFilterNodeWrapper {
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const dryGain = context.createGain();
  dryGain.gain.value = 0.5;
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Create multiple delay lines modulated by LFOs for chorus effect
  const maxVoices = 5;
  const voiceNodes: {
    delay: DelayNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    wet: GainNode;
  }[] = [];

  for (let v = 0; v < maxVoices; v++) {
    const delay = context.createDelay(0.05);
    delay.delayTime.value = 0.01 + v * 0.005;
    const lfo = context.createOscillator();
    lfo.frequency.value = 1.5 + v * 0.2;
    lfo.type = 'sine';
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.002; // depth in seconds
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();

    const wet = context.createGain();
    wet.gain.value = v < 3 ? 0.5 / 3 : 0; // default 3 voices
    inputGain.connect(delay);
    delay.connect(wet);
    wet.connect(outputGain);

    voiceNodes.push({ delay, lfo, lfoGain, wet });
  }

  let activeVoices = 3;

  return {
    type: 'chorus',
    inputNode: inputGain,
    outputNode: outputGain,
    updateParam(name: string, value: number) {
      if (name === 'rate') {
        voiceNodes.forEach((v, i) => {
          v.lfo.frequency.setTargetAtTime(
            value + i * 0.2,
            context.currentTime,
            0.01,
          );
        });
      } else if (name === 'depth') {
        voiceNodes.forEach((v) => {
          v.lfoGain.gain.setTargetAtTime(
            value * 0.005,
            context.currentTime,
            0.01,
          );
        });
      } else if (name === 'voices') {
        activeVoices = Math.round(value);
        voiceNodes.forEach((v, i) => {
          v.wet.gain.setTargetAtTime(
            i < activeVoices ? 0.5 / activeVoices : 0,
            context.currentTime,
            0.01,
          );
        });
      }
    },
    dispose() {
      inputGain.disconnect();
      dryGain.disconnect();
      outputGain.disconnect();
      voiceNodes.forEach((v) => {
        v.lfo.stop();
        v.lfo.disconnect();
        v.lfoGain.disconnect();
        v.delay.disconnect();
        v.wet.disconnect();
      });
    },
  };
}

function createFlangerFilter(context: AudioContext): AudioFilterNodeWrapper {
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const delay = context.createDelay(0.02);
  const feedbackGain = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  delay.delayTime.value = 0.005;

  // Dry path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);
  dryGain.gain.value = 0.5;

  // Wet path with feedback
  inputGain.connect(delay);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(outputGain);
  wetGain.gain.value = 0.5;
  feedbackGain.gain.value = 0.5;

  // LFO modulates delay time
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  lfo.connect(lfoGain);
  lfoGain.gain.value = 0.002; // depth in seconds
  lfoGain.connect(delay.delayTime);
  lfo.start();

  return {
    type: 'flanger',
    inputNode: inputGain,
    outputNode: outputGain,
    updateParam(name: string, value: number) {
      if (name === 'rate') {
        lfo.frequency.setTargetAtTime(value, context.currentTime, 0.01);
      } else if (name === 'depth') {
        lfoGain.gain.setTargetAtTime(
          value * 0.005,
          context.currentTime,
          0.01,
        );
      } else if (name === 'feedback') {
        feedbackGain.gain.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      }
    },
    dispose() {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      inputGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      delay.disconnect();
      feedbackGain.disconnect();
      outputGain.disconnect();
    },
  };
}

function createPhaserFilter(context: AudioContext): AudioFilterNodeWrapper {
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const feedbackGain = context.createGain();

  dryGain.gain.value = 0.5;
  wetGain.gain.value = 0.5;
  feedbackGain.gain.value = 0.3;

  // Create max 12 allpass stages
  const maxStages = 12;
  const allpassFilters: BiquadFilterNode[] = [];
  const lfo = context.createOscillator();
  const lfoGains: GainNode[] = [];

  lfo.type = 'sine';
  lfo.frequency.value = 0.5;

  for (let i = 0; i < maxStages; i++) {
    const allpass = context.createBiquadFilter();
    allpass.type = 'allpass';
    allpass.frequency.value = 1000 + i * 500;
    allpassFilters.push(allpass);

    const lg = context.createGain();
    lg.gain.value = 500 + i * 200;
    lfo.connect(lg);
    lg.connect(allpass.frequency);
    lfoGains.push(lg);
  }

  // Chain allpass filters
  let activeStages = 4;

  function rebuildChain(): void {
    // Disconnect everything
    inputGain.disconnect();
    allpassFilters.forEach((f) => f.disconnect());
    feedbackGain.disconnect();
    wetGain.disconnect();
    dryGain.disconnect();

    // Dry path
    inputGain.connect(dryGain);
    dryGain.connect(outputGain);

    // Wet path: input -> allpass chain -> wet gain -> output
    if (activeStages > 0) {
      inputGain.connect(allpassFilters[0]);
      for (let i = 0; i < activeStages - 1; i++) {
        allpassFilters[i].connect(allpassFilters[i + 1]);
      }
      allpassFilters[activeStages - 1].connect(wetGain);
      allpassFilters[activeStages - 1].connect(feedbackGain);
      feedbackGain.connect(allpassFilters[0]);
      wetGain.connect(outputGain);
    }
  }

  lfo.start();
  rebuildChain();

  return {
    type: 'phaser',
    inputNode: inputGain,
    outputNode: outputGain,
    updateParam(name: string, value: number) {
      if (name === 'rate') {
        lfo.frequency.setTargetAtTime(value, context.currentTime, 0.01);
      } else if (name === 'stages') {
        const newStages = Math.round(value);
        if (newStages !== activeStages && newStages >= 2 && newStages <= maxStages) {
          activeStages = newStages;
          rebuildChain();
        }
      } else if (name === 'depth') {
        lfoGains.forEach((lg, i) => {
          lg.gain.setTargetAtTime(
            value * (500 + i * 200),
            context.currentTime,
            0.01,
          );
        });
      } else if (name === 'feedback') {
        feedbackGain.gain.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      }
    },
    dispose() {
      lfo.stop();
      lfo.disconnect();
      lfoGains.forEach((lg) => lg.disconnect());
      inputGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      feedbackGain.disconnect();
      allpassFilters.forEach((f) => f.disconnect());
      outputGain.disconnect();
    },
  };
}

function createCompressorFilter(
  context: AudioContext,
): AudioFilterNodeWrapper {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.25;
  compressor.knee.value = 10;

  return {
    type: 'compressor',
    inputNode: compressor,
    outputNode: compressor,
    updateParam(name: string, value: number) {
      if (name === 'threshold') {
        compressor.threshold.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      } else if (name === 'ratio') {
        compressor.ratio.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      } else if (name === 'attack') {
        compressor.attack.setTargetAtTime(
          value / 1000,
          context.currentTime,
          0.01,
        );
      } else if (name === 'release') {
        compressor.release.setTargetAtTime(
          value / 1000,
          context.currentTime,
          0.01,
        );
      } else if (name === 'knee') {
        compressor.knee.setTargetAtTime(
          value,
          context.currentTime,
          0.01,
        );
      }
    },
    dispose() {
      compressor.disconnect();
    },
  };
}

function createBitcrusherFilter(
  context: AudioContext,
): AudioFilterNodeWrapper {
  // Bitcrusher uses ScriptProcessorNode (AudioWorklet upgrade planned)
  const bufferSize = 4096;
  // eslint-disable-next-line deprecation/deprecation
  const processor = context.createScriptProcessor(bufferSize, 1, 1);
  let bitDepth = 8;
  let crushSampleRate = 11025;

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);
    const step = Math.pow(0.5, bitDepth);
    const ratioFactor = crushSampleRate / context.sampleRate;
    let lastSample = 0;

    for (let i = 0; i < input.length; i++) {
      // Sample rate reduction
      if (ratioFactor >= 1 || Math.random() < ratioFactor) {
        // Bit depth reduction
        lastSample = step * Math.floor(input[i] / step + 0.5);
      }
      output[i] = lastSample;
    }
  };

  return {
    type: 'bitcrusher',
    inputNode: processor,
    outputNode: processor,
    updateParam(name: string, value: number) {
      if (name === 'bitDepth') {
        bitDepth = Math.max(1, Math.min(16, Math.round(value)));
      } else if (name === 'sampleRate') {
        crushSampleRate = Math.max(500, Math.min(44100, value));
      }
    },
    dispose() {
      processor.disconnect();
    },
  };
}

function createPitchShiftFilter(
  context: AudioContext,
): AudioFilterNodeWrapper {
  // Basic pitch shift via detune on a pass-through approach.
  // Uses a pair of delay lines with crossfade for granular-ish pitch shifting.
  // For a simple initial implementation, we use a single gain pass-through
  // and store the detune value for use by the FontPlayer's playbackRate.
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  inputGain.connect(outputGain);

  let currentSemitones = 0;
  let currentDetune = 0;

  return {
    type: 'pitch-shift',
    inputNode: inputGain,
    outputNode: outputGain,
    updateParam(name: string, value: number) {
      if (name === 'semitones') {
        currentSemitones = value;
      } else if (name === 'detune') {
        currentDetune = value;
      }
      // Pitch shift factor stored for external use
      // The actual pitch shifting should be applied at the source level
      // via playbackRate = 2^((semitones + detune/100) / 12)
      void currentSemitones;
      void currentDetune;
    },
    dispose() {
      inputGain.disconnect();
      outputGain.disconnect();
    },
  };
}

// ---------------------------------------------------------------------------
// Factory dispatcher
// ---------------------------------------------------------------------------

function createFilterNode(
  context: AudioContext,
  type: AudioFilterType,
): AudioFilterNodeWrapper {
  switch (type) {
    case 'lowpass':
      return createBiquadFilter(context, 'lowpass');
    case 'highpass':
      return createBiquadFilter(context, 'highpass');
    case 'bandpass':
      return createBiquadFilter(context, 'bandpass');
    case 'distortion':
      return createDistortionFilter(context);
    case 'reverb':
      return createReverbFilter(context);
    case 'delay':
      return createDelayFilter(context);
    case 'tremolo':
      return createTremoloFilter(context);
    case 'chorus':
      return createChorusFilter(context);
    case 'flanger':
      return createFlangerFilter(context);
    case 'phaser':
      return createPhaserFilter(context);
    case 'compressor':
      return createCompressorFilter(context);
    case 'bitcrusher':
      return createBitcrusherFilter(context);
    case 'pitch-shift':
      return createPitchShiftFilter(context);
  }
}

// ---------------------------------------------------------------------------
// AudioFilterChain – the public runtime engine
// ---------------------------------------------------------------------------

export class AudioFilterChain {
  private context: AudioContext;
  private config: AudioFilterChainConfig;
  private resolver: ParameterResolver;
  private inputGain: GainNode;
  private outputGain: GainNode;
  private filterNodes: Map<string, AudioFilterNodeWrapper> = new Map();
  private disposed = false;

  constructor(context: AudioContext, config: AudioFilterChainConfig) {
    this.context = context;
    this.config = config;
    this.resolver = new ParameterResolver();
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();
    this.outputGain.gain.value = config.masterVolume;

    this.buildChain();
  }

  /** Connect a source node through the filter chain to a destination */
  connect(source: AudioNode, destination: AudioNode): void {
    source.connect(this.inputGain);
    this.outputGain.connect(destination);
  }

  /** Disconnect a source from the chain input */
  disconnectSource(source: AudioNode): void {
    try {
      source.disconnect(this.inputGain);
    } catch {
      // Already disconnected
    }
  }

  /** Disconnect the chain output from a destination */
  disconnectDestination(destination: AudioNode): void {
    try {
      this.outputGain.disconnect(destination);
    } catch {
      // Already disconnected
    }
  }

  /** Update all dynamic parameters based on current sensor/state values */
  updateParameters(sources: DynamicParameterSources): void {
    if (this.disposed) return;

    for (const filterConfig of this.config.filters) {
      if (!filterConfig.enabled) continue;

      const wrapper = this.filterNodes.get(filterConfig.id);
      if (!wrapper) continue;

      // Resolve each parameter
      for (const [paramName, param] of Object.entries(
        filterConfig.parameters,
      )) {
        const paramId = `${filterConfig.id}.${paramName}`;
        const value = this.resolver.resolve(paramId, param.source, sources);
        wrapper.updateParam(paramName, value);
      }

      // Resolve mix parameter (currently informational, could drive dry/wet)
      const _mixValue = this.resolver.resolve(
        `${filterConfig.id}.mix`,
        filterConfig.mix.source,
        sources,
      );
      void _mixValue;
    }
  }

  /** Rebuild the chain from a new config (adds/removes/reorders nodes) */
  setConfig(config: AudioFilterChainConfig): void {
    if (this.disposed) return;

    this.teardownChain();
    this.config = config;
    this.outputGain.gain.value = config.masterVolume;
    this.resolver.reset();
    this.buildChain();
  }

  /** Get the current config */
  getConfig(): AudioFilterChainConfig {
    return this.config;
  }

  /** Get the input node for external connection */
  getInput(): GainNode {
    return this.inputGain;
  }

  /** Get the output node for external connection */
  getOutput(): GainNode {
    return this.outputGain;
  }

  /** Clean up all nodes */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardownChain();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.resolver.reset();
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private buildChain(): void {
    const enabledFilters = this.config.filters.filter((f) => f.enabled);

    if (enabledFilters.length === 0) {
      // Bypass: connect input directly to output
      this.inputGain.connect(this.outputGain);
      return;
    }

    // Create wrapper nodes for each enabled filter
    for (const filterConfig of enabledFilters) {
      const wrapper = createFilterNode(this.context, filterConfig.type);
      this.filterNodes.set(filterConfig.id, wrapper);
    }

    // Chain: input -> filter1 -> filter2 -> ... -> output
    let prevOutput: AudioNode = this.inputGain;
    for (const filterConfig of enabledFilters) {
      const wrapper = this.filterNodes.get(filterConfig.id)!;
      prevOutput.connect(wrapper.inputNode);
      prevOutput = wrapper.outputNode;
    }
    prevOutput.connect(this.outputGain);
  }

  private teardownChain(): void {
    // Disconnect input from everything
    this.inputGain.disconnect();

    // Dispose all filter wrappers
    for (const wrapper of this.filterNodes.values()) {
      wrapper.dispose();
    }
    this.filterNodes.clear();
  }
}
