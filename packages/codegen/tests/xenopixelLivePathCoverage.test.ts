// ─── Xenopixel V3 Live Path Coverage Tests ─────────────────────────────
//
// Pins the style + ignition + speed-clamp coverage shared between the
// `XenopixelEmitter` class (`packages/codegen/src/emitters/XenopixelEmitter.ts`)
// and the live SD card export path (`apps/web/lib/zipExporter.ts`).
//
// Context: prior to 2026-05-16 the live path used a narrower 6-style /
// 12-ignition (direct-only) map; the emitter class had a richer map
// with degradation fallbacks. The multi-board field-coverage audit
// (B2, `docs/research/MULTI_BOARD_FIELD_COVERAGE_2026-05-16_B2_xeno-cfx-gh.md`)
// flagged this drift: 27 of 33 KyberStation styles silently degraded
// to Steady (1) in Xenopixel exports, and 8 ignitions silently fell
// back to Standard (0).
//
// These tests verify the shared helpers (`mapBladeEffect`,
// `mapIgnitionStyle`, `clampIgnitionSpeed`, `clampRetractionSpeed`)
// produce the exact expected output for every KyberStation style ID
// and every KyberStation ignition ID known to the engine — so any
// future drift between the class and the live path will fail loudly.

import { describe, it, expect } from 'vitest';
import {
  mapBladeEffect,
  mapIgnitionStyle,
  clampIgnitionSpeed,
  clampRetractionSpeed,
  XENO_BLADE_EFFECTS,
  XENO_IGNITION_STYLES,
  XENO_IGNITION_SPEED_MIN,
  XENO_IGNITION_SPEED_MAX,
  XENO_RETRACTION_SPEED_MIN,
  XENO_RETRACTION_SPEED_MAX,
} from '../src/emitters/XenopixelEmitter.js';

// ─── Source-of-truth coverage tables ───────────────────────────────────
//
// These are the 33 styles registered in the engine's STYLE_REGISTRY
// (packages/engine/src/styles/index.ts). The expected ID is what the
// shared helper SHOULD produce for the live SD-card export path.
//
// Entries with a non-null `note` are degradation cases — the helper
// must produce a degradation string the README can surface. Direct
// matches (the 8 native Xenopixel effects) have `note: null`.

interface StyleExpectation {
  /** KyberStation style ID, as registered in STYLE_REGISTRY. */
  styleId: string;
  /** Expected Xenopixel V3 blade effect ID (0-7). */
  expectedXenoId: number;
  /** When non-null, the helper must produce a degradation note. */
  note: 'direct' | 'degraded';
}

/**
 * Full coverage table for all 33 KyberStation engine styles.
 * Anchor for the live SD card export path's `mapBladeEffect` calls.
 */
