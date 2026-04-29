'use client';

import { useRef, useEffect } from 'react';
import { getTimeDomainData, useAudioAnalyserStore } from '@/stores/audioAnalyserStore';

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/**
 * Default analyser FFT size. 1024 samples is ~21ms of audio context
 * at 48kHz — enough to read a smooth waveform without missing
 * sub-cycle detail. Sized this way to balance render cost (rendering
 * 1024 line segments per frame is cheap on canvas-2D) against signal
 * fidelity (small FFT sizes flicker; large sizes blur the leading
 * edge of transients).
 *
 * Web Audio mandates fftSize be a power of 2 in [32, 32768]. 1024 is
 * the canonical "live waveform" size used by every DAW + visualiser
 * I'm aware of — keep this aligned unless you have a reason not to.
 */
export const DEFAULT_ANALYSER_FFT_SIZE = 1024;

/**
 * Default smoothing constant. AnalyserNode's smoothingTimeConstant
 * affects ONLY frequency-domain output, not time-domain — but Web
 * Audio's API still requires a value. 0.0 means "no extra smoothing";
 * we set it explicitly so future code that swaps to frequency-domain
 * output gets a known starting point.
 */
export const DEFAULT_ANALYSER_SMOOTHING = 0.0;

/**
 * Result shape returned by `useAudioAnalyser`. Caller can pass this
 * to render fns that accept a Float32Array of samples in [-1, 1].
 */
export interface AudioAnalyserSnapshot {
  /**
   * Float32Array of the latest time-domain samples, length == fftSize.
   * Values are in [-1, 1]. The buffer is owned by the hook and reused
   * across frames — callers must NOT retain a reference past the
   * current animation frame, and must NOT mutate it.
   *
   * Returns null when:
   *   - The hook is paused (caller passed `enabled: false`)
   *   - No `useAudioEngine` instance has initialised its AudioContext
   *     yet (the analyser tap publishes on init — see audioAnalyserStore)
   */
  getLatest: () => Float32Array | null;
  /**
   * Sample-rate readout from the AnalyserNode's AudioContext, or 0
   * when no analyser is published. Useful for time-axis labelling.
   */
  sampleRate: number;
  /** FFT size of the published analyser, or 0 when none. */
  fftSize: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to the global audio analyser tap. Returns a getter that
 * reads the latest time-domain frame into a hook-owned Float32Array
 * each call. Designed for `useAnimationFrame` consumers — call
 * `snapshot.getLatest()` once per frame, render against the result.
 *
 * SSR-safe: returns a no-op snapshot before mount + when no analyser
 * is published. The hook's own buffer is allocated lazily on first
 * `getLatest()` call so SSR never touches Float32Array constructors.
 */
export function useAudioAnalyser(): AudioAnalyserSnapshot {
  // Subscribe via Zustand so the hook re-renders when the analyser is
  // first published (typically on the first user gesture / sound
  // playback, due to AudioContext autoplay policy).
  const analyser = useAudioAnalyserStore((s) => s.analyser);
  const bufferRef = useRef<Float32Array | null>(null);

  // Ensure the hook-owned buffer matches the published analyser's
  // fftSize. If the analyser changes (or its fftSize was reconfigured),
  // discard the old buffer so the next getLatest reallocates.
  useEffect(() => {
    if (!analyser) {
      bufferRef.current = null;
      return;
    }
    if (bufferRef.current?.length !== analyser.fftSize) {
      bufferRef.current = null;
    }
  }, [analyser]);

  const fftSize = analyser?.fftSize ?? 0;
  const sampleRate = analyser?.context.sampleRate ?? 0;

  return {
    getLatest: () => {
      const node = useAudioAnalyserStore.getState().analyser;
      if (!node) return null;
      // Lazy alloc — keeps the hook SSR-safe (no Float32Array
      // construction in the render path).
      if (!bufferRef.current || bufferRef.current.length !== node.fftSize) {
        bufferRef.current = new Float32Array(node.fftSize);
      }
      const ok = getTimeDomainData(bufferRef.current);
      return ok ? bufferRef.current : null;
    },
    sampleRate,
    fftSize,
  };
}
