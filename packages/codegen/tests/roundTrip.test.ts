// ─── Round-Trip Tests ───
// Asserts that Config → AST → Code → AST → Config preserves the fields
// we commit to supporting. Scope widens phase-by-phase as the sprint lands.

import { describe, it, expect } from 'vitest';
import {
  roundTrip,
  assertFieldsRoundTrip,
  RT_PHASE0_FIELDS,
  RT_PHASE2_FIELDS,
  RT_PHASE3_FIELDS,
} from './helpers/roundTrip.js';
import type { BladeConfig } from '../src/index.js';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 0 },
    blastColor: { r: 255, g: 0, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 400,
    shimmer: 0,
    ledCount: 144,
    ...overrides,
  };
}

describe('round-trip: Config → AST → Code → AST → Config', () => {
  describe('Phase 0 field set (must pass today)', () => {
    it('preserves core fields for a stable blue blade', () => {
      const config = makeConfig();
      const result = roundTrip(config);
      expect(result.parseErrors).toEqual([]);
      assertFieldsRoundTrip(result, RT_PHASE0_FIELDS);
    });

    it('preserves core fields for a fire style', () => {
      const config = makeConfig({ style: 'fire' });
      const result = roundTrip(config);
      expect(result.parseErrors).toEqual([]);
      assertFieldsRoundTrip(result, RT_PHASE0_FIELDS);
      // `style: 'fire'` currently reconstructs from AudioFlicker detection —
      // asserting style separately so the diagnostic is clear if detection
      // regresses.
      expect(result.reconstructedConfig?.style).toBeDefined();
    });

    it('emits parseable code for every style the ASTBuilder supports', () => {
      // Non-exhaustive — checks that the forward→parse loop at least tokenizes.
      // Full style-by-style reconstruction is deferred to Phase 2.
      for (const style of ['stable', 'unstable', 'fire', 'pulse', 'gradient']) {
        const result = roundTrip(makeConfig({ style }));
        expect(
          result.parseErrors,
          `style=${style} produced parse errors: ${JSON.stringify(result.parseErrors)}`,
        ).toEqual([]);
      }
    });
  });

  describe('Phase 2 field set', () => {
    it('preserves ignition ID through round-trip', () => {
      for (const id of ['standard', 'scroll', 'spark', 'center', 'stutter', 'glitch']) {
        const config = makeConfig({ ignition: id });
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        expect(
          result.reconstructedConfig?.ignition,
          `ignition=${id} round-tripped as ${result.reconstructedConfig?.ignition}`,
        ).toBe(id);
      }
    });

    it('preserves retraction ID through round-trip', () => {
      for (const id of ['standard', 'scroll', 'fadeout', 'center']) {
        const config = makeConfig({ retraction: id });
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        expect(
          result.reconstructedConfig?.retraction,
          `retraction=${id} round-tripped as ${result.reconstructedConfig?.retraction}`,
        ).toBe(id);
      }
    });

    it('preserves ignitionMs and retractionMs through a sweep', () => {
      for (const ms of [50, 100, 1000, 5000]) {
        const config = makeConfig({ ignitionMs: ms, retractionMs: ms });
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        expect(result.reconstructedConfig?.ignitionMs).toBe(ms);
        expect(result.reconstructedConfig?.retractionMs).toBe(ms);
      }
    });

    it('recovers clash / lockup / drag / lightning / melt colors by container', () => {
      const config = makeConfig({
        clashColor: { r: 10, g: 20, b: 30 },
        lockupColor: { r: 40, g: 50, b: 60 },
        dragColor: { r: 70, g: 80, b: 90 },
        lightningColor: { r: 100, g: 110, b: 120 },
        meltColor: { r: 130, g: 140, b: 150 },
        blastColor: { r: 200, g: 210, b: 220 },
      });
      const result = roundTrip(config);
      expect(result.parseErrors).toEqual([]);
      expect(result.reconstructedConfig?.clashColor).toEqual(config.clashColor);
      expect(result.reconstructedConfig?.lockupColor).toEqual(config.lockupColor);
      expect(result.reconstructedConfig?.dragColor).toEqual(config.dragColor);
      expect(result.reconstructedConfig?.lightningColor).toEqual(
        config.lightningColor,
      );
      expect(result.reconstructedConfig?.meltColor).toEqual(config.meltColor);
      expect(result.reconstructedConfig?.blastColor).toEqual(config.blastColor);
    });

    it('preserves all Phase 2 fields together for a representative config', () => {
      const config = makeConfig({
        style: 'fire',
        ignition: 'spark',
        retraction: 'fadeout',
        ignitionMs: 450,
        retractionMs: 650,
        clashColor: { r: 255, g: 200, b: 100 },
      });
      const result = roundTrip(config);
      expect(result.parseErrors).toEqual([]);
      assertFieldsRoundTrip(result, [
        ...RT_PHASE0_FIELDS,
        'ignition',
        'retraction',
        'ignitionMs',
        'retractionMs',
        'clashColor',
        'blastColor',
        'lockupColor',
      ]);
    });
  });

  describe('Phase 3 field set (ResponsiveLockupL emission)', () => {
    const TOLERANCE = 2 / 32768; // rounding noise from position→proffie→position

    it('preserves lockupPosition through round-trip', () => {
      for (const pos of [0, 0.25, 0.33, 0.5, 0.8, 1]) {
        const config = makeConfig({ lockupPosition: pos });
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        const recovered = result.reconstructedConfig?.lockupPosition;
        expect(
          recovered,
          `lockupPosition=${pos} did not recover: ${recovered}`,
        ).toBeDefined();
        expect(Math.abs((recovered ?? 0) - pos)).toBeLessThanOrEqual(TOLERANCE);
      }
    });

    it('preserves lockupRadius through round-trip', () => {
      for (const r of [0.05, 0.12, 0.3]) {
        const config = makeConfig({ lockupPosition: 0.5, lockupRadius: r });
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        const recovered = result.reconstructedConfig?.lockupRadius;
        expect(
          recovered,
          `lockupRadius=${r} did not recover: ${recovered}`,
        ).toBeDefined();
        expect(Math.abs((recovered ?? 0) - r)).toBeLessThanOrEqual(TOLERANCE);
      }
    });

    it('emits ResponsiveLockupL only when lockupPosition is set', () => {
      const without = roundTrip(makeConfig());
      expect(without.emittedCode).not.toContain('ResponsiveLockupL');
      expect(without.emittedCode).toContain('LockupTrL');

      const withSpatial = roundTrip(makeConfig({ lockupPosition: 0.5 }));
      expect(withSpatial.emittedCode).toContain('ResponsiveLockupL');
    });

    it('does not set lockupPosition when absent from emitted code', () => {
      const result = roundTrip(makeConfig());
      expect(result.reconstructedConfig?.lockupPosition).toBeUndefined();
      expect(result.reconstructedConfig?.lockupRadius).toBeUndefined();
    });
  });
});
