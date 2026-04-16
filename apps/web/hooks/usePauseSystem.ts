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

  // Keyboard shortcut: Space bar when no input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      // Don't hijack space in inputs, textareas, selects, or contenteditable
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      togglePause();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  return { isPaused, togglePause, setPaused };
}
