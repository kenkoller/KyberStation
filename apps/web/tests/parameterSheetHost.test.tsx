// ─── ParameterSheetHost — Phase 4.4.x (2026-05-01) ──────────────────────
//
// SSR shape contract for the store-subscribing host component.
//
// ParameterSheet itself uses a mount-gate (useEffect-flipped `mounted`
// flag) so its portal only renders client-side. SSR tests therefore
// can't reach the sheet markup through ParameterSheetHost directly —
// we mock ParameterSheet to capture the props the host hands it, and
// assert the contract there.
//
// Coverage:
//   1. Returns null when store isOpen=false.
//   2. Renders the (mocked) ParameterSheet when store has a live spec.
//   3. Sheet `title` prop comes from spec.title.
//   4. Sheet body shows headline value via spec.formatDisplay(spec.read()).
//   5. onReset prop is wired (not undefined → Reset button enabled).
//   6. initialState defaults to 'peek'.
//   7. spec.color propagates to the body.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';

// Hoisted spy so the assertions can reach into recorded calls.
const lastSheetProps = vi.hoisted(() => ({ value: null as unknown as Record<string, unknown> | null }));

// Hoisted store stub — Zustand's React binding pins SSR snapshots to
// the initial state from useSyncExternalStore, so any `open(spec)`
// call before `renderToStaticMarkup` is invisible to the host's
// selectors. Mocking the store hook to read from a mutable object
// each call sidesteps the pin.
const stubState = vi.hoisted(() => ({
  isOpen: false as boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: null as any,
  close: vi.fn(),
}));

vi.mock('@/stores/parameterSheetStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/parameterSheetStore')>(
    '@/stores/parameterSheetStore',
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useParameterSheetStore(selector: (s: any) => unknown) {
    return selector(stubState);
  }
  // Preserve the type re-export for the test file's makeSpec helper.
  return {
    ...actual,
    useParameterSheetStore,
  };
});

vi.mock('@/components/layout/mobile/ParameterSheet', async () => {
  const actual = await vi.importActual<typeof import('@/components/layout/mobile/ParameterSheet')>(
    '@/components/layout/mobile/ParameterSheet',
  );
  return {
    ...actual,
    ParameterSheet: (props: Record<string, unknown> & { children?: ReactNode }) => {
      lastSheetProps.value = props;
      // Render a simple marker so the body content is reachable for
      // headline / unit assertions.
      return createElement(
        'div',
        {
          'data-mock-parameter-sheet': 'true',
          'data-title': props.title as string,
          'data-initial-state': props.initialState as string,
          'data-has-on-reset': props.onReset ? 'true' : 'false',
        },
        props.children,
      );
    },
  };
});

import { ParameterSheetHost } from '@/components/layout/mobile/ParameterSheetHost';
import { type ParameterSheetSpec } from '@/stores/parameterSheetStore';

function makeSpec(overrides: Partial<ParameterSheetSpec> = {}): ParameterSheetSpec {
  return {
    id: 'hue',
    title: 'Edit Hue',
    unit: '°',
    min: 0,
    max: 359,
    step: 1,
    color: 'accent',
    defaultValue: 207,
    formatDisplay: (v) => Math.round(v).toString(),
    read: () => 207,
    write: () => {},
    ...overrides,
  };
}

function setOpenSpec(spec: ParameterSheetSpec) {
  stubState.isOpen = true;
  stubState.spec = spec;
}

describe('ParameterSheetHost', () => {
  beforeEach(() => {
    stubState.isOpen = false;
    stubState.spec = null;
    lastSheetProps.value = null;
  });

  it('returns null when store is closed', () => {
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toBe('');
  });

  it('renders the (mocked) ParameterSheet when store has an open spec', () => {
    setOpenSpec(makeSpec());
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toContain('data-mock-parameter-sheet="true"');
  });

  it('passes spec.title as the sheet title prop', () => {
    setOpenSpec(makeSpec({ title: 'Edit Saturation' }));
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toContain('data-title="Edit Saturation"');
  });

  it('renders headline value via spec.formatDisplay(spec.read())', () => {
    setOpenSpec(
      makeSpec({
        read: () => 84,
        formatDisplay: (v) => `${v}!!`,
      }),
    );
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toContain('>84!!<');
  });

  it('honors spec.unit in the headline', () => {
    setOpenSpec(makeSpec({ unit: 'bpm', read: () => 120 }));
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toContain('bpm');
  });

  it('passes onReset prop to the sheet (Reset button is wired)', () => {
    setOpenSpec(makeSpec());
    renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(lastSheetProps.value?.onReset).toBeTruthy();
    expect(typeof lastSheetProps.value?.onReset).toBe('function');
  });

  it('Reset button calls spec.write(defaultValue)', () => {
    let written: number | null = null;
    setOpenSpec(
      makeSpec({
        defaultValue: 123,
        write: (v) => {
          written = v;
        },
      }),
    );
    renderToStaticMarkup(createElement(ParameterSheetHost));
    const onReset = lastSheetProps.value?.onReset as (() => void) | undefined;
    expect(onReset).toBeTruthy();
    onReset!();
    expect(written).toBe(123);
  });

  it('passes initialState="peek" to the sheet', () => {
    setOpenSpec(makeSpec());
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    expect(html).toContain('data-initial-state="peek"');
  });

  it('passes spec.color through to the body fill', () => {
    setOpenSpec(makeSpec({ color: 'warm' }));
    const html = renderToStaticMarkup(createElement(ParameterSheetHost));
    // Body uses --accent-warm CSS var when color category is 'warm'.
    expect(html).toContain('rgb(var(--accent-warm))');
  });
});
