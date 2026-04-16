import { BaseIgnition } from './BaseIgnition.js';

/**
 * PulseWaveIgnition — multiple pulse waves build up the blade from base.
 *
 * 4 waves are emitted sequentially from the hilt, each reaching further
 * than the last. Each wave lights the blade up to its reach and leaves
 * the blade lit behind it. After all waves pass, the blade is fully lit.
 *
 * This creates a "powering up" buildup: each pulse extends further,
 * with the final wave reaching the tip and completing the ignition.
 */
export class PulseWaveIgnition extends BaseIgnition {
  readonly id = 'pulse-wave';
  readonly name = 'Pulse Wave';

  private static readonly WAVE_COUNT = 4;

  getMask(position: number, progress: number): number {
    const waveCount = PulseWaveIgnition.WAVE_COUNT;

    // Spacing: waves are evenly spread across the full progress range.
    // Wave i launches at launchT[i] and completes at completeT[i].
    // The reach of wave i is: (i+1)/waveCount of the blade.
    let maxLit = 0; // highest blade position lit by any wave so far

    for (let i = 0; i < waveCount; i++) {
      const reach = (i + 1) / waveCount; // 0.25, 0.5, 0.75, 1.0
      const launchT = i / waveCount;     // 0, 0.25, 0.5, 0.75
      const completeT = (i + 0.85) / waveCount; // completes slightly before next launch

      if (progress < launchT) continue; // not yet emitted

      // Front edge position of this pulse's wavefront
      let waveFront: number;
      if (progress >= completeT) {
        waveFront = reach; // this wave has reached its max
      } else {
        const waveProgress = (progress - launchT) / (completeT - launchT);
        waveFront = waveProgress * reach;
      }

      maxLit = Math.max(maxLit, waveFront);
    }

    // Lit if this position is behind the furthest wave front
    return position <= maxLit ? 1 : 0;
  }
}
