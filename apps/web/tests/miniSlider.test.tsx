// ─── MiniSlider — Phase 4.3 (2026-04-30) ────────────────────────────────
//
// SSR shape contract for the QuickControls 2-col grid slider.
//
// Coverage:
//   1. Renders label + display value.
//   2. Underlying <input type="range"> with min/max/step + value.
//   3. ariaLabel default = "${label} slider".
//   4. data-color attribute reflects the color category.
//   5. Disabled state propagates to the input.
//   6. Fill width matches normalized value-percentage.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MiniSlider } from '../components/layout/mobile/MiniSlider';

describe('MiniSlider', () => {
  it('renders label and display value', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Hue',
        displayValue: '207',
        unit: '°',
        value: 207,
        min: 0,
        max: 359,
      }),
    );
    expect(html).toContain('>Hue<');
    expect(html).toContain('>207');
    expect(html).toContain('°');
  });

  it('renders an <input type="range"> with correct min/max/step/value', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Sat',
        displayValue: '100',
        value: 100,
        min: 0,
        max: 100,
        step: 1,
      }),
    );
    expect(html).toMatch(/<input[^>]*type="range"[^>]*>/);
    expect(html).toContain('min="0"');
    expect(html).toContain('max="100"');
    expect(html).toContain('step="1"');
    expect(html).toContain('value="100"');
  });

  it('defaults aria-label to "${label} slider"', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Shimmer',
        displayValue: '42',
        value: 0.42,
        min: 0,
        max: 1,
      }),
    );
    expect(html).toContain('aria-label="Shimmer slider"');
  });

  it('honors a custom ariaLabel prop', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Bright',
        displayValue: '85',
        value: 85,
        min: 0,
        max: 100,
        ariaLabel: 'Brightness 0 to 100 percent',
      }),
    );
    expect(html).toContain('aria-label="Brightness 0 to 100 percent"');
  });

  it('exposes data-color attribute reflecting the color category', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Tempo',
        displayValue: '96',
        value: 96,
        min: 0,
        max: 240,
        color: 'info',
      }),
    );
    expect(html).toContain('data-color="info"');
  });

  it('propagates disabled state to the input', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Tempo',
        displayValue: '—',
        value: 0,
        min: 0,
        max: 1,
        disabled: true,
      }),
    );
    // The input is rendered with the `disabled` HTML attribute.
    expect(html).toMatch(/<input[^>]*disabled/);
  });

  it('fill width matches the normalized value as a percentage', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSlider, {
        label: 'Hue',
        displayValue: '180',
        value: 180,
        min: 0,
        max: 360,
      }),
    );
    // 180 / 360 = 50%
    expect(html).toMatch(/mini-slider__fill[^"]*"[^>]*width:\s*50%/);
  });
});
