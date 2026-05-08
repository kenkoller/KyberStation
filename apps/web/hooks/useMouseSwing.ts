'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Pixels-per-second threshold below which we treat the mouse as "still".
 * Prevents micro-jitter from registering as meaningful swing.
 */
const VELOCITY_DEAD_ZONE = 8;

/**
 * Maximum pixels-per-second that maps to swingSpeed 1.0.
 * Calibrated so a brisk horizontal swipe across a 1200px canvas at
 * ~0.3 seconds reads as full swing (~4000 px/s). A moderate swipe
 * (~800 px/s) gives ~0.2 swing.
 */
const VELOCITY_MAX_PPS = 4000;

/**
 * Decay half-life in milliseconds — how long it takes swing speed to
 * fall to 50% after the mouse stops or leaves. 200ms feels natural:
 * fast enough to not feel laggy, slow enough to avoid snap-to-zero.
 */
const DECAY_HALF_LIFE_MS = 200;

/**
 * Derived exponential decay factor per millisecond.
 * speed *= DECAY_PER_MS ^ deltaMs
 */
const DECAY_PER_MS = Math.pow(0.5, 1 / DECAY_HALF_LIFE_MS);

/**
 * Smoothing factor for the one-pole low-pass filter on raw velocity.
 * Closer to 0 = smoother (more lag); closer to 1 = more responsive.
 * 0.3 gives a good balance between responsiveness and jitter rejection.
 */
const VELOCITY_SMOOTHING = 0.3;

// ─── Pure computation helpers (exported for testing) ────────────────────────

/**
 * Convert a raw pixel-per-second velocity into normalized swing speed (0-1).
 * Applies dead zone + linear mapping + clamp.
 */
export function velocityToSwingSpeed(velocityPps: number): number {
  const abs = Math.abs(velocityPps);
  if (abs < VELOCITY_DEAD_ZONE) return 0;
  return Math.min(1, (abs - VELOCITY_DEAD_ZONE) / (VELOCITY_MAX_PPS - VELOCITY_DEAD_ZONE));
}

/**
 * Convert vertical mouse position within the canvas to blade angle (-1 to 1).
 * Top of canvas = 1 (blade up), bottom = -1 (blade down).
 * Returns 0 when canvasHeight is 0 to avoid NaN.
 */
export function verticalPositionToBladeAngle(
  offsetY: number,
  canvasHeight: number,
): number {
  if (canvasHeight <= 0) return 0;
  // Normalize to 0..1 (top = 0, bottom = 1), then map to 1..-1
  const normalized = offsetY / canvasHeight;
  return 1 - 2 * normalized;
}

/**
 * Apply exponential decay to a swing speed value.
 */
