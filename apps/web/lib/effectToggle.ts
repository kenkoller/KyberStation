import {
  EFFECT_SHORTCUTS_BY_CODE,
  SUSTAINED_EFFECT_IDS,
} from '@/lib/keyboardShortcuts';
import { useActiveEffectsStore } from '@/stores/activeEffectsStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

/**
 * Shared toggle logic for effect triggering.
 *
 * Used by both the keyboard shortcut handler (useKeyboardShortcuts) and
 * the action-bar chip onClick handlers so both paths honor:
 *   - `activeEffectsStore` state (drives the visible "held" state on
 *     sustained chips)
 *   - `accessibilityStore.effectAutoRelease` setting (demo-mode timeout)
 *   - `SUSTAINED_EFFECT_IDS` classification (one-shot vs held behavior)
 *
 * Sustained effects toggle: trigger if inactive, release if active.
 * One-shot effects just trigger and decay naturally in the engine.
 *
 * The timer registry is module-level so a re-trigger from EITHER the
 * keyboard or the chip clears the previous timer — rapid presses from
 * mixed sources can't leave a stale release scheduled.
 */

const autoReleaseTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Clear every pending auto-release timer. Call on engine reset, tab
 * close, or whenever activeEffectsStore is cleared externally.
 */
export function clearAutoReleaseTimers(): void {
  for (const id of autoReleaseTimers.values()) clearTimeout(id);
  autoReleaseTimers.clear();
}

export interface EffectHandlers {
  triggerEffect: (type: string) => void;
  releaseEffect: (type: string) => void;
}

/**
 * Trigger (or toggle-release) an effect with shared-store bookkeeping.
 * Safe to call from anywhere — keyboard, click, timeline, palette.
 */
export function toggleOrTriggerEffect(
  effectType: string,
  handlers: EffectHandlers,
): void {
  // One-shots: just fire. They decay naturally, don't track state.
  if (!SUSTAINED_EFFECT_IDS.has(effectType)) {
    handlers.triggerEffect(effectType);
    return;
  }

  const store = useActiveEffectsStore.getState();

  // Always clear any existing timer — a new press resets the schedule,
  // whether we're about to trigger or release.
  const existing = autoReleaseTimers.get(effectType);
  if (existing) {
    clearTimeout(existing);
    autoReleaseTimers.delete(effectType);
  }

  if (store.active.has(effectType)) {
    // Currently held → release.
    store.setActive(effectType, false);
    handlers.releaseEffect(effectType);
    return;
  }

  // Not held → trigger + optionally schedule an auto-release.
  store.setActive(effectType, true);
  handlers.triggerEffect(effectType);

  const { enabled, seconds } = useAccessibilityStore.getState().effectAutoRelease;
  if (!enabled) return;

  const timer = setTimeout(() => {
    const latest = useActiveEffectsStore.getState();
    if (latest.active.has(effectType)) {
      latest.setActive(effectType, false);
      handlers.releaseEffect(effectType);
    }
    autoReleaseTimers.delete(effectType);
  }, seconds * 1000);
  autoReleaseTimers.set(effectType, timer);
}

// Re-export for convenience at call sites — avoids an extra import.
export { SUSTAINED_EFFECT_IDS, EFFECT_SHORTCUTS_BY_CODE };
