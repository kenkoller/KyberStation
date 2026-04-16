'use client';

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';

/**
 * PauseButton
 *
 * Header bar control that toggles the global animation pause.
 * When paused, the `app-paused` class is applied to <html> via
 * usePauseSystem (called in AppShell), freezing every CSS animation
 * and transition app-wide.
 *
 * Render this inside the header's right-hand button group.
 */
export function PauseButton() {
  const isPaused = useUIStore((s) => s.isPaused);
  const togglePause = useUIStore((s) => s.togglePause);

  const handleToggle = useCallback(() => {
    playUISound(isPaused ? 'toggle-off' : 'toggle-on');
    togglePause();
  }, [isPaused, togglePause]);

  return (
    <button
      onClick={handleToggle}
      aria-label={isPaused ? 'Resume animations' : 'Pause all animations'}
      aria-pressed={isPaused}
      title={isPaused ? 'Resume animations' : 'Pause all animations'}
      className={[
        // Base shape + typography — matches existing header button style
        'px-2 py-1 rounded text-ui-xs font-medium border transition-colors',
        // Active (paused) state: accent highlight so it's clearly engaged
        isPaused
          ? 'border-accent-border/60 text-accent bg-accent-dim/40'
          : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
      ].join(' ')}
    >
      {/* Unicode symbols: ⏸ pause / ▶ play — universally supported */}
      <span aria-hidden="true" className="mr-1">
        {isPaused ? '\u25B6' : '\u23F8'}
      </span>
      {isPaused ? 'Paused' : 'Pause'}
    </button>
  );
}
