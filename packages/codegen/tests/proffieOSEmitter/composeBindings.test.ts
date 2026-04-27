// ─── ProffieOS Binding Composer — v1.1 Core tests ────────────────────
//
// Backfill of the test coverage that PR #60 (Wave 6, AST-level template
// injection) shipped without — the composer test file was authored
// alongside the production code but couldn't be persisted in that
// session due to a worktree path issue. This file restores coverage of:
//
//   1. Pure-function invariants (empty bindings, identity preservation)
//   2. Single binding swing → shimmer @ 60% — Scale<...> grafted at slot
//   3. Breathing heuristic — sin(time * 0.001) * 0.5 + 0.5 → Sin<Int<…>>
//   4. Multi-binding composition — first-binding-wins-the-slot semantic
//   5. Fall-through to deferred — no AST slot for the target
//   6. Purity — same input twice produces identical structural output;
//      the input AST is never mutated
//   7. Result shape — { ast, composed, deferred } matches type
//   8. generateStyleCode integration — end-to-end emission verification
//   9. Snapshot/live boundary — comment-block partitioning correctness
//
// The composer is pure and the AST is structurally cloned on the path
// from root to the substituted slot, so the assertions can mix
// reference-equality checks (for unchanged subtrees / no-op cases) with
// deep structural checks (for grafted slots).

import { describe, it, expect } from 'vitest';

import {
  composeBindings,
} from '../../src/proffieOSEmitter/composeBindings.js';
import {
  mapBindings,
} from '../../src/proffieOSEmitter/mapBindings.js';
import { generateStyleCode } from '../../src/index.js';
import type {
  ModulationBinding,
  EvalContext,
  BladeConfig as EmitterBladeConfig,
  ModulatorId,
  ExpressionNode,
} from '../../src/proffieOSEmitter/index.js';
import type { BladeConfig } from '../../src/ASTBuilder.js';
import type { StyleNode } from '../../src/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeBinding(overrides: Partial<ModulationBinding> = {}): ModulationBinding {
  return {
    id: overrides.id ?? `b-${Math.random().toString(36).slice(2, 10)}`,
    source: overrides.source !== undefined ? overrides.source : 'swing',
    expression: overrides.expression ?? null,
    target: overrides.target ?? 'shimmer',
    combinator: overrides.combinator ?? 'replace',
    amount: overrides.amount ?? 0.6,
    label: overrides.label,
    colorVar: overrides.colorVar,
    bypassed: overrides.bypassed,
  };
}

