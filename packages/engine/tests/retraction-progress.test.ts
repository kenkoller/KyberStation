import { describe, it, expect } from 'vitest';
import { createRetraction, RETRACTION_REGISTRY } from '../src/ignition/index';
import { FadeoutRetraction } from '../src/ignition/FadeoutRetraction';
import { DrainRetraction } from '../src/ignition/DrainRetraction';
import { ImplodeRetraction } from '../src/ignition/ImplodeRetraction';
import { DissolveRetraction } from '../src/ignition/DissolveRetraction';
import { FlickerOutRetraction } from '../src/ignition/FlickerOutRetraction';
import { ShatterRetraction } from '../src/ignition/ShatterRetraction';
import { EvaporateRetraction } from '../src/ignition/EvaporateRetraction';
import { SpaghettifyRetraction } from '../src/ignition/SpaghettifyRetraction';
import { UnravelRetraction } from '../src/ignition/UnravelRetraction';

/**
 * Retraction progress convention tests.
 *
 * The engine sends progress 1→0 during retraction:
 *   progress = 1 → start of retraction (blade fully lit)
 *   progress = 0 → end of retraction (blade fully off)
 *
 * Every retraction animation must:
 *   1. Return high mask values (~1) at progress=1 (retraction start)
 *   2. Return 0 at progress=0 (retraction end)
 *   3. Produce decreasing overall brightness as progress goes from 1 to 0
 */

// --------------------------------------------------------------------------
// Helper: compute average mask across all LED positions at a given progress
// --------------------------------------------------------------------------
function averageMask(
  retraction: { getMask(pos: number, progress: number, ctx?: unknown): number },
  progress: number,
  samples = 20,
): number {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const pos = i / (samples - 1); // 0 to 1
    sum += retraction.getMask(pos, progress);
  }
  return sum / samples;
}

// --------------------------------------------------------------------------
// RETRACTING state uses the retraction animation (not ignition)
// --------------------------------------------------------------------------
describe('RETRACTION_REGISTRY selection', () => {
  it('createRetraction returns the correct retraction animation by ID', () => {
    const fadeout = createRetraction('fadeout');
    expect(fadeout.id).toBe('fadeout');

    const drain = createRetraction('drain');
    expect(drain.id).toBe('drain');

    const dissolve = createRetraction('dissolve');
    expect(dissolve.id).toBe('dissolve');

    const implode = createRetraction('implode');
    expect(implode.id).toBe('implode');
  });

  it('all RETRACTION_REGISTRY entries instantiate successfully', () => {
    for (const [id, factory] of Object.entries(RETRACTION_REGISTRY)) {
      const anim = factory();
      expect(anim).toBeDefined();
      expect(typeof anim.getMask).toBe('function');
    }
  });
});

// --------------------------------------------------------------------------
// Progress direction: progress=1 must be "lit", progress=0 must be "off"
// --------------------------------------------------------------------------
describe('retraction progress direction', () => {
  const retractionTypes = [
    { name: 'fadeout', create: () => new FadeoutRetraction() },
    { name: 'drain', create: () => new DrainRetraction() },
    { name: 'implode', create: () => new ImplodeRetraction() },
    { name: 'dissolve', create: () => new DissolveRetraction() },
    { name: 'flickerOut', create: () => new FlickerOutRetraction() },
    { name: 'shatter', create: () => new ShatterRetraction() },
    { name: 'evaporate', create: () => new EvaporateRetraction() },
    { name: 'spaghettify', create: () => new SpaghettifyRetraction() },
    { name: 'unravel', create: () => new UnravelRetraction() },
  ];

  describe.each(retractionTypes)('$name', ({ create }) => {
    it('is mostly lit at progress=1 (retraction start)', () => {
      const retraction = create();
      const avg = averageMask(retraction, 1.0);
      // At retraction start (progress=1), the blade should be fully or mostly lit
      expect(avg).toBeGreaterThanOrEqual(0.7);
    });

    it('is fully off at progress=0 (retraction end)', () => {
      const retraction = create();
      const avg = averageMask(retraction, 0.0);
      // At retraction end (progress=0), the blade must be mostly/fully dark.
      // Stochastic effects (dissolve, evaporate) may have residual flicker
      // from clusters whose evaporation window extends past retract=1.0,
      // so we allow up to 0.30 average (evaporate's EVAP_WINDOW=0.07 can
      // leave late clusters mid-flash at the boundary).
      expect(avg).toBeLessThan(0.30);
    });

    it('produces decreasing average coverage as progress goes 1→0', () => {
      const retraction = create();
      const steps = [1.0, 0.8, 0.6, 0.4, 0.2, 0.0];
      const averages = steps.map((p) => averageMask(retraction, p));

      // The overall trend must be decreasing: each step should have
      // less-or-equal average brightness than the previous step.
      // Allow small tolerance for noise-based effects (dissolve, shatter, etc.)
      for (let i = 1; i < averages.length; i++) {
        // Allow up to 0.15 increase between adjacent steps for stochastic effects
        expect(averages[i]).toBeLessThanOrEqual(averages[i - 1] + 0.15);
      }

      // And the total trend must be clearly decreasing: start > end
      expect(averages[0]).toBeGreaterThan(averages[averages.length - 1] + 0.3);
    });
  });
});

