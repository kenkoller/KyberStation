'use client';

interface ConsoleIndicatorProps {
  variant?: 'blink' | 'breathe' | 'alert' | 'steady';
  color?: string;
  size?: number;
  className?: string;
}

/** Animation config per variant, referencing keyframes from globals.css */
const VARIANT_ANIMATION: Record<string, string> = {
  blink: 'console-fast-blink 1s step-end infinite',
  breathe: 'console-slow-breathe 3s ease-in-out infinite',
  alert: 'console-alert-pulse 0.5s ease-in-out infinite',
  steady: 'none',
};

/**
 * Small LED-style blinking status dot.
 * Reuses `console-fast-blink`, `console-slow-breathe`, and
 * `console-alert-pulse` keyframes from globals.css.
 */
export function ConsoleIndicator({
  variant = 'breathe',
  color,
  size = 4,
  className = '',
}: ConsoleIndicatorProps) {
  return (
    <span
      className={`inline-block rounded-full pointer-events-none hud-console-indicator ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color ?? 'rgb(var(--accent))',
        opacity:
          variant === 'steady'
            ? 'calc(0.10 * var(--ambient-intensity, 1))'
            : undefined,
        animation: VARIANT_ANIMATION[variant] ?? 'none',
      }}
      aria-hidden="true"
    />
  );
}
