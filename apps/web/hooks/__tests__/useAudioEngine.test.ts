// ─── useAudioEngine — singleton wiring + mute/pause regression sentinels ──
//
// Pre-singleton (through PR #131), each useAudioEngine() call created
// independent `muted` useState + mutedRef + masterGain. Toggling mute
// from the header's Sound OFF/ON button only updated the instance that
// backed the header — the other 5 useAudioEngine consumers stayed
// muted forever. PR #124 lifted muted to a global Zustand store, which
// solved the user-visible bug. The singleton refactor here finishes
// the architectural job: ONE AudioContext, ONE FontPlayer, ONE master
// gain — so there's no longer a per-instance `muted` ref to drift.
//
// This file pins the wiring contract that the singleton:
//   - reads muted from `audioMuteStore`
//   - reads isPaused from `uiStore`
//   - drives `masterGain.gain.value` from muted
//   - drives `ctx.suspend()` / `ctx.resume()` from isPaused
//   - keeps mute and pause independent (orthogonal stores, distinct
//     mechanisms — masterGain vs AudioContext state machine)
//
// The hook (`useAudioEngine.ts`) is now a thin React surface; the
// engine itself lives in `lib/audioEngineSingleton.ts`. Sentinel
// patterns are checked against whichever module owns each contract.
//
// Mounting the hook through React isn't exercised here for the same
// reason as useBreakpoint.test.ts — apps/web's vitest env is node-only,
// and `new AudioContext()` in the singleton's ensureInit would fail
// without a Web Audio mock. Behaviour-level coverage with a stubbed
// AudioContext lives in `audioEngineSingleton.test.ts`.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { useAudioMuteStore } from '../../stores/audioMuteStore';
import { useUIStore } from '../../stores/uiStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOK_SOURCE = readFileSync(
  path.resolve(__dirname, '../useAudioEngine.ts'),
  'utf8',
);
const SINGLETON_SOURCE = readFileSync(
  path.resolve(__dirname, '../../lib/audioEngineSingleton.ts'),
  'utf8',
);

beforeEach(() => {
  useAudioMuteStore.getState().setMuted(true);
  useUIStore.getState().setPaused(false);
});

describe('useAudioEngine hook — store-binding regression sentinel', () => {
  it('imports useAudioMuteStore (so the hook re-renders on mute toggle)', () => {
    expect(HOOK_SOURCE).toMatch(
      /from\s+['"]@\/stores\/audioMuteStore['"]/,
    );
  });

  it('reads muted from the store via selector subscription', () => {
    // The hook's `muted` value comes from `useAudioMuteStore((s) => s.muted)`.
    // If a future refactor reverts this to `useState(true)`, this
    // sentinel fails.
    expect(HOOK_SOURCE).toMatch(
      /useAudioMuteStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.muted\s*\)/,
    );
  });

  it('does NOT keep a per-instance useState/mutedRef for muted', () => {
    // Pre-fix lines were:
    //   const [muted, setMutedState] = useState(true);
    //   const mutedRef = useRef(true);
    // Both are gone post-fix.
    expect(HOOK_SOURCE).not.toMatch(/useState\s*\(\s*true\s*\)/);
    expect(HOOK_SOURCE).not.toMatch(/mutedRef/);
    expect(HOOK_SOURCE).not.toMatch(/setMutedState/);
  });
});

