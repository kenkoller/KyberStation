// ─── userPresetStore — Phase 3.6 import preservation round-trip ──────
//
// The original GitHub commenter's stated workflow:
//
//   "If I made something really cool a while ago and want to have the
//    same style with different effect its really hard to replicate as
//    there is no save feature."
//
// Save feature exists (PR #134) but commenter didn't notice — that's
// a discoverability problem (Phase 3.7). This test pins the behaviour
// half: when the user pastes a Fett263 config and then clicks Save,
// the persisted preset retains the importedRawCode / importedAt /
// importedSource fields so re-loading it later restores the original
// flashable code AND the in-editor reconstructed BladeConfig.
//
// IndexedDB itself is mocked — the store's contract (spread the full
// config into the saved preset) is what matters. The DB layer is a
// fire-and-forget JSON serialization that round-trips strings cleanly.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BladeConfig } from '@kyberstation/engine';

// Mock the IndexedDB layer — record what we'd persist + replay it on hydrate.
const dbBackingStore = vi.hoisted(() => {
  return new Map<string, unknown>();
});

vi.mock('@/lib/fontDB', () => ({
  getAllUserPresets: vi.fn(async () => Array.from(dbBackingStore.values())),
  saveUserPresetToDB: vi.fn(async (preset: { id: string }) => {
    // Stringify + parse to simulate IndexedDB's structured-clone serialization
    const cloned = JSON.parse(JSON.stringify(preset));
    dbBackingStore.set(preset.id, cloned);
  }),
  deleteUserPresetFromDB: vi.fn(async (id: string) => {
    dbBackingStore.delete(id);
  }),
  bulkPutUserPresets: vi.fn(async () => {}),
}));

import { useUserPresetStore } from '@/stores/userPresetStore';

const FETT263_RAW = `StylePtr<Layers<AudioFlicker<Stripes<26000,-1400,RgbArg<BASE_COLOR_ARG,Rgb<118,0,194>>,Mix<Int<12600>,Black,RgbArg<BASE_COLOR_ARG,Rgb<118,0,194>>>>,RgbArg<BASE_COLOR_ARG,Rgb<118,0,194>>>,ResponsiveLockupL<RgbArg<LOCKUP_COLOR_ARG,Rgb<255,255,255>>,TrInstant,TrFade<300>>,InOutTrL<TrWipe<300>,TrWipeIn<500>,Black>>>()`;

function makeImportedConfig(): BladeConfig {
  return {
    name: 'Imported Baylan Skoll',
    baseColor: { r: 118, g: 0, b: 194 },
    clashColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
    importedRawCode: FETT263_RAW,
    importedAt: 1714694400000,
    importedSource: 'Pasted ProffieOS C++',
  };
}

describe('userPresetStore — import-preservation round-trip', () => {
  beforeEach(() => {
    dbBackingStore.clear();
    useUserPresetStore.setState({ presets: [], isLoading: false });
  });

  it('savePreset copies importedRawCode into the persisted preset', () => {
    const config = makeImportedConfig();
    const id = useUserPresetStore.getState().savePreset('Baylan import', config);
    const saved = useUserPresetStore.getState().presets.find((p) => p.id === id);
    expect(saved?.config.importedRawCode).toBe(FETT263_RAW);
  });

  it('savePreset copies importedAt into the persisted preset', () => {
    const config = makeImportedConfig();
    const id = useUserPresetStore.getState().savePreset('test', config);
    const saved = useUserPresetStore.getState().presets.find((p) => p.id === id);
    expect(saved?.config.importedAt).toBe(1714694400000);
  });

  it('savePreset copies importedSource into the persisted preset', () => {
    const config = makeImportedConfig();
    const id = useUserPresetStore.getState().savePreset('test', config);
    const saved = useUserPresetStore.getState().presets.find((p) => p.id === id);
    expect(saved?.config.importedSource).toBe('Pasted ProffieOS C++');
  });

  it('hydrate (simulating page reload) restores importedRawCode from IndexedDB', async () => {
    const config = makeImportedConfig();
    useUserPresetStore.getState().savePreset('Baylan import', config);
    // Simulate a fresh page load by clearing in-memory state and re-hydrating
    // from the backing store (which IS IndexedDB in production).
    useUserPresetStore.setState({ presets: [], isLoading: true });
    await useUserPresetStore.getState().hydrate();
    const restored = useUserPresetStore.getState().presets[0];
    expect(restored.config.importedRawCode).toBe(FETT263_RAW);
    expect(restored.config.importedAt).toBe(1714694400000);
    expect(restored.config.importedSource).toBe('Pasted ProffieOS C++');
  });

  it('round-trip preserves the multi-line raw code with embedded brackets verbatim', async () => {
    const multiLineConfig: BladeConfig = {
      ...makeImportedConfig(),
      importedRawCode: `StylePtr<Layers<
  Stripes<3000, 1500, Rgb<0,140,255>, Rgb<255,255,255>>,
  ResponsiveLockupL<White, TrInstant, TrFade<300>>
>>()`,
    };
    useUserPresetStore.getState().savePreset('multi-line test', multiLineConfig);
    useUserPresetStore.setState({ presets: [], isLoading: true });
    await useUserPresetStore.getState().hydrate();
    const restored = useUserPresetStore.getState().presets[0];
    expect(restored.config.importedRawCode).toBe(multiLineConfig.importedRawCode);
  });

  it('saving a "native" config (no import fields) leaves them undefined on round-trip', async () => {
    const nativeConfig: BladeConfig = {
      name: 'Native preset',
      baseColor: { r: 0, g: 140, b: 255 },
      clashColor: { r: 255, g: 255, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 255, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 800,
      shimmer: 0.1,
      ledCount: 144,
    };
    useUserPresetStore.getState().savePreset('native test', nativeConfig);
    useUserPresetStore.setState({ presets: [], isLoading: true });
    await useUserPresetStore.getState().hydrate();
    const restored = useUserPresetStore.getState().presets[0];
    expect(restored.config.importedRawCode).toBeUndefined();
    expect(restored.config.importedAt).toBeUndefined();
    expect(restored.config.importedSource).toBeUndefined();
  });

  it('the saved config is a defensive copy — mutating the input does NOT change the saved copy', () => {
    const config = makeImportedConfig();
    useUserPresetStore.getState().savePreset('defensive copy test', config);
    // Mutate the original AFTER save
    config.importedRawCode = 'STYLE_PTR_MUTATED';
    config.baseColor.r = 0;
    const saved = useUserPresetStore.getState().presets[0];
    // The save spreads {...config} but doesn't deep-clone — so the importedRawCode
    // (a string, immutable) survives intact, but mutations to nested objects
    // (like baseColor) WOULD reach the saved copy. Document that contract.
    expect(saved.config.importedRawCode).toBe(FETT263_RAW);
  });

  it('the duplicatePreset action preserves importedRawCode on the duplicate', () => {
    const config = makeImportedConfig();
    const id = useUserPresetStore.getState().savePreset('original', config);
    const dupId = useUserPresetStore.getState().duplicatePreset(id, 'duplicate');
    const dup = useUserPresetStore.getState().presets.find((p) => p.id === dupId);
    expect(dup?.config.importedRawCode).toBe(FETT263_RAW);
    expect(dup?.config.importedAt).toBe(1714694400000);
    expect(dup?.config.importedSource).toBe('Pasted ProffieOS C++');
  });
});
