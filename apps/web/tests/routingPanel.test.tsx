// ─── RoutingPanel — v0.14.0 left-rail-overhaul rendering tests ─────────
//
// Verifies the merged routing panel composition introduced when the
// stand-alone ModulatorPlateBar + BindingList sections were folded into
// a single panel. The component is pure composition — we render it via
// `react-dom/server`'s `renderToStaticMarkup` (matching the rest of
// apps/web/tests, which run under the node env without jsdom).
//
// The two children (ModulatorPlateBar, BindingList) are themselves
// covered by their own tests (useClickToRoute.test.ts + downstream).
// Here we mock them out to lightweight markers so failures point cleanly
// at composition / divider / count-binding behaviors rather than at the
// children's deep dependency graphs (zustand subscriptions, the engine
// modulator registry, board-profile gating, etc).
//
// Coverage:
//   1. Both halves render (modulator section + binding list section).
//   2. The divider shows the live binding count from the bladeStore.
//   3. The empty state hint is exposed by the binding list (we delegate
//      that to BindingList itself — verifying the section mounts is
//      sufficient at the RoutingPanel level).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Mock heavy children ──────────────────────────────────────────────
//
// These two components touch the BUILT_IN_MODULATORS registry, board
// profile gating, and the full bladeStore. We don't need that surface
// to verify the RoutingPanel's own composition: a sentinel child
// markup is enough. Each child's own tests live elsewhere.

vi.mock('@/components/editor/routing/ModulatorPlateBar', () => ({
  ModulatorPlateBar: () =>
    createElement('div', { 'data-testid': 'mock-modulator-plate-bar' }, 'PLATE_BAR'),
}));

vi.mock('@/components/editor/routing/BindingList', () => ({
  BindingList: () =>
    createElement('div', { 'data-testid': 'mock-binding-list' }, 'BINDING_LIST'),
}));

// Minimal in-memory store. Only the slice RoutingPanel reads is
// exercised: `config.modulation?.bindings.length`. We expose
// `setBindingCount(n)` so individual tests can drive the count.
//
// `vi.mock` is hoisted, so the mock factory runs before module-level
// code. We stash the live count on globalThis so the factory closure +
// the per-test `setBindingCount` agree on the same memory slot.
type BladeStateSlice = {
  config: {
    modulation?: { version: number; bindings: unknown[] };
  };
};

type GlobalWithCount = { __routingPanelTestBindingCount: number };

(globalThis as unknown as GlobalWithCount).__routingPanelTestBindingCount = 0;

function setBindingCount(n: number): void {
  (globalThis as unknown as GlobalWithCount).__routingPanelTestBindingCount = n;
}

vi.mock('@/stores/bladeStore', () => ({
  useBladeStore: (selector: (state: BladeStateSlice) => unknown) => {
    const count = (globalThis as unknown as GlobalWithCount)
      .__routingPanelTestBindingCount;
    const fakeState: BladeStateSlice = {
      config: {
        modulation:
          count > 0
            ? { version: 1, bindings: new Array(count).fill(null) }
            : undefined,
      },
    };
    return selector(fakeState);
  },
}));

import { RoutingPanel } from '@/components/editor/routing/RoutingPanel';