/** Baseline BladeConfig for emitter mapping (loose `[key:string]: unknown`). */
function makeEmitterConfig(overrides: Record<string, unknown> = {}): EmitterBladeConfig {
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

/** Strict BladeConfig that buildAST + generateStyleCode require. */
function makeStrictConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
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

function makeEvalCtx(overrides: Partial<EvalContext> = {}): EvalContext {
  const defaults: Record<string, number> = {
    swing: 0.5,
    angle: 0.2,
    twist: -0.1,
    sound: 0.7,
    battery: 0.9,
    time: 1000,
    clash: 0,
    lockup: 0,
    preon: 0,
    ignition: 0,
    retraction: 0,
  };
  const map = new Map<ModulatorId, number>();
  for (const [k, v] of Object.entries(defaults)) map.set(k as ModulatorId, v);
  return {
    modulators: map,
    config: overrides.config,
    frame: overrides.frame ?? 0,
  };
}

/** Hand-build the canonical "stable"-style AST: AudioFlicker<Rgb, Mix<Int<16384>, Rgb, White>>. */
function makeStableAst(): StyleNode {
  return {
    type: 'color',
    name: 'AudioFlicker',
    args: [
      { type: 'color', name: 'Rgb', args: [
        { type: 'integer', name: '0', args: [] },
        { type: 'integer', name: '140', args: [] },
        { type: 'integer', name: '255', args: [] },
      ]},
      {
        type: 'mix',
        name: 'Mix',
        args: [
          { type: 'function', name: 'Int', args: [
            { type: 'integer', name: '16384', args: [] },
          ]},
          { type: 'color', name: 'Rgb', args: [
            { type: 'integer', name: '0', args: [] },
            { type: 'integer', name: '140', args: [] },
            { type: 'integer', name: '255', args: [] },
          ]},
          { type: 'raw', name: 'White', args: [] },
        ],
      },
    ],
  };
}

/** Build a Mix-less AST (Rotoscope-shape), used to exercise no-slot fall-through. */
function makeRotoscopeAst(): StyleNode {
  // Rotoscope-ish shape with no Mix<Int, _, _> slot to substitute into.
  return {
    type: 'color',
    name: 'StylePtr',
    args: [
      { type: 'color', name: 'Rgb', args: [
        { type: 'integer', name: '0', args: [] },
        { type: 'integer', name: '140', args: [] },
        { type: 'integer', name: '255', args: [] },
      ]},
    ],
  };
}

/** Recursively look for the first Mix<X, ...> node in an AST. */
function findFirstMix(node: StyleNode): StyleNode | null {
  if (node.type === 'mix' || node.name === 'Mix') return node;
  for (const child of node.args) {
    const found = findFirstMix(child);
    if (found) return found;
  }
  return null;
}

// ─── 1. Pure-function invariants (empty bindings) ────────────────────

describe('composeBindings — empty bindings invariants', () => {
  it('returns the input AST unchanged (reference equality) when no bindings are passed', () => {
    const ast = makeStableAst();
    const result = composeBindings(ast, []);
    expect(result.ast).toBe(ast);
    expect(result.composed).toEqual([]);
    expect(result.deferred).toEqual([]);
  });

  it('returns a result with the documented ComposeBindingsResult shape', () => {
    const ast = makeStableAst();
    const result = composeBindings(ast, []);
    // Type-shape sanity: `ast`, `composed`, and `deferred` are present.
    expect(result).toHaveProperty('ast');
    expect(result).toHaveProperty('composed');
    expect(result).toHaveProperty('deferred');
    expect(Array.isArray(result.composed)).toBe(true);
    expect(Array.isArray(result.deferred)).toBe(true);
  });
});

// ─── 2. Single binding — swing → shimmer @ 60% ───────────────────────

describe('composeBindings — single binding (swing → shimmer @ 60%)', () => {
  it('substitutes the Mix<Int<…>> slot with a Scale<SwingSpeed<400>, …> driver', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    const binding = makeBinding({
      source: 'swing',
      target: 'shimmer',
      combinator: 'replace',
      amount: 0.6,
    });

    const { mappable } = mapBindings([binding], config, evalCtx);
    expect(mappable).toHaveLength(1);

    const result = composeBindings(ast, mappable);

    expect(result.composed).toHaveLength(1);
    expect(result.deferred).toHaveLength(0);

    // The Mix node's first arg should now be the Scale<...> driver, not Int<16384>.
    const newMix = findFirstMix(result.ast);
    expect(newMix).not.toBeNull();
    expect(newMix!.args[0]!.type).toBe('function');
    expect(newMix!.args[0]!.name).toBe('Scale');

    // Inside the Scale<>, the first child should be SwingSpeed<400>.
    const scale = newMix!.args[0]!;
    expect(scale.args[0]!.name).toBe('SwingSpeed');
    expect(scale.args[0]!.args[0]!.name).toBe('400');

    // The second + third args should be Int<lo> and Int<hi=round(0.6 * 32768)=19661>.
    expect(scale.args[1]!.name).toBe('Int');
    expect(scale.args[1]!.args[0]!.name).toBe('0');
    expect(scale.args[2]!.name).toBe('Int');
    expect(scale.args[2]!.args[0]!.name).toBe('19661');
  });

  it('preserves the rest of the AST around the substituted slot', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    const { mappable } = mapBindings(
      [makeBinding({ source: 'swing', target: 'shimmer' })],
      config,
      evalCtx,
    );
    const result = composeBindings(ast, mappable);

    // Outer wrapper still AudioFlicker; first child still Rgb<0,140,255>.
    expect(result.ast.name).toBe('AudioFlicker');
    expect(result.ast.args[0]!.name).toBe('Rgb');
    // The Mix's 2nd and 3rd args (base color + White) should be unchanged.
    const newMix = findFirstMix(result.ast)!;
    expect(newMix.args[1]!.name).toBe('Rgb');
    expect(newMix.args[2]!.name).toBe('White');
  });
});

// ─── 3. Breathing heuristic — sin(time * 0.001) * 0.5 + 0.5 ───────────

