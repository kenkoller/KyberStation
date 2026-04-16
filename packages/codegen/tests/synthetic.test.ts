// ─── Synthetic Fixture Round-Trip (Phase 6) ───
//
// Iterates every preset in `@kyberstation/presets` and asserts the
// Config → AST → Code → AST → Config round-trip is lossless on the
// committed-coverage field set. This is the "safety net across the whole
// library" that catches regressions which per-style unit tests miss.
//
// As a side effect, when the env var `KYBERSTATION_WRITE_FIXTURES=1` is
// set, each preset's emitted `.cpp` and its source `.json` are written to
// `tests/fixtures/synthetic/`. That's the "fixture regeneration" Phase 6
// documented — you regenerate by running:
//
//   KYBERSTATION_WRITE_FIXTURES=1 pnpm --filter @kyberstation/codegen test
//
// Committed fixtures exist mainly to document expected output for code
// review; the round-trip test itself doesn't depend on them.

import { describe, it, expect } from 'vitest';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { BladeConfig } from '../src/index.js';
import { roundTrip } from './helpers/roundTrip.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(thisDir, 'fixtures', 'synthetic');

const SHOULD_WRITE = process.env.KYBERSTATION_WRITE_FIXTURES === '1';

// Round-trip coverage committed for the WYSIWYG sprint. These are the
// fields guaranteed to survive Config → AST → Code → AST → Config for
// every preset whose `style` is in the canonical detectable set below.
const COMMITTED_ROUND_TRIP_FIELDS = [
  'baseColor',
  'blastColor',
  'clashColor',
  'lockupColor',
] as const;

// ms fields need a ±5ms tolerance because stutter/glitch split ms into
// thirds/quarters and the simple inverse (first-part * 3) doesn't always
// recover the exact original. The glitch split specifically covers only
// 7/8 of the requested ms by design.
const MS_TOLERANCE = 5;

// Fields that round-trip losslessly, but only when the preset's value is
// within the subset we support today. Presets with out-of-scope values
// (tracked as deferred follow-up work) are filtered from the assertion so
// CI stays green without hiding real regressions.
const CONDITIONAL_FIELDS = {
  // Ignition IDs that round-trip *to their canonical ID*. Some IDs emit
  // code that's shared with another ID (stab shares with center, crackle
  // with swing, etc.) — those get `preferForInverse: false` in
  // transitionMap.ts so the inverse picks the canonical. We omit those
  // shared-shape IDs from this set; their round-trip is lossy by design.
  ignition: new Set([
    'standard',
    'scroll',
    'spark',
    'center',
    'stutter',
    'glitch',
    'flash-fill',
    'swing',
    'pulse-wave',
  ]),
  retraction: new Set([
    'standard',
    'scroll',
    'fadeout',
    'center',
    'flickerOut',
    'spaghettify',
  ]),
  // Styles the heuristic detectStyle recognises reliably after the v0.2.1
  // disambiguation work. The engine has ~29 style implementations;
  // `aurora` vs `prism` and `gradient` vs `painted` vs `imageScroll`
  // collide at the AST level and resolve to the canonical sibling.
  style: new Set([
    'stable',
    'fire',
    'unstable',
    'plasma',
    'pulse',
    'gradient',
    'photon',
    'crystalShatter',
    'rotoscope',
    'cinder',
  ]),
} as const;

/**
 * Presets whose style is NOT in the detectable set don't round-trip
 * reliably on colour fields either — their emitted code has the base
 * colour nested in a structure our colour-resolver can't reach.
 * Skip these in the committed-fields assertion.
 */
function isStyleCoveredByRoundTrip(style: string): boolean {
  return CONDITIONAL_FIELDS.style.has(style as never);
}

// Additional field coverage — only asserted when the preset explicitly sets
// the field (defaults don't round-trip because the reconstructor can't tell
// "user unset" from "user matched the default").
const OPTIONAL_FIELDS = [
  'dragColor',
  'lightningColor',
  'meltColor',
] as const;

/** Format a preset's config as a stable JSON string for fixture comparison. */
function stableJson(config: BladeConfig): string {
  // Sort keys recursively for deterministic output.
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(config), null, 2) + '\n';
}

