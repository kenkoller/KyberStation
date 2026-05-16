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
import { emitCode } from '../src/index.js';
import type { StyleNode } from '../src/index.js';

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
      // through as generic nodes — so a non-null AST is the bar. The
      // two formerly lexer-incompatible fixtures (EASYBLADE macro
      // syntax + ronin under-closed bracket) now parse cleanly; see
      // `apps/web/tests/fett263CorpusRoundTrip.test.ts` for the
      // historical breadcrumbs.
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

// ─── v0.21.x Template Registry Expansion Round-Trip Fixtures ───────────
//
// Background (audit follow-up #6, interface H — Fett263/ProffieOS C++
// import parser):
//
// The template registry grew 153 → 372 across v0.21.x via PRs #259, #260,
// #261, #262 (Sprint 5A) and the follow-on layer / transition / function
// expansion commits 4855362, 4c4eb4e, 9d94d5b. The corpus-level smoke
// test above asserts the unknown-template warning budget; it does NOT
// assert that any *specific* template parses to a well-formed AST.
//
// A regression in any of the 219 newly-added templates would silently
// break import for in-the-wild Fett263 stylebrary entries — the
// corpus-level cap would still be met because each fixture would just
// fall into the generic-template fallback path.
//
// These fixtures pin **structural import round-trip** for representative
// templates from the 219-template expansion:
//
//   1. Parse succeeds (errors empty).
//   2. The targeted template appears as the AST root (preserved through
//      tokenize → parse).
//   3. Specific descendant template names appear at expected depths
//      (proves nested-structure preservation).
//   4. No "Unknown template" warnings for the templates we explicitly
//      target (proves the registry knows the template name + signature).
//   5. Re-emit produces a parseable string (proves stability of the
//      parse → emit → parse cycle even where integer-literal
//      normalization adds outer Int<> wrappers).
//
// Note on byte-exact round-trip:
//
// The current emitter normalizes bare integer literals (e.g. `200`) into
// `Int<200>` wrappers, and each subsequent round adds another `Int<>`
// (parser stores `200` as an `IntNode` with one `raw` child, emitter
// re-wraps it). This is a known emit-side normalization quirk, NOT a
// parser/registry regression — bytewise identity through parse + emit
// is therefore not a meaningful assertion. The fixtures below assert
// structural AST identity instead, which is the load-bearing
// import-side contract.
//
// Cross-reference:
//   - Smoking-gun precedent: PR #325 (runtime-presets RGB scaling) — the
//     same audit doc that flagged interface H.
//   - Registry sources: packages/codegen/src/templates/{colors,layers,
//     transitions,functions,wrappers}.ts.

