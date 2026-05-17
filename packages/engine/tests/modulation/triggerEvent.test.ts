// ─── Wave 8 (button routing) — SerializedBinding.triggerEvent tests ──
//
// Coverage for Agent A1's binding-shape extension landing the
// `triggerEvent` field. Three slices:
//
//   1. Type-level: ButtonEvent / GestureEvent / PropFileEvent exports
//      are assignable to / from the wire-format `triggerEvent` string.
//   2. Behavioral: applyBindings filters out triggerEvent + bad source
//      combinations; preserves legacy semantics when triggerEvent is
//      undefined.
//   3. Round-trip: SerializedBinding → ModulationBinding → snapshot
//      preserves the triggerEvent field without mutation.
//
// Does NOT exercise: the actual firmware-event → event-modulator
// mapping at the editor/visualizer layer (A3's responsibility) or the
// codegen-side emit of triggerEvent into ProffieOS button templates
// (A2's responsibility).

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  applyBindings,
  _internal,
  type ParameterClampRange,
  type ParameterClampRanges,
} from '../../src/modulation/applyBindings';
import type {
  ButtonEvent,
  EvalContext,
  GestureEvent,
  ModulationBinding,
  ModulatorId,
  PropFileEvent,
  SerializedBinding,
} from '../../src/modulation/types';
import type { BladeConfig, StyleContext } from '../../src/types';

// ─── Test fixtures (mirrors applyBindings.test.ts) ──────────────────

