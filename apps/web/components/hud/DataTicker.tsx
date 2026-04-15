'use client';

import { useMemo } from 'react';

interface DataTickerProps {
  data?: string[];
  speed?: number;
  className?: string;
}

function generateDefaultData(): string[] {
  const items: string[] = [];
  for (let i = 0; i < 24; i++) {
    const hex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
    items.push(`0x${hex}`);
  }
  return items;
}

/**
 * Horizontal scrolling data feed bar with hex-like values.
 * Uses `hud-ticker-scroll` keyframe from globals.css.
 */
export function DataTicker({
  data,
  speed = 20,
  className = '',
}: DataTickerProps) {
  const items = useMemo(() => data ?? generateDefaultData(), [data]);
  const joined = items.join(' \u2502 ');
  // Double the content for seamless loop
  const doubled = `${joined} \u2502 ${joined}`;

  return (
    <div
      className={`pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="hud-data-ticker"
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 7,
          letterSpacing: '0.05em',
          color: 'rgba(var(--accent), 0.15)',
          opacity: 'var(--ambient-intensity, 1)',
          animation: `hud-ticker-scroll ${speed}s linear infinite`,
        }}
      >
        {doubled}
      </div>
    </div>
  );
}
