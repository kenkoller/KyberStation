// ─── audioAnalyserStore — broadcast contract ───────────────────────────────
//
// Pins the store's invariants:
//
//   1. Initial state: analyser === null (no AudioContext yet — gated on
//      user gesture per Web Audio autoplay policy).
//   2. setAnalyser(node) publishes when slot is empty.
//   3. setAnalyser(sameNode) is idempotent — no spurious churn.
//   4. setAnalyser(differentNode) when one is already published is
//      REJECTED — first-publisher-wins semantics. Stops a sibling
//      `useAudioEngine` instance from clobbering the rail's tap.
//   5. setAnalyser(null) clears the slot — used in cleanup paths so the
//      next instance to init can publish fresh.
//   6. getTimeDomainData reads from the published analyser into the
//      caller's buffer + returns true; returns false (untouched) when
//      no analyser is published.

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioAnalyserStore, getTimeDomainData } from '../stores/audioAnalyserStore';

beforeEach(() => {
  useAudioAnalyserStore.setState({ analyser: null });
});

/**
 * Minimal AnalyserNode stub for Node-environment tests. Only the
 * surface area `audioAnalyserStore` + the layer's render path touches
 * lives here; we don't need to model the full Web Audio API.
 */
function makeStubAnalyser(opts: { fftSize?: number } = {}): AnalyserNode {
  const fftSize = opts.fftSize ?? 1024;
  const stub = {
    fftSize,
    smoothingTimeConstant: 0,
    context: { sampleRate: 48000 },
    getFloatTimeDomainData(buffer: Float32Array) {
      // Fill with a deterministic sine wave so tests can verify the
      // copy actually happened.
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.sin((i / buffer.length) * 2 * Math.PI);
      }
    },
    getByteTimeDomainData(buffer: Uint8Array) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 128;
      }
    },
    disconnect() { /* noop */ },
  };
  return stub as unknown as AnalyserNode;
}

describe('audioAnalyserStore — store contract', () => {
  it('initial state is analyser: null', () => {
    expect(useAudioAnalyserStore.getState().analyser).toBe(null);
  });

  it('setAnalyser(node) publishes when slot is empty', () => {
    const a = makeStubAnalyser();
    useAudioAnalyserStore.getState().setAnalyser(a);
    expect(useAudioAnalyserStore.getState().analyser).toBe(a);
  });

  it('setAnalyser(sameNode) is idempotent', () => {
    const a = makeStubAnalyser();
    useAudioAnalyserStore.getState().setAnalyser(a);
    // Subscribe a counter to verify no extra set fires.
    let calls = 0;
    const unsub = useAudioAnalyserStore.subscribe(() => { calls++; });
    useAudioAnalyserStore.getState().setAnalyser(a);
    unsub();
    expect(calls).toBe(0);
    expect(useAudioAnalyserStore.getState().analyser).toBe(a);
  });

  it('setAnalyser(differentNode) when one is published is REJECTED (first wins)', () => {
    const a = makeStubAnalyser();
    const b = makeStubAnalyser();
    useAudioAnalyserStore.getState().setAnalyser(a);
    useAudioAnalyserStore.getState().setAnalyser(b);
    expect(useAudioAnalyserStore.getState().analyser).toBe(a);
  });

  it('setAnalyser(null) clears a published slot', () => {
    const a = makeStubAnalyser();
    useAudioAnalyserStore.getState().setAnalyser(a);
    useAudioAnalyserStore.getState().setAnalyser(null);
    expect(useAudioAnalyserStore.getState().analyser).toBe(null);
  });

  it('after clearing, a different node can be published (cleanup → new init)', () => {
    const a = makeStubAnalyser();
    const b = makeStubAnalyser();
    useAudioAnalyserStore.getState().setAnalyser(a);
    useAudioAnalyserStore.getState().setAnalyser(null);
    useAudioAnalyserStore.getState().setAnalyser(b);
    expect(useAudioAnalyserStore.getState().analyser).toBe(b);
  });
});

describe('getTimeDomainData', () => {
  it('returns false + leaves buffer untouched when no analyser is published', () => {
    const buf = new Float32Array(64);
    buf[0] = 0.42;
    // Float32 precision means buf[0] reads back as ~0.41999998 — read
    // it BEFORE the call so the comparison is exact regardless of
    // float-rounding.
    const seed = buf[0];
    const ok = getTimeDomainData(buf);
    expect(ok).toBe(false);
    expect(buf[0]).toBe(seed);
  });

  it('returns true + copies float samples when analyser supports getFloatTimeDomainData', () => {
    const a = makeStubAnalyser({ fftSize: 16 });
    useAudioAnalyserStore.getState().setAnalyser(a);
    const buf = new Float32Array(16);
    const ok = getTimeDomainData(buf);
    expect(ok).toBe(true);
    // The stub fills with sin(i * 2π / N) — first sample is ~0, the
    // 4th sample (90°) is ~1, the 12th (270°) is ~-1.
    expect(buf[0]).toBeCloseTo(0, 5);
    expect(buf[4]).toBeCloseTo(1, 5);
    expect(buf[12]).toBeCloseTo(-1, 5);
  });

  it('falls back to getByteTimeDomainData when float variant is missing (Safari path)', () => {
    const a = makeStubAnalyser({ fftSize: 8 });
    // Strip the float variant to simulate older Safari.
    delete (a as { getFloatTimeDomainData?: unknown }).getFloatTimeDomainData;
    useAudioAnalyserStore.getState().setAnalyser(a);
    const buf = new Float32Array(8);
    const ok = getTimeDomainData(buf);
    expect(ok).toBe(true);
    // Stub byte impl writes 128 (centred zero); fallback maps to 0.
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]).toBeCloseTo(0, 5);
    }
  });
});
