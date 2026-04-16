'use client';

/**
 * BladeForge loading skeleton primitives.
 *
 * Pure-render shimmer placeholders for panels, text blocks, the blade canvas,
 * and multi-column tab layouts while lazy content loads.
 *
 * Theme: bg-bg-surface/40 shimmer bars on bg-bg-deep background.
 * Animation: custom skeleton-shimmer keyframe (defined in globals.css).
 * Accessibility: aria-hidden + role="presentation" throughout.
 * Reduced motion: animation is suppressed via prefers-reduced-motion and
 *   the .reduced-motion class used by useAccessibilityApplier.
 * Performance tiers: .perf-lite disables the animation entirely.
 */

// ─── Shared inline shimmer style ────────────────────────────────────────────

const BASE_SHIMMER: React.CSSProperties = {
  backgroundImage: `linear-gradient(
    90deg,
    rgb(var(--bg-surface) / 0.4) 0%,
    rgb(var(--bg-card)   / 0.7) 40%,
    rgb(var(--bg-surface) / 0.4) 80%
  )`,
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.8s ease-in-out infinite',
};

// ─── 1. SkeletonLine ─────────────────────────────────────────────────────────

interface SkeletonLineProps {
  /** CSS width value — default '100%' */
  width?: string;
  /** CSS height value — default '12px' */
  height?: string;
  className?: string;
}

/**
 * A single animated shimmer bar.
 * Rounded corners, configurable width and height.
 */
export function SkeletonLine({
  width = '100%',
  height = '12px',
  className = '',
}: SkeletonLineProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`rounded-md ${className}`}
      style={{ ...BASE_SHIMMER, width, height }}
    />
  );
}

// ─── 2. SkeletonBlock ────────────────────────────────────────────────────────

interface SkeletonBlockProps {
  /** CSS width value */
  width: string;
  /** CSS height value */
  height: string;
  className?: string;
}

/**
 * A rectangular shimmer area — for canvases, images, chart regions, etc.
 */
export function SkeletonBlock({ width, height, className = '' }: SkeletonBlockProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`rounded-md ${className}`}
      style={{ ...BASE_SHIMMER, width, height }}
    />
  );
}

// ─── 3. SkeletonText ─────────────────────────────────────────────────────────

interface SkeletonTextProps {
  /** Number of lines to render — default 3 */
  lines?: number;
  className?: string;
}

// Deterministic widths per line position so SSR and client render match.
// Last line is always 75% for a natural paragraph look.
const LINE_WIDTHS = ['100%', '90%', '95%', '88%', '92%', '85%'];

/**
 * Multiple shimmer lines simulating a block of text.
 * The last line is shorter (75%) for a realistic paragraph appearance.
 */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`flex flex-col gap-2 ${className}`}
    >
      {Array.from({ length: lines }, (_, i) => {
        const isLast = i === lines - 1;
        const width = isLast ? '75%' : (LINE_WIDTHS[i % LINE_WIDTHS.length] ?? '100%');
        return (
          <div
            key={i}
            className="rounded-md"
            style={{ ...BASE_SHIMMER, width, height: '10px' }}
          />
        );
      })}
    </div>
  );
}

// ─── 4. PanelSkeleton ────────────────────────────────────────────────────────

interface PanelSkeletonProps {
  /**
   * If provided, renders a muted static title above the shimmer lines.
   * Useful when the panel label is known before its content loads.
   */
  title?: string;
  className?: string;
}

/**
 * Full panel placeholder matching the DraggablePanel layout.
 *
 * Layout (top → bottom):
 *   - 4px drag-handle area  (matches DraggablePanel header row)
 *   - shimmer header bar    (32px, simulates the header row)
 *   - 3-4 content lines     (simulating controls/sliders)
 *   - small shimmer block   (simulating a colour swatch / preview area)
 */
export function PanelSkeleton({ title, className = '' }: PanelSkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={[
        'relative rounded-panel border select-none',
        'bg-bg-surface/80 border-border-subtle',
        className,
      ].join(' ')}
    >
      {/* Header row — mirrors DraggablePanel's px-2 py-1.5 header */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Drag-handle placeholder */}
        <div
          className="rounded-sm shrink-0"
          style={{ ...BASE_SHIMMER, width: 8, height: 14 }}
        />
        {/* Label or shimmer title bar */}
        {title ? (
          <span className="text-ui-sm uppercase tracking-wider text-text-muted/50 font-bold truncate">
            {title}
          </span>
        ) : (
          <div
            className="rounded-md flex-1"
            style={{ ...BASE_SHIMMER, height: '8px', maxWidth: '48%' }}
          />
        )}
      </div>

      {/* Content area — mirrors DraggablePanel's px-2 pb-2 body */}
      <div className="px-2 pb-2 flex flex-col gap-2.5">
        {/* 3 control rows */}
        <SkeletonLine width="100%" height="8px" />
        <SkeletonLine width="85%"  height="8px" />
        <SkeletonLine width="92%"  height="8px" />
        {/* Small preview block (colour swatch / mini-chart) */}
        <SkeletonBlock width="100%" height="28px" />
      </div>
    </div>
  );
}

// ─── 5. CanvasSkeleton ───────────────────────────────────────────────────────

interface CanvasSkeletonProps {
  className?: string;
}

/**
 * Placeholder for the blade canvas visualisation stack.
 *
 * Approximate proportions (vertical layout, matching BladeCanvas):
 *   - Large shimmer rectangle  → blade render area
 *   - Thin bar                 → LED pixel strip readout
 *   - Thin bar                 → RGB graph readout
 */
export function CanvasSkeleton({ className = '' }: CanvasSkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={[
        'flex flex-col gap-1.5 w-full',
        className,
      ].join(' ')}
    >
      {/* Main blade render area */}
      <SkeletonBlock width="100%" height="320px" className="rounded-md" />
      {/* LED pixel strip readout */}
      <SkeletonBlock width="100%" height="18px" className="rounded-sm" />
      {/* RGB graph readout */}
      <SkeletonBlock width="100%" height="48px" className="rounded-sm" />
    </div>
  );
}

// ─── 6. TabContentSkeleton ───────────────────────────────────────────────────

interface TabContentSkeletonProps {
  /**
   * Number of panel columns — default 4, matching the ColumnGrid default.
   * Each column renders one PanelSkeleton.
   */
  columns?: number;
  className?: string;
}

/**
 * Placeholder for the multi-column panel tab content area.
 *
 * Renders `columns` PanelSkeleton components in an equal-width grid row,
 * matching the ColumnGrid layout used by the editor.
 */
export function TabContentSkeleton({ columns = 4, className = '' }: TabContentSkeletonProps) {
  const colCount = Math.max(1, Math.min(4, columns));

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={[
        'grid gap-2 w-full',
        className,
      ].join(' ')}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: colCount }, (_, i) => (
        <PanelSkeleton key={i} />
      ))}
    </div>
  );
}
