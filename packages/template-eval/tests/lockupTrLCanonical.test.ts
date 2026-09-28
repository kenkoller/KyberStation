// ─── LockupTrL — canonical ProffieOS argument layout ───
//
// ProffieOS: LockupTrL<COLOR, BeginTr, EndTr, SaberBase::LOCKUP_*, CONDITION?>.
// This is the exact 4-arg shape KyberStation's codegen emits for the
// normal / drag / lightning-block / melt lockup layers. Before the fix the
// interpreter read it with a non-ProffieOS 5-arg layout, so:
//   • the lockup tag landed in the "EndTr" slot → every LockupTrL matched
//     ANY lockup type (a normal lockup lit all four lockup layers), and
//   • the end "transition" was the tag (getInteger() = 0) → a released
//     lockup never faded out.
// It also never restarted its transitions, so BeginTr / EndTr animated
// only relative to the first frame the style ever ran.

import { describe, it, expect } from 'vitest';
import { evaluateTemplateString } from '../src/evaluate.js';
import { EffectManager } from '../src/EffectSystem.js';
import { restartTransition } from '../src/templates/transitions.js';
import type { BladeState, Color, LockupType, StyleTemplate } from '../src/types.js';

function stateAt(timeMs: number, overrides: Partial<BladeState> = {}): BladeState {
  return {
    isOn: true,
    numLeds: 144,
    timeMs,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: 32768,
    variation: 0,
    ...overrides,
  };
}

function runAt(tmpl: StyleTemplate, effects: EffectManager, timeMs: number): Color {
  tmpl.run(stateAt(timeMs), effects);
  return tmpl.getColor(72);
}

const NORMAL = 'LockupTrL<Rgb<255,200,0>,TrInstant,TrFade<300>,SaberBase::LOCKUP_NORMAL>';

