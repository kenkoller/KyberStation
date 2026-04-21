'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

/**
 * usePauseSystem
 *
 * Syncs the global `isPaused` store state to a CSS class on
 * `document.documentElement` (`<html>`). When paused, the class
 * `app-paused` is added, which CSS uses to freeze every animation
 * and transition across the entire app.
 *
 * Usage: call once at the app shell root — it has no render output.
 *
 *   const { isPaused, togglePause } = usePauseSystem();
 *
 * The CSS rule in globals.css handles the visual effect:
 *   html.app-paused * { animation-play-state: paused !important;
 *                        transition: none !important; }
 */
export function usePauseSystem() {
  const isPaused = useUIStore((s) => s.isPaused);
  const togglePause = useUIStore((s) => s.togglePause);
  const setPaused = useUIStore((s) => s.setPaused);

  useEffect(() => {
    const root = document.documentElement;
    if (isPaused) {
      root.classList.add('app-paused');
    } else {
      root.classList.remove('app-paused');
    }
  }, [isPaused]);

  // NOTE: the former `Space` → togglePause keyboard binding was removed
  // on 2026-04-20 because it collided with the primary ignite/retract
  // shortcut in `useKeyboardShortcuts.ts`. usePauseSystem is registered
  // earlier in WorkbenchLayout's hook order than useKeyboardShortcuts,
  // so its Space listener fired first + preventDefault'd, and ignite
  // never ran. Users pause via the header PauseButton; a dedicated
  // non-Space hotkey can be re-added later if demand surfaces.

  return { isPaused, togglePause, setPaused };
}
