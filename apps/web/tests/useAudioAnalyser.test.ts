// ─── useAudioAnalyser — hook-level invariants ───────────────────────────────
//
// The hook is a thin reader over `audioAnalyserStore`. Tests here verify:
//
//   1. Module exports (constants + hook) are present and correctly shaped.
//   2. `getTimeDomainData` (the imperative reader the hook uses
//      internally) cooperates with the store across publish/unpublish
//      cycles.
//
// Full React-Testing-Library mounts of useAudioAnalyser would require
// jsdom — we don't have it in this suite (vitest config sets
// `environment: 'node'`). The store + reader behaviour is the
// load-bearing part of the hook; the React glue is a one-line
// useEffect + ref allocation.

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioAnalyserStore, getTimeDomainData } from '../stores/audioAnalyserStore';
import {
  DEFAULT_ANALYSER_FFT_SIZE,
  DEFAULT_ANALYSER_SMOOTHING,
  useAudioAnalyser,
} from '../hooks/useAudioAnalyser';

beforeEach(() => {
  useAudioAnalyserStore.setState({ analyser: null });
});

describe('useAudioAnalyser — module exports', () => {
  it('exports a hook function', () => {
    expect(typeof useAudioAnalyser).toBe('function');
  });

  it('exports DEFAULT_ANALYSER_FFT_SIZE as a power of 2 in [32, 32768]', () => {
    expect(typeof DEFAULT_ANALYSER_FFT_SIZE).toBe('number');
    expect(DEFAULT_ANALYSER_FFT_SIZE).toBeGreaterThanOrEqual(32);
    expect(DEFAULT_ANALYSER_FFT_SIZE).toBeLessThanOrEqual(32768);
    // power-of-2 check — Web Audio mandates fftSize is one
    expect((DEFAULT_ANALYSER_FFT_SIZE & (DEFAULT_ANALYSER_FFT_SIZE - 1))).toBe(0);
  });

  it('exports DEFAULT_ANALYSER_SMOOTHING in [0, 1]', () => {
    expect(typeof DEFAULT_ANALYSER_SMOOTHING).toBe('number');
    expect(DEFAULT_ANALYSER_SMOOTHING).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_ANALYSER_SMOOTHING).toBeLessThanOrEqual(1);
  });
});

describe('useAudioAnalyser — store/reader integration', () => {
  it('getTimeDomainData returns false before any analyser is published', () => {
    const buf = new Float32Array(DEFAULT_ANALYSER_FFT_SIZE);
    expect(getTimeDomainData(buf)).toBe(false);
  });

  it('getTimeDomainData reads from a published analyser, then false again after unpublish', () => {
    const stub = {
      fftSize: 16,
      smoothingTimeConstant: 0,
      context: { sampleRate: 48000 },
      getFloatTimeDomainData(buffer: Float32Array) {
        for (let i = 0; i < buffer.length; i++) buffer[i] = 0.25;
      },
      getByteTimeDomainData(_buffer: Uint8Array) { /* unused */ },
      disconnect() { /* noop */ },
    } as unknown as AnalyserNode;

    useAudioAnalyserStore.getState().setAnalyser(stub);
    const buf = new Float32Array(16);
    expect(getTimeDomainData(buf)).toBe(true);
    expect(buf[0]).toBeCloseTo(0.25, 5);

    useAudioAnalyserStore.getState().setAnalyser(null);
    const buf2 = new Float32Array(16);
    expect(getTimeDomainData(buf2)).toBe(false);
    expect(buf2[0]).toBe(0); // untouched (Float32Array default 0)
  });
});
