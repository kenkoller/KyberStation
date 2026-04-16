import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * DataStreamStyle — bright data packets traveling from base to tip.
 *
 * Multiple concurrent "packets" (5-8) travel at varying speeds along the
 * blade. Each packet is 2-3 LEDs wide. The background is a dim version of
 * the base color; packets flash bright white blended with an accent color.
 * New packets spawn continuously at random intervals at the base.
 */
export class DataStreamStyle extends BaseStyle {
  readonly id = 'dataStream';
  readonly name = 'Data Stream';
  readonly description =
    'Bright data packets race from base to tip like signals on a wire, over a dim base color.';

  /** Deterministic pseudo-random seeded by a float. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const accent: RGB = (context.config.edgeColor as RGB | undefined) ?? {
      r: 255,
      g: 255,
      b: 255,
    };

    // Dim background: 15% of base color
    const bg: RGB = { r: base.r * 0.15, g: base.g * 0.15, b: base.b * 0.15 };

    // How many packets to evaluate (5-8, configurable)
    const packetCount = 7;

    // Speed range: 0.3 – 1.2 blade-lengths per second
    const speedBase = 0.3;
    const speedRange = 0.9;

    let brightest = 0;

    for (let i = 0; i < packetCount; i++) {
      // Each packet has a unique speed and spawn-phase offset.
      const speed = speedBase + this.pseudoRandom(i * 13.37) * speedRange;
      const spawnOffset = this.pseudoRandom(i * 7.19 + 100); // 0-1 phase

      // Position of this packet's leading edge (wraps 0→1 repeatedly)
      const packetPos = ((time * speed + spawnOffset) % 1.0);

      // Packet width: 2-3 LEDs on a 144-LED blade ≈ 0.014 – 0.021
      const packetWidth = 0.014 + this.pseudoRandom(i * 3.77) * 0.007;

      const dist = packetPos - position; // leading edge ahead of query position
      if (dist >= 0 && dist < packetWidth) {
        // Gaussian-ish brightness peak at the leading edge, tapering back
        const t = 1 - dist / packetWidth;
        const brightness = t * t; // quadratic falloff toward tail
        if (brightness > brightest) brightest = brightness;
      }
    }

    if (brightest > 0) {
      // Blend from bg toward bright accent/white
      return lerpColor(bg, accent, brightest);
    }

    return bg;
  }
}
