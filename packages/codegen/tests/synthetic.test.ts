// ─── Synthetic corpus gate ───
//
// Runs every preset in `@kyberstation/presets` through the codegen pipeline.
// Per preset it checks that:
//
//   1. the emitted code parses back without errors
//   2. colour fields survive Config → AST → Code → AST → Config, or — for
//      styles whose output can't carry baseColor back — that the loss is
//      still the known, documented one (BASE_COLOR_NOT_RECOVERABLE)
//   3. ignition / retraction ms survive within ±MS_TOLERANCE
//   4. style / ignition / retraction IDs come back as themselves, or as the
//      documented canonical sibling when two IDs share one emission shape
//   5. the validator reports no errors and no warnings, for the AST and for
//      the generated code (generateStyleCode with and without comments)
//   6. generateStyleCode() output matches the committed golden fixture
//      byte for byte (see "Golden fixtures" below)
//
// Every style / ignition / retraction ID a preset uses must be classified in
// the tables below. An unclassified ID fails the test instead of being
// skipped, and a table entry no preset uses fails the "no stale entries"
// check, so the tables track the corpus.
//
// Also covered: lockup-position permutations, and buildConfigFile over a
// representative multi-preset set.
//
// ─── Golden fixtures ───
//
// tests/fixtures/synthetic/<preset-id>.cpp holds the exact
// generateStyleCode() output for each preset — the single-style code the
// editor shows, modulation comment block included. <preset-id>.json holds
// the preset config that produced it. Both are compared exactly, so any
// change to generated code, and any preset edit, fails here until the
// fixtures are regenerated:
//
//   KYBERSTATION_WRITE_FIXTURES=1 pnpm --filter @kyberstation/codegen test
//
// Write mode rewrites every pair and deletes fixtures whose preset is gone.
// Review the fixture diff before committing it: that diff IS the change to
// the ProffieOS code users get.

import { describe, it, expect } from 'vitest';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { Preset } from '@kyberstation/presets';
import {
  buildConfigFile,
  generateStyleCode,
  validateAST,
  validateStyleCode,
} from '../src/index.js';
import type { BladeConfig, ConfigOptions, PresetEntry } from '../src/index.js';
import { roundTrip } from './helpers/roundTrip.js';
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(thisDir, 'fixtures', 'synthetic');
const FIXTURE_README = 'README.md';

const SHOULD_WRITE = process.env.KYBERSTATION_WRITE_FIXTURES === '1';
const REGENERATE_HINT =
  'if the change is intentional, regenerate with `KYBERSTATION_WRITE_FIXTURES=1 pnpm --filter @kyberstation/codegen test` and review the fixture diff';

/** Fixture file stem for a preset (kept identical to the original writer). */
function fixtureName(presetId: string): string {
  return presetId.replace(/[^a-z0-9-]/gi, '_');
}

// ms fields need a ±5ms tolerance because stutter/glitch split ms into
// thirds/quarters and the simple inverse (first-part * 3) doesn't always
// recover the exact original. The glitch split specifically covers only
// 7/8 of the requested ms by design.
const MS_TOLERANCE = 5;

// ─── Colour fields ───

/** Required colours; they round-trip for every style. */
const EFFECT_COLOUR_FIELDS = ['blastColor', 'clashColor', 'lockupColor'] as const;

/**
 * Optional colours. Asserted only when the preset sets them — defaults don't
 * round-trip because the reconstructor can't tell "unset" from "set to the
 * default".
 */
const OPTIONAL_COLOUR_FIELDS = ['dragColor', 'lightningColor', 'meltColor'] as const;

/**
 * Styles whose emitted code doesn't let the reconstructor recover
 * `baseColor`, with the reason. Every other style must round-trip it.
 *
 * - "not emitted": baseColor never appears in the code (the style prints a
 *   fixed palette, or only derived shades of the colour).
 * - "not first": baseColor is in the code, but the first colour the
 *   reconstructor meets in the base layer is a derived one.
 *
 * Asserted as a ratchet: if one of these starts round-tripping, the test
 * fails and asks for the entry to be removed.
 */
