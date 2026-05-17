// ─── Phase 3 Step 2 Registry Gap Tests ───
// Verify the 36 newly-added tag templates parse + evaluate correctly
// and that LockupTrL / StyleFire honor their new trailing args.
//
// The three template families covered here:
//   - `SaberBase::LOCKUP_*` tags drive LockupTrL filtering
//   - `EFFECT_*` tags appear as TransitionEffectL's trailing arg
//   - `FireConfig<Cooling, Heating, IntensityBase>` parameterizes StyleFire

import { describe, it, expect } from 'vitest';
import { isRegistered } from '../src/registry.js';
import { evaluateTemplate, evaluateTemplateString } from '../src/evaluate.js';
import { parseTemplateString } from '../src/parser.js';
import { EffectManager } from '../src/EffectSystem.js';
import {
  LockupTypeTagTemplate,
  EffectTypeTagTemplate,
  FireConfigTemplate,
  isLockupTypeTag,
  isFireConfig,
} from '../src/templates/tags.js';
import type { BladeState, LockupType } from '../src/types.js';
import { PROFFIE_MAX } from '../src/types.js';

function makeState(timeMs = 1000): BladeState {
  return {
    isOn: true,
    numLeds: 144,
    timeMs,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: 24576,
    variation: 0,
  };
}

// ─── Lockup type tag registration ───

describe('SaberBase::LOCKUP_* tag registration', () => {
  const tagNames: ReadonlyArray<readonly [string, LockupType]> = [
    ['SaberBase::LOCKUP_NORMAL', 'LOCKUP_NORMAL'],
    ['SaberBase::LOCKUP_DRAG', 'LOCKUP_DRAG'],
    ['SaberBase::LOCKUP_LIGHTNING_BLOCK', 'LOCKUP_LIGHTNING_BLOCK'],
    ['SaberBase::LOCKUP_MELT', 'LOCKUP_MELT'],
    ['SaberBase::LOCKUP_ARMED', 'LOCKUP_ARMED'],
    ['SaberBase::LOCKUP_AUTOFIRE', 'LOCKUP_AUTOFIRE'],
    ['SaberBase::LOCKUP_NONE', 'LOCKUP_NONE'],
  ];

  for (const [name, expected] of tagNames) {
    it(`registers ${name} → ${expected}`, () => {
      expect(isRegistered(name)).toBe(true);

      const node = parseTemplateString(name);
      expect(node).not.toBeNull();
      const tmpl = evaluateTemplate(node!);
      expect(tmpl).toBeInstanceOf(LockupTypeTagTemplate);
      expect((tmpl as LockupTypeTagTemplate).getTag()).toBe(expected);
    });
  }

  it('unqualified LOCKUP_NORMAL alias resolves to the same payload', () => {
    expect(isRegistered('LOCKUP_NORMAL')).toBe(true);
    const tmpl = evaluateTemplate(parseTemplateString('LOCKUP_NORMAL')!);
    expect(isLockupTypeTag(tmpl)).toBe(true);
    expect((tmpl as LockupTypeTagTemplate).getTag()).toBe('LOCKUP_NORMAL');
  });

  it('tag templates are no-op leaves (getColor returns black, getInteger returns 0)', () => {
    const tmpl = evaluateTemplate(parseTemplateString('SaberBase::LOCKUP_NORMAL')!);
    const c = tmpl.getColor(0);
    expect(c).toEqual({ r: 0, g: 0, b: 0 });
    expect(tmpl.getInteger(0)).toBe(0);
    expect(tmpl.getChildren()).toEqual([]);
  });
});

// ─── Effect type tag registration ───

describe('EFFECT_* tag registration', () => {
  const tagNames = [
    'EFFECT_CLASH', 'EFFECT_BLAST', 'EFFECT_LOCKUP_BEGIN', 'EFFECT_LOCKUP_END',
    'EFFECT_DRAG_BEGIN', 'EFFECT_DRAG_END', 'EFFECT_STAB', 'EFFECT_FORCE',
    'EFFECT_PREON', 'EFFECT_IGNITION', 'EFFECT_RETRACTION', 'EFFECT_POSTOFF',
    'EFFECT_NEWFONT', 'EFFECT_BOOT', 'EFFECT_MELT',
    'EFFECT_USER1', 'EFFECT_USER2', 'EFFECT_USER3', 'EFFECT_USER4', 'EFFECT_USER5',
    'EFFECT_CHANGE',
  ];

  for (const name of tagNames) {
    it(`registers ${name}`, () => {
      expect(isRegistered(name)).toBe(true);
      const tmpl = evaluateTemplate(parseTemplateString(name)!);
      expect(tmpl).toBeInstanceOf(EffectTypeTagTemplate);
      expect((tmpl as EffectTypeTagTemplate).getTag()).toBe(name);
    });
  }
});

// ─── FireConfig structured leaf ───

