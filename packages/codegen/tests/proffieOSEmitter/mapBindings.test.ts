// ─── ProffieOS Emitter — mapBindings tests ───
//
// Exercises Option B+: mappable built-ins produce the expected
// ProffieOS driver shape, unmappable bindings carry a reason + a
// reasonable snapshot value.

import { describe, it, expect } from 'vitest';

import {
  mapBindings,
  computeSnapshotValue,
  MAP_BINDINGS_REASONS,
} from '../../src/proffieOSEmitter/index.js';
import type {
  ModulationBinding,
  BuiltInModulatorId,
  ExpressionNode,
  EvalContext,
  BladeConfig,
  ModulatorId,
  BindingCombinator,
} from '../../src/proffieOSEmitter/index.js';

// Engine type imports for the drift sentinel — available at test time
// via the vitest alias in packages/codegen/vitest.config.ts.
import type {
  ModulationBinding as EngineModulationBinding,
  BuiltInModulatorId as EngineBuiltInModulatorId,
  BindingCombinator as EngineBindingCombinator,
  ExpressionNode as EngineExpressionNode,
} from '@kyberstation/engine';

// ─── Drift sentinel ─────────────────────────────────────────────────
//
// The emitter mirrors the engine's modulation types because
// `node-linker=hoisted` + `symlink=false` prevents cross-package source
// imports in codegen/src. This test fails typecheck if the mirror
// drifts from the engine's canonical types (CLAUDE.md decision #1
// pattern; same shape as tests/typeIdentity.test.ts for BladeConfig).

type _BindingMirrorStaysWide = ModulationBinding extends EngineModulationBinding ? true : never;
const _bindingMirrorIsWideEnough: _BindingMirrorStaysWide = true;

type _BuiltInMirrorStaysWide = BuiltInModulatorId extends EngineBuiltInModulatorId ? true : never;
const _builtInMirrorIsWideEnough: _BuiltInMirrorStaysWide = true;

type _CombinatorMirrorStaysWide = BindingCombinator extends EngineBindingCombinator ? true : never;
const _combinatorMirrorIsWideEnough: _CombinatorMirrorStaysWide = true;

type _ExprMirrorStaysWide = ExpressionNode extends EngineExpressionNode ? true : never;
const _exprMirrorIsWideEnough: _ExprMirrorStaysWide = true;

// Reverse check for ModulatorId — ensure the emitter is willing to
// accept everything the engine can produce.
type _EngineModsFitEmitter = EngineBuiltInModulatorId extends BuiltInModulatorId ? true : never;
const _engineBuiltInsFit: _EngineModsFitEmitter = true;

// ─── Helpers ────────────────────────────────────────────────────────

function makeBinding(overrides: Partial<ModulationBinding> = {}): ModulationBinding {
  return {
    id: overrides.id ?? `binding-${Math.random().toString(36).slice(2, 8)}`,
    source: overrides.source !== undefined ? overrides.source : 'swing',
    expression: overrides.expression ?? null,
    target: overrides.target ?? 'shimmer',
    combinator: overrides.combinator ?? 'add',
    amount: overrides.amount ?? 1,
    label: overrides.label,
    colorVar: overrides.colorVar,
    bypassed: overrides.bypassed,
    triggerEvent: overrides.triggerEvent,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
    ...overrides,
  };
}

function makeEvalCtx(
  overrides: Partial<EvalContext> & { modulatorValues?: Record<string, number> } = {},
): EvalContext {
  const defaults: Record<string, number> = {
    swing: 0.5,
    angle: 0.2,
    twist: -0.1,
    sound: 0.7,
    battery: 0.9,
    time: 1000,
    clash: 0.0,
    lockup: 0.0,
    preon: 0.0,
    ignition: 0.0,
    retraction: 0.0,
    // Wave 8 — event modulators default to 0 (no event firing).
    'aux-click': 0.0,
    'aux-hold': 0.0,
    'aux-double-click': 0.0,
    'gesture-twist': 0.0,
    'gesture-stab': 0.0,
    'gesture-swing': 0.0,
    'gesture-clash': 0.0,
    'gesture-shake': 0.0,
  };
  const merged = { ...defaults, ...(overrides.modulatorValues ?? {}) };
  const map = new Map<ModulatorId, number>();
  for (const [k, v] of Object.entries(merged)) map.set(k as ModulatorId, v);
  return {
    modulators: map,
    config: overrides.config,
    frame: overrides.frame ?? 0,
  };
}

