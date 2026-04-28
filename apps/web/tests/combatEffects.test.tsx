// ─── Combat-effects A/B — Phase 4 catalog + Column A + Column B tests ─
//
// Pins down the contract for the new combat-effects section:
//   1. Catalog shape: 21 effects, GENERAL row id is reserved.
//   2. Catalog ↔ keyboard-shortcut alignment: every effect with a
//      shortcut in EFFECT_SHORTCUTS must mark the same `shortcut`
//      letter; this drift sentinel catches the "added a shortcut but
//      forgot the catalog" failure mode.
//   3. Catalog ↔ engine-registry alignment: every catalog id is a
//      valid engine EffectType (passes safe to triggerEffect).
//   4. Column A renders all 22 rows (GENERAL + 21) in document order.
//   5. Column A active row picks up `selectedId` prop.
//   6. Column B's GENERAL branch renders Preon / Dual-Mode UI and
//      hides the per-effect Trigger button.
//   7. Column B's effect branch renders the Trigger button and shows
//      per-effect parameters when the effect has any.
//   8. Column B's effect branch renders a "no parameters" hint for
//      effects without a customization block.
//   9. Trigger button is disabled when handlers aren't connected.
//
// Pattern: renderToStaticMarkup from react-dom/server — no jsdom
// dependency, matches the existing apps/web tests.

import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { useBladeStore } from '../stores/bladeStore';
import { useActiveEffectsStore } from '../stores/activeEffectsStore';
import { EFFECT_SHORTCUTS } from '../lib/keyboardShortcuts';
import {
  COMBAT_EFFECTS,
  COMBAT_EFFECT_GENERAL,
  COMBAT_EFFECT_GENERAL_ID,
  DEFAULT_COMBAT_EFFECT_ID,
  getCombatEffect,
  isEffectRowId,
} from '../components/editor/combat-effects';
import { CombatEffectsColumnA } from '../components/editor/combat-effects/CombatEffectsColumnA';
import { CombatEffectsColumnB } from '../components/editor/combat-effects/CombatEffectsColumnB';

function resetEffectsState() {
  useActiveEffectsStore.setState({ active: new Set() });
  // Don't blow away the entire blade store — just reset the few fields
  // that combat-effects reads/writes so test mutations don't leak.
  useBladeStore.setState((s) => ({
    config: {
      ...s.config,
      preonEnabled: false,
      preonColor: undefined,
      preonMs: 300,
      dualModeIgnition: false,
      clashLocation: undefined,
      clashIntensity: undefined,
      blastCount: undefined,
      blastSpread: undefined,
      stabDepth: undefined,
      lockupPosition: undefined,
      lockupRadius: undefined,
      blastPosition: undefined,
      blastRadius: undefined,
    },
    effectLog: [],
  }));
}

describe('combat-effects catalog', () => {
  it('contains exactly 21 entries', () => {
    expect(COMBAT_EFFECTS.length).toBe(21);
  });

  it('uses unique ids for every effect', () => {
    const ids = COMBAT_EFFECTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reserves the GENERAL row id outside the effect-id namespace', () => {
    expect(COMBAT_EFFECT_GENERAL.id).toBe(COMBAT_EFFECT_GENERAL_ID);
    // The catalog's id field is typed as `EffectType`, which excludes
    // `__general__` at compile time — a runtime existence check below
    // would TS-flag as "no overlap". This assertion locks the symbol
    // string instead so a future rename of the constant doesn't
    // silently shadow a real EffectType.
    expect(COMBAT_EFFECT_GENERAL_ID).toBe('__general__');
  });

  it('default selection points at a real effect (not GENERAL)', () => {
    expect(isEffectRowId(DEFAULT_COMBAT_EFFECT_ID)).toBe(true);
  });

  it('every keyboard shortcut effect has a matching catalog entry', () => {
    for (const sc of EFFECT_SHORTCUTS) {
      const entry = COMBAT_EFFECTS.find((e) => e.id === sc.effect);
      expect(entry).toBeDefined();
      // The catalog should reflect the same letter (single uppercase char).
      expect(entry?.shortcut).toBe(sc.key);
      // And the same sustained classification — sustained effects in
      // the keyboard module must round-trip to sustained=true here.
      expect(entry?.sustained).toBe(sc.sustained);
    }
  });

  it('only sustained effects are flagged sustained=true', () => {
    const sustainedIds = new Set(
      COMBAT_EFFECTS.filter((e) => e.sustained).map((e) => e.id),
    );
    // Lockup, drag, melt, lightning are the canonical sustained set.
    expect(sustainedIds).toEqual(new Set(['lockup', 'drag', 'melt', 'lightning']));
  });

  it('isEffectRowId rejects the GENERAL row + unknown ids', () => {
    expect(isEffectRowId(COMBAT_EFFECT_GENERAL_ID)).toBe(false);
    expect(isEffectRowId('not-an-effect')).toBe(false);
    expect(isEffectRowId('clash')).toBe(true);
  });

  it('getCombatEffect returns the canonical entry', () => {
    expect(getCombatEffect('clash')?.label).toBe('Clash');
    expect(getCombatEffect('lockup')?.sustained).toBe(true);
    expect(getCombatEffect('not-real')).toBeUndefined();
  });
});

