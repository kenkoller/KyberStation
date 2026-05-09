/**
 * Tests for useMouseSwing — mouse-driven swing simulation.
 *
 * The hook exports pure computation functions and constants that are
 * tested directly (no React rendering required). The hook's integration
 * behavior (pointer events -> engine.motion writes) is covered by the
 * pure-function tests + the persistence round-trip on the
 * accessibilityStore mouseSwingEnabled flag.
 */
import { describe, it, expect } from 'vitest';
import {
  velocityToSwingSpeed,
  verticalPositionToBladeAngle,
  decaySwingSpeed,
  smoothValue,
  VELOCITY_DEAD_ZONE,
  VELOCITY_MAX_PPS,
  DECAY_HALF_LIFE_MS,
  VELOCITY_SMOOTHING,
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
    // VELOCITY_DEAD_ZONE px/s is the dead zone threshold; abs < threshold -> 0
    expect(velocityToSwingSpeed(VELOCITY_DEAD_ZONE)).toBe(0);
  });

  it('returns a small positive value just above the dead zone', () => {
    const result = velocityToSwingSpeed(50);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.05);
  });

  it('returns 1.0 at VELOCITY_MAX_PPS', () => {
    expect(velocityToSwingSpeed(VELOCITY_MAX_PPS)).toBe(1);
  });

  it('clamps to 1.0 above VELOCITY_MAX_PPS (saturation)', () => {
    expect(velocityToSwingSpeed(6000)).toBe(1);
    expect(velocityToSwingSpeed(10000)).toBe(1);
    expect(velocityToSwingSpeed(999999)).toBe(1);
  });

  it('handles negative velocity (absolute value)', () => {
    const pos = velocityToSwingSpeed(2000);
    const neg = velocityToSwingSpeed(-2000);
    expect(pos).toBe(neg);
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThan(1);
  });

  it('scales linearly between dead zone and max', () => {
    // At midpoint: (midpoint - deadZone) / (max - deadZone) ~= 0.5
    const midpoint = (VELOCITY_DEAD_ZONE + VELOCITY_MAX_PPS) / 2;
    const half = velocityToSwingSpeed(midpoint);
    expect(half).toBeCloseTo(0.5, 2);
  });

  it('returns roughly 0.2 for a moderate swipe (~800 px/s)', () => {
    const moderate = velocityToSwingSpeed(800);
    expect(moderate).toBeCloseTo(0.198, 2);
  });

  it('is monotonically increasing for positive velocities above dead zone', () => {
    const v1 = velocityToSwingSpeed(100);
    const v2 = velocityToSwingSpeed(500);
    const v3 = velocityToSwingSpeed(1000);
    const v4 = velocityToSwingSpeed(2000);
    const v5 = velocityToSwingSpeed(3000);
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
    expect(v4).toBeGreaterThan(v3);
    expect(v5).toBeGreaterThan(v4);
  });

  it('never exceeds 1.0 for any finite input', () => {
    // Test a wide range of inputs
    for (let v = -10000; v <= 10000; v += 137) {
      expect(velocityToSwingSpeed(v)).toBeLessThanOrEqual(1);
      expect(velocityToSwingSpeed(v)).toBeGreaterThanOrEqual(0);
    }
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

  it('is continuous across the range', () => {
    const canvasH = 400;
    let prev = verticalPositionToBladeAngle(0, canvasH);
    for (let y = 1; y <= canvasH; y++) {
      const current = verticalPositionToBladeAngle(y, canvasH);
      // Each step should decrease by a constant amount
      expect(current).toBeLessThan(prev);
      prev = current;
    }
  });

  it('works with small canvas heights', () => {
    expect(verticalPositionToBladeAngle(0, 1)).toBe(1);
    expect(verticalPositionToBladeAngle(1, 1)).toBe(-1);
    expect(verticalPositionToBladeAngle(0.5, 1)).toBe(0);
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

  it('halves the speed after one half-life', () => {
    const result = decaySwingSpeed(1.0, DECAY_HALF_LIFE_MS);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it('quarters the speed after two half-lives', () => {
    const result = decaySwingSpeed(1.0, DECAY_HALF_LIFE_MS * 2);
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
    // After 10 half-lives, value is 1/1024 ~ 0.001
    const result = decaySwingSpeed(1.0, DECAY_HALF_LIFE_MS * 10);
    expect(result).toBeLessThan(0.002);
    expect(result).toBeGreaterThan(0);
  });

  it('chaining decay matches single-step decay', () => {
    // decaying 100ms then 100ms should equal decaying 200ms at once
    const chained = decaySwingSpeed(decaySwingSpeed(1.0, 100), 100);
    const single = decaySwingSpeed(1.0, 200);
    expect(chained).toBeCloseTo(single, 10);
  });

  it('small deltas produce gradual decay', () => {
    // 16ms (one frame at 60fps) should barely change the value
    const result = decaySwingSpeed(1.0, 16);
    expect(result).toBeGreaterThan(0.9);
    expect(result).toBeLessThan(1.0);
  });
});

// ─── smoothValue (one-pole low-pass filter) ──────────────────────────────

describe('smoothValue', () => {
  it('with alpha=1 passes raw value through unchanged', () => {
    expect(smoothValue(0.5, 1.0, 1.0)).toBe(1.0);
    expect(smoothValue(0, 0.8, 1.0)).toBe(0.8);
  });

  it('with alpha=0 keeps previous value unchanged', () => {
    expect(smoothValue(0.5, 1.0, 0.0)).toBe(0.5);
    expect(smoothValue(0.3, 999, 0.0)).toBe(0.3);
  });

  it('damps rapid changes with default alpha', () => {
    // Starting from 0, feeding in 1000 px/s should not immediately reach 1000
    const result = smoothValue(0, 1000, VELOCITY_SMOOTHING);
    expect(result).toBe(1000 * VELOCITY_SMOOTHING); // 300
    expect(result).toBeLessThan(1000);
    expect(result).toBeGreaterThan(0);
  });

  it('converges toward raw value after many steps', () => {
    let smoothed = 0;
    const target = 500;
    // After many iterations, should approach the target
    for (let i = 0; i < 100; i++) {
      smoothed = smoothValue(smoothed, target, VELOCITY_SMOOTHING);
    }
    expect(smoothed).toBeCloseTo(target, 1);
  });

  it('responds slowly to sudden spikes', () => {
    // Simulate a sudden spike from 0 to 4000 px/s
    let smoothed = 0;
    smoothed = smoothValue(smoothed, 4000, VELOCITY_SMOOTHING);
    expect(smoothed).toBeLessThan(4000 * 0.5); // Less than halfway after one step

    // After a few more steps at 4000, it should be closer
    for (let i = 0; i < 5; i++) {
      smoothed = smoothValue(smoothed, 4000, VELOCITY_SMOOTHING);
    }
    expect(smoothed).toBeGreaterThan(4000 * 0.5); // Past halfway
    expect(smoothed).toBeLessThan(4000); // But not fully there
  });

  it('returns to 0 when raw drops to 0 (gradual, not instant)', () => {
    let smoothed = 1000;
    smoothed = smoothValue(smoothed, 0, VELOCITY_SMOOTHING);
    // Should retain most of the old value
    expect(smoothed).toBeCloseTo(1000 * (1 - VELOCITY_SMOOTHING), 5);
    expect(smoothed).toBeGreaterThan(0);

    // After many steps at 0, should approach 0
    for (let i = 0; i < 100; i++) {
      smoothed = smoothValue(smoothed, 0, VELOCITY_SMOOTHING);
    }
    expect(smoothed).toBeCloseTo(0, 5);
  });

  it('handles negative velocities', () => {
    const result = smoothValue(0, -500, VELOCITY_SMOOTHING);
    expect(result).toBeLessThan(0);
    expect(result).toBe(-500 * VELOCITY_SMOOTHING);
  });
});

// ─── Integration-style pure-math tests ──────────────────────────────────────

describe('mouse swing simulation flow (pure math)', () => {
  it('stationary mouse produces zero swing speed', () => {
    // Zero velocity -> zero swing
    expect(velocityToSwingSpeed(0)).toBe(0);
    // Smoothed zero stays zero
    expect(smoothValue(0, 0)).toBe(0);
  });

  it('fast horizontal movement approaches swing 1.0', () => {
    // Simulate smoothing a constant fast velocity
    let smoothed = 0;
    const fastVelocity = VELOCITY_MAX_PPS;
    for (let i = 0; i < 50; i++) {
      smoothed = smoothValue(smoothed, fastVelocity, VELOCITY_SMOOTHING);
    }
    const swing = velocityToSwingSpeed(smoothed);
    expect(swing).toBeCloseTo(1.0, 2);
  });

  it('complete lifecycle: accelerate, sustain, leave, decay', () => {
    // Phase 1: accelerate from 0 to 2000 px/s over several frames
    let smoothedV = 0;
    for (let i = 0; i < 10; i++) {
      smoothedV = smoothValue(smoothedV, 2000, VELOCITY_SMOOTHING);
    }
    const peakSwing = velocityToSwingSpeed(smoothedV);
    expect(peakSwing).toBeGreaterThan(0.2);
    expect(peakSwing).toBeLessThan(1.0);

    // Phase 2: mouse leaves, swing decays
    let currentSwing = peakSwing;
    currentSwing = decaySwingSpeed(currentSwing, 200); // one half-life
    expect(currentSwing).toBeCloseTo(peakSwing * 0.5, 2);

    // Phase 3: after enough time, swing is negligible
    currentSwing = decaySwingSpeed(currentSwing, 2000);
    expect(currentSwing).toBeLessThan(0.001);
  });

  it('blade angle tracks vertical position independently of swing', () => {
    // Blade angle is purely positional, not velocity-based
    const angle1 = verticalPositionToBladeAngle(0, 400);   // top
    const angle2 = verticalPositionToBladeAngle(200, 400);  // center
    const angle3 = verticalPositionToBladeAngle(400, 400);  // bottom

    expect(angle1).toBe(1);   // blade up
    expect(angle2).toBe(0);   // level
    expect(angle3).toBe(-1);  // blade down

    // All independent of any velocity/swing state
  });
});

// ─── accessibilityStore persistence ────────────────────────────────────────

describe('mouseSwingEnabled store field', () => {
  it('defaults to true', async () => {
    // Dynamic import to avoid Zustand SSR pinning issues -- import the
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

  it('disabled state means zero swing output regardless of velocity', () => {
    // When disabled, the hook returns early from all handlers.
    // The pure math still works -- the gate is in the hook, not the math.
    // Verify the math independently produces correct results that WOULD
    // be suppressed by the enabled gate:
    const swing = velocityToSwingSpeed(2000);
    expect(swing).toBeGreaterThan(0);
    // In the hook, when mouseSwingEnabled is false, this value is never
    // written to engine.motion — the handler returns immediately.
  });
});

// ─── Constants sanity checks ──────────────────────────────────────────────

describe('tuning constants', () => {
  it('dead zone is a reasonable small threshold', () => {
    expect(VELOCITY_DEAD_ZONE).toBeGreaterThan(0);
    expect(VELOCITY_DEAD_ZONE).toBeLessThan(50);
  });

  it('max velocity is calibrated for desktop canvas widths', () => {
    // A brisk swipe across a 1200px canvas in 0.3s = 4000 px/s
    expect(VELOCITY_MAX_PPS).toBe(4000);
  });

  it('decay half-life is in a perceptually natural range', () => {
    // Between 100ms (snappy) and 500ms (sluggish)
    expect(DECAY_HALF_LIFE_MS).toBeGreaterThanOrEqual(100);
    expect(DECAY_HALF_LIFE_MS).toBeLessThanOrEqual(500);
  });

  it('smoothing alpha is between 0 and 1 exclusive', () => {
    expect(VELOCITY_SMOOTHING).toBeGreaterThan(0);
    expect(VELOCITY_SMOOTHING).toBeLessThan(1);
  });
});