export function decaySwingSpeed(current: number, deltaMs: number): number {
  if (current <= 0) return 0;
  return current * Math.pow(DECAY_PER_MS, deltaMs);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface MouseSwingState {
  /** Last pointer event timestamp (ms, from performance.now or event.timeStamp). */
  lastTime: number;
  /** Last pointer X in client coordinates. */
  lastX: number;
  /** Smoothed velocity (px/s) — filtered through one-pole low-pass. */
  smoothedVelocity: number;
  /** Whether the pointer is currently over the canvas. */
  isOverCanvas: boolean;
  /** Current swing speed being fed to the engine (0-1). Used for decay. */
  currentSwingSpeed: number;
  /** Current blade angle being fed to the engine (-1 to 1). */
  currentBladeAngle: number;
}

/**
 * useMouseSwing — drives swing speed and blade angle from mouse movement
 * over the blade canvas.
 *
 * When the mouse moves over the canvas:
 *   - Horizontal velocity -> swing speed (0-1)
 *   - Vertical position -> blade angle (-1 to 1)
 *
 * When the mouse stops or leaves the canvas, swing speed decays
 * exponentially back to 0 via a RAF loop.
 *
 * Mouse-derived values are written directly to `engine.motion.targetSwing`
 * and `engine.motion.targetAngle`. When the mouse leaves or the feature
 * is disabled, the engine's existing smoothing carries the values back
 * toward the MotionSimPanel slider targets naturally.
 */
export function useMouseSwing(
  engineRef: React.MutableRefObject<BladeEngine | null>,
) {
  const stateRef = useRef<MouseSwingState>({
    lastTime: 0,
    lastX: 0,
    smoothedVelocity: 0,
    isOverCanvas: false,
    currentSwingSpeed: 0,
    currentBladeAngle: 0,
  });

  // Read the enabled flag reactively so the hook re-renders on toggle,
  // but use getState() in hot-path event handlers to avoid stale closures.
  const enabled = useAccessibilityStore((s) => s.mouseSwingEnabled);

  // ── Decay RAF loop ──
  // Runs whenever the mouse has left the canvas but swing speed > 0.
  // Smoothly brings swing speed back to 0.
  const decayRafRef = useRef(0);
  const decayPrevTimeRef = useRef(0);

  const stopDecay = useCallback(() => {
    if (decayRafRef.current) {
      cancelAnimationFrame(decayRafRef.current);
      decayRafRef.current = 0;
    }
  }, []);

  const startDecay = useCallback(() => {
    // Don't double-start
    if (decayRafRef.current) return;
    decayPrevTimeRef.current = performance.now();

    const tick = (now: number) => {
      const state = stateRef.current;
      const engine = engineRef.current;
      const delta = now - decayPrevTimeRef.current;
      decayPrevTimeRef.current = now;

      if (!engine || state.isOverCanvas || state.currentSwingSpeed <= 0.001) {
        // Snap to 0 when negligible
        if (engine && state.currentSwingSpeed > 0) {
          state.currentSwingSpeed = 0;
          // Don't write targetSwing=0 — let the MotionSimPanel sliders
          // resume control by not overriding anymore.
        }
        decayRafRef.current = 0;
        return;
      }

      state.currentSwingSpeed = decaySwingSpeed(state.currentSwingSpeed, delta);
      engine.motion.targetSwing = state.currentSwingSpeed;

      decayRafRef.current = requestAnimationFrame(tick);
    };

    decayRafRef.current = requestAnimationFrame(tick);
  }, [engineRef, stopDecay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDecay();
    };
  }, [stopDecay]);

  // ── Pointer event handlers ──

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!useAccessibilityStore.getState().mouseSwingEnabled) return;
      const engine = engineRef.current;
      if (!engine) return;

      const state = stateRef.current;
      const now = e.timeStamp || performance.now();
      const rect = e.currentTarget.getBoundingClientRect();

      // Compute blade angle from vertical position
      const canvasLocalY = e.clientY - rect.top;
      state.currentBladeAngle = verticalPositionToBladeAngle(canvasLocalY, rect.height);
      engine.motion.targetAngle = state.currentBladeAngle;

      // Compute velocity for swing speed
      if (state.isOverCanvas && state.lastTime > 0) {
        const dt = now - state.lastTime;
        if (dt > 0 && dt < 500) {
          // Only compute velocity if the time gap is reasonable
          // (>500ms means the pointer was probably idle or re-entering)
          const dx = e.clientX - state.lastX;
          const rawVelocityPps = (dx / dt) * 1000;

          // One-pole low-pass filter on the velocity
          state.smoothedVelocity =
            state.smoothedVelocity * (1 - VELOCITY_SMOOTHING) +
            rawVelocityPps * VELOCITY_SMOOTHING;

          const swing = velocityToSwingSpeed(state.smoothedVelocity);
          // Only update swing if mouse-derived value is higher than current
          // (don't fight the decay — let new motion override)
          state.currentSwingSpeed = Math.max(state.currentSwingSpeed, swing);
          engine.motion.targetSwing = state.currentSwingSpeed;
        }
      }

      state.lastTime = now;
      state.lastX = e.clientX;
      state.isOverCanvas = true;

      // Stop any running decay while the pointer is actively moving
      stopDecay();
    },
    [engineRef, stopDecay],
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!useAccessibilityStore.getState().mouseSwingEnabled) return;
      const state = stateRef.current;
      // Reset tracking state on enter to avoid stale velocity from
      // a previous hover session
      state.lastTime = e.timeStamp || performance.now();
      state.lastX = e.clientX;
      state.smoothedVelocity = 0;
      state.isOverCanvas = true;
      stopDecay();
    },
    [stopDecay],
  );

  const handlePointerLeave = useCallback(() => {
    if (!useAccessibilityStore.getState().mouseSwingEnabled) return;
    const state = stateRef.current;
    state.isOverCanvas = false;
    state.smoothedVelocity = 0;
    // Start decaying swing speed back to 0
    if (state.currentSwingSpeed > 0.001) {
      startDecay();
    }
  }, [startDecay]);

  return {
    enabled,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
  };
}