describe('composeBindings — breathing heuristic', () => {
  it('emits a Sin<Int<period>> driver when the binding expression matches the breathing shape', () => {
    const breathingExpr: ExpressionNode = {
      kind: 'binary',
      op: '+',
      lhs: {
        kind: 'binary',
        op: '*',
        lhs: {
          kind: 'call',
          fn: 'sin',
          args: [{
            kind: 'binary',
            op: '*',
            lhs: { kind: 'var', id: 'time' },
            rhs: { kind: 'literal', value: 0.001 },
          }],
        },
        rhs: { kind: 'literal', value: 0.5 },
      },
      rhs: { kind: 'literal', value: 0.5 },
    };

    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    const binding = makeBinding({
      source: null,
      expression: breathingExpr,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1.0,
    });

    const { mappable } = mapBindings([binding], config, evalCtx);
    expect(mappable).toHaveLength(1);
    // Sanity: matchSinBreathingEnvelope detected this and wrapped a Sin<Int<…>>.
    expect(mappable[0]!.note).toMatch(/Breathing envelope/);

    const result = composeBindings(ast, mappable);

    expect(result.composed).toHaveLength(1);
    expect(result.deferred).toHaveLength(0);

    // Mix slot first child: Scale<Sin<Int<6283>>, Int<0>, Int<32768>>
    const newMix = findFirstMix(result.ast)!;
    const scale = newMix.args[0]!;
    expect(scale.name).toBe('Scale');
    const driver = scale.args[0]!;
    expect(driver.name).toBe('Sin');
    expect(driver.args[0]!.name).toBe('Int');
    // 2π / 0.001 ≈ 6283.185 → rounded to 6283.
    expect(driver.args[0]!.args[0]!.name).toBe('6283');
  });
});

// ─── 4. Multi-binding composition ────────────────────────────────────

describe('composeBindings — multi-binding', () => {
  it('grafts the first shimmer binding and defers the second (slot is filled)', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    const b1 = makeBinding({ id: 'first', source: 'swing', target: 'shimmer', amount: 0.6 });
    const b2 = makeBinding({ id: 'second', source: 'sound', target: 'shimmer', amount: 0.5 });

    const { mappable } = mapBindings([b1, b2], config, evalCtx);
    expect(mappable).toHaveLength(2);

    const result = composeBindings(ast, mappable);

    // Per the documented "first binding wins, later bindings on the same
    // target snapshot" semantic, b1 grafts and b2 falls through.
    expect(result.composed.map((c) => c.binding.id)).toEqual(['first']);
    expect(result.deferred.map((d) => d.binding.id)).toEqual(['second']);

    // The Mix<Int, ...> slot was substituted by b1's SwingSpeed driver.
    const mix = findFirstMix(result.ast)!;
    const driver = mix.args[0]!;
    expect(driver.name).toBe('Scale');
    expect(driver.args[0]!.name).toBe('SwingSpeed');
  });

  it('defers a binding whose target has no slot resolver registered', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    // baseColor.r is mappable in principle (mapBindings produces a
    // Scale<>) but `baseColor.r` has no resolver in SLOT_RESOLVERS, so it
    // should fall through to deferred.
    const binding = makeBinding({ source: 'angle', target: 'baseColor.r', amount: 0.3 });

    const { mappable } = mapBindings([binding], config, evalCtx);
    expect(mappable).toHaveLength(1);

    const result = composeBindings(ast, mappable);

    expect(result.composed).toHaveLength(0);
    expect(result.deferred).toHaveLength(1);
    expect(result.deferred[0]!.targetPath).toBe('baseColor.r');
    // AST is structurally untouched (reference equality preserved).
    expect(result.ast).toBe(ast);
  });
});

// ─── 5. Fall-through to deferred (no slot pattern) ───────────────────

describe('composeBindings — fall-through to deferred', () => {
  it('defers when the AST has no Mix<Int, _, _> slot', () => {
    // Rotoscope-shaped AST has no shimmer-Mix slot.
    const ast = makeRotoscopeAst();
    const config = makeEmitterConfig({ style: 'rotoscope' });
    const evalCtx = makeEvalCtx();

    const { mappable } = mapBindings(
      [makeBinding({ source: 'swing', target: 'shimmer' })],
      config,
      evalCtx,
    );
    expect(mappable).toHaveLength(1);

    const result = composeBindings(ast, mappable);

    expect(result.composed).toHaveLength(0);
    expect(result.deferred).toHaveLength(1);
    // No substitution happened — identity preserved.
    expect(result.ast).toBe(ast);
  });
});