describe('FireConfig template', () => {
  it('is registered', () => {
    expect(isRegistered('FireConfig')).toBe(true);
  });

  it('parses three integer args into Cooling / Heating / IntensityBase fields', () => {
    const tmpl = evaluateTemplate(parseTemplateString('FireConfig<3,2000,5>')!);
    expect(isFireConfig(tmpl)).toBe(true);
    expect((tmpl as FireConfigTemplate).cooling).toBe(3);
    expect((tmpl as FireConfigTemplate).heating).toBe(2000);
    expect((tmpl as FireConfigTemplate).intensityBase).toBe(5);
  });

  it('uses defaults when args are missing', () => {
    const tmpl = new FireConfigTemplate([]);
    expect(tmpl.cooling).toBe(3);
    expect(tmpl.heating).toBe(2000);
    expect(tmpl.intensityBase).toBe(5);
  });

  it('round-trips an `unstable`-style codegen string without throwing', () => {
    // Mirrors what ASTBuilder emits for the `unstable` style family.
    const code = 'StyleFire<Rgb<255,0,0>,Mix<Int<10000>,Rgb<255,0,0>,White>,0,4,FireConfig<3,2000,5>>';
    expect(() => evaluateTemplateString(code)).not.toThrow();
  });

  it('honors FireConfig parameters in the parent StyleFire (smoke test)', () => {
    // High cooling vs low cooling should produce different heat-map state.
    // We can only assert that both render without crashing — actual
    // pixel-level differences depend on Math.random() and are stochastic.
    const high = evaluateTemplateString(
      'StyleFire<Rgb<255,0,0>,Rgb<255,255,255>,0,2,FireConfig<10,3000,8>>',
    );
    const low = evaluateTemplateString(
      'StyleFire<Rgb<255,0,0>,Rgb<255,255,255>,0,2,FireConfig<1,500,2>>',
    );
    const state = makeState(0);
    const effects = new EffectManager();
    high.run(state, effects);
    low.run(state, effects);
    expect(high.getColor(72)).toBeDefined();
    expect(low.getColor(72)).toBeDefined();
  });

  it('StyleFire without FireConfig (4-arg shape) still works — `cinder` style preserved', () => {
    // The `cinder` style emits `StyleFire<Rgb,Rgb<255,100,0>,0,2>` with
    // no trailing FireConfig. Verify the 4-arg form parses and renders.
    const code = 'StyleFire<Rgb<10,5,2>,Rgb<255,100,0>,0,2>';
    const tmpl = evaluateTemplateString(code);
    const state = makeState(0);
    const effects = new EffectManager();
    tmpl.run(state, effects);
    expect(tmpl.getColor(50)).toBeDefined();
  });
});

// ─── LockupTrL with trailing tag ───

