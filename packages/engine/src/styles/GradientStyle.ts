import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { noise } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/** Hermite smoothstep for smooth interpolation */
function smoothstep(t: number): number {
  const ct = Math.max(0, Math.min(1, t));
  return ct * ct * (3 - 2 * ct);
}

export class GradientStyle extends BaseStyle {
  readonly id = 'gradient';
  readonly name = 'Gradient';
  readonly description = 'Smooth color gradient from base to end color along the blade.';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;
    const shimmer = context.config.shimmer;
    const pos = position;
    const t = time;

    const gradientSpeed = (context.config.gradientSpeed as number | undefined) ?? 0.5;
    const stops = context.config.gradientStops as Array<{ position: number; color: RGB }> | undefined;
    const interpolation = context.config.gradientInterpolation ?? 'linear';

    let c: RGB;
    if (stops && stops.length >= 2) {
      // Multi-stop gradient with animated offset
      const offset = (t * gradientSpeed * 0.1) % 1;
      const mappedPos = ((pos + offset) % 1 + 1) % 1;
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      // Find surrounding stops
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (mappedPos >= sorted[i].position && mappedPos <= sorted[i + 1].position) {
          lower = sorted[i];
          upper = sorted[i + 1];
          break;
        }
      }
      const range = upper.position - lower.position;
      const localT = range > 0 ? (mappedPos - lower.position) / range : 0;
      c = interpolateColor(lower.color, upper.color, localT, interpolation);
    } else {
      const end: RGB = context.config.gradientEnd || { r: 255, g: 100, b: 0 };
      const offset = (t * gradientSpeed * 0.1) % 1;
      const mappedPos = ((pos + offset) % 1 + 1) % 1;
      c = interpolateColor(base, end, mappedPos, interpolation);
    }
    const fl = 1 - shimmer * noise(pos * 10 + t * 3);

    return {
      r: c.r * fl,
      g: c.g * fl,
      b: c.b * fl,
    };
  }
}

function interpolateColor(a: RGB, b: RGB, t: number, mode: 'linear' | 'smooth' | 'step'): RGB {
  switch (mode) {
    case 'smooth':
      return lerpColor(a, b, smoothstep(t));
    case 'step':
      return t < 0.5 ? a : b;
    default:
      return lerpColor(a, b, t);
  }
}
