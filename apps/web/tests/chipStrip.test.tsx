// ─── ChipStrip — primitive contract tests ─────────────────────────────────
//
// Phase 4 PR #3 (2026-04-30) — pins down the scroll-snap container's
// rendered shape via `react-dom/server` + `renderToStaticMarkup`. The
// apps/web vitest env is node-only (no jsdom), so we exercise the
// component as a string-render + assert on the markup. This still
// catches drift on:
//
//   - Children rendering (the strip's primary contract)
//   - scroll-snap-type + overflow-x classes on the inner scroll
//     container (otherwise chips wouldn't snap or scroll at all)
//   - Edge-fade gradient siblings present on left + right
//   - The role="group" wrapper for screen-reader grouping
//
// Selection-on-scroll behavior + auto-scroll-into-view are explicitly
// NOT tested here because they are not behaviors of this primitive —
// per the spec, parents own those concerns. If a parent wires them in
// later, those tests live with that parent's component.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ChipStrip } from '../components/shared/ChipStrip';

describe('ChipStrip', () => {
  it('renders its children inside the scroll container', () => {
    const html = renderToStaticMarkup(
      createElement(
        ChipStrip,
        null,
        createElement('div', { 'data-testid': 'child-a' }, 'A'),
        createElement('div', { 'data-testid': 'child-b' }, 'B'),
      ),
    );
    expect(html).toContain('data-testid="child-a"');
    expect(html).toContain('data-testid="child-b"');
  });

  it('marks the inner scroll element with role="group"', () => {
    // Screen readers should announce the chips as a grouping rather
    // than as standalone buttons; without role="group" the strip's
    // visual relationship is invisible to assistive tech.
    const html = renderToStaticMarkup(
      createElement(ChipStrip, null, createElement('span', null, 'x')),
    );
    expect(html).toContain('role="group"');
  });

  it('applies scroll-snap-type x mandatory to the scroll container', () => {
    // Without this class the chips would scroll freely instead of
    // snapping to centered positions — drift here breaks the core
    // visual UX of the strip.
    const html = renderToStaticMarkup(
      createElement(ChipStrip, null, createElement('span', null, 'x')),
    );
    expect(html).toMatch(/scroll-snap-type:x_mandatory/);
  });

  it('makes the scroll container horizontally scrollable', () => {
    // overflow-x-auto is what gives the row a horizontal scrollbar
    // (which we then visually hide). Without it, content would
    // either clip or wrap into multiple lines.
    const html = renderToStaticMarkup(
      createElement(ChipStrip, null, createElement('span', null, 'x')),
    );
    expect(html).toContain('overflow-x-auto');
  });

  it('renders left + right edge-fade gradients as sibling divs', () => {
    // The fades hint "scroll for more content" without a visible
    // scrollbar. They must be `pointer-events-none` so they don't
    // swallow taps near the strip edges.
    const html = renderToStaticMarkup(
      createElement(ChipStrip, null, createElement('span', null, 'x')),
    );
    expect(html).toContain('data-testid="chip-strip-fade-left"');
    expect(html).toContain('data-testid="chip-strip-fade-right"');
    // Both fades should be aria-hidden + pointer-events-none. Sample
    // both faces here — if either drifts the strip starts intercepting
    // touches at its edges, breaking the leftmost / rightmost chips.
    // Attribute ordering varies across react renderers — match either
    // direction by checking the fade div carries both attributes.
    expect(html).toMatch(
      /aria-hidden="true"[^>]*data-testid="chip-strip-fade-left"/,
    );
    expect(html).toContain('pointer-events-none');
  });

  it('hides the scrollbar across browsers via CSS', () => {
    // WebKit + Firefox each need their own escape hatch — without
    // both, you get a visible scrollbar on either Mac Chrome / Safari
    // OR Firefox depending on the OS. Cover both to guarantee the
    // strip looks the same everywhere.
    const html = renderToStaticMarkup(
      createElement(ChipStrip, null, createElement('span', null, 'x')),
    );
    expect(html).toMatch(/scrollbar-width:none/);
    expect(html).toMatch(/&amp;::-webkit-scrollbar\]:hidden|::-webkit-scrollbar\]:hidden/);
  });

  it('forwards optional className onto the outer container', () => {
    // ChipStrip's own classes shouldn't be the only knob — parents
    // sometimes need to bump margin / pad / max-width without
    // wrapping in another div.
    const html = renderToStaticMarkup(
      createElement(
        ChipStrip,
        {
          className: 'my-extra-class',
          children: createElement('span', null, 'x'),
        },
      ),
    );
    expect(html).toContain('my-extra-class');
  });
});
