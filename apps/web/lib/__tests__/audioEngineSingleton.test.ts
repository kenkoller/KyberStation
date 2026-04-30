// ─── audioEngineSingleton — single-AudioContext invariant ───────────────────
//
// The PR that introduced this file (refactor/audio-engine-singleton)
// consolidated 6 useAudioEngine() consumers onto a module-scope
// singleton: ONE AudioContext, ONE FontPlayer, ONE master gain. This
// test pins the invariant that calling the action helpers from
// multiple call sites — exactly what 6 mounted consumers would do —
// constructs only ONE AudioContext.
//
// apps/web's vitest env is node-only (no jsdom). We inject a minimal
// stub `AudioContext` constructor via the singleton's
// `__setAudioContextFactoryForTesting` test seam. The stub implements
// just enough surface for the sound package's node graph
// (createGain / createBufferSource / createBiquadFilter /
// createWaveShaper / createConvolver / createDelay / decodeAudioData /
// destination / currentTime / sampleRate / state / suspend / resume /
// close). Behavioural fidelity isn't the point — the test just needs
// the init path to run end-to-end without throwing.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ensureAudioEngineInit,
  isAudioEngineInitialised,
  playClash,
  playBlast,
  playStab,
  toggleMute,
  __resetAudioEngineForTesting,
  __setAudioContextFactoryForTesting,
  __getAudioContextCreationCountForTesting,
} from '../audioEngineSingleton';

// ─── Stub AudioContext ─────────────────────────────────────────────────────

function makeStubNode() {
  return {
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    gain: {
      value: 0,
      setValueAtTime: () => {},
      setTargetAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    },
    frequency: {
      value: 0,
      setValueAtTime: () => {},
      setTargetAtTime: () => {},
    },
    Q: {
      value: 0,
      setValueAtTime: () => {},
      setTargetAtTime: () => {},
    },
    type: 'lowpass',
    delayTime: { value: 0, setValueAtTime: () => {} },
    fftSize: 1024,
    smoothingTimeConstant: 0.0,
    getFloatTimeDomainData: () => {},
    getByteTimeDomainData: () => {},
    curve: null as Float32Array | null,
    oversample: 'none',
    buffer: null as AudioBuffer | null,
    onended: null,
  };
}

class StubAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  channels: Float32Array[];
  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channels = Array.from({ length: channels }, () => new Float32Array(length));
  }
  getChannelData(i: number): Float32Array {
    return this.channels[i];
  }
}

class StubAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = makeStubNode();
  // Track createGain/etc calls so we can sanity-check the graph
  // construction in the singleton.
  createGain = () => makeStubNode();
  createAnalyser = () => makeStubNode();
  createBufferSource = () => makeStubNode();
  createBiquadFilter = () => makeStubNode();
  createWaveShaper = () => makeStubNode();
  createConvolver = () => makeStubNode();
  createDelay = () => makeStubNode();
  createBuffer = (channels: number, length: number, sampleRate: number) =>
    new StubAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer;
  decodeAudioData = (_buf: ArrayBuffer): Promise<AudioBuffer> =>
    Promise.resolve(new StubAudioBuffer(1, 1, 48000) as unknown as AudioBuffer);
  resume = () => {
    this.state = 'running';
    return Promise.resolve();
  };
  suspend = () => {
    this.state = 'suspended';
    return Promise.resolve();
  };
  close = () => {
    this.state = 'closed';
    return Promise.resolve();
  };
}

beforeEach(() => {
  __resetAudioEngineForTesting();
  __setAudioContextFactoryForTesting(StubAudioContext as unknown as new () => AudioContext);
});

describe('audioEngineSingleton — single-AudioContext invariant', () => {
  it('starts uninitialised and with creation count 0', () => {
    expect(isAudioEngineInitialised()).toBe(false);
    expect(__getAudioContextCreationCountForTesting()).toBe(0);
  });

  it('first ensureAudioEngineInit() call constructs ONE AudioContext', () => {
    const ok = ensureAudioEngineInit();
    expect(ok).toBe(true);
    expect(isAudioEngineInitialised()).toBe(true);
    expect(__getAudioContextCreationCountForTesting()).toBe(1);
  });

  it('subsequent ensureAudioEngineInit() calls do NOT construct a new context', () => {
    ensureAudioEngineInit();
    ensureAudioEngineInit();
    ensureAudioEngineInit();
    expect(__getAudioContextCreationCountForTesting()).toBe(1);
  });

  it('multiple consumers calling action helpers share one AudioContext', () => {
    // Simulate the 6 known useAudioEngine() consumers each triggering
    // their own action path:
    //   1. WorkbenchLayout — playClash() on header chip click
    //   2. AppShell — playBlast() on mobile shell chip click
    //   3. SoundFontPanel — toggleMute() on header
    //   4. AudioColumnA — toggleMute() on font picker
    //   5. AudioColumnB — playStab() on preview button
    //   6. /m mobile page — playClash()
    //
    // Pre-singleton, each of these would have constructed its own
    // AudioContext via its own ensureInit() running on first call.
    // Post-singleton, the first call constructs the engine and every
    // subsequent action helper hits the cached singleton.
    playClash();
    playBlast();
    toggleMute();
    toggleMute();
    playStab();
    playClash();

    expect(__getAudioContextCreationCountForTesting()).toBe(1);
    expect(isAudioEngineInitialised()).toBe(true);
  });

  it('reset disposes the singleton and zeroes the counter', () => {
    ensureAudioEngineInit();
    expect(__getAudioContextCreationCountForTesting()).toBe(1);

    __resetAudioEngineForTesting();
    __setAudioContextFactoryForTesting(StubAudioContext as unknown as new () => AudioContext);

    expect(isAudioEngineInitialised()).toBe(false);
    expect(__getAudioContextCreationCountForTesting()).toBe(0);
  });

  it('after reset, a fresh ensureAudioEngineInit() constructs a NEW context (counter = 1, not 2)', () => {
    // Reset is the per-test cleanup. Without it, prior-test state would
    // leak. After reset, the next init is the singleton's first init.
    ensureAudioEngineInit();
    __resetAudioEngineForTesting();
    __setAudioContextFactoryForTesting(StubAudioContext as unknown as new () => AudioContext);

    ensureAudioEngineInit();
    expect(__getAudioContextCreationCountForTesting()).toBe(1);
  });
});
