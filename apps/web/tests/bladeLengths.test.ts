// ─── Drift sentinel: BLADE_LENGTHS source-of-truth lift ───
//
// The same blade-length table was previously inlined in five places
// (HardwarePanel, BladeHardwarePanel, BladeCanvas, SaberWizard,
// bladeRenderMetrics). The 36" entry's LED count drifted between the
// strict-math 132 (engine BLADE_LENGTH_PRESETS pre-lift) and the
// community-standard 144 (web-side inline arrays) — documented in
// PR #96's reverse-direction commit.
//
// Resolution: the canonical 36" value is **144 LEDs**, matching the
// WS2812B "1m strip = 144 LEDs" community convention that vendor
// blades labelled "Standard 36-inch" actually ship with. Picking 132
// (strict 3.66 LEDs/inch math) would mean the visualizer disagrees
// with what users flashed.
//
// This file pins the post-lift invariant: `BLADE_LENGTH_PRESETS` is the
// single canonical source, `BLADE_LENGTHS` (web side) is a derived view
// of it, and `inferBladeInches` is the reverse mapping. Drift on any of
// those three fails CI.

import { describe, it, expect } from 'vitest';
import { BLADE_LENGTH_PRESETS } from '@kyberstation/engine';
import {
  BLADE_LENGTHS,
  BLADE_LENGTH_CAPTIONS,
  COMMON_BLADE_INCHES,
  canonicalLedCountForInches,
  inferBladeInches,
  bladeLengthLabel,
} from '@/lib/bladeLengths';

describe('BLADE_LENGTH_PRESETS (canonical engine table)', () => {
  it('contains the 20" entry that the lift added', () => {
    // Pre-lift, the engine table had 24"-40" only. The 20" entry was
    // duplicated into web-side inline arrays. Lift moved it into the
    // canonical table so every consumer sees it without duplication.
    expect(BLADE_LENGTH_PRESETS['20"']).toBeDefined();
    expect(BLADE_LENGTH_PRESETS['20"']?.inches).toBe(20);
    expect(BLADE_LENGTH_PRESETS['20"']?.ledCount).toBe(73);
  });

  it('36" entry resolves to 144 LEDs (community 1m-strip convention — NOT the strict-math 132)', () => {
    // The WS2812B community ships "Standard 36-inch" blades with full
    // 1m strips at 144 LEDs/m density. Strict math (36 × 3.66 = 132)
    // disagrees with that hardware reality. PR #96's reverse-direction
    // commit explicitly chose the community standard so the visualizer
    // matches what users actually flashed. This assertion catches any
    // future regression back to 132.
    expect(BLADE_LENGTH_PRESETS['36"']?.ledCount).toBe(144);
  });

  it('covers exactly the canonical 20"/24"/28"/32"/36"/40" presets', () => {
    expect(Object.keys(BLADE_LENGTH_PRESETS).sort()).toEqual(
      ['20"', '24"', '28"', '32"', '36"', '40"'].sort(),
    );
  });
});

describe('BLADE_LENGTHS (derived web-side view)', () => {
  it('mirrors BLADE_LENGTH_PRESETS shape-by-shape', () => {
    // For every preset in the canonical engine table, the derived
    // `BLADE_LENGTHS` array MUST contain a matching entry. This is the
    // primary drift sentinel — a future inline edit on either side
    // would fail here.
    for (const [id, cfg] of Object.entries(BLADE_LENGTH_PRESETS)) {
      const derived = BLADE_LENGTHS.find((b) => b.inches === cfg.inches);
      expect(derived).toBeDefined();
      expect(derived?.id).toBe(id);
      expect(derived?.ledCount).toBe(cfg.ledCount);
    }
  });

  it('every canonical entry surfaces in the derived array', () => {
    expect(BLADE_LENGTHS.length).toBe(Object.keys(BLADE_LENGTH_PRESETS).length);
  });

  it('is sorted by inches ascending', () => {
    const inches = BLADE_LENGTHS.map((b) => b.inches);
    const sorted = [...inches].sort((a, b) => a - b);
    expect(inches).toEqual(sorted);
  });

  it('20" entry surfaces (drift fix)', () => {
    const yoda = BLADE_LENGTHS.find((b) => b.inches === 20);
    expect(yoda).toBeDefined();
    expect(yoda?.ledCount).toBe(73);
  });

  it('36" entry resolves to 144 LEDs (community 1m-strip convention)', () => {
    // Mirror of the engine-side assertion at the web layer. 144 is what
    // a "Standard 36-inch" vendor blade actually ships with (full 1m
    // strip at 144 LEDs/m density), not the 132 strict math suggests.
    const long = BLADE_LENGTHS.find((b) => b.inches === 36);
    expect(long?.ledCount).toBe(144);
  });
});

