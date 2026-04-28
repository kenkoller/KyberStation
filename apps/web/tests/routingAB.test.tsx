// ─── Routing A/B — Phase 4e tests ──────────────────────────────────────
//
// Pins the contract for Column A's condensed binding list + Column B's
// edit/empty modes. Mirrors the SSR-only `renderToStaticMarkup` shape
// used by every other A/B test in this repo (no jsdom).
//
// Bypassed-row visual treatment + held-state-only-in-runtime branches
// aren't asserted via SSR because Zustand's react binding pins the
// server snapshot to `getInitialState()` (see
// node_modules/zustand/react.js); browser walkthrough covers those.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { SerializedBinding } from '@kyberstation/engine';
import { RoutingColumnA } from '../components/editor/routing/RoutingColumnA';
import { RoutingColumnB } from '../components/editor/routing/RoutingColumnB';

// Minimal valid bindings for fixture purposes. The store's runtime
// `addBinding` does its own validation; for SSR-only render tests we
// bypass that and write straight into the config slot.
const FIXTURE_SWING_TO_SHIMMER: SerializedBinding = {
  id: 'fixture-swing-shimmer',
  source: 'swing',
  expression: null,
  target: 'shimmer',
  combinator: 'add',
  amount: 0.6,
  bypassed: false,
  label: 'swing → shimmer',
};

const FIXTURE_EXPRESSION_BREATHING: SerializedBinding = {
  id: 'fixture-expr-breathing',
  source: null,
  expression: {
    source: 'sin(time * 0.001) * 0.5 + 0.5',
    // The store typing accepts an opaque AST shape — for SSR rendering
    // we never dereference the AST, so an empty placeholder is fine.
    // The expression-binding code path keys off `source !== null`
    // which is what BindingRow / Column B branch on.
    ast: { kind: 'literal', value: 0 } as never,
  },
  target: 'shimmer',
  combinator: 'replace',
  amount: 1.0,
  bypassed: false,
  label: 'fx: breathing → shimmer',
};

const FIXTURE_BYPASSED_LOCKUP: SerializedBinding = {
  id: 'fixture-bypassed-lockup',
  source: 'lockup',
  expression: null,
  target: 'colorHueShiftSpeed',
  combinator: 'multiply',
  amount: 0.4,
  bypassed: true,
  label: 'lockup → hue speed',
};

// Components accept an optional `bindings` prop as a test seam. Tests
// pass it explicitly because Zustand's React binding pins the SSR
// snapshot to `getInitialState()` (see node_modules/zustand/react.js)
// — store mutations before renderToStaticMarkup aren't visible.
//
// No need to reset the store between tests: every test below passes
// `bindings:` to the component under test, so the live store value is
// shadowed by the prop. The store's runtime action setters (read-only
// closures via the hook selector) are still available for SSR render
// without changes.

describe('RoutingColumnA — empty state', () => {
it('renders the "+ New Binding" button + RecipePicker + ModulatorPlateBar at the top', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
      }),
    );
    // Creation header surfaces.
    expect(html).toContain('routing-column-a-creation');
    expect(html).toContain('+ New Binding');
    // Modulators heading text — sentinel for ModulatorPlateBar mount.
    expect(html).toContain('Modulators');
    // Recipe picker is mounted; its specific content depends on
    // available recipes but the section itself should be present.
    // We can't assert specific recipe names without coupling tightly,
    // so check for a non-empty body.
    expect(html.length).toBeGreaterThan(500);
  });

  it('shows the no-bindings empty-state hint when the list is empty', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
      }),
    );
    expect(html).toContain('No bindings yet');
    expect(html).toContain('Click + New Binding above');
  });

  it('marks the "+ New Binding" button as pressed when selectedBindingId is null', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
      }),
    );
    expect(html).toMatch(/\+ New Binding[\s\S]{0,200}aria-pressed="true"|aria-pressed="true"[\s\S]{0,200}\+ New Binding/);
  });
});

