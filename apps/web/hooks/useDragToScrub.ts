'use client';

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
  severanceDragCurve,
  scrubZoneFor,
  type ScrubZone,
} from '@/lib/severanceDragCurve';

// ─── Pure compute path (exported for testing) ─────────────────────────────
//
// Splitting the value-computation out of the React hook lets us pin the
// wiring logic (pointer delta → scaled pixels → clamped value) from
// node-only vitest suites, matching the rest of apps/web/tests where we
// don't have access to jsdom or React Testing Library.

export interface ComputeScrubValueInput {
  /** Horizontal drag in CSS pixels (current clientX − pointerdown clientX). */
  dx: number;
  shiftKey: boolean;
  altKey: boolean;
  /** Value at pointerdown — the anchor the delta is added to. */
  startValue: number;
  /** Step passed to the hook. 1 is the hook default. */
  step: number;
  min: number;
  max: number;
  /** Defaults mirror the hook's defaults. */
  shiftMult?: number;
  altMult?: number;
}

/**
 * Map a raw pointer delta to the clamped next value the hook would emit.
 * Pure, deterministic, and easy to pin in a node-only vitest suite.
 */
export function computeScrubValue({
  dx,
  shiftKey,
  altKey,
  startValue,
  step,
  min,
  max,
  shiftMult = 10,
  altMult = 0.1,
}: ComputeScrubValueInput): number {
  let scaledPixels: number;
  if (shiftKey) {
    scaledPixels = dx * shiftMult;
  } else if (altKey) {
    scaledPixels = dx * altMult;
  } else {
    scaledPixels = severanceDragCurve(dx);
  }
  const delta = scaledPixels * step;
  return Math.min(max, Math.max(min, startValue + delta));
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseDragToScrubOptions {
  /** Current numeric value. Used as the anchor when dragging begins. */
  value: number;
  /** Lower bound for the scrubbed value. */
  min: number;
  /** Upper bound for the scrubbed value. */
  max: number;
  /**
   * Pixel-to-value scale. Applied after the severance curve, so `step = 1`
   * yields roughly one unit of value per pixel of drag in the normal zone.
   * Defaults to 1.
   */
  step?: number;
  /** Called with the clamped next value on every qualifying pointermove. */
  onScrub: (next: number) => void;
  /**
   * Multiplier applied when Shift is held. Bypasses the severance curve
   * entirely so users can reach for deterministic linear scrubbing.
   * Defaults to 10.
   */
  shiftMult?: number;
  /**
   * Multiplier applied when Alt is held. Bypasses the severance curve
   * entirely so users can reach for deterministic linear scrubbing.
   * Defaults to 0.1.
   */
  altMult?: number;
  /**
   * If true, all pointer handlers become no-ops. Useful for disabled
   * inputs where the scrub would otherwise keep working even though the
   * native `<input disabled>` blocks the keyboard path.
   */
  disabled?: boolean;
}

export interface UseDragToScrubReturn<E extends Element = HTMLLabelElement> {
  onPointerDown: (e: ReactPointerEvent<E>) => void;
  onPointerMove: (e: ReactPointerEvent<E>) => void;
  onPointerUp: (e: ReactPointerEvent<E>) => void;
  onPointerCancel: (e: ReactPointerEvent<E>) => void;
}

/**
 * Blender-style pointer drag-to-scrub. Horizontal drag on the target
 * element nudges a numeric value through the Severance-inverted curve
 * defined in `@/lib/severanceDragCurve` — small drags scrub precisely,
 * large drags accelerate. Shift and Alt modifiers bypass the curve to
 * force linear scrubbing.
 *
 * The hook is intentionally unopinionated about markup: consumers attach
 * the returned pointer handlers to whatever element makes sense (a label,
 * an icon, a numeric readout, a custom knob). For the common
 * label-plus-range-plus-readout pattern, see `<ScrubField>` which wraps
 * this hook.
 *
 * Accessibility: the hook handles the pointer path only. Keep a native
 * `<input type="range">` or `<input type="number">` as a sibling so
 * keyboard + screen reader users aren't regressed.
 */
export function useDragToScrub<E extends Element = HTMLLabelElement>({
  value,
  min,
  max,
  step = 1,
  onScrub,
  shiftMult = 10,
  altMult = 0.1,
  disabled = false,
}: UseDragToScrubOptions): UseDragToScrubReturn<E> {
  const stateRef = useRef<{
    startX: number;
    startValue: number;
    pointerId: number;
    lastZone: ScrubZone;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<E>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      stateRef.current = {
        startX: e.clientX,
        startValue: value,
        pointerId: e.pointerId,
        lastZone: 'fine',
      };
    },
    [disabled, value],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<E>) => {
      const s = stateRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const dx = e.clientX - s.startX;

      // Zone-boundary haptic hint. Feature-detected, reduced-motion
      // aware. Fires only on the default (no-modifier) curve path —
      // Shift/Alt are explicit user overrides that shouldn't buzz.
      if (!e.shiftKey && !e.altKey) {
        const zone = scrubZoneFor(dx);
        if (zone !== s.lastZone) {
          s.lastZone = zone;
          if (
            typeof navigator !== 'undefined' &&
            typeof navigator.vibrate === 'function' &&
            !(
              typeof window !== 'undefined' &&
              typeof window.matchMedia === 'function' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
            )
          ) {
            try {
              navigator.vibrate(5);
            } catch {
              // Some browsers throw on vibrate() in insecure / permissioned
              // contexts; haptics are a progressive enhancement.
            }
          }
        }
      }

      const next = computeScrubValue({
        dx,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        startValue: s.startValue,
        step,
        min,
        max,
        shiftMult,
        altMult,
      });
      onScrub(next);
    },
    [min, max, step, onScrub, shiftMult, altMult],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<E>) => {
    const s = stateRef.current;
    if (s && s.pointerId === e.pointerId) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      stateRef.current = null;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
