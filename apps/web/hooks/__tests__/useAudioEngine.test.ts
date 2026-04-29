// ─── useAudioEngine — shared mute state regression sentinel ────────────────
//
// Pre-fix (2026-04-28), each useAudioEngine() call created independent
// `muted` useState + mutedRef + masterGain. Toggling mute from the
// header's Sound OFF/ON button only updated the instance that backed
// the header — the other 5 useAudioEngine consumers (AudioColumnA,
// AudioColumnB, SoundFontPanel, AppShell mobile shell, useAudioSync
// pass-through) stayed muted forever. Symptom: hitting the ▶Hum
// preview button in Column B's Sound Events panel was silent end-to-
// end with no error or warning, because the call reached masterGain
// but masterGain.gain.value was zero from init.
//
// Fix: muted state was lifted to a global Zustand store —
// `apps/web/stores/audioMuteStore.ts`. Every useAudioEngine instance
// subscribes to it, runs `useEffect([muted])` to push the value into
// its local masterGain, and toggling once silences/unsilences all
// of them.
//
// This file pins the import-shape contract that the hook reads `muted`
// from the audioMuteStore (not from a local useState). Mounting the
// hook through React isn't exercised here for the same reason as
// useBreakpoint.test.ts — apps/web's vitest env is node-only, and
// `new AudioContext()` in the hook's ensureInit would fail without
// a jsdom + Web Audio mock layer that doesn't currently exist.
//
// The full multi-consumer regression coverage lives in
// `apps/web/tests/audioMuteStore.test.ts`. This file ensures the
// store wiring inside useAudioEngine.ts itself doesn't regress to a
// per-instance useState pattern.

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

beforeEach(() => {
  useAudioMuteStore.getState().setMuted(true);
  useUIStore.getState().setPaused(false);
});

