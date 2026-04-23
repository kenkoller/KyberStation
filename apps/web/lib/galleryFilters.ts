// ─── Gallery filter classifiers ─────────────────────────────────────────────
//
// Pure helpers used by the full-screen Gallery page to bucket presets by
// two additional filter dimensions:
//
//   1. classifyColorFamily({r, g, b}) — derives a color family bucket from
//      a BladeConfig.baseColor RGB triple using cheap perceptual-ish
//      heuristics. Not HSL-accurate, deliberately — this is a filter, not
//      a color-matching system, and users care about "is this blue enough
//      to show up under the Blue pill" not precise hue boundaries.
//
//   2. classifyStyleFamily(styleId) — buckets the 29 blade-style IDs into
//      six broad families (plus 'other' as a safety net for unknown
//      styles, e.g. user imports that reference a future style we don't
//      know about yet).
//
// Both helpers are exported for co-located tests in
// `apps/web/tests/galleryFilters.test.ts`.

export type ColorFamily =
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'yellow'
  | 'white'
  | 'other';

export type StyleFamily =
  | 'steady'
  | 'animated'
  | 'particle'
  | 'color'
  | 'hand-painted'
  | 'kinetic'
  | 'other';

// ─── Color family ───────────────────────────────────────────────────────────

export function classifyColorFamily(rgb: {
  r: number;
  g: number;
  b: number;
}): ColorFamily {
  const { r, g, b } = rgb;

  // White — all channels bright, low spread
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (r > 220 && g > 220 && b > 220 && max - min < 60) {
    return 'white';
  }

  // Yellow — r + g both bright, b dim
  if (r > 160 && g > 160 && b < 80) {
    return 'yellow';
  }

  // Purple — r + b both meaningfully present, g dim (magenta falls here too)
  if (r > 100 && b > 100 && g < 80) {
    return 'purple';
  }

  // Primary channel dominants — order matters only when two "dominant"
  // conditions would both be true; the > 160 + "dominant" check keeps
  // these exclusive in practice.
  if (r >= g && r >= b && r > 160) {
    return 'red';
  }
  if (g >= r && g >= b && g > 160) {
    return 'green';
  }
  if (b >= r && b >= g && b > 160) {
    return 'blue';
  }

  return 'other';
}

// ─── Style family ───────────────────────────────────────────────────────────

const STEADY_STYLES = new Set(['stable', 'rotoscope', 'gradient']);
const ANIMATED_STYLES = new Set([
  'unstable',
  'pulse',
  'fire',
  'candle',
  'cinder',
  'ember',
]);
const PARTICLE_STYLES = new Set([
  'photon',
  'plasma',
  'crystalShatter',
  'shatter',
  'dataStream',
  'helix',
  'neutron',
  'automata',
  'cascade',
  'tidal',
  'torrent',
]);
const COLOR_STYLES = new Set([
  'aurora',
  'prism',
  'moire',
  'vortex',
  'nebula',
  'mirage',
]);
const HAND_PAINTED_STYLES = new Set(['painted', 'imageScroll']);
const KINETIC_STYLES = new Set(['gravity']);

export function classifyStyleFamily(styleId: string): StyleFamily {
  if (STEADY_STYLES.has(styleId)) return 'steady';
  if (ANIMATED_STYLES.has(styleId)) return 'animated';
  if (PARTICLE_STYLES.has(styleId)) return 'particle';
  if (COLOR_STYLES.has(styleId)) return 'color';
  if (HAND_PAINTED_STYLES.has(styleId)) return 'hand-painted';
  if (KINETIC_STYLES.has(styleId)) return 'kinetic';
  return 'other';
}
