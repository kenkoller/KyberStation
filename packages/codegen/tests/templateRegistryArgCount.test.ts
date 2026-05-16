// ─── Template Registry argTypes Regression Tests ───
//
// Pin the corrected `argTypes.length` for ProffieOS templates whose
// registry signature was bumped by the PR #328 fixture-corpus audit.
//
// Background:
//
//   PR #328 (commit 216c7b1, branch `test/fett263-import-roundtrip-expansion`)
//   added 18 hand-authored round-trip fixtures and, while landing them,
//   surfaced a table of ~14 candidate registry mismatches between
//   `TemplateDefinition.argTypes.length` and what real-world Fett263 /
//   ProffieOS sources emit. Each candidate was verified against ProffieOS
//   source under `/Users/KK/ProffieOS/` and against the KyberStation
//   template-eval engine implementation (`packages/template-eval/src/templates/`).
//
//   Templates with VERIFIED single-count signatures got their `argTypes`
//   updated; the rest were either already correct, required parser-side
//   variadic support (out of scope per the audit brief), or had PR #328's
//   claimed real-world count contradicted by source inspection (in which
//   case the original registration was kept and documented as a skip).
//
// These tests pin the corrected counts. They run identically headless,
// in browser, and against the workspace dependency graph — there's no
// DOM coupling.
//
// Source-of-truth references:
//
//   - ProffieOS source:           /Users/KK/ProffieOS/
//   - KyberStation template-eval: packages/template-eval/src/templates/
//   - PR #328 PR body:            github.com/kenkoller/KyberStation/pull/328

import { describe, it, expect } from 'vitest';
import { lookupTemplate } from '../src/templates/index.js';

