// ─── ProffieOS runtime verbs — byte-exact builders + mapper ───────────
//
// The consumer is ProffieOS 7.12 firmware (styles/style_parser.h
// named_styles[], styles/rgb_arg.h, functions/int_arg.h,
// common/current_preset.h IsValidStyleString). A prior encoding bug here
// (8-bit colors into a 16-bit parser) cost a full bench session, so every
// builder is pinned byte-for-byte and every mapped string must pass the
// TypeScript port of IsValidStyleString.

import { describe, it, expect } from 'vitest';
import { ALL_PRESETS } from '@kyberstation/presets';
import {
  mapBladeConfigToRuntimeStyle,
  isValidRuntimeStyleString,
  buildBuiltinStyleString,
  buildStandardStyleString,
  buildAdvancedStyleString,
  buildFireStyleString,
  buildUnstableStyleString,
  buildStrobeStyleString,
  buildCycleStyleString,
  buildRainbowStyleString,
  rgbArg16,
  toColor16Channel,
  intArg,
  RUNTIME_VERB_SLOTS,
  type RuntimeStyleInput,
  type RuntimeVerb,
} from '../src/emitters/runtimeVerbs.js';

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/** Arguments after the verb, per 7.12 named_styles[] (builtin: the 2 required). */
const VERB_ARITY: Record<RuntimeVerb, number> = {
  builtin: 2,
  standard: 4,
  advanced: 11,
  fire: 2,
  unstable: 6,
  strobe: 6,
  cycle: 5,
  rainbow: 2,
};

/** Which argument positions (1-based) are RgbArg colors, per verb. */
const COLOR_ARGS: Record<RuntimeVerb, number[]> = {
  builtin: [],
  standard: [1, 2],
  advanced: [1, 2, 3, 4, 6, 7, 8, 11],
  fire: [1, 2],
  unstable: [1, 2, 3, 4],
  strobe: [1, 2],
  cycle: [1, 2, 3, 4, 5],
  rainbow: [],
};

const DECIMAL = /^(0|[1-9][0-9]*)$/; // no leading zeros (strtol base 0 → octal)

/** Structural check of a style string against the verb's 7.12 signature. */
function expectWellFormed(styleString: string, verb: RuntimeVerb): void {
  expect(isValidRuntimeStyleString(styleString)).toBe(true);
  expect(styleString).not.toContain('~');
  expect(styleString).not.toContain('-');
  const [head, ...args] = styleString.split(' ');
  expect(head).toBe(verb);
  expect(args).toHaveLength(VERB_ARITY[verb]);
  args.forEach((arg, i) => {
    if (COLOR_ARGS[verb].includes(i + 1)) {
      const parts = arg.split(',');
      expect(parts).toHaveLength(3);
      for (const p of parts) {
        expect(p).toMatch(DECIMAL);
        expect(Number(p)).toBeLessThanOrEqual(65535);
      }
    } else {
      expect(arg).toMatch(DECIMAL);
    }
  });
}

function cfg(overrides: Partial<RuntimeStyleInput> & { style: string }): RuntimeStyleInput {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 220, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    ignitionMs: 300,
    retractionMs: 800,
    ...overrides,
  };
}

// ─── Encoders ───

