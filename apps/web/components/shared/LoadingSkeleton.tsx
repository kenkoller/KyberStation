'use client';

/**
 * Star Wars-themed loading skeleton components.
 *
 * Shimmer placeholders for panels, gauges, text, and bars while
 * content loads. Uses the theme accent color for the shimmer highlight
 * and respects performance tiers (no animation on Lite).
 */

interface SkeletonProps {
  className?: string;
}

// ─── Base shimmer animation (shared) ───

const shimmerStyle: React.CSSProperties = {
  background: `linear-gradient(
    90deg,
    rgb(var(--bg-surface)) 0%,
    rgb(var(--bg-card)) 40%,
    rgb(var(--bg-surface)) 80%
  )`,
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.8s ease-in-out infinite',
  borderRadius: 4,
};

/**
 * Inline keyframes — injected once via a hidden style element.
 * This avoids needing to modify globals.css.
 */
function ShimmerStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .perf-lite .skeleton-shimmer {
            animation: none !important;
            background: rgb(var(--bg-surface)) !important;
          }
        `,
      }}
    />
  );
}

// Track whether styles have been injected
let stylesInjected = false;

function ensureStyles() {
  // Styles are injected via the ShimmerStyles component
  // This flag just prevents rendering it multiple times
  if (typeof document !== 'undefined') {
    if (!document.querySelector('[data-skeleton-styles]')) {
      stylesInjected = false;
    }
  }
}

/**
 * Text line skeleton — a single line placeholder.
 */
export function SkeletonLine({
  width = '100%',
  height = 10,
  className = '',
}: SkeletonProps & { width?: string | number; height?: number }) {
  ensureStyles();
  return (
    <>
      {!stylesInjected && <ShimmerStyles />}
      <div
        className={`skeleton-shimmer ${className}`}
        style={{ ...shimmerStyle, width, height }}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Circular skeleton — for gauge placeholders.
 */
export function SkeletonCircle({
  size = 56,
  className = '',
}: SkeletonProps & { size?: number }) {
  return (
    <>
      {!stylesInjected && <ShimmerStyles />}
      <div
        className={`skeleton-shimmer ${className}`}
        style={{
          ...shimmerStyle,
          width: size,
          height: size,
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Panel skeleton — a full panel placeholder with simulated content lines.
 */
export function SkeletonPanel({
  lines = 3,
  className = '',
}: SkeletonProps & { lines?: number }) {
  return (
    <div
      className={`corner-rounded flex flex-col gap-2.5 ${className}`}
      style={{
        padding: 12,
        background: 'rgb(var(--bg-card))',
        border: '1px solid var(--border-subtle)',
      }}
      aria-hidden="true"
    >
      {/* Title line */}
      <SkeletonLine width="45%" height={8} />

      {/* Content lines */}
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={i}
          width={`${65 + Math.sin(i * 2.1) * 25}%`}
          height={6}
        />
      ))}
    </div>
  );
}

/**
 * Bar skeleton — for segmented bar placeholders.
 */
export function SkeletonBar({
  segments = 10,
  className = '',
}: SkeletonProps & { segments?: number }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} aria-hidden="true">
      <SkeletonLine width="30%" height={6} />
      <div className="flex gap-px">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              ...shimmerStyle,
              width: 6,
              height: 12,
              borderRadius: 1,
              animationDelay: `${i * 0.06}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Gauge cluster skeleton — three circular gauges in a row.
 */
export function SkeletonGaugeCluster({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`flex items-center justify-around gap-3 ${className}`}
      style={{
        padding: 12,
        background: 'rgb(var(--bg-card))',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
      }}
      aria-hidden="true"
    >
      <SkeletonLine width="40%" height={6} />
      <div className="flex gap-4 mt-2">
        <SkeletonCircle size={48} />
        <SkeletonCircle size={48} />
        <SkeletonCircle size={48} />
      </div>
    </div>
  );
}

/**
 * Theme card skeleton — for theme picker loading state.
 */
export function SkeletonThemeCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`corner-rounded overflow-hidden ${className}`}
      style={{
        width: 120,
        border: '1px solid var(--border-subtle)',
      }}
      aria-hidden="true"
    >
      <div className="skeleton-shimmer" style={{ ...shimmerStyle, height: 52 }} />
      <div
        style={{
          padding: '6px 8px',
          background: 'rgb(var(--bg-surface))',
        }}
      >
        <SkeletonLine width="60%" height={6} />
      </div>
    </div>
  );
}