const BASE_COLOR_NOT_RECOVERABLE: Readonly<Record<string, string>> = {
  aurora: 'not emitted: the base layer is a bare Rainbow',
  prism: 'not emitted: the base layer is a bare Rainbow',
  candle: 'not emitted: fixed flame palette Gradient<Rgb<255,140,40>,Rgb<255,80,10>>',
  gravity: 'not emitted: only lightened/darkened shades, inside Mix<BladeAngle, Gradient<…>, …>',
  ember: "not emitted: only a darkened (~1/6) copy, as StyleFire's first colour",
  darksaber: 'not first: Gradient<White, base, base, White> — the White edge stop is read first',
  dataStream: 'not first: base appears only inside Mix<Int<N>, Black, base> — Black is read first',
  cascade: 'not first: base appears only inside Mix<Int<N>, Black, base> — Black is read first',
  neutron: 'not first: base appears only inside Mix<Int<N>, Black, base> — Black is read first',
  torrent: 'not first: the first Stripes colour is a darkened copy of base',
  moire: 'not first: the first Mix colour is base dimmed to ~1/16',
};

// ─── IDs ───

interface Reconstruction {
  /** ID the reconstructor returns; `undefined` = it returns none. */
  as: string | undefined;
  why: string;
}

/** Style IDs that come back unchanged. */
const STYLES_THAT_ROUND_TRIP: ReadonlySet<string> = new Set([
  'stable',
  'unstable',
  'fire',
  'plasma',
  'pulse',
  'gradient',
  'photon',
  'crystalShatter',
  'rotoscope',
  'cinder',
  'aurora',
]);

/**
 * Style IDs that come back as a sibling: their emitted core template matches
 * another style's detection heuristic (`detectStyle` in
 * parser/ConfigReconstructor.ts).
 */
const STYLE_RECONSTRUCTED_AS: Readonly<Record<string, Reconstruction>> = {
  prism: { as: 'aurora', why: 'bare Rainbow core, same as aurora' },
  darksaber: { as: 'painted', why: '4-stop Gradient<White, base, base, White>; 3+ stop Gradients detect as painted' },
  shatter: { as: 'photon', why: 'Stripes core with non-photon timing; the Stripes fallback is photon' },
  dataStream: { as: 'photon', why: 'Stripes core with non-photon timing; the Stripes fallback is photon' },
  cascade: { as: 'photon', why: 'Stripes core with non-photon timing; the Stripes fallback is photon' },
  helix: { as: 'photon', why: 'Stripes core with non-photon timing; the Stripes fallback is photon' },
  vortex: { as: 'photon', why: 'Stripes core with non-photon timing; the Stripes fallback is photon' },
  automata: { as: 'stable', why: 'same AudioFlicker<base, Mix<…>> core as stable' },
  nebula: { as: 'stable', why: 'AudioFlicker core detects as stable' },
  candle: { as: 'stable', why: 'BrownNoiseFlicker core detects as stable' },
  mirage: { as: 'stable', why: 'BrownNoiseFlicker core detects as stable' },
  ember: { as: 'fire', why: 'StyleFire<…, Rgb, …, FireConfig<2,…>> core, same as fire' },
  tidal: { as: 'rotoscope', why: 'Mix<SwingSpeed<500>, …> core; unknown SwingSpeed falls back to rotoscope' },
  torrent: { as: 'rotoscope', why: 'Mix<SwingSpeed<400>, …> core, same as rotoscope' },
  gravity: { as: 'custom', why: 'Mix<BladeAngle, …> core matches no heuristic' },
  moire: { as: 'custom', why: 'Mix<Sin<…>, …> core matches no heuristic' },
  neutron: { as: 'custom', why: 'Mix<Sin<…>, …> core matches no heuristic' },
};

/** Ignition IDs that come back unchanged. */
const IGNITIONS_THAT_ROUND_TRIP: ReadonlySet<string> = new Set([
  'standard',
  'scroll',
  'spark',
  'center',
  'stutter',
  'glitch',
  'flash-fill',
  'swing',
  'pulse-wave',
]);

/**
 * Ignition IDs whose emission is shared with (or falls back to) another ID.
 * See the `preferForInverse: false` entries in transitionMap.ts.
 */
const IGNITION_RECONSTRUCTED_AS: Readonly<Record<string, Reconstruction>> = {
  wipe: { as: 'scroll', why: 'both emit TrWipe<ms>' },
  stab: { as: 'center', why: 'both emit TrCenterWipeIn<ms>' },
  crackle: { as: 'swing', why: 'both emit TrConcat<TrFade<ms/5>, TrWipeIn<4ms/5>>' },
  hyperspace: { as: 'swing', why: "approximated with swing's TrConcat<TrFade, TrWipeIn>" },
  fracture: { as: 'standard', why: 'low-confidence fallback emits TrWipeIn<ms>, the standard shape' },
  summon: { as: 'standard', why: 'low-confidence fallback emits TrWipeIn<ms>, the standard shape' },
  seismic: { as: 'standard', why: 'low-confidence fallback emits TrWipeIn<ms>, the standard shape' },
  'drip-up': { as: undefined, why: 'low-confidence fallback emits TrFade<ms>; no ignition maps back from TrFade' },
};