describe('inferBladeInches (reverse mapping)', () => {
  it('every preset ledCount reverse-maps to its inches', () => {
    // Round-trip invariant: forward via BLADE_LENGTHS, reverse via
    // inferBladeInches must agree for every canonical entry.
    for (const opt of BLADE_LENGTHS) {
      expect(inferBladeInches(opt.ledCount)).toBe(opt.inches);
    }
  });

  it('144 LEDs maps to 36" (post-lift community-standard mapping)', () => {
    // Pre-lift, HardwarePanel's local inferBladeInches said 144 -> 36
    // (community standard) and bladeRenderMetrics's said 132 -> 36
    // (strict math). They disagreed silently. Post-lift there's exactly
    // one implementation, derived from BLADE_LENGTH_PRESETS where 36"
    // is now canonically 144 LEDs. Any 36"-blade flashed with the full
    // 1m strip lands here.
    expect(inferBladeInches(144)).toBe(36);
  });

  it('145 LEDs and above maps to 40"', () => {
    // 36" caps at 144; 40" caps at 147. The narrow band 145-147 is the
    // 40" bucket because the piecewise ladder walks ascending.
    expect(inferBladeInches(145)).toBe(40);
    expect(inferBladeInches(147)).toBe(40);
    expect(inferBladeInches(10000)).toBe(40);
  });

  it('LED counts at or below 73 map to 20"', () => {
    expect(inferBladeInches(0)).toBe(20);
    expect(inferBladeInches(1)).toBe(20);
    expect(inferBladeInches(73)).toBe(20);
  });

  it('boundary buckets match the canonical presets', () => {
    // Each preset boundary should resolve to the matching preset.
    expect(inferBladeInches(74)).toBe(24);
    expect(inferBladeInches(88)).toBe(24);
    expect(inferBladeInches(89)).toBe(28);
    expect(inferBladeInches(103)).toBe(28);
    expect(inferBladeInches(104)).toBe(32);
    expect(inferBladeInches(117)).toBe(32);
    expect(inferBladeInches(118)).toBe(36);
    expect(inferBladeInches(132)).toBe(36); // 132 still inside the 36" bucket — boundary moved up to 144
    expect(inferBladeInches(144)).toBe(36);
  });
});

describe('bladeLengthLabel', () => {
  it('returns the vendor-reality caption for known inches', () => {
    // Captions reflect what real-world Neopixel saber vendors sell:
    // 36" is the de-facto Standard (full 1m WS2812B strip at 144 LEDs);
    // 24" is Combat-style; 20" is the Shoto/Yoda shoto-class blade.
    expect(bladeLengthLabel(36)).toBe('Standard (36")');
    expect(bladeLengthLabel(20)).toBe('Shoto / Yoda (20")');
    expect(bladeLengthLabel(24)).toBe('Combat (24")');
    expect(bladeLengthLabel(32)).toBe('Medium (32")');
    expect(bladeLengthLabel(40)).toBe('Extra Long (40")');
  });

  it('flags 28" as Uncommon — most Neopixel vendors skip from 24" to 32"', () => {
    expect(bladeLengthLabel(28)).toBe('Uncommon (28")');
  });

  it('falls back to inches-formatted label for unknown values', () => {
    expect(bladeLengthLabel(99)).toBe('99"');
  });
});

describe('BLADE_LENGTH_CAPTIONS (vendor-reality decorator)', () => {
  it('declares a caption for every canonical blade-inches value', () => {
    // If the engine adds a new preset, this test fails so the next agent
    // remembers to write a vendor-reality caption for it. Falling back
    // to the bare `${inches}"` label is allowed but not preferred.
    for (const opt of BLADE_LENGTHS) {
      expect(BLADE_LENGTH_CAPTIONS[opt.inches]).toBeDefined();
    }
  });

  it('labels 36" as the Standard length (most common 1m WS2812B strip)', () => {
    // 36" is the de-facto industry standard for Neopixel sabers — one
    // full WS2812B 1m strip ships at exactly 144 LEDs/m. The pre-2026-04-29
    // mislabel was "Long (36")"; the audit moved 36" to the Standard slot
    // and 32" to "Medium" so the caption matches what users actually buy.
    expect(BLADE_LENGTH_CAPTIONS[36]).toBe('Standard (36")');
  });
});

describe('COMMON_BLADE_INCHES (vendor sales reality)', () => {
  it('contains exactly the four lengths major Neopixel vendors sell', () => {
    // Saberbay / KR Sabers / 89sabers / Vader's Vault / Korbanth all
    // commonly ship 24"/32"/36"/40". 20" is shoto/Yoda-only; 28" is
    // a custom-build edge case. The LED-override warning uses this
    // set as the "expected" baseline.
    expect([...COMMON_BLADE_INCHES].sort((a, b) => a - b)).toEqual([24, 32, 36, 40]);
  });

  it('does not include 20" — a niche shoto-class length', () => {
    expect(COMMON_BLADE_INCHES.has(20)).toBe(false);
  });

  it('does not include 28" — most vendors skip from 24" to 32"', () => {
    expect(COMMON_BLADE_INCHES.has(28)).toBe(false);
  });
});

describe('canonicalLedCountForInches (LED-override sentinel input)', () => {
  it('returns the canonical LED count for every BLADE_LENGTHS entry', () => {
    for (const opt of BLADE_LENGTHS) {
      expect(canonicalLedCountForInches(opt.inches)).toBe(opt.ledCount);
    }
  });

  it('returns undefined for inches not in the canonical preset set', () => {
    // 26" / 30" / 35" don't exist in BLADE_LENGTHS → no canonical
    // baseline → the warning code-path treats this as "no signal,
    // so don't warn." Verified explicitly here so a future regression
    // doesn't accidentally start returning 0 / NaN / a bogus default.
    expect(canonicalLedCountForInches(26)).toBeUndefined();
    expect(canonicalLedCountForInches(30)).toBeUndefined();
    expect(canonicalLedCountForInches(35)).toBeUndefined();
  });

  it('36" returns 144 (the WS2812B 1m strip community standard)', () => {
    expect(canonicalLedCountForInches(36)).toBe(144);
  });
});
