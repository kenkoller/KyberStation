'use client';

import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface FPSCounterProps {
  /** Show or hide the counter entirely. Defaults to true. */
  visible?: boolean;
}

/**
 * FPSCounter
 *
 * Lightweight FPS meter for the header bar. Uses requestAnimationFrame to
 * count frames, but only setState every 500ms to avoid layout thrashing.
 *
 * Color coding:
 *   Green  — 50+ FPS (healthy)
 *   Yellow — 30–49 FPS (caution)
 *   Red    — below 30 FPS (degraded)
 *
 * When the global isPaused flag is true (from uiStore), the counter stops
 * accumulating frames and shows a pause glyph instead of a number.
 */
export function FPSCounter({ visible = true }: FPSCounterProps) {
  const isPaused = useUIStore((s) => s.isPaused);
  const [displayFPS, setDisplayFPS] = useState<number>(0);

  // Refs so the rAF loop never needs to re-subscribe to React state
  const frameCountRef = useRef(0);
  const lastFlushRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const isPausedRef = useRef(isPaused);

  // Keep the ref in sync with the store value without recreating the loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!visible) return;

    function loop(timestamp: number) {
      // First frame — seed the flush timer
      if (lastFlushRef.current === 0) {
        lastFlushRef.current = timestamp;
      }

      if (!isPausedRef.current) {
        frameCountRef.current += 1;
      }

      const elapsed = timestamp - lastFlushRef.current;

      if (elapsed >= 500) {
        if (!isPausedRef.current) {
          // frames ÷ seconds = fps
          const fps = Math.round((frameCountRef.current / elapsed) * 1000);
          setDisplayFPS(fps);
        }
        frameCountRef.current = 0;
        lastFlushRef.current = timestamp;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      // Reset so the next mount gets a clean start
      frameCountRef.current = 0;
      lastFlushRef.current = 0;
    };
  }, [visible]);

  if (!visible) return null;

  // Paused state: show glyph, suppress the number
  if (isPaused) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg-surface/40 font-mono text-ui-xs text-text-muted tabular-nums select-none"
        aria-label="Animation paused"
        title="Animation paused"
      >
        ⏸
      </span>
    );
  }

  // Bind to theme status tokens so colourblind / high-contrast overrides
  // take effect automatically. See --status-ok/warn/error in globals.css.
  const statusColor =
    displayFPS >= 50
      ? 'rgb(var(--status-ok))'
      : displayFPS >= 30
        ? 'rgb(var(--status-warn))'
        : 'rgb(var(--status-error))';

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg-surface/40 font-mono text-ui-xs tabular-nums select-none"
      style={{ color: statusColor }}
      aria-label={`${displayFPS} frames per second`}
      title="Canvas render FPS"
    >
      {displayFPS}&thinsp;FPS
    </span>
  );
}
