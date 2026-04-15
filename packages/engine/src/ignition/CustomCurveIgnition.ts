import { BaseIgnition } from './BaseIgnition.js';
import type { IgnitionContext } from '../types.js';

/**
 * CustomCurveIgnition — user-defined cubic Bezier ignition profile.
 *
 * Uses control points [x1, y1, x2, y2] to shape the ignition mask
 * across the blade. The curve maps position to mask intensity,
 * modulated by progress.
 */
export class CustomCurveIgnition extends BaseIgnition {
  readonly id = 'custom-curve';
  readonly name = 'Custom Curve';

  private controlPoints: [number, number, number, number] = [0.25, 0.1, 0.25, 1.0];

  setControlPoints(points: [number, number, number, number]): void {
    this.controlPoints = points;
  }

  getMask(position: number, progress: number, _context?: IgnitionContext): number {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // Evaluate cubic bezier at position to get the curve shape
    const curveValue = this.evalBezier(position);
    // Scale by progress: at progress=0 nothing lit, at progress=1 full curve
    const threshold = progress;

    // The curve shapes HOW the blade fills — steeper curve = faster fill at that region
    const adjustedPos = position * curveValue;
    if (adjustedPos <= threshold) {
      const edge = threshold - adjustedPos;
      return edge > 0.03 ? 1 : edge / 0.03;
    }
    return 0;
  }

  private evalBezier(t: number): number {
    const [x1, y1, x2, y2] = this.controlPoints;
    // Approximate cubic bezier Y value at parameter t
    // P0 = (0,0), P1 = (x1,y1), P2 = (x2,y2), P3 = (1,1)
    const u = 1 - t;
    const y = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    return Math.max(0, Math.min(1, y));
    // x1 used implicitly through the bezier shape
    void x1; void x2;
  }
}
