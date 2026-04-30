// ─── ColorRail — Phase 4.3 (2026-04-30) ─────────────────────────────────
//
// SSR shape contract for the 8-swatch + overflow color rail at the top
// of the mobile Color tab body.
//
// Coverage:
//   1. Renders role="group" with the quick-color-picker aria-label.
//   2. 8 swatch buttons with stable data-swatch-id values.
//   3. + More overflow trigger present.
//   4. Active swatch — when bladeStore.config.baseColor matches one of
//      the canonical 8 — has data-active=true.
//   5. Custom color (far from every canonical) leaves no active.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state ───────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  baseColor: { r: 74, g: 158, b: 255 } as { r: number; g: number; b: number },
}));

vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({
      config: { baseColor: mockState.baseColor },
      updateConfig: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useBladeStore };
});

vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

import { ColorRail, COLOR_RAIL_SWATCHES } from '../components/layout/mobile/ColorRail';

describe('ColorRail', () => {
  it('exports 8 canonical swatches', () => {
    expect(COLOR_RAIL_SWATCHES.length).toBe(8);
  });

  it('every swatch has a unique id + label + RGB triple', () => {
    const ids = new Set(COLOR_RAIL_SWATCHES.map((s) => s.id));
    expect(ids.size).toBe(COLOR_RAIL_SWATCHES.length);
    for (const sw of COLOR_RAIL_SWATCHES) {
      expect(sw.label.length).toBeGreaterThan(0);
      expect(sw.rgb.r).toBeGreaterThanOrEqual(0);
      expect(sw.rgb.g).toBeGreaterThanOrEqual(0);
      expect(sw.rgb.b).toBeGreaterThanOrEqual(0);
    }
  });

  it('renders role="group" with quick-color-picker aria-label', () => {
    mockState.baseColor = { r: 74, g: 158, b: 255 };
    const html = renderToStaticMarkup(createElement(ColorRail));
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Quick color picker"');
  });

  it('renders 8 swatch buttons with data-swatch-id', () => {
    mockState.baseColor = { r: 74, g: 158, b: 255 };
    const html = renderToStaticMarkup(createElement(ColorRail));
    for (const sw of COLOR_RAIL_SWATCHES) {
      expect(html).toContain(`data-swatch-id="${sw.id}"`);
    }
  });

  it('renders the "+ More" overflow trigger', () => {
    mockState.baseColor = { r: 74, g: 158, b: 255 };
    const html = renderToStaticMarkup(createElement(ColorRail));
    expect(html).toContain('data-color-rail-more');
    expect(html).toContain('aria-label="Open full color picker"');
  });

  it('marks the closest matching swatch as active when baseColor matches', () => {
    mockState.baseColor = { r: 74, g: 158, b: 255 }; // exactly Jedi Blue
    const html = renderToStaticMarkup(createElement(ColorRail));
    // jedi-blue swatch should be the active one.
    expect(html).toMatch(
      /<button[^>]*data-swatch-id="jedi-blue"[^>]*data-active="true"/,
    );
  });

  it('marks no swatch active when baseColor is far from every canonical', () => {
    // A muddy near-black grey — far from every canonical swatch.
    mockState.baseColor = { r: 60, g: 60, b: 60 };
    const html = renderToStaticMarkup(createElement(ColorRail));
    const activeCount = (html.match(/data-active="true"/g) ?? []).length;
    expect(activeCount).toBe(0);
  });

  it('every swatch button has aria-pressed', () => {
    mockState.baseColor = { r: 74, g: 158, b: 255 };
    const html = renderToStaticMarkup(createElement(ColorRail));
    // 8 swatches × aria-pressed (true|false). The "+ More" button does
    // NOT carry aria-pressed (it's a trigger, not a toggle).
    const matches = html.match(/aria-pressed="(true|false)"/g) ?? [];
    expect(matches.length).toBe(COLOR_RAIL_SWATCHES.length);
  });
});
