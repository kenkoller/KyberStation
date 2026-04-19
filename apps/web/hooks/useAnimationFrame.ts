'use client';
import { useRef, useEffect, useCallback } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

interface AnimationFrameOptions {
  /** When false, cancels the RAF loop entirely. Default: true */
  enabled?: boolean;
  /**
   * Cap frame rate. Undefined = uncapped (subject to reduced-motion
   * throttle below). Explicit `maxFps` overrides the reduced-motion
   * default, so callers that pass their own cap keep exact control.
   */
  maxFps?: number;
}

const REDUCED_MOTION_FPS = 2;

export function useAnimationFrame(
  callback: (deltaMs: number) => void,
  options?: AnimationFrameOptions,
) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Default-throttle the loop when the OS / user has requested reduced
  // motion. Callers can still opt out explicitly by passing `maxFps` —
  // typically a higher cap — but anyone who forgets won't accidentally
  // ship a 60fps canvas animation to someone who asked for less motion.
  // See the 2026-04-19 a11y audit P2.
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  const enabled = options?.enabled ?? true;
  const explicitMaxFps = options?.maxFps;
  const effectiveMaxFps =
    explicitMaxFps !== undefined
      ? explicitMaxFps
      : reducedMotion
        ? REDUCED_MOTION_FPS
        : undefined;
  const minInterval = effectiveMaxFps ? 1000 / effectiveMaxFps : 0;

  const animate = useCallback(
    (time: number) => {
      if (minInterval > 0 && time - lastFrameRef.current < minInterval) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = time;

      if (previousTimeRef.current) {
        const delta = time - previousTimeRef.current;
        callbackRef.current(delta);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [minInterval],
  );

  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = 0;
      return;
    }
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate, enabled]);
}
