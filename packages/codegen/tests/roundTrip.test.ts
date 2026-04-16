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

  describe('Phase 2 field set (currently broken — unskip when transitionMap lands)', () => {
    it.todo('preserves ignition ID through round-trip');
    it.todo('preserves retraction ID through round-trip');
    it.todo('preserves ignitionMs through round-trip');
    it.todo('preserves retractionMs through round-trip');
    it.todo(
      'preserves clash/lockup/drag/lightning/melt colors via container resolution',
    );
  });

  describe('Phase 3 field set (requires ResponsiveLockupL emission)', () => {
    it.todo('preserves lockupPosition through round-trip (±1/32768)');
    it.todo('preserves lockupRadius through round-trip (±1/32768)');
  });

  describe('diagnostic inspection (documents current lossy surface)', () => {
    it('documents which ignition-related fields are broken today', () => {
      // Use a non-default ignition so the reconstructed default value
      // cannot accidentally mask the bug. `scroll` is known-mismapped:
      // forward emits TrWipe, reverse reads TrWipe → 'standard'.
      const config = makeConfig({
        ignition: 'scroll',
        retraction: 'scroll',
        ignitionMs: 500,
        retractionMs: 900,
      });
      const result = roundTrip(config);
      expect(result.parseErrors).toEqual([]);

      // At least one of the Phase-2 fields must still be broken; otherwise
      // the harness is silently hiding a regression, or Phase 2 has secretly
      // landed and the tests above should be unskipped.
      const brokenFields = new Set<string>([
        ...result.mismatchedFields.map((m) => m.field),
        ...result.missingFields,
      ]);
      const phase2Broken = [
        'ignition',
        'retraction',
        'ignitionMs',
        'retractionMs',
      ].some((f) => brokenFields.has(f));
      expect(
        phase2Broken,
        'Expected Phase 2 fields to still be broken pre-transitionMap. ' +
          'If you fixed one, unskip the matching it.todo() in the Phase 2 block above.',
      ).toBe(true);
    });
  });
});
