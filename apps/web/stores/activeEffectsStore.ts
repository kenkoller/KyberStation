'use client';
import { create } from 'zustand';

/**
 * Tracks which *sustained* effects (Lockup, Drag, Melt, Lightning, Force)
 * are currently held. Pure runtime state — not persisted.
 *
 * Two writers:
 *   1. `useKeyboardShortcuts` — toggles on keydown of the effect's hotkey
 *      for any effect in `SUSTAINED_EFFECT_IDS`.
 *   2. WorkbenchLayout's action-bar chips — click a sustained chip to
 *      toggle (parity with the keyboard behavior).
 *
 * One reader:
 *   - The action-bar chips subscribe via `isActiveSelector(effect)` to
 *     show a visible "held" state (accent glow + pulse).
 *
 * One-shot effects (Clash, Blast, Stab, Shockwave, etc.) are not
 * tracked here — they decay naturally via the engine and don't need
 * visible active state.
 */
interface ActiveEffectsState {
  /** IDs of sustained effects currently held. Using a Set for O(1) membership. */
  active: Set<string>;
  /** Idempotent setter — pass true to add, false to remove. */
  setActive: (effect: string, value: boolean) => void;
  /** Clear all — used when the tab closes or the engine resets. */
  clear: () => void;
}

export const useActiveEffectsStore = create<ActiveEffectsState>((set) => ({
  active: new Set(),
  setActive: (effect, value) =>
    set((state) => {
      // Skip the update if nothing changes — avoids churning the Set
      // reference and re-rendering every chip subscriber.
      if (value === state.active.has(effect)) return state;
      const next = new Set(state.active);
      if (value) next.add(effect);
      else next.delete(effect);
      return { active: next };
    }),
  clear: () =>
    set((state) => (state.active.size === 0 ? state : { active: new Set() })),
}));

/** Selector: does this effect have visible "held" state right now? */
export const isActiveSelector = (effect: string) => (state: ActiveEffectsState) =>
  state.active.has(effect);
