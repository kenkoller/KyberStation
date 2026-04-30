'use client';

// ─── Audio engine — module-scope singleton ────────────────────────────────
//
// Pre-singleton (through PR #130 / #131), each call to `useAudioEngine()`
// constructed its own AudioContext, FontPlayer, AudioFilterChain, master
// GainNode, AnalyserNode, and SmoothSwingEngine. With 6 known consumers
// (WorkbenchLayout / AppShell / SoundFontPanel / AudioColumnA /
// AudioColumnB / `/m` mobile page) plus the `useAudioSync` pass-through,
// that meant up to 6 live AudioContext objects per origin — enough to
// hit Chrome's per-origin cap (~6) and trigger a hard ceiling on font
// hot-swaps. Decoded buffers were also re-decoded per instance.
//
// PR #124 / PR #128 / PR #140 each closed half of the bug by lifting one
// piece of shared state at a time:
//   - `audioMuteStore` → muted state
//   - `audioPlaybackStore` → swing speed broadcast bus
//   - `audioAnalyserStore` → first-publisher-wins analyser tap
//   - `humActiveRef` per-instance → still per-instance pre-singleton
//
// This module finishes the job: ONE AudioContext, ONE FontPlayer, ONE
// SmoothSwingEngine, ONE master gain. Every `useAudioEngine()` call is
// now a thin React hook over this module's state. The audio engine is
// conceptually a global resource (the user has one set of speakers), so
// module-scope singleton matches the established `audioMuteStore` /
// `audioPlaybackStore` / `audioAnalyserStore` pattern.
//
// Lazy init on first user gesture preserves Chrome's autoplay policy
// compliance — the AudioContext is created the first time any consumer
// calls `ensureAudioEngineInit()` (which happens on play, toggle mute,
// load font, etc.), not at module import time.
//
// Test seam: `__setAudioContextFactoryForTesting` lets tests inject a
// stub `AudioContext` constructor so the singleton's behavior can be
// exercised without a Web Audio implementation. `__resetAudioEngineForTesting`
// disposes the active singleton so each test starts fresh, mirroring
// the `__resetStoreForTesting` shape used elsewhere.

import {
  FontPlayer,
  SmoothSwingEngine,
  AudioFilterChain,
  parseFileList,
  extractFontName,
  decodeFilesByCategory,
  type FontManifest,
} from '@kyberstation/sound';

import { useAudioFontStore } from '@/stores/audioFontStore';
import { useAudioMixerStore } from '@/stores/audioMixerStore';
import { useAudioMuteStore } from '@/stores/audioMuteStore';
import { useAudioPlaybackStore } from '@/stores/audioPlaybackStore';
import { useAudioAnalyserStore } from '@/stores/audioAnalyserStore';
import { useUIStore } from '@/stores/uiStore';
import { saveFontToDB, loadFontFromDB, getLastUsedFontName } from '@/lib/fontDB';
import {
  DEFAULT_ANALYSER_FFT_SIZE,
  DEFAULT_ANALYSER_SMOOTHING,
} from '@/hooks/useAudioAnalyser';

// ─── Synthetic sound generator ─────────────────────────────────────────────
//
// Programmatic AudioBuffers so the app has fallback sound out-of-the-box
// without requiring a real .wav font. Identical math to the pre-singleton
// implementation — moved here so it can run against the singleton's
// AudioContext.

