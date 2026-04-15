'use client';

interface CircularGaugeProps {
  value: number;
  label?: string;
  size?: number;
  className?: string;
  showValue?: boolean;
  unit?: string;
}

/**
 * Circular/arc gauge for displaying real-time numeric data (0-1).
 * Renders a 270-degree SVG arc with value fill, center text, and label.
 */
export function CircularGauge({
  value,
  label,
  size = 64,
  className = '',
  showValue = true,
  unit = '',
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const strokeWidth = Math.max(2, size * 0.06);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 270 degrees (3/4 of circle), gap at bottom
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * clamped;
  const center = size / 2;
  const displayValue = Math.round(clamped * 100);
  const fontSize = Math.max(10, size * 0.22);
  const labelSize = Math.max(7, size * 0.14);

  return (
    <div
      className={`relative inline-flex flex-col items-center pointer-events-auto ${className}`}
      style={{ width: size, height: size + (label ? labelSize + 4 : 0) }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)' }}
      >
        {/* Background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
      </svg>
      {showValue && (
        <span
          className="absolute"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize,
            color: 'rgb(var(--text-primary))',
            lineHeight: 1,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            marginTop: label ? -(labelSize * 0.3) : 0,
          }}
        >
          {displayValue}
          {unit && (
            <span
              style={{
                fontSize: fontSize * 0.6,
                color: 'rgb(var(--text-muted))',
                marginLeft: 1,
              }}
            >
              {unit}
            </span>
          )}
        </span>
      )}
      {label && (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: labelSize,
            color: 'rgb(var(--text-muted))',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