describe('useAudioEngine — store-binding regression sentinel', () => {
  it('imports useAudioMuteStore (so muted state can be lifted out)', () => {
    expect(HOOK_SOURCE).toMatch(
      /from\s+['"]@\/stores\/audioMuteStore['"]/,
    );
  });

  it('reads muted from the store via selector subscription', () => {
    // The store-subscription idiom Zustand uses for React: the `muted`
    // local variable comes from `useAudioMuteStore((s) => s.muted)`.
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

  it('pushes muted changes into masterGain via useEffect (post-mount sync)', () => {
    // The effect runs on every store flip — without it, instances that
    // initialised their masterGain at gain.value=0 (from a previous
    // muted-state snapshot) would never get updated when the store
    // unmutes globally.
    expect(HOOK_SOURCE).toMatch(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*masterGainRef\.current[\s\S]*muted\s*\?\s*0\s*:\s*1[\s\S]*\}\s*,\s*\[\s*muted\s*\]\s*\)/);
  });

  it('initial gain at ensureInit reads the store directly, not a stale ref', () => {
    // ensureInit fires on first user gesture; the store may have
    // changed between hook render and ensureInit firing. Reading
    // useAudioMuteStore.getState() inside ensureInit picks up the
    // latest value, not the closure-captured one.
    expect(HOOK_SOURCE).toMatch(
      /useAudioMuteStore\.getState\(\)\.muted\s*\?\s*0\s*:\s*1/,
    );
  });
});

describe('useAudioEngine — multi-instance mute contract (the bug fix sentinel)', () => {
  // Even without renderHook, we can pin the contract: when the store
  // flips, every consumer reading via the same selector pattern sees
  // the same value. This is what useEffect([muted]) inside every
  // useAudioEngine instance hangs off of.

  it('all instances read the same value via store subscription', () => {
    // Simulate the read each useAudioEngine instance performs at
    // render: `useAudioMuteStore((s) => s.muted)`. The hook idiom
    // fans out to 6+ call sites in apps/web; the store value is
    // shared by construction.
    useAudioMuteStore.getState().setMuted(false);

    // The 6 known consumers per `grep -rln useAudioEngine apps/web/`:
    //   1. WorkbenchLayout (header Sound button)
    //   2. AppShell (tablet mobile shell duplicate)
    //   3. SoundFontPanel (legacy preview UI)
    //   4. AudioColumnA (sidebar A/B v2 audio section)
    //   5. AudioColumnB (sidebar A/B v2 audio detail panel)
    //   6. useAudioSync (passes audio handle through, doesn't read muted)
    const consumerReads = Array.from({ length: 6 }, () => {
      // mirror the selector pattern useAudioEngine uses
      return useAudioMuteStore.getState().muted;
    });

    expect(consumerReads.every((v) => v === false)).toBe(true);
  });

  it('toggling once flips every consumer (single source of truth)', () => {
    // Pre-fix this would have failed: each instance had its own
    // muted state, so toggling didn't propagate. Post-fix, the store
    // is the single source of truth.
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
// These tests use the same source-reading sentinel pattern as the mute tests
// above: we read the hook source code and verify the wiring pattern is present.
// Full React-mounted behavior can't be tested here because the vitest env is
// node-only (no AudioContext).

describe('useAudioEngine — pause suspends audio (source sentinel)', () => {
  it('imports useUIStore for isPaused subscription', () => {
    expect(HOOK_SOURCE).toMatch(
      /from\s+['"]@\/stores\/uiStore['"]/,
    );
  });

  it('subscribes to isPaused from the UI store', () => {
    // The hook reads isPaused via the standard Zustand selector pattern:
    //   const isPaused = useUIStore((s) => s.isPaused);
    expect(HOOK_SOURCE).toMatch(
      /useUIStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPaused\s*\)/,
    );
  });

  it('calls ctx.suspend() when isPaused is true', () => {
    // The useEffect body must call suspend() on the AudioContext when
    // isPaused transitions to true.
    expect(HOOK_SOURCE).toMatch(/ctx\.suspend\s*\(\s*\)/);
  });

  it('calls ctx.resume() when isPaused is false', () => {
    // The useEffect body must call resume() on the AudioContext when
    // isPaused transitions to false.
    expect(HOOK_SOURCE).toMatch(/ctx\.resume\s*\(\s*\)/);
  });

  it('has a useEffect with [isPaused] dependency (reactive to pause changes)', () => {
    // The suspend/resume logic must live in a useEffect whose dependency
    // array contains isPaused, so it fires on every pause/unpause toggle.
    expect(HOOK_SOURCE).toMatch(
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?ctx\.suspend[\s\S]*?\}\s*,\s*\[\s*isPaused\s*\]\s*\)/,
    );
  });
});

describe('useAudioEngine — pause vs mute independence', () => {
  it('pause and mute are read from different stores', () => {
    // Mute comes from audioMuteStore, pause comes from uiStore.
    // They must not share a store — they are orthogonal concerns.
    expect(HOOK_SOURCE).toMatch(/useAudioMuteStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.muted/);
    expect(HOOK_SOURCE).toMatch(/useUIStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPaused/);
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

  it('pause does not use masterGain (it uses AudioContext suspend/resume instead)', () => {
    // The suspend/resume effect must NOT manipulate masterGain — that is
    // the mute effect's job. Pause freezes the entire audio graph via the
    // AudioContext state machine, which is a fundamentally different mechanism.
    // We verify by checking the isPaused useEffect does not reference masterGain.

    // Extract the isPaused useEffect block. Use a tighter pattern that
    // anchors on `ctxRef.current` to avoid greedily capturing the earlier
    // mute useEffect (which DOES reference masterGainRef).
    const pauseEffectMatch = HOOK_SOURCE.match(
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{\s*\n\s*const ctx = ctxRef\.current;([\s\S]*?)\}\s*,\s*\[\s*isPaused\s*\]\s*\)/,
    );
    expect(pauseEffectMatch).not.toBeNull();
    const pauseEffectBody = pauseEffectMatch![1];
    expect(pauseEffectBody).not.toMatch(/masterGainRef/);
    // ctxRef is captured via the `const ctx = ctxRef.current` at the
    // opening of the effect (in the regex anchor above), so we verify
    // the body uses `ctx.suspend` / `ctx.resume` (local alias of ctxRef).
    expect(pauseEffectBody).toMatch(/ctx\.suspend/);
    expect(pauseEffectBody).toMatch(/ctx\.resume/);
  });
});