function makeConfig(): BladeConfig {
  return {
    baseColor: { r: 10, g: 20, b: 30 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
  };
}

function makeStyleContext(config: BladeConfig): StyleContext {
  return {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    config,
  };
}

function makeEvalContext(
  modulatorValues: Record<string, number>,
  config: BladeConfig,
): EvalContext {
  const modulators = new Map<ModulatorId, number>();
  for (const [id, value] of Object.entries(modulatorValues)) {
    modulators.set(id as ModulatorId, value);
  }
  return {
    modulators,
    styleContext: makeStyleContext(config),
    frame: 0,
  };
}

const SHIMMER_CLAMP: ParameterClampRange = { min: 0, max: 1, default: 0.1 };

function clampRanges(
  entries: Array<[string, ParameterClampRange]>,
): ParameterClampRanges {
  return new Map(entries);
}

function binding(
  overrides: Partial<ModulationBinding> & Pick<ModulationBinding, 'target'>,
): ModulationBinding {
  return {
    id: 'b-trigger-test',
    source: null,
    expression: null,
    target: overrides.target,
    combinator: 'replace',
    amount: 1,
    ...overrides,
  };
}

// ─── Type-level exports + assignability ─────────────────────────────

describe('ButtonEvent / GestureEvent / PropFileEvent unions', () => {
  it('every ButtonEvent literal is assignable to PropFileEvent', () => {
    const click: PropFileEvent = 'click';
    const longPress: PropFileEvent = 'long-press';
    const hold: PropFileEvent = 'hold';
    const dblClick: PropFileEvent = 'double-click';
    const tripleClick: PropFileEvent = 'triple-click';
    const clickAndHold: PropFileEvent = 'click-and-hold';
    const heldPlusOther: PropFileEvent = 'held-plus-other-click';
    // Just checking these compile + their values round-trip.
    expect([
      click,
      longPress,
      hold,
      dblClick,
      tripleClick,
      clickAndHold,
      heldPlusOther,
    ]).toHaveLength(7);
  });

  it('every GestureEvent literal is assignable to PropFileEvent', () => {
    const swing: PropFileEvent = 'swing';
    const stab: PropFileEvent = 'stab';
    const thrust: PropFileEvent = 'thrust';
    const twist: PropFileEvent = 'twist';
    const shake: PropFileEvent = 'shake';
    expect([swing, stab, thrust, twist, shake]).toHaveLength(5);
  });

  it('ButtonEvent and GestureEvent are subtype-compatible with PropFileEvent', () => {
    expectTypeOf<ButtonEvent>().toMatchTypeOf<PropFileEvent>();
    expectTypeOf<GestureEvent>().toMatchTypeOf<PropFileEvent>();
  });

  it('SerializedBinding.triggerEvent accepts a PropFileEvent value', () => {
    const sb: SerializedBinding = {
      id: 'sb-1',
      source: 'aux-click',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
      triggerEvent: 'click', // ButtonEvent
    };
    expect(sb.triggerEvent).toBe('click');

    const sb2: SerializedBinding = {
      id: 'sb-2',
      source: 'gesture-twist',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
      triggerEvent: 'twist', // GestureEvent
    };
    expect(sb2.triggerEvent).toBe('twist');
  });

  it('SerializedBinding.triggerEvent is optional (legacy bindings omit it)', () => {
    const legacy: SerializedBinding = {
      id: 'sb-legacy',
      source: 'swing',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
    };
    expect(legacy.triggerEvent).toBeUndefined();
  });

  it('ModulationBinding (runtime) carries the same optional triggerEvent field', () => {
    const mb: ModulationBinding = {
      id: 'mb-1',
      source: 'aux-hold',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
      triggerEvent: 'hold',
    };
    expect(mb.triggerEvent).toBe('hold');
  });
});

// ─── Validation: isValidTriggerEventBinding ─────────────────────────

describe('isValidTriggerEventBinding helper', () => {
  const isValid = _internal.isValidTriggerEventBinding;

  it('accepts a binding with no triggerEvent (legacy / continuous)', () => {
    expect(
      isValid({
        id: 'b1',
        source: 'swing',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
      }),
    ).toBe(true);
  });

  it('accepts triggerEvent + valid aux event source', () => {
    expect(
      isValid({
        id: 'b1',
        source: 'aux-click',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'click',
      }),
    ).toBe(true);
  });

  it('accepts triggerEvent + valid gesture event source', () => {
    expect(
      isValid({
        id: 'b1',
        source: 'gesture-twist',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'twist',
      }),
    ).toBe(true);
  });

  it('accepts every aux/gesture event modulator as source', () => {
    const validSources = [
      'aux-click',
      'aux-hold',
      'aux-double-click',
      'gesture-twist',
      'gesture-stab',
      'gesture-swing',
      'gesture-clash',
      'gesture-shake',
    ] as const;
    for (const source of validSources) {
      expect(
        isValid({
          id: `b-${source}`,
          source,
          expression: null,
          target: 'shimmer',
          combinator: 'replace',
          amount: 1,
          triggerEvent: 'click',
        }),
      ).toBe(true);
    }
  });

  it('rejects triggerEvent + continuous modulator source (swing)', () => {
    expect(
      isValid({
        id: 'b-bad',
        source: 'swing',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'click',
      }),
    ).toBe(false);
  });

  it('rejects triggerEvent + continuous modulator source (sound)', () => {
    expect(
      isValid({
        id: 'b-bad',
        source: 'sound',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'twist',
      }),
    ).toBe(false);
  });

  it('rejects triggerEvent + clash latched-effect source (not in event modulator set)', () => {
    // `clash` is a latched-effect modulator but NOT one of the 8 Wave 8
    // event modulators; coupling triggerEvent to it would be a UI
    // authoring error.
    expect(
      isValid({
        id: 'b-bad',
        source: 'clash',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'click',
      }),
    ).toBe(false);
  });

  it('rejects triggerEvent + null source (expression-only binding)', () => {
    expect(
      isValid({
        id: 'b-bad',
        source: null,
        expression: {
          kind: 'literal',
          value: 0.5,
        },
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'click',
      }),
    ).toBe(false);
  });

  it('rejects triggerEvent + unknown custom-modulator source', () => {
    expect(
      isValid({
        id: 'b-bad',
        source: 'my-custom-mod' as ModulatorId,
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: 'click',
      }),
    ).toBe(false);
  });
});

// ─── Behavioral: applyBindings honors validation ────────────────────

describe('applyBindings — triggerEvent filter (Wave 8)', () => {
  it('binding with triggerEvent + valid aux source applies normally', () => {
    const config = { ...makeConfig(), shimmer: 0.1 };
    const ctx = makeEvalContext({ 'aux-click': 0.8 }, config);
    const result = applyBindings(
      config,
      [
        binding({
          target: 'shimmer',
          source: 'aux-click',
          combinator: 'replace',
          amount: 1,
          triggerEvent: 'click',
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.8, 6);
  });

  it('binding with triggerEvent + invalid swing source is filtered (silently dropped)', () => {
    // Authoring error: triggerEvent set but source is a continuous
    // modulator that doesn't fire on a discrete prop-file event. The
    // binding is dropped — original shimmer value is preserved.
    const config = { ...makeConfig(), shimmer: 0.3 };
    const ctx = makeEvalContext({ swing: 0.9 }, config);
    const result = applyBindings(
      config,
      [
        binding({
          target: 'shimmer',
          source: 'swing',
          combinator: 'replace',
          amount: 1,
          triggerEvent: 'click',
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // Binding was dropped, so shimmer stays at its static value.
    expect(result.shimmer).toBeCloseTo(0.3, 6);
  });

  it('binding without triggerEvent + aux source applies on every frame (backward compat)', () => {
    const config = { ...makeConfig(), shimmer: 0.2 };
    const ctx = makeEvalContext({ 'aux-click': 0.5 }, config);
    const result = applyBindings(
      config,
      [
        binding({
          target: 'shimmer',
          source: 'aux-click',
          combinator: 'add',
          amount: 1,
          // triggerEvent intentionally omitted — legacy binding.
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // 0.2 + 0.5 = 0.7
    expect(result.shimmer).toBeCloseTo(0.7, 6);
  });

  it('binding without triggerEvent + swing source applies normally (no validation gate)', () => {
    // The validation gate only triggers when triggerEvent is set. A
    // continuous-source binding without triggerEvent is the legacy
    // path and must keep working unchanged.
    const config = { ...makeConfig(), shimmer: 0.1 };
    const ctx = makeEvalContext({ swing: 0.4 }, config);
    const result = applyBindings(
      config,
      [
        binding({
          target: 'shimmer',
          source: 'swing',
          combinator: 'replace',
          amount: 1,
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.4, 6);
  });

  it('mixed binding list: invalid triggerEvent bindings filtered, valid ones applied', () => {
    const config = { ...makeConfig(), shimmer: 0 };
    const ctx = makeEvalContext(
      { swing: 0.9, 'aux-click': 0.6 },
      config,
    );
    const result = applyBindings(
      config,
      [
        // Invalid: triggerEvent + continuous source → dropped.
        binding({
          id: 'b-bad',
          target: 'shimmer',
          source: 'swing',
          combinator: 'replace',
          amount: 1,
          triggerEvent: 'click',
        }),
        // Valid: triggerEvent + aux event source → applies.
        binding({
          id: 'b-good',
          target: 'shimmer',
          source: 'aux-click',
          combinator: 'add',
          amount: 1,
          triggerEvent: 'click',
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    // The bad binding is dropped; the good one adds 0.6 onto the
    // static 0 → 0.6.
    expect(result.shimmer).toBeCloseTo(0.6, 6);
  });

  it('bypassed bindings short-circuit before triggerEvent validation', () => {
    // bypassed:true bindings are skipped at the very top of the loop;
    // they should not also be classified as "invalid" — bypass wins.
    const config = { ...makeConfig(), shimmer: 0.4 };
    const ctx = makeEvalContext({ swing: 0.9 }, config);
    const result = applyBindings(
      config,
      [
        binding({
          target: 'shimmer',
          source: 'swing',
          combinator: 'replace',
          amount: 1,
          triggerEvent: 'click', // would otherwise be invalid
          bypassed: true,
        }),
      ],
      ctx,
      clampRanges([['shimmer', SHIMMER_CLAMP]]),
    );
    expect(result.shimmer).toBeCloseTo(0.4, 6); // unchanged
  });
});

// ─── Round-trip: triggerEvent preserved through serialization ──────

describe('SerializedBinding round-trip preserves triggerEvent', () => {
  it('stringify + parse preserves the triggerEvent field', () => {
    const sb: SerializedBinding = {
      id: 'sb-roundtrip',
      source: 'aux-double-click',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 0.75,
      triggerEvent: 'double-click',
    };
    const json = JSON.stringify(sb);
    const parsed = JSON.parse(json) as SerializedBinding;
    expect(parsed.triggerEvent).toBe('double-click');
    expect(parsed.id).toBe(sb.id);
    expect(parsed.source).toBe(sb.source);
    expect(parsed.target).toBe(sb.target);
    expect(parsed.amount).toBe(sb.amount);
  });

  it('stringify + parse preserves an undefined triggerEvent as undefined', () => {
    const sb: SerializedBinding = {
      id: 'sb-legacy-roundtrip',
      source: 'swing',
      expression: null,
      target: 'shimmer',
      combinator: 'multiply',
      amount: 1,
      // triggerEvent intentionally omitted.
    };
    const json = JSON.stringify(sb);
    const parsed = JSON.parse(json) as SerializedBinding;
    expect(parsed.triggerEvent).toBeUndefined();
  });

  it('shallow-clone preserves triggerEvent', () => {
    const sb: SerializedBinding = {
      id: 'sb-clone',
      source: 'gesture-stab',
      expression: null,
      target: 'shimmer',
      combinator: 'replace',
      amount: 1,
      triggerEvent: 'stab',
    };
    const cloned: SerializedBinding = { ...sb };
    expect(cloned.triggerEvent).toBe('stab');
  });

  it('every PropFileEvent value round-trips through JSON', () => {
    const events: PropFileEvent[] = [
      'click',
      'long-press',
      'hold',
      'double-click',
      'triple-click',
      'click-and-hold',
      'held-plus-other-click',
      'swing',
      'stab',
      'thrust',
      'twist',
      'shake',
    ];
    for (const event of events) {
      const sb: SerializedBinding = {
        id: `sb-${event}`,
        source: 'aux-click',
        expression: null,
        target: 'shimmer',
        combinator: 'replace',
        amount: 1,
        triggerEvent: event,
      };
      const roundTripped = JSON.parse(JSON.stringify(sb)) as SerializedBinding;
      expect(roundTripped.triggerEvent).toBe(event);
    }
  });
});
