import type { ParameterSource, DynamicParameterSources } from './types.js';

/**
 * Resolves filter parameter values from dynamic sources, LFOs, and static
 * values, with optional smoothing for glitch-free transitions.
 */
export class ParameterResolver {
  private smoothedValues: Map<string, number> = new Map();

  /**
   * Resolve a parameter value given its source descriptor and the current
   * dynamic source values.
   *
   * @param paramId Unique key used for smoothing state persistence
   * @param source  Describes where the value comes from and how to map it
   * @param dynamicSources Current motion/state values
   */
  resolve(
    paramId: string,
    source: ParameterSource,
    dynamicSources: DynamicParameterSources,
  ): number {
    let rawValue: number;

    switch (source.type) {
      case 'static':
      case 'manual':
        rawValue = source.value ?? 0;
        break;

      case 'swing-speed':
        rawValue = dynamicSources.swingSpeed;
        break;

      case 'blade-angle':
        // Normalize -1..1 to 0..1
        rawValue = (dynamicSources.bladeAngle + 1) / 2;
        break;

      case 'twist-angle':
        // Normalize -1..1 to 0..1
        rawValue = (dynamicSources.twistAngle + 1) / 2;
        break;

      case 'sound-level':
        rawValue = dynamicSources.soundLevel;
        break;

      case 'battery-level':
        rawValue = dynamicSources.batteryLevel;
        break;

      case 'ignition-progress':
        rawValue = dynamicSources.ignitionProgress;
        break;

      case 'random-noise':
        // Deterministic-ish pseudo-noise based on time
        rawValue =
          Math.sin(dynamicSources.time * 0.001 * 12.9898) * 0.5 + 0.5;
        break;

      case 'lfo': {
        const rate = source.lfoRate ?? 1;
        const phase = source.lfoPhase ?? 0;
        const t = (dynamicSources.time / 1000) * rate + phase;
        const waveform = source.lfoWaveform ?? 'sine';

        if (waveform === 'sine') {
          rawValue = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
        } else if (waveform === 'triangle') {
          rawValue = 1 - Math.abs(((t % 1) + 1) % 1 * 2 - 1);
        } else if (waveform === 'square') {
          rawValue = (((t % 1) + 1) % 1) < 0.5 ? 1 : 0;
        } else {
          // sawtooth
          rawValue = ((t % 1) + 1) % 1;
        }
        break;
      }

      default:
        rawValue = source.value ?? 0;
    }

    // Map from input range to output range
    const inMin = source.inputMin ?? 0;
    const inMax = source.inputMax ?? 1;
    const range = inMax - inMin;
    const normalized = Math.max(
      0,
      Math.min(1, (rawValue - inMin) / (range === 0 ? 1 : range)),
    );
    let mapped =
      source.outputMin + normalized * (source.outputMax - source.outputMin);

    // Apply smoothing (exponential moving average)
    if (source.smoothing != null && source.smoothing > 0) {
      const prev = this.smoothedValues.get(paramId) ?? mapped;
      mapped = prev + (mapped - prev) * (1 - source.smoothing);
      this.smoothedValues.set(paramId, mapped);
    }

    return mapped;
  }

  /** Clear all smoothing state */
  reset(): void {
    this.smoothedValues.clear();
  }
}