/** Retraction IDs that come back unchanged. */
const RETRACTIONS_THAT_ROUND_TRIP: ReadonlySet<string> = new Set([
  'standard',
  'scroll',
  'fadeout',
  'center',
  'flickerOut',
  'spaghettify',
]);

/** Retraction IDs whose emission is shared with (or falls back to) another ID. */
const RETRACTION_RECONSTRUCTED_AS: Readonly<Record<string, Reconstruction>> = {
  drain: { as: 'flickerOut', why: 'both emit TrConcat<TrFade, TrFade> (70/30 vs 15/85 split)' },
  implode: { as: 'center', why: 'both emit TrCenterWipeIn<ms>' },
  shatter: { as: 'fadeout', why: 'both emit TrFade<ms>' },
  dissolve: { as: 'fadeout', why: 'low-confidence fallback emits TrFade<ms>' },
  unravel: { as: 'fadeout', why: 'low-confidence fallback emits TrFade<ms>' },
  evaporate: { as: 'fadeout', why: 'low-confidence fallback emits TrFade<ms>' },
};

const ID_TABLES = {
  style: { roundTrips: STYLES_THAT_ROUND_TRIP, aliases: STYLE_RECONSTRUCTED_AS },
  ignition: { roundTrips: IGNITIONS_THAT_ROUND_TRIP, aliases: IGNITION_RECONSTRUCTED_AS },
  retraction: { roundTrips: RETRACTIONS_THAT_ROUND_TRIP, aliases: RETRACTION_RECONSTRUCTED_AS },
} as const;

type IdField = keyof typeof ID_TABLES;

function expectedReconstruction(field: IdField, id: string): Reconstruction {
  const { roundTrips, aliases } = ID_TABLES[field];
  if (roundTrips.has(id)) return { as: id, why: 'round-trips unchanged' };
  const alias = aliases[id];
  if (alias) return alias;
  throw new Error(
    `Unclassified ${field} "${id}": add it to the ${field} round-trip set or alias table in tests/synthetic.test.ts`,
  );
}

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
      const reconstructed = result.reconstructedConfig as unknown as Record<
        string,
        unknown
      > | null;

      it('parses without errors', () => {
        expect(result.parseErrors).toEqual([]);
      });

      it('round-trips colour fields (or loses baseColor in the documented way)', () => {
        expect(reconstructed, `${preset.id}: reconstruction failed`).not.toBeNull();

        const baseLoss = BASE_COLOR_NOT_RECOVERABLE[config.style];
        if (baseLoss) {
          expect(
            reconstructed!.baseColor,
            `${preset.id}: baseColor now round-trips for style "${config.style}" — remove it from BASE_COLOR_NOT_RECOVERABLE (was: ${baseLoss})`,
          ).not.toEqual(config.baseColor);
        } else {
          expect(reconstructed!.baseColor, `${preset.id}.baseColor`).toEqual(
            config.baseColor,
          );
        }

        for (const field of EFFECT_COLOUR_FIELDS) {
          expect(reconstructed![field], `${preset.id}.${field}`).toEqual(config[field]);
        }

        for (const field of OPTIONAL_COLOUR_FIELDS) {
          const expected = (config as Record<string, unknown>)[field];
          if (expected === undefined) continue;
          expect(
            reconstructed![field],
            `${preset.id}.${field} was set in source but did not round-trip`,
          ).toEqual(expected);
        }
      });

      it('round-trips ms values within tolerance', () => {
        for (const field of ['ignitionMs', 'retractionMs'] as const) {
          const expected = config[field];
          if (expected === undefined) continue;
          const actual = result.reconstructedConfig?.[field];
          expect(actual).toBeDefined();
          expect(
            Math.abs((actual ?? 0) - expected),
            `${preset.id}.${field}: expected ~${expected}, got ${actual}`,
          ).toBeLessThanOrEqual(MS_TOLERANCE);
        }
      });

      it('round-trips style / ignition / retraction IDs (or the documented sibling)', () => {
        expect(reconstructed, `${preset.id}: reconstruction failed`).not.toBeNull();
        for (const field of Object.keys(ID_TABLES) as IdField[]) {
          const id = String(config[field]);
          const expected = expectedReconstruction(field, id);
          expect(
            reconstructed![field],
            `${preset.id}.${field}: "${id}" should reconstruct as ${JSON.stringify(expected.as)} (${expected.why})`,
          ).toBe(expected.as);
        }
      });

      it('passes the validator (AST and generated code)', () => {
        const astResult = validateAST(result.forwardAST);
        expect(astResult.errors, `${preset.id}: validateAST errors`).toEqual([]);
        expect(astResult.warnings, `${preset.id}: validateAST warnings`).toEqual([]);

        const variants: Array<[string, string]> = [
          ['generateStyleCode', generateStyleCode(config)],
          // The config.h preset-array path.
          ['generateStyleCode comments:false', generateStyleCode(config, { comments: false })],
        ];
        for (const [label, code] of variants) {
          const codeResult = validateStyleCode(code);
          expect(codeResult.errors, `${preset.id}: ${label} errors`).toEqual([]);
          expect(codeResult.warnings, `${preset.id}: ${label} warnings`).toEqual([]);
        }
      });

      it('matches its golden fixture byte for byte', () => {
        const name = fixtureName(preset.id);
        const cppPath = join(FIXTURE_DIR, `${name}.cpp`);
        const jsonPath = join(FIXTURE_DIR, `${name}.json`);
        const cpp = generateStyleCode(config) + '\n';
        const json = stableJson(config);

        if (SHOULD_WRITE) {
          writeFileSync(cppPath, cpp, 'utf-8');
          writeFileSync(jsonPath, json, 'utf-8');
        }

        if (!existsSync(cppPath) || !existsSync(jsonPath)) {
          expect.fail(
            `${preset.id}: missing golden fixture tests/fixtures/synthetic/${name}.cpp/.json — ${REGENERATE_HINT}`,
          );
        }
        expect(
          readFileSync(cppPath, 'utf-8'),
          `${preset.id}: generated code differs from tests/fixtures/synthetic/${name}.cpp — ${REGENERATE_HINT}`,
        ).toBe(cpp);
        expect(
          readFileSync(jsonPath, 'utf-8'),
          `${preset.id}: preset config differs from tests/fixtures/synthetic/${name}.json — ${REGENERATE_HINT}`,
        ).toBe(json);
      });
    });
  }
});

