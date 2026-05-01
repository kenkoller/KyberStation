// ─── lib/gradient — extraction regression tests ─────────────────────────
//
// Pin the contract for the shared gradient editor module (lib/gradient).
// Previously the editor existed as two near-duplicate components
// (`GradientBuilder.tsx` + `ColorPanel.tsx`'s private `GradientRegion()`).
// The 2026-05-01 consumer-migration consolidated both into `lib/gradient/`.
//
// What we cover here:
//   1. Pure helpers — `rgbToHex` / `hexToRgb` round-trip + clamping +
//      malformed-input fallback.
//   2. Constants — `DEFAULT_GRADIENT_STOPS` + `INTERPOLATION_OPTIONS`
//      shape stays stable (these are part of the public surface).
//   3. SSR markup — `<GradientEditor>` produces the legacy
//      `data-testid="gradient-region"` hook; `<GradientEditorPanel>`
//      renders inside CollapsibleSection with the expected title.
//   4. `<InterpolationPicker>` — renders the three modes with
//      `role="radio"` + correct `aria-checked` + accent classes.
//
// Hook + interactive behavior (drag-to-reposition, click-to-add-stop,
// keyboard-delete) is exercised end-to-end in the live editor — not in
// SSR — and the underlying state machine is unchanged from the legacy
// implementation, so we don't re-test the parts the user-facing
// `colorPanel.test.tsx` already pinned via `data-testid="gradient-region"`.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Mock the bladeStore so the editor renders against a known config ──

const mockState = vi.hoisted(() => ({
  config: {
    name: 'Obi-Wan ANH',
    baseColor: { r: 0, g: 140, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
    gradientStops: undefined as unknown,
    gradientInterpolation: undefined as unknown,
  } as Record<string, unknown>,
}));

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
  useBladeStore.setState = () => {};
  useBladeStore.getState = () => ({ config: mockState.config });
  return { useBladeStore };
});

import {
  DEFAULT_GRADIENT_STOPS,
  GradientEditor,
  GradientEditorPanel,
  INTERPOLATION_OPTIONS,
  InterpolationPicker,
  hexToRgb,
  rgbToHex,
  type GradientInterpolation,
  type GradientStop,
} from '@/lib/gradient';

// ── 1. Pure helpers ─────────────────────────────────────────────────────

describe('lib/gradient — colorUtils', () => {
  describe('rgbToHex', () => {
    it('converts standard 8-bit RGB to lowercase hex', () => {
      expect(rgbToHex(0, 140, 255)).toBe('#008cff');
      expect(rgbToHex(255, 50, 0)).toBe('#ff3200');
    });

    it('clamps values above 255', () => {
      expect(rgbToHex(300, 999, 1024)).toBe('#ffffff');
    });

    it('clamps values below 0', () => {
      expect(rgbToHex(-1, -5, -100)).toBe('#000000');
    });

    it('pads single-digit hex with leading zero', () => {
      expect(rgbToHex(1, 2, 3)).toBe('#010203');
    });
  });

  describe('hexToRgb', () => {
    it('parses 6-digit hex with leading hash', () => {
      expect(hexToRgb('#008cff')).toEqual({ r: 0, g: 140, b: 255 });
      expect(hexToRgb('#FF3200')).toEqual({ r: 255, g: 50, b: 0 });
    });

    it('parses hex without leading hash', () => {
      expect(hexToRgb('008cff')).toEqual({ r: 0, g: 140, b: 255 });
    });

    it('falls back to {0,0,0} for malformed input', () => {
      expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#abc')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('round-trips through rgbToHex for valid 8-bit RGB', () => {
      const cases: Array<{ r: number; g: number; b: number }> = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 17, g: 34, b: 51 },
        { r: 200, g: 80, b: 240 },
      ];
      for (const c of cases) {
        expect(hexToRgb(rgbToHex(c.r, c.g, c.b))).toEqual(c);
      }
    });
  });
});

// ── 2. Constants ────────────────────────────────────────────────────────

describe('lib/gradient — constants', () => {
  it('DEFAULT_GRADIENT_STOPS is a 2-stop blue→orange gradient at 0% and 100%', () => {
    expect(DEFAULT_GRADIENT_STOPS).toHaveLength(2);
    expect(DEFAULT_GRADIENT_STOPS[0]).toEqual({
      position: 0,
      color: { r: 0, g: 100, b: 255 },
    });
    expect(DEFAULT_GRADIENT_STOPS[1]).toEqual({
      position: 1,
      color: { r: 255, g: 50, b: 0 },
    });
  });

  it('INTERPOLATION_OPTIONS lists exactly Linear / Smooth / Step', () => {
    expect(INTERPOLATION_OPTIONS).toHaveLength(3);
    const ids = INTERPOLATION_OPTIONS.map((o) => o.id);
    expect(ids).toEqual(['linear', 'smooth', 'step']);
    for (const opt of INTERPOLATION_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.description).toBeTruthy();
    }
  });

  it('GradientStop type accepts realistic shapes', () => {
    // Compile-time guard surfaced as a runtime existence check
    const stop: GradientStop = { position: 0.5, color: { r: 12, g: 34, b: 56 } };
    expect(stop.position).toBe(0.5);
  });

  it('GradientInterpolation union accepts the three modes', () => {
    const modes: GradientInterpolation[] = ['linear', 'smooth', 'step'];
    expect(modes).toHaveLength(3);
  });
});

