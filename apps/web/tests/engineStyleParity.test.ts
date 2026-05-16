// ─── Engine-style ↔ Codegen-handler parity check ───
//
// Auto-discovers engine style IDs (from `packages/engine/src/styles/`)
// and codegen-handled style IDs (from `packages/codegen/src/ASTBuilder.ts`'s
// `buildBaseStyle` switch cases), then asserts both lists in
// `apps/web/lib/engineOnlyStyles.ts` match what the source actually
// declares.
//
// Closes a regression vector identified in
// `docs/research/CODEGEN_CORRECTNESS_AUDIT_2026-05-15.md` Finding 3:
// when someone adds a new engine style without an `ASTBuilder` case,
// codegen silently falls back to `stable` and the user sees a frozen
// blue blade on hardware instead of their animated canvas style. This
// test catches that drift at CI time, well before a user discovers it.
//
// When the test fails it's signalling one of three intentional
// follow-ups:
//   1. A new engine style needs a codegen case added (best fix).
//   2. A new engine style is genuinely preview-only — update
//      `ENGINE_ONLY_STYLE_IDS` in `lib/engineOnlyStyles.ts` so the
//      export-time warning lists it.
//   3. A codegen case was removed — update
//      `CODEGEN_SUPPORTED_STYLE_IDS`.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENGINE_ONLY_STYLE_IDS,
  CODEGEN_SUPPORTED_STYLE_IDS,
} from '@/lib/engineOnlyStyles';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE_STYLES_DIR = resolve(HERE, '../../../packages/engine/src/styles');
const ASTBUILDER_PATH = resolve(
  HERE,
  '../../../packages/codegen/src/ASTBuilder.ts',
);

/**
 * Read each `*Style.ts` file in the engine styles directory and extract
 * its `id` property value. Returns the alphabetically-sorted set of
 * engine style IDs.
 *
 * Excludes `BaseStyle.ts` (abstract base class with no concrete id),
 * `index.ts` (barrel), and the `xenopixel/` subdirectory (different
 * board family — separately profiled).
 */
function discoverEngineStyleIds(): string[] {
  const entries = readdirSync(ENGINE_STYLES_DIR, { withFileTypes: true });
  const styleFiles = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('Style.ts') &&
        e.name !== 'BaseStyle.ts',
    )
    .map((e) => e.name);

  const ids: string[] = [];
  for (const file of styleFiles) {
    const source = readFileSync(resolve(ENGINE_STYLES_DIR, file), 'utf-8');
    // Match `readonly id = 'foo';` or `id = 'foo';` or `public id: string = 'foo';` etc.
    const match = source.match(
      /(?:public\s+|private\s+|protected\s+)?(?:readonly\s+|static\s+)*id\s*(?::\s*string)?\s*=\s*['"]([\w-]+)['"]/,
    );
    if (!match) {
      throw new Error(
        `engine style ${file} has no parseable \`id = '...'\` declaration — ` +
          'the parity test cannot enumerate it. Either declare the id in the ' +
          'expected format or extend the regex.',
      );
    }
    ids.push(match[1]!);
  }
  return ids.sort();
}

/**
 * Extract the style IDs `ASTBuilder.buildBaseStyle()` handles by
 * parsing the switch cases. Returns the alphabetically-sorted set of
 * codegen-supported style IDs (de-duplicated, since a single case
 * may appear with `{` block or fall-through).
 *
 * Scope is limited to the `buildBaseStyle` function body (we stop at
 * the next `function` declaration) so unrelated `case '...'` labels
 * elsewhere in the file don't pollute the result.
 */
function discoverCodegenHandledStyleIds(): string[] {
  const source = readFileSync(ASTBUILDER_PATH, 'utf-8');
  const fnStartMarker = 'function buildBaseStyle';
  const fnStart = source.indexOf(fnStartMarker);
  if (fnStart === -1) {
    throw new Error(
      `cannot find \`${fnStartMarker}\` in ASTBuilder.ts — has the function ` +
        'been renamed? Update the marker in this test.',
    );
  }
  // Walk to the next top-level `function ` declaration (or end of file).
  const fnEnd = source.indexOf('\nfunction ', fnStart + fnStartMarker.length);
  const fnBody = source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
  const matches = Array.from(fnBody.matchAll(/case\s+['"]([\w-]+)['"]/g)).map(
    (m) => m[1]!,
  );
  return Array.from(new Set(matches)).sort();
}

describe('engine-style ↔ codegen-handler parity (audit Finding 3 regression guard)', () => {
  const engineIds = discoverEngineStyleIds();
  const codegenIds = discoverCodegenHandledStyleIds();
  const computedEngineOnly = engineIds.filter((id) => !codegenIds.includes(id)).sort();

  it('discovers a non-empty engine style set + codegen set (sanity)', () => {
    expect(engineIds.length).toBeGreaterThan(0);
    expect(codegenIds.length).toBeGreaterThan(0);
  });

  it('every codegen-handled style id is also an engine style id', () => {
    // If codegen has a `case 'foo':` but the engine has no `FooStyle.ts`,
    // either the engine style was deleted (codegen case is dead) or the
    // case is for a style that lives elsewhere (xenopixel?). Either way,
    // worth flagging.
    const orphanCodegen = codegenIds.filter((id) => !engineIds.includes(id));
    expect(orphanCodegen, 'codegen handles ids the engine no longer ships').toEqual([]);
  });

  it('CODEGEN_SUPPORTED_STYLE_IDS matches the live ASTBuilder switch', () => {
    expect(new Set(CODEGEN_SUPPORTED_STYLE_IDS)).toEqual(new Set(codegenIds));
  });

  it('ENGINE_ONLY_STYLE_IDS matches (engine - codegen) diff', () => {
    expect(new Set(ENGINE_ONLY_STYLE_IDS)).toEqual(new Set(computedEngineOnly));
  });

  it('regression sentinel: 33 engine styles / 32 codegen-supported / 1 engine-only', () => {
    // Pinned counts as of the 2026-05-15 parity push that added codegen
    // handlers for helix, candle, ember, dataStream, shatter, neutron,
    // cascade, gravity, moire, torrent, vortex, tidal, mirage, nebula
    // (lifting codegen coverage from 18 → 32 of 33). Only `automata`
    // (Rule 30 cellular automaton) remains engine-only because it has
    // no honest ProffieOS template approximation.
    expect(engineIds.length).toBe(33);
    expect(codegenIds.length).toBe(32);
    expect(computedEngineOnly.length).toBe(1);
  });
});
