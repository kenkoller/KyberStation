/**
 * Unified theme extended-property lookup.
 *
 * Covers all 30 themes (9 base + 12 extended locations + 9 factions).
 * For every theme this returns the four properties that useThemeApplier
 * needs to apply CSS classes and the --ambient-intensity variable:
 *
 *   material:        'matte' | 'satin' | 'gloss'  → .material-{value}
 *   cornerStyle:     'rounded' | 'angular' | 'clipped' → .corner-{value}
 *   borderStyle:     'subtle' | 'lined' | 'glow'   → .border-{value} (on <html>)
 *   ambientIntensity: 0-1 → --ambient-intensity CSS var
 *
 * The base 9 themes (from canvasThemes.ts) are given sensible fallbacks here;
 * the extended 21 themes reuse data straight from extendedThemes.ts.
 */

import {
  ALL_EXTENDED_THEMES,
  type ExtendedCanvasTheme,
} from './extendedThemes';

export type MaterialSurface = 'matte' | 'satin' | 'gloss';
export type CornerStyle = 'rounded' | 'angular' | 'clipped';
export type BorderStyle = 'subtle' | 'lined' | 'glow';

export interface ThemeExtended {
  material: MaterialSurface;
  cornerStyle: CornerStyle;
  borderStyle: BorderStyle;
  /** 0–1. Controls --ambient-intensity; drives all ambient CSS animations. */
  ambientIntensity: number;
}

// ─── Base-theme fallbacks (deep-space … death-star) ─────────────────────────
// These 9 themes live in canvasThemes.ts and have no ExtendedCanvasTheme entry.
// Assignments follow each planet/setting's visual personality.

const BASE_THEME_EXTENDED: Record<string, ThemeExtended> = {
  'deep-space': {
    material: 'matte',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.7,
  },
  tatooine: {
    material: 'matte',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.4,
  },
  bespin: {
    material: 'satin',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.5,
  },
  dagobah: {
    material: 'matte',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.55,
  },
  mustafar: {
    material: 'matte',
    cornerStyle: 'angular',
    borderStyle: 'glow',
    ambientIntensity: 0.8,
  },
  hoth: {
    material: 'matte',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.45,
  },
  coruscant: {
    material: 'gloss',
    cornerStyle: 'angular',
    borderStyle: 'lined',
    ambientIntensity: 0.9,
  },
  endor: {
    material: 'matte',
    cornerStyle: 'rounded',
    borderStyle: 'subtle',
    ambientIntensity: 0.35,
  },
  'death-star': {
    material: 'matte',
    cornerStyle: 'angular',
    borderStyle: 'lined',
    ambientIntensity: 0.6,
  },
};

// ─── Build lookup from extended themes ──────────────────────────────────────
// Derive ambientIntensity from particleDensity + scanSweep + consoleBlinkRate.

function deriveAmbientIntensity(t: ExtendedCanvasTheme): number {
  let intensity = t.ambient.particleDensity;
  if (t.ambient.scanSweep) intensity = Math.min(1, intensity + 0.15);
  if (t.ambient.consoleBlinkRate > 0) intensity = Math.min(1, intensity + 0.1);
  if (t.ambient.gridAnimated) intensity = Math.min(1, intensity + 0.1);
  // Clamp to a sensible floor so ambient decorations are always faintly visible
  return Math.max(0.2, Math.round(intensity * 100) / 100);
}

const EXTENDED_THEME_MAP: Record<string, ThemeExtended> = Object.fromEntries(
  ALL_EXTENDED_THEMES.map((t) => [
    t.id,
    {
      material: t.material.surfaceStyle,
      cornerStyle: t.material.cornerStyle,
      borderStyle: t.material.borderStyle,
      ambientIntensity: deriveAmbientIntensity(t),
    } satisfies ThemeExtended,
  ]),
);

// ─── Merged lookup ───────────────────────────────────────────────────────────

const ALL_THEME_EXTENDED: Record<string, ThemeExtended> = {
  ...BASE_THEME_EXTENDED,
  ...EXTENDED_THEME_MAP,
};

const FALLBACK: ThemeExtended = {
  material: 'matte',
  cornerStyle: 'rounded',
  borderStyle: 'subtle',
  ambientIntensity: 0.5,
};

/**
 * Return the extended visual properties for any theme ID.
 * Returns a safe fallback for unknown IDs — never throws.
 */
export function getThemeExtended(themeId: string): ThemeExtended {
  return ALL_THEME_EXTENDED[themeId] ?? FALLBACK;
}
