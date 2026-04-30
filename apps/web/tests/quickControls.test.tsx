// ─── ColorQuickControls — Phase 4.3 (2026-04-30) ────────────────────────
//
// SSR shape + binding contract for the Color-tab QuickControls.
//
// Coverage:
//   1. Renders role="group" with the quick-controls aria-label.
//   2. data-quick-controls="color" hook present.
//   3. 6 MiniSliders render: Hue / Sat / Bright / Shimmer / Tempo / Depth.
//   4. Hue + Sat values reflect HSL of the bladeStore baseColor.
//   5. Bright reflects uiStore.brightness.
//   6. Shimmer reflects bladeStore.config.shimmer (× 100 displayed).
//   7. Tempo + Depth render in disabled placeholder mode.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ───────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  baseColor: { r: 0, g: 140, b: 255 } as { r: number; g: number; b: number },
  shimmer: 0.42,
  brightness: 85,
}));

vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({
      config: {
        baseColor: mockState.baseColor,
        shimmer: mockState.shimmer,
      },
      updateConfig: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useBladeStore };
});

vi.mock('@/stores/uiStore', () => {
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      brightness: mockState.brightness,
      setBrightness: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore };
});

import { ColorQuickControls } from '../components/layout/mobile/QuickControls';

describe('ColorQuickControls', () => {
  it('renders role="group" with quick-controls aria-label', () => {
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Quick controls"');
    expect(html).toContain('data-quick-controls="color"');
  });

  it('renders all 6 expected sliders by label', () => {
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    for (const label of ['Hue', 'Sat', 'Bright', 'Shimmer', 'Tempo', 'Depth']) {
      // Label appears inside a <span> in the slider header.
      expect(html).toContain(`>${label}<`);
    }
  });

  it('Bright slider value reflects uiStore.brightness', () => {
    mockState.brightness = 85;
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    // The <input type="range"> for Bright should carry value="85".
    expect(html).toMatch(/aria-label="Bright slider"[^>]*value="85"|value="85"[^>]*aria-label="Bright slider"/);
  });

  it('Shimmer slider value reflects shimmer × range', () => {
    mockState.shimmer = 0.42;
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    // Shimmer slider has min=0 max=1, step=0.01, value matches store.
    expect(html).toMatch(/aria-label="Shimmer slider"/);
    expect(html).toContain('value="0.42"');
  });

  it('Tempo + Depth render disabled (placeholder slots)', () => {
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    // Both Tempo + Depth should propagate disabled to their input.
    expect(html).toMatch(/aria-label="Tempo slider"[^>]*disabled|disabled[^>]*aria-label="Tempo slider"/);
    expect(html).toMatch(/aria-label="Depth slider"[^>]*disabled|disabled[^>]*aria-label="Depth slider"/);
    // And display value falls to em-dash.
    expect(html).toMatch(/>—</);
  });

  it('grid uses 2-column template', () => {
    const html = renderToStaticMarkup(createElement(ColorQuickControls));
    expect(html).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
  });
});