// ─── 6. Purity ───────────────────────────────────────────────────────

describe('composeBindings — purity', () => {
  it('does not mutate the input AST', () => {
    const ast = makeStableAst();
    const astBefore = JSON.parse(JSON.stringify(ast)) as StyleNode;

    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();
    const { mappable } = mapBindings(
      [makeBinding({ source: 'swing', target: 'shimmer', amount: 0.6 })],
      config,
      evalCtx,
    );

    composeBindings(ast, mappable);

    // Deep equality check — input AST should be byte-for-byte unchanged.
    expect(ast).toEqual(astBefore);
    // Specifically, the Mix's first child should still be the original
    // Int<16384>, not a Scale<...>.
    const originalMix = findFirstMix(ast)!;
    expect(originalMix.args[0]!.name).toBe('Int');
    expect(originalMix.args[0]!.args[0]!.name).toBe('16384');
  });

  it('produces structurally identical output when called twice with the same input', () => {
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();
    const { mappable } = mapBindings(
      [makeBinding({ source: 'swing', target: 'shimmer', amount: 0.6 })],
      config,
      evalCtx,
    );

    const ast1 = makeStableAst();
    const ast2 = makeStableAst();
    const r1 = composeBindings(ast1, mappable);
    const r2 = composeBindings(ast2, mappable);

    // Both runs produce the same structural output.
    expect(r1.ast).toEqual(r2.ast);
    expect(r1.composed.map((c) => c.binding.id)).toEqual(r2.composed.map((c) => c.binding.id));
    expect(r1.deferred.map((d) => d.binding.id)).toEqual(r2.deferred.map((d) => d.binding.id));
  });

  it('shares structure with the input for unchanged subtrees (shallow-clone-on-write)', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();
    const { mappable } = mapBindings(
      [makeBinding({ source: 'swing', target: 'shimmer', amount: 0.6 })],
      config,
      evalCtx,
    );

    const result = composeBindings(ast, mappable);

    // The outer AudioFlicker is shallow-cloned (different identity)…
    expect(result.ast).not.toBe(ast);
    // …but the first child (Rgb base color) is structurally untouched by
    // the substitution and shares identity with the input AST's child.
    expect(result.ast.args[0]).toBe(ast.args[0]);
    // The Mix node IS shallow-cloned (its first arg changed).
    expect(result.ast.args[1]).not.toBe(ast.args[1]);
    // …but the Mix's 2nd + 3rd args (base color + White) are shared.
    expect(result.ast.args[1]!.args[1]).toBe(ast.args[1]!.args[1]);
    expect(result.ast.args[1]!.args[2]).toBe(ast.args[1]!.args[2]);
  });
});

// ─── 7. Result shape ────────────────────────────────────────────────

describe('composeBindings — result shape', () => {
  it('returns { ast, composed, deferred } with bindings partitioned', () => {
    const ast = makeStableAst();
    const config = makeEmitterConfig();
    const evalCtx = makeEvalCtx();

    const b1 = makeBinding({ id: 'b1', source: 'swing', target: 'shimmer', amount: 0.6 });
    const b2 = makeBinding({ id: 'b2', source: 'sound', target: 'baseColor.r', amount: 0.3 });

    const { mappable } = mapBindings([b1, b2], config, evalCtx);
    const result = composeBindings(ast, mappable);

    // b1 grafts into the shimmer-Mix slot; b2 has no slot resolver.
    expect(result.composed).toHaveLength(1);
    expect(result.composed[0]!.binding.id).toBe('b1');
    expect(result.deferred).toHaveLength(1);
    expect(result.deferred[0]!.binding.id).toBe('b2');

    // composed + deferred together account for every mappable input.
    expect(result.composed.length + result.deferred.length).toBe(mappable.length);
  });
});

// ─── 8. generateStyleCode integration ────────────────────────────────

