'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { usePresetThumbnail, getAnimationFrames } from './usePresetThumbnail';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

/**
 * Hook that provides hover-to-animate behavior for gallery cards.
 *
 * Returns:
 * - `src`: The current image source (static thumbnail or animation frame)
 * - `onMouseEnter`: Attach to the card element to start animation
 * - `onMouseLeave`: Attach to the card element to stop animation
 * - `isAnimating`: Whether animation is currently playing
 */
export function usePresetAnimation(config: BladeConfig) {
  const staticThumbnail = usePresetThumbnail(config);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const [isAnimating, setIsAnimating] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const framesRef = useRef<string[] | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

  const FRAME_INTERVAL = 1000 / 15; // ~15fps

  const startAnimation = useCallback(() => {
    if (reducedMotion) return;
    // Lazy-compute frames on first hover
    if (!framesRef.current) {
      framesRef.current = getAnimationFrames(config);
    }
    if (!framesRef.current || framesRef.current.length === 0) return;

    setIsAnimating(true);
    setFrameIndex(0);
    lastFrameTimeRef.current = performance.now();
  }, [config, reducedMotion]);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setFrameIndex(0);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating || !framesRef.current) return;

    const frames = framesRef.current;

    const tick = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= FRAME_INTERVAL) {
        lastFrameTimeRef.current = now - (elapsed % FRAME_INTERVAL);
        setFrameIndex((prev) => (prev + 1) % frames.length);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isAnimating, FRAME_INTERVAL]);

  // Determine current source
  const src = isAnimating && framesRef.current
    ? framesRef.current[frameIndex] ?? staticThumbnail
    : staticThumbnail;

  return {
    src,
    isAnimating,
    onMouseEnter: startAnimation,
    onMouseLeave: stopAnimation,
  };
}