describe('LockupTrL with LockupType tag', () => {
  // Helper — build a full 5-arg LockupTrL string with a configurable tag.
  // Use TrInstant for the hold transition so it's at full alpha
  // immediately — otherwise `TrFade<300>` ramps from 0 over 300ms
  // and our single-frame `run()` calls show black.
  function makeLockupCode(tag: string): string {
    return `LockupTrL<AudioFlickerL<Rgb<255,255,255>>,TrInstant,TrInstant,TrFade<300>,${tag}>`;
  }

  it('parses with SaberBase::LOCKUP_NORMAL tag', () => {
    expect(() => evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_NORMAL'))).not.toThrow();
  });

  it('parses with SaberBase::LOCKUP_DRAG tag', () => {
    expect(() => evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_DRAG'))).not.toThrow();
  });

  it('parses with SaberBase::LOCKUP_LIGHTNING_BLOCK tag', () => {
    expect(() => evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_LIGHTNING_BLOCK'))).not.toThrow();
  });

  it('parses with SaberBase::LOCKUP_MELT tag', () => {
    expect(() => evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_MELT'))).not.toThrow();
  });

  it('activates when effects.lockupType matches the tag', () => {
    const tmpl = evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_NORMAL'));
    const state = makeState(1000);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';

    tmpl.run(state, effects);
    // While active and at the start of the hold, the layer emits color
    const c = tmpl.getColor(72);
    expect(c.r + c.g + c.b).toBeGreaterThan(0);
  });

  it('does NOT activate when effects.lockupType differs from the tag', () => {
    const tmpl = evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_DRAG'));
    const state = makeState(1000);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL'; // drag layer should NOT activate

    tmpl.run(state, effects);
    const c = tmpl.getColor(72);
    expect(c.r + c.g + c.b).toBe(0);
  });

  it('activates the drag layer when effects.lockupType === LOCKUP_DRAG', () => {
    const tmpl = evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_DRAG'));
    const state = makeState(1000);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_DRAG';

    tmpl.run(state, effects);
    const c = tmpl.getColor(72);
    expect(c.r + c.g + c.b).toBeGreaterThan(0);
  });

  it('preserves 4-arg backwards compatibility — activates on any non-NONE lockup', () => {
    // No trailing tag — emulates the older codegen output. Uses TrInstant
    // for the hold transition so it's at full alpha immediately.
    const code = 'LockupTrL<AudioFlickerL<Rgb<255,255,255>>,TrInstant,TrInstant,TrFade<300>>';
    const tmpl = evaluateTemplateString(code);
    const state = makeState(1000);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_LIGHTNING_BLOCK';

    tmpl.run(state, effects);
    const c = tmpl.getColor(72);
    expect(c.r + c.g + c.b).toBeGreaterThan(0);
  });

  it('LOCKUP_NONE deactivates a tagged layer (state machine reset)', () => {
    const tmpl = evaluateTemplateString(makeLockupCode('SaberBase::LOCKUP_NORMAL'));
    const effects = new EffectManager();

    // 1st run: lockup active, layer should activate
    effects.lockupType = 'LOCKUP_NORMAL';
    tmpl.run(makeState(1000), effects);

    // 2nd run: lockup ended, end-time should latch
    effects.lockupType = 'LOCKUP_NONE';
    tmpl.run(makeState(2000), effects);

    // Long after end (4s past), getColor should return black via the
    // end-transition fade-out path.
    tmpl.run(makeState(6000), effects);
    const c = tmpl.getColor(72);
    expect(c.r + c.g + c.b).toBe(0);
  });
});

// ─── Full preset shape (codegen output) ───

describe('codegen → template-eval round-trip', () => {
  it('parses a typical stable-style preset shape', () => {
    // Approximate the shape produced by ASTBuilder for a stable preset:
    // StylePtr<Layers<base, BlastL, SimpleClashL, LockupTrL<..., LOCKUP_NORMAL>, ...>>
    const code = `StylePtr<Layers<
      AudioFlicker<Rgb<0,128,255>,Mix<Int<16384>,Rgb<0,128,255>,White>>,
      BlastL<Rgb<255,255,255>>,
      SimpleClashL<Rgb<255,255,255>>,
      LockupTrL<AudioFlickerL<Rgb<255,255,255>>,TrInstant,TrFade<300>,TrFade<300>,SaberBase::LOCKUP_NORMAL>,
      LockupTrL<AudioFlickerL<Rgb<255,150,0>>,TrInstant,TrFade<400>,TrFade<400>,SaberBase::LOCKUP_DRAG>,
      LockupTrL<Stripes<3000,-3500,Rgb<100,100,255>,White,Rgb<50,50,200>>,TrInstant,TrFade<500>,TrFade<500>,SaberBase::LOCKUP_LIGHTNING_BLOCK>
    >>()`;

    expect(() => evaluateTemplateString(code)).not.toThrow();
  });

  it('parses a typical unstable-style preset shape with FireConfig', () => {
    const code = `StylePtr<Layers<
      StyleFire<Rgb<255,0,0>,Mix<Int<10000>,Rgb<255,0,0>,White>,0,4,FireConfig<3,2000,5>>,
      BlastL<Rgb<255,255,255>>,
      SimpleClashL<Rgb<255,255,255>>,
      LockupTrL<AudioFlickerL<Rgb<255,255,255>>,TrInstant,TrFade<300>,TrFade<300>,SaberBase::LOCKUP_NORMAL>
    >>()`;

    expect(() => evaluateTemplateString(code)).not.toThrow();
  });
});

// ─── Sanity — getColor + getInteger after one frame ───

describe('post-fix rendering smoke', () => {
  it('LockupTrL+LOCKUP_NORMAL produces valid getColor values across the blade', () => {
    const code = 'LockupTrL<AudioFlickerL<Rgb<255,255,255>>,TrInstant,TrFade<300>,TrFade<300>,SaberBase::LOCKUP_NORMAL>';
    const tmpl = evaluateTemplateString(code);
    const effects = new EffectManager();
    effects.lockupType = 'LOCKUP_NORMAL';
    tmpl.run(makeState(500), effects);

    for (let led = 0; led < 144; led++) {
      const c = tmpl.getColor(led);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
      expect(c.g).toBeGreaterThanOrEqual(0);
      expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(255);
    }
  });

  it('StyleFire+FireConfig produces valid getColor values across the blade', () => {
    const code = 'StyleFire<Rgb<255,0,0>,Rgb<255,255,255>,0,4,FireConfig<3,2000,5>>';
    const tmpl = evaluateTemplateString(code);
    const effects = new EffectManager();
    tmpl.run(makeState(500), effects);

    for (let led = 0; led < 144; led++) {
      const c = tmpl.getColor(led);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
      expect(c.g).toBeGreaterThanOrEqual(0);
      expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(255);
    }
  });

  // PROFFIE_MAX is imported above — keep the import live so the test file
  // doesn't churn its dependency surface in future edits.
  it('PROFFIE_MAX export is reachable from the test suite', () => {
    expect(PROFFIE_MAX).toBe(32768);
  });
});