describe('Template registry argTypes — corrected v0.22.x (PR #328 audit)', () => {
  describe('layers.ts', () => {
    it('TransitionLoopL has 1 argType (TRANSITION)', () => {
      // ProffieOS styles/transition_loop.h:
      //   template<class TRANSITION>
      //   class TransitionLoopL { ... };
      // Previously registered as 2 args ['COLOR', 'TRANSITION'] (incorrect).
      // The non-L sister `TransitionLoop<COLOR, TRANSITION>` (2 args) is a
      // separate template — that registration is unchanged.
      const def = lookupTemplate('TransitionLoopL');
      expect(def).toBeDefined();
      expect(def?.argTypes).toEqual(['TRANSITION']);
      expect(def?.argTypes.length).toBe(1);
    });

    it('TransitionPulseL has 2 argTypes (TRANSITION, FUNCTION)', () => {
      // ProffieOS styles/transition_pulse.h:
      //   template<class TRANSITION, class PULSE>
      //   class TransitionPulseL { ... };
      // Previously registered as 3 args ['COLOR', 'TRANSITION', 'FUNCTION'] (incorrect).
      const def = lookupTemplate('TransitionPulseL');
      expect(def).toBeDefined();
      expect(def?.argTypes).toEqual(['TRANSITION', 'FUNCTION']);
      expect(def?.argTypes.length).toBe(2);
    });

    it('TransitionLoopWhileL has 2 argTypes (TRANSITION, FUNCTION)', () => {
      // KyberStation Fett263 stylebrary helper — not stock ProffieOS.
      // Per packages/template-eval/src/templates/wrappers.ts:887:
      //   TransitionLoopWhileLTemplate(args): args[0]=transition, args[1]=condition_f
      // Previously registered as 3 args ['TRANSITION', 'TRANSITION', 'FUNCTION'] (incorrect).
      const def = lookupTemplate('TransitionLoopWhileL');
      expect(def).toBeDefined();
      expect(def?.argTypes).toEqual(['TRANSITION', 'FUNCTION']);
      expect(def?.argTypes.length).toBe(2);
    });

    it('ResponsiveLightningBlockL has 3 argTypes (COLOR, TRANSITION, TRANSITION)', () => {
      // ProffieOS styles/responsive_styles.h:71:
      //   template<class COLOR, class TR1 = TrInstant, class TR2 = TrInstant,
      //            class CONDITION = Int<1>>
      //   using ResponsiveLightningBlockL = LockupTrL<...>;
      // Documented as ResponsiveLightningBlockL<COLOR, TR1, TR2>; CONDITION
      // defaults to Int<1> and is rarely user-supplied. Previously
      // registered as 1 arg ['COLOR'] (too restrictive — real-world
      // fixtures emit 3- and 4-arg forms with TR1/TR2 explicit).
      const def = lookupTemplate('ResponsiveLightningBlockL');
      expect(def).toBeDefined();
      expect(def?.argTypes).toEqual(['COLOR', 'TRANSITION', 'TRANSITION']);
      expect(def?.argTypes.length).toBe(3);
    });
  });

  describe('colors.ts', () => {
    it('Pixelate has 3 argTypes (COLOR, COLOR, INTEGER)', () => {
      // Sister-form of PixelateX with constant-int size. Follows the
      // PulsingL → PulsingX → Pulsing 3-form family pattern:
      //   PixelateX<F, COLOR1, COLOR2>     — function-driven size (3 args)
      //   Pixelate<COLOR1, COLOR2, INT>     — constant-int size (3 args)
      // Previously registered as 2 args ['COLOR', 'INTEGER'] (inconsistent
      // with PixelateXTemplate's 3-arg impl in packages/template-eval).
      const def = lookupTemplate('Pixelate');
      expect(def).toBeDefined();
      expect(def?.argTypes).toEqual(['COLOR', 'COLOR', 'INTEGER']);
      expect(def?.argTypes.length).toBe(3);
    });
  });

  // ── Templates where PR #328's claimed mismatch was contradicted by
  //    ProffieOS source — pin the registry's existing (correct) count so
  //    a future drive-by edit doesn't reintroduce the bug. ────────────
  describe('verified-correct templates (no change required)', () => {
    it('ResponsiveLockupL has 6 argTypes — PR #328 claim of 5 was incorrect', () => {
      // ProffieOS styles/responsive_styles.h:15:
      //   template<class COLOR, class TR1 = TrInstant, class TR2 = TrInstant,
      //            class TOP = ..., class BOTTOM = Int<6000>,
      //            class SIZE = ..., class CONDITION = Int<1>>
      // Real-world Fett263 emission is 6 args
      //   (COLOR, TR1, TR2, TOP, BOTTOM, SIZE); CONDITION is rarely supplied.
      // Verified against fixture
      //   apps/web/tests/fixtures/fett263-imports/responsive-lockup-with-blade-angle-position-os6.txt
      //   which emits 6 args.
      const def = lookupTemplate('ResponsiveLockupL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(6);
    });

    it('SimpleClashL has 2 argTypes — PR #328 claim of 1 was incorrect', () => {
      // ProffieOS styles/clash.h:
      //   template<class CLASH_COLOR = Rgb<255,255,255>, int CLASH_MILLIS = 40,
      //            BladeEffectType EFFECT = EFFECT_CLASH, class STAB_SHAPE = ...>
      //   class SimpleClashL { ... };
      // Documented as SimpleClashL<CLASH_COLOR, CLASH_MILLIS> (2 args).
      // Verified against ProffieOS config 89sabers-bt-2026-05-14.h backup
      // which emits SimpleClashL<Rgb<...>, 40> consistently.
      const def = lookupTemplate('SimpleClashL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(2);
    });

    it('PulsingL has 2 argTypes — PR #328 claim of 3 was incorrect', () => {
      // ProffieOS styles/pulsing.h:
      //   template<class COLOR2, typename PULSE_MILLIS>
      //   using PulsingL = AlphaL<COLOR2, PulsingF<PULSE_MILLIS>>;
      // PulsingL is 2 args. The 3-arg sister is `PulsingX<COLOR, COLOR, FUNC>`.
      const def = lookupTemplate('PulsingL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(2);
    });

    it('BrownNoiseFlickerL has 2 argTypes — PR #328 claim of 3 was incorrect', () => {
      // ProffieOS styles/brown_noise_flicker.h:
      //   template<class B, class GRADE>
      //   using BrownNoiseFlickerL = AlphaL<B, BrownNoiseF<GRADE>>;
      // 2 args. The 3-arg sister is `BrownNoiseFlicker<A, B, grade>`.
      const def = lookupTemplate('BrownNoiseFlickerL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(2);
    });

    it('StrobeL has 3 argTypes — PR #328 claim of 2 was incorrect', () => {
      // ProffieOS styles/strobe.h:
      //   template<class STROBE_COLOR, class STROBE_FREQUENCY, class STROBE_MILLIS>
      //   using StrobeL = AlphaL<STROBE_COLOR, StrobeF<STROBE_FREQUENCY, STROBE_MILLIS>>;
      const def = lookupTemplate('StrobeL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(3);
    });

    it('RandomBlinkL has 2 argTypes — PR #328 claim of 3 was incorrect', () => {
      // ProffieOS styles/random_blink.h:
      //   template<class MILLIHZ, class COLOR1 = WHITE>
      //   using RandomBlinkL = AlphaL<COLOR1, RandomBlinkF<MILLIHZ>>;
      const def = lookupTemplate('RandomBlinkL');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(2);
    });

    it('EffectPulse has 1 argType — PR #328 claim of 3 was incorrect', () => {
      // ProffieOS functions/effect_increment.h:7:
      //   // Usage: EffectPulse<EFFECT>
      //   template<BladeEffectType EFFECT> class EffectPulseSVF { ... };
      // 1 arg (EFFECT).
      const def = lookupTemplate('EffectPulse');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(1);
    });

    it('TrSparkX has 4 argTypes — PR #328 claim of 3 was incorrect', () => {
      // ProffieOS transitions/wave.h:
      //   template<class COLOR, class SPARK_SIZE = Int<100>,
      //            class SPARK_MS = Int<400>, class SPARK_CENTER = Int<16384>>
      //   class TrSparkX : public TransitionBaseX<SPARK_MS> { ... };
      // 4 args. Verified against ProffieOS config OS6_config_example.h.
      const def = lookupTemplate('TrSparkX');
      expect(def).toBeDefined();
      expect(def?.argTypes.length).toBe(4);
    });
  });
});
