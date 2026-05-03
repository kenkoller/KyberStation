// ─── Contract test: SaberWizard hardware-step options ───
//
// The wizard's hardware step (added 2026-04-22) writes two persisted
// values: BladeConfig.ledCount and SaberProfile.boardType. This test
// guards the constants that drive those writes so a future LED-count
// edit doesn't quietly desync from inferBladeInches, and a future
// board-list edit doesn't smuggle in a storeValue that fails
// SaberProfile import validation or breaks CodeOutput's mapping.

import { describe, it, expect } from 'vitest';
import { BLADE_LENGTH_PRESETS } from '@kyberstation/engine';
import {
  BLADE_LENGTHS,
  BOARDS,
  VIBES,
  type BoardOption,
  type VibeOption,
} from '@/components/onboarding/SaberWizard';
import { inferBladeInches } from '@/lib/bladeRenderMetrics';

describe('SaberWizard BLADE_LENGTHS', () => {
  it('has 6 entries covering 20"–40"', () => {
    expect(BLADE_LENGTHS.map((b) => b.inches)).toEqual([20, 24, 28, 32, 36, 40]);
  });

  it('every entry has a positive ledCount and a vendor-reality caption', () => {
    // Labels were originally bare inches (`20"`, `24"`, ...). The
    // 2026-04-29 hardware audit replaced them with vendor-reality
    // captions (`Shoto / Yoda (20")`, `Combat (24")`, `Standard (36")`)
    // sourced from `lib/bladeLengths.ts::BLADE_LENGTH_CAPTIONS` so the
    // wizard's picker matches what real Neopixel saber vendors sell.
    for (const b of BLADE_LENGTHS) {
      expect(b.ledCount).toBeGreaterThan(0);
      // Caption must contain the bare inches token (e.g. `(36")`) so
      // a screen reader always announces the dimension.
      expect(b.label).toContain(`${b.inches}"`);
    }
  });

  it('labels 36" as the Standard length (de-facto Neopixel standard)', () => {
    const long = BLADE_LENGTHS.find((b) => b.inches === 36);
    expect(long?.label).toBe('Standard (36")');
  });

  it('labels 32" as Medium, not Standard (vendor-reality fix)', () => {
    // Pre-audit, 32" was mislabeled "Standard (32")" while 36" got
    // "Long (36")", which inverted the actual vendor reality.
    const medium = BLADE_LENGTHS.find((b) => b.inches === 32);
    expect(medium?.label).toBe('Medium (32")');
  });

  it('every ledCount reverse-maps to its inches via inferBladeInches', () => {
    // Mirrors the piecewise ladder in lib/bladeRenderMetrics.ts. If the
    // ladder shifts, the wizard would silently mis-render the chosen
    // length on the canvas.
    for (const b of BLADE_LENGTHS) {
      expect(inferBladeInches(b.ledCount)).toBe(b.inches);
    }
  });

  it('agrees with the canonical BLADE_LENGTH_PRESETS in the engine package', () => {
    // Post-lift drift sentinel: the wizard derives BLADE_LENGTHS from
    // `lib/bladeLengths.ts`, which in turn derives from the engine's
    // BLADE_LENGTH_PRESETS. If a future edit ever reintroduces an
    // inline drift here (e.g. flipping 36" back to strict-math 132),
    // this test fails immediately.
    for (const b of BLADE_LENGTHS) {
      const canonical = Object.values(BLADE_LENGTH_PRESETS).find(
        (p) => p.inches === b.inches,
      );
      expect(canonical).toBeDefined();
      expect(canonical?.ledCount).toBe(b.ledCount);
    }
  });
});

