// ─── ParameterSheet — Phase 4.4 (2026-04-30) ────────────────────────────
//
// Pure-helper + SSR-shape contract for the 3-stop bottom sheet
// primitive. Per "Claude Design Mobile handoff/HANDOFF.md" §"Q5":
//   - peek = 168px, full = min(92vh, 720px), closed = unmounted
//   - 48px drag threshold per stop transition
//   - drag-down past peek dismisses; drag-down at full snaps to peek
//   - drag-up past full clamps (no rubber band)
//
// State-machine + height math is pure — exported `resolveFullHeightPx`
// and `resolveDragSnap` so the matrix is pinned in vitest without
// rendering React. The full component contract is exercised via
// `renderToStaticMarkup` against `<ParameterSheetContent>` (the
// portal-free inner shell).

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  ParameterSheetContent,
  resolveFullHeightPx,
  resolveDragSnap,
  PEEK_HEIGHT_PX,
  FULL_HEIGHT_VH,
  FULL_HEIGHT_CAP_PX,
  STOP_THRESHOLD_PX,
  DISMISS_THRESHOLD_PX,
} from '../components/layout/mobile/ParameterSheet';

describe('resolveFullHeightPx', () => {
  it('returns 92vh on a tall viewport when 92vh < 720', () => {
    // 700 * 0.92 = 644 → less than 720 cap, so 644 wins
    expect(resolveFullHeightPx(700)).toBe(644);
  });

  it('caps at 720px on a very tall viewport', () => {
    // 1200 * 0.92 = 1104 → above the 720 cap
    expect(resolveFullHeightPx(1200)).toBe(720);
  });

  it('on a 812px (iPhone 13 Pro) viewport, full == 720 (cap wins)', () => {
    expect(resolveFullHeightPx(812)).toBe(720);
  });

  it('on a 568px (iPhone SE) viewport, full == 92vh (522px)', () => {
    expect(resolveFullHeightPx(568)).toBe(Math.round(568 * FULL_HEIGHT_VH));
  });
});

describe('resolveDragSnap — state machine', () => {
  // ── From peek ─────────────────────────────────────────────────
  it('peek + small drag-down (<48px) stays at peek', () => {
    expect(resolveDragSnap('peek', 20)).toBe('peek');
    expect(resolveDragSnap('peek', 47)).toBe('peek');
  });

  it('peek + drag-down past dismiss threshold returns null (close)', () => {
    expect(resolveDragSnap('peek', DISMISS_THRESHOLD_PX + 1)).toBeNull();
    expect(resolveDragSnap('peek', 200)).toBeNull();
  });

  it('peek + drag-up past stop threshold snaps to full', () => {
    expect(resolveDragSnap('peek', -(STOP_THRESHOLD_PX + 1))).toBe('full');
    expect(resolveDragSnap('peek', -200)).toBe('full');
  });

  it('peek + small drag-up (<48px abs) stays at peek', () => {
    expect(resolveDragSnap('peek', -20)).toBe('peek');
    expect(resolveDragSnap('peek', -47)).toBe('peek');
  });

  // ── From full ─────────────────────────────────────────────────
  it('full + drag-down past stop threshold snaps to peek', () => {
    expect(resolveDragSnap('full', STOP_THRESHOLD_PX + 1)).toBe('peek');
    expect(resolveDragSnap('full', 200)).toBe('peek');
  });

  it('full + small drag-down (<48px) stays at full', () => {
    expect(resolveDragSnap('full', 20)).toBe('full');
    expect(resolveDragSnap('full', 47)).toBe('full');
  });

  it('full + drag-up clamps (stays at full, no rubber band)', () => {
    expect(resolveDragSnap('full', -100)).toBe('full');
    expect(resolveDragSnap('full', -1)).toBe('full');
  });

  it('full does NOT close on a single drag-down — only peek dismisses', () => {
    // Even a huge drag-down from full snaps to peek, not null.
    expect(resolveDragSnap('full', 500)).toBe('peek');
  });
});

