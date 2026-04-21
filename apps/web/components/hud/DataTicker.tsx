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
  // Seamless loop requires the animated content to be exactly TWO
  // identical passes of the pool so a `translateX(-50%)` lands on a
  // frame that looks identical to `translateX(0)`. The previous
  // implementation joined the pool once then concatenated with an
  // extra separator in the middle — that introduced asymmetry and
  // the content snapped back at each loop. `items.concat(items).join`
  // produces a single string where every item-gap (including the
  // boundary between the two passes) uses the same separator, so
  // 0% and 100% of the animation are visually indistinguishable.
  const looped = items.concat(items).join(' \u2502 ');

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
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 7,
          letterSpacing: '0.05em',
          color: 'rgba(var(--accent), 0.15)',
          opacity: 'var(--ambient-intensity, 1)',
          animation: `hud-ticker-scroll ${speed}s linear infinite`,
        }}
      >
        {looped}
      </div>
    </div>
  );
}
