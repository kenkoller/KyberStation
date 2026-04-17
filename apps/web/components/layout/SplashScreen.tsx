'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Integrated splash / loading screen.
 *
 * Renders inline within the app layout (not a separate window or blocking overlay).
 * Shows a brief kyber crystal ignition animation, app name, and version number.
 * Fades out once the app is ready, or after a max duration.
 *
 * Features:
 *   - Kyber crystal glow that expands into a horizontal "ignition" wipe
 *   - App name resolves from the light
 *   - Version number in dot-matrix style below
 *   - Total duration: ~1.8s (not artificially padded)
 *   - Respects reduced motion (instant show/hide)
 *   - User can disable permanently via settings
 */

interface SplashScreenProps {
  /** The app version string to display, e.g. "0.3.0-alpha" */
  version?: string;
  /** Called when the splash animation completes and the component is ready to unmount */
  onComplete?: () => void;
  /** If true, skip animation entirely (for returning users who disabled it) */
  disabled?: boolean;
}

const SPLASH_DURATION_MS = 1800;
const FADE_OUT_MS = 400;

export function SplashScreen({
  version = '0.1.0',
  onComplete,
  disabled = false,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<'crystal' | 'ignite' | 'reveal' | 'fadeout' | 'done'>(
    disabled ? 'done' : 'crystal'
  );

  const complete = useCallback(() => {
    setPhase('done');
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (disabled) {
      complete();
      return;
    }

    // Check reduced motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      // Show content briefly then complete
      const t = setTimeout(complete, 300);
      return () => clearTimeout(t);
    }

    // Phase timeline
    const t1 = setTimeout(() => setPhase('ignite'), 200);
    const t2 = setTimeout(() => setPhase('reveal'), 700);
    const t3 = setTimeout(() => setPhase('fadeout'), SPLASH_DURATION_MS - FADE_OUT_MS);
    const t4 = setTimeout(complete, SPLASH_DURATION_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [disabled, complete]);

  if (phase === 'done') return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgb(var(--bg-deep))',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease-out`,
        pointerEvents: phase === 'fadeout' ? 'none' : 'auto',
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--accent) / 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--accent) / 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          opacity: phase === 'crystal' ? 0 : 0.6,
          transition: 'opacity 500ms ease',
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-4">
        {/* Kyber crystal glow */}
        <div
          className="relative"
          style={{
            width: phase === 'crystal' ? 8 : phase === 'ignite' ? 24 : 48,
            height: phase === 'crystal' ? 16 : phase === 'ignite' ? 24 : 4,
            transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Inner crystal */}
          <div
            className="absolute inset-0"
            style={{
              background:
                phase === 'crystal'
                  ? `radial-gradient(ellipse, var(--crystal-color) 0%, transparent 80%)`
                  : phase === 'ignite'
                    ? `radial-gradient(circle, var(--crystal-color) 0%, rgb(var(--accent) / 0.5) 40%, transparent 70%)`
                    : `linear-gradient(90deg, transparent 0%, var(--crystal-color) 30%, var(--crystal-color) 70%, transparent 100%)`,
              borderRadius: phase === 'reveal' || phase === 'fadeout' ? '2px' : '50%',
              boxShadow:
                phase !== 'crystal'
                  ? `0 0 24px var(--crystal-color), 0 0 48px rgb(var(--accent) / 0.3)`
                  : `0 0 8px var(--crystal-color)`,
              opacity: phase === 'crystal' ? 0.6 : 1,
              transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>

        {/* Horizontal ignition wipe */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: phase === 'reveal' || phase === 'fadeout' ? '280px' : '0px',
            height: '2px',
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(90deg, transparent, var(--crystal-color), transparent)`,
            opacity: phase === 'reveal' || phase === 'fadeout' ? 0.5 : 0,
            transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
          }}
        />

        {/* App name */}
        <div
          className="font-cinematic text-center select-none"
          style={{
            fontSize: 'calc(18px * var(--font-scale))',
            letterSpacing: '0.3em',
            color: 'rgb(var(--text-primary))',
            opacity: phase === 'reveal' || phase === 'fadeout' ? 1 : 0,
            transform:
              phase === 'reveal' || phase === 'fadeout'
                ? 'translateY(0)'
                : 'translateY(4px)',
            transition: 'opacity 400ms ease 100ms, transform 400ms ease 100ms',
            textShadow: `0 0 16px rgb(var(--accent) / 0.3)`,
            marginTop: '16px',
          }}
        >
          KYBERSTATION
        </div>

        {/* Version number */}
        <div
          className="dot-matrix text-center select-none"
          style={{
            opacity: phase === 'reveal' || phase === 'fadeout' ? 0.5 : 0,
            transition: 'opacity 300ms ease 200ms',
          }}
        >
          v{version}
        </div>
      </div>

      {/* Corner brackets (decorative) */}
      <SplashCorner position="top-left" visible={phase !== 'crystal'} />
      <SplashCorner position="top-right" visible={phase !== 'crystal'} />
      <SplashCorner position="bottom-left" visible={phase !== 'crystal'} />
      <SplashCorner position="bottom-right" visible={phase !== 'crystal'} />
    </div>
  );
}

function SplashCorner({
  position,
  visible,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  visible: boolean;
}) {
  const styles: React.CSSProperties = {
    position: 'absolute',
    width: 24,
    height: 24,
    opacity: visible ? 0.2 : 0,
    transition: 'opacity 400ms ease',
    borderColor: 'rgb(var(--accent))',
    borderStyle: 'solid',
    borderWidth: 0,
  };

  switch (position) {
    case 'top-left':
      styles.top = 24;
      styles.left = 24;
      styles.borderTopWidth = 1;
      styles.borderLeftWidth = 1;
      break;
    case 'top-right':
      styles.top = 24;
      styles.right = 24;
      styles.borderTopWidth = 1;
      styles.borderRightWidth = 1;
      break;
    case 'bottom-left':
      styles.bottom = 24;
      styles.left = 24;
      styles.borderBottomWidth = 1;
      styles.borderLeftWidth = 1;
      break;
    case 'bottom-right':
      styles.bottom = 24;
      styles.right = 24;
      styles.borderBottomWidth = 1;
      styles.borderRightWidth = 1;
      break;
  }

  return <div style={styles} />;
}
