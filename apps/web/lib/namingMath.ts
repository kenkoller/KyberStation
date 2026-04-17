// ─── Saber Color Naming Math ───
//
// Algorithmic tiered naming for the editor colour picker. Replaces the
// previous range-based lookup in `saberColorNames.ts` with a three-tier
// system that guarantees every RGB gets a distinctive, evocative name.
//
//   Tier 1 (landmark):    exact Star Wars name for curated HSL points
//   Tier 2 (modifier):    near-landmark colour → "Pale/Deep/Dawn-/..." prefix
//   Tier 3 (coord-mood):  off-map colour → "{Mood} Sector {HEX}-{HEX}"
//
// Determinism: same RGB → same name, every time.
// Coverage: no input falls through to "Unknown Crystal" — Tier 3 always fires.
//
// Bundle size is kept minimal by inlining the landmark table and mood pools
// rather than importing from the wider vocab module.

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Landmark {
  name: string;
  h: number;
  s: number;
  l: number;
  /** When true, hue is ignored and the landmark represents a neutral tone. */
  achromatic?: boolean;
  /** Tiebreaker when distances are equal. Higher wins. */
  priority?: number;
}

export interface LandmarkHit {
  landmark: Landmark;
  /** True within tight "this IS the landmark" tolerance. */
  exact: boolean;
  /** True within the broader "modifier applies" tolerance. */
  inOrbit: boolean;
}

// ─── HSL conversion ────────────────────────────────────────────────────────

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = ((max + min) / 2) * 100;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = (l > 50 ? d / (2 - max - min) : d / (max + min)) * 100;
    if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60;
    else if (max === gN) h = ((bN - rN) / d + 2) * 60;
    else h = ((rN - gN) / d + 4) * 60;
  }

  return { h, s, l };
}

