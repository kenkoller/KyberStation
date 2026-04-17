// ─── Easing Math ───
//
// Standalone implementations of the named easing curves used in
// timeline previews. Exposed as a pure library so curve-shape
// regressions can be caught in isolation (without JSX rendering).
//
// Kept in shape-parity with the engine's applyEasing — if you change
// engine easing semantics, sync this file too.

import type { EasingCurve } from '@/stores/timelineStore';

/** Evaluate the named easing curve at parameter t ∈ [0, 1]. */
export function easingFn(curve: EasingCurve, t: number): number {
  // NaN guards Math.max/min, which propagate NaN silently.
  const safeT = Number.isFinite(t) ? t : 0;
  const x = Math.max(0, Math.min(1, safeT));
  switch (curve) {
    case 'linear':
      return x;
    case 'ease-in-quad':
      return x * x;
    case 'ease-out-quad':
      return 1 - (1 - x) * (1 - x);
    case 'ease-in-out-quad':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case 'ease-in-cubic':
      return x * x * x;
    case 'ease-out-cubic':
      return 1 - Math.pow(1 - x, 3);
    case 'bounce': {
      const n = 7.5625;
      const d = 2.75;
      const invX = 1 - x;
      let y: number;
      if (invX < 1 / d) y = n * invX * invX;
      else if (invX < 2 / d) y = n * (invX - 1.5 / d) * (invX - 1.5 / d) + 0.75;
      else if (invX < 2.5 / d) y = n * (invX - 2.25 / d) * (invX - 2.25 / d) + 0.9375;
      else y = n * (invX - 2.625 / d) * (invX - 2.625 / d) + 0.984375;
      return 1 - y;
    }
    case 'elastic': {
      if (x === 0 || x === 1) return x;
      const c4 = (2 * Math.PI) / 3;
      return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4) + 0;
    }
    default:
      return x;
  }
}
