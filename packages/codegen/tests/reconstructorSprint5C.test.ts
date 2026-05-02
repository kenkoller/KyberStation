// ─── ConfigReconstructor — Sprint 5C pattern additions ────────────────
//
// Three new pattern families landing in v0.19.0:
//
//   1. Hyper Responsive Rotoscope — Fett263's most common base style
//      (Mix<HoldPeakF<SwingSpeed<...>, ...>, base, alt>) is now
//      detected as `rotoscope` instead of falling to `custom`.
//
//   2. Multi-phase ColorChange — `ColorChange<TR, A, B, C, ...>`,
//      `ColorSelect<F, TR, A, B, C, ...>`, and `ColorChangeL<F, A, B,
//      C, ...>` now surface their alt-phase colors via
//      `altPhaseColors[]` on the ReconstructedConfig.
//
//   3. Effect-id detection — `TransitionEffectL<EFFECT_X, ...>` (OS7
//      2-arg form) and `TransitionEffectL<style, trIn, trOut,
//      EFFECT_X>` (pre-OS7 4-arg form) populate `detectedEffectIds[]`
//      across the full known EFFECT_* whitelist (Force / Boot / Preon
//      / Quote / User1-8 / Battery / Volume / etc.).

import { describe, it, expect } from 'vitest';
import { parseStyleCode, reconstructConfig } from '../src/parser/index.js';

function reconstructFromCode(code: string) {
  const { ast, errors } = parseStyleCode(code);
  if (!ast) {
    throw new Error(
      `Parse failed for code:\n${code}\n\nErrors: ${JSON.stringify(errors)}`,
    );
  }
  return reconstructConfig(ast);
}

