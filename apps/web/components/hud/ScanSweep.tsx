'use client';

interface ScanSweepProps {
  size?: number;
  speed?: number;
  className?: string;
}

/**
 * Rotating radar-style scan sweep effect.
 * Uses `hud-scan-rotate` keyframe from globals.css.
 */
export function ScanSweep({
  size = 200,
  speed = 8,
  className = '',
}: ScanSweepProps) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        opacity: 'var(--ambient-intensity, 1)',
      }}
      aria-hidden="true"
    >
      <div
        className="hud-scan-sweep"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(
            from 0deg,
            rgba(var(--accent), 0.10) 0deg,
            rgba(var(--accent), 0.06) 20deg,
            rgba(var(--accent), 0.02) 40deg,
            transparent 60deg,
            transparent 360deg
          )`,
          animation: `hud-scan-rotate ${speed}s linear infinite`,
        }}
      />
    </div>
  );
}