describe('Constants — handoff compliance', () => {
  it('PEEK_HEIGHT_PX matches the handoff Q5 spec', () => {
    expect(PEEK_HEIGHT_PX).toBe(168);
  });

  it('FULL_HEIGHT_VH equals 0.92 (handoff "92vh")', () => {
    expect(FULL_HEIGHT_VH).toBe(0.92);
  });

  it('FULL_HEIGHT_CAP_PX equals 720 (handoff cap)', () => {
    expect(FULL_HEIGHT_CAP_PX).toBe(720);
  });

  it('drag thresholds are 48px (handoff)', () => {
    expect(STOP_THRESHOLD_PX).toBe(48);
    expect(DISMISS_THRESHOLD_PX).toBe(48);
  });
});

describe('ParameterSheetContent — SSR shape', () => {
  function render(open: boolean, props?: Partial<Parameters<typeof ParameterSheetContent>[0]>) {
    return renderToStaticMarkup(
      createElement(ParameterSheetContent, {
        open,
        onClose: () => {},
        title: 'Edit Hue',
        children: createElement('div', { 'data-testid': 'sheet-body' }, 'body'),
        ...props,
      }),
    );
  }

  it('renders nothing when open=false', () => {
    expect(render(false)).toBe('');
  });

  it('renders role="dialog" + aria-labelledby when open', () => {
    const html = render(true);
    expect(html).toContain('role="dialog"');
    expect(html).toMatch(/aria-labelledby="kyberstation-param-sheet-/);
  });

  it('renders the title in an <h2>', () => {
    const html = render(true);
    expect(html).toMatch(/<h2[^>]*>Edit Hue<\/h2>/);
  });

  it('renders the drag handle with aria-label', () => {
    const html = render(true);
    expect(html).toContain('aria-label="Drag to resize parameter sheet"');
  });

  it('renders a close button with aria-label', () => {
    const html = render(true);
    expect(html).toContain('aria-label="Close parameter sheet"');
  });

  it('marks data-state="peek" when initialState is peek (default)', () => {
    const html = render(true);
    expect(html).toContain('data-state="peek"');
  });

  it('marks data-state="full" when initialState is full', () => {
    const html = render(true, { initialState: 'full' });
    expect(html).toContain('data-state="full"');
  });

  it('passes children through to the body slot', () => {
    const html = render(true);
    expect(html).toContain('data-testid="sheet-body"');
  });

  it('default footer includes Reset + Done buttons', () => {
    const html = render(true);
    expect(html).toContain('>Reset<');
    expect(html).toContain('>Done<');
  });

  it('Reset button is disabled when onReset is omitted', () => {
    const html = render(true);
    // Match the `disabled` HTML attribute specifically (preceded by a
    // space, followed by `=""` or `>` or whitespace) — not "disabled:"
    // inside the Tailwind class string (`disabled:opacity-50`).
    expect(html).toMatch(/<button [^>]*\bdisabled(=""|\s|>)[^>]*>Reset<\/button>/);
  });

  it('Reset button is enabled when onReset is provided', () => {
    const html = render(true, { onReset: () => {} });
    expect(html).not.toMatch(/<button [^>]*\bdisabled(=""|\s|>)[^>]*>Reset<\/button>/);
  });

  it('custom footer overrides the default Reset/Done pair', () => {
    const html = render(true, {
      footer: createElement('button', { 'data-testid': 'custom-footer' }, 'Apply'),
    });
    expect(html).toContain('data-testid="custom-footer"');
    expect(html).not.toContain('>Reset<');
  });

  it('aria-modal reflects the snap state (true at full, false at peek)', () => {
    expect(render(true, { initialState: 'peek' })).toContain('aria-modal="false"');
    expect(render(true, { initialState: 'full' })).toContain('aria-modal="true"');
  });

  it('honors --sheet-radius / --sheet-shadow tokens via inline style', () => {
    const html = render(true);
    expect(html).toContain('var(--sheet-radius');
    expect(html).toContain('var(--sheet-shadow');
  });
});
