// ─── Saber Color Naming Math — Test Suite ───
//
// Covers the three-tier naming system: landmark exact match, modifier
// expansion, coordinate-mood fallback. Also pins determinism (same RGB
// → same name) and coverage (no RGB falls through to "Unknown Crystal").

import { describe, it, expect } from 'vitest';
import {
  getSaberColorName,
  findLandmarkName,
  applyModifier,
  coordinateMoodName,
  rgbToHsl,
  _internals,
  type Landmark,
} from './namingMath';

/** HSL → RGB so test fixtures can be written in HSL and round-tripped through the public API. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sN = s / 100;
  const lN = l / 100;
  if (sN === 0) {
    const v = Math.round(lN * 255);
    return { r: v, g: v, b: v };
  }
  const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
  const p = 2 * lN - q;
  const hNorm = h / 360;
  const hueToRgb = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hueToRgb(hNorm + 1 / 3) * 255),
    g: Math.round(hueToRgb(hNorm) * 255),
    b: Math.round(hueToRgb(hNorm - 1 / 3) * 255),
  };
}

// ─── rgbToHsl sanity ──────────────────────────────────────────────────────

describe('rgbToHsl', () => {
  it('converts pure red correctly', () => {
    const { h, s, l } = rgbToHsl(255, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('converts pure green correctly', () => {
    const { h, s, l } = rgbToHsl(0, 255, 0);
    expect(h).toBe(120);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('converts pure blue correctly', () => {
    const { h, s, l } = rgbToHsl(0, 0, 255);
    expect(h).toBe(240);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('handles pure white (no hue)', () => {
    const { s, l } = rgbToHsl(255, 255, 255);
    expect(s).toBe(0);
    expect(l).toBe(100);
  });

  it('handles pure black', () => {
    const { s, l } = rgbToHsl(0, 0, 0);
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it('round-trips HSL → RGB → HSL within 1° / 1% tolerance', () => {
    const samples: Array<[number, number, number]> = [
      [0, 100, 50],
      [50, 92, 50],
      [120, 95, 47],
      [215, 90, 52],
      [275, 90, 45],
      [355, 80, 45],
    ];
    for (const [h, s, l] of samples) {
      const { r, g, b } = hslToRgb(h, s, l);
      const hsl = rgbToHsl(r, g, b);
      expect(Math.abs(hsl.h - h)).toBeLessThanOrEqual(1);
      expect(Math.abs(hsl.s - s)).toBeLessThanOrEqual(1);
      expect(Math.abs(hsl.l - l)).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Tier 1: Landmark exact matches ───────────────────────────────────────

describe('getSaberColorName — Tier 1 (landmark verbatim)', () => {
  it.each<[string, number, number, number]>([
    ['Obi-Wan Azure',        215, 90, 52],
    ['Vader Bloodshine',     359, 95, 52],
    ['Mace Windu Violet',    275, 90, 45],
    ['Ahsoka White',         0,   8,  88],
    ['Darksaber Core',       0,   5,  80],
    ['Luke ROTJ Green',      125, 95, 47],
    ['Rey Skywalker Gold',   50,  92, 50],
    ['Cal Kestis Cyan',      192, 92, 52],
    ['Anakin Skywalker',     235, 92, 51],
    ['Yoda Verdant',         112, 92, 52],
    ['Sith Crimson',         0,   90, 47],
    ['Kit Fisto Emerald',    145, 87, 50],
    ['Cal Kestis Magenta',   322, 90, 47],
    ['Temple Guard Gold',    46,  92, 50],
    ['Beskar Silver',        0,   6,  65],
    ['Durasteel Gray',       0,   6,  45],
    ['Carbonite',            0,   6,  26],
  ])('%s → landmark at HSL center returns "%s" verbatim', (name, h, s, l) => {
    const { r, g, b } = hslToRgb(h, s, l);
    expect(getSaberColorName(r, g, b)).toBe(name);
  });

  it('pure white (255,255,255) returns "Purified Kyber"', () => {
    expect(getSaberColorName(255, 255, 255)).toBe('Purified Kyber');
  });

  it('pure black (0,0,0) returns "Darksaber Edge"', () => {
    expect(getSaberColorName(0, 0, 0)).toBe('Darksaber Edge');
  });
});

// ─── Tier 2: Modifier expansion (end-to-end) ──────────────────────────────

describe('getSaberColorName — Tier 2 (modifier-prefixed)', () => {
  it('"Pale" when lightness is meaningfully above landmark', () => {
    // Mace Windu Violet (275, 90, 45); +15 lightness, stays nearest.
    const { r, g, b } = hslToRgb(275, 90, 60);
    expect(getSaberColorName(r, g, b)).toBe('Pale Mace Windu Violet');
  });

  it('"Deep" when lightness is meaningfully below landmark', () => {
    const { r, g, b } = hslToRgb(275, 90, 30);
    expect(getSaberColorName(r, g, b)).toBe('Deep Mace Windu Violet');
  });

  it('"Vivid" when saturation is meaningfully above landmark', () => {
    // Purified Bleed (10, 42, 59); +18 saturation. Sits in a sparse corner
    // of the red band so no Vivid-direction neighbor steals the match.
    const { r, g, b } = hslToRgb(10, 60, 59);
    expect(getSaberColorName(r, g, b)).toBe('Vivid Purified Bleed');
  });

  it('"Muted" when saturation is meaningfully below landmark', () => {
    // Nal Hutta Rust (22, 65, 40); −23 saturation, still closest.
    const { r, g, b } = hslToRgb(22, 42, 40);
    expect(getSaberColorName(r, g, b)).toBe('Muted Nal Hutta Rust');
  });

  it('"Shadowed" when both saturation and lightness drop together', () => {
    // Kashyyyk Jade (152, 57, 40); −17 sat, −15 lit, isolated.
    const { r, g, b } = hslToRgb(152, 40, 25);
    expect(getSaberColorName(r, g, b)).toBe('Shadowed Kashyyyk Jade');
  });

  it('"Bleached" when lightness rises but saturation drops', () => {
    const { r, g, b } = hslToRgb(152, 40, 55);
    expect(getSaberColorName(r, g, b)).toBe('Bleached Kashyyyk Jade');
  });

  it('"Dawn-" when hue shifts warmer by a small amount', () => {
    // Kit Fisto Emerald (145, 87, 50) shifted −7° toward warm.
    const { r, g, b } = hslToRgb(138, 87, 50);
    expect(getSaberColorName(r, g, b)).toBe('Dawn-Kit Fisto Emerald');
  });

  it('"Dusk-" when hue shifts cooler by a small amount', () => {
    // Yoda Verdant (112, 92, 52) shifted +8° toward cool.
    const { r, g, b } = hslToRgb(120, 92, 52);
    expect(getSaberColorName(r, g, b)).toBe('Dusk-Yoda Verdant');
  });

  it('"Frost-" when a larger hue shift moves a warm landmark cooler', () => {
    // Sullust Phosphor (78, 95, 62) +20° → (98, 95, 62), temp shift > threshold.
    const { r, g, b } = hslToRgb(98, 95, 62);
    expect(getSaberColorName(r, g, b)).toBe('Frost-Sullust Phosphor');
  });

  it('"Ember-" when a larger hue shift moves a cool landmark warmer', () => {
    // Sabine Wren Purple (292, 82, 55) +20° → (312, 82, 55), crosses temp threshold.
    const { r, g, b } = hslToRgb(312, 82, 55);
    expect(getSaberColorName(r, g, b)).toBe('Ember-Sabine Wren Purple');
  });
});

// ─── Tier 3: Coordinate-mood fallback ─────────────────────────────────────

describe('getSaberColorName — Tier 3 (coord-mood fallback)', () => {
  // Build target colors that land outside every landmark's orbit.
  // We accept any name matching the expected shape — the interesting
  // claim is "we never fall through to generic 'Unknown Crystal'".

  it('produces "{mood} {sector} {HEX}-{HEX}" for far-off colors', () => {
    // (240, 100, 90) — electric sky-blue. Every blue landmark is ≥22 lightness
    // units away, so nothing is in orbit.
    const { r, g, b } = hslToRgb(240, 100, 90);
    const name = getSaberColorName(r, g, b);
    // Tier 3 names always end in a hex-pair suffix; no landmark name does.
    expect(name).toMatch(/ [0-9A-F]{2}-[0-9A-F]{2}$/);
  });

  it('never returns the old "Unknown Crystal" fallback', () => {
    // Scan 1,000 random RGBs. None should fall through to "Unknown Crystal".
    let rng = 0x12345678;
    const random = () => {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      return rng / 0x7fffffff;
    };

    for (let i = 0; i < 1000; i++) {
      const r = Math.floor(random() * 256);
      const g = Math.floor(random() * 256);
      const b = Math.floor(random() * 256);
      const name = getSaberColorName(r, g, b);
      expect(name).not.toBe('Unknown Crystal');
      expect(name).not.toBe('');
      expect(typeof name).toBe('string');
    }
  });

  it('coordinate-mood name is stable for the same (h, l) pair', () => {
    // Same hue and lightness → same hex suffix, regardless of other variation.
    const a = coordinateMoodName({ h: 30, s: 50, l: 40 });
    const b = coordinateMoodName({ h: 30, s: 50, l: 40 });
    expect(a).toBe(b);
  });
});

// ─── Determinism: same RGB → same name, every time ────────────────────────

describe('getSaberColorName — determinism', () => {
  const fixtures: Array<[number, number, number]> = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [128, 0, 128],
    [255, 215, 0],
    [75, 0, 130],
    [200, 200, 200],
    [30, 30, 30],
    [180, 60, 120],
    [40, 200, 150],
  ];

  for (const [r, g, b] of fixtures) {
    it(`RGB(${r}, ${g}, ${b}) always returns the same name`, () => {
      const first = getSaberColorName(r, g, b);
      for (let i = 0; i < 1000; i++) {
        expect(getSaberColorName(r, g, b)).toBe(first);
      }
    });
  }
});

// ─── Direct applyModifier tests (modifier grammar in isolation) ───────────

describe('applyModifier — modifier precedence and boundaries', () => {
  const anchor: Landmark = { name: 'Anchor', h: 200, s: 70, l: 50 };

  it('returns bare name when within tight tolerance', () => {
    expect(applyModifier(anchor, { h: 200, s: 70, l: 50 })).toBe('Anchor');
  });

  it('Pale triggers at lightness delta ≥ LIT_DELTA_TRIGGER', () => {
    const d = _internals.LIT_DELTA_TRIGGER;
    expect(applyModifier(anchor, { h: 200, s: 70, l: 50 + d })).toBe('Pale Anchor');
    // Just below threshold → no modifier fires.
    expect(applyModifier(anchor, { h: 200, s: 70, l: 50 + d - 1 })).toBe('Anchor');
  });

  it('Deep triggers at negative lightness delta ≥ LIT_DELTA_TRIGGER', () => {
    const d = _internals.LIT_DELTA_TRIGGER;
    expect(applyModifier(anchor, { h: 200, s: 70, l: 50 - d })).toBe('Deep Anchor');
  });

  it('Vivid triggers at saturation delta ≥ SAT_DELTA_TRIGGER', () => {
    const d = _internals.SAT_DELTA_TRIGGER;
    expect(applyModifier(anchor, { h: 200, s: 70 + d, l: 50 })).toBe('Vivid Anchor');
  });

  it('Muted triggers at negative saturation delta ≥ SAT_DELTA_TRIGGER', () => {
    const d = _internals.SAT_DELTA_TRIGGER;
    expect(applyModifier(anchor, { h: 200, s: 70 - d, l: 50 })).toBe('Muted Anchor');
  });

  it('Shadowed wins when BOTH darker and less saturated', () => {
    // |ds| = 14, |dl| = 14, both negative. Compound takes precedence.
    expect(applyModifier(anchor, { h: 200, s: 56, l: 36 })).toBe('Shadowed Anchor');
  });

  it('Bleached wins when lighter AND less saturated', () => {
    expect(applyModifier(anchor, { h: 200, s: 56, l: 64 })).toBe('Bleached Anchor');
  });

  it('small coupled shifts do NOT trigger compound modifiers', () => {
    // |ds|=10, |dl|=10 — both below the 12-unit compound threshold.
    // Should fall through to single-axis modifiers (neither fires at this size)
    // and return the bare landmark name.
    expect(applyModifier(anchor, { h: 200, s: 60, l: 60 })).toBe('Anchor');
  });

  it('Dawn- / Dusk- fires only for small hue shifts', () => {
    // hueTemperature peaks at 30°, so shifts toward 30° are warmer.
    const lm: Landmark = { name: 'Mid', h: 100, s: 70, l: 50 };
    expect(applyModifier(lm, { h: 90, s: 70, l: 50 })).toBe('Dawn-Mid');
    expect(applyModifier(lm, { h: 112, s: 70, l: 50 })).toBe('Dusk-Mid');
  });

  it('achromatic landmarks never get hue-based modifiers', () => {
    const grey: Landmark = { name: 'Grey', h: 0, s: 8, l: 50, achromatic: true };
    // 40° hue shift, same sat/lit.
    expect(applyModifier(grey, { h: 40, s: 8, l: 50 })).toBe('Grey');
  });

  it('achromatic landmarks still accept Pale / Deep / Vivid / Muted', () => {
    const grey: Landmark = { name: 'Grey', h: 0, s: 8, l: 50, achromatic: true };
    expect(applyModifier(grey, { h: 0, s: 8, l: 65 })).toBe('Pale Grey');
    expect(applyModifier(grey, { h: 0, s: 25, l: 50 })).toBe('Vivid Grey');
  });
});

// ─── findLandmarkName (Tier 1 gate) ───────────────────────────────────────

describe('findLandmarkName', () => {
  it('returns exact: true when color sits on a landmark point', () => {
    const hit = findLandmarkName({ h: 215, s: 90, l: 52 });
    expect(hit).not.toBeNull();
    expect(hit!.exact).toBe(true);
    expect(hit!.landmark.name).toBe('Obi-Wan Azure');
  });

  it('returns exact: false but inOrbit: true for near matches', () => {
    const hit = findLandmarkName({ h: 215, s: 90, l: 60 });
    expect(hit).not.toBeNull();
    expect(hit!.exact).toBe(false);
    expect(hit!.inOrbit).toBe(true);
  });

  it('returns null for colors outside any orbit', () => {
    // Electric sky-blue — every blue landmark is too dim to fall in orbit,
    // and saturation is too high for the achromatic pool.
    const hit = findLandmarkName({ h: 240, s: 100, l: 90 });
    expect(hit).toBeNull();
  });
});

// ─── coordinateMoodName ───────────────────────────────────────────────────

describe('coordinateMoodName', () => {
  it('uses red-pool mood words for hue in [345, 15]', () => {
    const name = coordinateMoodName({ h: 5, s: 50, l: 40 });
    expect(name).toMatch(/^(Crimson|Ember|Pyre|Ashen|Bleed|Wrath|Fury) /);
  });

  it('uses blue-pool mood words for hue in [200, 250]', () => {
    const name = coordinateMoodName({ h: 225, s: 50, l: 50 });
    expect(name).toMatch(/^(Azure|Deepwater|Dawn|Azurine|Reverent|Still) /);
  });

  it('mood words stay short enough to keep Tier 3 names readable', () => {
    // Tier 3 names stack {mood} {sector} {HEX}-{HEX}. Long compound mood
    // words (like the dropped "Sentinel-Flame", "Felucia-Spore") made these
    // overflow tooltips. Cap mood ≤ 12 chars, sector ≤ 14 chars.
    const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const sats = [50, 5];
    for (const h of hues) {
      for (const s of sats) {
        const pool = _internals.selectMoodPool({ h, s, l: 50 });
        for (const m of pool.moods) expect(m.length).toBeLessThanOrEqual(12);
        for (const sec of pool.sectors) expect(sec.length).toBeLessThanOrEqual(14);
      }
    }
  });

  it('uses achromatic-pool mood words when saturation is very low', () => {
    const name = coordinateMoodName({ h: 90, s: 5, l: 55 });
    expect(name).toMatch(/^(Beskar|Ashgrey|Unknown|Ghost|Hollow|Durasteel) /);
  });

  it('produces hex coord deterministically from hue + lightness', () => {
    const a = coordinateMoodName({ h: 30, s: 50, l: 40 });
    const b = coordinateMoodName({ h: 30, s: 50, l: 40 });
    expect(a).toBe(b);
    const match = a.match(/ ([0-9A-F]{2})-([0-9A-F]{2})$/);
    expect(match).not.toBeNull();
  });
});

// ─── Star Wars lore preservation (spot checks) ────────────────────────────

describe('lore preservation — curated character names still land', () => {
  // These are the names most users will instantly recognize and must
  // survive any refactor. If one of these regresses, fix the table.
  it.each<[string, number, number, number]>([
    ['Obi-Wan Azure',       215, 90, 52],
    ['Vader Bloodshine',    359, 95, 52],
    ['Mace Windu Violet',   275, 90, 45],
    ['Ahsoka White',        0,   8,  88],
    ['Darksaber Core',      0,   5,  80],
    ['Darksaber Edge',      0,   5,  3],
    ['Yoda Verdant',        112, 92, 52],
    ['Luke ROTJ Green',     125, 95, 47],
    ['Rey Skywalker Gold',  50,  92, 50],
  ])('%s landmark survives as-is', (name, h, s, l) => {
    const { r, g, b } = hslToRgb(h, s, l);
    expect(getSaberColorName(r, g, b)).toBe(name);
  });
});

// ─── Regression: compound modifiers don't fire on small coupled shifts ───

describe('regression — compound threshold tuned for mid-saturation reds', () => {
  it('#CC3333 (mid-sat red) does NOT get "Bleached" prefix', () => {
    // Raw QA flag: before the compound threshold was raised from 10 to 12,
    // this color produced "Bleached Inquisitor Red" — semantically off because
    // the shift from the landmark (ds=-12, dl=+10) is too small to feel
    // "bleached" in the faded-fabric sense.
    const name = getSaberColorName(0xcc, 0x33, 0x33);
    expect(name).not.toContain('Bleached');
  });

  it('#CC3333 lands on a reasonable red landmark or single-axis modifier', () => {
    const name = getSaberColorName(0xcc, 0x33, 0x33);
    // Should be a bare landmark name or a Pale/Deep/Vivid/Muted variant — no
    // compound modifier, no coord-mood fallback.
    expect(name).not.toMatch(/ [0-9A-F]{2}-[0-9A-F]{2}$/);
    expect(name).not.toMatch(/^(Shadowed|Bleached) /);
  });
});

// ─── Fine-adjustment variety ──────────────────────────────────────────────

describe('fine-adjustment variety — no more repeating names on minute changes', () => {
  it('eight small nudges around Obi-Wan Azure produce at least 4 distinct names', () => {
    const base: [number, number, number] = [215, 90, 52];
    const nudges: Array<[number, number, number]> = [
      base,
      [base[0] + 2, base[1], base[2]],
      [base[0] - 2, base[1], base[2]],
      [base[0], base[1] + 5, base[2]],
      [base[0], base[1] - 8, base[2]],
      [base[0], base[1], base[2] + 14],
      [base[0], base[1], base[2] - 14],
      [base[0] + 10, base[1], base[2]],
    ];
    const names = new Set(
      nudges.map(([h, s, l]) => {
        const { r, g, b } = hslToRgb(h, s, l);
        return getSaberColorName(r, g, b);
      }),
    );
    expect(names.size).toBeGreaterThanOrEqual(4);
  });
});

// ─── Internal invariants ──────────────────────────────────────────────────

describe('landmark table invariants', () => {
  it('all landmark hue values sit in [0, 360)', () => {
    for (const lm of _internals.LANDMARKS) {
      expect(lm.h).toBeGreaterThanOrEqual(0);
      expect(lm.h).toBeLessThan(360);
    }
  });

  it('all landmark saturation/lightness values sit in [0, 100]', () => {
    for (const lm of _internals.LANDMARKS) {
      expect(lm.s).toBeGreaterThanOrEqual(0);
      expect(lm.s).toBeLessThanOrEqual(100);
      expect(lm.l).toBeGreaterThanOrEqual(0);
      expect(lm.l).toBeLessThanOrEqual(100);
    }
  });

  it('table holds at least 140 landmarks (v1 target ~150)', () => {
    expect(_internals.LANDMARKS.length).toBeGreaterThanOrEqual(140);
  });

  it('critical iconic landmarks are present in the table', () => {
    const required = [
      'Obi-Wan Azure',
      'Vader Bloodshine',
      'Mace Windu Violet',
      'Ahsoka White',
      'Darksaber Core',
      'Darksaber Edge',
      'Yoda Verdant',
      'Luke ROTJ Green',
      'Rey Skywalker Gold',
      'Cal Kestis Cyan',
      'Anakin Skywalker',
      'Kit Fisto Emerald',
      'Sith Crimson',
    ];
    for (const name of required) {
      expect(_internals.LANDMARKS.find((l) => l.name === name)).toBeDefined();
    }
  });
});
