'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/**
 * Compute the mean normalized luminance across a packed RGB pixel buffer.
 * BladeEngine.getPixels() returns a Uint8Array of R/G/B triplets (no alpha).
 * Mean luminance = Σ((R+G+B) / 765) / ledCount, [0, 1].
 */
export function meanLuminance(
  buffer: Uint8Array | null,
  ledCount: number,
): number {
  if (!buffer || ledCount <= 0) return 0;
  const sampleCount = Math.min(ledCount, Math.floor(buffer.length / 3));
  if (sampleCount <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < sampleCount; i++) {
    const base = i * 3;
    sum += buffer[base] + buffer[base + 1] + buffer[base + 2];
  }
  return sum / (sampleCount * 765); // 255 * 3 = 765
}

/** Exponential-moving-average smoother for the RMS signal. */
export function smoothRms(prev: number, current: number, alpha: number): number {
  const a = Math.max(0, Math.min(1, alpha));
  return prev * (1 - a) + current * a;
}

/** ≈ 80ms τ at 60fps — matches the prior PerformanceBar behavior. */
const DEFAULT_ALPHA = 0.25;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Live blade RMS level as a [0,1] float, updated each animation frame and
 * smoothed with an 80ms EMA. Shared between PerformanceBar (macro section)
 * and ShiftLightRail (below Delivery) so both surfaces read the same
 * signal from a single RAF pass rather than running two.
 *
 * The hook uses `useState` to publish the level to React, throttled
 * implicitly by React's 60fps flush. Downstream consumers (canvas
 * segments) can read the number each render without a new RAF loop.
 */
export function useRmsLevel(
  engineRef: RefObject<BladeEngine | null>,
  enabled: boolean = true,
): number {
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const [rms, setRms] = useState(0);
  const rmsRef = useRef(0);

  useAnimationFrame(() => {
    if (!enabled) return;
    const engine = engineRef.current;
    const buffer = engine?.getPixels() ?? null;
    const raw = meanLuminance(buffer, ledCount);
    const next = smoothRms(rmsRef.current, raw, DEFAULT_ALPHA);
    rmsRef.current = next;
    setRms(next);
  });

  useEffect(() => {
    if (!enabled) {
      rmsRef.current = 0;
      setRms(0);
    }
  }, [enabled]);

  return rms;
}
