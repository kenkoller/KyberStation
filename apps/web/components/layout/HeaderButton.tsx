'use client';

import { forwardRef } from 'react';

/**
 * HeaderButton -- standardized interactive element for the header bar.
 *
 * Normalizes height, padding, border-radius, hover state, and focus ring
 * across all header actions. Two variants:
 *
 *   - `default` (border-border-subtle, muted text, hover brightens)
 *   - `accent`  (border-accent, accent text, hover glow)
 *
 * Icon-only buttons (no children text) should pass `iconOnly` for tighter
 * horizontal padding.
 */

export type HeaderButtonVariant = 'default' | 'accent';

export interface HeaderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HeaderButtonVariant;
  /** Use tighter px-1.5 padding for icon-only buttons */
  iconOnly?: boolean;
}

const BASE_CLASSES = [
  'inline-flex items-center justify-center gap-1',
  'h-7',                        // 28px -- consistent height
  'rounded-interactive',        // var(--r-interactive, 4px)
  'text-ui-xs font-medium',
  'border',
  'transition-colors',
  'select-none',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-secondary',
].join(' ');

const VARIANT_CLASSES: Record<HeaderButtonVariant, string> = {
  default: [
    'border-border-subtle',
    'text-text-muted',
    'hover:text-text-secondary hover:border-border-light',
  ].join(' '),
  accent: [
    'border-accent/40',
    'text-accent',
    'hover:bg-accent/10',
  ].join(' '),
};

export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>(
  function HeaderButton({ variant = 'default', iconOnly, className, ...props }, ref) {
    const padding = iconOnly ? 'px-1.5' : 'px-2';
    const classes = [BASE_CLASSES, VARIANT_CLASSES[variant], padding, className]
      .filter(Boolean)
      .join(' ');

    return <button ref={ref} className={classes} {...props} />;
  },
);
