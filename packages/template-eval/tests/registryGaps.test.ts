// ─── Registry Gap Tests ───
// Verify the 6 newly-added templates are registered and produce sane output.

import { describe, it, expect } from 'vitest';
import { isRegistered, registrySize } from '../src/registry.js';
import { evaluateTemplate } from '../src/evaluate.js';
import { parseTemplateString } from '../src/parser.js';
import { EffectManager } from '../src/EffectSystem.js';
import type { BladeState } from '../src/types.js';
import { PROFFIE_MAX } from '../src/types.js';

// Helper: create a default blade state at a given time
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

describe('registry gap templates', () => {
  // ─── Registration checks ───

  describe('all 6 new templates are registered', () => {
    const newNames = [
      'PulsingF',
      'VolumeLevel',
      'EffectPulseF',
      'ModF',
      'BendTimePowX',
      'TrCenterWipeInSpark',
    ];

    for (const name of newNames) {
      it(`registers ${name}`, () => {
        expect(isRegistered(name)).toBe(true);
      });
    }
  });

  it('registry count increased (from 153 to 408)', () => {
    // Phase 3 Step 2 added 36 entries: 7 SaberBase::LOCKUP_* tags +
    // 7 unqualified LOCKUP_* aliases + 21 EFFECT_* tags + 1 FireConfig.
    expect(registrySize()).toBe(408);
  });

  // ─── PulsingF ───

  describe('PulsingF', () => {
    it('produces values in 0-32768 range', () => {
      const node = parseTemplateString('PulsingF<Int<1000>>');
      const template = evaluateTemplate(node);
      const state = makeState(250);
      const effects = new EffectManager();

      template.run(state, effects);
      const value = template.getInteger(0);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(PROFFIE_MAX);
    });

    it('oscillates over time', () => {
      const node = parseTemplateString('PulsingF<Int<1000>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      // At t=0 (sin(0) = 0, mapped to 0.5 * MAX)
      template.run(makeState(0), effects);
      const v0 = template.getInteger(0);

      // At t=250 (sin(pi/2) = 1, mapped to 1.0 * MAX)
      template.run(makeState(250), effects);
      const v250 = template.getInteger(0);

      // At t=750 (sin(3pi/2) = -1, mapped to 0.0)
      template.run(makeState(750), effects);
      const v750 = template.getInteger(0);

      // v250 should be near peak (32768), v750 should be near 0
      expect(v250).toBeGreaterThan(v0);
      expect(v750).toBeLessThan(v0);
    });

    it('has getChildren returning the speed arg', () => {
      const node = parseTemplateString('PulsingF<Int<1000>>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(1);
    });
  });

  // ─── VolumeLevel ───

  describe('VolumeLevel', () => {
    it('returns a mid-range value (half max)', () => {
      const node = parseTemplateString('VolumeLevel<>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBe(Math.floor(PROFFIE_MAX / 2));
    });

    it('has no children', () => {
      const node = parseTemplateString('VolumeLevel<>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(0);
    });
  });

  // ─── EffectPulseF ───

  describe('EffectPulseF', () => {
    it('returns 0 when no effect is active', () => {
      const node = parseTemplateString('EffectPulseF<Int<0>,Int<500>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBe(0);
    });

    it('has getChildren returning both args', () => {
      const node = parseTemplateString('EffectPulseF<Int<0>,Int<500>>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(2);
    });
  });

  // ─── ModF ───

  describe('ModF', () => {
    it('computes modulo correctly', () => {
      // 10000 % 3000 = 1000
      const node = parseTemplateString('ModF<Int<10000>,Int<3000>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBe(10000 % 3000);
    });

    it('returns 0 when divisor is 0', () => {
      const node = parseTemplateString('ModF<Int<10000>,Int<0>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBe(0);
    });

    it('has getChildren returning both args', () => {
      const node = parseTemplateString('ModF<Int<10000>,Int<3000>>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(2);
    });
  });

  // ─── BendTimePowX ───

  describe('BendTimePowX', () => {
    it('returns values in 0-32768 range', () => {
      const node = parseTemplateString('BendTimePowX<Int<16384>,Int<16384>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(PROFFIE_MAX);
    });

    it('identity: exponent=32768 (power=1.0) returns input unchanged', () => {
      // t = 16384/32768 = 0.5, power = 32768/32768 = 1.0
      // result = 0.5^1.0 = 0.5 * 32768 = 16384
      const node = parseTemplateString('BendTimePowX<Int<16384>,Int<32768>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      expect(value).toBe(16384);
    });

    it('square root: exponent=16384 (power=0.5) lifts mid-value', () => {
      // t = 16384/32768 = 0.5, power = 16384/32768 = 0.5
      // result = 0.5^0.5 = sqrt(0.5) ~ 0.707 * 32768 ~ 23170
      const node = parseTemplateString('BendTimePowX<Int<16384>,Int<16384>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      template.run(makeState(), effects);
      const value = template.getInteger(0);
      const expected = Math.round(Math.pow(0.5, 0.5) * PROFFIE_MAX);
      expect(Math.abs(value - expected)).toBeLessThan(2);
    });

    it('has getChildren returning both args', () => {
      const node = parseTemplateString('BendTimePowX<Int<16384>,Int<16384>>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(2);
    });
  });

  // ─── TrCenterWipeInSpark ───

  describe('TrCenterWipeInSpark', () => {
    it('has getInteger matching center-in wipe geometry', () => {
      const node = parseTemplateString('TrCenterWipeInSpark<Int<500>,Rgb<255,255,255>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      // At t=0, progress=0 — LEDs at edges (distFromEnd ~ 0) should be transitioned
      template.run(makeState(0), effects);
      const edgeLed = template.getInteger(0); // LED 0, nearest end
      const centerLed = template.getInteger(72); // LED 72, center of 144

      // Edge should be fully transitioned (near MAX), center should not yet
      expect(edgeLed).toBe(PROFFIE_MAX);
      expect(centerLed).toBe(0);
    });

    it('completes at progress=1', () => {
      const node = parseTemplateString('TrCenterWipeInSpark<Int<500>,Rgb<255,255,255>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      // First run to set startTime
      template.run(makeState(0), effects);
      // At t=500 (duration), progress=1 — all LEDs should be transitioned
      template.run(makeState(500), effects);
      const center = template.getInteger(72);
      expect(center).toBe(PROFFIE_MAX);
    });

    it('getColor produces spark pixels near the wipe front', () => {
      const node = parseTemplateString('TrCenterWipeInSpark<Int<1000>,Rgb<255,255,255>>');
      const template = evaluateTemplate(node);
      const effects = new EffectManager();

      // Set startTime
      template.run(makeState(0), effects);
      // At 50% progress, wipe front is ~0.5 from end
      template.run(makeState(500), effects);

      // Collect non-black spark colors in the transition zone
      let foundSpark = false;
      for (let led = 0; led < 144; led++) {
        const c = template.getColor(led);
        if (c.r > 0 || c.g > 0 || c.b > 0) {
          foundSpark = true;
          break;
        }
      }
      expect(foundSpark).toBe(true);
    });

    it('has getChildren returning the sparkColor arg', () => {
      const node = parseTemplateString('TrCenterWipeInSpark<Int<500>,Rgb<255,255,255>>');
      const template = evaluateTemplate(node);
      expect(template.getChildren().length).toBe(1);
    });
  });
});
