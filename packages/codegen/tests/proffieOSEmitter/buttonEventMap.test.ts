// ─── ProffieOS Button-Event Emit Map — Wave 8 tests ─────────────────
//
// Coverage: table well-formedness, lookup behavior, AST builder shapes,
// and the drift sentinel that keeps the local `PropFileEvent` mirror in
// lock-step with the engine canonical type.

import { describe, it, expect } from 'vitest';

import {
  BUTTON_EVENT_EMIT_MAP,
  buildButtonEventWrapper,
  isValidEffectConstant,
  lookupButtonEventEmit,
} from '../../src/proffieOSEmitter/buttonEventMap.js';
import type {
  ButtonEventEmitSpec,
  ButtonEventWrapper,
  PropFileEvent,
} from '../../src/proffieOSEmitter/buttonEventMap.js';
import type { StyleNode } from '../../src/types.js';

// Engine drift sentinel — the canonical type lives in
// `packages/engine/src/modulation/types.ts` and is re-exported from the
// top-level engine barrel.
import type {
  PropFileEvent as EnginePropFileEvent,
  ButtonEvent as EngineButtonEvent,
  GestureEvent as EngineGestureEvent,
} from '@kyberstation/engine';

// ─── Drift sentinels ────────────────────────────────────────────────
//
// The codegen mirror MUST stay assignment-compatible with the engine
// canonical types. If the engine adds a new event to the union, this
// test fails at typecheck until the codegen mirror is extended too.
//
// Mirror-to-engine (read direction): a mirror value must be acceptable
// where an engine value is expected — this catches "engine narrowed".
// Engine-to-mirror (write direction): an engine value must be acceptable
// in the mirror — this catches "engine widened" (most common drift).

type _MirrorButtonFitsEngine = PropFileEvent extends EnginePropFileEvent ? true : never;
const _mirrorButtonFitsEngine: _MirrorButtonFitsEngine = true;

type _EngineButtonFitsMirror = EnginePropFileEvent extends PropFileEvent ? true : never;
const _engineButtonFitsMirror: _EngineButtonFitsMirror = true;

// Granular sub-union checks for better error localization when drift hits.
type _EngineButtonEventFitsMirror = EngineButtonEvent extends PropFileEvent ? true : never;
const _engineButtonEventFitsMirror: _EngineButtonEventFitsMirror = true;

type _EngineGestureEventFitsMirror = EngineGestureEvent extends PropFileEvent ? true : never;
const _engineGestureEventFitsMirror: _EngineGestureEventFitsMirror = true;

// Suppress unused-var lint complaints — these are compile-time-only checks.
void _mirrorButtonFitsEngine;
void _engineButtonFitsMirror;
void _engineButtonEventFitsMirror;
void _engineGestureEventFitsMirror;

// ─── Tests ──────────────────────────────────────────────────────────

describe('BUTTON_EVENT_EMIT_MAP — table coverage', () => {
  it('has an entry for every known PropFileEvent', () => {
    const expectedKeys: PropFileEvent[] = [
      // Button events
      'click',
      'long-press',
      'hold',
      'double-click',
      'triple-click',
      'click-and-hold',
      'held-plus-other-click',
      // Gesture events
      'swing',
      'stab',
      'thrust',
      'twist',
      'shake',
    ];
    const actualKeys = Object.keys(BUTTON_EVENT_EMIT_MAP).sort();
    expect(actualKeys).toEqual([...expectedKeys].sort());
  });

  it('every entry has a valid EFFECT_* constant', () => {
    for (const [event, spec] of Object.entries(BUTTON_EVENT_EMIT_MAP)) {
      expect(
        isValidEffectConstant(spec.effectConstant),
        `event "${event}" has invalid effectConstant "${spec.effectConstant}"`,
      ).toBe(true);
    }
  });

  it('every entry has a recognised wrapper template', () => {
    const validWrappers: ButtonEventWrapper[] = [
      'EffectPulseF',
      'TransitionEffectL',
      'Trigger',
    ];
    for (const [event, spec] of Object.entries(BUTTON_EVENT_EMIT_MAP)) {
      expect(
        validWrappers.includes(spec.defaultWrapper),
        `event "${event}" has unrecognised wrapper "${spec.defaultWrapper}"`,
      ).toBe(true);
    }
  });

  it('every entry has a non-empty notes docstring', () => {
    for (const [event, spec] of Object.entries(BUTTON_EVENT_EMIT_MAP)) {
      expect(
        spec.notes.length,
        `event "${event}" has empty notes`,
      ).toBeGreaterThan(0);
    }
  });

  it('canonical button events route to firmware-named effects', () => {
    // Spot-check the load-bearing button event mappings:
    expect(BUTTON_EVENT_EMIT_MAP.click.effectConstant).toBe('EFFECT_BLAST');
    expect(BUTTON_EVENT_EMIT_MAP['long-press'].effectConstant).toBe('EFFECT_FORCE');
    expect(BUTTON_EVENT_EMIT_MAP.hold.effectConstant).toBe('EFFECT_LOCKUP_BEGIN');
    expect(BUTTON_EVENT_EMIT_MAP['click-and-hold'].effectConstant).toBe('EFFECT_LOCKUP_BEGIN');
  });

  it('canonical gesture events route to firmware-named effects', () => {
    // Spot-check the load-bearing gesture event mappings:
    expect(BUTTON_EVENT_EMIT_MAP.stab.effectConstant).toBe('EFFECT_STAB');
    expect(BUTTON_EVENT_EMIT_MAP.thrust.effectConstant).toBe('EFFECT_STAB');
  });

  it('userland events use EFFECT_USER* slots', () => {
    // The 6 events without a firmware-canonical effect map to EFFECT_USER1..6.
    const userlandEvents: PropFileEvent[] = [
      'double-click',
      'triple-click',
      'held-plus-other-click',
      'swing',
      'twist',
      'shake',
    ];
    for (const ev of userlandEvents) {
      expect(BUTTON_EVENT_EMIT_MAP[ev].effectConstant).toMatch(/^EFFECT_USER[1-6]$/);
    }
  });

  it('does not collide userland slots within the userland set', () => {
    // Each EFFECT_USER* slot should be unique across the userland-mapped
    // events so authoring overlap doesn't fire two bindings on one event.
    const userlandSlots = Object.entries(BUTTON_EVENT_EMIT_MAP)
      .filter(([, spec]) => /^EFFECT_USER[1-6]$/.test(spec.effectConstant))
      .map(([, spec]) => spec.effectConstant);
    const unique = new Set(userlandSlots);
    expect(unique.size).toBe(userlandSlots.length);
  });
});

