// ─── Round-Trip Test Harness ───
// Exercises the full pipeline: Config → AST → Code → AST → Config.
// Returns rich diagnostics so tests can assert on specific field subsets as
// later phases of the WYSIWYG + spatial-lockup sprint widen what round-trips.

import {
  buildAST,
  emitCode,
  parseStyleCode,
  reconstructConfig,
} from '../../src/index.js';
import type {
  BladeConfig,
  ReconstructedConfig,
  StyleNode,
  ParseError,
} from '../../src/index.js';

export interface RoundTripResult {
  originalConfig: BladeConfig;
  forwardAST: StyleNode;
  emittedCode: string;
  parsedAST: StyleNode | null;
  parseErrors: ParseError[];
  reconstructedConfig: ReconstructedConfig | null;
  /** Field names the reconstructor couldn't recover at all. */
  missingFields: string[];
  /** Field values that came back but don't match the source. */
  mismatchedFields: Array<{
    field: string;
    expected: unknown;
    actual: unknown;
  }>;
}

/**
 * Fields that round-trip losslessly TODAY (Phase 0 baseline).
 *
 * Starts narrow. Phase 2 widens this set after two reconstructor fixes land:
 *   1. Container-based color resolution (clash/lockup/drag/melt by parent node).
 *   2. Canonical transitionMap (inverted forward/reverse mapping + the
 *      `inOut.args.length >= 3` guard, which blocks ms extraction today because
 *      InOutTrL is emitted with exactly 2 args).
 * Phase 3 adds lockupPosition / lockupRadius.
 */
export const RT_PHASE0_FIELDS = [
  'baseColor',
  'style',
] as const satisfies readonly (keyof BladeConfig)[];

/** Known-broken until Phase 2 transitionMap + reconstructor fixes land. */
export const RT_PHASE2_FIELDS = [
  'ignition',
  'retraction',
  'ignitionMs',
  'retractionMs',
  'blastColor',
  'clashColor',
  'lockupColor',
  'dragColor',
  'lightningColor',
  'meltColor',
] as const satisfies readonly (keyof BladeConfig)[];

/** Known-broken until Phase 3 spatial lockup emission lands. */
export const RT_PHASE3_FIELDS = [
  'lockupPosition',
  'lockupRadius',
] as const satisfies readonly (keyof BladeConfig)[];

/** Deep-equal for plain objects / primitives / RGB records. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Run one full round trip and return diagnostics.
 *
 * This function never throws for expected error paths — parse errors and
 * missing reconstruction fields are reported as data.
 */
export function roundTrip(config: BladeConfig): RoundTripResult {
  const forwardAST = buildAST(config);
  const emittedCode = emitCode(forwardAST);
  const parseResult = parseStyleCode(emittedCode);

  if (!parseResult.ast) {
    return {
      originalConfig: config,
      forwardAST,
      emittedCode,
      parsedAST: null,
      parseErrors: parseResult.errors,
      reconstructedConfig: null,
      missingFields: ['<parse failed — cannot reconstruct>'],
      mismatchedFields: [],
    };
  }

  const reconstructed = reconstructConfig(parseResult.ast);

  const missingFields: string[] = [];
  const mismatchedFields: Array<{
    field: string;
    expected: unknown;
    actual: unknown;
  }> = [];

  for (const field of Object.keys(config) as (keyof BladeConfig)[]) {
    const expected = (config as Record<string, unknown>)[field as string];
    if (expected === undefined) continue;
    const actual = (reconstructed as unknown as Record<string, unknown>)[
      field as string
    ];
    if (actual === undefined) {
      missingFields.push(field as string);
    } else if (!deepEqual(actual, expected)) {
      mismatchedFields.push({ field: field as string, expected, actual });
    }
  }

  return {
    originalConfig: config,
    forwardAST,
    emittedCode,
    parsedAST: parseResult.ast,
    parseErrors: parseResult.errors,
    reconstructedConfig: reconstructed,
    missingFields,
    mismatchedFields,
  };
}

/** Assert that every given field round-trips losslessly; throws on first mismatch. */
export function assertFieldsRoundTrip(
  result: RoundTripResult,
  fields: readonly (keyof BladeConfig)[],
): void {
  const problems: string[] = [];
  for (const field of fields) {
    const miss = result.missingFields.find((f) => f === field);
    if (miss) {
      problems.push(`  - ${field}: MISSING from reconstruction`);
      continue;
    }
    const mismatch = result.mismatchedFields.find((m) => m.field === field);
    if (mismatch) {
      problems.push(
        `  - ${field}: expected ${JSON.stringify(
          mismatch.expected,
        )}, got ${JSON.stringify(mismatch.actual)}`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Round-trip failed for fields:\n${problems.join('\n')}\n\nEmitted code:\n${result.emittedCode}`,
    );
  }
}
