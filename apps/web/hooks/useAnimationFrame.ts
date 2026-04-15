'use client';
import { useRef, useEffect, useCallback } from 'react';

interface AnimationFrameOptions {
  /** When false, cancels the RAF loop entirely. Default: true */
  enabled?: boolean;
  /** Cap frame rate (e.g. 2 for reduced-motion throttle). Undefined = uncapped */
  maxFps?: number;
}

export function useAnimationFrame(
  callback: (deltaMs: number) => void,
  options?: AnimationFrameOptions,
) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const enabled = options?.enabled ?? true;
  const maxFps = options?.maxFps;
  const minInterval = maxFps ? 1000 / maxFps : 0;

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