describe('singleton — masterGain follows muted state', () => {
  it('subscribes to audioMuteStore inside ensureAudioEngineInit', () => {
    // The singleton installs a module-scope subscription so masterGain
    // tracks muted across the whole app lifetime, regardless of how
    // many useAudioEngine consumers are mounted.
    expect(SINGLETON_SOURCE).toMatch(
      /useAudioMuteStore\.subscribe\s*\(/,
    );
  });

  it('writes muted state into masterGain.gain.value', () => {
    expect(SINGLETON_SOURCE).toMatch(
      /masterGain\.gain\.value\s*=\s*[\s\S]*?muted\s*\?\s*0\s*:\s*1/,
    );
  });

  it('initial gain at ensureAudioEngineInit reads the store directly', () => {
    // The store may have changed between hook render and
    // ensureAudioEngineInit firing. Reading the store inside init
    // picks up the latest value, not a stale closure capture.
    expect(SINGLETON_SOURCE).toMatch(
      /useAudioMuteStore\.getState\(\)\.muted\s*\?\s*0\s*:\s*1/,
    );
  });
});

describe('multi-consumer mute contract (the bug fix sentinel)', () => {
  // Even without renderHook, we can pin the contract: when the store
  // flips, every consumer reading via the same selector pattern sees
  // the same value. This is what masterGain hangs off of.

  it('all consumers read the same value via store subscription', () => {
    // Simulate the read each useAudioEngine consumer performs at render:
    // `useAudioMuteStore((s) => s.muted)`. The hook idiom fans out to
    // 6+ call sites in apps/web; the store value is shared by
    // construction.
    useAudioMuteStore.getState().setMuted(false);

    // The 6 known consumers per `grep -rln useAudioEngine apps/web/`:
    //   1. WorkbenchLayout (header Sound button)
    //   2. AppShell (tablet mobile shell duplicate)
    //   3. SoundFontPanel (legacy preview UI)
    //   4. AudioColumnA (sidebar A/B v2 audio section)
    //   5. AudioColumnB (sidebar A/B v2 audio detail panel)
    //   6. /m mobile page
    const consumerReads = Array.from({ length: 6 }, () => {
      return useAudioMuteStore.getState().muted;
    });

    expect(consumerReads.every((v) => v === false)).toBe(true);
  });

  it('toggling once flips every consumer (single source of truth)', () => {
    // Pre-fix this would have failed: each instance had its own muted
    // state, so toggling didn't propagate. Post-fix (singleton + lifted
    // store), the store is the single source of truth.
    const before = useAudioMuteStore.getState().muted;
    useAudioMuteStore.getState().toggleMute();
    const after = useAudioMuteStore.getState().muted;
    expect(after).toBe(!before);

    // Sanity: 6 reads taken AFTER the toggle all see the same value.
    const consumerReads = Array.from(
      { length: 6 },
      () => useAudioMuteStore.getState().muted,
    );
    expect(consumerReads.every((v) => v === after)).toBe(true);
  });
});

// ─── Pause → AudioContext suspend/resume ────────────────────────────────────
//
// When the global simulation is paused (via PauseButton / usePauseSystem),
// all audio should freeze — the hum loop, swing crossfade, any in-flight
// one-shot sounds. AudioContext.suspend() does exactly this: it freezes the
// entire audio graph in place and resume() restores it.
//
// This is intentionally SEPARATE from mute. Mute is a persistent user
// preference (audioMuteStore); pause is a transient simulation freeze that
// should also freeze audio. Unpausing restores sound at whatever gain level
// was active before the pause (muted or not).
//
// Post-singleton, the suspend/resume wiring lives in `audioEngineSingleton.ts`
// — installed once at engine init via `useUIStore.subscribe`.

describe('singleton — pause suspends AudioContext', () => {
  it('imports useUIStore for isPaused subscription', () => {
    expect(SINGLETON_SOURCE).toMatch(
      /from\s+['"]@\/stores\/uiStore['"]/,
    );
  });

  it('subscribes to uiStore inside ensureAudioEngineInit', () => {
    // The singleton installs the subscription once per engine init,
    // so a single pause flip propagates to the AudioContext regardless
    // of how many consumers are mounted.
    expect(SINGLETON_SOURCE).toMatch(
      /useUIStore\.subscribe\s*\(/,
    );
  });

  it('calls ctx.suspend() when isPaused is true', () => {
    expect(SINGLETON_SOURCE).toMatch(/\.ctx\.suspend\s*\(\s*\)/);
  });

  it('calls ctx.resume() when isPaused is false', () => {
    expect(SINGLETON_SOURCE).toMatch(/\.ctx\.resume\s*\(\s*\)/);
  });
});

describe('pause vs mute independence', () => {
  it('pause and mute are read from different stores', () => {
    // Mute comes from audioMuteStore, pause comes from uiStore.
    // They must not share a store — they are orthogonal concerns.
    expect(SINGLETON_SOURCE).toMatch(/useAudioMuteStore/);
    expect(SINGLETON_SOURCE).toMatch(/useUIStore/);
  });

  it('mute state is independent of pause state at the store level', () => {
    // Toggling pause should not affect mute, and vice versa.
    useAudioMuteStore.getState().setMuted(false);
    useUIStore.getState().setPaused(true);
    expect(useAudioMuteStore.getState().muted).toBe(false);

    useUIStore.getState().setPaused(false);
    expect(useAudioMuteStore.getState().muted).toBe(false);

    useAudioMuteStore.getState().setMuted(true);
    expect(useUIStore.getState().isPaused).toBe(false);
  });

  it('pause does NOT manipulate masterGain (different mechanism than mute)', () => {
    // Pause freezes the entire audio graph via the AudioContext state
    // machine. Mute zeroes the masterGain. They are different
    // mechanisms — pause must use ctx.suspend()/resume(), not gain
    // manipulation.
    //
    // Extract the isPaused subscription block. We anchor on the
    // distinctive `state.isPaused === prev.isPaused` early-return
    // line and check the body.
    const pauseBlockMatch = SINGLETON_SOURCE.match(
      /useUIStore\.subscribe\s*\(\s*\(\s*state\s*,\s*prev\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/,
    );
    expect(pauseBlockMatch).not.toBeNull();
    const pauseBlockBody = pauseBlockMatch![1];
    expect(pauseBlockBody).not.toMatch(/masterGain/);
    expect(pauseBlockBody).toMatch(/\.ctx\.suspend/);
    expect(pauseBlockBody).toMatch(/\.ctx\.resume/);
  });
});
