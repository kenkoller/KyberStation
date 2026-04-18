'use client';

interface SegmentedBarProps {
  value: number;
  segments?: number;
  label?: string;
  className?: string;
  colorStops?: [number, string][];
}

function getSegmentColor(
  segmentIndex: number,
  totalSegments: number,
  colorStops?: [number, string][],
): string {
  if (!colorStops || colorStops.length === 0) {
    return 'rgb(var(--accent))';
  }
  const threshold = (segmentIndex + 1) / totalSegments;
  let color = colorStops[0][1];
  for (const [stop, c] of colorStops) {
    if (threshold >= stop) {
      color = c;
    }
  }
  return color;
}

/**
 * Horizontal segmented bar graph for real-time data (0-1).
 * Supports optional color stops for green/yellow/red zone rendering.
 */
export function SegmentedBar({
  value,
  segments = 10,
  label,
  className = '',
  colorStops,
}: SegmentedBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const filledCount = Math.round(clamped * segments);
  const displayValue = Math.round(clamped * 100);

  return (
    <div
      className={`inline-flex flex-col gap-1 pointer-events-auto ${className}`}
    >
      {label && (
        <div className="flex items-center justify-between gap-2">
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'rgb(var(--text-secondary))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'rgb(var(--text-muted))',
            }}
          >
            {displayValue}%
          </span>
        </div>
      )}
      <div className="flex gap-px">
        {Array.from({ length: segments }, (_, i) => {
          const filled = i < filledCount;
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: 12,
                borderRadius: 1,
                backgroundColor: filled
                  ? getSegmentColor(i, segments, colorStops)
                  : 'var(--border-subtle)',
                transition: 'background-color 150ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
