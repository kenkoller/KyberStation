'use client';

import { useCallback, type MouseEvent } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';

/**
 * PauseButton — global pause affordance.
 *
 * W5 (2026-04-22): unified pause model.
 *   - Click: `togglePause('full')` — freezes EVERYTHING: blade engine
 *     ticks, every RAF that honors `{ enabled: !isPaused }`, and CSS
 *     motion via usePauseSystem. The user can inspect a single frame.
 *   - Shift+click: `togglePause('partial')` — freezes everything
 *     EXCEPT the realistic blade canvas (it continues rendering with
 *     the engine still ticking). The pixel strip, expanded slot,
 *     analysis rail waveforms, and CSS motion all freeze. Useful
 *     for staging a "moment" while the saber stays alive.
 *
 * The button's active state shows which scope is engaged.
 */
export function PauseButton() {
  const isPaused = useUIStore((s) => s.isPaused);
  const pauseScope = useUIStore((s) => s.pauseScope);
  const togglePause = useUIStore((s) => s.togglePause);

  const handleToggle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const scope: 'full' | 'partial' = e.shiftKey ? 'partial' : 'full';
      playUISound(isPaused ? 'toggle-off' : 'toggle-on');
      togglePause(scope);
    },
    [isPaused, togglePause],
  );

  const activeLabel = isPaused
    ? pauseScope === 'partial'
      ? 'Paused (blade live)'
      : 'Paused'
    : 'Pause';
  const titleText = isPaused
    ? 'Resume animations'
    : 'Pause all animations (shift-click: keep blade alive)';

  return (
    <button
      onClick={handleToggle}
      aria-label={isPaused ? 'Resume animations' : 'Pause all animations'}
      aria-pressed={isPaused}
      title={titleText}
      className={[
        'px-2 py-1 rounded text-ui-xs font-medium border transition-colors',
        'touch-target',
        isPaused
          ? pauseScope === 'partial'
            ? 'border-accent-border/60 text-accent bg-accent-dim/25'
            : 'border-accent-border/60 text-accent bg-accent-dim/40'
          : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
      ].join(' ')}
    >
      <span aria-hidden="true" className="mr-1">
        {isPaused ? '\u25B6' : '\u23F8'}
      </span>
      {activeLabel}
    </button>
  );
}
