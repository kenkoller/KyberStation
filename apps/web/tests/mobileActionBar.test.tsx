// ─── MobileActionBar — Phase 4.2 (2026-04-30) ───────────────────────────
//
// SSR shape contract for the 5-icon+letter effect chip bar (per
// "Claude Design Mobile handoff/HANDOFF.md" Q2).
//
// Coverage:
//   1. Renders role="toolbar" with the effect-triggers aria-label.
//   2. Five primary chips with data-chip-id of: ignite, clash, blast,
//      lockup, stab.
//   3. A `…` overflow trigger button with aria-label="More effects".
//   4. Each primary chip carries its handoff letter (I, C, B, L, S)
//      in a visible <span>.
//   5. Each chip has an aria-pressed attribute (toggle semantics).
//   6. With store at default state (isOn=false), non-Ignite chips
//      render disabled.
//   7. Touch targets honor `var(--touch-target)` via inline style.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// ── Store mocks ────────────────────────────────────────────────────────
//
// Zustand SSR snapshots pin to getInitialState(). Without explicit mocks
// the bladeStore would return whatever the live persist middleware
// hydrated, which makes the disabled-state tests flaky. Pin both stores
// to known initial state so the disabled assertions are deterministic.

vi.mock('@/stores/bladeStore', () => {
  const state = { isOn: false };
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector(state)) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => typeof state;
  };
  useBladeStore.getState = () => state;
  return { useBladeStore };
});

vi.mock('@/stores/activeEffectsStore', () => {
  const state = { active: new Set<string>() };
  const useActiveEffectsStore = ((selector: (s: unknown) => unknown) =>
    selector(state)) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => typeof state;
  };
  useActiveEffectsStore.getState = () => state;
  return {
    useActiveEffectsStore,
    isActiveSelector: () => () => false,
  };
});

vi.mock('@/lib/effectToggle', () => ({
  toggleOrTriggerEffect: () => {},
}));

import { MobileActionBar } from '../components/layout/mobile/MobileActionBar';

const noop = () => undefined;

describe('MobileActionBar', () => {
  it('renders role="toolbar" with the effect-triggers aria-label', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Effect triggers"');
  });

  it('renders 5 primary effect chips with the correct ids', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    for (const id of ['ignite', 'clash', 'blast', 'lockup', 'stab']) {
      expect(html).toContain(`data-chip-id="${id}"`);
    }
  });

  it('renders a "…" overflow trigger button', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    expect(html).toContain('aria-label="More effects"');
    expect(html).toContain('aria-haspopup="menu"');
  });

  it('does NOT render the overflow popover by default (closed)', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    // Closed-state contract: no role="menu" present.
    expect(html).not.toContain('role="menu"');
  });

  it('shows the handoff letter for each primary chip', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    // I, C, B, L, S — handoff Q2 verdict letters
    for (const letter of ['I', 'C', 'B', 'L', 'S']) {
      expect(html).toMatch(new RegExp(`>${letter}<`));
    }
  });

  it('every primary chip has aria-pressed attribute (toggle semantics)', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    // 5 primary chips × aria-pressed = at least 5 occurrences.
    const matches = html.match(/aria-pressed="(true|false)"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it('non-Ignite chips render disabled when isOn=false (default store state)', () => {
    // Default bladeStore initial state has isOn=false. The Ignite chip
    // is special-cased and stays enabled; Clash/Blast/Lockup/Stab all
    // disable so the user can't trigger an effect on a retracted blade.
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    // At least 4 disabled chips (clash/blast/lockup/stab); ignite must
    // not be among them. JSX attribute order puts `disabled` before
    // `data-chip-id`, so we match `<button ... disabled ... data-chip-id="X" ...>`.
    const disabledMatches =
      html.match(/<button[^>]*disabled[^>]*data-chip-id="(clash|blast|lockup|stab)"/g) ?? [];
    expect(disabledMatches.length).toBe(4);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*data-chip-id="ignite"/);
  });

  it('honors --touch-target sizing on every chip via inline style', () => {
    const html = renderToStaticMarkup(
      createElement(MobileActionBar, {
        onToggleIgnite: noop,
        onTriggerEffect: noop,
        onReleaseEffect: noop,
      }),
    );
    // Six min-height occurrences = 5 primary chips + 1 overflow trigger.
    const minHeightMatches = html.match(/min-height:var\(--touch-target\)/g) ?? [];
    expect(minHeightMatches.length).toBeGreaterThanOrEqual(6);
  });
});
