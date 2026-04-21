// ─── Drift Sentinel: CANONICAL_DEFAULT_CONFIG ↔ DEFAULT_CONFIG ───
//
// The Kyber Glyph v1 encoder in `apps/web/lib/sharePack/kyberGlyph.ts`
// delta-encodes every BladeConfig against its `CANONICAL_DEFAULT_CONFIG`
// constant. The app's blade store in `apps/web/stores/bladeStore.ts`
// carries its own internal `DEFAULT_CONFIG` used as the initial zustand
// state. Per CLAUDE.md decision #11 and the "Deferred items" list, these
// two must stay byte-for-byte structurally equivalent — otherwise:
//
//   - A glyph encoded with one default and decoded against a drifted
//     default will silently produce a wrong BladeConfig, since the v1
//     delta baseline no longer matches the implied reconstruction base.
//   - The v1 binding-stability pledge promised in
//     `docs/KYBER_CRYSTAL_VERSIONING.md` §2 is violated.
//
// This test follows the same mirror-drift pattern as the `BladeConfig`
// mirror sentinel in `packages/codegen/tests/typeIdentity.test.ts`
// (CLAUDE.md decision #1): if the real app-side default diverges from
// the glyph-encoder's baked-in canonical default, CI fails with a loud
// explanation.
//
// NOTE: `DEFAULT_CONFIG` is not exported from bladeStore.ts; we pull
// the same value out of the store's initial state (which the store
// constructs from that constant at module-init time). This is what the
// app actually renders in production, so it is the most truthful
// measurement of the real default.
//
// If the test fails, DO NOT "fix" it by editing either constant to
// match the other without first understanding which side is correct.
// The canonical default is load-bearing for every glyph ever emitted;
// once v1 ships publicly it is frozen forever.

import { describe, it, expect } from 'vitest';
import type { BladeConfig } from '@kyberstation/engine';
import { CANONICAL_DEFAULT_CONFIG } from '../lib/sharePack/kyberGlyph';
import { useBladeStore } from '../stores/bladeStore';

// Pull the real DEFAULT_CONFIG out of the zustand store's initial state.
// The store is constructed at module-load time with `config: DEFAULT_CONFIG`,
// so this is the same reference the production app uses as its starting
// BladeConfig.
function getStoreDefaultConfig(): BladeConfig {
  return useBladeStore.getState().config;
}

describe('CANONICAL_DEFAULT_CONFIG drift sentinel', () => {
  // Allowed-diff catalogue. Empty today — the two constants are in sync
  // as of 2026-04-17. If an intentional divergence is added in the
  // future, document it here with (a) which keys, (b) why, (c) the
  // glyph-versioning consequence. Keep the list narrow — broad drift
  // means we need to bump KYBER_GLYPH_VERSION, not expand this array.
  const ALLOWED_KEY_DIVERGENCES: readonly (keyof BladeConfig)[] = [];

  it('has structurally identical keys on both sides (no silent additions/deletions)', () => {
    const storeDefault = getStoreDefaultConfig();
    const canonicalKeys = Object.keys(CANONICAL_DEFAULT_CONFIG).sort();
    const storeKeys = Object.keys(storeDefault).sort();

    expect(
      storeKeys,
      [
        '',
        'DEFAULT_CONFIG in bladeStore.ts has a different key set from',
        'CANONICAL_DEFAULT_CONFIG in kyberGlyph.ts.',
        '',
        'A drifted default breaks glyph round-trip compatibility: every',
        'v1 glyph encoded against the old default will decode wrong once',
        "the app's baseline changes. See CLAUDE.md §11 (decision #11) and",
        'docs/KYBER_CRYSTAL_VERSIONING.md §2 for the binding contract.',
        '',
        'Either:',
        '  (a) revert the unintended change, OR',
        '  (b) bump KYBER_GLYPH_VERSION and ship a v2 codec path, OR',
        '  (c) if the divergence is intentional and safe, add the diverging',
        '      keys to ALLOWED_KEY_DIVERGENCES with a justification comment.',
        '',
      ].join('\n'),
    ).toEqual(canonicalKeys);
  });

  it('has byte-for-byte equivalent values on every shared key', () => {
    const storeDefault = getStoreDefaultConfig() as Record<string, unknown>;
    const canonical = CANONICAL_DEFAULT_CONFIG as unknown as Record<string, unknown>;

    const sharedKeys = Object.keys(canonical).filter(
      (k) => !ALLOWED_KEY_DIVERGENCES.includes(k as keyof BladeConfig),
    );

    for (const key of sharedKeys) {
      expect(
        storeDefault[key],
        [
          '',
          `Field \`${key}\` differs between CANONICAL_DEFAULT_CONFIG (kyberGlyph.ts)`,
          'and DEFAULT_CONFIG (bladeStore.ts).',
          '',
          'A drifted default breaks glyph round-trip: a config equal to the',
          "app's default gets emitted with a non-empty delta (or, worse, an",
          'encoded value gets decoded to the wrong baseline). This violates',
          'the v1 binding pledge in docs/KYBER_CRYSTAL_VERSIONING.md §2.',
          '',
          'See CLAUDE.md §11 for the mirror pattern and the "Deferred items"',
          'list for the original follow-up context.',
          '',
        ].join('\n'),
      ).toEqual(canonical[key]);
    }
  });

  it('is fully deep-equal when no divergences are allow-listed', () => {
    // Belt-and-braces: if ALLOWED_KEY_DIVERGENCES is empty (the expected
    // steady state), the two constants should survive a direct `toEqual`.
    // This catches divergences on nested objects (e.g. baseColor) that a
    // shallow per-key diff might miss if the comparison routine above is
    // ever weakened.
    if (ALLOWED_KEY_DIVERGENCES.length === 0) {
      const storeDefault = getStoreDefaultConfig();
      expect(
        storeDefault,
        [
          '',
          'Full deep-equality check failed: CANONICAL_DEFAULT_CONFIG in',
          'kyberGlyph.ts has drifted from DEFAULT_CONFIG in bladeStore.ts.',
          '',
          'A drifted default breaks glyph round-trip compatibility across',
          'versions. See CLAUDE.md §11.',
          '',
        ].join('\n'),
      ).toEqual(CANONICAL_DEFAULT_CONFIG);
    }
  });
});
