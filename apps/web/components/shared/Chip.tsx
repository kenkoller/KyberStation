'use client';

// ─── Chip — single chip primitive for the ChipStrip pattern ─────────────────
//
// Designed to be the visual atom inside `<ChipStrip>` (the horizontal
// scroll-snap row used to collapse Sidebar A/B Column A onto narrow phone
// viewports per `docs/mobile-design.md` § 2.2). Chips DO NOT auto-scroll
// themselves into view — the parent decides when to call `scrollIntoView`
// on a chip's DOM element after a selection change. This separation keeps
// `<Chip>` free of effects + lets parents drive selection animation timing.
//
// Visual register matches the existing editor "active vs inactive" pattern
// (see `EffectChip.tsx`): inactive renders flat (`text-text-muted`, no
// border, no background); active renders with `border-accent-border` +
// `bg-accent/15`-ish dim + `text-accent`. The new bit on top is the
// 2px top-edge identity-color stripe (the `accent` prop), which lets a
// chip strip carry per-chip color identity (e.g. modulator plate
// identity colors) on top of the global accent token. When `accent`
// is omitted the stripe falls through to `var(--accent)`.
//
// Touch + a11y per WCAG 2.5.5: minimum 44 × 44 hit target via `min-w[48]`
// + `min-h[44]` (text content can be larger; this floors the smallest
// chips). `aria-pressed` reflects active state by default.

import { type ReactNode, type CSSProperties } from 'react';

export interface ChipProps {
  /**
   * Visible chip label (required). Stays single-line via truncate;
   * ChipStrip parents are expected to keep labels short (≤ ~12 chars).
   */
  label: string;
  /**
   * Optional second-line text rendered smaller below the label.
   * Used for things like blade-style sub-classifications, version
   * tags, or modulator detail.
   */
  subtitle?: string;
  /**
   * Optional leading visual — emoji char, glyph, or a small SVG
   * `ReactNode`. Rendered above the label so it reads as a vertical
   * stack (icon → label → subtitle). Falls through to no-icon shape
   * if omitted.
   */
  icon?: ReactNode;
  /**
   * Optional CSS color string (any valid CSS color expression). Used
   * as the top-edge identity stripe AND the active-state border tint.
   * Falls through to `var(--accent)` when omitted. Per-chip colors let
   * a strip carry richer identity than the global accent — e.g. each
   * modulator plate gets its own hue.
   */
  accent?: string;
  /** Active / selected state. Default false. */
  active?: boolean;
  /** Click handler. Required — chips are buttons. */
  onClick: () => void;
  /**
   * Override for the `aria-pressed` attribute. Defaults to the value
   * of `active`. Set to `false` explicitly to opt out (e.g. when a
   * parent uses radiogroup semantics instead of toggle-button).
   */
  ariaPressed?: boolean;
  /** Optional className for parent overrides (rare; prefer props). */
  className?: string;
}

/**
 * Renders a single chip. Sizing: the chip uses content-based width
 * floored at 48px and capped at 120px; `truncate` prevents very long
 * labels from breaking the row layout. Stack: 2px identity stripe on
 * top → optional icon → label → optional subtitle. Touch target stays
 * ≥ 44 × 44 via `min-h-[44px]` so chips remain WCAG-compliant even
 * when the inner text is small.
 */
export function Chip({
  label,
  subtitle,
  icon,
  accent,
  active = false,
  onClick,
  ariaPressed,
  className,
}: ChipProps) {
  // Identity stripe + active border default through to the global
  // accent token when no per-chip color is provided. Inline style is
  // necessary because Tailwind can't resolve dynamic CSS color values.
  const identityColor = accent ?? 'rgb(var(--accent))';
  const stripeStyle: CSSProperties = {
    backgroundColor: identityColor,
  };
  const activeBorderStyle: CSSProperties | undefined = active
    ? { borderColor: identityColor }
    : undefined;

  // Compose the visual register. Inactive: no border, muted text, no
  // background. Active: identity-tinted border + dim accent fill +
  // accent text. Hover bumps inactive to text-secondary so the row
  // reads "alive" without committing to selection. Focus-visible
  // ring matches the rest of the editor primitives.
  const baseClasses =
    'relative flex flex-col items-center justify-center min-w-[48px] max-w-[120px] min-h-[44px] px-2 pt-2 pb-1 text-ui-xs select-none cursor-pointer rounded-interactive border transition-colors';
  const stateClasses = active
    ? 'text-accent bg-accent/15'
    : 'text-text-muted border-transparent hover:text-text-secondary';
  const focusClasses =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-deep';
  const snapClass = '[scroll-snap-align:center]';

  return (
    <button
      type="button"
      role="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      title={subtitle ? `${label} — ${subtitle}` : label}
      style={activeBorderStyle}
      className={[baseClasses, stateClasses, focusClasses, snapClass, className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {/*
        2px identity stripe on the top edge. Always rendered (even
        when inactive) so chip width / height stays visually
        consistent — only the active state changes border tint, not
        layout. Stripe is opacity-1 always; identity is the chip's
        real signal even before selection. Rendered as an absolutely-
        positioned slab so the chip's content stack stays aligned.
      */}
      <span
        aria-hidden="true"
        data-testid="chip-stripe"
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-interactive"
        style={stripeStyle}
      />
      {icon !== undefined ? (
        <span aria-hidden="true" className="mb-0.5 flex items-center justify-center text-base leading-none">
          {icon}
        </span>
      ) : null}
      <span className="block truncate font-medium leading-tight">{label}</span>
      {subtitle ? (
        <span className="block truncate text-[10px] leading-tight text-text-muted/80 mt-0.5">
          {subtitle}
        </span>
      ) : null}
    </button>
  );
}