function createSyntheticSounds(ctx: AudioContext) {
  const sampleRate = ctx.sampleRate;

  function makeBuffer(durationSec: number, fill: (i: number, t: number) => number): AudioBuffer {
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = fill(i, i / sampleRate);
    }
    return buffer;
  }

  // Ignition: rising frequency sweep with noise
  const ignition = makeBuffer(0.6, (_i, t) => {
    const freq = 180 + t * 1200;
    const osc = Math.sin(2 * Math.PI * freq * t) * 0.4;
    const noise = (Math.random() - 0.5) * 0.3 * Math.max(0, 1 - t * 2);
    const env = Math.min(1, t * 8) * Math.max(0, 1 - (t - 0.4) * 5);
    return (osc + noise) * env;
  });

  // Retraction: falling frequency sweep
  const retraction = makeBuffer(0.6, (_i, t) => {
    const freq = 800 - t * 1000;
    const osc = Math.sin(2 * Math.PI * Math.max(80, freq) * t) * 0.4;
    const noise = (Math.random() - 0.5) * 0.2 * t;
    const env = Math.max(0, 1 - t * 1.8);
    return (osc + noise) * env;
  });

  // Hum: low oscillator with vibrato (longer for looping)
  const hum = makeBuffer(2.0, (_i, t) => {
    const vibrato = Math.sin(2 * Math.PI * 5 * t) * 4;
    const freq = 120 + vibrato;
    const osc1 = Math.sin(2 * Math.PI * freq * t) * 0.25;
    const osc2 = Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.1;
    const osc3 = Math.sin(2 * Math.PI * freq * 3.03 * t) * 0.05;
    return osc1 + osc2 + osc3;
  });

  // Clash: sharp transient + noise burst
  const clash = makeBuffer(0.3, (_i, t) => {
    const noise = (Math.random() - 0.5) * 2;
    const env = Math.exp(-t * 20);
    const ring = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 30) * 0.5;
    return (noise * env * 0.6 + ring) * 0.8;
  });

  // Blast: slightly longer noise burst with lower ring
  const blast = makeBuffer(0.25, (_i, t) => {
    const noise = (Math.random() - 0.5) * 2;
    const env = Math.exp(-t * 15);
    const ring = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 10) * 0.3;
    return (noise * env * 0.5 + ring) * 0.7;
  });

  // Swing: whoosh using filtered noise
  const swing = makeBuffer(0.4, (_i, t) => {
    const noise = (Math.random() - 0.5);
    const env = Math.sin(Math.PI * t / 0.4); // bell curve
    const freq = 300 + Math.sin(Math.PI * t / 0.4) * 400;
    const filter = Math.sin(2 * Math.PI * freq * t) * 0.3;
    return (noise * 0.2 + filter) * env * 0.5;
  });

  // Lockup: buzzing sustained sound
  const lockup = makeBuffer(0.5, (_i, t) => {
    const buzz = Math.sin(2 * Math.PI * 60 * t) * Math.sin(2 * Math.PI * 600 * t);
    const env = Math.min(1, t * 10) * Math.max(0, 1 - (t - 0.3) * 5);
    return buzz * env * 0.4;
  });

  // Stab: sharp piercing sound
  const stab = makeBuffer(0.2, (_i, t) => {
    const osc = Math.sin(2 * Math.PI * 1500 * t);
    const env = Math.exp(-t * 15);
    return osc * env * 0.5;
  });

  return { ignition, retraction, hum, clash, blast, swing, lockup, stab };
}

type SoundBuffers = ReturnType<typeof createSyntheticSounds>;

/**
 * Map from sound event → font category names to try.
 *
 * ProffieOS naming convention (sound/hybrid_font.h):
 *   - `out.wav` plays during IGNITION (saber blade goes OUT, power-on)
 *   - `in.wav`  plays during RETRACTION (saber blade goes IN, power-off)
 * `pstoff` ("post-off") is the optional follow-up clip ProffieOS plays
 * after `in.wav` during retraction; we treat it as the same category.
 */
export const CATEGORY_MAP: Record<string, string[]> = {
  ignition: ['out'],
  retraction: ['in'],
  hum: ['hum'],
  clash: ['clash'],
  blast: ['blast'],
  swing: ['swing', 'swingl'],
  lockup: ['lockup'],
  stab: ['stab'],
  drag: ['drag'],
  melt: ['melt'],
  force: ['force'],
};

// ─── Singleton state ───────────────────────────────────────────────────────

interface AudioEngineNodes {
  ctx: AudioContext;
  player: FontPlayer;
  smoothSwing: SmoothSwingEngine;
  filterChain: AudioFilterChain;
  masterGain: GainNode;
  analyser: AnalyserNode;
  sounds: SoundBuffers;
}

let engineNodes: AudioEngineNodes | null = null;
let initFailed = false;

