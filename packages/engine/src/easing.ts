import type { EasingConfig, EasingFunction } from './types.js';

// Inline cubic bezier evaluation (~40 lines, avoids bezier-easing dependency for now)
function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Newton-Raphson iteration to find t for given x
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x; // initial guess
    for (let i = 0; i < 8; i++) {
      const cx = 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * (1 - t) * t * t + t * t * t - x;
      if (Math.abs(cx) < 1e-6) break;
      const dx = 3 * x1 * (1 - t) * (1 - t) - 6 * x1 * t * (1 - t) + 6 * x2 * t * (1 - t) - 3 * x2 * t * t + 3 * t * t;
      if (Math.abs(dx) < 1e-6) break;
      t -= cx / dx;
      t = Math.max(0, Math.min(1, t));
    }

    return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * (1 - t) * t * t + t * t * t;
  };
}

/** Preset easing functions. */
export const EASING_PRESETS: Record<string, EasingFunction> = {
  linear: (t) => t,
  'ease-in-quad': (t) => t * t,
  'ease-out-quad': (t) => t * (2 - t),
  'ease-in-out-quad': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => { const u = t - 1; return u * u * u + 1; },
  'ease-in-out-cubic': (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  'ease-in-quart': (t) => t * t * t * t,
  'ease-out-quart': (t) => { const u = t - 1; return 1 - u * u * u * u; },
  'ease-in-out-quart': (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (t - 1) ** 4),
  'ease-in-expo': (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  'ease-out-expo': (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    let tt = 1 - t; // bounce operates on reverse
    let r: number;
    if (tt < 1 / d1) { r = n1 * tt * tt; }
    else if (tt < 2 / d1) { r = n1 * (tt -= 1.5 / d1) * tt + 0.75; }
    else if (tt < 2.5 / d1) { r = n1 * (tt -= 2.25 / d1) * tt + 0.9375; }
    else { r = n1 * (tt -= 2.625 / d1) * tt + 0.984375; }
    return 1 - r;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  snap: (t) => {
    const s = t * t;
    return s * s * (2 - t);
  },
};

/** Create an easing function from config. */
export function createEasingFunction(config: EasingConfig): EasingFunction {
  if (config.type === 'preset') {
    return EASING_PRESETS[config.name] ?? EASING_PRESETS.linear;
  }
  const [x1, y1, x2, y2] = config.controlPoints;
  return cubicBezier(x1, y1, x2, y2);
}

/** Get the list of available preset easing names. */
export function getEasingPresetNames(): string[] {
  return Object.keys(EASING_PRESETS);
}
