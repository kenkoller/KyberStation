'use client';
import { useEffect } from 'react';
import type { FontManifest } from '@kyberstation/sound';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { useAudioMuteStore } from '@/stores/audioMuteStore';
import {
  loadFont as singletonLoadFont,
  playBlast as singletonPlayBlast,
  playClash as singletonPlayClash,
  playEvent as singletonPlayEvent,
  playIgnition as singletonPlayIgnition,
  playLockup as singletonPlayLockup,
  playRetraction as singletonPlayRetraction,
  playStab as singletonPlayStab,
  playSwing as singletonPlaySwing,
  restoreLastFont,
  stopHum as singletonStopHum,
  toggleMute as singletonToggleMute,
  updateSwing as singletonUpdateSwing,
} from '@/lib/audioEngineSingleton';

// Re-exported for any consumer that imported it from the hook module
// pre-singleton. Now lives canonically in the singleton — the hook
// re-export keeps existing imports working.
export { CATEGORY_MAP } from '@/lib/audioEngineSingleton';

/**
 * React hook that exposes the singleton audio engine.
 *
 * Pre-singleton (through PR #131), this hook spun up its own
 * AudioContext, FontPlayer, AudioFilterChain, master gain, and
 * SmoothSwingEngine on every call. With 6 known consumers
 * (WorkbenchLayout / AppShell / SoundFontPanel / AudioColumnA /
 * AudioColumnB / `/m`) plus the `useAudioSync` pass-through, that hit
 * Chrome's per-origin AudioContext cap (~6) and re-decoded buffers per
 * instance. PR #124 / #128 / #140 closed half the bug by lifting muted /
 * swingSpeed / analyser into shared stores; the rest of the engine
 * (AudioContext, FontPlayer, master gain, SmoothSwingEngine) lived on as
 * a per-instance ref.
 *
 * The singleton in `lib/audioEngineSingleton.ts` finishes the job: ONE
 * AudioContext, ONE FontPlayer, ONE master gain. This hook is now a
 * thin React surface over the module-scope state — call it as many
 * times as you like; only one engine is ever constructed.
 *
 * Subscribed to `audioMuteStore` + `audioFontStore` so the returned
 * `muted` / `fontName` values track those stores. Pause/resume,
 * filter-chain mirroring, font hot-swap, and SmoothSwing bus pumping
 * are installed once at singleton init in `ensureAudioEngineInit()` —
 * not here. This hook owns no `useEffect` for those concerns.
 *
 * The IDB font-restore is fired on the first mount per app lifetime
 * (idempotent across calls). It can't live in module scope because
 * importing it before any user gesture must not trigger an
 * AudioContext construction.
 */
export function useAudioEngine() {
  // Subscribe to muted state so consumers re-render when mute toggles.
  // The singleton itself maintains the masterGain side via a separate
  // module-scope subscription, but consumers reading `audio.muted` need
  // a React subscription path to re-render.
  const muted = useAudioMuteStore((s) => s.muted);

  // Subscribe to fontName so consumers re-render when the active font
  // changes. The singleton's font hot-swap subscription handles the
  // engine-side wiring (hum hot-swap + SmoothSwing reload); this
  // subscription only feeds the React tree.
  const fontName = useAudioFontStore((s) => s.fontName);

  // Restore last-used font from IDB on first mount per app lifetime.
  // `restoreLastFont` is internally idempotent — multiple consumers
  // mounting at once still trigger only one read pass.
  useEffect(() => {
    restoreLastFont().catch(() => {
      // Best-effort — never throw out of the effect.
    });
  }, []);

  // Type-aligned wrapper for loadFont so the public hook signature
  // matches the pre-singleton shape (`(files: FileList | File[]) =>
  // Promise<FontManifest | null>`). The singleton implementation has
  // the same shape; the wrapper is here for symmetry with the other
  // re-exports and to keep the hook self-contained.
  const loadFont = (files: FileList | File[]): Promise<FontManifest | null> =>
    singletonLoadFont(files);

  return {
    playIgnition: singletonPlayIgnition,
    playRetraction: singletonPlayRetraction,
    playClash: singletonPlayClash,
    playBlast: singletonPlayBlast,
    playSwing: singletonPlaySwing,
    playLockup: singletonPlayLockup,
    playStab: singletonPlayStab,
    playEvent: singletonPlayEvent,
    stopHum: singletonStopHum,
    loadFont,
    updateSwing: singletonUpdateSwing,
    muted,
    toggleMute: singletonToggleMute,
    fontName,
  };
}