describe('argument encoders', () => {
  it('scales 8-bit channels ×257 into Color16 (rgb_arg.h has no 8→16 scaling)', () => {
    expect(toColor16Channel(0)).toBe(0);
    expect(toColor16Channel(1)).toBe(257);
    expect(toColor16Channel(128)).toBe(32896);
    expect(toColor16Channel(255)).toBe(65535);
    expect(rgbArg16({ r: 235, g: 18, b: 142 })).toBe('60395,4626,36494'); // bench magenta 2026-05-16
  });

  it('clamps and rounds out-of-range / fractional / non-finite channels', () => {
    expect(toColor16Channel(300)).toBe(65535);
    expect(toColor16Channel(-5)).toBe(0);
    expect(toColor16Channel(127.5)).toBe(32768);
    expect(toColor16Channel(0.4)).toBe(103);
    expect(toColor16Channel(Number.NaN)).toBe(0);
    expect(toColor16Channel(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('floors, clamps and never emits NaN / minus signs for integer args', () => {
    expect(intArg(300.9, 0)).toBe('300');
    expect(intArg(-1, 0)).toBe('0');
    expect(intArg(Number.NaN, 300)).toBe('300');
    expect(intArg(Number.POSITIVE_INFINITY, 800)).toBe('800');
    expect(intArg(0, 15, 1)).toBe('1');
    expect(intArg(1e12, 0)).toBe('2147483647');
  });
});

// ─── Byte-exact builders ───

describe('verb builders — byte-exact', () => {
  it('builtin: presetIndex bladeNumber', () => {
    expect(buildBuiltinStyleString(2, 1)).toBe('builtin 2 1');
    expect(buildBuiltinStyleString(-3, 0)).toBe('builtin 0 1');
    expect(buildBuiltinStyleString(Number.NaN, 2.7)).toBe('builtin 0 2');
  });

  it('standard: color clash extMs retMs', () => {
    expect(
      buildStandardStyleString({ color: { r: 0, g: 140, b: 255 }, clashColor: WHITE, extensionMs: 300, retractionMs: 800 }),
    ).toBe('standard 0,35980,65535 65535,65535,65535 300 800');
  });

  it('advanced: 11 slots in named_styles[] order', () => {
    expect(
      buildAdvancedStyleString({
        color1: { r: 30, g: 10, b: 5 },
        color2: { r: 180, g: 40, b: 10 },
        color3: { r: 255, g: 120, b: 20 },
        onSparkColor: WHITE,
        onSparkTimeMs: 10,
        blastColor: { r: 255, g: 0, b: 0 },
        lockupColor: { r: 0, g: 255, b: 0 },
        clashColor: { r: 0, g: 0, b: 255 },
        extensionMs: 250,
        retractionMs: 700,
        sparkTipColor: WHITE,
      }),
    ).toBe(
      'advanced 7710,2570,1285 46260,10280,2570 65535,30840,5140 65535,65535,65535 10 65535,0,0 0,65535,0 0,0,65535 250 700 65535,65535,65535',
    );
  });

  it('fire: warm hot (no timing, no effect colors)', () => {
    expect(buildFireStyleString({ warmColor: { r: 255, g: 0, b: 0 }, hotColor: { r: 255, g: 255, b: 0 } })).toBe(
      'fire 65535,0,0 65535,65535,0',
    );
  });

  it('unstable: reproduces the ProffieOS 7.12 default arguments exactly', () => {
    // named_styles[] defaults: Rgb<150,0,0>, Red, Rgb<255,40,0>, Rgb<255,255,10>, 100, 200
    expect(
      buildUnstableStyleString({
        warmColor: { r: 150, g: 0, b: 0 },
        warmerColor: { r: 255, g: 0, b: 0 },
        hotColor: { r: 255, g: 40, b: 0 },
        sparksColor: { r: 255, g: 255, b: 10 },
        extensionMs: 100,
        retractionMs: 200,
      }),
    ).toBe('unstable 38550,0,0 65535,0,0 65535,10280,0 65535,65535,2570 100 200');
  });

  it('strobe: standby flash hz flashMs extMs retMs (defaults BLACK WHITE 15 1 300 800)', () => {
    expect(
      buildStrobeStyleString({
        standbyColor: BLACK,
        flashColor: WHITE,
        flashFrequencyHz: 15,
        flashMs: 1,
        extensionMs: 300,
        retractionMs: 800,
      }),
    ).toBe('strobe 0,0,0 65535,65535,65535 15 1 300 800');
  });

  it('strobe: never emits a zero frequency (StrobeF divides 1000 by it)', () => {
    expect(
      buildStrobeStyleString({ standbyColor: BLACK, flashColor: WHITE, flashFrequencyHz: 0, flashMs: 0, extensionMs: 0, retractionMs: 0 }),
    ).toBe('strobe 0,0,0 65535,65535,65535 1 0 0 0');
  });

  it('cycle: start base flicker blast lockup (defaults Blue Blue Cyan Rgb<255,50,50> Red)', () => {
    expect(
      buildCycleStyleString({
        startColor: { r: 0, g: 0, b: 255 },
        baseColor: { r: 0, g: 0, b: 255 },
        flickerColor: { r: 0, g: 255, b: 255 },
        blastColor: { r: 255, g: 50, b: 50 },
        lockupColor: { r: 255, g: 0, b: 0 },
      }),
    ).toBe('cycle 0,0,65535 0,0,65535 0,65535,65535 65535,12850,12850 65535,0,0');
  });

  it('rainbow: extMs retMs', () => {
    expect(buildRainbowStyleString({ extensionMs: 300, retractionMs: 800 })).toBe('rainbow 300 800');
  });
});

// ─── IsValidStyleString port ───

describe('isValidRuntimeStyleString (port of current_preset.h:38-51)', () => {
  it.each([
    'builtin 0 1',
    'rainbow 300 800',
    'advanced 65535,0,0 0,0,0 0,0,0 0,0,0 0 0,0,0 0,0,0 0,0,0 0 0 0,0,0',
    'fire 1,2,3 4,5,6',
    'abcd ',
  ])('accepts %j', (s) => {
    expect(isValidRuntimeStyleString(s)).toBe(true);
  });

  it.each([
    ['too short', 'fire'],
    ['verb with no arguments (loop hits NUL before a space)', 'rainbow'],
    ['uppercase verb', 'Advanced 1'],
    ['digit in verb', 'adv4nced 1'],
    ['tilde default marker', 'advanced ~ 1'],
    ['negative number', 'standard -1'],
    ['decimal point', 'standard 1.5'],
    ['tab separator', 'standard\t1 2'],
    ['letters in args', 'fire 1,2,3x'],
    ['leading space', ' fire 1,2,3'],
  ])('rejects %s', (_label, s) => {
    expect(isValidRuntimeStyleString(s)).toBe(false);
  });
});

// ─── Mapper — pinned derivations on synthetic configs ───

describe('mapBladeConfigToRuntimeStyle — pinned derivations', () => {
  it('stable → advanced, faithful, solid hilt/mid/tip', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'stable', baseColor: { r: 255, g: 0, b: 128 }, ignitionMs: 250, retractionMs: 700 }),
    );
    expect(m.verb).toBe('advanced');
    expect(m.fidelity).toBe('faithful');
    expect(m.styleString).toBe(
      'advanced 65535,0,32896 65535,0,32896 65535,0,32896 65535,65535,65535 10 65535,65535,65535 65535,56540,20560 65535,65535,65535 250 700 65535,65535,65535',
    );
  });

  it('unstable → unstable verb with the documented color derivation', () => {
    // warm = base×150/255, warmer = base, hot = Mix<10000>(base, White),
    // sparks = base 60% toward white; ext/ret from the config.
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'unstable', baseColor: { r: 200, g: 10, b: 0 }, ignitionMs: 500, retractionMs: 400 }),
    );
    expect(m.verb).toBe('unstable');
    expect(m.fidelity).toBe('faithful');
    expect(m.styleString).toBe(
      'unstable 30235,1512,0 51400,2570,0 55714,21785,20000 59881,40349,39321 500 400',
    );
  });

  it('fire → fire verb: warm = base, hot = the codegen core yellow Rgb<255,200,50>', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'fire', baseColor: { r: 255, g: 100, b: 40 } }));
    expect(m).toMatchObject({ verb: 'fire', fidelity: 'faithful' });
    expect(m.styleString).toBe('fire 65535,25700,10280 65535,51400,12850');
  });

  it('pulse → cycle (audio-reactive), approximate', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'pulse', baseColor: { r: 0, g: 230, b: 30 } }));
    expect(m).toMatchObject({ verb: 'cycle', fidelity: 'approximate' });
    // quiet (arg 3) = base, loud (arg 2) = Mix<Int<8000>, base, White>
    expect(m.styleString).toBe(
      'cycle 0,59110,7710 16000,60679,21827 0,59110,7710 65535,65535,65535 65535,56540,20560',
    );
    expect(m.note).toMatch(/audio-reactive/i);
  });

  it('aurora → cycle between the base and a +50° hue tint, approximate', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'aurora', baseColor: { r: 0, g: 180, b: 100 } }));
    expect(m).toMatchObject({ verb: 'cycle', fidelity: 'approximate' });
    // base hue 153.3° → tint = 50/50 blend of base and hsl(203.3°, 80, 55) = (48,161,232)
    expect(m.styleString).toBe(
      'cycle 0,46260,25700 6168,43819,42662 0,46260,25700 65535,65535,65535 65535,56540,20560',
    );
  });

  it('aurora keeps a blue preset blue-violet rather than greying it out', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'aurora', baseColor: { r: 0, g: 115, b: 250 } }));
    const loud = m.styleString.split(' ')[2]!.split(',').map(Number);
    // Blue channel stays dominant in the tint.
    expect(loud[2]).toBeGreaterThan(loud[0]!);
    expect(loud[2]).toBeGreaterThan(loud[1]!);
  });

  it('prism → rainbow, faithful, timing carried', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'prism', ignitionMs: 300, retractionMs: 400 }));
    expect(m).toMatchObject({ verb: 'rainbow', fidelity: 'faithful', styleString: 'rainbow 300 400' });
  });

  it('darksaber → advanced White / near-black / White, approximate', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'darksaber', baseColor: { r: 5, g: 5, b: 5 }, lockupColor: { r: 180, g: 180, b: 200 }, ignitionMs: 500, retractionMs: 400 }),
    );
    expect(m).toMatchObject({ verb: 'advanced', fidelity: 'approximate' });
    expect(m.styleString).toBe(
      'advanced 65535,65535,65535 1285,1285,1285 65535,65535,65535 65535,65535,65535 10 65535,65535,65535 46260,46260,51400 65535,65535,65535 500 400 65535,65535,65535',
    );
  });

  it('rotoscope → advanced solid base, approximate', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'rotoscope' }));
    expect(m).toMatchObject({ verb: 'advanced', fidelity: 'approximate' });
    expect(m.styleString.startsWith('advanced 0,35980,65535 0,35980,65535 0,35980,65535 ')).toBe(true);
  });

  it('gradient with stops on hilt/middle/tip → exact 3-stop advanced, faithful', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({
        style: 'gradient',
        gradientStops: [
          { position: 1, color: { r: 255, g: 120, b: 20 } },
          { position: 0, color: { r: 30, g: 10, b: 5 } },
          { position: 0.5, color: { r: 180, g: 40, b: 10 } },
        ],
      }),
    );
    expect(m).toMatchObject({ verb: 'advanced', fidelity: 'faithful' });
    expect(m.styleString.startsWith('advanced 7710,2570,1285 46260,10280,2570 65535,30840,5140 ')).toBe(true);
  });

  it('gradient with more stops than the verb holds → sampled, approximate', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({
        style: 'gradient',
        gradientStops: [
          { position: 0, color: { r: 255, g: 0, b: 0 } },
          { position: 0.25, color: { r: 255, g: 255, b: 0 } },
          { position: 0.5, color: { r: 0, g: 255, b: 0 } },
          { position: 0.75, color: { r: 0, g: 255, b: 255 } },
          { position: 1, color: { r: 0, g: 0, b: 255 } },
        ],
      }),
    );
    expect(m).toMatchObject({ verb: 'advanced', fidelity: 'approximate' });
    expect(m.styleString.startsWith('advanced 65535,0,0 0,65535,0 0,0,65535 ')).toBe(true);
    expect(m.note).toMatch(/5-stop gradient sampled/);
  });

  it('gradient base → gradientEnd, with the midpoint as the middle stop', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'gradient', baseColor: { r: 0, g: 0, b: 255 }, gradientEnd: { r: 255, g: 0, b: 0 } }),
    );
    expect(m.fidelity).toBe('faithful');
    expect(m.styleString.startsWith('advanced 0,0,65535 32768,0,32768 65535,0,0 ')).toBe(true);
  });

  it('gradient without an end color uses the compile+flash default brighten(base, 0.4)', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'gradient', baseColor: { r: 200, g: 30, b: 30 } }));
    // tip = (222,120,120); mid = (211,75,75)
    expect(m.styleString.startsWith('advanced 51400,7710,7710 54227,19275,19275 57054,30840,30840 ')).toBe(true);
  });

  it('sithFlicker → strobe at the flicker rate with even on/off halves', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'sithFlicker', baseColor: { r: 255, g: 0, b: 0 }, flickerRate: 5, flickerMinBright: 0.1 }),
    );
    expect(m).toMatchObject({ verb: 'strobe', fidelity: 'approximate' });
    // off = 1000/10 = 100 ms, on = 100 ms → exactly 5 Hz
    expect(m.styleString).toBe('strobe 6554,0,0 65535,0,0 10 100 300 800');
  });

  it('tempoLock → strobe whose on+off period lands on the BPM', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'tempoLock', baseColor: { r: 0, g: 0, b: 255 }, tempoBpm: 100, tempoDepth: 0.5 }),
    );
    // 100 BPM = 600 ms: off = 1000/3 = 333 ms (integer math), on = 267 ms
    expect(m.styleString).toBe('strobe 0,0,32768 0,0,65535 3 267 300 800');
  });

  it('styles with no runtime verb → advanced colors-only', () => {
    for (const style of ['photon', 'helix', 'vortex', 'gravity', 'automata', 'neutron', 'tidal']) {
      const m = mapBladeConfigToRuntimeStyle(cfg({ style }));
      expect(m).toMatchObject({ verb: 'advanced', fidelity: 'colors-only' });
      expect(m.note).toMatch(/firmware flash/);
    }
  });

  it('an unknown style id degrades to a labeled colors-only blade', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'fromTheFuture' }));
    expect(m).toMatchObject({ verb: 'advanced', fidelity: 'colors-only' });
    expect(m.note).toContain('fromTheFuture');
  });

  it('modulation bindings downgrade faithful → approximate and say so', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'stable', modulation: { bindings: [{ id: 'b1', source: 'swing', target: 'shimmer' }] } }),
    );
    expect(m.fidelity).toBe('approximate');
    expect(m.note).toMatch(/Modulation bindings/);
  });

  it('imported raw ProffieOS code downgrades faithful → approximate and says so', () => {
    const m = mapBladeConfigToRuntimeStyle(cfg({ style: 'fire', importedRawCode: 'StylePtr<Red>()' }));
    expect(m.fidelity).toBe('approximate');
    expect(m.note).toMatch(/Imported ProffieOS code/);
  });

  it('non-finite timing never leaks into the string', () => {
    const m = mapBladeConfigToRuntimeStyle(
      cfg({ style: 'unstable', ignitionMs: Number.NaN, retractionMs: Number.POSITIVE_INFINITY }),
    );
    expectWellFormed(m.styleString, 'unstable');
    expect(m.styleString.endsWith(' 100 200')).toBe(true);
  });
});

