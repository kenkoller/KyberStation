// ─── saberProfileStore — profile-rename + notes/description contract ──
//
// Pin down the schema additions + new actions shipped with the inline
// profile rename + workbench-private metadata feature:
//
//   1. New profiles default `notes` + `description` to ''.
//   2. `renameProfile` updates name, trims whitespace, caps at 100 chars,
//      and refuses empty strings (preserves the previous name).
//   3. `setProfileMeta` writes `notes` + `description` independently +
//      together, and caps each at 2000 chars.
//   4. `migrateProfile` (via storage load) default-fills `notes` +
//      `description` when older persisted state is missing those keys
//      — guarantees we never read `undefined` downstream.
//   5. `importProfile` accepts JSON with `description` set, defaults to
//      '' when absent, ignores wrong types.
//   6. `duplicateProfile` carries `notes` + `description` to the copy.
//   7. **Privacy contract**: `notes` and `description` are NOT
//      referenced anywhere in the Kyber Code share encoder
//      (`apps/web/lib/sharePack/kyberGlyph.ts`). This sentinel test
//      catches any accidental future serialization of these
//      workbench-private fields.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock crypto.randomUUID for deterministic ids in CI environments that
// don't expose the global (older Node versions occasionally lack it on
// the global; Node 20+ does, but we want to be defensive).
beforeEach(() => {
  let seq = 0;
  const realRandomUUID =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID.bind(crypto)
      : null;
  if (!realRandomUUID) {
    (globalThis as { crypto: { randomUUID: () => string } }).crypto = {
      randomUUID: () => `test-uuid-${++seq}`,
    };
  }
  // Reset the localStorage backing the store between tests. Vitest's
  // jsdom env (apps/web uses jsdom by default for component tests, but
  // this file imports the store which reads localStorage at module load
  // — so we need a reset hook) provides a real localStorage we can wipe.
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

// Re-import the store fresh per-test so each test sees a clean
// `loadFromStorage` result. Use vi.resetModules to clear the module
// cache so the IIFE at the bottom of the store re-runs.
async function freshStore() {
  vi.resetModules();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  const mod = await import('@/stores/saberProfileStore');
  return mod;
}

describe('saberProfileStore — rename + notes + description', () => {
  it('createProfile defaults notes and description to empty strings', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Vader ANH');
    expect(profile.notes).toBe('');
    expect(profile.description).toBe('');
  });

  it('renameProfile updates the name and trims whitespace', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Old Name');
    useSaberProfileStore.getState().renameProfile(profile.id, '  New Name  ');
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.name).toBe('New Name');
  });

  it('renameProfile caps the name at 100 characters', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Original');
    const veryLong = 'A'.repeat(250);
    useSaberProfileStore.getState().renameProfile(profile.id, veryLong);
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.name.length).toBe(100);
  });

  it('renameProfile refuses empty/whitespace-only names', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Sacred Name');
    useSaberProfileStore.getState().renameProfile(profile.id, '   ');
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.name).toBe('Sacred Name');

    useSaberProfileStore.getState().renameProfile(profile.id, '');
    const stillAfter = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(stillAfter?.name).toBe('Sacred Name');
  });

  it('setProfileMeta writes notes independently of description', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Plo Koon');
    useSaberProfileStore.getState().setProfileMeta(profile.id, { notes: 'Bass speaker' });
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.notes).toBe('Bass speaker');
    expect(after?.description).toBe(''); // unchanged
  });

  it('setProfileMeta writes description independently of notes', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Ki-Adi-Mundi');
    useSaberProfileStore.getState().setProfileMeta(profile.id, { description: 'Cerean Jedi Master.' });
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.notes).toBe(''); // unchanged
    expect(after?.description).toBe('Cerean Jedi Master.');
  });

  it('setProfileMeta accepts both fields together and caps each at 2000 chars', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Aayla Secura');
    const veryLong = 'X'.repeat(3000);
    useSaberProfileStore.getState().setProfileMeta(profile.id, {
      notes: veryLong,
      description: veryLong,
    });
    const after = useSaberProfileStore.getState().profiles.find((p) => p.id === profile.id);
    expect(after?.notes.length).toBe(2000);
    expect(after?.description.length).toBe(2000);
  });

  it('migration default-fills notes + description on legacy persisted state', async () => {
    // Simulate older localStorage shape where description doesn't exist
    // and notes is also missing — the migration must default-fill both.
    if (typeof localStorage === 'undefined') return;
    const legacyJson = JSON.stringify({
      profiles: [
        {
          id: 'legacy-1',
          name: 'Legacy Saber',
          chassisType: '',
          boardType: 'Proffie V3',
          cardSize: '16GB',
          presetEntries: [],
          fontAssignments: {},
          cardConfigs: [
            {
              id: 'legacy-1-cc-1',
              name: 'Default',
              entries: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          activeCardConfigId: 'legacy-1-cc-1',
          // No `notes` field. No `description` field. This is the
          // shape that older releases persisted.
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeProfileId: 'legacy-1',
    });
    localStorage.setItem('kyberstation-saber-profiles', legacyJson);

    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().profiles[0];
    expect(profile).toBeDefined();
    expect(profile.notes).toBe('');
    expect(profile.description).toBe('');
  });

  it('importProfile accepts a JSON description and defaults to empty when absent', async () => {
    const { useSaberProfileStore } = await freshStore();
    const minimal = JSON.stringify({
      name: 'Imported Saber',
      cardConfigs: [
        {
          id: 'cc-1',
          name: 'Default',
          entries: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      // No description on this payload — should default to ''
    });
    const imported = useSaberProfileStore.getState().importProfile(minimal);
    expect(imported?.description).toBe('');

    const withMeta = JSON.stringify({
      name: 'Verbose Saber',
      cardConfigs: [
        {
          id: 'cc-2',
          name: 'Default',
          entries: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      notes: 'Bass speaker',
      description: 'Built by Vader.',
    });
    const importedWithMeta = useSaberProfileStore.getState().importProfile(withMeta);
    expect(importedWithMeta?.notes).toBe('Bass speaker');
    expect(importedWithMeta?.description).toBe('Built by Vader.');
  });

  it('duplicateProfile carries notes + description forward to the copy', async () => {
    const { useSaberProfileStore } = await freshStore();
    const profile = useSaberProfileStore.getState().createProfile('Source');
    useSaberProfileStore.getState().setProfileMeta(profile.id, {
      notes: 'note-body',
      description: 'desc-body',
    });
    const copy = useSaberProfileStore.getState().duplicateProfile(profile.id);
    expect(copy?.notes).toBe('note-body');
    expect(copy?.description).toBe('desc-body');
    expect(copy?.id).not.toBe(profile.id);
  });
});

describe('saberProfileStore — privacy contract sentinel', () => {
  it('Kyber Code share encoder does NOT reference notes or description', () => {
    // Drift sentinel: if anyone wires notes/description into the share
    // encoder (kyberGlyph.ts), this test fails loudly. Workbench-private
    // metadata must never escape to a share URL or generated config.h.
    const glyphPath = join(__dirname, '..', 'lib', 'sharePack', 'kyberGlyph.ts');
    const source = readFileSync(glyphPath, 'utf8');
    expect(source.match(/\bnotes\b/)).toBeNull();
    expect(source.match(/\bdescription\b/)).toBeNull();
  });

  it('configUrl encoder does NOT reference notes or description', () => {
    // Same sentinel for the legacy `?config=<base64>` fallback path.
    const configUrlPath = join(__dirname, '..', 'lib', 'configUrl.ts');
    const source = readFileSync(configUrlPath, 'utf8');
    expect(source.match(/\bnotes\b/)).toBeNull();
    expect(source.match(/\bdescription\b/)).toBeNull();
  });
});
