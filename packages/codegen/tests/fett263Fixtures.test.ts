// ─── Fett263 Fixture Smoke Tests (Phase 2C) ───
//
// Load every Fett263 OS6/OS7 import fixture from
// `apps/web/tests/fixtures/fett263-imports/` and parse it with
// `parseStyleCode`. Each fixture asserts a soft cap on
// "unknown-template" warnings to lock down the Phase 2C registry
// expansion against regression.
//
// Pre-Phase-2C the corpus produced ~30+ unknown-template warnings per
// real Fett263 OS7 fixture. After Phase 2C the inventory's top-60
// templates land in the registry, and most fixtures should drop below
// 10 warnings each. The remaining warnings are typically:
//  - rare/unusual templates (`AlphaMixL` variants, `WavLen`-adjacent
//    helpers we explicitly de-prioritised)
//  - `EFFECT_*` / `LOCKUP_*` enum tokens — these are filtered by the
//    parser's prefix check and DON'T count toward the warning total
//
// If a fixture suddenly exceeds the cap, somebody either:
//   (a) introduced a parser regression, or
//   (b) added a new fixture that exercises templates we still need to
//       register — in which case bump the cap or expand the registry
//       to match.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStyleCode } from '../src/parser/index.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(
  thisDir,
  '..',
  '..',
  '..',
  'apps',
  'web',
  'tests',
  'fixtures',
  'fett263-imports',
);

// Phase 0B's fixture corpus may not always be present (parallel sessions
// may not have committed it yet). When the directory is absent we skip
// the suite rather than fail — this keeps the test robust against
// cross-session timing.
const FIXTURES_AVAILABLE = existsSync(FIXTURE_DIR);

/**
 * Strip `// ...` and `/* ... *\/` comments before parsing, so the
 * fixture's documentation header doesn't bleed into the parser.
 * Returns a single-line string suitable for `parseStyleCode`.
 */
function stripCommentsAndHeader(raw: string): string {
  // Remove block comments first (handles multi-line)
  const noBlocks = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  // Then remove line comments
  const lines = noBlocks.split('\n').map((line) => {
    const idx = line.indexOf('//');
    return idx >= 0 ? line.slice(0, idx) : line;
  });
  return lines.join('\n').trim();
}

const describeIfFixtures = FIXTURES_AVAILABLE ? describe : describe.skip;

describeIfFixtures('Fett263 fixture parse — unknown-template warnings', () => {
  const fixtures = FIXTURES_AVAILABLE
    ? readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.txt')).sort()
    : [];

  // Sanity check: the directory should hold the corpus.
  it(`loads at least 20 fixtures from ${FIXTURE_DIR}`, () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  // Phase 2C ships zero unknown-template warnings across the corpus on
  // the day of merge (303 → 0). The cap stays at 5 to leave headroom
  // for the long tail (new fixtures, niche templates we haven't yet
  // registered) while still catching genuine regressions early.
  const PER_FIXTURE_WARNING_CAP = 5;

  for (const fixtureName of fixtures) {
    it(`${fixtureName}: parses with ≤ ${PER_FIXTURE_WARNING_CAP} unknown-template warnings`, () => {
      const fullPath = join(FIXTURE_DIR, fixtureName);
      const raw = readFileSync(fullPath, 'utf-8');
      const code = stripCommentsAndHeader(raw);

      const { ast, warnings } = parseStyleCode(code);

      // The parser is intentionally generous — unknown templates parse
      // through as generic nodes — so a non-null AST is the bar. A few
      // legacy fixtures contain C-preprocessor macro syntax (EASYBLADE
      // (BLUE, WHITE)) or unmatched angle brackets that hit lexer-level
      // errors; that's a pre-existing parser limitation, not Phase 2C
      // scope.
      expect(ast).not.toBeNull();

      // Filter to the warning subset that signals "registry coverage gap".
      const unknownTemplateWarnings = warnings.filter((w) =>
        w.message.startsWith('Unknown template'),
      );

      if (unknownTemplateWarnings.length > PER_FIXTURE_WARNING_CAP) {
        const names = Array.from(
          new Set(unknownTemplateWarnings.map((w) => w.template ?? '?')),
        ).sort();
        throw new Error(
          `${fixtureName} exceeded unknown-template warning cap (${unknownTemplateWarnings.length}/${PER_FIXTURE_WARNING_CAP}). ` +
            `Unique unknown templates: ${names.join(', ')}.`,
        );
      }

      expect(unknownTemplateWarnings.length).toBeLessThanOrEqual(
        PER_FIXTURE_WARNING_CAP,
      );
    });
  }
});

describeIfFixtures('Fett263 fixture parse — corpus-level warning budget', () => {
  // Aggregate cap across the whole corpus. Catches "1 warning per
  // fixture × 21 fixtures" creep that the per-fixture cap would miss.
  // Phase 2C ships at 0 corpus warnings; cap of 25 leaves headroom for
  // a few new fixtures or unknowns landing in a follow-up sprint.
  const TOTAL_WARNING_BUDGET = 25;

  it(`total unknown-template warnings across corpus ≤ ${TOTAL_WARNING_BUDGET}`, () => {
    const fixtures = readdirSync(FIXTURE_DIR)
      .filter((name) => name.endsWith('.txt'))
      .sort();

    let totalUnknown = 0;
    const perFixture: Array<{ name: string; count: number; templates: string[] }> = [];

    for (const fixtureName of fixtures) {
      const raw = readFileSync(join(FIXTURE_DIR, fixtureName), 'utf-8');
      const code = stripCommentsAndHeader(raw);
      const { warnings } = parseStyleCode(code);
      const unknownNames = warnings
        .filter((w) => w.message.startsWith('Unknown template'))
        .map((w) => w.template ?? '?');
      totalUnknown += unknownNames.length;
      perFixture.push({
        name: fixtureName,
        count: unknownNames.length,
        templates: Array.from(new Set(unknownNames)).sort(),
      });
    }

    if (totalUnknown > TOTAL_WARNING_BUDGET) {
      const summary = perFixture
        .filter((f) => f.count > 0)
        .map((f) => `  ${f.name} (${f.count}): ${f.templates.join(', ')}`)
        .join('\n');
      throw new Error(
        `Corpus warning budget exceeded: ${totalUnknown}/${TOTAL_WARNING_BUDGET}.\nPer-fixture breakdown:\n${summary}`,
      );
    }

    expect(totalUnknown).toBeLessThanOrEqual(TOTAL_WARNING_BUDGET);
  });
});
