// @vitest-environment jsdom
// ─── saberProfileStore — historical migration path fixtures ────────────
//
// EMIT_PARSER_AUDIT interface G ("Saber Profile / IndexedDB persistence")
// flagged this path as ⚠ Unverified — the migration logic in
// `apps/web/stores/saberProfileStore.ts` rewrites profiles persisted by
// older releases, but there was no fixture-driven coverage. If we
// silently change the migration path, in-the-wild persisted profiles
// in users' localStorage break.
//
// This file pins each historical schema version with at least one
// hand-authored fixture: input is the literal JSON shape an older
// release would have persisted, expected is what the current migration
// must produce. Loading the store with the fixture JSON in
// localStorage drives the existing `loadFromStorage` → `migrateProfile`
// path — no need to export the internal migration function.
//
// Schema timeline (mined from `git log apps/web/stores/saberProfileStore.ts`):
//   v1 — pre-cardConfigs era (`Phase 7` and earlier).
//        Has presetEntries[] + fontAssignments. NO cardConfigs,
//        activeCardConfigId, notes, or description.
//   v2 — cardConfigs era (commit 8b4baaf → before commit 4aa0146).
//        Has cardConfigs[] + activeCardConfigId + notes.
//        NO description. NO hardwareProfileId/customPasteConfig.
//   v3 — current shape (commit 4aa0146 + a2d47ed + 7430966).
//        Adds description, optional hardwareProfileId,
//        optional customPasteConfig.
//
// Migration contract (per `migrateProfile` in the store):
//   - Default-fill notes + description via `??` (preserves '' from older
//     releases, only fills undefined).
//   - If cardConfigs is non-empty: skip the legacy presetEntries rebuild.
//   - Otherwise: build cardConfigs[0] from presetEntries using
//     crypto.randomUUID() for new card config + entry ids.
//
// Determinism strategy: `crypto.randomUUID` is mocked to return
// 'uuid-1', 'uuid-2', ... in call order. v1 fixtures predict UUIDs
// based on the documented call order in migrateProfile (card config
// id first, then one entry id per preset entry).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import v1Fixtures from './fixtures/saberProfiles/v1.json';
import v2Fixtures from './fixtures/saberProfiles/v2.json';
import v3Fixtures from './fixtures/saberProfiles/v3.json';

const STORAGE_KEY = 'kyberstation-saber-profiles';