// ── 3. <GradientEditor> SSR markup ──────────────────────────────────────

describe('<GradientEditor>', () => {
  it('renders the gradient-region container with default stops', () => {
    mockState.config.gradientStops = undefined; // exercise the default path
    mockState.config.gradientInterpolation = undefined;
    const markup = renderToStaticMarkup(createElement(GradientEditor));
    expect(markup).toContain('data-testid="gradient-region"');
    // Mode picker is present
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('Linear');
    expect(markup).toContain('Smooth');
    expect(markup).toContain('Step');
  });

  it('renders triangle markers for every stop', () => {
    mockState.config.gradientStops = [
      { position: 0, color: { r: 0, g: 0, b: 0 } },
      { position: 0.5, color: { r: 128, g: 128, b: 128 } },
      { position: 1, color: { r: 255, g: 255, b: 255 } },
    ];
    const markup = renderToStaticMarkup(createElement(GradientEditor));
    // 3 stop color inputs + 3 marker triangles
    const colorInputCount = (markup.match(/Color for gradient stop/g) ?? []).length;
    const markerCount = (markup.match(/Drag handle for gradient stop/g) ?? []).length;
    expect(colorInputCount).toBe(3);
    expect(markerCount).toBe(3);
  });

  it('falls back to "linear" when interpolation is unset', () => {
    mockState.config.gradientStops = undefined;
    mockState.config.gradientInterpolation = undefined;
    const markup = renderToStaticMarkup(createElement(GradientEditor));
    // The Linear button is the only one with aria-checked="true"
    expect(markup).toMatch(/aria-checked="true"[^>]*>Linear/);
  });

  it('reflects the active interpolation mode in aria-checked', () => {
    mockState.config.gradientInterpolation = 'smooth';
    const markup = renderToStaticMarkup(createElement(GradientEditor));
    expect(markup).toMatch(/aria-checked="true"[^>]*>Smooth/);
  });
});

// ── 4. <GradientEditorPanel> SSR markup ─────────────────────────────────

describe('<GradientEditorPanel>', () => {
  it('renders inside a CollapsibleSection with the default title', () => {
    mockState.config.gradientStops = undefined;
    mockState.config.gradientInterpolation = undefined;
    const markup = renderToStaticMarkup(createElement(GradientEditorPanel));
    expect(markup).toContain('Gradient Stops');
    // The mode picker still renders as a sibling (headerAccessory)
    expect(markup).toContain('role="radiogroup"');
  });

  it('honors a custom title prop', () => {
    const markup = renderToStaticMarkup(
      createElement(GradientEditorPanel, { title: 'Custom Title' }),
    );
    expect(markup).toContain('Custom Title');
  });

  it('preserves the gradient body inside the collapsible', () => {
    mockState.config.gradientStops = [
      { position: 0, color: { r: 0, g: 0, b: 0 } },
      { position: 1, color: { r: 255, g: 255, b: 255 } },
    ];
    const markup = renderToStaticMarkup(createElement(GradientEditorPanel));
    expect(markup).toContain('Drag handle for gradient stop 1');
    expect(markup).toContain('Drag handle for gradient stop 2');
  });
});

// ── 5. <InterpolationPicker> ────────────────────────────────────────────

describe('<InterpolationPicker>', () => {
  it('renders three radio buttons in a radiogroup', () => {
    const markup = renderToStaticMarkup(
      createElement(InterpolationPicker, {
        value: 'linear',
        onChange: () => {},
      }),
    );
    expect(markup).toContain('role="radiogroup"');
    expect((markup.match(/role="radio"/g) ?? []).length).toBe(3);
  });

  it('marks exactly one option as aria-checked at a time', () => {
    for (const mode of ['linear', 'smooth', 'step'] as const) {
      const markup = renderToStaticMarkup(
        createElement(InterpolationPicker, { value: mode, onChange: () => {} }),
      );
      const checkedMatches = markup.match(/aria-checked="true"/g) ?? [];
      expect(checkedMatches).toHaveLength(1);
    }
  });
});
