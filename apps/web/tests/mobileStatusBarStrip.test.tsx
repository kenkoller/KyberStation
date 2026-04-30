// ─── MobileStatusBarStrip — Phase 4.2 (2026-04-30) ──────────────────────
//
// SSR shape contract for the mobile status-bar wrapper that activates
// StatusBar's `mode="scroll"` rendering. Per "Claude Design Mobile
// handoff/HANDOFF.md" Q3:
//   - 36px tall, horizontally scrollable, mask-image right-edge fade
//   - All 11 desktop segments preserved (UTC + Build visible too)
//
// Coverage:
//   1. Renders the same status role as the underlying StatusBar.
//   2. Adds the mobile-statusbar-scroll class hook.
//   3. Includes overflow-x:auto in className.
//   4. Honors --statusbar-h via inline height style.
//   5. Inline style includes mask-image (scroll-affordance fade).
//   6. UTC segment is present (proving wideOnly suppression is
//      bypassed by mode='scroll').

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MobileStatusBarStrip } from '../components/layout/mobile/MobileStatusBarStrip';

describe('MobileStatusBarStrip', () => {
  it('renders role="status" (inherited from StatusBar)', () => {
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Status bar"');
  });

  it('adds the mobile-statusbar-scroll class hook', () => {
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    expect(html).toContain('mobile-statusbar-scroll');
  });

  it('renders horizontal scroll classes (overflow-x-auto)', () => {
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('overflow-y-hidden');
  });

  it('honors --statusbar-h via inline height', () => {
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    expect(html).toMatch(/height:var\(--statusbar-h[^)]*\)/);
  });

  it('inlines mask-image for the right-edge scroll fade', () => {
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    // Camel-cased to maskImage in React → renders as `mask-image:...`
    // for the standard property and `-webkit-mask-image:...` for the
    // vendor-prefixed one. Match the standard one to keep the test
    // focused.
    expect(html).toContain('mask-image:linear-gradient');
  });

  it('renders the UTC segment (proves mode="scroll" bypasses wideOnly)', () => {
    // In default mode, the UTC segment carries `hidden wide:inline-flex`
    // and would not appear in narrow-viewport SSR. In scroll mode the
    // strip is horizontally scrollable so every segment renders. We
    // assert UTC is in the markup as a drift sentinel — if a future
    // refactor of StatusBar drops the mode prop, this test breaks.
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    expect(html).toContain('UTC');
    // And Build is also visible (always-on segment).
    expect(html).toContain('Build');
  });

  it('does NOT render the flex-1 spacer used in default mode', () => {
    // The spacer pushes UTC + Build to the right edge in default mode;
    // in scroll mode it would push them off the visible viewport before
    // the user can scroll to them.
    const html = renderToStaticMarkup(createElement(MobileStatusBarStrip));
    // No bare `<span class="flex-1"></span>` should appear in scroll
    // mode — match exactly to avoid false negatives.
    expect(html).not.toMatch(/<span class="flex-1">\s*<\/span>/);
  });
});