describe('SaberWizard BOARDS', () => {
  it('lists Proffie V3 first as the only verified board', () => {
    expect(BOARDS[0]?.id).toBe('proffie-v3');
    expect(BOARDS[0]?.compatibility).toBe('verified');
    // Per CLAUDE.md, V3 is the only board with end-to-end hardware
    // validation as of 2026-04-22. If a second board gets validated,
    // bump it to 'verified' and update this assertion.
    const verified = BOARDS.filter((b) => b.compatibility === 'verified');
    expect(verified.map((b) => b.id)).toEqual(['proffie-v3']);
  });

  it('Proffie V2 is flagged untested, not verified', () => {
    // V2 is code-supported but hardware-validation is pending per
    // CLAUDE.md "cross-board (V2, V3-OLED) sweeps still pending".
    const v2 = BOARDS.find((b) => b.id === 'proffie-v2');
    expect(v2?.compatibility).toBe('untested');
  });

  it('non-Proffie boards are reference-only', () => {
    // CFX / GH / Xenopixel live in different firmware ecosystems entirely;
    // the generated ProffieOS config.h won't run on them.
    for (const id of [
      'cfx',
      'gh-v4',
      'gh-v3',
      'xenopixel-v3',
      'xenopixel-v2',
    ] as const) {
      const b = BOARDS.find((board) => board.id === id);
      expect(b?.compatibility).toBe('reference');
    }
  });

  it('includes Xenopixel V3 + V2 (popular budget board, was missing pre-2026-05-03)', () => {
    // Xenopixel is one of the most common saber boards in the hobby
    // (budget-friendly, popular with first-time builders) but was absent
    // from the wizard step 1 picker until 2026-05-03. Its onboarding
    // path was "skip wizard → find in profile manager later" which is a
    // poor first-run experience for the most-popular budget board.
    const xv3 = BOARDS.find((b) => b.id === 'xenopixel-v3');
    const xv2 = BOARDS.find((b) => b.id === 'xenopixel-v2');
    expect(xv3?.storeValue).toBe('Xenopixel V3');
    expect(xv2?.storeValue).toBe('Xenopixel V2');
    // Xenopixel's tagline is honest about the design-reference limitation
    // (preloaded effect files, not flashable from C++ config).
    expect(xv3?.tagline.toLowerCase()).toContain('preloaded');
    expect(xv2?.tagline.toLowerCase()).toContain('preloaded');
  });

  it('Xenopixel storeValue strings match SaberProfileManager + CodeOutput keys', () => {
    // CodeOutput.tsx:211 lists 'Xenopixel V3' / 'Xenopixel V2' as
    // recognized board names, and SaberProfileManager.tsx renders the
    // same option labels. If wizard storeValue drifts, profile import
    // round-trips would fail validation.
    const xv3 = BOARDS.find((b) => b.id === 'xenopixel-v3');
    const xv2 = BOARDS.find((b) => b.id === 'xenopixel-v2');
    expect(xv3?.storeValue).toBe('Xenopixel V3');
    expect(xv2?.storeValue).toBe('Xenopixel V2');
  });

  it('storeValue for Proffie V3 / V2 matches CodeOutput board-name keys', () => {
    // CodeOutput.tsx:67-68 maps these exact strings back to
    // proffieboard_v3 / proffieboard_v2 for config.h emission. If the
    // strings drift, generated code targets the wrong board.
    const v3 = BOARDS.find((b) => b.id === 'proffie-v3');
    const v2 = BOARDS.find((b) => b.id === 'proffie-v2');
    expect(v3?.storeValue).toBe('Proffie V3');
    expect(v2?.storeValue).toBe('Proffie V2');
  });

  it('every storeValue stays within saberProfileStore import limit (50 chars)', () => {
    // saberProfileStore.importProfile slices boardType to 50 chars; a
    // longer value here would silently truncate after a profile export
    // round-trip.
    for (const b of BOARDS) {
      expect(b.storeValue.length).toBeLessThanOrEqual(50);
    }
  });

  it('reference boards explain the limitation in their tagline', () => {
    // Original rule was "must mention Proffie" — works for CFX/GH because
    // Proffie is the closest-equivalent Neopixel board users could flash
    // KyberStation's output on. But Xenopixel users would never flash via
    // Proffie (different SD card workflow entirely), so its tagline is
    // honest about the actual limitation: preloaded effect files. Either
    // phrasing is acceptable as long as the limitation is surfaced.
    const refOnly = BOARDS.filter((b) => b.compatibility === 'reference');
    expect(refOnly.length).toBeGreaterThan(0);
    for (const b of refOnly) {
      const tagline = b.tagline.toLowerCase();
      const explainsLimitation =
        tagline.includes('proffie') ||
        tagline.includes('preloaded') ||
        tagline.includes('reference');
      expect(explainsLimitation, `${b.id} tagline must explain limitation: "${b.tagline}"`).toBe(true);
    }
  });

  it('every board id is unique', () => {
    const ids = BOARDS.map((b: BoardOption) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── Wizard VIBES (Step 4) ───────────────────────────────────────────
//
// VIBES drive the final config written by the wizard. Each vibe sets
// ignition/retraction IDs that must exist in the engine registries
// (packages/engine/src/ignition/index.ts IGNITION_REGISTRY /
// RETRACTION_REGISTRY). If a vibe uses a non-existent ID, the engine
// falls back to standard with a console.warn — silently wrong output.

// Canonical engine registry IDs as of 2026-04-29. If the engine adds
// or removes IDs, update this list — a failing test here is the
// intended signal.
const VALID_IGNITION_IDS = [
  'standard', 'scroll', 'center', 'spark', 'wipe', 'stutter',
  'glitch', 'twist', 'swing', 'stab', 'custom-curve', 'crackle',
  'fracture', 'flash-fill', 'pulse-wave', 'drip-up', 'hyperspace',
  'summon', 'seismic',
];

const VALID_RETRACTION_IDS = [
  'standard', 'scroll', 'center', 'fadeout', 'shatter',
  'custom-curve', 'dissolve', 'flickerOut', 'unravel', 'drain',
  'implode', 'evaporate', 'spaghettify',
];

describe('SaberWizard VIBES', () => {
  it('has 4 entries with unique IDs', () => {
    expect(VIBES).toHaveLength(4);
    const ids = VIBES.map((v: VibeOption) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every ignition ID exists in the engine ignition registry', () => {
    for (const v of VIBES) {
      expect(VALID_IGNITION_IDS).toContain(v.ignition);
    }
  });

  it('every retraction ID exists in the engine retraction registry', () => {
    for (const v of VIBES) {
      expect(VALID_RETRACTION_IDS).toContain(v.retraction);
    }
  });

  it('shimmer values are in valid 0-1 range', () => {
    for (const v of VIBES) {
      expect(v.shimmer).toBeGreaterThanOrEqual(0);
      expect(v.shimmer).toBeLessThanOrEqual(1);
    }
  });

  it('timing values are positive integers', () => {
    for (const v of VIBES) {
      expect(v.ignitionMs).toBeGreaterThan(0);
      expect(v.retractionMs).toBeGreaterThan(0);
      expect(Number.isInteger(v.ignitionMs)).toBe(true);
      expect(Number.isInteger(v.retractionMs)).toBe(true);
    }
  });

  it('every vibe has a non-empty label and description', () => {
    for (const v of VIBES) {
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.desc.length).toBeGreaterThan(0);
    }
  });
});

// ─── Wizard defaults ─────────────────────────────────────────────────
//
// The wizard's LED-count fallback and the bladeStore default must agree.
// PR #99 flipped the engine canonical to 36"=144 LEDs, but the wizard
// had a stale 132 fallback that this audit fixed.

describe('SaberWizard defaults', () => {
  it('default LED count for 36" matches the canonical BLADE_LENGTHS entry', () => {
    const thirtysSix = BLADE_LENGTHS.find((b) => b.inches === 36);
    expect(thirtysSix).toBeDefined();
    // The wizard's fallback ledCount (used when currentConfig.ledCount
    // is undefined) must match the canonical 36" entry. This catches
    // the stale-132 drift that existed before the audit fix.
    expect(thirtysSix?.ledCount).toBe(144);
  });
});
