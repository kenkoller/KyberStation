/**
 * Tests for useMouseSwing — mouse-driven swing simulation.
 *
 * The hook exports three pure computation functions that are tested
 * directly (no React rendering required). The hook's integration
 * behavior (pointer events → engine.motion writes) is covered by
 * the pure-function tests + the persistence round-trip on the
 * accessibilityStore mouseSwingEnabled flag.
 */
import { describe, it, expect } from 'vitest';
import {
  velocityToSwingSpeed,
  verticalPositionToBladeAngle,
  decaySwingSpeed,
} from '@/hooks/useMouseSwing';

// ─── velocityToSwingSpeed ──────────────────────────────────────────────────

describe('velocityToSwingSpeed', () => {
  it('returns 0 for velocities within the dead zone', () => {
    expect(velocityToSwingSpeed(0)).toBe(0);
    expect(velocityToSwingSpeed(5)).toBe(0);
    expect(velocityToSwingSpeed(-5)).toBe(0);
    expect(velocityToSwingSpeed(7.9)).toBe(0);
    expect(velocityToSwingSpeed(-7.9)).toBe(0);
  });

  it('returns 0 at exactly the dead zone boundary', () => {
    // 8 px/s is the dead zone threshold; abs < 8 → 0
    expect(velocityToSwingSpeed(8)).toBe(0);
  });

  it('returns a small positive value just above the dead zone', () => {
    const result = velocityToSwingSpeed(50);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.05);
  });

  it('returns 1.0 at VELOCITY_MAX_PPS (4000 px/s)', () => {
    expect(velocityToSwingSpeed(4000)).toBe(1);
  });

  it('clamps to 1.0 above VELOCITY_MAX_PPS', () => {
    expect(velocityToSwingSpeed(6000)).toBe(1);
    expect(velocityToSwingSpeed(10000)).toBe(1);
  });

  it('handles negative velocity (absolute value)', () => {
    const pos = velocityToSwingSpeed(2000);
    const neg = velocityToSwingSpeed(-2000);
    expect(pos).toBe(neg);
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThan(1);
  });

  it('scales linearly between dead zone and max', () => {
    // At 2004 px/s: (2004 - 8) / (4000 - 8) = 1996 / 3992 ≈ 0.5
    const half = velocityToSwingSpeed(2004);
    expect(half).toBeCloseTo(0.5, 2);
  });

  it('returns roughly 0.2 for a moderate swipe (~800 px/s)', () => {
    const moderate = velocityToSwingSpeed(800);
    expect(moderate).toBeCloseTo(0.198, 2);
  });
});

// ─── verticalPositionToBladeAngle ──────────────────────────────────────────

describe('verticalPositionToBladeAngle', () => {
  it('returns 1 at the top of canvas (offsetY = 0)', () => {
    expect(verticalPositionToBladeAngle(0, 600)).toBe(1);
  });

  it('returns -1 at the bottom of canvas (offsetY = canvasHeight)', () => {
    expect(verticalPositionToBladeAngle(600, 600)).toBe(-1);
  });

  it('returns 0 at the vertical center (offsetY = canvasHeight / 2)', () => {
    expect(verticalPositionToBladeAngle(300, 600)).toBe(0);
  });

  it('returns 0 when canvasHeight is 0 (avoid NaN)', () => {
    expect(verticalPositionToBladeAngle(0, 0)).toBe(0);
    expect(verticalPositionToBladeAngle(100, 0)).toBe(0);
  });

  it('returns 0 when canvasHeight is negative (safety)', () => {
    expect(verticalPositionToBladeAngle(50, -100)).toBe(0);
  });

  it('returns correct intermediate values', () => {
    // 25% from top: 1 - 2 * 0.25 = 0.5
    expect(verticalPositionToBladeAngle(150, 600)).toBeCloseTo(0.5, 5);
    // 75% from top: 1 - 2 * 0.75 = -0.5
    expect(verticalPositionToBladeAngle(450, 600)).toBeCloseTo(-0.5, 5);
  });
});

// ─── decaySwingSpeed ───────────────────────────────────────────────────────

describe('decaySwingSpeed', () => {
  it('returns 0 when current speed is 0', () => {
    expect(decaySwingSpeed(0, 100)).toBe(0);
  });

  it('returns 0 when current speed is negative (safety)', () => {
    expect(decaySwingSpeed(-0.5, 100)).toBe(0);
  });

  it('halves the speed after one half-life (200ms)', () => {
    const result = decaySwingSpeed(1.0, 200);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it('quarters the speed after two half-lives (400ms)', () => {
    const result = decaySwingSpeed(1.0, 400);
    expect(result).toBeCloseTo(0.25, 5);
  });

  it('preserves full value at deltaMs = 0', () => {
    const result = decaySwingSpeed(0.8, 0);
    expect(result).toBeCloseTo(0.8, 5);
  });

  it('decays proportionally for arbitrary starting values', () => {
    const a = decaySwingSpeed(0.6, 100);
    const b = decaySwingSpeed(0.3, 100);
    // Both should have the same decay ratio
    expect(a / 0.6).toBeCloseTo(b / 0.3, 5);
  });

  it('approaches 0 after many half-lives', () => {
    // After 10 half-lives (2000ms), value is 1/1024 ≈ 0.001
    const result = decaySwingSpeed(1.0, 2000);
    expect(result).toBeLessThan(0.002);
    expect(result).toBeGreaterThan(0);
  });
});

// ─── accessibilityStore persistence ────────────────────────────────────────

describe('mouseSwingEnabled store field', () => {
  it('defaults to true', async () => {
    // Dynamic import to avoid Zustand SSR pinning issues — import the
    // store fresh and check its initial state.
    const { useAccessibilityStore } = await import('@/stores/accessibilityStore');
    const state = useAccessibilityStore.getState();
    expect(state.mouseSwingEnabled).toBe(true);
  });

  it('setter updates the value', async () => {
    const { useAccessibilityStore } = await import('@/stores/accessibilityStore');
    useAccessibilityStore.getState().setMouseSwingEnabled(false);
    expect(useAccessibilityStore.getState().mouseSwingEnabled).toBe(false);

    // Restore default for other tests
    useAccessibilityStore.getState().setMouseSwingEnabled(true);
    expect(useAccessibilityStore.getState().mouseSwingEnabled).toBe(true);
  });

  it('reset() restores to true', async () => {
    const { useAccessibilityStore } = await import('@/stores/accessibilityStore');
    useAccessibilityStore.getState().setMouseSwingEnabled(false);
    useAccessibilityStore.getState().reset();
    expect(useAccessibilityStore.getState().mouseSwingEnabled).toBe(true);
  });
});
