// ─── audio engine — SmoothSwing bus + hum hot-swap regression sentinels ──
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
// Pre-singleton fix:
//   - Symptom 1: lift swingSpeed into a Zustand bus
//     (`apps/web/stores/audioPlaybackStore.ts`); every initialised
//     useAudioEngine instance subscribed via `subscribe()` and pushed
//     into its own SmoothSwingEngine.
//   - Symptom 2: `humActiveRef` per instance, set/cleared alongside
//     playHum/stopHum calls. A useEffect on `fontName` restarted the
//     hum on the new buffer when humActiveRef.current was true.
//
// Post-singleton: there's one engine, so one global `humActive` flag
// and one SmoothSwingEngine subscription — but the contract is the
// same: `updateSwing()` writes to the bus rather than touching nodes
// directly, and the engine subscribes to `audioFontStore` to react to
// font changes (hum hot-swap + reactive swingl/swingh pair load).
//
// This file pins the wiring contract that the singleton still uses
// these patterns. Behaviour-level coverage with a stubbed AudioContext
// lives in `audioEngineSingleton.test.ts`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SINGLETON_SOURCE = readFileSync(
  path.resolve(__dirname, '../../lib/audioEngineSingleton.ts'),
  'utf8',
);

describe('singleton — swing-bus wiring (Symptom 1 sentinel)', () => {
  it('imports useAudioPlaybackStore', () => {
    expect(SINGLETON_SOURCE).toMatch(
      /from\s+['"]@\/stores\/audioPlaybackStore['"]/,
    );
  });

  it('updateSwing writes to the bus via setSwingSpeed (not directly to SmoothSwingEngine)', () => {
    // Pre-fix, updateSwing called `smoothSwingRef.current?.update(speed)`
    // directly on the local ref. Post-fix it routes through the store
    // so future shared-engine consumers (and other writers like
    // MotionSimPanel) stay in sync.
    expect(SINGLETON_SOURCE).toMatch(
      /useAudioPlaybackStore\.getState\(\)\.setSwingSpeed\s*\(\s*speed\s*\)/,
    );
  });

  it('subscribes to the playback store and pushes into smoothSwing in the listener', () => {
    // Imperative subscribe (not a React selector), so the listener
    // doesn't trigger a component re-render at 60+ fps. Singleton's
    // single SmoothSwingEngine accepts the value via `update()`.
    expect(SINGLETON_SOURCE).toMatch(
      /useAudioPlaybackStore\.subscribe\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*smoothSwing\.update[\s\S]*\}/,
    );
  });

  it('reactively loads SmoothSwing pairs from audioFontStore.buffers on font change', () => {
    // Without this, a font picked from the library (without a fresh
    // file-drop) wouldn't load swingl/swingh pairs into the engine,
    // making the bus broadcast useless.
    expect(SINGLETON_SOURCE).toMatch(/buffers\.get\s*\(\s*['"]swingl['"]\s*\)/);
    expect(SINGLETON_SOURCE).toMatch(/buffers\.get\s*\(\s*['"]swingh['"]\s*\)/);
    expect(SINGLETON_SOURCE).toMatch(/smoothSwing\.loadPairs\s*\(\s*lowBufs\s*,\s*highBufs\s*\)/);
  });
});

describe('singleton — hum hot-swap wiring (Symptom 2 sentinel)', () => {
  it('declares a module-scope humActive flag (single source of truth post-singleton)', () => {
    // Pre-singleton, every useAudioEngine instance carried its own
    // `humActiveRef`. Post-singleton there's one engine, so one flag.
    expect(SINGLETON_SOURCE).toMatch(/let\s+humActive\s*=\s*false/);
  });

  it('sets humActive = true alongside playHum() in playEvent', () => {
    // playEvent('hum') is the path the AudioColumnB preview-hum button uses.
    expect(SINGLETON_SOURCE).toMatch(
      /player\.playHum\s*\(\s*buf\s*\)\s*;\s*\n\s*humActive\s*=\s*true/,
    );
  });

  it('sets humActive = true alongside playHum() in playIgnition setTimeout', () => {
    // playIgnition delays hum-start by 500ms; the flag must flip inside
    // the timer callback so the hot-swap subscription doesn't fire
    // spuriously during the ignition gap.
    expect(SINGLETON_SOURCE).toMatch(
      /player\.playHum\s*\(\s*humBuf\s*\)\s*;\s*\n\s*\s*humActive\s*=\s*true/,
    );
  });

  it('clears humActive = false in playRetraction and stopHum', () => {
    // Both stop paths must clear the flag so the hot-swap subscription
    // doesn't restart hum on a font change after the blade is off.
    const matches = SINGLETON_SOURCE.match(/humActive\s*=\s*false/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('subscribes to audioFontStore for the hot-swap path', () => {
    // The post-singleton hot-swap is a module-scope subscription, not
    // a per-instance useEffect. Single source of truth for "did the
    // active fontName change?" lives in the store.
    expect(SINGLETON_SOURCE).toMatch(/useAudioFontStore\.subscribe\s*\(/);
  });

  it('triggers playHum on font change when humActive is true', () => {
    // The subscription body checks the humActive flag and calls
    // playHum on the new buffer. playHum stops the old source
    // internally first.
    expect(SINGLETON_SOURCE).toMatch(
      /if\s*\(\s*humActive\s*\)\s*\{[\s\S]*player\.playHum/,
    );
  });

  it('falls back to synthetic hum when the new font has no hum buffer', () => {
    // Some fonts ship without a hum.wav. Without a fallback, the
    // hot-swap would silently leave the blade hum-less. Synthetic
    // hum is always available via the singleton's sounds bank.
    expect(SINGLETON_SOURCE).toMatch(/nodes\.sounds\.hum/);
  });
});
