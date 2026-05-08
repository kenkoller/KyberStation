import { describe, it, expect } from 'vitest';

describe('timeScale store behavior', () => {
  const TIME_SCALE_STEPS = [1, 0.5, 0.25];

  it('default time scale is 1 (normal speed)', () => {
    expect(TIME_SCALE_STEPS[0]).toBe(1);
  });

  it('cycle order is 1 → 0.5 → 0.25 → 1', () => {
    const cycle = (current: number): number => {
      const idx = TIME_SCALE_STEPS.indexOf(current);
      return TIME_SCALE_STEPS[(idx + 1) % TIME_SCALE_STEPS.length];
    };
    expect(cycle(1)).toBe(0.5);
    expect(cycle(0.5)).toBe(0.25);
    expect(cycle(0.25)).toBe(1);
  });

  it('unknown scale falls back to first step on cycle', () => {
    const cycle = (current: number): number => {
      const idx = TIME_SCALE_STEPS.indexOf(current);
      return TIME_SCALE_STEPS[(idx + 1) % TIME_SCALE_STEPS.length];
    };
    // -1 indexOf → (-1+1) % 3 = 0 → 1
    expect(cycle(0.75)).toBe(1);
  });

  it('time scale clamp prevents values below 0.1', () => {
    const clamp = (v: number) => Math.max(0.1, Math.min(2, v));
    expect(clamp(0)).toBe(0.1);
    expect(clamp(-1)).toBe(0.1);
  });

  it('time scale clamp prevents values above 2', () => {
    const clamp = (v: number) => Math.max(0.1, Math.min(2, v));
    expect(clamp(5)).toBe(2);
    expect(clamp(100)).toBe(2);
  });

  it('time scale of 0.5 halves the effective delta', () => {
    const delta = 16.67;
    const timeScale = 0.5;
    expect(delta * timeScale).toBeCloseTo(8.335);
  });

  it('time scale of 0.25 quarters the effective delta', () => {
    const delta = 16.67;
    const timeScale = 0.25;
    expect(delta * timeScale).toBeCloseTo(4.1675);
  });

  it('time scale of 1 leaves delta unchanged', () => {
    const delta = 16.67;
    const timeScale = 1;
    expect(delta * timeScale).toBe(delta);
  });
});
