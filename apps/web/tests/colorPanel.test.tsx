// ─── ColorPanel — merged ColorPanel + GradientBuilder regression tests ───
//
// v0.14.0 left-rail overhaul (2026-04-24): ColorPanel absorbed the former
// GradientBuilder panel. The gradient region is conditional on the active
// channel — only the `baseColor` channel shows the gradient editor. These
// tests pin that contract.
//
// The vitest env for apps/web is node-only (no jsdom), matching the rest
// of apps/web/tests. We test via three layers:
//
//   1. `shouldShowGradient` + `GRADIENT_ENABLED_CHANNELS` — pure helpers
//      exported from ColorPanel. The visibility logic for the gradient
//      region is a pure function of the active channel, so we verify it
//      without rendering.
//
//   2. `renderToStaticMarkup` of <ColorPanel /> with hoisted mocks of
//      `useUIStore` + `useBladeStore`. We can't mutate Zustand state and
//      have it re-read by the SSR selector under node — `useSyncExternalStore`
//      caches `getServerSnapshot` per render. Mocking the store hooks is
//      the canonical way to drive multiple render variants from one suite.
//
//   3. Direct mock-state mutation — gradient stops are persisted on the
//      bladeStore's `config.gradientStops`. We assert the shape the codegen
//      consumes is the shape the gradient region writes back.
//
// HelpTooltip + canvas useEffect are inert under static markup render —
// useEffect doesn't fire in renderToStaticMarkup, so the color wheel
// canvas's drawing side-effects don't run, exactly what we want for a
// node-only test environment.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Hoisted mock state — mutate before each render ──────────────────
//
// We hoist the mock state object via `vi.hoisted` so the `vi.mock`
// factory below (which is also hoisted) can capture a stable reference
// to it. Tests then mutate the same object via the exported handles
// without re-running the factory.

const mockState = vi.hoisted(() => ({
  activeColorChannel: 'baseColor' as string,
  config: {
    name: 'Obi-Wan ANH',
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
  } as Record<string, unknown>,
}));

// Replace useUIStore so its selector reads from `mockState.activeColorChannel`.
vi.mock('@/stores/uiStore', () => {
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      activeColorChannel: mockState.activeColorChannel,
      setActiveColorChannel: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    setState: (partial: Record<string, unknown>) => void;
    getState: () => Record<string, unknown>;
  };
  useUIStore.setState = (partial) => {
    if (typeof partial === 'object' && partial !== null) {
      Object.assign(mockState, partial);
    }
  };
  useUIStore.getState = () => ({ activeColorChannel: mockState.activeColorChannel });
  return { useUIStore };
});

// Replace useBladeStore so the selector reads from `mockState.config`.
vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({
      config: mockState.config,
      setColor: () => {},
      updateConfig: () => {},
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    setState: (partial: Record<string, unknown>) => void;
    getState: () => Record<string, unknown>;
  };
  useBladeStore.setState = (partial) => {
    if (typeof partial === 'object' && partial !== null && 'config' in partial) {
      mockState.config = partial.config as Record<string, unknown>;
    }
  };
  useBladeStore.getState = () => ({ config: mockState.config });
  return { useBladeStore };
});

// Silence playUISound — no Web Audio under node.
vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

// ── Imports under test ──────────────────────────────────────────────
// (After the mocks above; ColorPanel will resolve to the mocked stores.)

import {
  ColorPanel,
  shouldShowGradient,
  GRADIENT_ENABLED_CHANNELS,
} from '@/components/editor/ColorPanel';

// ── Helpers ────────────────────────────────────────────────────────

function html(): string {
  return renderToStaticMarkup(createElement(ColorPanel));
}

const DEFAULT_CONFIG = { ...mockState.config };

beforeEach(() => {
  // Reset the mock state to defaults so each test starts from a known
  // shape. Tests that need a different channel mutate `activeColorChannel`
  // directly; tests that need a different config replace `config`.
  mockState.activeColorChannel = 'baseColor';
  mockState.config = { ...DEFAULT_CONFIG };
});

// ─── Pure helpers ──────────────────────────────────────────────────

describe('ColorPanel — gradient visibility helpers', () => {
  it('GRADIENT_ENABLED_CHANNELS contains baseColor only', () => {
    expect(GRADIENT_ENABLED_CHANNELS).toEqual(['baseColor']);
  });

  it('shouldShowGradient returns true for baseColor', () => {
    expect(shouldShowGradient('baseColor')).toBe(true);
  });

  it('shouldShowGradient returns false for clashColor', () => {
    expect(shouldShowGradient('clashColor')).toBe(false);
  });

  it('shouldShowGradient returns false for lockupColor', () => {
    expect(shouldShowGradient('lockupColor')).toBe(false);
  });

  it('shouldShowGradient returns false for blastColor', () => {
    expect(shouldShowGradient('blastColor')).toBe(false);
  });

  it('shouldShowGradient returns false for unknown channels', () => {
    expect(shouldShowGradient('dragColor')).toBe(false);
    expect(shouldShowGradient('meltColor')).toBe(false);
    expect(shouldShowGradient('not-a-channel')).toBe(false);
  });
});

// ─── Channel selector chrome ───────────────────────────────────────