describe('Fett263 import — v0.21.x template registry expansion round-trip', () => {
  /**
   * Recursively collect all node names appearing in the AST.
   * Useful for asserting a set of templates round-tripped without
   * pinning exact tree shape.
   */
  function collectNames(node: StyleNode): Set<string> {
    const names = new Set<string>([node.name]);
    for (const child of node.args) {
      for (const n of collectNames(child)) names.add(n);
    }
    return names;
  }

  /**
   * Fixture for one round-trip case. The `targetTemplates` field
   * identifies templates the test specifically targets — `Unknown
   * template` warnings on these names cause the fixture to fail (proves
   * the registry knows them). Warnings on *other* templates are
   * tolerated (already covered by the corpus-level budget above).
   */
  interface RoundTripFixture {
    /** Short human-readable name shown in test output. */
    name: string;
    /** The ProffieOS C++ snippet to parse. */
    code: string;
    /** Templates this fixture targets — must be registered. */
    targetTemplates: string[];
    /**
     * Template names expected to appear *somewhere* in the parsed AST.
     * Asserts that nested structure was preserved through the parse
     * (not just the outer node).
     */
    expectedDescendants?: string[];
  }

  // ── Composite layers (Layers<>, LayerFunctions<>) with multiple children ──
  const COMPOSITE_LAYER_FIXTURES: RoundTripFixture[] = [
    {
      name: 'Layers<base, ResponsiveLockupL, ResponsiveBlastL> — OS7 effect-overlay stack',
      code:
        'Layers<RgbArg<BASE_COLOR_ARG,Rgb<0,0,255>>,' +
        'ResponsiveBlastL<RgbArg<BLAST_COLOR_ARG,White>,Int<100>,Int<400>,Int<28000>,EFFECT_BLAST>,' +
        'ResponsiveClashL<White,TrInstant,TrFade<200>,Int<16000>,Int<32768>>>',
      targetTemplates: ['Layers', 'ResponsiveBlastL', 'ResponsiveClashL', 'RgbArg'],
      expectedDescendants: ['ResponsiveBlastL', 'ResponsiveClashL', 'TrFade'],
    },
    {
      name: 'LayerFunctions — variadic function composer (Sprint 5A)',
      code:
        'LayerFunctions<Int<16384>,' +
        'Scale<SwingSpeed<200>,Int<0>,Int<32768>>,' +
        'Scale<TwistAngle,Int<0>,Int<16384>>>',
      targetTemplates: ['LayerFunctions', 'Scale', 'SwingSpeed'],
      expectedDescendants: ['Scale', 'SwingSpeed', 'TwistAngle'],
    },
    {
      name: 'AlphaMixL — variadic alpha-mixed colour stack',
      code: 'AlphaMixL<Bump<Int<16384>,Int<8192>>,Red,Blue,Green,Yellow>',
      targetTemplates: ['AlphaMixL', 'Bump'],
      expectedDescendants: ['Bump'],
    },
    {
      name: 'MultiTransitionEffectL — multi-trigger transition effect (Sprint 5A)',
      code: 'MultiTransitionEffectL<TrFade<200>,EFFECT_BLAST>',
      targetTemplates: ['MultiTransitionEffectL', 'TrFade'],
      expectedDescendants: ['TrFade'],
    },
  ];

  // ── Nested transitions (TrConcat, TrCenterWipe*, TrColorCycle) ──
  const NESTED_TRANSITION_FIXTURES: RoundTripFixture[] = [
    {
      name: 'TrConcat<TrFade, Mix, TrFade> — chained transition with color stop',
      code: 'TrConcat<TrFade<200>,Mix<Int<16384>,Red,Blue>,TrFade<400>>',
      targetTemplates: ['TrConcat', 'TrFade', 'Mix'],
      expectedDescendants: ['TrFade', 'Mix'],
    },
    {
      name: 'TrCenterWipeSpark — center wipe with spark (Sprint 5A)',
      code: 'TrCenterWipeSpark<Rgb<255,128,0>,Black,Int<200>,Int<400>>',
      targetTemplates: ['TrCenterWipeSpark', 'Rgb'],
      expectedDescendants: ['Rgb'],
    },
    {
      name: 'TrWipe<BendTimePowInvX<IgnitionTime, Mult<IntArg>>> — Fett263 OS7 ignition shape',
      code:
        'TrWipe<BendTimePowInvX<IgnitionTime<300>,' +
        'Mult<IntArg<IGNITION_OPTION2_ARG,10992>,Int<98304>>>>',
      targetTemplates: ['TrWipe', 'BendTimePowInvX', 'IgnitionTime', 'Mult', 'IntArg'],
      expectedDescendants: ['BendTimePowInvX', 'IgnitionTime', 'Mult', 'IntArg'],
    },
  ];

  // ── RotateColorsX<Variation, RgbArg<...>> — the smoking-gun pattern ──
  // From 89V3_allfont.h and the bench session referenced in PR #325.
  // RotateColorsX is the wrapper used to apply hue rotation across the
  // user-configurable BASE_COLOR_ARG slot.
  const ROTATE_COLORS_FIXTURES: RoundTripFixture[] = [
    {
      name: 'RotateColorsX<Variation, RgbArg<BASE_COLOR_ARG, Rgb>> — the 89V3 allfont pattern',
      code: 'RotateColorsX<Variation,RgbArg<BASE_COLOR_ARG,Rgb<0,0,255>>>',
      targetTemplates: ['RotateColorsX', 'Variation', 'RgbArg', 'Rgb'],
      expectedDescendants: ['Variation', 'RgbArg', 'Rgb'],
    },
    {
      name: 'Hyper Responsive Rotoscope — Mix<HoldPeakF<SwingSpeed,...>, RgbArg, RgbArg>',
      code:
        'Mix<HoldPeakF<SwingSpeed<200>,' +
        'Scale<SwingAcceleration<100>,Int<50>,Int<500>>,' +
        'Scale<SwingAcceleration<100>,Int<20000>,Int<10000>>>,' +
        'RgbArg<BASE_COLOR_ARG,Rgb<0,140,255>>,' +
        'RgbArg<BASE_COLOR_ARG,Rgb<255,255,255>>>',
      targetTemplates: [
        'Mix',
        'HoldPeakF',
        'SwingSpeed',
        'SwingAcceleration',
        'Scale',
        'RgbArg',
      ],
      expectedDescendants: ['HoldPeakF', 'SwingSpeed', 'SwingAcceleration', 'RgbArg'],
    },
  ];

  // ── Effect-modulated styles (StyleFire, AudioFlicker, BrownNoiseFlicker) ──
  const EFFECT_MODULATED_FIXTURES: RoundTripFixture[] = [
    {
      name: 'StyleFire — fire style with FireConfig (real-world 5-arg form)',
      code:
        'StyleFire<RgbArg<BASE_COLOR_ARG,Rgb<255,80,0>>,' +
        'Mix<Int<10000>,Black,Rgb<255,80,0>>,' +
        'Int<0>,Int<4>,FireConfig<3,2000,5>>',
      targetTemplates: ['StyleFire', 'FireConfig', 'RgbArg'],
      expectedDescendants: ['FireConfig', 'Mix'],
    },
    {
      name: 'AudioFlicker inside AlphaL with Bump modulator',
      code:
        'AlphaL<AudioFlicker<Red,Mix<Int<16384>,Red,White>>,' +
        'Bump<Int<16384>,Int<8000>>>',
      targetTemplates: ['AlphaL', 'AudioFlicker', 'Bump'],
      expectedDescendants: ['AudioFlicker', 'Bump'],
    },
    {
      name: 'BrownNoiseFlicker chained with RandomPerLEDFlicker',
      code: 'BrownNoiseFlicker<Red,RandomPerLEDFlicker<Blue,White>,300>',
      targetTemplates: ['BrownNoiseFlicker', 'RandomPerLEDFlicker'],
      expectedDescendants: ['RandomPerLEDFlicker'],
    },
  ];

  // ── Composite style: StylePtr<InOutHelper<Layers<...>>> ──
  const COMPOSITE_STYLE_FIXTURES: RoundTripFixture[] = [
    {
      name: 'StylePtr<InOutHelper<Layers<...>>> — full saber-style composite',
      code:
        'StylePtr<InOutHelper<Layers<' +
        'RandomFlicker<Red,Yellow>,' +
        'BlastL<White>,' +
        'LockupTrL<Yellow,TrInstant,TrFade<200>,SaberBase::LOCKUP_NORMAL>' +
        '>,300,500>>()',
      targetTemplates: [
        'StylePtr',
        'InOutHelper',
        'Layers',
        'RandomFlicker',
        'BlastL',
        'LockupTrL',
      ],
      expectedDescendants: ['InOutHelper', 'Layers', 'RandomFlicker', 'BlastL', 'LockupTrL'],
    },
  ];

  // ── New Sprint 5A function templates (commit 9d94d5b) ──
  const SPRINT_5A_FUNCTION_FIXTURES: RoundTripFixture[] = [
    {
      name: 'IntSelect — variadic int picker (Sprint 5A)',
      code: 'IntSelect<Int<2>,Int<100>,Int<200>,Int<300>,Int<400>>',
      targetTemplates: ['IntSelect'],
    },
    {
      name: 'Subtract + Percentage + Divide — Sprint 5A math primitives',
      code:
        'Subtract<Percentage<SwingSpeed<200>,Int<50>>,' +
        'Divide<Int<1000>,Int<10>>>',
      targetTemplates: ['Subtract', 'Percentage', 'Divide', 'SwingSpeed'],
      expectedDescendants: ['Percentage', 'Divide'],
    },
    {
      name: 'IsBetween — Sprint 5A range-predicate function',
      code: 'IsBetween<SwingSpeed<200>,Int<100>,Int<500>>',
      targetTemplates: ['IsBetween', 'SwingSpeed'],
    },
  ];

  // ── New Sprint 5A transition templates (commit 4c4eb4e) ──
  const SPRINT_5A_TRANSITION_FIXTURES: RoundTripFixture[] = [
    {
      name: 'TrCenterWipeInSparkX — variadic center wipe-in with spark',
      code: 'TrCenterWipeInSparkX<Rgb<255,128,0>,Black,Int<200>,Int<400>>',
      targetTemplates: ['TrCenterWipeInSparkX', 'Rgb'],
    },
    {
      name: 'TrColorCycle — variadic optional-arg cycle (Sprint 5A)',
      code: 'TrColorCycle<300>',
      targetTemplates: ['TrColorCycle'],
    },
  ];

  // Run every fixture group through the same assertion harness.
  function runRoundTripFixtures(label: string, fixtures: RoundTripFixture[]): void {
    describe(label, () => {
      for (const fixture of fixtures) {
        it(`${fixture.name}: parse → emit → parse round-trip`, () => {
          const { ast, errors, warnings } = parseStyleCode(fixture.code);

          // 1. Parse succeeds.
          expect(
            errors,
            `parseStyleCode emitted errors for fixture "${fixture.name}": ${JSON.stringify(errors)}`,
          ).toEqual([]);
          expect(ast, `parser returned null AST for "${fixture.name}"`).not.toBeNull();
          if (!ast) return;

          // 2. Target templates are registered (no "Unknown template" warnings
          //    for the templates we explicitly target).
          const unknownTargetWarnings = warnings.filter(
            (w) =>
              w.message.startsWith('Unknown template') &&
              fixture.targetTemplates.includes(w.template ?? ''),
          );
          expect(
            unknownTargetWarnings,
            `Unknown-template warning fired for a target template in "${fixture.name}". ` +
              `Targets: ${fixture.targetTemplates.join(', ')}. ` +
              `Warnings: ${unknownTargetWarnings.map((w) => w.template).join(', ')}.`,
          ).toEqual([]);

          // 3. The AST root name matches the outermost template in the fixture.
          //    (Best-effort: the fixture string's first identifier.)
          const outerMatch = fixture.code.match(/^[A-Za-z_][A-Za-z0-9_]*/);
          if (outerMatch) {
            expect(
              ast.name,
              `Outer AST name mismatch for "${fixture.name}". ` +
                `Expected ${outerMatch[0]}, got ${ast.name}.`,
            ).toBe(outerMatch[0]);
          }

          // 4. Expected descendant templates all appear somewhere in the
          //    parsed AST (proves structure was preserved).
          if (fixture.expectedDescendants) {
            const names = collectNames(ast);
            for (const expected of fixture.expectedDescendants) {
              expect(
                names.has(expected),
                `Expected descendant "${expected}" missing from AST of "${fixture.name}". ` +
                  `Found names: ${Array.from(names).slice(0, 20).join(', ')}…`,
              ).toBe(true);
            }
          }

          // 5. Re-emit produces a parseable string. The emitter's
          //    integer-literal normalization means we don't assert byte
          //    identity — only that the cycle stays in the parse-able
          //    grammar.
          const reemitted = emitCode(ast, { minified: true });
          const reparsed = parseStyleCode(reemitted);
          expect(
            reparsed.errors,
            `re-emitted code failed to parse for "${fixture.name}". ` +
              `Emitted: ${reemitted}. Errors: ${JSON.stringify(reparsed.errors)}`,
          ).toEqual([]);
          expect(reparsed.ast).not.toBeNull();

          // The re-parsed AST must contain every target template, proving
          // the emit→parse cycle didn't lose template-name fidelity.
          if (reparsed.ast) {
            const reparsedNames = collectNames(reparsed.ast);
            for (const target of fixture.targetTemplates) {
              // EFFECT_*/SaberBase::* enum tokens are filtered by the
              // validator's prefix check and don't appear as proper
              // AST nodes — skip those.
              if (
                target.startsWith('EFFECT_') ||
                target.startsWith('SaberBase::') ||
                target.startsWith('LOCKUP_')
              ) {
                continue;
              }
              expect(
                reparsedNames.has(target),
                `Target template "${target}" was lost on emit→parse round-trip for "${fixture.name}". ` +
                  `Re-emitted: ${reemitted.slice(0, 160)}…`,
              ).toBe(true);
            }
          }
        });
      }
    });
  }

  runRoundTripFixtures('composite layers (Layers, LayerFunctions, AlphaMixL, MultiTransitionEffectL)', COMPOSITE_LAYER_FIXTURES);
  runRoundTripFixtures('nested transitions (TrConcat, TrCenterWipeSpark, TrWipe<BendTimePowInvX>)', NESTED_TRANSITION_FIXTURES);
  runRoundTripFixtures('RotateColorsX / RgbArg patterns (89V3 allfont, Hyper Responsive Rotoscope)', ROTATE_COLORS_FIXTURES);
  runRoundTripFixtures('effect-modulated styles (StyleFire, AudioFlicker, BrownNoiseFlicker)', EFFECT_MODULATED_FIXTURES);
  runRoundTripFixtures('composite styles (StylePtr<InOutHelper<Layers<...>>>)', COMPOSITE_STYLE_FIXTURES);
  runRoundTripFixtures('Sprint 5A function templates (IntSelect, Subtract, Percentage, Divide, IsBetween)', SPRINT_5A_FUNCTION_FIXTURES);
  runRoundTripFixtures('Sprint 5A transition templates (TrCenterWipeInSparkX, TrColorCycle)', SPRINT_5A_TRANSITION_FIXTURES);
});
