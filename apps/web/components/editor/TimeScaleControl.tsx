'use client';
import { useCallback, useState } from 'react';
import type { BladeEngine } from '@kyberstation/engine';

/** Ordered presets for cycling with [ and ] keys. */
export const TIME_SCALE_PRESETS = [0.25, 0.5, 1, 2] as const;
export type TimeScalePreset = (typeof TIME_SCALE_PRESETS)[number];

interface TimeScaleControlProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * TimeScaleControl — inline toolbar control for adjusting animation
 * playback speed (slow-motion / fast-forward).
 *
 * When timeScale is 1.0x, shows a compact speed icon button that
 * expands the preset buttons on click. When timeScale is not 1.0x,
 * shows a visible badge with the current speed.
 *
 * The time-scale state lives on the engine (not React state). We use
 * a local tick counter to force re-reads after user clicks — same
 * pattern as VariantCycler.
 */
export function TimeScaleControl({ engineRef }: TimeScaleControlProps) {
  // Tick counter to force re-render after clicks (source of truth is engine).
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const engine = engineRef.current;
  const currentScale = engine?.timeScale ?? 1;

  const setScale = useCallback(
    (value: number) => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.timeScale = value;
      setTick((t) => t + 1);
    },
    [engineRef],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isNonDefault = currentScale !== 1;

  // Expanded view: show all preset buttons
  if (expanded || isNonDefault) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="group"
        aria-label="Playback speed control"
      >
        {TIME_SCALE_PRESETS.map((preset) => {
          const isActive = Math.abs(currentScale - preset) < 0.01;
          return (
            <button
              key={preset}
              onClick={() => {
                setScale(preset);
                // Collapse when returning to 1x
                if (preset === 1) setExpanded(false);
              }}
              className={`px-1.5 py-0.5 rounded text-ui-xs transition-colors border ${
                isActive
                  ? 'text-accent bg-accent/15 border-accent-border'
                  : 'text-text-muted hover:text-accent hover:bg-accent/10 border-transparent hover:border-accent-border'
              }`}
              aria-label={`Set playback speed to ${preset}x`}
              aria-pressed={isActive}
              title={`${preset}x speed`}
            >
              {preset}&#xD7;
            </button>
          );
        })}
      </div>
    );
  }

  // Collapsed view at 1.0x: show a small speed icon that expands on click
  return (
    <button
      onClick={toggleExpanded}
      className="px-1.5 py-0.5 rounded text-ui-xs text-text-muted hover:text-accent hover:bg-accent/10 transition-colors border border-transparent hover:border-accent-border"
      aria-label="Open playback speed controls"
      title="Playback speed"
    >
      1&#xD7;
    </button>
  );
}
