// ─── MobileInspectHUD — Phase 4.5 (2026-05-01) ──────────────────────────
//
// SSR shape contract for the floating zoom HUD rendered during
// Inspect mode.
//
// Coverage:
//   1. Renders a role="toolbar" with the zoom-controls aria-label.
//   2. Three zoom buttons present: 1× / 2.4× / 4×.
//   3. A 🎯 re-center button present.
//   4. Active zoom button reflects store state (data-active=true).
//   5. Each zoom button carries data-zoom-value matching its
//      InspectZoom value.
//   6. data-mobile-inspect-hud attr present (used by tap-outside
//      exit handler in MobileShell).

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Stub the inspect mode store so SSR snapshot reads non-default state.
const stubState = vi.hoisted(() => ({
  zoom: 1 as 1 | 2.4 | 4,
  setZoom: vi.fn(),
  setPanX: vi.fn(),
  recenter: vi.fn(),
  // Other store fields not read by the HUD; included for shape.
  isInspecting: true,
  panX: 0,
  originXFraction: 0.5,
  enter: vi.fn(),
  exit: vi.fn(),
}));

vi.mock('@/stores/inspectModeStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/inspectModeStore')>(
    '@/stores/inspectModeStore',
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useInspectModeStore(selector: (s: any) => unknown) {
    return selector(stubState);
  }
  // Mirror the .getState() escape hatch used by the HUD's setPanX(0)
  // call when changing zoom.
  useInspectModeStore.getState = () => stubState;
  return {
    ...actual,
    useInspectModeStore,
  };
});

import { MobileInspectHUD } from '@/components/layout/mobile/MobileInspectHUD';

describe('MobileInspectHUD', () => {
  it('renders role="toolbar" with the zoom-controls aria-label', () => {
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Blade zoom controls"');
  });

  it('exposes data-mobile-inspect-hud (tap-outside exit hook)', () => {
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toContain('data-mobile-inspect-hud');
  });

  it('renders three zoom buttons with correct data-zoom-value', () => {
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toContain('data-zoom-value="1"');
    expect(html).toContain('data-zoom-value="2.4"');
    expect(html).toContain('data-zoom-value="4"');
  });

  it('renders a 🎯 re-center button with data-recenter', () => {
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toContain('data-recenter');
    expect(html).toContain('aria-label="Re-center and reset zoom"');
  });

  it('marks the active zoom button via data-active', () => {
    stubState.zoom = 2.4;
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toMatch(
      /<button[^>]*data-zoom-value="2.4"[^>]*data-active="true"/,
    );
    // The other zoom buttons must NOT have data-active.
    expect(html).not.toMatch(
      /<button[^>]*data-zoom-value="1"[^>]*data-active="true"/,
    );
  });

  it('uses aria-pressed to communicate active state', () => {
    stubState.zoom = 4;
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    // JSX attribute order in MobileInspectHUD puts aria-pressed BEFORE
    // data-zoom-value, so the regex matches that direction.
    expect(html).toMatch(
      /<button[^>]*aria-pressed="true"[^>]*data-zoom-value="4"/,
    );
  });

  it('button labels render as 1× / 2.4× / 4×', () => {
    const html = renderToStaticMarkup(createElement(MobileInspectHUD));
    expect(html).toContain('>1×<');
    expect(html).toContain('>2.4×<');
    expect(html).toContain('>4×<');
  });
});