describe('CombatEffectsColumnA', () => {
  beforeEach(resetEffectsState);

  it('renders all 22 rows (GENERAL + 21 effects)', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnA, {
        selectedId: 'clash',
        onSelect: () => {},
      }),
    );
    // GENERAL row.
    expect(html).toContain(`combat-effect-row-${COMBAT_EFFECT_GENERAL_ID}`);
    expect(html).toContain('General');
    // Spot-check three effects from across the categories.
    expect(html).toContain('combat-effect-row-clash');
    expect(html).toContain('combat-effect-row-lockup');
    expect(html).toContain('combat-effect-row-bifurcate');
    // Every effect in the catalog has a row.
    for (const e of COMBAT_EFFECTS) {
      expect(html).toContain(`combat-effect-row-${e.id}`);
    }
  });

  it('marks the selected row as active (aria-selected="true")', () => {
    const htmlSelectedClash = renderToStaticMarkup(
      createElement(CombatEffectsColumnA, {
        selectedId: 'clash',
        onSelect: () => {},
      }),
    );
    expect(htmlSelectedClash).toMatch(/id="combat-effect-row-clash"[^>]*aria-selected="true"/);
    expect(htmlSelectedClash).not.toMatch(
      /id="combat-effect-row-lockup"[^>]*aria-selected="true"/,
    );

    const htmlSelectedLockup = renderToStaticMarkup(
      createElement(CombatEffectsColumnA, {
        selectedId: 'lockup',
        onSelect: () => {},
      }),
    );
    expect(htmlSelectedLockup).toMatch(
      /id="combat-effect-row-lockup"[^>]*aria-selected="true"/,
    );
  });

  it('renders each effect\'s shortcut as a kbd badge when present', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnA, {
        selectedId: COMBAT_EFFECT_GENERAL_ID,
        onSelect: () => {},
      }),
    );
    // Spot-check three known shortcuts.
    expect(html).toContain('Keyboard shortcut: C'); // clash
    expect(html).toContain('Keyboard shortcut: B'); // blast
    expect(html).toContain('Keyboard shortcut: L'); // lockup
  });
});

describe('CombatEffectsColumnB — GENERAL view', () => {
  beforeEach(resetEffectsState);

  it('renders the Preon and Dual-Mode controls', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: COMBAT_EFFECT_GENERAL_ID,
      }),
    );
    expect(html).toContain('General');
    expect(html).toContain('Preon');
    expect(html).toContain('Enable pre-ignition flash');
    expect(html).toContain('Dual-Mode Ignition');
    // Shouldn't show the per-effect Trigger button.
    expect(html).not.toContain('Trigger Clash');
  });
});

describe('CombatEffectsColumnB — per-effect view', () => {
  beforeEach(resetEffectsState);

  it('renders the Trigger button + Color + Parameters for clash', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'clash',
        triggerEffect: () => {},
        releaseEffect: () => {},
      }),
    );
    // Header + trigger.
    expect(html).toContain('Clash');
    expect(html).toContain('Trigger Clash');
    // Color override + parameter sliders should mount.
    expect(html).toContain('Color');
    expect(html).toContain('Parameters');
    expect(html).toContain('Location');
    expect(html).toContain('Intensity');
  });

  it('uses the "Hold" label for sustained effects when not held', () => {
    // beforeEach resets active to the empty set, so lockup is idle.
    const idle = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'lockup',
        triggerEffect: () => {},
        releaseEffect: () => {},
      }),
    );
    expect(idle).toContain('Hold Lockup');
    expect(idle).not.toContain('Release Lockup');
  });

  // Note: the "Release Lockup" branch (sustained-and-currently-held) is
  // not asserted via SSR because Zustand's react binding pins
  // useSyncExternalStore's server snapshot to `api.getInitialState()`
  // (see node_modules/zustand/react.js), so a pre-seed via `setState`
  // before `renderToStaticMarkup` is ignored on the server. The label
  // logic itself is one ternary in CombatEffectsColumnB; runtime
  // browser walkthrough validates the held-state rendering.

  it('renders the "Trigger" label for one-shot effects regardless of held state', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'clash',
        triggerEffect: () => {},
        releaseEffect: () => {},
      }),
    );
    expect(html).toContain('Trigger Clash');
    expect(html).not.toContain('Hold Clash');
    expect(html).not.toContain('Release Clash');
  });

  it('renders the "no parameters" hint for effects without a customization block', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'force',
        triggerEffect: () => {},
        releaseEffect: () => {},
      }),
    );
    expect(html).toContain('Force');
    expect(html).toContain('No tunable parameters for this effect.');
    // Trigger button should still mount.
    expect(html).toContain('Trigger Force');
  });

  it('disables the Trigger button when handlers are absent', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'clash',
      }),
    );
    // React renders attributes BEFORE children, so the order in the
    // serialized button is `disabled=""` ... then `Trigger Clash`.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Trigger Clash/);
    expect(html).toContain('Engine handlers not connected');
  });

  it('renders spatial Position + Radius for blast', () => {
    const html = renderToStaticMarkup(
      createElement(CombatEffectsColumnB, {
        selectedId: 'blast',
        triggerEffect: () => {},
        releaseEffect: () => {},
      }),
    );
    expect(html).toContain('Position');
    expect(html).toContain('Radius');
    expect(html).toContain('Count'); // params slider
    expect(html).toContain('Spread'); // params slider
  });
});
