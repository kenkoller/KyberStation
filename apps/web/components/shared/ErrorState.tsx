'use client';

/**
 * KyberStation error state primitive.
 *
 * Named, uniform failure presentation for async boundaries. Pair with
 * <Skeleton> (loading) and the panel's loaded state to form the complete
 * triad:
 *
 *   loading  → <Skeleton> / <PanelSkeleton>
 *   failure  → <ErrorState variant="..." ... />
 *   success  → panel content
 *
 * Usage:
 *   <ErrorState
 *     variant="parse-failed"
 *     message="Could not parse C++ style code."
 *     onRetry={() => parse()}
 *   />
 *
 * Variants map to the operation that failed so the surrounding heading,
 * icon, and default message stay consistent across panels:
 *   - "load-failed":   fetch / IndexedDB read / remote resource
 *   - "parse-failed":  malformed user input (C++ paste, JSON, etc.)
 *   - "save-failed":   write to IndexedDB / localStorage / filesystem
 *   - "import-failed": user-supplied file rejected (bad format, too big)
 *
 * Theme tokens only. Use the `compact` variant inside small panels where
 * the default vertical rhythm would dominate the surrounding UI.
 *
 * Prefer this over inline red text or swallowed console.error. If a
 * failure is genuinely transient and user-actionable via toast (e.g. a
 * successful SD card write that reports progress messages inline), keep
 * the existing toast flow — ErrorState is for in-panel failures that
 * leave the panel in a broken state until the user retries or changes
 * something.
 */

import type { ReactNode } from 'react';

type ErrorVariant = 'load-failed' | 'parse-failed' | 'save-failed' | 'import-failed';

interface ErrorStateProps {
  /** Which failure category this represents. Drives the heading + icon. */
  variant: ErrorVariant;
  /** Detailed message shown under the heading. Usually `err.message`. */
  message: string;
  /**
   * Called when the user clicks Retry. If omitted, the button is hidden
   * — useful for failures that are not retryable from inside the panel
   * (e.g. a missing browser API).
   */
  onRetry?: () => void;
  /**
   * Shrinks padding + typography for use inside small panels.
   * Default `false`.
   */
  compact?: boolean;
  /**
   * Optional extra content rendered below the message — e.g. a link to
   * documentation or a secondary "Choose different file" affordance.
   */
  children?: ReactNode;
  /** Extra classes merged onto the root. */
  className?: string;
}

const VARIANT_HEADINGS: Record<ErrorVariant, string> = {
  'load-failed': 'Failed to Load',
  'parse-failed': 'Could Not Parse',
  'save-failed': 'Failed to Save',
  'import-failed': 'Could Not Import',
};

/**
 * Warning-triangle glyph — inline SVG so size and color track the theme
 * automatically via `currentColor`. Kept decorative (aria-hidden) because
 * the surrounding heading already conveys the semantic.
 */
function WarningIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M8 2 L14.5 13.5 H1.5 Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M8 6 V9.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function ErrorState({
  variant,
  message,
  onRetry,
  compact = false,
  children,
  className = '',
}: ErrorStateProps) {
  const heading = VARIANT_HEADINGS[variant];
  const iconColor = 'rgb(var(--status-error))';

  const padding = compact ? 'px-2.5 py-2' : 'p-4';
  const headingClass = compact
    ? 'text-ui-sm font-semibold'
    : 'text-ui-base font-semibold';
  const messageClass = compact ? 'text-ui-xs' : 'text-ui-sm';
  const gap = compact ? 'gap-1.5' : 'gap-2';
  const iconSize = compact ? 14 : 18;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'bg-bg-card rounded-panel border',
        'border-border-subtle',
        padding,
        className,
      ].join(' ')}
      style={{
        // Faint error tint on the left edge so the role is legible at a
        // glance without flooding the panel in red.
        borderLeft: `2px solid ${iconColor}`,
      }}
      data-variant={variant}
    >
      <div className={`flex items-start ${gap}`}>
        <span style={{ color: iconColor }} className="mt-0.5">
          <WarningIcon size={iconSize} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={`${headingClass} text-text-primary`}
            style={{ color: iconColor }}
          >
            {heading}
          </div>
          <p
            className={`${messageClass} text-text-secondary mt-0.5 break-words`}
          >
            {message}
          </p>
          {children && (
            <div className={compact ? 'mt-1.5' : 'mt-2'}>{children}</div>
          )}
          {onRetry && (
            <div className={compact ? 'mt-1.5' : 'mt-2.5'}>
              <button
                onClick={onRetry}
                className={[
                  'rounded border transition-colors',
                  'bg-bg-surface border-border-subtle text-text-secondary',
                  'hover:text-text-primary hover:border-border-light',
                  compact
                    ? 'text-ui-xs px-2 py-0.5'
                    : 'text-ui-sm px-3 py-1',
                ].join(' ')}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