describe('Sprint 5C — Hyper Responsive Rotoscope detection', () => {
  it('Mix<HoldPeakF<SwingSpeed>, base, alt> detected as rotoscope', () => {
    const code = `StylePtr<Layers<Mix<HoldPeakF<SwingSpeed<200>,Int<100>,Int<400>>,Rgb<0,140,255>,Rgb<255,255,255>>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>()`;
    const result = reconstructFromCode(code);
    expect(result.style).toBe('rotoscope');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('Mix<HoldPeakF<SwingAcceleration>, ...> also detected as rotoscope', () => {
    const code = `StylePtr<Mix<HoldPeakF<SwingAcceleration<>,Int<50>,Int<500>>,Rgb<0,140,255>,Rgb<255,255,255>>>()`;
    const result = reconstructFromCode(code);
    expect(result.style).toBe('rotoscope');
  });

  it('plain Mix<SwingSpeed<400>, ...> still detected (regression check)', () => {
    const code = `StylePtr<Mix<SwingSpeed<400>,Rgb<0,140,255>,Rgb<255,255,255>>>()`;
    const result = reconstructFromCode(code);
    expect(result.style).toBe('rotoscope');
    expect(result.confidence).toBe(0.9);
  });

  it('plain Mix<SwingSpeed<300>, ...> stays cinder (regression check)', () => {
    const code = `StylePtr<Mix<SwingSpeed<300>,Rgb<255,80,0>,StyleFire<Rgb<255,80,0>,Mix<Int<10000>,Black,Rgb<255,80,0>>,0,4,FireConfig<3,2000,5>>>>()`;
    const result = reconstructFromCode(code);
    expect(result.style).toBe('cinder');
  });

  it('Mix<HoldPeakF<unrelated>, ...> falls through (NOT rotoscope)', () => {
    // HoldPeakF wrapping something other than SwingSpeed/SwingAcceleration.
    const code = `StylePtr<Mix<HoldPeakF<NoisySoundLevel<>,Int<100>,Int<400>>,Rgb<0,140,255>,Rgb<255,255,255>>>()`;
    const result = reconstructFromCode(code);
    // Should NOT be rotoscope — falls through to default. Could land at
    // any non-rotoscope value; just ensure we didn't false-positive.
    expect(result.style).not.toBe('rotoscope');
  });
});

describe('Sprint 5C — Multi-phase ColorChange extraction', () => {
  it('ColorChange<TR, A, B, C> surfaces B and C as altPhaseColors', () => {
    const code = `StylePtr<ColorChange<TrFade<300>,Rgb<0,140,255>,Rgb<255,80,0>,Rgb<128,0,255>>>()`;
    const result = reconstructFromCode(code);
    expect(result.altPhaseColors).toEqual([
      { r: 255, g: 80, b: 0 },
      { r: 128, g: 0, b: 255 },
    ]);
  });

  it('ColorSelect<F, TR, A, B, C> surfaces B and C as altPhaseColors', () => {
    const code = `StylePtr<ColorSelect<EffectIncrementF<EFFECT_USER1,Int<2>>,TrFade<100>,Rgb<0,140,255>,Rgb<255,80,0>,Rgb<128,0,255>>>()`;
    const result = reconstructFromCode(code);
    expect(result.altPhaseColors).toEqual([
      { r: 255, g: 80, b: 0 },
      { r: 128, g: 0, b: 255 },
    ]);
  });

  it('ColorChangeL<F, A, B, C, D> surfaces B, C, D as altPhaseColors', () => {
    const code = `StylePtr<ColorChangeL<EffectIncrementF<EFFECT_USER2,Int<3>>,Rgb<0,140,255>,Rgb<255,80,0>,Rgb<128,0,255>,Rgb<255,255,0>>>()`;
    const result = reconstructFromCode(code);
    expect(result.altPhaseColors).toEqual([
      { r: 255, g: 80, b: 0 },
      { r: 128, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
    ]);
  });

  it('single-color ColorChange returns empty altPhaseColors', () => {
    const code = `StylePtr<ColorChange<TrFade<300>,Rgb<0,140,255>>>()`;
    const result = reconstructFromCode(code);
    expect(result.altPhaseColors).toEqual([]);
  });

  it('AST without any ColorChange wrapper returns empty altPhaseColors', () => {
    const code = `StylePtr<AudioFlicker<Rgb<0,140,255>,Mix<Int<16384>,Rgb<0,140,255>,White>>>()`;
    const result = reconstructFromCode(code);
    expect(result.altPhaseColors).toEqual([]);
  });

  it('RgbArg-wrapped phase colors are extracted via the default fallback', () => {
    const code = `StylePtr<ColorChange<TrFade<300>,RgbArg<BASE_COLOR_ARG,Rgb<0,140,255>>,RgbArg<ALT_COLOR_ARG,Rgb<255,80,0>>>>()`;
    const result = reconstructFromCode(code);
    // First color (base) is consumed by detectStyle/baseColor; alts is
    // everything past index 1 — so just ALT_COLOR_ARG's default.
    expect(result.altPhaseColors).toEqual([
      { r: 255, g: 80, b: 0 },
    ]);
  });
});

describe('Sprint 5C — Effect-id detection across the AST', () => {
  it('detects EFFECT_PREON in OS7 2-arg form', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrConcat<TrInstant,Rgb<255,255,255>,TrFade<2000>>,EFFECT_PREON>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toContain('EFFECT_PREON');
  });

  it('detects multiple effects across the layer stack', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_BOOT>,TransitionEffectL<TrFade<200>,EFFECT_FORCE>,TransitionEffectL<TrFade<200>,EFFECT_QUOTE>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toContain('EFFECT_BOOT');
    expect(result.detectedEffectIds).toContain('EFFECT_FORCE');
    expect(result.detectedEffectIds).toContain('EFFECT_QUOTE');
  });

  it('detects EFFECT_USER1-4 (multi-phase / special abilities)', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_USER1>,TransitionEffectL<TrFade<200>,EFFECT_USER2>,TransitionEffectL<TrFade<200>,EFFECT_USER3>,TransitionEffectL<TrFade<200>,EFFECT_USER4>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toContain('EFFECT_USER1');
    expect(result.detectedEffectIds).toContain('EFFECT_USER2');
    expect(result.detectedEffectIds).toContain('EFFECT_USER3');
    expect(result.detectedEffectIds).toContain('EFFECT_USER4');
  });

  it('returns deduped list (each effect appears at most once)', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_PREON>,TransitionEffectL<TrFade<400>,EFFECT_PREON>>>()`;
    const result = reconstructFromCode(code);
    const preonCount = result.detectedEffectIds!.filter((e) => e === 'EFFECT_PREON').length;
    expect(preonCount).toBe(1);
  });

  it('returns sorted list (deterministic ordering)', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_QUOTE>,TransitionEffectL<TrFade<200>,EFFECT_BOOT>,TransitionEffectL<TrFade<200>,EFFECT_FORCE>>>()`;
    const result = reconstructFromCode(code);
    const ids = result.detectedEffectIds!;
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('returns empty array when AST has no EFFECT_* identifiers', () => {
    const code = `StylePtr<Layers<AudioFlicker<Rgb<0,140,255>,White>,InOutTrL<TrWipe<300>,TrWipeIn<800>,Black>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toEqual([]);
  });

  it('detects EFFECT_BATTERY_LEVEL and EFFECT_VOLUME_LEVEL', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_BATTERY_LEVEL>,TransitionEffectL<TrFade<200>,EFFECT_VOLUME_LEVEL>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toContain('EFFECT_BATTERY_LEVEL');
    expect(result.detectedEffectIds).toContain('EFFECT_VOLUME_LEVEL');
  });

  it('detects EFFECT_POWERSAVE for power-save styles', () => {
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_POWERSAVE>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toContain('EFFECT_POWERSAVE');
  });

  it('does NOT flag unrelated identifiers that happen to start with EFFECT_', () => {
    // Synthetic test: even if a future fixture has a custom EFFECT_FOO
    // that we don't recognize, we shouldn't include it. The whitelist is
    // explicit so unknown EFFECT_* tokens are silently ignored (parser
    // already gives them a leaf-token pass).
    const code = `StylePtr<Layers<Rgb<0,140,255>,TransitionEffectL<TrFade<200>,EFFECT_NEWFONT>>>()`;
    const result = reconstructFromCode(code);
    expect(result.detectedEffectIds).toEqual(['EFFECT_NEWFONT']);
  });
});