/** Shortest signed angular delta from a to b on the hue circle. */
function hueDelta(a: number, b: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function absHueDelta(a: number, b: number): number {
  return Math.abs(hueDelta(a, b));
}

/**
 * Perceptual "temperature" of a hue: peaks at 30° (orange), dips at 210° (cyan).
 * Returned as [-1, 1]. Used to decide Ember- / Frost- / Dawn- / Dusk- direction.
 */
function hueTemperature(h: number): number {
  return Math.cos(((h - 30) * Math.PI) / 180);
}

// ─── Tier 1: Landmark table ────────────────────────────────────────────────
//
// ~147 curated HSL points. Ported from the original 121-entry range table in
// `saberColorNames.ts` (dedup'd across wraparound pairs), plus ~42 additions
// filling the yellow-green band, indigo band, extra achromatic variants, and
// Legends/KOTOR/SWTOR deep-cuts.
//
// Each landmark is an EXACT HSL triple. A target colour matches a landmark
// when it falls inside a distance threshold around that point. The nearest
// landmark wins; `priority` is only the tiebreaker for equidistant matches.

const LANDMARKS: readonly Landmark[] = [
  // ── Achromatic: whites & near-whites ──
  { name: 'Purified Kyber',        h: 0, s: 3,  l: 97, achromatic: true, priority: 11 },
  { name: 'First Light Kyber',     h: 0, s: 4,  l: 94, achromatic: true, priority: 10 },
  { name: 'Unattuned Kyber',       h: 0, s: 5,  l: 90, achromatic: true, priority: 9 },
  { name: 'Ahsoka White',          h: 0, s: 8,  l: 88, achromatic: true, priority: 9 },
  { name: 'Ilum Heart',            h: 0, s: 10, l: 84, achromatic: true, priority: 8 },
  { name: 'Darksaber Core',        h: 0, s: 5,  l: 80, achromatic: true, priority: 8 },
  { name: 'Ahsoka Rebels White',   h: 0, s: 9,  l: 87, achromatic: true, priority: 8 },
  { name: 'Mortis Father Silver',  h: 0, s: 6,  l: 76, achromatic: true, priority: 6 },
  { name: 'Shy Kyber',             h: 0, s: 12, l: 93, achromatic: true, priority: 5 },
  { name: 'Tatooine Salt Flat',    h: 0, s: 5,  l: 82, achromatic: true, priority: 4 },
  { name: 'Grogu Kyber',           h: 0, s: 12, l: 90, achromatic: true, priority: 4 },
  { name: 'Leia Pearl',            h: 0, s: 18, l: 82, achromatic: true, priority: 4 },

  // ── Achromatic: silvers, greys, duracrete ──
  { name: 'Beskar Silver',         h: 0, s: 6,  l: 65, achromatic: true, priority: 7 },
  { name: 'Durasteel Gray',        h: 0, s: 6,  l: 45, achromatic: true, priority: 7 },
  { name: 'Carbonite',             h: 0, s: 6,  l: 26, achromatic: true, priority: 7 },
  { name: 'Overcast Kyber',        h: 0, s: 8,  l: 70, achromatic: true, priority: 5 },
  { name: 'Tumbled Kyber',         h: 0, s: 18, l: 60, achromatic: true, priority: 5 },
  { name: 'Hollow Kyber',          h: 0, s: 3,  l: 65, achromatic: true, priority: 4 },
  { name: 'Winter Mandalore',      h: 0, s: 10, l: 72, achromatic: true, priority: 4 },
  { name: 'Raw Duracrete',         h: 0, s: 14, l: 38, achromatic: true, priority: 4 },
  { name: 'Kreia Grey',            h: 0, s: 8,  l: 52, achromatic: true, priority: 5 },

  // ── Achromatic: near-black ──
  { name: 'Darksaber Edge',        h: 0, s: 5,  l: 3,  achromatic: true, priority: 11 },
  { name: 'Exegol Depths',         h: 0, s: 15, l: 7,  achromatic: true, priority: 10 },
  { name: 'Void Shadow',           h: 0, s: 10, l: 13, achromatic: true, priority: 8 },
  { name: 'Korriban Obsidian',     h: 0, s: 12, l: 18, achromatic: true, priority: 7 },
  { name: 'Scorched Beskar',       h: 0, s: 22, l: 28, achromatic: true, priority: 5 },

  // ── Reds (hue 350-12°) ──
  { name: 'Sith Crimson',          h: 0,   s: 90, l: 47, priority: 10 },
  { name: 'Vader Bloodshine',      h: 359, s: 95, l: 52, priority: 9 },
  { name: 'Kylo Unstable',         h: 6,   s: 92, l: 51, priority: 8 },
  { name: 'Maul Fury',             h: 0,   s: 92, l: 41, priority: 8 },
  { name: 'Inquisitor Red',        h: 0,   s: 72, l: 40, priority: 6 },
  { name: 'Dark Side Ember',       h: 0,   s: 52, l: 35, priority: 5 },
  { name: 'Mustafar Glow',         h: 10,  s: 85, l: 62, priority: 4 },
  { name: 'Exar Kun Crimson',      h: 0,   s: 95, l: 45, priority: 8 },
  { name: 'Marka Ragnos Ruby',     h: 0,   s: 92, l: 38, priority: 7 },
  { name: 'Tulak Hord Scarlet',    h: 4,   s: 97, l: 45, priority: 7 },
  { name: 'Naga Sadow Bleed',      h: 5,   s: 94, l: 42, priority: 6 },
  { name: 'Revan Red-Violet',      h: 347, s: 85, l: 47, priority: 7 },
  { name: 'Freshly Bled',          h: 0,   s: 92, l: 51, priority: 6 },
  { name: 'Ancient Bleed',         h: 0,   s: 80, l: 35, priority: 6 },
  { name: 'Purified Bleed',        h: 10,  s: 42, l: 59, priority: 4 },
  { name: 'Starkiller Red',        h: 0,   s: 96, l: 48, priority: 8 },
  { name: 'Asajj Ventress Crimson',h: 0,   s: 94, l: 46, priority: 7 },
  { name: 'Savage Opress Blood',   h: 0,   s: 95, l: 41, priority: 7 },
  { name: 'Grand Inquisitor Rose', h: 354, s: 90, l: 52, priority: 7 },
  { name: 'Seventh Sister Red',    h: 0,   s: 92, l: 48, priority: 6 },
  { name: 'Reva Red',              h: 5,   s: 92, l: 52, priority: 6 },
  { name: 'Mortis Son Red',        h: 0,   s: 94, l: 55, priority: 6 },
  { name: 'Qimir Stranger Red',    h: 0,   s: 94, l: 45, priority: 7 },
  { name: 'Acolyte Ceremonial',    h: 351, s: 77, l: 47, priority: 5 },
  { name: 'Galen Marek Rage',      h: 5,   s: 96, l: 45, priority: 7 },
  { name: 'Starkiller Apprentice', h: 10,  s: 94, l: 42, priority: 7 },
  { name: 'Thrawn Chiss Red',      h: 3,   s: 92, l: 55, priority: 6 },
  { name: 'Jango Fett Crimson',    h: 355, s: 88, l: 45, priority: 6 },

  // ── Red-Orange (12-30°) ──
  { name: 'Fallen Order Ember',    h: 22, s: 90, l: 52, priority: 8 },
  { name: 'Nal Hutta Rust',        h: 22, s: 65, l: 40, priority: 5 },
  { name: 'Cal Kestis Orange',     h: 27, s: 92, l: 50, priority: 9 },

  // ── Orange (30-45°) ──
  { name: 'Mandalorian Flame',     h: 32, s: 90, l: 57, priority: 7 },
  { name: 'Tatooine Sunset',       h: 37, s: 72, l: 60, priority: 6 },
  { name: 'HK-47 Target Amber',    h: 36, s: 85, l: 57, priority: 7 },

  // ── Amber / Gold (40-55°) ──
  { name: 'Temple Guard Gold',     h: 46, s: 92, l: 50, priority: 9 },
  { name: 'Sentinel Amber',        h: 44, s: 85, l: 55, priority: 7 },
  { name: 'Coruscant Dawn',        h: 50, s: 75, l: 62, priority: 5 },
  { name: 'Rey Skywalker Gold',    h: 50, s: 92, l: 50, priority: 9 },
  { name: 'Rey Jakku Sand',        h: 45, s: 40, l: 65, priority: 4 },

  // ── Yellow (55-65°) ──
  { name: 'Jedi Sentinel',         h: 57, s: 90, l: 57, priority: 7 },
  { name: 'Krayt Pearl',           h: 55, s: 55, l: 72, priority: 5 },

  // ── Yellow-Green (65-92°) ──
  { name: 'Endor Canopy',          h: 77, s: 67, l: 45, priority: 6 },
  { name: 'Dagobah Mist',          h: 82, s: 42, l: 50, priority: 4 },
  { name: 'Felucia Bioluminescent',h: 80, s: 87, l: 65, priority: 7 },
  { name: 'Cathar Spring',         h: 75, s: 72, l: 55, priority: 5 },
  { name: 'Baran Do Sage-Leaf',    h: 85, s: 55, l: 60, priority: 5 },
  { name: 'Corellian Lime',        h: 75, s: 80, l: 52, priority: 6 },
  { name: 'Ryloth Marsh',          h: 85, s: 62, l: 42, priority: 5 },
  { name: 'Sullust Phosphor',      h: 78, s: 95, l: 62, priority: 6 },
  { name: 'Utapau Moss',           h: 68, s: 48, l: 38, priority: 4 },
  { name: 'Rodian Chartreuse',     h: 70, s: 90, l: 55, priority: 5 },
  { name: 'Felucia Spore',         h: 88, s: 72, l: 58, priority: 5 },

  // ── Green (92-160°) ──
  { name: 'Yoda Verdant',          h: 112, s: 92, l: 52, priority: 9 },
  { name: 'Luke ROTJ Green',       h: 125, s: 95, l: 47, priority: 10 },
  { name: 'Consular Green',        h: 120, s: 85, l: 45, priority: 7 },
  { name: 'Qui-Gon Sage',          h: 112, s: 75, l: 47, priority: 6 },
  { name: 'Kit Fisto Emerald',     h: 145, s: 87, l: 50, priority: 7 },
  { name: 'Kashyyyk Jade',         h: 152, s: 57, l: 40, priority: 5 },
  { name: 'Lothal Grass',          h: 105, s: 55, l: 60, priority: 4 },
  { name: 'Kyle Katarn Green',     h: 120, s: 90, l: 46, priority: 8 },
  { name: 'Agen Kolar Green',      h: 125, s: 90, l: 48, priority: 7 },
  { name: 'Mara Jade Emerald',     h: 135, s: 82, l: 50, priority: 7 },
  { name: 'Grievous Cyber-Green',  h: 112, s: 77, l: 53, priority: 7 },
  { name: 'Mortis Daughter Green', h: 100, s: 82, l: 63, priority: 6 },
  { name: 'Quinlan Vos Lichen',    h: 108, s: 62, l: 42, priority: 5 },
  { name: 'Ezra Bridger Green',    h: 118, s: 88, l: 48, priority: 6 },

  // ── Teal / Cyan (160-200°) ──
  { name: 'Mandalorian Ice',       h: 182, s: 85, l: 50, priority: 7 },
  { name: 'Hoth Frost',            h: 190, s: 65, l: 65, priority: 6 },
  { name: 'Kamino Teal',           h: 175, s: 55, l: 45, priority: 5 },
  { name: 'Cal Kestis Cyan',       h: 192, s: 92, l: 52, priority: 9 },
  { name: 'Luminara Blue-Green',   h: 180, s: 77, l: 49, priority: 7 },

  // ── Cyan / Sky (200-215°) ──
  { name: 'Ilum Crystal',          h: 197, s: 85, l: 57, priority: 7 },
  { name: 'Bespin Sky',            h: 205, s: 62, l: 65, priority: 5 },
  { name: 'Shaak Ti Azure',        h: 207, s: 90, l: 57, priority: 8 },
  { name: 'Plo Koon Steel-Blue',   h: 207, s: 67, l: 47, priority: 7 },
  { name: 'Meetra Exile Steel',    h: 205, s: 48, l: 50, priority: 5 },
  { name: 'Kanan Jarrus Azure',    h: 210, s: 90, l: 55, priority: 6 },

  // ── Blue (215-245°) ──
  { name: 'Jedi Guardian',         h: 227, s: 92, l: 47, priority: 8 },
  { name: 'Obi-Wan Azure',         h: 215, s: 90, l: 52, priority: 9 },
  { name: 'Anakin Skywalker',      h: 235, s: 92, l: 51, priority: 9 },
  { name: 'Corellian Blue',        h: 230, s: 72, l: 47, priority: 6 },
  { name: 'Hyperspace Blue',       h: 222, s: 85, l: 62, priority: 5 },
  { name: 'Senate Guard',          h: 240, s: 75, l: 40, priority: 6 },
  { name: 'Naboo Royal',           h: 240, s: 62, l: 45, priority: 4 },
  { name: 'Jaro Tapal Blue',       h: 217, s: 85, l: 45, priority: 8 },
  { name: 'Aayla Secura Blue',     h: 222, s: 85, l: 52, priority: 8 },
  { name: 'Ki-Adi-Mundi Blue',     h: 227, s: 82, l: 50, priority: 7 },
  { name: 'Saesee Tiin Blue',      h: 222, s: 90, l: 48, priority: 7 },
  { name: 'Barriss Offee Fallen',  h: 220, s: 77, l: 42, priority: 7 },
  { name: 'Bastila Shan Blue',     h: 220, s: 85, l: 50, priority: 7 },
  { name: 'Atton Rand Blue',       h: 215, s: 72, l: 52, priority: 6 },
  { name: 'Bo-Katan Azure',        h: 215, s: 92, l: 52, priority: 7 },

  // ── Indigo (245-275°) ──
  { name: 'Revan Indigo',          h: 257, s: 85, l: 42, priority: 7 },
  { name: 'Twilight of Republic',  h: 262, s: 55, l: 40, priority: 5 },
  { name: 'Jedha Twilight',        h: 255, s: 67, l: 47, priority: 6 },
  { name: 'Satele Shan Blue-Violet',h: 252, s: 77, l: 52, priority: 7 },
  { name: 'Nomi Sunrider',         h: 260, s: 67, l: 53, priority: 6 },
  { name: 'Inner Rim Indigo',      h: 255, s: 70, l: 42, priority: 5 },
  { name: 'Outer Rim Violet',      h: 260, s: 60, l: 38, priority: 5 },
  { name: 'Clawdite Twilight',     h: 265, s: 65, l: 40, priority: 5 },
  { name: 'Chiss Azure',           h: 245, s: 78, l: 47, priority: 5 },
  { name: 'Zakuul Indigo',         h: 252, s: 80, l: 40, priority: 5 },
  { name: 'Cassian Andor Dusk',    h: 245, s: 45, l: 42, priority: 4 },
  { name: 'Padmé Royal Violet',    h: 265, s: 70, l: 48, priority: 5 },

  // ── Purple (275-310°) ──
  { name: 'Mace Windu Violet',     h: 275, s: 90, l: 45, priority: 10 },
  { name: 'Mara Jade Orchid',      h: 282, s: 72, l: 40, priority: 7 },
  { name: 'Coruscant Neon',        h: 295, s: 85, l: 57, priority: 6 },
  { name: 'Dathomir Magick',       h: 302, s: 65, l: 40, priority: 5 },
  { name: 'Depa Billaba Amethyst', h: 282, s: 82, l: 47, priority: 7 },
  { name: 'Voss Mystic',           h: 278, s: 72, l: 44, priority: 5 },
  { name: 'Visas Marr Echo',       h: 285, s: 55, l: 35, priority: 5 },
  { name: 'Sabine Wren Purple',    h: 292, s: 82, l: 55, priority: 5 },

  // ── Magenta / Pink (310-350°) ──
  { name: 'Cal Kestis Magenta',    h: 322, s: 90, l: 47, priority: 9 },
  { name: 'Nightsister Pink',      h: 327, s: 72, l: 55, priority: 6 },
  { name: 'Zeffo Blossom',         h: 340, s: 65, l: 60, priority: 5 },
  { name: 'Rancor Rose',           h: 345, s: 75, l: 47, priority: 4 },
  { name: 'Mother Talzin Sigil',   h: 325, s: 82, l: 42, priority: 7 },
  { name: 'Dathomiri Coven',       h: 332, s: 57, l: 40, priority: 5 },
  { name: 'Darth Nihilus Hunger',  h: 345, s: 50, l: 25, priority: 5 },
];

// ─── Tier 1: match thresholds ──────────────────────────────────────────────
//
// "Exact" = within this, the colour is indistinguishable from the landmark.
// "Orbit" = close enough to sit under this landmark's name, modifier-prefixed.
// Outside orbit → Tier 3.

const EXACT_HUE = 4;
const EXACT_SAT = 5;
const EXACT_LIT = 5;
const ORBIT_HUE = 22;
const ORBIT_SAT = 28;
const ORBIT_LIT = 22;

/** Achromatic landmarks apply only when the target reads as neutral-ish. */
function achromaticApplies(hsl: HSL): boolean {
  return hsl.s < 25 || hsl.l < 10 || hsl.l > 92;
}

function landmarkDistance(lm: Landmark, hsl: HSL): number {
  const ds = hsl.s - lm.s;
  const dl = hsl.l - lm.l;

  if (lm.achromatic) {
    if (!achromaticApplies(hsl)) return Infinity;
    return Math.abs(ds) * 0.6 + Math.abs(dl);
  }

  const dh = absHueDelta(lm.h, hsl.h);
  return dh * 0.5 + Math.abs(ds) + Math.abs(dl);
}

function isExactMatch(lm: Landmark, hsl: HSL): boolean {
  if (lm.achromatic) {
    if (!achromaticApplies(hsl)) return false;
    return Math.abs(hsl.s - lm.s) <= EXACT_SAT && Math.abs(hsl.l - lm.l) <= EXACT_LIT;
  }
  return (
    absHueDelta(lm.h, hsl.h) <= EXACT_HUE &&
    Math.abs(hsl.s - lm.s) <= EXACT_SAT &&
    Math.abs(hsl.l - lm.l) <= EXACT_LIT
  );
}

function isInOrbit(lm: Landmark, hsl: HSL): boolean {
  if (lm.achromatic) {
    if (!achromaticApplies(hsl)) return false;
    return Math.abs(hsl.s - lm.s) <= ORBIT_SAT && Math.abs(hsl.l - lm.l) <= ORBIT_LIT;
  }
  return (
    absHueDelta(lm.h, hsl.h) <= ORBIT_HUE &&
    Math.abs(hsl.s - lm.s) <= ORBIT_SAT &&
    Math.abs(hsl.l - lm.l) <= ORBIT_LIT
  );
}

/**
 * Find the nearest landmark to the given HSL colour.
 *
 * Returns null only if no landmark is within orbit range. When a landmark
 * is returned, the caller can inspect `exact` and `inOrbit` to decide
 * between Tier 1 (verbatim) and Tier 2 (modifier-prefixed) output.
 */
export function findLandmarkName(hsl: HSL): LandmarkHit | null {
  let best: { landmark: Landmark; distance: number } | null = null;

  for (const lm of LANDMARKS) {
    const d = landmarkDistance(lm, hsl);
    if (d === Infinity) continue;
    if (
      !best ||
      d < best.distance ||
      (d === best.distance && (lm.priority ?? 0) > (best.landmark.priority ?? 0))
    ) {
      best = { landmark: lm, distance: d };
    }
  }

  if (!best) return null;
  const inOrbit = isInOrbit(best.landmark, hsl);
  if (!inOrbit) return null;

  return {
    landmark: best.landmark,
    exact: isExactMatch(best.landmark, hsl),
    inOrbit: true,
  };
}

// ─── Tier 2: Modifier grammar ──────────────────────────────────────────────
//
// Applied when a colour is in a landmark's orbit but not at the exact point.
// Precedence runs from most-specific (compound deviations) to least-specific
// (single-axis nudges). The first trigger wins — "Shadowed Obi-Wan Azure"
// beats "Deep Obi-Wan Azure" when both apply.

const COMPOUND_THRESHOLD = 10; // |ds| and |dl| must BOTH clear this
const HUE_SHIFT_MIN = 5;
const HUE_SHIFT_MAX = 15;
const EMBER_FROST_MIN = 15;
const EMBER_FROST_MAX = 28;
const LIT_DELTA_TRIGGER = 12;
const SAT_DELTA_TRIGGER = 15;
const TEMP_SHIFT_TRIGGER = 0.25;

export function applyModifier(landmark: Landmark, hsl: HSL): string {
  const ds = hsl.s - landmark.s;
  const dl = hsl.l - landmark.l;

  // Compound modifiers (both sat AND lit deviate meaningfully in chosen directions).
  if (Math.abs(dl) >= COMPOUND_THRESHOLD && Math.abs(ds) >= COMPOUND_THRESHOLD) {
    if (dl < 0 && ds < 0) return `Shadowed ${landmark.name}`;
    if (dl > 0 && ds < 0) return `Bleached ${landmark.name}`;
    // lighter+more-saturated or darker+more-saturated fall through to single-axis modifiers.
  }

  // Temperature-crossing modifiers only apply to chromatic landmarks where
  // the target has actually moved to a different warm/cool region.
  if (!landmark.achromatic) {
    const aDh = absHueDelta(landmark.h, hsl.h);
    if (aDh >= EMBER_FROST_MIN && aDh <= EMBER_FROST_MAX) {
      const lmTemp = hueTemperature(landmark.h);
      const tgTemp = hueTemperature(hsl.h);
      if (tgTemp - lmTemp >= TEMP_SHIFT_TRIGGER) return `Ember-${landmark.name}`;
      if (lmTemp - tgTemp >= TEMP_SHIFT_TRIGGER) return `Frost-${landmark.name}`;
    }

    if (aDh >= HUE_SHIFT_MIN && aDh <= HUE_SHIFT_MAX) {
      const lmTemp = hueTemperature(landmark.h);
      const tgTemp = hueTemperature(hsl.h);
      if (tgTemp >= lmTemp) return `Dawn-${landmark.name}`;
      return `Dusk-${landmark.name}`;
    }
  }

  // Lightness-only modifiers.
  if (dl >= LIT_DELTA_TRIGGER) return `Pale ${landmark.name}`;
  if (dl <= -LIT_DELTA_TRIGGER) return `Deep ${landmark.name}`;

  // Saturation-only modifiers.
  if (ds >= SAT_DELTA_TRIGGER) return `Vivid ${landmark.name}`;
  if (ds <= -SAT_DELTA_TRIGGER) return `Muted ${landmark.name}`;

  // In orbit but no trigger fired: close enough to use the bare landmark name.
  return landmark.name;
}

// ─── Tier 3: Coordinate-mood fallback ──────────────────────────────────────
//
// For colours that match no landmark. Builds a name from:
//   {moodWord} {sectorWord} {hex}-{hex}
// — hex pair is deterministically derived from (hue, lightness), so the same
// RGB always produces the same coord. Mood and sector are selected from hue-
// specific pools via a deterministic hash so near-identical colours produce
// near-identical names but fine differences still surface new words.

interface MoodPool {
  /** Inclusive lower bound (hue), or null for achromatic. */
  from: number | null;
  /** Exclusive upper bound. Wraps if from > to. Null for achromatic. */
  to: number | null;
  moods: readonly string[];
  sectors: readonly string[];
}

const MOOD_POOLS: readonly MoodPool[] = [
  // Achromatic / low-saturation → grounded steel/beskar/obsidian vocabulary.
  // Selected up-front when s is very low; hue range on this entry is only a tiebreaker.
  {
    from: null,
    to: null,
    moods: ['Beskar', 'Ashgrey', 'Unknown', 'Ghost', 'Hollow', 'Durasteel'],
    sectors: ['Rift', 'Wastes', 'Expanse', 'Vault', 'Hollow', 'Reach'],
  },
  // Reds (wraps: 345 → 15)
  {
    from: 345,
    to: 15,
    moods: ['Crimson', 'Ember', 'Pyre', 'Ashen', 'Bleed', 'Wrath', 'Fury'],
    sectors: ['Sector', 'Rim', 'Quadrant', 'Expanse', 'Forge', 'Warzone'],
  },
  // Orange (15-45)
  {
    from: 15,
    to: 45,
    moods: ['Ember', 'Copper', 'Flare', 'Kindle', 'Sunforge', 'Mustafar-Lit'],
    sectors: ['Rim', 'Belt', 'Expanse', 'Forge', 'Outer Rim', 'Crater'],
  },
  // Amber / yellow (45-65)
  {
    from: 45,
    to: 65,
    moods: ['Dawn', 'Vigil', 'Gold', 'Sentinel-Flame', 'Sunlit', 'Vigilant'],
    sectors: ['Expanse', 'Dawn Quadrant', 'Reach', 'Outer Rim', 'Meridian'],
  },
  // Yellow-green / chartreuse (65-90)
  {
    from: 65,
    to: 90,
    moods: ['Verdant', 'Mist', 'Vine', 'Sporelight', 'Felucia-Spore', 'Canopy'],
    sectors: ['Reach', 'Canopy', 'Sector', 'Overgrowth', 'Marsh'],
  },
  // Green (90-160)
  {
    from: 90,
    to: 160,
    moods: ['Verdant', 'Mistlight', 'Living', 'Grove', 'Kashyyyk-Lit', 'Wild'],
    sectors: ['Reach', 'Canopy', 'Sector', 'Expanse', 'Hollow', 'Grove'],
  },
  // Cyan / teal (160-200)
  {
    from: 160,
    to: 200,
    moods: ['Frost', 'Tideborn', 'Kamino', 'Pale', 'Ilum-Pure', 'Glacial'],
    sectors: ['Margin', 'Tideline', 'Sector', 'Expanse', 'Reef', 'Drift'],
  },
  // Blue (200-250)
  {
    from: 200,
    to: 250,
    moods: ['Azure', 'Deepwater', 'Dawn', 'Azurine', 'Reverent', 'Still'],
    sectors: ['Outer Rim', 'Sector', 'Reach', 'Expanse', 'Deep', 'Meridian'],
  },
  // Indigo / violet (250-290)
  {
    from: 250,
    to: 290,
    moods: ['Dusk', 'Twilight', 'Hollow', 'Violet-Hush', 'Between-Worlds'],
    sectors: ['Quadrant', 'Expanse', 'Sector', 'Margin', 'Hollow'],
  },
  // Pink / magenta (290-345)
  {
    from: 290,
    to: 345,
    moods: ['Nightsister', 'Zeffo', 'Dathomiri', 'Magick-Kissed', 'Witch-Spoken'],
    sectors: ['Expanse', 'Coven', 'Quadrant', 'Sector', 'Bloom'],
  },
];

const ACHROMATIC_POOL = MOOD_POOLS[0];

function selectMoodPool(hsl: HSL): MoodPool {
  // Very low saturation → use achromatic pool regardless of hue.
  if (hsl.s < 18) return ACHROMATIC_POOL;

  // Otherwise find the chromatic pool whose range contains this hue.
  const h = ((hsl.h % 360) + 360) % 360;
  for (const pool of MOOD_POOLS) {
    if (pool.from === null || pool.to === null) continue;
    const { from, to } = pool;
    const inside = from <= to ? h >= from && h < to : h >= from || h < to;
    if (inside) return pool;
  }
  return ACHROMATIC_POOL;
}

/**
 * Deterministic integer hash from (h, s, l). Used for mood/sector selection.
 * Large primes + XOR give good distribution for tightly-clustered inputs.
 */
function hashHsl(h: number, s: number, l: number): number {
  const hi = Math.floor(((h % 360) + 360) % 360);
  const si = Math.floor(Math.max(0, Math.min(100, s)));
  const li = Math.floor(Math.max(0, Math.min(100, l)));
  // >>> 0 forces unsigned 32-bit, keeps the result non-negative.
  return ((hi * 73856093) ^ (si * 19349663) ^ (li * 83492791)) >>> 0;
}

function toHexPair(byte: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(byte))) | 0;
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}