// AudioContext creation counter — exposed only as a test getter.
// Bumps once per successful `ensureAudioEngineInit()` call that
// actually constructs an AudioContext. Singleton-ness regression
// sentinel reads this to confirm multiple consumers share one ctx.
let audioContextCreationCount = 0;

// Hum-active flag — single source of truth post-singleton. Pre-singleton
// each useAudioEngine instance had its own `humActiveRef`, since
// independent instances could each be playing hum on their own player.
// Now there's one player so one flag suffices.
let humActive = false;

// Subscriptions installed once at first init. The cleanup fns get
// invoked from `__resetAudioEngineForTesting` (tests only); in
// production the singleton lives for the lifetime of the page.
const installedSubscriptions: Array<() => void> = [];

// Test seam — replaces `new AudioContext()` so node-env tests can
// exercise the singleton without a Web Audio runtime. Production
// passes through to the real constructor.
type AudioContextCtor = new () => AudioContext;
let audioContextFactory: AudioContextCtor | null = null;

function getAudioContextCtor(): AudioContextCtor {
  if (audioContextFactory) return audioContextFactory;
  // Browser path — `AudioContext` is a global. Some legacy browsers
  // expose `webkitAudioContext` instead; use whichever exists.
  if (typeof window !== 'undefined') {
    const w = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    return (w.AudioContext ?? w.webkitAudioContext) as AudioContextCtor;
  }
  // SSR / node path — caller will catch the construction throw and
  // mark `initFailed = true`, which is the correct behavior since
  // there's no Web Audio without a browser.
  return (globalThis as { AudioContext?: AudioContextCtor }).AudioContext ?? (function NoAudioContext(): never {
    throw new Error('AudioContext not available in this environment');
  } as unknown as AudioContextCtor);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Initialise the audio engine singleton on first user gesture. Idempotent
 * — subsequent calls return the cached singleton without recreating it.
 *
 * Returns `true` if the singleton is initialised (either by this call or
 * a previous one), `false` if construction failed (unsupported environment,
 * autoplay-policy violation before user gesture, etc.).
 *
 * AudioContext is created lazily because Chrome's autoplay policy throws
 * `NotSupportedError` if `new AudioContext()` runs before any user
 * gesture. Every consumer's play/load/toggle path calls `ensureAudioEngineInit()`
 * inside a click/keydown handler.
 */
export function ensureAudioEngineInit(): boolean {
  if (engineNodes) return true;
  if (initFailed) return false;

  try {
    const Ctor = getAudioContextCtor();
    const ctx = new Ctor();
    audioContextCreationCount++;

    const player = new FontPlayer(ctx);

    // Master gain for mute control. Initial value reads from the store
    // directly so a freshly-created singleton picks up the latest store
    // state at construction time (the store may have changed after the
    // last reset and before this init).
    const masterGain = ctx.createGain();
    masterGain.gain.value = useAudioMuteStore.getState().muted ? 0 : 1;

    // Analyser tap for the AnalysisRail audio-waveform layer. The graph:
    //
    //   player → filterChain → masterGain → analyser → ctx.destination
    //                                                  ↑
    //                                          (transparent — passes
    //                                           audio unchanged)
    //
    // AnalyserNode IS the canonical Web Audio "tap" — it has unity gain
    // on its output and exposes time/frequency-domain readers. Putting
    // it AFTER masterGain means muting silences both audio output AND
    // the waveform reading; putting it BEFORE would render a live
    // waveform while the user thinks they've muted.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = DEFAULT_ANALYSER_FFT_SIZE;
    analyser.smoothingTimeConstant = DEFAULT_ANALYSER_SMOOTHING;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Publish to the global analyser store so the AnalysisRail's
    // audio-waveform layer can read time-domain frames without
    // prop-drilling. With a singleton there's only one node to publish.
    useAudioAnalyserStore.getState().setAnalyser(analyser);

    // Insert filter chain: player -> filterChain -> masterGain
    const initialConfig = useAudioMixerStore.getState().buildFilterChainConfig();
    const filterChain = new AudioFilterChain(ctx, initialConfig);
    player.getOutput().connect(filterChain.getInput());
    filterChain.getOutput().connect(masterGain);

    // SmoothSwing engine outputs through the same master gain.
    const smoothSwing = new SmoothSwingEngine(ctx, masterGain);

    const sounds = createSyntheticSounds(ctx);

    // Resume context if suspended (Chrome autoplay policy). Subsequent
    // pause-on-isPaused will call suspend() again as needed.
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    engineNodes = {
      ctx,
      player,
      smoothSwing,
      filterChain,
      masterGain,
      analyser,
      sounds,
    };

    // ── Install module-scope subscriptions (once per singleton) ──
    //
    // These were per-instance `useEffect`s pre-singleton. Moving them
    // module-scope means they fire exactly once per singleton lifetime,
    // not once per consumer hook-mount.

    // Mute → master gain. Pushed via subscribe so we don't need a render.
    installedSubscriptions.push(
      useAudioMuteStore.subscribe((state) => {
        const nodes = engineNodes;
        if (!nodes) return;
        nodes.masterGain.gain.value = state.muted ? 0 : 1;
      }),
    );

    // Pause → AudioContext suspend/resume. Distinct from mute: pause
    // freezes the entire audio graph (transient simulation freeze),
    // mute zeroes the master gain (persistent user preference). Each
    // is the right tool for its job.
    installedSubscriptions.push(
      useUIStore.subscribe((state, prev) => {
        if (state.isPaused === prev.isPaused) return;
        const nodes = engineNodes;
        if (!nodes) return;
        if (state.isPaused) {
          nodes.ctx.suspend();
        } else {
          nodes.ctx.resume();
        }
      }),
    );

    // Mixer (EQ / effects) → filterChain config. Sub on every change
    // since `setConfig` internally diffs and only rewires when needed.
    installedSubscriptions.push(
      useAudioMixerStore.subscribe(() => {
        const nodes = engineNodes;
        if (!nodes) return;
        const config = useAudioMixerStore.getState().buildFilterChainConfig();
        nodes.filterChain.setConfig(config);
      }),
    );

    // SwingSpeed bus → SmoothSwingEngine. Imperative subscribe so the
    // listener fires on every store flip without re-rendering React.
    // SmoothSwingEngine.update() is a no-op until pairs are loaded
    // and `start()` has been called, so subscribing here is safe.
    installedSubscriptions.push(
      useAudioPlaybackStore.subscribe(() => {
        const nodes = engineNodes;
        if (!nodes) return;
        nodes.smoothSwing.update(useAudioPlaybackStore.getState().swingSpeed);
      }),
    );

    // Hot-swap on font change. When the user picks a different font in
    // Column A's library while the blade is ignited, the new buffers
    // land in audioFontStore but the active hum source still points at
    // the old buffer. This subscription:
    //   (a) restarts the hum on the new font's buffer if hum is active
    //       (humActive flag, set/cleared alongside playHum/stopHum).
    //   (b) reloads SmoothSwing low/high pairs into the singleton's
    //       SmoothSwingEngine. `loadFont()` already calls loadPairs,
    //       but a font picked from the library list (without a fresh
    //       file-drop) takes the reactive path through this subscription.
    let lastFontName: string | null = useAudioFontStore.getState().fontName;
    installedSubscriptions.push(
      useAudioFontStore.subscribe((state) => {
        if (state.fontName === lastFontName) return;
        lastFontName = state.fontName;
        const nodes = engineNodes;
        if (!nodes) return;

        // (a) Hum hot-swap
        if (humActive) {
          const humBufs = state.buffers.get('hum');
          let humBuf: AudioBuffer | null = null;
          if (humBufs && humBufs.length > 0) {
            humBuf = humBufs[Math.floor(Math.random() * humBufs.length)];
          } else {
            // Font has no hum — fall back to synthetic so the blade
            // still hums.
            humBuf = nodes.sounds.hum;
          }
          if (humBuf) {
            nodes.player.playHum(humBuf);
            // playHum calls stopHum() internally first, so the old
            // source is already disconnected. humActive stays true.
          }
        }

        // (b) Reactive SmoothSwing pair load.
        const lowBufs = state.buffers.get('swingl');
        const highBufs = state.buffers.get('swingh');
        if (lowBufs && highBufs && lowBufs.length > 0 && highBufs.length > 0) {
          nodes.smoothSwing.loadPairs(lowBufs, highBufs);
        }
      }),
    );

    return true;
  } catch {
    initFailed = true;
    return false;
  }
}

/**
 * Get the singleton's AudioContext, or null if not yet initialised. Most
 * consumers should NOT use this directly — `ensureAudioEngineInit()` +
 * the action helpers cover production needs. Exposed for the rare
 * consumer that needs raw graph access (FontPlayer's decode helper, etc.).
 */
export function getAudioContext(): AudioContext | null {
  return engineNodes?.ctx ?? null;
}

/** True if `ensureAudioEngineInit()` has been called and succeeded. */
export function isAudioEngineInitialised(): boolean {
  return engineNodes !== null;
}

// ─── Action helpers ────────────────────────────────────────────────────────

function getBufferFor(event: keyof SoundBuffers): AudioBuffer | null {
  if (!engineNodes) return null;
  // Try real font buffers first
  const categories = CATEGORY_MAP[event];
  if (categories) {
    const buffers = useAudioFontStore.getState().buffers;
    for (const cat of categories) {
      const bufs = buffers.get(cat);
      if (bufs && bufs.length > 0) {
        return bufs[Math.floor(Math.random() * bufs.length)];
      }
    }
  }
  // Fallback to synthetic
  return engineNodes.sounds[event] ?? null;
}

export function playIgnition(): void {
  if (!ensureAudioEngineInit()) return;
  const nodes = engineNodes!;
  const inBuf = getBufferFor('ignition');
  if (inBuf) nodes.player.playOneShot(inBuf);

  // Start hum after ignition finishes
  setTimeout(() => {
    const humBuf = getBufferFor('hum');
    if (humBuf) {
      nodes.player.playHum(humBuf);
      humActive = true;
    }
  }, 500);

  // Start smooth-swing engine (plays silently until swing speed > threshold)
  nodes.smoothSwing.start();
}

export function playRetraction(): void {
  if (!ensureAudioEngineInit()) return;
  const nodes = engineNodes!;
  nodes.player.stopHum();
  humActive = false;
  nodes.smoothSwing.stop();
  const outBuf = getBufferFor('retraction');
  if (outBuf) nodes.player.playOneShot(outBuf);
}

export function playClash(): void {
  if (!ensureAudioEngineInit()) return;
  const buf = getBufferFor('clash');
  if (buf) engineNodes!.player.playOneShot(buf);
}

export function playBlast(): void {
  if (!ensureAudioEngineInit()) return;
  const buf = getBufferFor('blast');
  if (buf) engineNodes!.player.playOneShot(buf);
}

export function playSwing(): void {
  if (!ensureAudioEngineInit()) return;
  const buf = getBufferFor('swing');
  if (buf) engineNodes!.player.playOneShot(buf);
}

export function playLockup(): void {
  if (!ensureAudioEngineInit()) return;
  const buf = getBufferFor('lockup');
  if (buf) engineNodes!.player.playOneShot(buf);
}

export function playStab(): void {
  if (!ensureAudioEngineInit()) return;
  const buf = getBufferFor('stab');
  if (buf) engineNodes!.player.playOneShot(buf);
}

/**
 * Play a specific sound event by category name (for SoundFontPanel
 * preview buttons). Returns true if a sound was played.
 */
export function playEvent(category: string): boolean {
  if (!ensureAudioEngineInit()) return false;
  const buffers = useAudioFontStore.getState().buffers;
  const bufs = buffers.get(category);
  if (!bufs || bufs.length === 0) return false;
  const buf = bufs[Math.floor(Math.random() * bufs.length)];

  const nodes = engineNodes!;
  if (category === 'hum') {
    nodes.player.playHum(buf);
    humActive = true;
  } else {
    nodes.player.playOneShot(buf);
  }
  return true;
}

/** Stop the hum loop. */
export function stopHum(): void {
  if (!engineNodes) return;
  engineNodes.player.stopHum();
  humActive = false;
}

/**
 * Update smooth-swing crossfade based on current swing speed.
 *
 * Writes to the shared `audioPlaybackStore` rather than touching the
 * SmoothSwingEngine directly. The singleton subscribes to the store
 * and pushes the value into its SmoothSwingEngine. This indirection
 * is preserved from the pre-singleton era — multiple call sites
 * (AppShell.useAudioSync, MotionSimPanel, etc.) write through it.
 *
 * @param speed normalised swing speed (0-1)
 */
export function updateSwing(speed: number): void {
  useAudioPlaybackStore.getState().setSwingSpeed(speed);
}

/**
 * Load a font from dropped files. Parses the file list, decodes .wav
 * files, stores buffers in audioFontStore, and persists to IndexedDB.
 */
export async function loadFont(files: FileList | File[]): Promise<FontManifest | null> {
  if (!ensureAudioEngineInit()) return null;
  const nodes = engineNodes!;
  const ctx = nodes.ctx;

  const setIsLoading = useAudioFontStore.getState().setIsLoading;
  const setLoadProgress = useAudioFontStore.getState().setLoadProgress;
  const setFont = useAudioFontStore.getState().setFont;

  setIsLoading(true);
  setLoadProgress(0);

  try {
    // Parse file list into manifest
    const manifest = parseFileList(files);
    const name = extractFontName(files);

    // Decode audio files
    const { buffers, warnings } = await decodeFilesByCategory(
      files,
      manifest,
      ctx,
      (loaded, total) => {
        setLoadProgress(loaded / total);
      },
    );

    // Combine warnings
    const allWarnings = [...manifest.warnings, ...warnings];

    // Store in Zustand
    setFont(name, manifest, buffers, allWarnings);

    // Persist raw audio data to IndexedDB for reload survival
    const rawData = new Map<string, ArrayBuffer[]>();
    const fileArray = Array.from(files);
    for (const sf of manifest.files) {
      const file = fileArray.find((f) => {
        const fp = 'webkitRelativePath' in f ? (f as File).webkitRelativePath : '';
        return fp === sf.path || (f as File).name === sf.name;
      }) as File | undefined;
      if (file) {
        const existing = rawData.get(sf.category) ?? [];
        existing.push(await file.arrayBuffer());
        rawData.set(sf.category, existing);
      }
    }
    saveFontToDB(name, manifest, rawData).catch(() => {
      // Silent fail — IDB persistence is best-effort
    });

    // Load smooth-swing pairs into the engine
    const lowBufs = buffers.get('swingl');
    const highBufs = buffers.get('swingh');
    if (lowBufs && highBufs && lowBufs.length > 0 && highBufs.length > 0) {
      nodes.smoothSwing.loadPairs(lowBufs, highBufs);
    }

    return manifest;
  } catch {
    setIsLoading(false);
    return null;
  }
}

/**
 * Wraps `audioMuteStore.toggleMute()` with `ensureAudioEngineInit()` so
 * the AudioContext is created in the user-gesture frame even if no
 * audio has played yet. Without this, a user who toggles "Sound ON"
 * without first triggering a sound would have to click again to hear
 * anything (Chrome autoplay).
 */
export function toggleMute(): void {
  ensureAudioEngineInit();
  useAudioMuteStore.getState().toggleMute();
}

/**
 * Restore the last-used font from IndexedDB on app load. Idempotent:
 * if a font is already loaded, this is a no-op. Called once from the
 * `useAudioEngine` hook on its first mount per app lifetime.
 */
let restoreInProgress: Promise<void> | null = null;

export function restoreLastFont(): Promise<void> {
  if (restoreInProgress) return restoreInProgress;

  restoreInProgress = (async () => {
    try {
      const lastName = await getLastUsedFontName();
      if (!lastName) return;
      // Don't restore if a font is already loaded
      if (useAudioFontStore.getState().fontName) return;

      const stored = await loadFontFromDB(lastName);
      if (!stored) return;

      if (!ensureAudioEngineInit()) return;
      const nodes = engineNodes!;
      const ctx = nodes.ctx;

      // Decode stored ArrayBuffers back into AudioBuffers
      const decodedBuffers = new Map<string, AudioBuffer[]>();
      for (const [cat, rawArrays] of stored.audioData) {
        const decoded: AudioBuffer[] = [];
        for (const raw of rawArrays) {
          try {
            // ArrayBuffers become detached after decoding, so copy first
            const copy = raw.slice(0);
            const ab = await ctx.decodeAudioData(copy);
            decoded.push(ab);
          } catch {
            // Skip corrupt or unsupported files
          }
        }
        if (decoded.length > 0) {
          decodedBuffers.set(cat, decoded);
        }
      }

      useAudioFontStore.getState().setFont(lastName, stored.manifest, decodedBuffers, []);

      // Load smooth-swing pairs
      const lowBufs = decodedBuffers.get('swingl');
      const highBufs = decodedBuffers.get('swingh');
      if (lowBufs && highBufs && lowBufs.length > 0 && highBufs.length > 0) {
        nodes.smoothSwing.loadPairs(lowBufs, highBufs);
      }
    } catch {
      // Best-effort — IDB read failures shouldn't break the app.
    }
  })();

  return restoreInProgress;
}

// ─── Test seams ────────────────────────────────────────────────────────────

/**
 * Inject a stub `AudioContext` constructor for tests. Production passes
 * `null` to clear the override and fall back to the real `AudioContext`.
 *
 * Pattern matches `__setCardFrameRendererForTesting` /
 * `__setCreateQrSurfaceForTesting` in `cardSnapshot.ts`.
 */
export function __setAudioContextFactoryForTesting(
  factory: AudioContextCtor | null,
): void {
  audioContextFactory = factory;
}

/**
 * Reset the singleton between tests. Disposes the current engine
 * (if any) and clears all installed subscriptions, the analyser
 * publication, the hum-active flag, and the AudioContext counter.
 *
 * Calling pattern from a test:
 *
 *   beforeEach(() => {
 *     __resetAudioEngineForTesting();
 *     __setAudioContextFactoryForTesting(MyStubAudioContextCtor);
 *   });
 *
 * Mirrors the `__resetXxxForTesting` shape used by Zustand stores.
 */
export function __resetAudioEngineForTesting(): void {
  // Dispose any active engine resources.
  if (engineNodes) {
    try {
      engineNodes.smoothSwing.dispose();
      engineNodes.filterChain.dispose();
      engineNodes.player.dispose();
      try {
        engineNodes.analyser.disconnect();
      } catch {
        // Already disconnected — fine.
      }
      // ctx.close() rejects on already-closed contexts in some browsers;
      // ignore.
      const closeFn = engineNodes.ctx.close;
      if (typeof closeFn === 'function') {
        try {
          closeFn.call(engineNodes.ctx);
        } catch {
          // ignore
        }
      }
    } catch {
      // Tests inject stubs that may not implement every dispose hook —
      // swallow so reset always succeeds.
    }
  }

  for (const unsub of installedSubscriptions) {
    try {
      unsub();
    } catch {
      // ignore
    }
  }
  installedSubscriptions.length = 0;

  // Clear analyser publication if we own it.
  const currentAnalyser = useAudioAnalyserStore.getState().analyser;
  if (engineNodes && currentAnalyser === engineNodes.analyser) {
    useAudioAnalyserStore.getState().setAnalyser(null);
  }

  engineNodes = null;
  initFailed = false;
  humActive = false;
  audioContextCreationCount = 0;
  restoreInProgress = null;
}

/**
 * AudioContext creation counter. Incremented each time
 * `ensureAudioEngineInit()` actually constructs a new AudioContext.
 * Singleton-ness regression sentinel reads this to confirm that
 * multiple consumers share one context.
 *
 * Test-only — production code should never read this.
 */
export function __getAudioContextCreationCountForTesting(): number {
  return audioContextCreationCount;
}

/**
 * Read the hum-active flag for tests. Production code should call the
 * action helpers (`playIgnition`, `stopHum`) which mutate it as a
 * side effect.
 */
export function __getHumActiveForTesting(): boolean {
  return humActive;
}
