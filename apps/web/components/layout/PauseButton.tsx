'use client';

import { useCallback, type MouseEvent } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';

const TIME_SCALE_LABELS: Record<number, string> = {
  1: '1×',
  0.5: '½×',
  0.25: '¼×',
};

export function PauseButton() {
  const isPaused = useUIStore((s) => s.isPaused);
  const pauseScope = useUIStore((s) => s.pauseScope);
  const timeScale = useUIStore((s) => s.timeScale);
  const togglePause = useUIStore((s) => s.togglePause);
  const cycleTimeScale = useUIStore((s) => s.cycleTimeScale);

  const handleToggle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const scope: 'full' | 'partial' = e.shiftKey ? 'partial' : 'full';
      playUISound(isPaused ? 'toggle-off' : 'toggle-on');
      togglePause(scope);
    },
    [isPaused, togglePause],
  );

  const handleSpeedClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      cycleTimeScale();
    },
    [cycleTimeScale],
  );

  const activeLabel = isPaused
    ? pauseScope === 'partial'
      ? 'Paused (blade live)'
      : 'Paused'
    : 'Pause';
  const titleText = isPaused
    ? 'Resume animations'
    : 'Pause all animations (shift-click: keep blade alive)';

  const speedLabel = TIME_SCALE_LABELS[timeScale] ?? `${timeScale}×`;
  const isSlowed = timeScale < 1;

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        onClick={handleToggle}
        aria-label={isPaused ? 'Resume animations' : 'Pause all animations'}
        aria-pressed={isPaused}
        title={titleText}
        className={[
          'px-2 py-1 rounded-l text-ui-xs font-medium border transition-colors',
          'touch-target',
          isPaused
            ? pauseScope === 'partial'
              ? 'border-accent-border/60 text-accent bg-accent-dim/25'
              : 'border-accent-border/60 text-accent bg-accent-dim/40'
            : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
        ].join(' ')}
      >
        <span aria-hidden="true" className="mr-1">
          {isPaused ? '▶' : '⏸'}
        </span>
        {activeLabel}
      </button>
      <button
        onClick={handleSpeedClick}
        aria-label={`Playback speed: ${speedLabel}. Click to cycle.`}
        title="Cycle playback speed: 1× → ½× → ¼×"
        className={[
          'px-1.5 py-1 rounded-r text-ui-xs font-mono font-medium border border-l-0 transition-colors',
          'touch-target',
          isSlowed
            ? 'border-accent-border/60 text-accent bg-accent-dim/30'
            : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
        ].join(' ')}
      >
        {speedLabel}
      </button>
    </span>
  );
}
