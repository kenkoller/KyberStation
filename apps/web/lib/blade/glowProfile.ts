// ─── Per-color glow profile lookup ───────────────────────────────────
//
// Two callers, two slightly-different classification ladders:
//
//   • `getGlowProfileWorkbench` — the v0.14.0 workbench classifier with
//     the chroma+lightness "white" fast-path, separate cyan/yellow/
//     orange/purple branches, and an `outerHue` field used by the Angle
//     View cross-section. Lives behind `BladeCanvas.tsx`.
//
//   • `getGlowProfileHeadless` — the headless GIF / share-card port
//     used by `bladeRenderHeadless.ts`. Hue thresholds differ
//     (slightly stricter for blue, no purple/orange branches), and
//     there is no `outerHue` field. The renderer-level golden-hash
//     test suite at `apps/web/tests/rendererGoldenHash/` pins the
//     output values returned by THIS function for the canonical
//     configs; do not unify with the workbench classifier without
//     regenerating snapshots.
//
// Co-located so future drift between the two is visible at a glance,
// and so a later sprint can study the differences and (if appropriate)
// merge them. Per the v0.14.0 entry of CLAUDE.md, this is module
// extraction without behavior change — both classifiers preserve the
// exact output values they had before.

import type { BaseGlowProfile } from './types';

/** Workbench glow profile — extends `BaseGlowProfile` with the
 *  Angle View cross-section's outer-hue knob. */
export interface WorkbenchGlowProfile extends BaseGlowProfile {
  /** Hue shift for outermost bloom (degrees, 0 = none). Used only by
   *  the Angle View cross-section pass in BladeCanvas.tsx. */
  outerHue: number;
}

/**
 * Workbench glow profile — used by `BladeCanvas.tsx`'s
 * `drawBladePhotorealistic` + Angle View pass.
 *
 * Classification ladder:
 *   • White / very light: chroma < 30 AND lightness > 180 → wide gentle
 *     halo, low saturation.
 *   • Per-hue branches use threshold ratios on the dominant channel.
 *     Yellow / orange / purple have explicit branches that the headless
 *     classifier does not.
 *
 * Returns the same five tuning knobs as the headless version plus
 * `outerHue` for the Angle View.
 */
export function getGlowProfileWorkbench(
  r: number,
  g: number,
  b: number,
): WorkbenchGlowProfile {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;

  // White / very light colors
  if (chroma < 30 && lightness > 180) {
    return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3, outerHue: 0 };
  }

  // Determine dominant channel
  const isRed = r > g * 1.5 && r > b * 1.5;
  const isBlue = b > r * 1.2 && b > g * 1.2;
  const isCyan = g > r * 1.2 && b > r * 1.2 && Math.abs(g - b) < 60;
  const isGreen = g > r * 1.3 && g > b * 1.3;
  const isPurple = r > g * 1.3 && b > g * 1.3;
  const isYellow = r > b * 1.5 && g > b * 1.5 && Math.abs(r - g) < 80;
  const isOrange = r > g * 1.3 && g > b * 1.5 && r > 180;

  if (isRed) {
    // Red: deeper, tighter glow — menacing Sith look
    return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3, outerHue: 0 };
  }
  if (isBlue) {
    // Blue: wider spread, classic Jedi
    return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95, outerHue: 0 };
  }
  if (isCyan) {
    // Cyan: wide, bright, electric
    return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9, outerHue: 0 };
  }
  if (isGreen) {
    // Green: medium with slight warm edge
    return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0, outerHue: 5 };
  }
  if (isPurple) {
    // Purple: wide with desaturated outer ring
    return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8, outerHue: 0 };
  }
  if (isYellow) {
    // Yellow: Temple Guard, bright and warm
    return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9, outerHue: -5 };
  }
  if (isOrange) {
    // Orange: warm, moderate spread
    return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1, outerHue: 0 };
  }

  // Default / mixed colors
  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0, outerHue: 0 };
}

/**
 * Headless glow profile — used by `bladeRenderHeadless.ts`'s
 * `drawWorkbenchBlade` orchestrator (animated GIFs, share-card render).
 *
 * Classification ladder differs from the workbench: stricter blue
 * threshold (1.5×), no separate purple branch, amethyst (red+blue) and
 * pink (red+green) branches that the workbench doesn't have.
 *
 * The renderer-level golden-hash test suite at
 * `apps/web/tests/rendererGoldenHash/bladeRenderer.test.ts` pins the
 * rendered output of `drawWorkbenchBlade` for the canonical configs.
 * Any drift in this classifier WILL fail those snapshots.
 */
export function getGlowProfileHeadless(
  r: number,
  g: number,
  b: number,
): BaseGlowProfile {
  const max = Math.max(r, g, b);
  if (max < 1) return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
  // Pure white / unlit-fallback
  if (r > 200 && g > 200 && b > 200) {
    return { coreWhiteout: 0.95, bloomRadius: 1.4, bloomIntensity: 1.3, colorSaturation: 0.3 };
  }
  // Red — saturated
  if (r > g * 1.5 && r > b * 1.5) {
    return { coreWhiteout: 0.80, bloomRadius: 1.1, bloomIntensity: 1.4, colorSaturation: 1.3 };
  }
  // Blue
  if (b > r * 1.5 && b > g * 1.2) {
    return { coreWhiteout: 0.88, bloomRadius: 1.5, bloomIntensity: 1.4, colorSaturation: 0.95 };
  }
  // Green
  if (g > r * 1.3 && g > b * 1.3) {
    return { coreWhiteout: 0.90, bloomRadius: 1.5, bloomIntensity: 1.45, colorSaturation: 0.9 };
  }
  // Amber / orange (warm yellow)
  if (r > 180 && g > 100 && b < 100) {
    return { coreWhiteout: 0.85, bloomRadius: 1.3, bloomIntensity: 1.3, colorSaturation: 1.0 };
  }
  // Amethyst (red + blue)
  if (r > 100 && b > 100 && g < r && g < b) {
    return { coreWhiteout: 0.85, bloomRadius: 1.4, bloomIntensity: 1.35, colorSaturation: 0.8 };
  }
  // Cyan (green + blue)
  if (g > 100 && b > 100 && r < g && r < b) {
    return { coreWhiteout: 0.92, bloomRadius: 1.3, bloomIntensity: 1.35, colorSaturation: 0.9 };
  }
  // Pink (red + green)
  if (r > 150 && g > 80 && b > 80 && r > b) {
    return { coreWhiteout: 0.86, bloomRadius: 1.2, bloomIntensity: 1.25, colorSaturation: 1.1 };
  }
  return { coreWhiteout: 0.82, bloomRadius: 1.0, bloomIntensity: 1.0, colorSaturation: 1.0 };
}
