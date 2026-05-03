// @vitest-environment jsdom
//
// ─── LiveBladePreview — render contract + reduced-motion fallback ───
//
// SSR-first contract: defaults to the static gradient bar (no canvas)
// so the Server Components pass and the `aria-hidden` decorative role
// stays honest. Asserts the render shape, the label slot, the
// reduced-motion + perf-lite fallback signals, and that the engine
// loop never spins up in any of those branches.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { BladeConfig } from '@kyberstation/engine';

import { LiveBladePreview } from '@/components/marketing/LiveBladePreview';

const baseDemoConfig = (): BladeConfig =>
  ({
    name: 'demo',
    baseColor: { r: 22, g: 114, b: 243 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.07,
    ledCount: 144,
    swingFxIntensity: 0,
    noiseLevel: 0,
  }) as BladeConfig;

describe('LiveBladePreview', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('perf-lite', 'reduced-motion');
    document.body.classList.remove('reduced-motion');
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
    });
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: false,
      media: q,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders aria-hidden decorative wrapper with the label data attribute', () => {
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="DEMO" />,
    );
    const wrapper = container.querySelector('[data-preview-label="DEMO"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the label text below the blade when label is provided', () => {
    const { getByText } = render(
      <LiveBladePreview config={baseDemoConfig()} label="STABLE / AZURE" />,
    );
    expect(getByText('STABLE / AZURE')).toBeTruthy();
  });

  it('omits the label slot entirely when no label prop is passed', () => {
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} />,
    );
    expect(container.querySelector('.dot-matrix')).toBeNull();
  });

  it('keeps the static fallback when document.documentElement has perf-lite', () => {
    document.documentElement.classList.add('perf-lite');
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="PERF-LITE" />,
    );
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('div.rounded-full')).not.toBeNull();
  });

  it('keeps the static fallback when reduced-motion class is set on documentElement', () => {
    document.documentElement.classList.add('reduced-motion');
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="RM-DOC" />,
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('keeps the static fallback when reduced-motion class is set on body', () => {
    document.body.classList.add('reduced-motion');
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="RM-BODY" />,
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('keeps the static fallback when prefers-reduced-motion media query matches', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="RM-MQ" />,
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('respects the width prop on the wrapper inner box', () => {
    const { container } = render(
      <LiveBladePreview config={baseDemoConfig()} label="W" width={240} />,
    );
    const inner = container.querySelector('div[style*="width: 240px"]');
    expect(inner).not.toBeNull();
  });

  it('forwards a custom className onto the decorative wrapper', () => {
    const { container } = render(
      <LiveBladePreview
        config={baseDemoConfig()}
        label="CN"
        className="extra-class-here"
      />,
    );
    const wrapper = container.querySelector('.extra-class-here');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  });
});