describe('ColorPanel — channel selector', () => {
  it('renders all four primary channel buttons', () => {
    const markup = html();
    expect(markup).toContain('>Base<');
    expect(markup).toContain('>Clash<');
    expect(markup).toContain('>Lockup<');
    expect(markup).toContain('>Blast<');
  });

  it('does not render legacy drag/melt/lightning channels', () => {
    const markup = html();
    expect(markup).not.toContain('>Drag<');
    expect(markup).not.toContain('>Melt<');
    expect(markup).not.toContain('>Lightning Block<');
  });

  it('renders the gradient divider on every channel', () => {
    for (const ch of ['baseColor', 'clashColor', 'lockupColor', 'blastColor']) {
      mockState.activeColorChannel = ch;
      const markup = html();
      expect(markup).toContain('data-testid="gradient-divider"');
      expect(markup).toContain('Gradient (base channel only)');
    }
  });
});

// ─── Channel switching shows / hides gradient region ───────────────

describe('ColorPanel — gradient region channel scope', () => {
  it('renders the gradient region when active channel is Base', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    expect(markup).toContain('data-testid="gradient-region"');
    expect(markup).toContain('aria-label="Interpolation mode"');
  });

  it('hides the gradient region when active channel is Clash', () => {
    mockState.activeColorChannel = 'clashColor';
    const markup = html();
    expect(markup).not.toContain('data-testid="gradient-region"');
    expect(markup).not.toContain('aria-label="Interpolation mode"');
  });

  it('hides the gradient region when active channel is Lockup', () => {
    mockState.activeColorChannel = 'lockupColor';
    const markup = html();
    expect(markup).not.toContain('data-testid="gradient-region"');
  });

  it('hides the gradient region when active channel is Blast', () => {
    mockState.activeColorChannel = 'blastColor';
    const markup = html();
    expect(markup).not.toContain('data-testid="gradient-region"');
  });

  it('the divider sets aria-hidden when gradient is suppressed', () => {
    mockState.activeColorChannel = 'clashColor';
    const markup = html();
    expect(markup).toMatch(
      /data-testid="gradient-divider"[^>]*aria-hidden="true"/,
    );
  });

  it('the divider drops aria-hidden on Base channel', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    // React renders aria-hidden={false} as `aria-hidden="false"`.
    expect(markup).toMatch(
      /data-testid="gradient-divider"[^>]*aria-hidden="false"/,
    );
  });
});

// ─── Gradient interaction surface (Base channel only) ───────────────

describe('ColorPanel — gradient interactions', () => {
  it('renders the bar with a click-to-add affordance on Base', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    expect(markup).toMatch(
      /role="application"[^>]*aria-label="Gradient bar — click to add color stops"/,
    );
  });

  it('renders min-2 default stops on Base when none persisted', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    expect(markup).toContain('aria-label="Color for gradient stop 1"');
    expect(markup).toContain('aria-label="Color for gradient stop 2"');
  });

  it('renders all three interpolation modes', () => {
    mockState.activeColorChannel = 'baseColor';
    const markup = html();
    expect(markup).toContain('>Linear<');
    expect(markup).toContain('>Smooth<');
    expect(markup).toContain('>Step<');
  });

  it('reflects persisted gradient stops in the markup', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0 } },
        { position: 0.5, color: { r: 128, g: 128, b: 128 } },
        { position: 1, color: { r: 255, g: 255, b: 255 } },
      ],
    };
    const markup = html();
    expect(markup).toContain('aria-label="Color for gradient stop 1"');
    expect(markup).toContain('aria-label="Color for gradient stop 2"');
    expect(markup).toContain('aria-label="Color for gradient stop 3"');
  });

  it('renders the Mode picker label only inside the gradient region', () => {
    mockState.activeColorChannel = 'baseColor';
    expect(html()).toContain('>Mode<');

    mockState.activeColorChannel = 'clashColor';
    expect(html()).not.toContain('>Mode<');
  });

  it('reflects persisted interpolation mode in the radio state', () => {
    mockState.activeColorChannel = 'baseColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      gradientInterpolation: 'smooth',
    };
    const markup = html();
    // The Smooth radio is checked, Linear is not.
    expect(markup).toMatch(
      /role="radio" aria-checked="true"[^>]*>Smooth</,
    );
    expect(markup).toMatch(
      /role="radio" aria-checked="false"[^>]*>Linear</,
    );
  });
});

// ─── Picker still functions on non-Base channels ───────────────────

describe('ColorPanel — channel scoping does not break the picker', () => {
  it('renders HSL sliders regardless of active channel', () => {
    for (const ch of ['baseColor', 'clashColor', 'lockupColor', 'blastColor']) {
      mockState.activeColorChannel = ch;
      const markup = html();
      expect(markup).toContain('id="hsl-hue"');
      expect(markup).toContain('id="hsl-saturation"');
      expect(markup).toContain('id="hsl-lightness"');
    }
  });

  it('renders RGB sliders regardless of active channel', () => {
    for (const ch of ['baseColor', 'clashColor', 'lockupColor', 'blastColor']) {
      mockState.activeColorChannel = ch;
      const markup = html();
      expect(markup).toContain('id="rgb-r"');
      expect(markup).toContain('id="rgb-g"');
      expect(markup).toContain('id="rgb-b"');
    }
  });

  it('reflects the clash color in the swatch when on Clash channel', () => {
    mockState.activeColorChannel = 'clashColor';
    mockState.config = {
      ...DEFAULT_CONFIG,
      clashColor: { r: 255, g: 0, b: 0 },
    };
    const markup = html();
    // The picker swatch + RGB readout reflect the clash value.
    expect(markup).toContain('Rgb&lt;255,0,0&gt;');
  });

  it('coerces unknown channels back to baseColor without crashing', () => {
    // Legacy / orphaned activeColorChannel values should fall back so
    // the panel keeps rendering. The gradient region also re-appears
    // (since the effective channel is baseColor).
    mockState.activeColorChannel = 'dragColor';
    const markup = html();
    expect(markup).toContain('data-testid="gradient-region"');
  });
});
