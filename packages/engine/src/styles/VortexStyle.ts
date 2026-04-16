import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * VortexStyle — swirling spiral energy rotating around the blade.
 *
 * Simulates a helical rotation using sin(position * twistRate + time * speed).
 * The spiral creates alternating bright and dark bands that appear to rotate
 * around the blade like a barber pole. Two interlocked spirals (offset by 180deg)
 * provide visual richness. The twist angle input modulates the rotation speed.
 */
export class VortexStyle extends BaseStyle {
  readonly id = 'vortex';
  readonly name = 'Vortex';
  readonly description =
    'Swirling spiral energy rotating around the blade like a barber pole with two interlocked helices.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const accent: RGB = (context.config.edgeColor as RGB | undefined) ?? {
      r: Math.min(255, base.r + 80),
      g: Math.min(255, base.g + 40),
      b: Math.min(255, base.b + 100),
    };

    // Twist rate: how many spiral turns fit on the blade
    const twistRate =
      (context.config.spatialWaveFrequency as number | undefined) ?? 4;

    // Base rotation speed, modulated by twist angle input
    const baseRotationSpeed = 2.0;
    const twistMod = 1.0 + context.twistAngle * 0.8; // -1..1 -> 0.2..1.8
    const rotationSpeed = baseRotationSpeed * twistMod;

    // Two interlocked spirals, 180deg apart
    const phase1 =
      position * twistRate * Math.PI * 2 + time * rotationSpeed * Math.PI * 2;
    const phase2 = phase1 + Math.PI; // 180deg offset

    // Map sin to [0, 1]
    const spiral1 = Math.sin(phase1) * 0.5 + 0.5;
    const spiral2 = Math.sin(phase2) * 0.5 + 0.5;

    // Sharpen the spiral bands for more defined visual
    const sharpness = 2.5;
    const bright1 = Math.pow(spiral1, sharpness);
    const bright2 = Math.pow(spiral2, sharpness);

    // Combine both spirals
    const totalBright = Math.min(1, bright1 + bright2);

    // Dim background
    const bg: RGB = { r: base.r * 0.06, g: base.g * 0.06, b: base.b * 0.06 };

    // Mix primary and secondary spiral colors by relative brightness
    const sum = bright1 + bright2 + 1e-9;
    const mix = bright2 / sum; // 0 = all base, 1 = all accent
    const spiralColor = lerpColor(base, accent, mix);

    return lerpColor(bg, spiralColor, totalBright);
  }
}