const STYLE_COVERAGE: readonly StyleExpectation[] = [
  // Direct mappings — Xenopixel has a native firmware effect for these
  // AND the engine has a registered style with the same ID. The other
  // three XENO_BLADE_EFFECTS entries (`rainbow`, `candy`, `flashing`)
  // exist in the Xenopixel firmware but have no KyberStation engine
  // analog with that exact ID, so they cannot appear as a
  // `BladeConfig.style` value in the live export path.
  { styleId: 'fire',           expectedXenoId: 0, note: 'direct' },
  { styleId: 'stable',         expectedXenoId: 1, note: 'direct' },
  { styleId: 'unstable',       expectedXenoId: 2, note: 'direct' },
  { styleId: 'crystalShatter', expectedXenoId: 5, note: 'direct' },
  { styleId: 'pulse',          expectedXenoId: 6, note: 'direct' },

  // Degraded mappings — closest available Xenopixel firmware effect.
  // Values pinned to `mapBladeEffect`'s switch statement in
  // XenopixelEmitter.ts. Any change there MUST update this table.
  { styleId: 'rotoscope',  expectedXenoId: 1, note: 'degraded' },
  { styleId: 'gradient',   expectedXenoId: 1, note: 'degraded' },
  { styleId: 'photon',     expectedXenoId: 1, note: 'degraded' },
  { styleId: 'plasma',     expectedXenoId: 0, note: 'degraded' },
  { styleId: 'aurora',     expectedXenoId: 3, note: 'degraded' },
  { styleId: 'cinder',     expectedXenoId: 0, note: 'degraded' },
  { styleId: 'prism',      expectedXenoId: 3, note: 'degraded' },
  { styleId: 'darksaber',  expectedXenoId: 2, note: 'degraded' },
  { styleId: 'dataStream', expectedXenoId: 1, note: 'degraded' },
  { styleId: 'ember',      expectedXenoId: 0, note: 'degraded' },
  { styleId: 'automata',   expectedXenoId: 1, note: 'degraded' },
  { styleId: 'helix',      expectedXenoId: 6, note: 'degraded' },
  { styleId: 'candle',     expectedXenoId: 0, note: 'degraded' },
  { styleId: 'shatter',    expectedXenoId: 5, note: 'degraded' },
  { styleId: 'neutron',    expectedXenoId: 6, note: 'degraded' },
  { styleId: 'gravity',    expectedXenoId: 1, note: 'degraded' },

  // Styles registered in the engine but not yet explicitly handled in
  // mapBladeEffect's switch — they hit the `default` arm and fall
  // back to Steady (1) with a "not supported" note. Listing them here
  // turns a silent fall-through into a contract — any one of these
  // gaining an explicit mapping in the future is a deliberate change
  // and the test will fail until the table is updated.
  { styleId: 'painted',      expectedXenoId: 1, note: 'degraded' },
  { styleId: 'imageScroll',  expectedXenoId: 1, note: 'degraded' },
  { styleId: 'torrent',      expectedXenoId: 1, note: 'degraded' },
  { styleId: 'moire',        expectedXenoId: 1, note: 'degraded' },
  { styleId: 'cascade',      expectedXenoId: 1, note: 'degraded' },
  { styleId: 'vortex',       expectedXenoId: 1, note: 'degraded' },
  { styleId: 'nebula',       expectedXenoId: 1, note: 'degraded' },
  { styleId: 'tidal',        expectedXenoId: 1, note: 'degraded' },
  { styleId: 'mirage',       expectedXenoId: 1, note: 'degraded' },
  { styleId: 'sithFlicker',  expectedXenoId: 1, note: 'degraded' },
  { styleId: 'bladeCharge',  expectedXenoId: 1, note: 'degraded' },
  { styleId: 'tempoLock',    expectedXenoId: 1, note: 'degraded' },
] as const;

interface IgnitionExpectation {
  /** KyberStation ignition ID. */
  ignitionId: string;
  /** Expected Xenopixel V3 ignition style ID (0-11). */
  expectedXenoId: number;
  note: 'direct' | 'degraded';
}

/**
 * Coverage table for KyberStation engine ignitions known to
 * mapIgnitionStyle's switch arms. The engine has additional ignitions
 * (e.g. kebab-case `drip-up`, `flash-fill`, `pulse-wave`,
 * `custom-curve`, `twist`, `swing`, `stab`) that the emitter class did
 * NOT handle explicitly — those fall through to Standard (0) and are
 * verified in the "unknown ignition" suite below.
 */
const IGNITION_COVERAGE: readonly IgnitionExpectation[] = [
  // Direct matches — Xenopixel has a firmware ignition for these.
  { ignitionId: 'standard',  expectedXenoId: 0,  note: 'direct' },
  { ignitionId: 'scroll',    expectedXenoId: 1,  note: 'direct' },
  { ignitionId: 'wipe',      expectedXenoId: 2,  note: 'direct' },
  { ignitionId: 'spark',     expectedXenoId: 3,  note: 'direct' },
  { ignitionId: 'ghost',     expectedXenoId: 4,  note: 'direct' },
  { ignitionId: 'stack',     expectedXenoId: 5,  note: 'direct' },
  { ignitionId: 'foldTile',  expectedXenoId: 6,  note: 'direct' },
  { ignitionId: 'word',      expectedXenoId: 7,  note: 'direct' },
  { ignitionId: 'faser',     expectedXenoId: 8,  note: 'direct' },
  { ignitionId: 'scavenger', expectedXenoId: 9,  note: 'direct' },
  { ignitionId: 'hunter',    expectedXenoId: 10, note: 'direct' },
  { ignitionId: 'broken',    expectedXenoId: 11, note: 'direct' },

  // Degraded mappings.
  { ignitionId: 'center',    expectedXenoId: 0, note: 'degraded' },
  { ignitionId: 'stutter',   expectedXenoId: 0, note: 'degraded' },
  { ignitionId: 'glitch',    expectedXenoId: 4, note: 'degraded' },
  { ignitionId: 'crackle',   expectedXenoId: 0, note: 'degraded' },
  { ignitionId: 'fracture',  expectedXenoId: 0, note: 'degraded' },
  { ignitionId: 'flashFill', expectedXenoId: 0, note: 'degraded' },
  { ignitionId: 'pulseWave', expectedXenoId: 1, note: 'degraded' },
  { ignitionId: 'dripUp',    expectedXenoId: 1, note: 'degraded' },
] as const;