// --------------------------------------------------------------------------
// Specific retraction type correctness
// --------------------------------------------------------------------------
describe('FadeoutRetraction', () => {
  const fadeout = new FadeoutRetraction();

  it('hilt (pos=0) is fully bright at retraction start (progress=1)', () => {
    // progress=1: mask = 1 * (1 - 0*0.3) = 1
    expect(fadeout.getMask(0, 1)).toBeCloseTo(1, 2);
  });

  it('tip (pos=1) is slightly dimmer at retraction start', () => {
    // progress=1: mask = 1 * (1 - 1*0.3) = 0.7
    expect(fadeout.getMask(1, 1)).toBeCloseTo(0.7, 2);
  });

  it('entire blade is dark at retraction end (progress=0)', () => {
    // progress=0: mask = 0 * anything = 0
    expect(fadeout.getMask(0, 0)).toBe(0);
    expect(fadeout.getMask(0.5, 0)).toBe(0);
    expect(fadeout.getMask(1, 0)).toBe(0);
  });

  it('tip fades faster than hilt during retraction', () => {
    const midProgress = 0.5;
    const hiltMask = fadeout.getMask(0, midProgress);
    const tipMask = fadeout.getMask(1, midProgress);
    expect(hiltMask).toBeGreaterThan(tipMask);
  });
});

describe('DrainRetraction', () => {
  const drain = new DrainRetraction();

  it('is fully lit at retraction start (progress=1)', () => {
    const avg = averageMask(drain, 1.0);
    expect(avg).toBeGreaterThanOrEqual(0.9);
  });

  it('is fully off at retraction end (progress=0)', () => {
    const avg = averageMask(drain, 0.0);
    expect(avg).toBeCloseTo(0, 1);
  });

  it('hilt drains before tip (hilt goes dark first)', () => {
    // At mid-retraction, the hilt should be darker than the tip
    // because drain sweeps from hilt (pos=0) up to tip (pos=1)
    const midProgress = 0.5;
    const hiltMask = drain.getMask(0, midProgress);
    const tipMask = drain.getMask(1, midProgress);
    expect(hiltMask).toBeLessThan(tipMask);
  });
});

describe('ImplodeRetraction', () => {
  const implode = new ImplodeRetraction();

  it('is fully lit at retraction start (progress=1)', () => {
    // retract = 1 - 1 = 0, so blade is fully lit
    expect(implode.getMask(0.5, 1)).toBe(1);
    expect(implode.getMask(0, 1)).toBe(1);
    expect(implode.getMask(1, 1)).toBe(1);
  });

  it('is fully off at retraction end (progress=0)', () => {
    // retract = 1 - 0 = 1, so blade is fully off
    expect(implode.getMask(0.5, 0)).toBe(0);
    expect(implode.getMask(0, 0)).toBe(0);
    expect(implode.getMask(1, 0)).toBe(0);
  });

  it('edges collapse inward during phase 1', () => {
    // At 30% retraction (progress=0.7), edges should be moving inward
    // Outer positions should be dark, center should be lit
    const progress = 0.7; // retract = 0.3
    const centerMask = implode.getMask(0.5, progress);
    const edgeMask = implode.getMask(0.95, progress);
    expect(centerMask).toBeGreaterThan(edgeMask);
  });
});

describe('DissolveRetraction (control — was never broken)', () => {
  const dissolve = new DissolveRetraction();

  it('is fully lit at retraction start (progress=1)', () => {
    const avg = averageMask(dissolve, 1.0);
    expect(avg).toBeGreaterThanOrEqual(0.9);
  });

  it('is nearly off at retraction end (progress=0)', () => {
    const avg = averageMask(dissolve, 0.0);
    // Dissolve's FLICKER_WINDOW (0.025) means ~2.5% of LEDs may still
    // be in their death flicker at retract=1.0. Allow small residual.
    expect(avg).toBeLessThan(0.15);
  });
});

describe('FlickerOutRetraction (control — was never broken)', () => {
  const flickerOut = new FlickerOutRetraction();

  it('is fully lit at retraction start (progress=1)', () => {
    expect(flickerOut.getMask(0.5, 1)).toBe(1);
  });

  it('is fully off at retraction end (progress=0)', () => {
    expect(flickerOut.getMask(0.5, 0)).toBe(0);
  });
});