describe('LockupTrL — canonical 4-arg layout (codegen shape)', () => {
  it('is dormant while no lockup is held', () => {
    const tmpl = evaluateTemplateString(NORMAL);
    const effects = new EffectManager();
    expect(runAt(tmpl, effects, 1000)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('shows the lockup colour while its lockup type is held', () => {
    const tmpl = evaluateTemplateString(NORMAL);
    const effects = new EffectManager();
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NORMAL';
    expect(runAt(tmpl, effects, 1000)).toEqual({ r: 255, g: 200, b: 0 });
  });

  const OTHER_TYPES: LockupType[] = ['LOCKUP_DRAG', 'LOCKUP_MELT', 'LOCKUP_LIGHTNING_BLOCK'];
  for (const other of OTHER_TYPES) {
    it(`ignores ${other} (the tag in slot 3 gates the layer)`, () => {
      const tmpl = evaluateTemplateString(NORMAL);
      const effects = new EffectManager();
      effects.lockupType = other;
      expect(runAt(tmpl, effects, 1000)).toEqual({ r: 0, g: 0, b: 0 });
    });
  }

  it('fades out over EndTr measured from the release, then goes transparent', () => {
    const tmpl = evaluateTemplateString(NORMAL);
    const effects = new EffectManager();
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NORMAL';
    runAt(tmpl, effects, 5000);
    // Release 5 s after the style first ran — a transition clock latched
    // at t=0 would already read "done" and skip the fade entirely.
    effects.lockupType = 'LOCKUP_NONE';
    runAt(tmpl, effects, 5000);
    const mid = runAt(tmpl, effects, 5150);
    expect(mid.r).toBeGreaterThan(100);
    expect(mid.r).toBeLessThan(155);
    expect(runAt(tmpl, effects, 5300)).toEqual({ r: 0, g: 0, b: 0 });
    expect(runAt(tmpl, effects, 9000)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('restarts BeginTr when the lockup begins', () => {
    const tmpl = evaluateTemplateString(
      'LockupTrL<Rgb<255,0,0>,TrFade<200>,TrInstant,SaberBase::LOCKUP_NORMAL>',
    );
    const effects = new EffectManager();
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NORMAL';
    runAt(tmpl, effects, 5000);
    const half = runAt(tmpl, effects, 5100);
    expect(half.r).toBeGreaterThan(100);
    expect(half.r).toBeLessThan(155);
    expect(runAt(tmpl, effects, 5200).r).toBe(255);
  });

  it('can be re-triggered after a completed release', () => {
    const tmpl = evaluateTemplateString(NORMAL);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NONE';
    runAt(tmpl, effects, 100);
    expect(runAt(tmpl, effects, 1000)).toEqual({ r: 0, g: 0, b: 0 });
    effects.lockupType = 'LOCKUP_NORMAL';
    expect(runAt(tmpl, effects, 2000)).toEqual({ r: 255, g: 200, b: 0 });
  });

  it('honours the optional CONDITION argument at lockup begin', () => {
    const off = evaluateTemplateString(
      'LockupTrL<Rgb<255,0,0>,TrInstant,TrInstant,SaberBase::LOCKUP_NORMAL,Int<0>>',
    );
    const on = evaluateTemplateString(
      'LockupTrL<Rgb<255,0,0>,TrInstant,TrInstant,SaberBase::LOCKUP_NORMAL,Int<1>>',
    );
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    expect(runAt(off, effects, 1000)).toEqual({ r: 0, g: 0, b: 0 });
    expect(runAt(on, effects, 1000)).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('Layers<> with the full codegen lockup stack', () => {
  // Mirrors ASTBuilder.buildEffectLayers: one LockupTrL per lockup type.
  const STACK = `Layers<
    Rgb<0,0,255>,
    LockupTrL<Rgb<255,200,0>,TrInstant,TrFade<300>,SaberBase::LOCKUP_NORMAL>,
    LockupTrL<Rgb<255,150,0>,TrInstant,TrFade<400>,SaberBase::LOCKUP_DRAG>,
    LockupTrL<Rgb<100,100,255>,TrInstant,TrFade<500>,SaberBase::LOCKUP_LIGHTNING_BLOCK>,
    LockupTrL<Rgb<255,255,255>,TrInstant,TrFade<500>,SaberBase::LOCKUP_MELT>
  >`;

  const EXPECTED: ReadonlyArray<readonly [LockupType, Color]> = [
    ['LOCKUP_NORMAL', { r: 255, g: 200, b: 0 }],
    ['LOCKUP_DRAG', { r: 255, g: 150, b: 0 }],
    ['LOCKUP_LIGHTNING_BLOCK', { r: 100, g: 100, b: 255 }],
    ['LOCKUP_MELT', { r: 255, g: 255, b: 255 }],
  ];

  for (const [type, colour] of EXPECTED) {
    it(`${type} lights only its own layer`, () => {
      const tmpl = evaluateTemplateString(STACK);
      const effects = new EffectManager();
      runAt(tmpl, effects, 0);
      effects.lockupType = type;
      expect(runAt(tmpl, effects, 1000)).toEqual(colour);
    });
  }

  it('returns to the base colour once the released lockup has faded', () => {
    const tmpl = evaluateTemplateString(STACK);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NONE';
    runAt(tmpl, effects, 1000);
    expect(runAt(tmpl, effects, 1400)).toEqual({ r: 0, g: 0, b: 255 });
  });
});

describe('ResponsiveLockupL — LockupTrL<AlphaL<…, Bump<Scale<BladeAngle,TOP,BOTTOM>,SIZE>>, TR1, TR2, LOCKUP_NORMAL>', () => {
  // Codegen shape for lockupPosition = 0.5, lockupRadius = 0.12.
  const CODE = 'ResponsiveLockupL<Rgb<255,255,255>,TrInstant,TrFade<300>,Int<18350>,Int<14418>,Int<3932>>';

  it('reacts to a NORMAL lockup only', () => {
    for (const other of ['LOCKUP_DRAG', 'LOCKUP_MELT', 'LOCKUP_LIGHTNING_BLOCK'] as const) {
      const tmpl = evaluateTemplateString(CODE);
      const effects = new EffectManager();
      effects.lockupType = other;
      expect(runAt(tmpl, effects, 1000)).toEqual({ r: 0, g: 0, b: 0 });
    }
    const tmpl = evaluateTemplateString(CODE);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    const c = runAt(tmpl, effects, 1000);
    expect(c.r).toBeGreaterThan(200);
  });

  it('centres the bump between TOP and BOTTOM at a level blade and stays local', () => {
    const tmpl = evaluateTemplateString(CODE);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    tmpl.run(stateAt(1000), effects);
    const centre = tmpl.getColor(72);
    const hilt = tmpl.getColor(5);
    const tip = tmpl.getColor(140);
    expect(centre.r).toBeGreaterThan(200);
    expect(hilt).toEqual({ r: 0, g: 0, b: 0 });
    expect(tip).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('fades out over TR2 after release', () => {
    const tmpl = evaluateTemplateString(CODE);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    runAt(tmpl, effects, 0);
    effects.lockupType = 'LOCKUP_NONE';
    runAt(tmpl, effects, 4000);
    const mid = runAt(tmpl, effects, 4150);
    expect(mid.r).toBeGreaterThan(0);
    expect(mid.r).toBeLessThan(200);
    expect(runAt(tmpl, effects, 4300)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('restartTransition', () => {
  it('re-arms nested transition clocks', () => {
    const tr = evaluateTemplateString('TrConcat<TrFade<100>,Rgb<255,0,0>,TrFade<100>>');
    const effects = new EffectManager();
    tr.run(stateAt(0), effects);
    tr.run(stateAt(1000), effects);
    expect(tr.getInteger(0)).toBe(32768); // long done
    restartTransition(tr, 1000);
    tr.run(stateAt(1050), effects);
    const mid = tr.getInteger(0);
    expect(mid).toBeGreaterThan(10000);
    expect(mid).toBeLessThan(22000);
  });
});
