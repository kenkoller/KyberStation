'use client';
import { useRef, useEffect, useCallback } from 'react';

export function useAnimationFrame(callback: (deltaMs: number) => void) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current) {
      const delta = time - previousTimeRef.current;
      callbackRef.current(delta);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);
}