describe('lookupButtonEventEmit — runtime lookup', () => {
  it('returns the expected spec for known button events', () => {
    const clickSpec = lookupButtonEventEmit('click');
    expect(clickSpec).not.toBeNull();
    expect(clickSpec?.effectConstant).toBe('EFFECT_BLAST');
    expect(clickSpec?.defaultWrapper).toBe('EffectPulseF');

    const holdSpec = lookupButtonEventEmit('hold');
    expect(holdSpec).not.toBeNull();
    expect(holdSpec?.effectConstant).toBe('EFFECT_LOCKUP_BEGIN');
    expect(holdSpec?.defaultWrapper).toBe('TransitionEffectL');
  });

  it('returns the expected spec for known gesture events', () => {
    const stabSpec = lookupButtonEventEmit('stab');
    expect(stabSpec).not.toBeNull();
    expect(stabSpec?.effectConstant).toBe('EFFECT_STAB');

    const shakeSpec = lookupButtonEventEmit('shake');
    expect(shakeSpec).not.toBeNull();
    expect(shakeSpec?.effectConstant).toBe('EFFECT_USER6');
    // Shake uses Trigger since it's a sustained event.
    expect(shakeSpec?.defaultWrapper).toBe('Trigger');
  });

  it('returns null for an unknown event', () => {
    expect(lookupButtonEventEmit('quadruple-click')).toBeNull();
    expect(lookupButtonEventEmit('')).toBeNull();
    expect(lookupButtonEventEmit('not-an-event')).toBeNull();
  });

  it('is case-sensitive (matches engine PropFileEvent vocabulary)', () => {
    // ProffieOS event names are lowercase kebab-case; uppercase variants
    // must not match — that would mask UI authoring typos.
    expect(lookupButtonEventEmit('Click')).toBeNull();
    expect(lookupButtonEventEmit('CLICK')).toBeNull();
    expect(lookupButtonEventEmit('LONG-PRESS')).toBeNull();
  });
});