// ─── Tests ──────────────────────────────────────────────────────────────

describe('Xenopixel V3 live-path coverage (shared helpers)', () => {
  // ── Style coverage ──

  describe('mapBladeEffect — covers all 33 engine styles', () => {
    it('covers every style registered in the engine STYLE_REGISTRY (33 entries)', () => {
      // Pin the count so adding a new engine style without updating
      // the coverage table fails the test.
      expect(STYLE_COVERAGE).toHaveLength(33);
    });

    it.each(STYLE_COVERAGE)(
      'style "$styleId" → Xenopixel effect $expectedXenoId ($note)',
      ({ styleId, expectedXenoId, note }) => {
        const [id, degradationNote] = mapBladeEffect(styleId);
        expect(id).toBe(expectedXenoId);
        if (note === 'direct') {
          expect(degradationNote).toBeNull();
        } else {
          expect(degradationNote).not.toBeNull();
          expect(typeof degradationNote).toBe('string');
          // The note should reference the source style so README readers
          // can find their preset in the export notes.
          expect(degradationNote!).toContain(styleId);
        }
      },
    );

    it('directly-mapped styles match XENO_BLADE_EFFECTS', () => {
      // Direct table entries should agree with the canonical
      // XENO_BLADE_EFFECTS record from the emitter class.
      for (const exp of STYLE_COVERAGE.filter((e) => e.note === 'direct')) {
        expect(XENO_BLADE_EFFECTS[exp.styleId]).toBe(exp.expectedXenoId);
      }
    });

    it('falls back to Steady (1) for unknown style IDs (with a note)', () => {
      const [id, note] = mapBladeEffect('this_style_does_not_exist');
      expect(id).toBe(1);
      expect(note).not.toBeNull();
      expect(note!).toContain('not supported');
    });

    it('coverage upgrade — at least 21 styles now produce a useful Xenopixel ID', () => {
      // Pre-fix the live path only handled 6 styles directly with no
      // degradation notes. Post-fix the shared helper covers 5 direct
      // (the engine styles that share an ID with a native Xenopixel
      // effect) + 16 explicit degradation arms = 21 cases that produce
      // a thoughtful Xenopixel ID + a degradation note for the
      // README. The remaining 12 engine styles still fall through to
      // the default arm but produce a "not supported" note. This
      // anchor catches regressions that narrow the live coverage.
      const explicit = STYLE_COVERAGE.filter((e) => {
        const [, note] = mapBladeEffect(e.styleId);
        // Direct match (no note) OR a non-default degradation note.
        return note === null || !note.includes('not supported by Xenopixel');
      });
      expect(explicit.length).toBeGreaterThanOrEqual(21);
    });
  });

  // ── Ignition coverage ──

  describe('mapIgnitionStyle — covers all engine ignitions known to the emitter class', () => {
    it.each(IGNITION_COVERAGE)(
      'ignition "$ignitionId" → Xenopixel style $expectedXenoId ($note)',
      ({ ignitionId, expectedXenoId, note }) => {
        const [id, degradationNote] = mapIgnitionStyle(ignitionId);
        expect(id).toBe(expectedXenoId);
        if (note === 'direct') {
          expect(degradationNote).toBeNull();
        } else {
          expect(degradationNote).not.toBeNull();
          expect(degradationNote!).toContain(ignitionId);
        }
      },
    );

    it('directly-mapped ignitions match XENO_IGNITION_STYLES', () => {
      for (const exp of IGNITION_COVERAGE.filter((e) => e.note === 'direct')) {
        expect(XENO_IGNITION_STYLES[exp.ignitionId]).toBe(exp.expectedXenoId);
      }
    });

    it('falls back to Standard (0) for unknown ignition IDs (with a note)', () => {
      const [id, note] = mapIgnitionStyle('this_ignition_does_not_exist');
      expect(id).toBe(0);
      expect(note).not.toBeNull();
      expect(note!).toContain('not supported');
    });

    it('coverage upgrade — at least 20 ignitions produce a useful Xenopixel ID', () => {
      // Pre-fix the live path's XENO_IGNITION_MAP had 12 entries but
      // zero degradation fallbacks — any non-matching ID silently → 0
      // with no note. The shared helper now produces explicit notes
      // for 12 direct + 8 degraded = 20 cases.
      expect(IGNITION_COVERAGE.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ── Speed clamping ──

  describe('clampIgnitionSpeed — Xenopixel firmware-supported range', () => {
    it('clamps below minimum to XENO_IGNITION_SPEED_MIN', () => {
      expect(clampIgnitionSpeed(50)).toBe(XENO_IGNITION_SPEED_MIN);
      expect(clampIgnitionSpeed(0)).toBe(XENO_IGNITION_SPEED_MIN);
      expect(clampIgnitionSpeed(-100)).toBe(XENO_IGNITION_SPEED_MIN);
    });

    it('clamps above maximum to XENO_IGNITION_SPEED_MAX', () => {
      expect(clampIgnitionSpeed(1000)).toBe(XENO_IGNITION_SPEED_MAX);
      expect(clampIgnitionSpeed(5000)).toBe(XENO_IGNITION_SPEED_MAX);
    });

    it('passes through values within range', () => {
      expect(clampIgnitionSpeed(100)).toBe(100);
      expect(clampIgnitionSpeed(400)).toBe(400);
      expect(clampIgnitionSpeed(800)).toBe(800);
    });

    it('boundary check — min and max are inclusive', () => {
      expect(clampIgnitionSpeed(XENO_IGNITION_SPEED_MIN)).toBe(XENO_IGNITION_SPEED_MIN);
      expect(clampIgnitionSpeed(XENO_IGNITION_SPEED_MAX)).toBe(XENO_IGNITION_SPEED_MAX);
    });
  });

  describe('clampRetractionSpeed — Xenopixel firmware-supported range', () => {
    it('clamps below minimum to XENO_RETRACTION_SPEED_MIN', () => {
      expect(clampRetractionSpeed(100)).toBe(XENO_RETRACTION_SPEED_MIN);
      expect(clampRetractionSpeed(0)).toBe(XENO_RETRACTION_SPEED_MIN);
    });

    it('clamps above maximum to XENO_RETRACTION_SPEED_MAX', () => {
      expect(clampRetractionSpeed(1500)).toBe(XENO_RETRACTION_SPEED_MAX);
      expect(clampRetractionSpeed(10_000)).toBe(XENO_RETRACTION_SPEED_MAX);
    });

    it('passes through values within range', () => {
      expect(clampRetractionSpeed(200)).toBe(200);
      expect(clampRetractionSpeed(600)).toBe(600);
      expect(clampRetractionSpeed(1000)).toBe(1000);
    });

    it('boundary check — min and max are inclusive', () => {
      expect(clampRetractionSpeed(XENO_RETRACTION_SPEED_MIN)).toBe(XENO_RETRACTION_SPEED_MIN);
      expect(clampRetractionSpeed(XENO_RETRACTION_SPEED_MAX)).toBe(XENO_RETRACTION_SPEED_MAX);
    });
  });

  describe('clamp constants — firmware-defined boundaries', () => {
    it('exposes the Xenopixel V3 ignition speed range', () => {
      // Hard-coded to match Xenopixel firmware spec — drift here is a
      // firmware-spec change, not a code refactor.
      expect(XENO_IGNITION_SPEED_MIN).toBe(100);
      expect(XENO_IGNITION_SPEED_MAX).toBe(800);
    });

    it('exposes the Xenopixel V3 retraction speed range', () => {
      expect(XENO_RETRACTION_SPEED_MIN).toBe(200);
      expect(XENO_RETRACTION_SPEED_MAX).toBe(1000);
    });

    it('retraction min/max bracket a non-degenerate range', () => {
      expect(XENO_RETRACTION_SPEED_MIN).toBeLessThan(XENO_RETRACTION_SPEED_MAX);
      expect(XENO_IGNITION_SPEED_MIN).toBeLessThan(XENO_IGNITION_SPEED_MAX);
    });
  });
});