describe('RoutingColumnA — populated', () => {
const TWO_BINDINGS = [FIXTURE_SWING_TO_SHIMMER, FIXTURE_EXPRESSION_BREATHING];

  it('renders one row per binding with source-name + target-label + amount %', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
        bindings: TWO_BINDINGS,
      }),
    );
    expect(html).toContain(`routing-binding-row-${FIXTURE_SWING_TO_SHIMMER.id}`);
    expect(html).toContain(`routing-binding-row-${FIXTURE_EXPRESSION_BREATHING.id}`);
    // Swing source label (uppercase, modulator displayName)
    // Modulator displayName is "Swing" — `uppercase` CSS transforms
    // display only, not the underlying text content asserted by SSR.
    expect(html).toContain('Swing');
    // Expression bindings show "fx" instead of a modulator name
    expect(html).toContain('fx');
    // Amount % readouts (60% for swing fixture, 100% for expression)
    expect(html).toContain('60%');
    expect(html).toContain('100%');
  });

  it('marks the selected row as aria-selected="true" and others false', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: FIXTURE_SWING_TO_SHIMMER.id,
        onSelect: () => {},
        bindings: TWO_BINDINGS,
      }),
    );
    expect(html).toMatch(
      new RegExp(
        `id="routing-binding-row-${FIXTURE_SWING_TO_SHIMMER.id}"[^>]*aria-selected="true"`,
      ),
    );
    expect(html).toMatch(
      new RegExp(
        `id="routing-binding-row-${FIXTURE_EXPRESSION_BREATHING.id}"[^>]*aria-selected="false"`,
      ),
    );
  });

  it('renders bypass + remove inline buttons per row', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
        bindings: TWO_BINDINGS,
      }),
    );
    expect(html).toContain('Toggle bypass');
    expect(html).toContain('Remove binding');
  });

  it('shows a struck-through amount + bypassed marker on bypassed rows', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnA, {
        selectedBindingId: null,
        onSelect: () => {},
        bindings: [FIXTURE_BYPASSED_LOCKUP],
      }),
    );
    expect(html).toContain(`data-bypassed="true"`);
    // line-through class flagged on bypassed amount readout
    expect(html).toContain('line-through');
  });
});

describe('RoutingColumnB — no selection', () => {
it('renders the "New Binding" header + AddBindingForm + creation-paths hint', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: null,
        onClearSelection: () => {},
      }),
    );
    expect(html).toContain('routing-column-b-empty');
    expect(html).toContain('New Binding');
    // AddBindingForm sentinel — its labelled aria header
    expect(html).toContain('Create modulation binding');
    // Creation-paths hint mentions Recipe Picker and Modulator plates
    expect(html).toContain('Recipe Picker');
    expect(html).toContain('Modulator plates');
  });

  it('shows the stale-id banner when selectedBindingId is set but no matching binding exists', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: 'nonexistent-id',
        onClearSelection: () => {},
      }),
    );
    expect(html).toContain('routing-column-b-empty');
    expect(html).toContain('That binding was just removed');
    expect(html).toContain('Dismiss');
  });
});

describe('RoutingColumnB — editing a bare-source binding', () => {
it('renders source dropdown (editable) + target dropdown + combinator + amount slider', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_SWING_TO_SHIMMER.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_SWING_TO_SHIMMER],
      }),
    );
    expect(html).toContain('routing-column-b-edit');
    // Source is editable (dropdown id) since this is a bare-source binding
    expect(html).toContain('id="binding-edit-source"');
    expect(html).toContain('id="binding-edit-target"');
    expect(html).toContain('id="binding-edit-combinator"');
    expect(html).toContain('id="binding-edit-amount"');
    // Header shows source → target
    // Modulator displayName is "Swing" — `uppercase` CSS transforms
    // display only, not the underlying text content asserted by SSR.
    expect(html).toContain('Swing');
  });

  it('renders Bypass + Remove action buttons', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_SWING_TO_SHIMMER.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_SWING_TO_SHIMMER],
      }),
    );
    expect(html).toContain('Bypass (A/B test)');
    expect(html).toContain('× Remove');
  });

  it('renders the live-viz placeholder banner', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_SWING_TO_SHIMMER.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_SWING_TO_SHIMMER],
      }),
    );
    expect(html).toContain('Live signal viz');
    expect(html).toContain('v1.2');
  });
});

describe('RoutingColumnB — editing an expression binding', () => {
it('shows the expression source code + Edit Expression button instead of a source dropdown', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_EXPRESSION_BREATHING.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_EXPRESSION_BREATHING],
      }),
    );
    expect(html).toContain('routing-column-b-edit');
    // No editable source dropdown for expression bindings
    expect(html).not.toContain('id="binding-edit-source"');
    // The expression source string is shown verbatim
    expect(html).toContain('sin(time * 0.001) * 0.5 + 0.5');
    // The fx · expression label
    expect(html).toContain('fx · expression');
    // Edit Expression button is visible
    expect(html).toContain('Edit Expression');
  });

  it('still renders editable target / combinator / amount for expression bindings', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_EXPRESSION_BREATHING.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_EXPRESSION_BREATHING],
      }),
    );
    expect(html).toContain('id="binding-edit-target"');
    expect(html).toContain('id="binding-edit-combinator"');
    expect(html).toContain('id="binding-edit-amount"');
  });
});

describe('RoutingColumnB — editing a bypassed binding', () => {
it('shows the "bypassed" header pill and "Unbypass" action', () => {
    const html = renderToStaticMarkup(
      createElement(RoutingColumnB, {
        selectedBindingId: FIXTURE_BYPASSED_LOCKUP.id,
        onClearSelection: () => {},
        bindings: [FIXTURE_BYPASSED_LOCKUP],
      }),
    );
    expect(html).toContain('bypassed');
    expect(html).toContain('Unbypass');
  });
});