describe('buildButtonEventWrapper — AST shapes', () => {
  const innerStub: StyleNode = { type: 'integer', name: '16384', args: [] };

  it('emits EffectPulseF<EFFECT_X> for EffectPulseF wrapper', () => {
    const spec: ButtonEventEmitSpec = {
      effectConstant: 'EFFECT_BLAST',
      defaultWrapper: 'EffectPulseF',
      notes: 'test',
    };
    const node = buildButtonEventWrapper(spec, innerStub);
    expect(node.type).toBe('function');
    expect(node.name).toBe('EffectPulseF');
    expect(node.args).toHaveLength(1);
    expect(node.args[0].name).toBe('EFFECT_BLAST');
    expect(node.args[0].type).toBe('raw');
  });

  it('emits TransitionEffectL<TrInstant, inner, EFFECT_X> for TransitionEffectL wrapper', () => {
    const spec: ButtonEventEmitSpec = {
      effectConstant: 'EFFECT_FORCE',
      defaultWrapper: 'TransitionEffectL',
      notes: 'test',
    };
    const node = buildButtonEventWrapper(spec, innerStub);
    expect(node.type).toBe('function');
    expect(node.name).toBe('TransitionEffectL');
    expect(node.args).toHaveLength(3);
    expect(node.args[0].name).toBe('TrInstant');
    expect(node.args[0].type).toBe('raw');
    expect(node.args[1]).toBe(innerStub);
    expect(node.args[2].name).toBe('EFFECT_FORCE');
    expect(node.args[2].type).toBe('raw');
  });

  it('emits Trigger<EFFECT_X, inner> for Trigger wrapper', () => {
    const spec: ButtonEventEmitSpec = {
      effectConstant: 'EFFECT_USER6',
      defaultWrapper: 'Trigger',
      notes: 'test',
    };
    const node = buildButtonEventWrapper(spec, innerStub);
    expect(node.type).toBe('function');
    expect(node.name).toBe('Trigger');
    expect(node.args).toHaveLength(2);
    expect(node.args[0].name).toBe('EFFECT_USER6');
    expect(node.args[0].type).toBe('raw');
    expect(node.args[1]).toBe(innerStub);
  });

  it('respects wrapperOverride when supplied', () => {
    // Spec defaults to TransitionEffectL but the override forces EffectPulseF.
    const spec: ButtonEventEmitSpec = {
      effectConstant: 'EFFECT_LOCKUP_BEGIN',
      defaultWrapper: 'TransitionEffectL',
      notes: 'test',
    };
    const node = buildButtonEventWrapper(spec, innerStub, 'EffectPulseF');
    expect(node.name).toBe('EffectPulseF');
    expect(node.args).toHaveLength(1);
  });
});

describe('isValidEffectConstant — pattern check', () => {
  it('accepts canonical firmware constants', () => {
    expect(isValidEffectConstant('EFFECT_BLAST')).toBe(true);
    expect(isValidEffectConstant('EFFECT_FORCE')).toBe(true);
    expect(isValidEffectConstant('EFFECT_STAB')).toBe(true);
    expect(isValidEffectConstant('EFFECT_LOCKUP_BEGIN')).toBe(true);
    expect(isValidEffectConstant('EFFECT_USER1')).toBe(true);
    expect(isValidEffectConstant('EFFECT_USER6')).toBe(true);
  });

  it('rejects malformed strings', () => {
    expect(isValidEffectConstant('')).toBe(false);
    expect(isValidEffectConstant('EFFECT_')).toBe(false);
    expect(isValidEffectConstant('effect_blast')).toBe(false);
    expect(isValidEffectConstant('BLAST')).toBe(false);
    expect(isValidEffectConstant('EFFECT_lowercase')).toBe(false);
    // Mixed-case suffix is rejected — only uppercase / digits / underscores allowed.
    expect(isValidEffectConstant('EFFECT_User1')).toBe(false);
  });
});

describe('round-trip snapshot — (triggerEvent → emitted template)', () => {
  it('click emits the canonical EFFECT_BLAST wrapper shape', () => {
    const spec = lookupButtonEventEmit('click');
    expect(spec).not.toBeNull();
    const innerStub: StyleNode = { type: 'integer', name: '32768', args: [] };
    const node = buildButtonEventWrapper(spec!, innerStub);

    // Snapshot of the produced shape — locks the canonical click → EFFECT_BLAST wiring.
    expect(node).toEqual({
      type: 'function',
      name: 'EffectPulseF',
      args: [
        { type: 'raw', name: 'EFFECT_BLAST', args: [] },
      ],
    });
  });

  it('long-press emits the canonical EFFECT_FORCE wrapper shape', () => {
    const spec = lookupButtonEventEmit('long-press');
    expect(spec).not.toBeNull();
    const inner: StyleNode = { type: 'integer', name: '16384', args: [] };
    const node = buildButtonEventWrapper(spec!, inner);

    expect(node).toEqual({
      type: 'function',
      name: 'TransitionEffectL',
      args: [
        { type: 'raw', name: 'TrInstant', args: [] },
        inner,
        { type: 'raw', name: 'EFFECT_FORCE', args: [] },
      ],
    });
  });

  it('shake emits the canonical Trigger<EFFECT_USER6, ...> shape', () => {
    const spec = lookupButtonEventEmit('shake');
    expect(spec).not.toBeNull();
    const inner: StyleNode = { type: 'integer', name: '32768', args: [] };
    const node = buildButtonEventWrapper(spec!, inner);

    expect(node).toEqual({
      type: 'function',
      name: 'Trigger',
      args: [
        { type: 'raw', name: 'EFFECT_USER6', args: [] },
        inner,
      ],
    });
  });
});
