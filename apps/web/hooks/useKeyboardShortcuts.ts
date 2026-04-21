'use client';
import { useEffect, useRef } from 'react';
import {
  EFFECT_SHORTCUTS_BY_CODE,
  SUSTAINED_EFFECT_IDS,
} from '@/lib/keyboardShortcuts';
import { useUIStore, type ActiveTab } from '@/stores/uiStore';

/**
 * `⌘1` … `⌘5` / `Ctrl+1` … `Ctrl+5` — switch tabs in canonical order.
 * This mapping must mirror the `TAB_CANONICAL_KBD` hints rendered in
 * `WorkbenchLayout.tsx` so the visible kbd chip matches what the key
 * actually does. Changing one side without the other is a UX regression.
 */
const TAB_BY_DIGIT: Record<string, ActiveTab> = {
  '1': 'design',
  '2': 'dynamics',
  '3': 'audio',
  '4': 'gallery',
  '5': 'output',
};

export interface KeyboardShortcutHandlers {
  toggle: () => void;
  triggerEffect: (type: string) => void;
  releaseEffect?: (type: string) => void;
  /**
   * Optional — fired when the user presses `?` (Shift+/) or `F1`. Used by
   * the editor shell to open the keyboard-shortcut help overlay. When
   * omitted, both keys are left untouched so the browser / other
   * listeners can react normally.
   */
  openHelp?: () => void;
}

/** Returns true when the event target is a text-input surface; skip
 *  shortcut dispatch in that case so typing isn't hijacked. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  // Track which sustained effects are currently active via keyboard
  const activeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input / textarea / contenteditable
      if (isTypingTarget(e.target)) return;

      // ── ⌘1–⌘5 / Ctrl+1–Ctrl+5 — switch tabs in canonical order ──
      // Handled BEFORE the effect-shortcut branch's unmodified-key guard
      // so the modifier is consumed here and never reaches the plain-key
      // dispatch below. `⌘K` is owned by `useCommandPalette` separately.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const tab = TAB_BY_DIGIT[e.key];
        if (tab) {
          e.preventDefault();
          useUIStore.getState().setActiveTab(tab);
          return;
        }
      }

      // ── Help overlay (?  or F1) ──
      // `?` is Shift+/. We detect via `e.key === '?'` rather than `code`
      // because the physical key varies across keyboard layouts (US vs
      // non-US). F1 has a stable code on every layout.
      if (handlers.openHelp && (e.key === '?' || e.key === 'F1')) {
        e.preventDefault();
        handlers.openHelp();
        return;
      }

      // ── Space: ignite / retract ──
      if (e.code === 'Space') {
        e.preventDefault();
        handlers.toggle();
        return;
      }

      // ── Effect triggers ──
      const shortcut = EFFECT_SHORTCUTS_BY_CODE.get(e.code);
      if (!shortcut) return;

      // Ignore modified keystrokes so Cmd+R (reload) etc. still work.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const effectType = shortcut.effect;

      if (SUSTAINED_EFFECT_IDS.has(effectType)) {
        // Toggle: if active → release, if inactive → trigger
        if (activeRef.current.has(effectType)) {
          activeRef.current.delete(effectType);
          handlers.releaseEffect?.(effectType);
        } else {
          activeRef.current.add(effectType);
          handlers.triggerEffect(effectType);
        }
      } else {
        // One-shot: just trigger
        handlers.triggerEffect(effectType);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