describe('synthetic fixtures — golden fixture directory', () => {
  it('maps every preset to a distinct fixture name', () => {
    const names = ALL_PRESETS.map((p) => fixtureName(p.id));
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    expect(duplicates, 'preset IDs that collide after sanitising').toEqual([]);
  });

  it('holds no fixtures for presets that no longer exist', () => {
    const expected = new Set(
      ALL_PRESETS.flatMap((p) => [`${fixtureName(p.id)}.cpp`, `${fixtureName(p.id)}.json`]),
    );
    const orphans = readdirSync(FIXTURE_DIR).filter(
      (file) => file !== FIXTURE_README && !expected.has(file),
    );
    if (SHOULD_WRITE) {
      for (const file of orphans) unlinkSync(join(FIXTURE_DIR, file));
      return;
    }
    expect(orphans, `orphaned fixtures — ${REGENERATE_HINT}`).toEqual([]);
  });
});

describe('synthetic fixtures — classification tables', () => {
  it('have no stale entries (every entry is used by at least one preset)', () => {
    const used: Record<IdField, Set<string>> = {
      style: new Set(),
      ignition: new Set(),
      retraction: new Set(),
    };
    for (const preset of ALL_PRESETS) {
      for (const field of Object.keys(used) as IdField[]) {
        used[field].add(String((preset.config as BladeConfig)[field]));
      }
    }
    const stale: string[] = [];
    for (const field of Object.keys(ID_TABLES) as IdField[]) {
      const { roundTrips, aliases } = ID_TABLES[field];
      for (const id of [...roundTrips, ...Object.keys(aliases)]) {
        if (!used[field].has(id)) stale.push(`${field}:${id}`);
      }
    }
    for (const style of Object.keys(BASE_COLOR_NOT_RECOVERABLE)) {
      if (!used.style.has(style)) stale.push(`baseColor:${style}`);
    }
    expect(stale, 'remove these entries from the tables in tests/synthetic.test.ts').toEqual([]);
  });

  it('classify each style / ignition / retraction ID exactly once', () => {
    for (const field of Object.keys(ID_TABLES) as IdField[]) {
      const { roundTrips, aliases } = ID_TABLES[field];
      const both = Object.keys(aliases).filter((id) => roundTrips.has(id));
      expect(both, `${field} IDs in both the round-trip set and the alias table`).toEqual([]);
    }
  });
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

// ─── config.h assembly ───

/**
 * Delimiter problems in a C++ source file: `{}` / `()` / `<>` must balance
 * and nest. Comments and string literals are skipped.
 */
function delimiterProblems(source: string): string[] {
  const pairs: Record<string, string> = { '}': '{', ')': '(', '>': '<' };
  const stack: Array<{ ch: string; at: number }> = [];
  const problems: string[] = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    if (ch === '"') {
      for (i++; i < source.length && source[i] !== '"'; i++) {
        if (source[i] === '\\') i++;
      }
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '<') {
      stack.push({ ch, at: i });
    } else if (ch in pairs) {
      const top = stack.pop();
      if (!top) problems.push(`unmatched '${ch}' at offset ${i}`);
      else if (top.ch !== pairs[ch]) {
        problems.push(`'${ch}' at offset ${i} closes '${top.ch}' from offset ${top.at}`);
      }
    }
  }
  for (const open of stack) problems.push(`unclosed '${open.ch}' at offset ${open.at}`);
  return problems;
}

describe('synthetic fixtures — config.h assembly', () => {
  // One preset per style (first occurrence) plus every preset carrying
  // modulation bindings: every base-layer emission shape in the corpus, and
  // the live-binding composer path.
  const representatives: Preset[] = [];
  const seenStyles = new Set<string>();
  for (const preset of ALL_PRESETS) {
    const config = preset.config as BladeConfig & { modulation?: unknown };
    if (!seenStyles.has(config.style) || config.modulation) {
      seenStyles.add(config.style);
      representatives.push(preset);
    }
  }

  // Mirrors the minimal config.h that apps/web/lib/zipExporter.ts builds
  // when the user hasn't picked a board profile.
  const entries: PresetEntry[] = representatives.map((preset, i) => ({
    fontName: `font${i + 1}`,
    styleCodes: [generateStyleCode(preset.config as BladeConfig, { comments: false })],
    presetName: preset.name,
  }));
  const options: ConfigOptions = {
    boardType: 'proffieboard_v3',
    propFile: 'saber_fett263_buttons.h',
    numBlades: 1,
    numButtons: 2,
    volume: 2000,
    clashThresholdG: 3.0,
    maxClashStrength: 16,
    fett263Defines: ['FETT263_EDIT_MODE_MENU', 'FETT263_MULTI_PHASE'],
    presets: entries,
    bladeConfig: [
      {
        type: 'ws281x',
        ledCount: 144,
        pin: 'bladePin',
        colorOrder: 'Color8::GRB',
        powerPins: ['bladePowerPin2', 'bladePowerPin3'],
      },
    ],
  };
  const configH = buildConfigFile(options);

  it('covers every style in the corpus and the modulation composer path', () => {
    const corpusStyles = new Set(ALL_PRESETS.map((p) => (p.config as BladeConfig).style));
    expect(seenStyles).toEqual(corpusStyles);
    expect(
      representatives.some((p) => (p.config as { modulation?: unknown }).modulation),
    ).toBe(true);
  });

  it('balances braces, parentheses and angle brackets', () => {
    expect(delimiterProblems(configH)).toEqual([]);
  });

  it('has each section guard exactly once, each closed by #endif', () => {
    for (const guard of ['CONFIG_TOP', 'CONFIG_PROP', 'CONFIG_PRESETS', 'CONFIG_BUTTONS']) {
      expect(configH.split(`#ifdef ${guard}\n`).length - 1, guard).toBe(1);
    }
    expect(configH.match(/^#endif$/gm)).toHaveLength(4);
  });

  it('declares one Preset entry per preset, with its style code verbatim', () => {
    expect(configH).toContain('Preset presets[] = {');
    expect(configH.match(/^ {2}\{ "font\d+", "tracks\/track\.wav",$/gm)).toHaveLength(
      entries.length,
    );
    for (const entry of entries) {
      expect(configH).toContain(`    ${entry.styleCodes[0]},\n`);
      // The comments:false contract: no per-preset comment banners.
      expect(entry.styleCodes[0]).not.toContain('//');
    }
  });

  it('declares the blade array against the preset array', () => {
    expect(configH).toContain('BladeConfig blades[] = {');
    expect(configH).toContain(
      'WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3>>()',
    );
    expect(configH).toContain('CONFIGARRAY(presets) }');
    expect(configH).toContain('#define NUM_BLADES 1\n');
  });
});
