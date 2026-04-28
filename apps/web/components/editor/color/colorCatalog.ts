// ─── Color catalog — Sidebar A/B v2 Phase 3 ─────────────────────────────
//
// Shared between ColorColumnA (channel tabs + 24-preset list) and
// ColorColumnB (deep HSL/RGB/hex editor). Mirrors the in-component
// COLOR_PRESETS array that legacy `ColorPanel.tsx` keeps inline; if the
// preset library moves, both sources need to change together.
//
// Kept colocated with the column components rather than promoted to /lib
// because it's the single source of truth for ONE feature (the A/B
// color section). When more sections migrate to A/B and want similar
// catalogs (e.g. effect tints), each can keep its own file colocated
// with its column components — the lib boundary gets crossed only when
// a piece is actually consumed by ≥2 features.
//
// RGB values below mirror the corresponding `namingMath.ts` landmark
// HSL coords so clicking a preset lands on a tier-1 landmark-exact name
// in the color readout. Keep presets in sync with the landmark table —
// the landmark is the source of truth for the human-readable name.

export interface ColorPreset {
  id: string;
  label: string;
  color: { r: number; g: number; b: number };
  category: 'jedi' | 'sith' | 'neutral';
}

export const COLOR_PRESETS: ReadonlyArray<ColorPreset> = [
  // Jedi blues
  { id: 'jedi-blue',     label: 'Jedi Blue',           color: { r: 10,  g: 57,  b: 230 }, category: 'jedi' },
  { id: 'obi-wan-blue',  label: 'Obi-Wan Blue',        color: { r: 22,  g: 114, b: 243 }, category: 'jedi' },
  { id: 'anakin-blue',   label: 'Anakin Blue',         color: { r: 15,  g: 34,  b: 245 }, category: 'jedi' },
  { id: 'luke-esb',      label: 'Luke ESB',            color: { r: 22,  g: 114, b: 243 }, category: 'jedi' },
  // Jedi greens
  { id: 'luke-rotj',     label: 'Luke ROTJ Green',     color: { r: 6,   g: 234, b: 25  }, category: 'jedi' },
  { id: 'qui-gon',       label: 'Qui-Gon Green',       color: { r: 54,  g: 210, b: 30  }, category: 'jedi' },
  { id: 'yoda-green',    label: 'Yoda Green',          color: { r: 50,  g: 245, b: 20  }, category: 'jedi' },
  { id: 'kit-fisto',     label: 'Kit Fisto Green',     color: { r: 17,  g: 238, b: 109 }, category: 'jedi' },
  // Jedi other
  { id: 'mace-purple',   label: 'Mace Purple',         color: { r: 132, g: 11,  b: 218 }, category: 'jedi' },
  { id: 'temple-yellow', label: 'Temple Guard Yellow', color: { r: 245, g: 190, b: 10  }, category: 'jedi' },
  { id: 'rey-yellow',    label: 'Rey Yellow',          color: { r: 245, g: 206, b: 10  }, category: 'jedi' },
  { id: 'ahsoka-white',  label: 'Ahsoka White',        color: { r: 248, g: 247, b: 247 }, category: 'jedi' },
  // Sith reds
  { id: 'sith-red',      label: 'Sith Red',            color: { r: 228, g: 12,  b: 12  }, category: 'sith' },
  { id: 'vader-red',     label: 'Vader Red',           color: { r: 249, g: 16,  b: 20  }, category: 'sith' },
  { id: 'kylo-red',      label: 'Kylo Unstable Red',   color: { r: 245, g: 38,  b: 15  }, category: 'sith' },
  { id: 'dooku-red',     label: 'Dooku Red',           color: { r: 175, g: 29,  b: 29  }, category: 'sith' },
  { id: 'maul-red',      label: 'Maul Red',            color: { r: 201, g: 8,   b: 8   }, category: 'sith' },
  { id: 'ventress-red',  label: 'Ventress Red',        color: { r: 228, g: 7,   b: 7   }, category: 'sith' },
  // Neutral / special
  { id: 'darksaber',     label: 'Darksaber',           color: { r: 255, g: 255, b: 255 }, category: 'neutral' },
  { id: 'cal-cyan',      label: 'Cal Kestis Cyan',     color: { r: 20,  g: 200, b: 245 }, category: 'neutral' },
  { id: 'cal-orange',    label: 'Cal Kestis Orange',   color: { r: 245, g: 116, b: 10  }, category: 'neutral' },
  { id: 'cal-magenta',   label: 'Cal Kestis Magenta',  color: { r: 228, g: 12,  b: 149 }, category: 'neutral' },
  { id: 'revan-purple',  label: 'Revan Purple',        color: { r: 68,  g: 16,  b: 198 }, category: 'neutral' },
  { id: 'mara-jade',     label: 'Mara Jade',           color: { r: 76,  g: 38,  b: 227 }, category: 'neutral' },
];

// ─── Channel registry ──────────────────────────────────────────────────
//
// The 4 primary color channels surfaced as sticky tabs at the top of
// ColorColumnA. Mirrors `COLOR_CHANNELS` in legacy `ColorPanel.tsx`. The
// shorthand label is what shows in the tab; `description` is the title
// attribute for the tab button. Channel keys must match the BladeConfig
// keys exactly (`baseColor` / `clashColor` / `lockupColor` / `blastColor`).

export interface ColorChannel {
  /** BladeConfig key (e.g. 'baseColor'). */
  key: string;
  /** Short tab label (e.g. 'Base'). */
  label: string;
  /** Hover tooltip / aria description. */
  description: string;
}

export const COLOR_CHANNELS: ReadonlyArray<ColorChannel> = [
  { key: 'baseColor',   label: 'Base',   description: 'Primary blade color' },
  { key: 'clashColor',  label: 'Clash',  description: 'Flash on impact' },
  { key: 'lockupColor', label: 'Lockup', description: 'Sustained blade lock' },
  { key: 'blastColor',  label: 'Blast',  description: 'Blaster deflection' },
];

// ─── Active-match epsilon ──────────────────────────────────────────────
//
// Identical to the QuickColorChips contract: a chip / preset row reads
// as "active" when the channel's color is within ±EPSILON per channel.
// Forgives small HSL-slider drift so users see the matching row
// highlighted even after fine-tuning.

const EPSILON = 5;

export function colorsMatch(
  a: { r: number; g: number; b: number } | undefined,
  b: { r: number; g: number; b: number },
): boolean {
  if (!a) return false;
  return (
    Math.abs(a.r - b.r) <= EPSILON &&
    Math.abs(a.g - b.g) <= EPSILON &&
    Math.abs(a.b - b.b) <= EPSILON
  );
}

/**
 * Find a preset matching the given color (within EPSILON), or
 * `undefined` when the channel holds a custom value. Used by Column A
 * to highlight the active row.
 */
export function findMatchingPreset(
  color: { r: number; g: number; b: number } | undefined,
): ColorPreset | undefined {
  if (!color) return undefined;
  return COLOR_PRESETS.find((p) => colorsMatch(color, p.color));
}