describe('generateStyleCode — v1.1 binding integration', () => {
  it('emits a live Scale<SwingSpeed<...> template for swing → shimmer @ 60%', () => {
    const config: BladeConfig & { modulation: { version: 1; bindings: ModulationBinding[] } } = {
      ...makeStrictConfig(),
      modulation: {
        version: 1,
        bindings: [
          makeBinding({ id: 'swing-shimmer', source: 'swing', target: 'shimmer', amount: 0.6 }),
        ],
      },
    };

    const code = generateStyleCode(config);

    // Live driver template appears in the emitted code.
    expect(code).toMatch(/Scale<\s*SwingSpeed<400>/);
    // v1.1 banner present (not v1.0).
    expect(code).toMatch(/v1\.1 Core/);
    expect(code).not.toMatch(/v1\.0 Preview BETA/);
    // Binding listed under "Mapped to live templates".
    expect(code).toMatch(/Mapped to live templates/);
    expect(code).toMatch(/swing -> shimmer/);
  });

  it('omits the comment block when emit options disable comments (preset-array path)', () => {
    const config: BladeConfig & { modulation: { version: 1; bindings: ModulationBinding[] } } = {
      ...makeStrictConfig(),
      modulation: {
        version: 1,
        bindings: [
          makeBinding({ id: 'swing-shimmer', source: 'swing', target: 'shimmer', amount: 0.6 }),
        ],
      },
    };

    const code = generateStyleCode(config, { comments: false });

    // No banner + no "Mapped to live templates" header — but the live
    // Scale<SwingSpeed<...> template is still grafted into the AST.
    expect(code).not.toMatch(/Modulation Routing/);
    expect(code).not.toMatch(/Mapped to live templates/);
    expect(code).toMatch(/Scale<\s*SwingSpeed<400>/);
  });

  it('emits no comment block when there are no bindings (v1.0 byte-identical path)', () => {
    const code = generateStyleCode(makeStrictConfig());
    expect(code).not.toMatch(/Modulation Routing/);
  });
});

// ─── 9. Snapshot/live boundary ───────────────────────────────────────

describe('generateStyleCode — snapshot/live boundary', () => {
  it('lists mappable bindings under live templates AND skipped (bypassed) under skipped', () => {
    // Mix one mappable + one bypassed binding. Mappable: swing → shimmer
    // (template fits). Bypassed: a sound → shimmer binding with
    // `bypassed: true` — `applyModulationSnapshot` skips bypassed
    // bindings entirely (they appear under "Skipped bindings:"), and
    // `mapBindings` flags them unmappable.
    const config: BladeConfig & { modulation: { version: 1; bindings: ModulationBinding[] } } = {
      ...makeStrictConfig(),
      modulation: {
        version: 1,
        bindings: [
          makeBinding({
            id: 'swing-shimmer',
            source: 'swing',
            target: 'shimmer',
            amount: 0.6,
          }),
          makeBinding({
            id: 'bypassed-rate',
            source: 'sound',
            target: 'shimmer',
            amount: 0.5,
            bypassed: true,
          }),
        ],
      },
    };

    const code = generateStyleCode(config);

    // Live section names the mappable binding…
    expect(code).toMatch(/Mapped to live templates/);
    // …and the bypassed binding appears under the skipped section.
    expect(code).toMatch(/Skipped bindings:/);
    expect(code).toMatch(/shimmer - bypassed/);
    // Live driver wired in.
    expect(code).toMatch(/Scale<\s*SwingSpeed<400>/);
    // The mappable binding's row appears in "Mapped to live templates".
    expect(code).toMatch(/swing -> shimmer/);
  });

  it('marks deferred-from-mapping bindings with the "no AST slot - deferred" tag', () => {
    // baseColor.r mapping produces a mappable binding (Scale<BladeAngle<>, ...>)
    // but the composer has no slot resolver for `baseColor.r`, so it
    // falls through to `deferred` and is reported as such in the comment block.
    const config: BladeConfig & { modulation: { version: 1; bindings: ModulationBinding[] } } = {
      ...makeStrictConfig(),
      modulation: {
        version: 1,
        bindings: [
          makeBinding({
            id: 'angle-red',
            source: 'angle',
            target: 'baseColor.r',
            amount: 0.3,
          }),
        ],
      },
    };

    const code = generateStyleCode(config);

    // The deferred-from-live tag should appear next to the snapshot row.
    expect(code).toMatch(/no AST slot - deferred/);
    // v1.1 banner still wins because the composer was invoked.
    expect(code).toMatch(/v1\.1 Core/);
  });
});
