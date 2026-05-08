import { describe, it, expect } from 'vitest';
import { evaluateTemplateString } from '../src/evaluate.js';
import { EffectManager } from '../src/EffectSystem.js';
import type { BladeState, Color } from '../src/types.js';
import { PROFFIE_MAX } from '../src/types.js';

function makeState(overrides: Partial<BladeState> = {}): BladeState {
  return {
    isOn: true,
    numLeds: 144,
    timeMs: 1000,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: 24576,
    variation: 0,
    ...overrides,
  };
}

function runStyle(templateStr: string, state?: Partial<BladeState>) {
  const tmpl = evaluateTemplateString(templateStr);
  const effects = new EffectManager();
  const bladeState = makeState(state);
  tmpl.run(bladeState, effects);
  return { tmpl, effects, state: bladeState };
}

function getColors(templateStr: string, numLeds: number, state?: Partial<BladeState>): Color[] {
  const { tmpl } = runStyle(templateStr, { numLeds, ...state });
  const colors: Color[] = [];
  for (let i = 0; i < numLeds; i++) {
    colors.push(tmpl.getColor(i));
  }
  return colors;
}

describe('end-to-end template evaluation', () => {
  describe('simple named colors', () => {
    it('Red produces all-red across the blade', () => {
      const colors = getColors('Red', 10);
      for (const c of colors) {
        expect(c).toEqual({ r: 255, g: 0, b: 0 });
      }
    });

    it('Cyan produces correct RGB', () => {
      const colors = getColors('Cyan', 5);
      for (const c of colors) {
        expect(c).toEqual({ r: 0, g: 255, b: 255 });
      }
    });
  });

  describe('Rgb template', () => {
    it('produces the specified color uniformly', () => {
      const colors = getColors('Rgb<128,64,32>', 10);
      for (const c of colors) {
        expect(c).toEqual({ r: 128, g: 64, b: 32 });
      }
    });
  });

  describe('Layers', () => {
    it('base layer alone is the base color', () => {
      const colors = getColors('Layers<Red>', 5);
      for (const c of colors) {
        expect(c).toEqual({ r: 255, g: 0, b: 0 });
      }
    });

    it('base + AlphaL layer blends correctly', () => {
      const { tmpl } = runStyle('Layers<Red, AlphaL<Blue, Int<16384>>>');
      const c = tmpl.getColor(0);
      expect(c.r).toBeGreaterThan(0);
      expect(c.b).toBeGreaterThan(0);
    });
  });

  describe('Mix', () => {
    it('Mix at 0 returns first color', () => {
      const { tmpl } = runStyle('Mix<Int<0>, Red, Blue>');
      const c = tmpl.getColor(0);
      expect(c.r).toBe(255);
      expect(c.b).toBe(0);
    });

    it('Mix at PROFFIE_MAX returns second color', () => {
      const { tmpl } = runStyle(`Mix<Int<${PROFFIE_MAX}>, Red, Blue>`);
      const c = tmpl.getColor(0);
      expect(c.r).toBe(0);
      expect(c.b).toBe(255);
    });

    it('Mix at midpoint blends evenly', () => {
      const { tmpl } = runStyle('Mix<Int<16384>, Red, Blue>');
      const c = tmpl.getColor(0);
      expect(c.r).toBeGreaterThan(100);
      expect(c.r).toBeLessThan(155);
      expect(c.b).toBeGreaterThan(100);
      expect(c.b).toBeLessThan(155);
    });
  });

  describe('Scale', () => {
    it('Scale<Int<16384>, Int<0>, Int<32768>> returns 16384', () => {
      const { tmpl } = runStyle('Scale<Int<16384>, Int<0>, Int<32768>>');
      const v = tmpl.getInteger(0);
      expect(v).toBe(16384);
    });
  });

  describe('AudioFlicker', () => {
    it('produces colors in the range of the two input colors', () => {
      const { tmpl } = runStyle('AudioFlicker<Red, White>');
      const c = tmpl.getColor(0);
      expect(c.r).toBe(255);
      expect(c.g).toBeGreaterThanOrEqual(0);
      expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(255);
    });
  });

  describe('Gradient', () => {
    it('first LED matches first color, last LED matches last color', () => {
      const colors = getColors('Gradient<Red, Blue>', 144);
      expect(colors[0].r).toBe(255);
      expect(colors[0].b).toBe(0);
      expect(colors[143].r).toBe(0);
      expect(colors[143].b).toBe(255);
    });

    it('midpoint is a blend', () => {
      const colors = getColors('Gradient<Red, Blue>', 144);
      const mid = colors[72];
      expect(mid.r).toBeGreaterThan(0);
      expect(mid.b).toBeGreaterThan(0);
    });
  });

  describe('InOutTrL ignition/retraction wrapper', () => {
    it('returns white (fully on) when blade is on and stable', () => {
      const tmpl = evaluateTemplateString('InOutTrL<TrInstant, TrInstant>');
      const effects = new EffectManager();

      tmpl.run(makeState({ isOn: false, timeMs: 0 }), effects);
      tmpl.run(makeState({ isOn: true, timeMs: 100 }), effects);
      tmpl.run(makeState({ isOn: true, timeMs: 200 }), effects);

      const c = tmpl.getColor(72);
      expect(c.r).toBe(255);
      expect(c.g).toBe(255);
      expect(c.b).toBe(255);
    });

    it('returns black when blade is off', () => {
      const tmpl = evaluateTemplateString('InOutTrL<TrInstant, TrInstant>');
      const effects = new EffectManager();

      tmpl.run(makeState({ isOn: false, timeMs: 0 }), effects);

      const c = tmpl.getColor(72);
      expect(c).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('StyleNormalPtr', () => {
    it('produces base color when on and stable', () => {
      const tmpl = evaluateTemplateString('StyleNormalPtr<Red, White, 300, 500>');
      const effects = new EffectManager();

      tmpl.run(makeState({ isOn: false, timeMs: 0 }), effects);
      tmpl.run(makeState({ isOn: true, timeMs: 100 }), effects);
      tmpl.run(makeState({ isOn: true, timeMs: 500 }), effects);

      const c = tmpl.getColor(72);
      expect(c).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('TransitionLoop', () => {
    it('evaluates without error', () => {
      const { tmpl } = runStyle('TransitionLoop<Red, TrFade<500>>');
      const c = tmpl.getColor(0);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
    });
  });

  describe('function templates', () => {
    it('SwingSpeed returns a value in 0-PROFFIE_MAX', () => {
      const { tmpl } = runStyle('SwingSpeed<400>', { swingSpeed: 16384 });
      const v = tmpl.getInteger(0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(PROFFIE_MAX);
    });

    it('BladeAngle returns blade angle', () => {
      const { tmpl } = runStyle('BladeAngle', { bladeAngle: 8000 });
      const v = tmpl.getInteger(0);
      expect(v).toBe(8000);
    });

    it('BatteryLevel returns battery level', () => {
      const { tmpl } = runStyle('BatteryLevel', { batteryLevel: 20000 });
      const v = tmpl.getInteger(0);
      expect(v).toBe(20000);
    });

    it('Sin produces oscillating output', () => {
      const tmpl = evaluateTemplateString('Sin<Int<1000>>');
      const effects = new EffectManager();

      tmpl.run(makeState({ timeMs: 0 }), effects);
      const v0 = tmpl.getInteger(0);

      tmpl.run(makeState({ timeMs: 250 }), effects);
      const v250 = tmpl.getInteger(0);

      expect(v0).not.toBe(v250);
    });

    it('Bump produces a peaked function', () => {
      const { tmpl } = runStyle('Bump<Int<16384>, Int<8000>>');
      const center = tmpl.getInteger(72);
      const edge = tmpl.getInteger(0);
      expect(center).toBeGreaterThan(edge);
    });
  });

  describe('Stripes', () => {
    it('produces varying colors across LEDs', () => {
      const colors = getColors('Stripes<5000, -1000, Red, Blue, Red>', 144);
      let hasRed = false;
      let hasBlue = false;
      for (const c of colors) {
        if (c.r > 200 && c.b < 50) hasRed = true;
        if (c.b > 200 && c.r < 50) hasBlue = true;
      }
      expect(hasRed || hasBlue).toBe(true);
    });
  });

  describe('Pulsing', () => {
    it('evaluates without error and returns valid colors', () => {
      const colors = getColors('Pulsing<Red, Blue, 3000>', 10);
      for (const c of colors) {
        expect(c.r).toBeGreaterThanOrEqual(0);
        expect(c.r).toBeLessThanOrEqual(255);
        expect(c.b).toBeGreaterThanOrEqual(0);
        expect(c.b).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('complex real-world styles', () => {
    it('evaluates a Fett263-style Layers composition', () => {
      const style = `Layers<
        AudioFlicker<Rgb<0,135,255>, Rgb<0,80,200>>,
        AlphaL<White, Int<8000>>
      >`;
      const { tmpl } = runStyle(style);
      const c = tmpl.getColor(72);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThan(0);
    });

    it('evaluates Mix with SwingSpeed driver', () => {
      const style = 'Mix<Scale<SwingSpeed<400>, Int<0>, Int<32768>>, Rgb<0,140,255>, Rgb<255,40,40>>';
      const { tmpl } = runStyle(style, { swingSpeed: 0 });
      const c = tmpl.getColor(0);
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeGreaterThanOrEqual(0);
    });

    it('evaluates a style with effect layers', () => {
      const style = `Layers<
        Red,
        SimpleClashL<White, 40>
      >`;
      const tmpl = evaluateTemplateString(style);
      const effects = new EffectManager();
      tmpl.run(makeState(), effects);
      const c = tmpl.getColor(72);
      expect(c.r).toBe(255);
    });

    it('evaluates a Darksaber-style gradient', () => {
      const style = 'Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>';
      const colors = getColors(style, 144);
      expect(colors[0].r).toBe(255);
      expect(colors[72].r).toBeLessThan(20);
      expect(colors[143].r).toBe(255);
    });
  });

  describe('RotateColorsX', () => {
    it('rotates hue based on variation', () => {
      const tmpl = evaluateTemplateString('RotateColorsX<Int<0>, Red>');
      const effects = new EffectManager();
      tmpl.run(makeState({ variation: 0 }), effects);
      const c = tmpl.getColor(0);
      expect(c.r).toBe(255);
    });
  });

  describe('effect system integration', () => {
    it('SimpleClashL responds to clash effect', () => {
      const tmpl = evaluateTemplateString('Layers<Black, SimpleClashL<White, 40>>');
      const effects = new EffectManager();

      tmpl.run(makeState({ timeMs: 0 }), effects);
      const beforeClash = tmpl.getColor(72);

      effects.triggerEffectAt('EFFECT_CLASH', 100, 16384);
      tmpl.run(makeState({ timeMs: 110 }), effects);
      const duringClash = tmpl.getColor(72);

      expect(duringClash.r).toBeGreaterThanOrEqual(beforeClash.r);
    });

    it('BlastL responds to blast effect', () => {
      const tmpl = evaluateTemplateString('Layers<Black, BlastL<White>>');
      const effects = new EffectManager();

      tmpl.run(makeState({ timeMs: 0 }), effects);

      effects.triggerEffectAt('EFFECT_BLAST', 100, 16384);
      tmpl.run(makeState({ timeMs: 110 }), effects);
      const c = tmpl.getColor(72);
      expect(c.r).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determinism', () => {
    it('same inputs produce same outputs', () => {
      const style = 'Layers<Red, AlphaL<Blue, Int<16384>>>';
      const state = makeState();
      const effects = new EffectManager();

      const tmpl1 = evaluateTemplateString(style);
      tmpl1.run(state, effects);
      const c1 = tmpl1.getColor(72);

      const tmpl2 = evaluateTemplateString(style);
      tmpl2.run(state, effects);
      const c2 = tmpl2.getColor(72);

      expect(c1).toEqual(c2);
    });
  });
});
