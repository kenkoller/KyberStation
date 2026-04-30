// ─── ParameterSheetBody — Phase 4.4 (2026-04-30) ────────────────────────
//
// SSR shape contract for the default per-parameter body shell mounted
// inside ParameterSheet.
//
// Coverage:
//   1. Headline value display rendering with `formatDisplay`.
//   2. Range readouts at min + max.
//   3. Slider input with min/max/step/value.
//   4. Modulation v1.1 placeholder section is rendered.
//   5. Color category propagates to the fill style.
//   6. Optional `extra` slot mounts after modulation.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ParameterSheetBody } from '../components/layout/mobile/ParameterSheetBody';

describe('ParameterSheetBody', () => {
  function render(props?: Partial<Parameters<typeof ParameterSheetBody>[0]>) {
    return renderToStaticMarkup(
      createElement(ParameterSheetBody, {
        value: 207,
        min: 0,
        max: 359,
        step: 1,
        unit: '°',
        formatDisplay: (v: number) => Math.round(v).toString(),
        onChange: () => {},
        ...props,
      }),
    );
  }

  it('renders the headline value via formatDisplay', () => {
    const html = render();
    // Headline contains "207" (rounded value) + the unit.
    expect(html).toMatch(/>207</);
    expect(html).toContain('°');
  });

  it('renders a slider <input type="range"> with min/max/step/value', () => {
    const html = render({ value: 50, min: 0, max: 100, step: 1 });
    expect(html).toMatch(/<input[^>]*type="range"[^>]*>/);
    expect(html).toContain('min="0"');
    expect(html).toContain('max="100"');
    expect(html).toContain('step="1"');
    expect(html).toContain('value="50"');
  });

  it('renders Min · X / Max · Y range readouts', () => {
    const html = render({ value: 50, min: 0, max: 100, unit: '%' });
    expect(html).toMatch(/Min.*0.*%/s);
    expect(html).toMatch(/Max.*100.*%/s);
  });

  it('renders the v1.1 Modulation placeholder section', () => {
    const html = render();
    expect(html).toContain('data-parameter-sheet-modulation');
    expect(html).toContain('Modulation');
    expect(html).toContain('v1.1');
  });

  it('color category drives the fill / thumb / glow color', () => {
    const accentHtml = render({ color: 'accent' });
    const warmHtml = render({ color: 'warm' });
    expect(accentHtml).toContain('rgb(var(--accent))');
    expect(warmHtml).toContain('rgb(var(--accent-warm))');
  });

  it('mounts optional `extra` slot below the modulation section', () => {
    const html = render({
      extra: createElement('div', { 'data-testid': 'sheet-extra' }, 'extra'),
    });
    expect(html).toContain('data-testid="sheet-extra"');
    // Order check — modulation appears before extra.
    expect(html.indexOf('data-parameter-sheet-modulation')).toBeLessThan(
      html.indexOf('data-testid="sheet-extra"'),
    );
  });

  it('aria-label on the input is generic ("Edit parameter value")', () => {
    const html = render();
    expect(html).toContain('aria-label="Edit parameter value"');
  });

  it('headline uses tabular-nums for stable numeric width', () => {
    const html = render();
    expect(html).toMatch(/tabular-nums/);
  });
});
