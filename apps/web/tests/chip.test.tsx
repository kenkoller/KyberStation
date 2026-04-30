// ─── Chip — primitive contract tests ───────────────────────────────────────
//
// Phase 4 PR #3 (2026-04-30) — locks down the visual + a11y contract of
// the Chip primitive. Like `chipStrip.test.tsx`, this uses
// `react-dom/server` + `renderToStaticMarkup` because apps/web's
// vitest env is node-only. Every assertion is on the rendered markup.
//
// Coverage:
//   - Required label renders
//   - Optional subtitle / icon render only when provided
//   - Active state pulls in accent text + background + border tint
//   - Custom `accent` prop overrides the default identity color via
//     inline styles (Tailwind can't resolve dynamic CSS color values
//     from props, so we verify inline-style usage)
//   - aria-pressed reflects active by default + can be overridden
//   - Touch target floor (min-h ≥ 44px per WCAG 2.5.5) is in the
//     class string
//   - scroll-snap-align center class applied (chips need to know
//     where to snap when in a strip)

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Chip } from '../components/shared/Chip';

describe('Chip', () => {
  it('renders the required label', () => {
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Stable', onClick: () => {} }),
    );
    expect(html).toContain('Stable');
  });

  it('renders the optional subtitle when provided', () => {
    const html = renderToStaticMarkup(
      createElement(Chip, {
        label: 'Crystal Shatter',
        subtitle: 'Style',
        onClick: () => {},
      }),
    );
    expect(html).toContain('Crystal Shatter');
    expect(html).toContain('Style');
  });

  it('omits the subtitle row when subtitle is not provided', () => {
    // The subtitle row uses `text-[10px]` — if we don't pass a
    // subtitle, that class shouldn't appear, which keeps the chip's
    // height tighter for label-only strips.
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Plasma', onClick: () => {} }),
    );
    expect(html).not.toContain('text-[10px]');
  });

  it('renders the optional icon when provided', () => {
    // Icon is a ReactNode — passing a marker string proves it gets
    // mounted in the icon slot (no special transformation needed).
    const html = renderToStaticMarkup(
      createElement(Chip, {
        label: 'Saved',
        icon: createElement('span', { 'data-testid': 'star-icon' }, '⭐'),
        onClick: () => {},
      }),
    );
    expect(html).toContain('data-testid="star-icon"');
  });

  it('renders no icon slot when icon is omitted', () => {
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Saved', onClick: () => {} }),
    );
    // The icon wrapper carries a `mb-0.5` margin-bottom + flex centering;
    // when the icon is absent we shouldn't be reserving that slot at
    // all (each chip stays as compact as its content allows).
    expect(html).not.toContain('mb-0.5');
  });

  it('applies active visual register when active=true', () => {
    // Active: text-accent + bg-accent/15 (the dim tint). Inactive:
    // text-text-muted + no background. Drift here breaks the
    // core "selected vs not" signal.
    const activeHtml = renderToStaticMarkup(
      createElement(Chip, { label: 'Sith', active: true, onClick: () => {} }),
    );
    expect(activeHtml).toContain('text-accent');
    expect(activeHtml).toContain('bg-accent/15');

    const inactiveHtml = renderToStaticMarkup(
      createElement(Chip, { label: 'Jedi', onClick: () => {} }),
    );
    expect(inactiveHtml).toContain('text-text-muted');
    expect(inactiveHtml).not.toContain('bg-accent/15');
  });

  it('applies the accent prop as the identity stripe color via inline style', () => {
    // Tailwind can't resolve dynamic CSS color values at build time;
    // accent must reach the DOM via inline style. We verify the
    // stripe element carries the supplied color string somewhere
    // in its inline style attribute.
    const html = renderToStaticMarkup(
      createElement(Chip, {
        label: 'Custom',
        accent: 'rgb(255, 100, 200)',
        active: true,
        onClick: () => {},
      }),
    );
    expect(html).toContain('rgb(255, 100, 200)');
  });

  it('falls back to var(--accent) when no accent prop is provided', () => {
    // When the parent doesn't supply a per-chip identity color, the
    // stripe should still render — using the global accent token —
    // so the chip is visually identifiable even without context.
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Default', onClick: () => {} }),
    );
    expect(html).toContain('rgb(var(--accent))');
  });

  it('reflects active state in aria-pressed by default', () => {
    const activeHtml = renderToStaticMarkup(
      createElement(Chip, { label: 'On', active: true, onClick: () => {} }),
    );
    expect(activeHtml).toMatch(/aria-pressed="true"/);

    const inactiveHtml = renderToStaticMarkup(
      createElement(Chip, { label: 'Off', onClick: () => {} }),
    );
    expect(inactiveHtml).toMatch(/aria-pressed="false"/);
  });

  it('honors ariaPressed override when explicitly provided', () => {
    // For radiogroup-style uses where the parent sets aria semantics
    // separately, the chip should honor an explicit override even if
    // the active flag flips on / off.
    const html = renderToStaticMarkup(
      createElement(Chip, {
        label: 'Radio',
        active: true,
        ariaPressed: false,
        onClick: () => {},
      }),
    );
    expect(html).toMatch(/aria-pressed="false"/);
  });

  it('meets the WCAG 44 × 44 touch target floor via min-h', () => {
    // `min-h-[44px]` is the floor — the rendered button can grow
    // taller (subtitle / icon both push height up) but must never
    // shrink below 44px for touch safety.
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Touch', onClick: () => {} }),
    );
    expect(html).toContain('min-h-[44px]');
  });

  it('applies scroll-snap-align center so it snaps when in a strip', () => {
    // Critical for the ChipStrip scroll-snap behavior — without
    // this on each child, the strip would scroll freely.
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Snap', onClick: () => {} }),
    );
    expect(html).toMatch(/scroll-snap-align:center/);
  });

  it('exposes a focus-visible ring for keyboard users', () => {
    // Per-app convention; matches every other primitive in the
    // editor (CommandPalette, MiniGalleryPicker, etc.).
    const html = renderToStaticMarkup(
      createElement(Chip, { label: 'Focus', onClick: () => {} }),
    );
    expect(html).toContain('focus-visible:ring-1');
    expect(html).toContain('focus-visible:ring-accent');
  });
});