export function coordinateMoodName(hsl: HSL): string {
  const pool = selectMoodPool(hsl);
  const hash = hashHsl(hsl.h, hsl.s, hsl.l);
  const mood = pool.moods[hash % pool.moods.length];
  const sector = pool.sectors[(hash >>> 7) % pool.sectors.length];

  // Coord hex pairs from hue + lightness (per spec). Same (h, l) → same coord.
  const byte1 = toHexPair((hsl.h * 255) / 360);
  const byte2 = toHexPair(hsl.l * 2.55);

  return `${mood} ${sector} ${byte1}-${byte2}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a Star Wars universe name for the given RGB colour.
 *
 * Three-tier algorithm:
 *   1. Landmark match  → "Obi-Wan Azure"
 *   2. Near landmark   → "Pale Obi-Wan Azure"
 *   3. Off-map         → "Azure Outer Rim 6D-A7"
 *
 * Deterministic: identical RGB always yields identical name.
 */
export function getSaberColorName(r: number, g: number, b: number): string {
  const hsl = rgbToHsl(r, g, b);
  const hit = findLandmarkName(hsl);
  if (hit?.exact) return hit.landmark.name;
  if (hit?.inOrbit) return applyModifier(hit.landmark, hsl);
  return coordinateMoodName(hsl);
}

/** Exposed for tests / debugging. Not part of the public UI surface. */
export const _internals = {
  LANDMARKS,
  EXACT_HUE,
  EXACT_SAT,
  EXACT_LIT,
  ORBIT_HUE,
  ORBIT_SAT,
  ORBIT_LIT,
  LIT_DELTA_TRIGGER,
  SAT_DELTA_TRIGGER,
  HUE_SHIFT_MIN,
  HUE_SHIFT_MAX,
  EMBER_FROST_MIN,
  EMBER_FROST_MAX,
  landmarkDistance,
  isExactMatch,
  isInOrbit,
  hueTemperature,
  selectMoodPool,
  hashHsl,
};
