// ─── HeaderButton — basic render tests for the extracted primitive ───────────
//
// HeaderButton was extracted during the header-button-standardization pass to
// give all header interactive elements a consistent h-7, rounded-interactive,
// focus-visible ring, and variant styling. These tests pin the rendering
// contract so regressions in height, radius, or variant classes are caught.
//
// Node-only vitest env — uses renderToStaticMarkup (no jsdom needed).

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeaderButton } from '../components/layout/HeaderButton';

describe('HeaderButton', () => {
  it('renders a <button> element', () => {
    const html = renderToStaticMarkup(<HeaderButton>Click</HeaderButton>);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('Click');
  });

  it('applies h-7 height class', () => {
    const html = renderToStaticMarkup(<HeaderButton>Test</HeaderButton>);
    expect(html).toContain('h-7');
  });

  it('applies rounded-interactive border-radius token', () => {
    const html = renderToStaticMarkup(<HeaderButton>Test</HeaderButton>);
    expect(html).toContain('rounded-interactive');
  });

  it('applies focus-visible ring classes', () => {
    const html = renderToStaticMarkup(<HeaderButton>Test</HeaderButton>);
    expect(html).toContain('focus-visible:ring-1');
    expect(html).toContain('focus-visible:ring-accent/60');
  });

  it('uses default variant classes when no variant is specified', () => {
    const html = renderToStaticMarkup(<HeaderButton>Test</HeaderButton>);
    expect(html).toContain('border-border-subtle');
    expect(html).toContain('text-text-muted');
  });

  it('uses accent variant classes when variant="accent"', () => {
    const html = renderToStaticMarkup(
      <HeaderButton variant="accent">Test</HeaderButton>,
    );
    expect(html).toContain('border-accent/40');
    expect(html).toContain('text-accent');
  });

  it('uses px-2 padding by default', () => {
    const html = renderToStaticMarkup(<HeaderButton>Test</HeaderButton>);
    expect(html).toContain('px-2');
  });

  it('uses px-1.5 padding when iconOnly is true', () => {
    const html = renderToStaticMarkup(
      <HeaderButton iconOnly>Icon</HeaderButton>,
    );
    expect(html).toContain('px-1.5');
  });

  it('passes through additional className', () => {
    const html = renderToStaticMarkup(
      <HeaderButton className="custom-class">Test</HeaderButton>,
    );
    expect(html).toContain('custom-class');
  });

  it('passes through native button props like disabled and title', () => {
    const html = renderToStaticMarkup(
      <HeaderButton disabled title="My tooltip">
        Test
      </HeaderButton>,
    );
    expect(html).toContain('disabled');
    expect(html).toContain('My tooltip');
  });
});
