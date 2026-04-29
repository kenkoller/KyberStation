// ─── useAudioEngine — SmoothSwing bus + hum hot-swap regression sentinels ──
//
// Pre-fix (2026-04-29), each useAudioEngine() instance owned its own
// `smoothSwingRef` AND its own `playerRef.humSource`. Two user-visible
// symptoms followed:
//
//   Symptom 1 — SmoothSwing slider doesn't drive audio.
//     The Motion-Sim swing slider lives in AppShell.useAudioSync, which
//     calls AppShell's `audio.updateSwing`. SmoothSwing pairs were
//     typically loaded into AudioColumnB's instance (whichever instance
//     ran loadFont). Result: dragging the slider produced visible blade
//     modulation but ZERO audible change on a SmoothSwing-v2 font.
//
//   Symptom 2 — Hum doesn't hot-swap on font change.
//     With the blade ignited and hum looping, picking a new font in
//     Column A's library updates the buffer map but the active hum
//     source still points at the old buffer. The hum stays on whichever
//     font was playing when ignition fired.
//
// Fix:
//   - Symptom 1: lift swingSpeed into a Zustand bus
//     (`apps/web/stores/audioPlaybackStore.ts`); every initialised
//     useAudioEngine instance subscribes via `subscribe()` and pushes
//     into its own SmoothSwingEngine. Reactive pair-load on fontName
//     change so every initialised instance has buffers ready.
//   - Symptom 2: `humActiveRef` per instance, set/cleared alongside
//     playHum/stopHum calls. A useEffect on `fontName` restarts the
//     hum on the new buffer when humActiveRef.current is true.
//
// This file pins the wiring contract that the hook still uses these
// patterns. Mounting the hook through React isn't exercised here for
// the same reason as `useAudioEngine.test.ts` (the companion mute fix's
// sentinel) — apps/web's vitest env is node-only, and `new AudioContext()`
// in ensureInit would fail without a Web Audio mock layer that doesn't
// currently exist. Behavioural coverage of the bus itself lives in
// `apps/web/tests/audioPlaybackStore.test.ts`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOK_SOURCE = readFileSync(
  path.resolve(__dirname, '../useAudioEngine.ts'),
  'utf8',
);

describe('useAudioEngine — swing-bus wiring (Symptom 1 sentinel)', () => {
  it('imports useAudioPlaybackStore', () => {
    expect(HOOK_SOURCE).toMatch(
      /from\s+['"]@\/stores\/audioPlaybackStore['"]/,
    );
  });

  it('updateSwing writes to the bus via setSwingSpeed (not local smoothSwingRef)', () => {
    // Pre-fix, updateSwing called `smoothSwingRef.current?.update(speed)`
    // directly on the local ref. Post-fix it routes through the store
    // so every subscriber instance gets the value.
    expect(HOOK_SOURCE).toMatch(
      /useAudioPlaybackStore\.getState\(\)\.setSwingSpeed\s*\(\s*speed\s*\)/,
    );
  });

  it('subscribes to the playback store and pushes into smoothSwingRef in the listener', () => {
    // Imperative subscribe (not a React selector), so the listener
    // doesn't trigger a component re-render at 60+ fps.
    expect(HOOK_SOURCE).toMatch(
      /useAudioPlaybackStore\.subscribe\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*smoothSwingRef\.current\?\.update[\s\S]*\}\s*\)/,
    );
  });

  it('reactively loads SmoothSwing pairs from audioFontStore.buffers on fontName change', () => {
    // Without this, an instance that didn't run loadFont (e.g. AppShell's
    // mobile-shell instance) has no pairs in its smoothSwingRef even when
    // a font is loaded — making the bus broadcast useless on that
    // instance.
    expect(HOOK_SOURCE).toMatch(/buffers\.get\s*\(\s*['"]swingl['"]\s*\)/);
    expect(HOOK_SOURCE).toMatch(/buffers\.get\s*\(\s*['"]swingh['"]\s*\)/);
    expect(HOOK_SOURCE).toMatch(/smoothSwingRef\.current\.loadPairs\s*\(\s*lowBufs\s*,\s*highBufs\s*\)/);
  });
});

describe('useAudioEngine — hum hot-swap wiring (Symptom 2 sentinel)', () => {
  it('declares a humActiveRef to track per-instance hum state', () => {
    expect(HOOK_SOURCE).toMatch(/humActiveRef\s*=\s*useRef\s*<\s*boolean\s*>?\s*\(\s*false\s*\)|humActiveRef\s*=\s*useRef\(\s*false\s*\)/);
  });

  it('sets humActiveRef.current = true alongside playHum() in playEvent', () => {
    // playEvent('hum') is the path the AudioColumnB preview-hum button uses.
    expect(HOOK_SOURCE).toMatch(
      /player\.playHum\s*\(\s*buf\s*\)\s*;\s*\n\s*humActiveRef\.current\s*=\s*true/,
    );
  });

  it('sets humActiveRef.current = true alongside playHum() in playIgnition setTimeout', () => {
    // playIgnition delays hum-start by 500ms; the flag must flip inside
    // the timer callback so the hot-swap effect doesn't fire spuriously
    // during the ignition gap.
    expect(HOOK_SOURCE).toMatch(
      /player\.playHum\s*\(\s*humBuf\s*\)\s*;\s*\n\s*humActiveRef\.current\s*=\s*true/,
    );
  });

  it('clears humActiveRef.current = false in playRetraction and stopHum', () => {
    // Both stop paths must clear the flag so the hot-swap effect
    // doesn't restart hum on a font change after the blade is off.
    const matches = HOOK_SOURCE.match(/humActiveRef\.current\s*=\s*false/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('useEffect on fontName performs the hot-swap when humActiveRef.current is true', () => {
    // The effect body checks humActiveRef.current and calls playHum on
    // the new buffer. playHum stops the old source internally first.
    expect(HOOK_SOURCE).toMatch(
      /humActiveRef\.current\s*&&\s*playerRef\.current[\s\S]*playerRef\.current\.playHum/,
    );
    // Effect must depend on fontName so it fires when the font store value flips.
    expect(HOOK_SOURCE).toMatch(/\}\s*,\s*\[\s*fontName\s*\]\s*\)/);
  });

  it('falls back to synthetic hum when the new font has no hum buffer', () => {
    // Some fonts ship without a hum.wav. Without a fallback, the
    // hot-swap would silently leave the blade hum-less. Synthetic
    // hum is always available via soundsRef.current.hum.
    expect(HOOK_SOURCE).toMatch(/soundsRef\.current\?\.hum/);
  });
});

describe('useAudioEngine — hot-swap effect guards', () => {
  it('skips the hot-swap effect when the instance is not initialised', () => {
    // Uninitialised instances have no AudioContext, no playerRef, no
    // smoothSwingRef. The early return prevents null derefs and avoids
    // running the effect on instances the user hasn't interacted with.
    expect(HOOK_SOURCE).toMatch(/if\s*\(\s*!initializedRef\.current\s*\)\s*return\s*;/);
  });
});
