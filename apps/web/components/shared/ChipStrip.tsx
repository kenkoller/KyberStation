'use client';

// ─── ChipStrip — horizontal scroll-snap container for `<Chip>` rows ─────────
//
// Phase 4 PR #3 (2026-04-30) — second of the foundation primitives per
// `docs/mobile-implementation-plan.md` § PR #3. Lives next to `Sheet` from
// PR #2; together they implement the Pattern A collapse from Sidebar A/B's
// 2-column desktop shape to a chips-above-body shape on phone-sm
// (≤479px). Pattern reference: `docs/mobile-design.md` § 2.2 — the
// strip carries Column A's row identity onto a horizontal scrollable
// rail; Column B's body sits below. Per-section adoption lands in
// PR #6 (blade-style first), then PR #7 / PR #8 / PR #9.
//
// What this primitive does:
//   - Lays out children in a single horizontal row with `gap-2` (8px)
//   - Enables CSS scroll-snap with `x mandatory` axis + `smooth` behavior
//   - Renders 16px edge-fade gradients on left + right so off-screen
//     content visibly fades into the container background
//   - Hides the native scrollbar (cross-browser via `scrollbar-width`
//     + WebKit pseudo-element + Firefox property)
//
// What this primitive does NOT do:
//   - Manage selection — chips are stateless visuals; the parent owns
//     `active` flags + click handlers
//   - Auto-scroll the active chip into view — that's a parent concern
//     because parents know when a selection change has happened (e.g.
//     after a section A/B selection update). Keeping it out of here
//     keeps the primitive testable + side-effect-free.
//   - Render the chips themselves — `<Chip>` from `Chip.tsx` is the
//     canonical child but anything with `display: inline-block`-ish
//     layout will work.
//
// Visual register: per UX North Star §5 — flat, calm, dark-by-default
// chrome. Edge-fades use `from-bg-primary` so they read as the
// container background fading out, not a separate "vignette" element.

import { type ReactNode } from 'react';

export interface ChipStripProps {
  /** Chips (or any inline-friendly content) to lay out horizontally. */
  children: ReactNode;
  /** Optional className for parent overrides (rare; prefer wrapping). */
  className?: string;
}

/**
 * Horizontal scrollable row of chips with scroll-snap centering and
 * edge-fade gradients. The strip is a `<div role="group">` so screen
 * readers announce its children as a logical grouping; if a parent
 * needs `radiogroup` / `tablist` semantics it can wrap the strip in
 * its own ARIA container, but the default group role is the right
 * shape for free-form chip selection.
 */
export function ChipStrip({ children, className }: ChipStripProps) {
  // Hide the scrollbar across browsers without introducing a Tailwind
  // plugin. WebKit gets the pseudo-element via arbitrary variant
  // `[&::-webkit-scrollbar]:hidden`; Firefox + IE10 use the
  // `[scrollbar-width:none]` arbitrary property. Both are stable
  // shipped CSS, no plugin needed.
  //
  // Edge fades: implemented as sibling absolutely-positioned divs so
  // they don't affect the scroll container's measurements (a `::before`
  // / `::after` pseudo-element approach interacts with overflow
  // calculations in some browsers). The fades sit on top of the
  // scroll container via z-1 + `pointer-events-none` so they don't
  // intercept clicks, and are anchored to the strip's outer edges
  // regardless of scroll position.
  const containerClasses = [
    'relative w-full',
    className ?? '',
  ].filter(Boolean).join(' ');

  const scrollClasses = [
    'flex flex-row items-stretch',
    'gap-2 px-3',
    'overflow-x-auto',
    '[scroll-snap-type:x_mandatory]',
    '[scroll-behavior:smooth]',
    '[scrollbar-width:none]',
    '[&::-webkit-scrollbar]:hidden',
  ].join(' ');

  return (
    <div className={containerClasses}>
      <div role="group" className={scrollClasses} data-testid="chip-strip-scroll">
        {children}
      </div>
      {/*
        Left edge fade. Anchored to the strip's left, ~16px wide, fades
        from `bg-primary` to transparent so chips visibly dissolve into
        the container background as they scroll off the left edge.
        `pointer-events-none` so the fade doesn't swallow clicks on the
        leftmost chip.
      */}
      <div
        aria-hidden="true"
        data-testid="chip-strip-fade-left"
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-bg-primary to-transparent"
      />
      {/*
        Right edge fade. Mirror of the left fade. Together they signal
        "more content this way" without the noise of a visible scrollbar.
      */}
      <div
        aria-hidden="true"
        data-testid="chip-strip-fade-right"
        className="pointer-events-none absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-bg-primary to-transparent"
      />
    </div>
  );
}