interface Fixture {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

interface FixtureFile {
  schemaVersion: number;
  description: string;
  fixtures: Fixture[];
}

beforeEach(() => {
  // Deterministic crypto.randomUUID. Each test sees a fresh counter so
  // the v1 fixtures' predicted 'uuid-1', 'uuid-2' values line up no
  // matter the run order.
  let seq = 0;
  if (typeof globalThis.crypto === 'undefined') {
    (globalThis as { crypto: { randomUUID: () => string } }).crypto = {
      randomUUID: () => `uuid-${++seq}`,
    };
  } else {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++seq}` as `${string}-${string}-${string}-${string}-${string}`);
  }
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

/**
 * Persist a single profile in localStorage under the store's storage key,
 * then freshly import the store so its IIFE re-runs
 * `loadFromStorage` → `migrateProfile`. Returns the migrated profile.
 */
async function migrateViaStorageLoad(profileJson: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const persisted = JSON.stringify({
    profiles: [profileJson],
    activeProfileId: profileJson.id ?? null,
  });
  localStorage.setItem(STORAGE_KEY, persisted);
  vi.resetModules();
  const mod = await import('@/stores/saberProfileStore');
  const state = mod.useSaberProfileStore.getState();
  // Cast via `unknown` because SaberProfile has a structured shape that
  // doesn't overlap with the loose Record<string, unknown> we want for
  // deep-equality fixture comparison. Going through unknown is the
  // TS-idiomatic escape hatch.
  return state.profiles[0] as unknown as Record<string, unknown> | undefined;
}

// ─── v1 — pre-cardConfigs migrations ──────────────────────────────────
describe('saberProfileStore migration — v1 (pre-cardConfigs era)', () => {
  const file = v1Fixtures as FixtureFile;

  it('the fixture file declares schemaVersion 1', () => {
    expect(file.schemaVersion).toBe(1);
    expect(file.fixtures.length).toBeGreaterThan(0);
  });

  for (const fixture of file.fixtures) {
    it(`fixture "${fixture.name}" migrates to the expected shape`, async () => {
      const migrated = await migrateViaStorageLoad(fixture.input);
      expect(migrated).toEqual(fixture.expected);
    });
  }
});

// ─── v2 — cardConfigs era, pre-description ────────────────────────────
describe('saberProfileStore migration — v2 (cardConfigs, no description)', () => {
  const file = v2Fixtures as FixtureFile;

  it('the fixture file declares schemaVersion 2', () => {
    expect(file.schemaVersion).toBe(2);
    expect(file.fixtures.length).toBeGreaterThan(0);
  });

  for (const fixture of file.fixtures) {
    it(`fixture "${fixture.name}" migrates to the expected shape`, async () => {
      const migrated = await migrateViaStorageLoad(fixture.input);
      expect(migrated).toEqual(fixture.expected);
    });
  }
});

// ─── v3 — current shape (idempotency) ─────────────────────────────────
describe('saberProfileStore migration — v3 (current shape, idempotent)', () => {
  const file = v3Fixtures as FixtureFile;

  it('the fixture file declares schemaVersion 3', () => {
    expect(file.schemaVersion).toBe(3);
    expect(file.fixtures.length).toBeGreaterThan(0);
  });

  for (const fixture of file.fixtures) {
    it(`fixture "${fixture.name}" is a no-op (input === expected)`, async () => {
      const migrated = await migrateViaStorageLoad(fixture.input);
      expect(migrated).toEqual(fixture.expected);
    });
  }
});

// ─── User-data preservation — semantic guarantees beyond shape ────────
describe('saberProfileStore migration — user-data preservation', () => {
  it('preserves the profile name across a v1 migration', async () => {
    const v1 = v1Fixtures as FixtureFile;
    const fixture = v1.fixtures.find((f) => f.name === 'single-preset-entry-with-source-id');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    expect(migrated?.name).toBe('Obi-Wan ANH');
  });

  it('preserves preset BladeConfig colors across a v1 migration', async () => {
    const v1 = v1Fixtures as FixtureFile;
    const fixture = v1.fixtures.find((f) => f.name === 'single-preset-entry-with-source-id');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    const cardConfigs = migrated?.cardConfigs as Array<{ entries: Array<{ config: { baseColor: { r: number; g: number; b: number } } }> }>;
    expect(cardConfigs[0].entries[0].config.baseColor).toEqual({ r: 0, g: 140, b: 255 });
  });

  it('preserves the font name (with fontAssignments fallback) across a v1 migration', async () => {
    const v1 = v1Fixtures as FixtureFile;
    const fixture = v1.fixtures.find((f) => f.name === 'font-assignments-fallback');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    const cardConfigs = migrated?.cardConfigs as Array<{ entries: Array<{ fontName: string; fontAssociation?: string }> }>;
    expect(cardConfigs[0].entries[0].fontName).toBe('yoda_voice');
    expect(cardConfigs[0].entries[0].fontAssociation).toBe('yoda_voice');
  });

  it('preserves multiple card configs (does NOT collapse them) across a v2 migration', async () => {
    const v2 = v2Fixtures as FixtureFile;
    const fixture = v2.fixtures.find((f) => f.name === 'multiple-card-configs');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    const cardConfigs = migrated?.cardConfigs as Array<{ id: string; name: string }>;
    expect(cardConfigs).toHaveLength(2);
    expect(cardConfigs[0].name).toBe('White Sabers');
    expect(cardConfigs[1].name).toBe('Green Sabers (Padawan era)');
    expect(migrated?.activeCardConfigId).toBe('ahsoka-cc-2');
  });

  it('preserves notes across a v2 migration (when present) and default-fills description', async () => {
    const v2 = v2Fixtures as FixtureFile;
    const fixture = v2.fixtures.find((f) => f.name === 'full-card-config-with-notes');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    expect(migrated?.notes).toBe('Bass speaker. Crystal needs re-attunement.');
    expect(migrated?.description).toBe('');
  });

  it('preserves the customPasteConfig sentinel through a v3 round-trip', async () => {
    const v3 = v3Fixtures as FixtureFile;
    const fixture = v3.fixtures.find((f) => f.name === 'custom-paste-sentinel');
    expect(fixture).toBeDefined();
    const migrated = await migrateViaStorageLoad(fixture!.input);
    expect(migrated?.hardwareProfileId).toBe('custom-paste');
    expect(typeof migrated?.customPasteConfig).toBe('string');
    expect((migrated?.customPasteConfig as string).includes('CONFIG_PRESETS')).toBe(true);
  });
});

// ─── Failure modes — match whatever the store does today ──────────────
//
// The store's `loadFromStorage` swallows JSON.parse errors and returns
// an empty profile list. This isn't a "throw cleanly" pattern — it's
// "fail to a clean empty state." Pin this contract so any future
// refactor that changes the failure mode (e.g. to throwing or to a
// sentinel object) shows up in the diff.
describe('saberProfileStore migration — failure modes', () => {
  it('malformed JSON in storage yields an empty profile list (no throw)', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    vi.resetModules();
    const mod = await import('@/stores/saberProfileStore');
    const state = mod.useSaberProfileStore.getState();
    expect(state.profiles).toEqual([]);
    expect(state.activeProfileId).toBeNull();
  });

  it('non-array `profiles` key yields an empty profile list', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles: { not: 'an array' } }));
    vi.resetModules();
    const mod = await import('@/stores/saberProfileStore');
    const state = mod.useSaberProfileStore.getState();
    expect(state.profiles).toEqual([]);
  });
});
