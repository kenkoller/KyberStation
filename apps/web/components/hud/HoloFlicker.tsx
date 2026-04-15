'use client';

import type { ReactNode } from 'react';

interface HoloFlickerProps {
  intensity?: number;
  frequency?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Wrapper that adds occasional holographic flicker to its children.
 * Uses `hud-holo-flicker` keyframe from globals.css.
 *
 * `intensity` (0-1) is not used for the CSS keyframe (which has fixed dip
 * values), but it scales the overall cycle duration: higher intensity = more
 * frequent flickers.  `frequency` sets flickers per 10 seconds.
 */
export function HoloFlicker({
  intensity: _intensity = 0.3,
  frequency = 2,
  className = '',
  children,
}: HoloFlickerProps) {
  // Cycle duration: 10s / frequency so more frequency = shorter cycles
  const cycleDuration = 10 / Math.max(frequency, 0.1);

  return (
    <div
      className={`hud-holo-flicker ${className}`}
      style={{
        animation: `hud-holo-flicker ${cycleDuration}s linear infinite`,
      }}
    >
      {children}
    </div>
  );
}
