import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * Blade Charge — color pools toward the tip as swing speed increases.
 *
 * Hardware-fidelity note (see docs/HARDWARE_FIDELITY_PRINCIPLE.md):
 * Real ProffieOS emits this as `Mix<Scale<SwingSpeed<400>, ...>, baseGradient, brightTipGradient>`
 * — the same composer pattern the modulation v1.1 routing uses for shimmer.
 * Idle: even base color along the blade. Fast swing: tip glows brighter,
 * hilt-end dims slightly, satisfying tip-pooling read. The codegen entry in
 * `packages/codegen/src/ASTBuilder.ts` produces the matching template.
 *
 * Math:
 *   per-LED weight = baseLevel + swingSpeed * (pos)^q
 * with `q ≈ 1.5` for satisfying tip-pooling.
 *
 * Configurable via:
 *   - `chargeExponent` (1..3, default 1.5) — sharpness of tip pooling
 *     (higher = more concentrated at tip).
 *   - `chargeBoost` (0..1, default 0.6) — peak brightness multiplier
 *     at full swing (1.6× baseColor at tip when swingSpeed=1).
 */
export class BladeChargeStyle extends BaseStyle {
  readonly id = 'bladeCharge';
  readonly name = 'Blade Charge';
  readonly description =
    'Color pools toward the tip as swing speed increases. Idle holds even base color; fast swing brightens the tip, dims toward hilt.';

  getColor(position: number, _time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    const exponent =
      (context.config.chargeExponent as number | undefined) ?? 1.5;
    const boost =
      (context.config.chargeBoost as number | undefined) ?? 0.6;

    // swingSpeed is normalized 0..1 in StyleContext per types.ts.
    const swing = Math.max(0, Math.min(1, context.swingSpeed));

    const weight = bladeChargeWeight(position, swing, exponent, boost);

    return {
      r: Math.min(255, base.r * weight),
      g: Math.min(255, base.g * weight),
      b: Math.min(255, base.b * weight),
    };
  }
}

// ─── Pure weight function (exported for tests) ───

/**
 * Per-LED brightness weight for Blade Charge.
 *
 * @param position   LED position 0..1 (0 = hilt, 1 = tip).
 * @param swingSpeed Swing speed 0..1 (StyleContext-normalized).
 * @param exponent   Tip-pooling sharpness (1 = linear, 1.5 = punchy).
 * @param boost      Peak boost factor at tip when swingSpeed=1.
 *
 * @returns Brightness multiplier:
 *   - At swing=0: ~1.0 everywhere (blade reads as base color)
 *   - At swing=1: tip = 1.0 + boost; hilt slightly under 1.0
 *
 * The formula `1 + swing * (pos^q - lift)` keeps total energy roughly
 * conserved — tip brightens, hilt dims by a small lift factor so the
 * "energy pooled toward tip" read is real, not just additive.
 */
export function bladeChargeWeight(
  position: number,
  swingSpeed: number,
  exponent: number,
  boost: number,
): number {
  const p = Math.max(0, Math.min(1, position));
  const q = Math.max(0.5, exponent);
  const s = Math.max(0, Math.min(1, swingSpeed));
  const b = Math.max(0, Math.min(2, boost));

  // Power curve from hilt (0) to tip (1)
  const pooledShape = Math.pow(p, q); // 0 at hilt, 1 at tip

  // Subtract a small lift so the integral stays near 1 — tip brightens,
  // hilt dims a smidge. lift = 0.4 chosen so hilt at full swing reads
  // ~60% base, tip reads ~160% base.
  const lift = 0.4;

  // weight = 1 + swing * boost * (pooledShape - lift)
  // At swing=0: weight = 1
  // At swing=1, pos=1: weight = 1 + boost * (1 - 0.4) = 1 + 0.6*boost
  // At swing=1, pos=0: weight = 1 + boost * (0 - 0.4) = 1 - 0.4*boost
  return Math.max(0, 1 + s * b * (pooledShape - lift));
}