// ─── Mapper — real gallery presets ───

describe('mapBladeConfigToRuntimeStyle — representative gallery presets', () => {
  const byId = new Map(ALL_PRESETS.map((p) => [p.id, p]));
  const cases: Array<[string, RuntimeVerb, string]> = [
    ['st-kylo-ren', 'unstable', 'faithful'],
    ['ot-luke-anh', 'advanced', 'approximate'], // rotoscope
    ['animated-din-djarin-darksaber', 'advanced', 'approximate'],
    ['eu-orla-jareni-white', 'rainbow', 'faithful'], // prism
    ['eu-shin-hati-orange', 'fire', 'faithful'],
    ['animated-grogu', 'cycle', 'approximate'], // pulse
    ['creative-aurora-borealis', 'cycle', 'approximate'],
    ['st-praetorian-guard', 'fire', 'approximate'], // plasma
  ];

  it.each(cases)('%s → %s (%s)', (id, verb, fidelity) => {
    const preset = byId.get(id);
    expect(preset, `gallery preset ${id} exists`).toBeDefined();
    const m = mapBladeConfigToRuntimeStyle(preset!.config);
    expect(m.verb).toBe(verb);
    expect(m.fidelity).toBe(fidelity);
    expectWellFormed(m.styleString, verb);
  });

  it('every gallery preset maps to a well-formed 7.12 style string', () => {
    for (const preset of ALL_PRESETS) {
      const m = mapBladeConfigToRuntimeStyle(preset.config);
      expectWellFormed(m.styleString, m.verb);
      expect(m.note.length).toBeGreaterThan(0);
    }
  });
});

// ─── Slot table ───

describe('RUNTIME_VERB_SLOTS', () => {
  it('only advanced carries every knob', () => {
    const full = (Object.keys(RUNTIME_VERB_SLOTS) as RuntimeVerb[]).filter((v) =>
      Object.values(RUNTIME_VERB_SLOTS[v]).every(Boolean),
    );
    expect(full).toEqual(['advanced']);
  });

  it('matches the templates: fire has no timing, cycle has no clash, rainbow has no colors', () => {
    expect(RUNTIME_VERB_SLOTS.fire.ignitionMs).toBe(false);
    expect(RUNTIME_VERB_SLOTS.cycle.clashColor).toBe(false);
    expect(RUNTIME_VERB_SLOTS.cycle.blastColor).toBe(true);
    expect(RUNTIME_VERB_SLOTS.rainbow.baseColor).toBe(false);
    expect(RUNTIME_VERB_SLOTS.unstable.retractionMs).toBe(true);
  });
});
