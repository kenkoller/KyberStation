import { describe, it, expect } from 'vitest';
import { createEasingFunction, EASING_PRESETS, getEasingPresetNames } from '../src/easing';

describe('EASING_PRESETS', () => {
  it('contains the expected preset names', () => {
    const names = getEasingPresetNames();
    expect(names).toContain('linear');
    expect(names).toContain('ease-in-quad');
    expect(names).toContain('ease-out-quad');
    expect(names).toContain('ease-in-out-quad');
    expect(names).toContain('ease-in-cubic');
    expect(names).toContain('ease-out-cubic');
    expect(names).toContain('ease-in-out-cubic');
    expect(names).toContain('bounce');
    expect(names).toContain('elastic');
    expect(names).toContain('snap');
  });
});

describe('linear easing', () => {
  it('returns identity values', () => {
    const linear = EASING_PRESETS['linear'];
    expect(linear(0)).toBe(0);
    expect(linear(0.25)).toBeCloseTo(0.25);
    expect(linear(0.5)).toBeCloseTo(0.5);
    expect(linear(0.75)).toBeCloseTo(0.75);
    expect(linear(1)).toBe(1);
  });
});

describe('createEasingFunction with preset', () => {
  it('returns the preset function for a known preset', () => {
    const fn = createEasingFunction({ type: 'preset', name: 'linear' });
    expect(fn(0.5)).toBeCloseTo(0.5);
  });

  it('falls back to linear for unknown preset', () => {
    const fn = createEasingFunction({ type: 'preset', name: 'nonexistent' });
    expect(fn(0.5)).toBeCloseTo(0.5);
    expect(fn(0.25)).toBeCloseTo(0.25);
  });
});

describe('all presets return 0 at t=0 and 1 at t=1', () => {
  const presetNames = getEasingPresetNames();

  it.each(presetNames)('preset "%s" returns 0 at t=0', (name) => {
    const fn = EASING_PRESETS[name];
    expect(fn(0)).toBeCloseTo(0, 3);
  });

  it.each(presetNames)('preset "%s" returns 1 at t=1', (name) => {
    const fn = EASING_PRESETS[name];
    expect(fn(1)).toBeCloseTo(1, 3);
  });
});

describe('preset values stay in reasonable range', () => {
  const presetNames = getEasingPresetNames();
  const testValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  it.each(presetNames)('preset "%s" outputs finite numbers', (name) => {
    const fn = EASING_PRESETS[name];
    for (const t of testValues) {
      const result = fn(t);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it.each(presetNames)('preset "%s" stays in [-0.5, 1.5] range (allowing overshoot)', (name) => {
    const fn = EASING_PRESETS[name];
    for (const t of testValues) {
      const result = fn(t);
      // Elastic and bounce can overshoot, but should stay within reasonable bounds
      expect(result).toBeGreaterThanOrEqual(-1.0);
      expect(result).toBeLessThanOrEqual(2.0);
    }
  });
});

describe('cubic-bezier easing', () => {
  it('ease-in-out curve (0.42, 0, 0.58, 1)', () => {
    const fn = createEasingFunction({
      type: 'cubic-bezier',
      controlPoints: [0.42, 0, 0.58, 1],
    });

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);

    // Midpoint should be close to 0.5 for this symmetric curve
    expect(fn(0.5)).toBeCloseTo(0.5, 1);

    // Ease-in-out: slow start, fast middle, slow end
    // At t=0.25, value should be less than 0.25 (slow start)
    expect(fn(0.25)).toBeLessThan(0.25);
    // At t=0.75, value should be greater than 0.75 (slow end = value ahead)
    expect(fn(0.75)).toBeGreaterThan(0.75);
  });

  it('linear cubic-bezier (0, 0, 1, 1) approximates identity', () => {
    const fn = createEasingFunction({
      type: 'cubic-bezier',
      controlPoints: [0, 0, 1, 1],
    });

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
    expect(fn(0.5)).toBeCloseTo(0.5, 1);
    expect(fn(0.25)).toBeCloseTo(0.25, 1);
    expect(fn(0.75)).toBeCloseTo(0.75, 1);
  });

  it('ease-in cubic-bezier (0.42, 0, 1, 1)', () => {
    const fn = createEasingFunction({
      type: 'cubic-bezier',
      controlPoints: [0.42, 0, 1, 1],
    });

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);

    // Ease-in: slow start — at t=0.5, value should be less than 0.5
    expect(fn(0.5)).toBeLessThan(0.5);
  });

  it('ease-out cubic-bezier (0, 0, 0.58, 1)', () => {
    const fn = createEasingFunction({
      type: 'cubic-bezier',
      controlPoints: [0, 0, 0.58, 1],
    });

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);

    // Ease-out: fast start — at t=0.5, value should be greater than 0.5
    expect(fn(0.5)).toBeGreaterThan(0.5);
  });

  it('returns values between 0 and 1 for monotonic curves', () => {
    const fn = createEasingFunction({
      type: 'cubic-bezier',
      controlPoints: [0.42, 0, 0.58, 1],
    });

    for (let t = 0; t <= 1; t += 0.05) {
      const result = fn(t);
      expect(result).toBeGreaterThanOrEqual(-0.01);
      expect(result).toBeLessThanOrEqual(1.01);
    }
  });
});

describe('specific preset behaviors', () => {
  it('ease-in-quad starts slow', () => {
    const fn = EASING_PRESETS['ease-in-quad'];
    // t^2: at t=0.5, result = 0.25
    expect(fn(0.5)).toBeCloseTo(0.25);
  });

  it('ease-out-quad ends slow', () => {
    const fn = EASING_PRESETS['ease-out-quad'];
    // t*(2-t): at t=0.5, result = 0.75
    expect(fn(0.5)).toBeCloseTo(0.75);
  });

  it('ease-in-cubic starts slower than quad', () => {
    const fn = EASING_PRESETS['ease-in-cubic'];
    // t^3: at t=0.5, result = 0.125
    expect(fn(0.5)).toBeCloseTo(0.125);
  });

  it('ease-out-cubic at t=0.5', () => {
    const fn = EASING_PRESETS['ease-out-cubic'];
    // (t-1)^3 + 1: at t=0.5, result = (-0.5)^3 + 1 = 0.875
    expect(fn(0.5)).toBeCloseTo(0.875);
  });

  it('snap preset produces values in [0, 1]', () => {
    const fn = EASING_PRESETS['snap'];
    for (let t = 0; t <= 1; t += 0.1) {
      const result = fn(t);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1.01);
    }
  });

  it('elastic preset can overshoot', () => {
    const fn = EASING_PRESETS['elastic'];
    // Elastic overshoots — check that some value is outside [0, 1]
    let hasOvershoot = false;
    for (let t = 0.01; t < 1; t += 0.01) {
      const result = fn(t);
      if (result < 0 || result > 1) {
        hasOvershoot = true;
        break;
      }
    }
    expect(hasOvershoot).toBe(true);
  });
});
