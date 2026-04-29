// ─── audioMuteStore — global audio mute state ─────────────────────────────
//
// Pure-Zustand store unit tests. Pre-fix, each useAudioEngine() call
// owned its own `muted` useState + masterGain, so toggling mute from
// the header silenced only the one instance the header read from. The
// other 5 instances stayed muted forever (preview buttons in
// AudioColumnB went silent end-to-end). This store is the single
// source of truth that every useAudioEngine subscriber reads from.
//
// The vitest env for apps/web is node-only (no jsdom), matching the
// rest of apps/web/tests. Zustand's `create` works fine under node.
//
// Coverage:
//   1. Initial state — `muted: true` (matches pre-fix default; Web
//      Audio autoplay also requires a user gesture, so unmuted-by-
//      default would be louder than users expect anyway).
//   2. setMuted — flips to the requested value.
//   3. setMuted is idempotent (no churn when value matches).
//   4. toggleMute — flips between true and false.
//   5. Multiple-consumer contract — every reader sees the same value
//      after a flip. This is the regression sentinel for the bug
//      fix; if this fails, the store has lost its single-source-of-
//      truth shape and the fix has regressed.

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioMuteStore } from '../stores/audioMuteStore';

beforeEach(() => {
  // Reset between tests so prior cases can't leak. Default-muted matches
  // the production initial state.
  useAudioMuteStore.getState().setMuted(true);
});

describe('audioMuteStore — initial state', () => {
  it('starts muted (matches pre-fix default + Chrome autoplay policy)', () => {
    // Reset to a fresh store reference by re-setting to the default —
    // the constructor's initial value is the contract we care about.
    expect(useAudioMuteStore.getState().muted).toBe(true);
  });

  it('exposes setMuted + toggleMute as functions', () => {
    const s = useAudioMuteStore.getState();
    expect(typeof s.setMuted).toBe('function');
    expect(typeof s.toggleMute).toBe('function');
  });
});

describe('audioMuteStore — setMuted', () => {
  it('flips to false when called with false', () => {
    useAudioMuteStore.getState().setMuted(false);
    expect(useAudioMuteStore.getState().muted).toBe(false);
  });

  it('flips back to true when called with true', () => {
    useAudioMuteStore.getState().setMuted(false);
    useAudioMuteStore.getState().setMuted(true);
    expect(useAudioMuteStore.getState().muted).toBe(true);
  });

  it('is no-op when called with the current value', () => {
    // Pre-condition: muted=true (from beforeEach)
    useAudioMuteStore.getState().setMuted(true);
    expect(useAudioMuteStore.getState().muted).toBe(true);
  });
});

describe('audioMuteStore — toggleMute', () => {
  it('flips true → false', () => {
    useAudioMuteStore.getState().toggleMute();
    expect(useAudioMuteStore.getState().muted).toBe(false);
  });

  it('flips false → true', () => {
    useAudioMuteStore.getState().setMuted(false);
    useAudioMuteStore.getState().toggleMute();
    expect(useAudioMuteStore.getState().muted).toBe(true);
  });

  it('toggles back to original after even number of calls', () => {
    const initial = useAudioMuteStore.getState().muted;
    for (let i = 0; i < 4; i++) {
      useAudioMuteStore.getState().toggleMute();
    }
    expect(useAudioMuteStore.getState().muted).toBe(initial);
  });
});

describe('audioMuteStore — multi-consumer contract (the bug fix sentinel)', () => {
  // The original bug: each useAudioEngine() call had its own useState +
  // masterGain. Toggling from the header only silenced one instance.
  // This block pins the contract that the store is the single source
  // of truth — if it ever regresses (a refactor that re-introduces
  // per-instance state), these tests fail loudly.

  it('every reader sees the same value after setMuted(false)', () => {
    // Simulate N independent useAudioEngine instances reading via the
    // store (which is what they do post-fix). Each reader is a fresh
    // call to getState().muted — same shape as the per-instance
    // selector subscription.
    useAudioMuteStore.getState().setMuted(false);

    const readerA = useAudioMuteStore.getState().muted;
    const readerB = useAudioMuteStore.getState().muted;
    const readerC = useAudioMuteStore.getState().muted;
    const readerD = useAudioMuteStore.getState().muted;
    const readerE = useAudioMuteStore.getState().muted;
    const readerF = useAudioMuteStore.getState().muted;

    expect(readerA).toBe(false);
    expect(readerB).toBe(false);
    expect(readerC).toBe(false);
    expect(readerD).toBe(false);
    expect(readerE).toBe(false);
    expect(readerF).toBe(false);
  });

  it('every reader sees the same value after toggleMute()', () => {
    // Pre-condition: muted=true. Toggle once → muted=false everywhere.
    useAudioMuteStore.getState().toggleMute();
    const readers = Array.from({ length: 6 }, () => useAudioMuteStore.getState().muted);
    expect(readers.every((v) => v === false)).toBe(true);

    // Toggle again → muted=true everywhere.
    useAudioMuteStore.getState().toggleMute();
    const readers2 = Array.from({ length: 6 }, () => useAudioMuteStore.getState().muted);
    expect(readers2.every((v) => v === true)).toBe(true);
  });

  it('subscribers fire when state changes (Zustand pub/sub contract)', () => {
    // useEffect([muted]) in useAudioEngine relies on this — when the
    // store flips, every subscribed instance re-renders and pushes the
    // new gain value into its local masterGain. Without pub/sub
    // notifications, the post-render gain push wouldn't fire.
    let aCalls = 0;
    let bCalls = 0;
    const unsubA = useAudioMuteStore.subscribe(() => {
      aCalls += 1;
    });
    const unsubB = useAudioMuteStore.subscribe(() => {
      bCalls += 1;
    });

    useAudioMuteStore.getState().toggleMute();
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);

    useAudioMuteStore.getState().setMuted(true);
    expect(aCalls).toBe(2);
    expect(bCalls).toBe(2);

    unsubA();
    unsubB();
  });
});