// ─── Fixtures ───────────────────────────────────────────────────────

const ALL_BUILTINS: readonly BuiltInModulatorId[] = [
  'swing',
  'angle',
  'twist',
  'sound',
  'battery',
  'time',
  'clash',
  'lockup',
  'preon',
  'ignition',
  'retraction',
];

// ─── Tests ──────────────────────────────────────────────────────────

describe('mapBindings — mapping table coverage', () => {
  it('maps all 11 built-in modulators into a mappable/unmappable split with no overlap', () => {
    const bindings = ALL_BUILTINS.map((id) =>
      makeBinding({ id: `b-${id}`, source: id, target: 'shimmer' }),
    );
    const config = makeConfig();
    const ctx = makeEvalCtx();

    const result = mapBindings(bindings, config, ctx);

    // Every input binding appears in exactly one of the two buckets.
    const seenIds = new Set<string>();
    for (const m of result.mappable) {
      expect(seenIds.has(m.binding.id)).toBe(false);
      seenIds.add(m.binding.id);
    }
    for (const u of result.unmappable) {
      expect(seenIds.has(u.binding.id)).toBe(false);
      seenIds.add(u.binding.id);
    }
    expect(seenIds.size).toBe(bindings.length);
  });

  it('maps swing / angle / twist / sound / battery / clash (6 of 11)', () => {
    const mappableIds: BuiltInModulatorId[] = [
      'swing', 'angle', 'twist', 'sound', 'battery', 'clash',
    ];
    const bindings = mappableIds.map((id) =>
      makeBinding({ id: `b-${id}`, source: id }),
    );
    const result = mapBindings(bindings, makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(mappableIds.length);
    expect(result.unmappable.length).toBe(0);

    // Each result row carries the original binding + correct target.
    for (const m of result.mappable) {
      expect(m.binding.target).toBe('shimmer');
      expect(m.targetPath).toBe('shimmer');
      expect(m.astPatch).toBeTruthy();
    }
  });

  it('marks lockup / preon / ignition / retraction / time as unmappable', () => {
    const unmappableIds: BuiltInModulatorId[] = [
      'lockup', 'preon', 'ignition', 'retraction', 'time',
    ];
    const bindings = unmappableIds.map((id) =>
      makeBinding({ id: `b-${id}`, source: id }),
    );
    const result = mapBindings(bindings, makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(unmappableIds.length);

    // Each carries a non-empty reason string.
    for (const u of result.unmappable) {
      expect(u.reason).toBeTruthy();
      expect(typeof u.reason).toBe('string');
      expect(u.reason.length).toBeGreaterThan(0);
    }

    // Lockup / preon / ignition / retraction use the "handled" copy.
    const lockup = result.unmappable.find((u) => u.binding.source === 'lockup');
    expect(lockup?.reason).toBe(MAP_BINDINGS_REASONS.LOCKUP_V11);

    const preon = result.unmappable.find((u) => u.binding.source === 'preon');
    expect(preon?.reason).toBe(MAP_BINDINGS_REASONS.PREON_HANDLED);

    const ignition = result.unmappable.find((u) => u.binding.source === 'ignition');
    expect(ignition?.reason).toBe(MAP_BINDINGS_REASONS.IGNITION_HANDLED);

    const retraction = result.unmappable.find((u) => u.binding.source === 'retraction');
    expect(retraction?.reason).toBe(MAP_BINDINGS_REASONS.RETRACTION_HANDLED);
  });
});

describe('mapBindings — AST patch shape for swing → shimmer', () => {
  it('wraps SwingSpeed<400> in Scale<> scaled by amount', () => {
    const binding = makeBinding({
      source: 'swing',
      target: 'shimmer',
      amount: 0.6,
      combinator: 'add',
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    const patch = result.mappable[0].astPatch;

    // Outer: Scale<driver, Int<0>, Int<hi>>
    expect(patch.name).toBe('Scale');
    expect(patch.type).toBe('function');
    expect(patch.args).toHaveLength(3);

    // First arg: SwingSpeed<Int<400>> — the driver.
    const driver = patch.args[0];
    expect(driver.name).toBe('SwingSpeed');
    expect(driver.type).toBe('function');

    // Second arg: Int<0>
    const lo = patch.args[1];
    expect(lo.name).toBe('Int');
    expect(lo.args[0].name).toBe('0');

    // Third arg: Int<round(0.6 * 32768)> = Int<19661>
    const hi = patch.args[2];
    expect(hi.name).toBe('Int');
    expect(hi.args[0].name).toBe(String(Math.round(0.6 * 32768)));
  });

  it('clamps amount > 1 to 1 and amount < 0 to 0', () => {
    const hot = mapBindings(
      [makeBinding({ source: 'swing', amount: 2.5 })],
      makeConfig(),
      makeEvalCtx(),
    );
    const hotHi = hot.mappable[0].astPatch.args[2].args[0].name;
    expect(hotHi).toBe('32768');

    const cold = mapBindings(
      [makeBinding({ source: 'swing', amount: -0.3 })],
      makeConfig(),
      makeEvalCtx(),
    );
    const coldHi = cold.mappable[0].astPatch.args[2].args[0].name;
    expect(coldHi).toBe('0');
  });
});

describe('mapBindings — other built-in driver shapes', () => {
  it('angle → BladeAngle<>', () => {
    const result = mapBindings(
      [makeBinding({ source: 'angle' })],
      makeConfig(),
      makeEvalCtx(),
    );
    expect(result.mappable[0].astPatch.args[0].name).toBe('BladeAngle');
  });

  it('twist → TwistAngle<>', () => {
    const result = mapBindings(
      [makeBinding({ source: 'twist' })],
      makeConfig(),
      makeEvalCtx(),
    );
    expect(result.mappable[0].astPatch.args[0].name).toBe('TwistAngle');
  });

  it('sound → NoisySoundLevel', () => {
    const result = mapBindings(
      [makeBinding({ source: 'sound' })],
      makeConfig(),
      makeEvalCtx(),
    );
    expect(result.mappable[0].astPatch.args[0].name).toBe('NoisySoundLevel');
  });

  it('battery → BatteryLevel', () => {
    const result = mapBindings(
      [makeBinding({ source: 'battery' })],
      makeConfig(),
      makeEvalCtx(),
    );
    expect(result.mappable[0].astPatch.args[0].name).toBe('BatteryLevel');
  });

  it('clash → ClashImpactF<>', () => {
    const result = mapBindings(
      [makeBinding({ source: 'clash' })],
      makeConfig(),
      makeEvalCtx(),
    );
    expect(result.mappable[0].astPatch.args[0].name).toBe('ClashImpactF');
  });
});

describe('mapBindings — expression handling', () => {
  it('recognizes sin(time * k) * 0.5 + 0.5 as a breathing envelope and maps to Sin<Int<period>>', () => {
    // sin(time * 0.001) * 0.5 + 0.5 → period ≈ 2π / 0.001 ≈ 6283 ms
    const breathingExpr: ExpressionNode = {
      kind: 'binary', op: '+',
      lhs: {
        kind: 'binary', op: '*',
        lhs: {
          kind: 'call', fn: 'sin',
          args: [{
            kind: 'binary', op: '*',
            lhs: { kind: 'var', id: 'time' },
            rhs: { kind: 'literal', value: 0.001 },
          }],
        },
        rhs: { kind: 'literal', value: 0.5 },
      },
      rhs: { kind: 'literal', value: 0.5 },
    };

    const binding = makeBinding({
      source: null,
      expression: breathingExpr,
      target: 'shimmer',
      amount: 1.0,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    expect(result.unmappable.length).toBe(0);

    const patch = result.mappable[0].astPatch;
    expect(patch.name).toBe('Scale');
    const driver = patch.args[0];
    expect(driver.name).toBe('Sin');
    // period = round(2π / 0.001) = 6283
    const periodArg = driver.args[0];
    expect(periodArg.name).toBe('Int');
    expect(periodArg.args[0].name).toBe('6283');
    expect(result.mappable[0].note).toMatch(/Breathing envelope/);
  });

  it('accepts k * time ordering as well as time * k', () => {
    const expr: ExpressionNode = {
      kind: 'binary', op: '+',
      lhs: {
        kind: 'binary', op: '*',
        lhs: {
          kind: 'call', fn: 'sin',
          args: [{
            kind: 'binary', op: '*',
            lhs: { kind: 'literal', value: 0.002 },
            rhs: { kind: 'var', id: 'time' },
          }],
        },
        rhs: { kind: 'literal', value: 0.5 },
      },
      rhs: { kind: 'literal', value: 0.5 },
    };
    const binding = makeBinding({ source: null, expression: expr });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());
    expect(result.mappable.length).toBe(1);
  });

  it('marks non-breathing expressions as unmappable with EXPRESSION_V11 reason', () => {
    // clamp(swing * 2, 0, 1) — valid expression but not the idiom we recognise.
    const expr: ExpressionNode = {
      kind: 'call', fn: 'clamp',
      args: [
        {
          kind: 'binary', op: '*',
          lhs: { kind: 'var', id: 'swing' },
          rhs: { kind: 'literal', value: 2 },
        },
        { kind: 'literal', value: 0 },
        { kind: 'literal', value: 1 },
      ],
    };
    const binding = makeBinding({
      source: null,
      expression: expr,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(MAP_BINDINGS_REASONS.EXPRESSION_V11);
    // Snapshot value: clamp(0.5 * 2, 0, 1) = clamp(1, 0, 1) = 1, combinator replace, amount 1.
    expect(result.unmappable[0].snapshotValue).toBeCloseTo(1, 5);
  });

  it('marks expressions that reference custom modulators as chain → MODULATOR_CHAIN', () => {
    const expr: ExpressionNode = {
      kind: 'binary', op: '+',
      lhs: { kind: 'var', id: 'swing' },
      rhs: { kind: 'var', id: 'my-custom-lfo' },
    };
    const binding = makeBinding({ source: null, expression: expr });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(MAP_BINDINGS_REASONS.MODULATOR_CHAIN);
  });
});

describe('mapBindings — bypassed and invalid bindings', () => {
  it('bypassed bindings land in unmappable with BYPASSED reason and a valid snapshot', () => {
    const binding = makeBinding({
      source: 'swing',
      target: 'shimmer',
      bypassed: true,
      amount: 1,
      combinator: 'replace',
    });
    const result = mapBindings(
      [binding],
      makeConfig({ shimmer: 0.3 }),
      makeEvalCtx({ modulatorValues: { swing: 0.5 } }),
    );

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(MAP_BINDINGS_REASONS.BYPASSED);
    // replace: wet = 0.5 * 1 = 0.5
    expect(result.unmappable[0].snapshotValue).toBeCloseTo(0.5, 5);
  });

  it('bindings missing both source and expression fall through to INVALID_BINDING', () => {
    const binding = makeBinding({ source: null, expression: null });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(MAP_BINDINGS_REASONS.INVALID_BINDING);
  });

  it('unknown modulator IDs fall through to UNKNOWN_SOURCE with the id in the reason', () => {
    const binding = makeBinding({ source: 'my-custom-beat' as ModulatorId });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toContain('my-custom-beat');
  });
});

describe('mapBindings — snapshot values', () => {
  it('computes reasonable snapshot values for unmappable built-ins', () => {
    const bindings: ModulationBinding[] = [
      makeBinding({
        id: 'lockup-1', source: 'lockup', target: 'shimmer',
        combinator: 'replace', amount: 1,
      }),
      makeBinding({
        id: 'preon-1', source: 'preon', target: 'shimmer',
        combinator: 'add', amount: 1,
      }),
      makeBinding({
        id: 'ignition-1', source: 'ignition', target: 'shimmer',
        combinator: 'multiply', amount: 0.5,
      }),
    ];
    const config = makeConfig({ shimmer: 0.25 });
    const ctx = makeEvalCtx({ modulatorValues: { lockup: 0, preon: 0.4, ignition: 0.8 } });
    const result = mapBindings(bindings, config, ctx);

    expect(result.unmappable).toHaveLength(3);

    // lockup = 0, combinator replace, amount 1 → 0
    const lockup = result.unmappable.find((u) => u.binding.id === 'lockup-1');
    expect(lockup?.snapshotValue).toBe(0);

    // preon = 0.4, combinator add, amount 1 → 0.25 + 0.4 = 0.65
    const preon = result.unmappable.find((u) => u.binding.id === 'preon-1');
    expect(preon?.snapshotValue).toBeCloseTo(0.65, 5);

    // ignition = 0.8, combinator multiply, amount 0.5 → 0.25 * 0.4 = 0.1
    const ignition = result.unmappable.find((u) => u.binding.id === 'ignition-1');
    expect(ignition?.snapshotValue).toBeCloseTo(0.1, 5);
  });

  it('snapshot falls back to static config value when driver evaluates to NaN', () => {
    // Division by zero produces Infinity/NaN — the sanitiser kicks in.
    const expr: ExpressionNode = {
      kind: 'binary', op: '/',
      lhs: { kind: 'var', id: 'swing' },
      rhs: { kind: 'literal', value: 0 },
    };
    const binding = makeBinding({
      source: null, expression: expr,
      target: 'shimmer',
      combinator: 'add', amount: 1,
    });
    const config = makeConfig({ shimmer: 0.42 });
    const result = mapBindings([binding], config, makeEvalCtx());

    // Driver is Infinity → sanitiser produces a finite fallback.
    expect(Number.isFinite(result.unmappable[0].snapshotValue)).toBe(true);
  });

  it('min/max combinators produce expected snapshots', () => {
    const minBinding = makeBinding({
      id: 'min', source: 'lockup',
      target: 'shimmer', combinator: 'min', amount: 1,
    });
    const maxBinding = makeBinding({
      id: 'max', source: 'lockup',
      target: 'shimmer', combinator: 'max', amount: 1,
    });
    const config = makeConfig({ shimmer: 0.5 });
    const ctx = makeEvalCtx({ modulatorValues: { lockup: 0.3 } });

    const minResult = mapBindings([minBinding], config, ctx).unmappable[0];
    const maxResult = mapBindings([maxBinding], config, ctx).unmappable[0];

    expect(minResult.snapshotValue).toBeCloseTo(0.3, 5); // min(0.5, 0.3)
    expect(maxResult.snapshotValue).toBeCloseTo(0.5, 5); // max(0.5, 0.3)
  });

  it('snapshot reads dotted paths (baseColor.r)', () => {
    // Using a built-in that would be mappable, but bypassed to force snapshot.
    const binding = makeBinding({
      source: 'swing', target: 'baseColor.r',
      combinator: 'add', amount: 0.5, bypassed: true,
    });
    const config = makeConfig({ baseColor: { r: 100, g: 140, b: 255 } });
    const result = mapBindings(
      [binding],
      config,
      makeEvalCtx({ modulatorValues: { swing: 0.4 } }),
    );
    // 100 + (0.4 * 0.5) = 100.2
    expect(result.unmappable[0].snapshotValue).toBeCloseTo(100.2, 5);
  });
});

describe('mapBindings — mixed fixture (10+ bindings / all 11 modulators × common targets)', () => {
  it('splits a 14-binding fixture into the expected buckets', () => {
    const bindings: ModulationBinding[] = [
      // Mappable built-ins.
      makeBinding({ id: '1', source: 'swing',   target: 'shimmer' }),
      makeBinding({ id: '2', source: 'angle',   target: 'baseColor.r' }),
      makeBinding({ id: '3', source: 'twist',   target: 'baseColor.g' }),
      makeBinding({ id: '4', source: 'sound',   target: 'shimmer' }),
      makeBinding({ id: '5', source: 'battery', target: 'shimmer' }),
      makeBinding({ id: '6', source: 'clash',   target: 'baseColor.b' }),
      // Unmappable built-ins.
      makeBinding({ id: '7',  source: 'lockup',     target: 'shimmer' }),
      makeBinding({ id: '8',  source: 'preon',      target: 'shimmer' }),
      makeBinding({ id: '9',  source: 'ignition',   target: 'shimmer' }),
      makeBinding({ id: '10', source: 'retraction', target: 'shimmer' }),
      makeBinding({ id: '11', source: 'time',       target: 'shimmer' }),
      // Bypassed.
      makeBinding({ id: '12', source: 'swing', target: 'shimmer', bypassed: true }),
      // Unknown source.
      makeBinding({ id: '13', source: 'my-custom-beat' as ModulatorId, target: 'shimmer' }),
      // Invariant violation.
      makeBinding({ id: '14', source: null, expression: null, target: 'shimmer' }),
    ];

    const result = mapBindings(bindings, makeConfig(), makeEvalCtx());

    expect(result.mappable).toHaveLength(6);
    expect(result.unmappable).toHaveLength(8);

    // Every unmappable has a non-empty reason and a finite snapshot.
    for (const u of result.unmappable) {
      expect(u.reason.length).toBeGreaterThan(0);
      expect(Number.isFinite(u.snapshotValue)).toBe(true);
    }

    // Mappable set covers only the six supported built-ins.
    const mappableSources = result.mappable.map((m) => m.binding.source).sort();
    expect(mappableSources).toEqual(
      ['angle', 'battery', 'clash', 'sound', 'swing', 'twist'].sort(),
    );
  });
});

describe('computeSnapshotValue — public pure helper', () => {
  it('evaluates a simple source binding by reading modulators + combining with config', () => {
    const binding = makeBinding({
      source: 'sound', target: 'shimmer',
      combinator: 'add', amount: 0.5,
    });
    const snap = computeSnapshotValue(
      binding,
      makeConfig({ shimmer: 0.1 }),
      makeEvalCtx({ modulatorValues: { sound: 0.8 } }),
    );
    // 0.1 + (0.8 * 0.5) = 0.5
    expect(snap).toBeCloseTo(0.5, 5);
  });

  it('evaluates an expression binding', () => {
    const expr: ExpressionNode = {
      kind: 'call', fn: 'clamp',
      args: [
        {
          kind: 'binary', op: '*',
          lhs: { kind: 'var', id: 'swing' },
          rhs: { kind: 'literal', value: 3 },
        },
        { kind: 'literal', value: 0 },
        { kind: 'literal', value: 1 },
      ],
    };
    const binding = makeBinding({
      source: null, expression: expr,
      target: 'shimmer', combinator: 'replace', amount: 1,
    });
    const snap = computeSnapshotValue(
      binding,
      makeConfig({ shimmer: 0.2 }),
      makeEvalCtx({ modulatorValues: { swing: 0.4 } }),
    );
    // clamp(0.4 * 3, 0, 1) = clamp(1.2, 0, 1) = 1
    expect(snap).toBeCloseTo(1, 5);
  });
});

// ─── Wave 8 — triggerEvent emit path ─────────────────────────────────

describe('mapBindings — Wave 8 triggerEvent emit path', () => {
  it('emits EffectPulseF<EFFECT_BLAST> wrapper for aux-click + click trigger', () => {
    const binding = makeBinding({
      source: 'aux-click',
      triggerEvent: 'click',
      target: 'shimmer',
      amount: 1.0,
      combinator: 'add',
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    expect(result.unmappable.length).toBe(0);

    // Outer: Scale<EffectPulseF<EFFECT_BLAST>, Int<0>, Int<32768>>
    const patch = result.mappable[0].astPatch;
    expect(patch.name).toBe('Scale');
    expect(patch.args).toHaveLength(3);

    // Driver: EffectPulseF<EFFECT_BLAST>
    const driver = patch.args[0];
    expect(driver.name).toBe('EffectPulseF');
    expect(driver.args).toHaveLength(1);
    expect(driver.args[0].name).toBe('EFFECT_BLAST');
    expect(driver.args[0].type).toBe('raw');

    // Note carries the (event → EFFECT_*) mapping.
    expect(result.mappable[0].note).toMatch(/click.*EFFECT_BLAST/);
  });

  it('emits TransitionEffectL<TrInstant, ..., EFFECT_FORCE> wrapper for aux-hold + long-press trigger', () => {
    const binding = makeBinding({
      source: 'aux-hold',
      triggerEvent: 'long-press',
      target: 'shimmer',
      amount: 0.5,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    const driver = result.mappable[0].astPatch.args[0];
    expect(driver.name).toBe('TransitionEffectL');
    expect(driver.args).toHaveLength(3);
    expect(driver.args[0].name).toBe('TrInstant');
    expect(driver.args[2].name).toBe('EFFECT_FORCE');
  });

  it('emits Trigger<EFFECT_USER6, ...> wrapper for gesture-shake + shake trigger', () => {
    const binding = makeBinding({
      source: 'gesture-shake',
      triggerEvent: 'shake',
      target: 'shimmer',
      amount: 1.0,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    const driver = result.mappable[0].astPatch.args[0];
    expect(driver.name).toBe('Trigger');
    expect(driver.args[0].name).toBe('EFFECT_USER6');
  });

  it('routes gesture-stab + stab trigger to EFFECT_STAB', () => {
    const binding = makeBinding({
      source: 'gesture-stab',
      triggerEvent: 'stab',
      target: 'shimmer',
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    const driver = result.mappable[0].astPatch.args[0];
    expect(driver.args[0].name).toBe('EFFECT_STAB');
  });

  it('drops triggerEvent when source is a continuous (non-event) modulator', () => {
    // `triggerEvent: 'click'` with `source: 'swing'` is invalid per the
    // engine's isValidTriggerEventBinding rules. Codegen mirrors the
    // rejection and routes to the snapshot path.
    const binding = makeBinding({
      source: 'swing',
      triggerEvent: 'click',
      target: 'shimmer',
      combinator: 'add',
      amount: 1,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(
      MAP_BINDINGS_REASONS.TRIGGER_EVENT_NON_EVENT_SOURCE,
    );
  });

  it('falls aux/gesture source without triggerEvent through to snapshot', () => {
    // A bare event modulator with no `triggerEvent` has no canonical
    // ProffieOS template — the engine's latch+decay value doesn't
    // round-trip to firmware. Snapshot fallback is the correct emit
    // path; today's behavior (pre-Wave-8 mapBindings would have hit
    // this with UNKNOWN_SOURCE) is preserved as snapshot fallback now
    // that the IDs are in BUILTIN_MODULATORS.
    const binding = makeBinding({
      source: 'aux-click',
      // No triggerEvent.
      target: 'shimmer',
      combinator: 'add',
      amount: 1,
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toBe(
      MAP_BINDINGS_REASONS.EVENT_SOURCE_WITHOUT_TRIGGER,
    );
  });

  it('falls unknown triggerEvent through to snapshot with the event name in the reason', () => {
    const binding = makeBinding({
      source: 'aux-click',
      triggerEvent: 'quadruple-click', // Not in PropFileEvent vocabulary.
      target: 'shimmer',
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(0);
    expect(result.unmappable.length).toBe(1);
    expect(result.unmappable[0].reason).toContain('quadruple-click');
  });

  it('preserves legacy behavior (no triggerEvent + continuous source) unchanged', () => {
    // Regression-lock: a continuous source binding without triggerEvent
    // MUST emit the same Scale<SwingSpeed<400>, Int<0>, Int<hi>> shape
    // as pre-Wave-8 — this is the additive-emit-path invariant.
    const binding = makeBinding({
      source: 'swing',
      target: 'shimmer',
      amount: 0.6,
      combinator: 'add',
      // No triggerEvent.
    });
    const result = mapBindings([binding], makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(1);
    const patch = result.mappable[0].astPatch;
    expect(patch.name).toBe('Scale');
    expect(patch.args[0].name).toBe('SwingSpeed');
    // Confirm there's no EFFECT_* wrapper introduced.
    expect(patch.args[0].args[0].name).toBe('400');
  });

  it('every PropFileEvent + valid event-source pair emits a mappable shape', () => {
    // Walk the (event, source) cross-product where source is an event
    // modulator — every pair should map. Picks aux-click as the
    // representative source for all events; the source is decorative
    // for the EFFECT_* mapping (the table keys on triggerEvent only).
    const events: string[] = [
      'click', 'long-press', 'hold', 'double-click', 'triple-click',
      'click-and-hold', 'held-plus-other-click',
      'swing', 'stab', 'thrust', 'twist', 'shake',
    ];
    const bindings = events.map((ev) =>
      makeBinding({
        id: `b-${ev}`,
        source: 'aux-click',
        triggerEvent: ev,
        target: 'shimmer',
      }),
    );
    const result = mapBindings(bindings, makeConfig(), makeEvalCtx());

    expect(result.mappable.length).toBe(events.length);
    expect(result.unmappable.length).toBe(0);

    // Every emitted patch wraps a known ProffieOS effect constant.
    for (const m of result.mappable) {
      const driver = m.astPatch.args[0];
      // Either driver.args[0] (EffectPulseF / Trigger) or driver.args[2]
      // (TransitionEffectL) holds the EFFECT_* constant.
      const effectArg =
        driver.name === 'TransitionEffectL' ? driver.args[2] : driver.args[0];
      expect(effectArg.type).toBe('raw');
      expect(effectArg.name).toMatch(/^EFFECT_[A-Z0-9_]+$/);
    }
  });
});
