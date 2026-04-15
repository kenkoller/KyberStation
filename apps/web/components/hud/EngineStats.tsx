'use client';

import { ConsoleIndicator } from './ConsoleIndicator';

interface EngineStatsProps {
  fps: number;          // Current frames per second
  engineTickMs: number; // Engine tick time in milliseconds
  ledCount: number;     // Active LED count
  className?: string;
}

function getFpsColor(fps: number): string {
  if (fps > 55) return '#22c55e';
  if (fps > 30) return '#eab308';
  return '#ef4444';
}

function getFpsVariant(fps: number): 'breathe' | 'blink' | 'alert' {
  if (fps > 55) return 'breathe';
  if (fps > 30) return 'blink';
  return 'alert';
}

const monoStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  lineHeight: 1.6,
} as const;

/**
 * Minimal FPS and engine performance readout.
 * Displays frame rate, engine tick time, and LED count
 * in a compact dot-matrix block with color-coded FPS status.
 */
export function EngineStats({
  fps,
  engineTickMs,
  ledCount,
  className = '',
}: EngineStatsProps) {
  const fpsColor = getFpsColor(fps);
  const variant = getFpsVariant(fps);

  return (
    <div
      className={`corner-angular pointer-events-auto ${className}`}
      style={{
        border: '1px solid rgba(var(--accent), 0.15)',
        borderRadius: 2,
        padding: '6px 8px',
      }}
      role="group"
      aria-label="Engine statistics"
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5"
        style={{ marginBottom: 4 }}
      >
        <ConsoleIndicator
          variant={variant}
          color={fpsColor}
          size={4}
        />
        <span
          className="dot-matrix"
          style={{
            fontSize: 8,
            color: 'rgb(var(--text-muted))',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Engine
        </span>
      </div>

      {/* Stat rows */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            style={{
              ...monoStyle,
              color: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
            }}
          >
            FPS
          </span>
          <span
            style={{
              ...monoStyle,
              color: fpsColor,
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`${Math.round(fps)} frames per second`}
          >
            {Math.round(fps)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            style={{
              ...monoStyle,
              color: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
            }}
          >
            TICK
          </span>
          <span
            style={{
              ...monoStyle,
              color: 'rgb(var(--text-secondary, var(--text-primary)))',
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`Engine tick ${engineTickMs} milliseconds`}
          >
            {engineTickMs}ms
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            style={{
              ...monoStyle,
              color: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
            }}
          >
            LEDS
          </span>
          <span
            style={{
              ...monoStyle,
              color: 'rgb(var(--text-secondary, var(--text-primary)))',
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`${ledCount} active LEDs`}
          >
            {ledCount}
          </span>
        </div>
      </div>
    </div>
  );
}
