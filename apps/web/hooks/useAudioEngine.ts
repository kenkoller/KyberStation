'use client';
import { useRef, useCallback, useEffect } from 'react';
import { FontPlayer, SmoothSwingEngine, AudioFilterChain, parseFileList, extractFontName, decodeFilesByCategory } from '@kyberstation/sound';
import type { FontManifest } from '@kyberstation/sound';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { useAudioMixerStore } from '@/stores/audioMixerStore';
import { useAudioMuteStore } from '@/stores/audioMuteStore';
import { saveFontToDB, loadFontFromDB, getLastUsedFontName } from '@/lib/fontDB';

/**
 * Synthetic sound generator — creates AudioBuffers programmatically
 * so the app has sound out of the box without requiring real .wav fonts.
 */
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

/** Map from sound event → font category names to try */
const CATEGORY_MAP: Record<string, string[]> = {
  ignition: ['in'],
  retraction: ['out'],
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

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<FontPlayer | null>(null);
  const smoothSwingRef = useRef<SmoothSwingEngine | null>(null);
  const filterChainRef = useRef<AudioFilterChain | null>(null);
  const soundsRef = useRef<SoundBuffers | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const initializedRef = useRef(false);

  // Mute state lives in a global store so every `useAudioEngine` instance
  // (header toggle, AudioColumnB preview buttons, SmoothSwing tick, mobile
  // shell, etc.) reads the same value. Pre-fix, each instance owned its
  // own useState/useRef + masterGain, so toggling from the header only
  // silenced the instance the header read from — the others stayed muted.
  const muted = useAudioMuteStore((s) => s.muted);

  // Font store access
  const getBuffer = useAudioFontStore((s) => s.getBuffer);
  const setFont = useAudioFontStore((s) => s.setFont);
  const setLoadProgress = useAudioFontStore((s) => s.setLoadProgress);
  const setIsLoading = useAudioFontStore((s) => s.setIsLoading);
  const fontName = useAudioFontStore((s) => s.fontName);

  // Initialize on first user gesture (AudioContext requires it)
  const ensureInit = useCallback(() => {
    if (initializedRef.current) return true;

    try {
      const ctx = new AudioContext();
      const player = new FontPlayer(ctx);

      // Master gain for mute control. Initial value reads from the store
      // directly (not via the closure-captured `muted` selector value)
      // so a freshly-mounted instance picks up the latest store state
      // even if the store changed between render and ensureInit firing.
      const masterGain = ctx.createGain();
      masterGain.gain.value = useAudioMuteStore.getState().muted ? 0 : 1;
      masterGain.connect(ctx.destination);

      // Insert filter chain: player -> filterChain -> masterGain
      const initialConfig = useAudioMixerStore.getState().buildFilterChainConfig();
      const filterChain = new AudioFilterChain(ctx, initialConfig);
      player.getOutput().connect(filterChain.getInput());
      filterChain.getOutput().connect(masterGain);
      filterChainRef.current = filterChain;
      masterGainRef.current = masterGain;

      // SmoothSwing engine outputs through the same master gain
      const smoothSwing = new SmoothSwingEngine(ctx, masterGain);
      smoothSwingRef.current = smoothSwing;

      ctxRef.current = ctx;
      playerRef.current = player;
      soundsRef.current = createSyntheticSounds(ctx);
      initializedRef.current = true;

      // Resume context if suspended (Chrome autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  // Push store changes into this instance's masterGain. Every `useAudioEngine`
  // consumer runs this effect, so a single store flip silences/unsilences
  // all of them. ensureInit() may not have run yet on freshly-mounted
  // instances (AudioContext needs a user gesture); the gain push there
  // covers that case.
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = muted ? 0 : 1;
    }
  }, [muted]);

  // Wraps the store's toggle with ensureInit so the AudioContext is
  // created in the user-gesture frame even if no audio has played yet.
  // Without this, a user who toggles "Sound ON" without first triggering
  // a sound would have to click again to hear anything (Chrome autoplay).
  const toggleMute = useCallback(() => {
    ensureInit();
    useAudioMuteStore.getState().toggleMute();
  }, [ensureInit]);

  /**
   * Get a buffer for a sound event — prefers real font buffers, falls back to synthetic.
   */
  const getBufferFor = useCallback(
    (event: keyof SoundBuffers): AudioBuffer | null => {
      // Try real font buffers first
      const categories = CATEGORY_MAP[event];
      if (categories) {
        for (const cat of categories) {
          const buf = getBuffer(cat);
          if (buf) return buf;
        }
      }
      // Fallback to synthetic
      return soundsRef.current?.[event] ?? null;
    },
    [getBuffer],
  );

  /**
   * Load a font from dropped files.
   * Parses the file list, decodes .wav files, and stores buffers.
   */
  const loadFont = useCallback(
    async (files: FileList | File[]): Promise<FontManifest | null> => {
      if (!ensureInit()) return null;
      const ctx = ctxRef.current!;

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
        // Group manifest files by category, read raw ArrayBuffers
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
          smoothSwingRef.current?.loadPairs(lowBufs, highBufs);
        }

        return manifest;
      } catch {
        setIsLoading(false);
        return null;
      }
    },
    [ensureInit, setFont, setLoadProgress, setIsLoading],
  );

  /**
   * Play a specific sound event by category name (for SoundFontPanel buttons).
   * Returns true if a sound was played.
   */
  const playEvent = useCallback(
    (category: string): boolean => {
      if (!ensureInit()) return false;
      const player = playerRef.current!;

      const buf = getBuffer(category);
      if (!buf) return false;

      if (category === 'hum') {
        player.playHum(buf);
      } else {
        player.playOneShot(buf);
      }
      return true;
    },
    [ensureInit, getBuffer],
  );

  /** Stop the hum loop */
  const stopHum = useCallback(() => {
    playerRef.current?.stopHum();
  }, []);

  const playIgnition = useCallback(() => {
    if (!ensureInit()) return;
    const player = playerRef.current!;

    const inBuf = getBufferFor('ignition');
    if (inBuf) player.playOneShot(inBuf);

    // Start hum after ignition finishes
    setTimeout(() => {
      const humBuf = getBufferFor('hum');
      if (humBuf) player.playHum(humBuf);
    }, 500);

    // Start smooth-swing engine (plays silently until swing speed > threshold)
    smoothSwingRef.current?.start();
  }, [ensureInit, getBufferFor]);

  const playRetraction = useCallback(() => {
    if (!ensureInit()) return;
    const player = playerRef.current!;
    player.stopHum();
    smoothSwingRef.current?.stop();
    const outBuf = getBufferFor('retraction');
    if (outBuf) player.playOneShot(outBuf);
  }, [ensureInit, getBufferFor]);

  const playClash = useCallback(() => {
    if (!ensureInit()) return;
    const buf = getBufferFor('clash');
    if (buf) playerRef.current!.playOneShot(buf);
  }, [ensureInit, getBufferFor]);

  const playBlast = useCallback(() => {
    if (!ensureInit()) return;
    const buf = getBufferFor('blast');
    if (buf) playerRef.current!.playOneShot(buf);
  }, [ensureInit, getBufferFor]);

  const playSwing = useCallback(() => {
    if (!ensureInit()) return;
    const buf = getBufferFor('swing');
    if (buf) playerRef.current!.playOneShot(buf);
  }, [ensureInit, getBufferFor]);

  const playLockup = useCallback(() => {
    if (!ensureInit()) return;
    const buf = getBufferFor('lockup');
    if (buf) playerRef.current!.playOneShot(buf);
  }, [ensureInit, getBufferFor]);

  const playStab = useCallback(() => {
    if (!ensureInit()) return;
    const buf = getBufferFor('stab');
    if (buf) playerRef.current!.playOneShot(buf);
  }, [ensureInit, getBufferFor]);

  /**
   * Update smooth-swing crossfade based on current swing speed.
   * @param speed normalised swing speed (0-1)
   */
  const updateSwing = useCallback((speed: number) => {
    smoothSwingRef.current?.update(speed);
  }, []);

  // Restore last-used font from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lastName = await getLastUsedFontName();
      if (!lastName || cancelled) return;
      // Don't restore if a font is already loaded
      if (useAudioFontStore.getState().fontName) return;

      const stored = await loadFontFromDB(lastName);
      if (!stored || cancelled) return;

      if (!ensureInit()) return;
      const ctx = ctxRef.current!;

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

      if (cancelled) return;

      setFont(lastName, stored.manifest, decodedBuffers, []);

      // Load smooth-swing pairs
      const lowBufs = decodedBuffers.get('swingl');
      const highBufs = decodedBuffers.get('swingh');
      if (lowBufs && highBufs && lowBufs.length > 0 && highBufs.length > 0) {
        smoothSwingRef.current?.loadPairs(lowBufs, highBufs);
      }
    })();
    return () => { cancelled = true; };
  }, [ensureInit, setFont]);

  // Subscribe to mixer store — rebuild filter chain when sliders change
  useEffect(() => {
    const unsub = useAudioMixerStore.subscribe(() => {
      const chain = filterChainRef.current;
      if (!chain) return;
      const config = useAudioMixerStore.getState().buildFilterChainConfig();
      chain.setConfig(config);
    });
    return unsub;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      smoothSwingRef.current?.dispose();
      filterChainRef.current?.dispose();
      playerRef.current?.dispose();
      ctxRef.current?.close();
    };
  }, []);

  return {
    playIgnition,
    playRetraction,
    playClash,
    playBlast,
    playSwing,
    playLockup,
    playStab,
    playEvent,
    stopHum,
    loadFont,
    updateSwing,
    muted,
    toggleMute,
    fontName,
  };
}