describe('synthetic fixtures — full preset round-trip', () => {
  if (SHOULD_WRITE && !existsSync(FIXTURE_DIR)) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  for (const preset of ALL_PRESETS) {
    describe(`${preset.id} (${preset.character})`, () => {
      const config = preset.config as BladeConfig;
      const result = roundTrip(config);

      it('parses without errors', () => {
        expect(result.parseErrors).toEqual([]);
      });

      it('round-trips all committed fields', () => {
        const reconstructed = result.reconstructedConfig;
        expect(reconstructed).not.toBeNull();
        // Colour fields are only asserted for styles whose emission
        // pattern is simple enough for findBaseColor / container
        // resolution to cover. Deferred-scope styles silently skip here.
        if (!isStyleCoveredByRoundTrip(config.style)) return;
        for (const field of COMMITTED_ROUND_TRIP_FIELDS) {
          const expected = (config as Record<string, unknown>)[field];
          if (expected === undefined) continue;
          const actual = (
            reconstructed as unknown as Record<string, unknown>
          )[field];
          expect(
            actual,
            `${preset.id}.${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          ).toEqual(expected);
        }
      });

      it('round-trips ms values within tolerance', () => {
        const reconstructed = result.reconstructedConfig;
        for (const field of ['ignitionMs', 'retractionMs'] as const) {
          const expected = config[field];
          if (expected === undefined) continue;
          const actual = reconstructed?.[field];
          expect(actual).toBeDefined();
          expect(
            Math.abs((actual ?? 0) - expected),
            `${preset.id}.${field}: expected ~${expected}, got ${actual}`,
          ).toBeLessThanOrEqual(MS_TOLERANCE);
        }
      });

      it('round-trips conditional fields when preset value is in supported set', () => {
        const reconstructed = result.reconstructedConfig;
        for (const [field, supportedSet] of Object.entries(
          CONDITIONAL_FIELDS,
        )) {
          const expected = (config as Record<string, unknown>)[field];
          if (typeof expected !== 'string') continue;
          if (!supportedSet.has(expected as never)) continue; // deferred scope
          const actual = (
            reconstructed as unknown as Record<string, unknown>
          )[field];
          expect(
            actual,
            `${preset.id}.${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          ).toEqual(expected);
        }
      });

      it('round-trips optional fields when present', () => {
        const reconstructed = result.reconstructedConfig;
        for (const field of OPTIONAL_FIELDS) {
          const expected = (config as Record<string, unknown>)[field];
          if (expected === undefined) continue;
          const actual = (
            reconstructed as unknown as Record<string, unknown>
          )[field];
          expect(
            actual,
            `${preset.id}.${field} was set in source but did not round-trip`,
          ).toEqual(expected);
        }
      });

      if (SHOULD_WRITE) {
        it('writes fixture files', () => {
          const safeId = preset.id.replace(/[^a-z0-9-]/gi, '_');
          writeFileSync(
            join(FIXTURE_DIR, `${safeId}.cpp`),
            result.emittedCode + '\n',
            'utf-8',
          );
          writeFileSync(
            join(FIXTURE_DIR, `${safeId}.json`),
            stableJson(config),
            'utf-8',
          );
        });
      }
    });
  }
});

describe('synthetic fixtures — lockup position permutations', () => {
  // For a small sample of presets, cover lockupPosition values so the
  // Phase 3 ResponsiveLockupL emission path gets hit across several styles.
  const SAMPLE_PRESETS = ALL_PRESETS.slice(0, 4);
  const LOCKUP_POSITIONS = [0.25, 0.5, 0.8] as const;
  const TOLERANCE = 2 / 32768;

  for (const preset of SAMPLE_PRESETS) {
    for (const pos of LOCKUP_POSITIONS) {
      it(`${preset.id} round-trips lockupPosition=${pos}`, () => {
        const config: BladeConfig = {
          ...(preset.config as BladeConfig),
          lockupPosition: pos,
        };
        const result = roundTrip(config);
        expect(result.parseErrors).toEqual([]);
        expect(result.emittedCode).toContain('ResponsiveLockupL');
        const recovered = result.reconstructedConfig?.lockupPosition;
        expect(recovered).toBeDefined();
        expect(Math.abs((recovered ?? 0) - pos)).toBeLessThanOrEqual(
          TOLERANCE,
        );
      });
    }
  }
});
