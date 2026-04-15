'use client';

import type { ReactNode } from 'react';

interface CornerBracketsProps {
  className?: string;
  pulse?: boolean;
  size?: number;
  thickness?: number;
  children?: ReactNode;
}

interface CornerDef {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  bt: boolean;
  bb: boolean;
  bl: boolean;
  br: boolean;
}

const CORNERS: CornerDef[] = [
  { top: 0, left: 0, bt: true, bb: false, bl: true, br: false },
  { top: 0, right: 0, bt: true, bb: false, bl: false, br: true },
  { bottom: 0, left: 0, bt: false, bb: true, bl: true, br: false },
  { bottom: 0, right: 0, bt: false, bb: true, bl: false, br: true },
];

/**
 * L-shaped corner bracket decorations for panels.
 * Uses `hud-bracket-pulse` keyframe from globals.css.
 */
export function CornerBrackets({
  className = '',
  pulse = true,
  size = 12,
  thickness = 1,
  children,
}: CornerBracketsProps) {
  const borderValue = `${thickness}px solid rgba(var(--accent), 0.25)`;

  return (
    <div className={`relative ${className}`}>
      {children}
      {CORNERS.map((c, i) => (
        <div
          key={i}
          className="pointer-events-none absolute hud-corner-bracket"
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            borderTop: c.bt ? borderValue : 'none',
            borderBottom: c.bb ? borderValue : 'none',
            borderLeft: c.bl ? borderValue : 'none',
            borderRight: c.br ? borderValue : 'none',
            opacity: 'var(--ambient-intensity, 1)',
            animation: pulse
              ? 'hud-bracket-pulse 5s ease-in-out infinite'
              : 'none',
          }}
        />
      ))}
    </div>
  );
}