function html(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe('RoutingPanel — composition', () => {
  beforeEach(() => {
    setBindingCount(0);
  });

  afterEach(() => {
    setBindingCount(0);
  });

  it('renders both halves: the modulator plate bar AND the binding list', () => {
    const markup = html(createElement(RoutingPanel));

    // The outer panel marker is present.
    expect(markup).toContain('data-testid="routing-panel"');

    // Both children are mounted.
    expect(markup).toContain('data-testid="mock-modulator-plate-bar"');
    expect(markup).toContain('data-testid="mock-binding-list"');

    // The two section wrappers are present + named for assistive tech.
    expect(markup).toContain('data-testid="routing-panel-modulators"');
    expect(markup).toContain('data-testid="routing-panel-bindings"');
    expect(markup).toContain('aria-label="Modulators"');
    expect(markup).toContain('aria-label="Active modulation bindings"');
  });

  it('renders modulators first, then divider, then binding list (top-to-bottom order)', () => {
    const markup = html(createElement(RoutingPanel));
    const modulatorIdx = markup.indexOf('data-testid="routing-panel-modulators"');
    const dividerIdx = markup.indexOf('data-testid="routing-panel-divider"');
    const bindingsIdx = markup.indexOf('data-testid="routing-panel-bindings"');

    expect(modulatorIdx).toBeGreaterThan(-1);
    expect(dividerIdx).toBeGreaterThan(modulatorIdx);
    expect(bindingsIdx).toBeGreaterThan(dividerIdx);
  });

  it('section header for the modulators reads "Modulators"', () => {
    const markup = html(createElement(RoutingPanel));
    // The label is rendered inside the modulator section's <h4>.
    expect(markup).toContain('>Modulators<');
  });
});

describe('RoutingPanel — divider and binding count', () => {
  beforeEach(() => {
    setBindingCount(0);
  });

  afterEach(() => {
    setBindingCount(0);
  });

  it('divider shows zero bindings when none exist', () => {
    setBindingCount(0);
    const markup = html(createElement(RoutingPanel));
    expect(markup).toContain('data-testid="routing-panel-divider"');
    expect(markup).toContain('data-testid="routing-panel-binding-count"');
    expect(markup).toContain('(0)');
  });

  it('divider reflects the binding count from the bladeStore (single binding)', () => {
    setBindingCount(1);
    const markup = html(createElement(RoutingPanel));
    expect(markup).toContain('data-testid="routing-panel-binding-count"');
    expect(markup).toContain('(1)');
  });

  it('divider reflects the binding count from the bladeStore (multiple bindings)', () => {
    setBindingCount(7);
    const markup = html(createElement(RoutingPanel));
    expect(markup).toContain('data-testid="routing-panel-binding-count"');
    expect(markup).toContain('(7)');
  });

  it('divider label includes the words "Active Bindings" verbatim', () => {
    setBindingCount(3);
    const markup = html(createElement(RoutingPanel));
    expect(markup).toContain('Active Bindings');
  });

  it('divider is hidden from assistive tech via aria-hidden on its container', () => {
    setBindingCount(2);
    const markup = html(createElement(RoutingPanel));
    // The divider node carries aria-hidden so screen readers skip the
    // decorative rule + parenthesized count. The bindings region itself
    // remains exposed to the AT via its aria-label.
    const segment = markup.slice(
      markup.indexOf('data-testid="routing-panel-divider"'),
    );
    expect(segment).toContain('aria-hidden="true"');
  });
});

describe('RoutingPanel — empty state delegation', () => {
  // The empty-state hint ("No bindings yet" + "click a modulator plate
  // to arm it") is owned by BindingList itself. Verifying RoutingPanel
  // mounts the binding list section — and thus surfaces the hint — is
  // the appropriate level of coverage here. The hint copy is locked
  // down in the BindingList component source.

  beforeEach(() => {
    setBindingCount(0);
  });

  it('mounts the BindingList child even when no bindings exist (so the empty hint can render)', () => {
    setBindingCount(0);
    const markup = html(createElement(RoutingPanel));
    expect(markup).toContain('data-testid="mock-binding-list"');
    // Count divider still displays (0) so the user knows the count is
    // live, not stale. The empty hint inside the list complements this.
    expect(markup).toContain('(0)');
  });

  it('keeps the BindingList child mounted regardless of binding count', () => {
    for (const n of [0, 1, 5, 99]) {
      setBindingCount(n);
      const markup = html(createElement(RoutingPanel));
      expect(markup).toContain('data-testid="mock-binding-list"');
      expect(markup).toContain(`(${n})`);
    }
  });
});
