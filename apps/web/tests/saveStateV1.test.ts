// ─── Save State v1 — store-level contract tests ──────────────────────
//
// Pin down the userPresetStore save/load/delete contract and the
// bladeStore.loadPreset integration that powers the My Presets section.
//
// These are store-level tests (not component tests) because the UI uses
// window.prompt / window.confirm which are browser-only. The store API
// is the load-bearing contract: SavePresetButton calls savePreset,
// GalleryColumnA calls loadPreset + deletePreset, and both read presets.
//
// IndexedDB persistence is mocked — Dexie operations are async but the
// Zustand store's in-memory state is the authoritative runtime shape.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { useBladeStore } from '@/stores/bladeStore';
import type { BladeConfig } from '@kyberstation/engine';

// ── Stub IndexedDB operations — we test in-memory store behavior ────

vi.mock('@/lib/fontDB', async () => {
  const actual = await vi.importActual<typeof import('@/lib/fontDB')>('@/lib/fontDB');
  return {
    ...actual,
    getAllUserPresets: vi.fn().mockResolvedValue([]),
    saveUserPresetToDB: vi.fn(),
    deleteUserPresetFromDB: vi.fn(),
    bulkPutUserPresets: vi.fn(),
  };
});

// ── Stub crypto.randomUUID for deterministic ids ────────────────────

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// ── Helpers ─────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<BladeConfig>): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0.1,
    ledCount: 144,
    ...overrides,
  };
}

// ── Reset stores between tests ──────────────────────────────────────

beforeEach(() => {
  uuidCounter = 0;
  // Reset userPresetStore to initial state
  useUserPresetStore.setState({ presets: [], isLoading: false });
  // Reset bladeStore config to default
  useBladeStore.setState({
    config: makeConfig(),
  });
});

// ─── Save flow ──────────────────────────────────────────────────────

describe('save flow', () => {
  it('savePreset adds a preset to the store', () => {
    const config = makeConfig({ baseColor: { r: 255, g: 0, b: 0 } });
    const id = useUserPresetStore.getState().savePreset('Red Saber', config);

    const presets = useUserPresetStore.getState().presets;
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe(id);
    expect(presets[0].name).toBe('Red Saber');
  });

  it('saved preset snapshots the top-level config (shallow copy)', () => {
    const config = makeConfig({ baseColor: { r: 0, g: 255, b: 0 } });
    useUserPresetStore.getState().savePreset('Green Blade', config);

    // Mutate a top-level field on the original — the store's copy is independent
    config.shimmer = 0.99;

    const saved = useUserPresetStore.getState().presets[0];
    expect(saved.config.shimmer).toBe(0.1); // Top-level fields are snapshot-copied
    // Note: nested objects (baseColor, etc.) share references with the original
    // config via the shallow spread. The SavePresetButton passes `{ ...config }`,
    // so the top-level is always independent. Deep mutations after save are not
    // expected in practice — the bladeStore creates a fresh object on every update.
  });

  it('saved preset has createdAt and updatedAt timestamps', () => {
    const before = Date.now();
    const config = makeConfig();
    useUserPresetStore.getState().savePreset('Timestamped', config);
    const after = Date.now();

    const preset = useUserPresetStore.getState().presets[0];
    expect(preset.createdAt).toBeGreaterThanOrEqual(before);
    expect(preset.createdAt).toBeLessThanOrEqual(after);
    expect(preset.updatedAt).toBe(preset.createdAt);
  });

  it('multiple saves prepend newest first', () => {
    const config = makeConfig();
    useUserPresetStore.getState().savePreset('First', config);
    useUserPresetStore.getState().savePreset('Second', config);
    useUserPresetStore.getState().savePreset('Third', config);

    const names = useUserPresetStore.getState().presets.map((p) => p.name);
    expect(names).toEqual(['Third', 'Second', 'First']);
  });

  it('savePreset returns a unique id', () => {
    const config = makeConfig();
    const id1 = useUserPresetStore.getState().savePreset('A', config);
    const id2 = useUserPresetStore.getState().savePreset('B', config);
    expect(id1).not.toBe(id2);
  });
});

// ─── Load flow ──────────────────────────────────────────────────────

describe('load flow', () => {
  it('loadPreset updates bladeStore config to match saved preset', () => {
    const customConfig = makeConfig({
      baseColor: { r: 170, g: 60, b: 240 },
      style: 'pulse',
      shimmer: 0.5,
      ignitionMs: 500,
    });
    useUserPresetStore.getState().savePreset('Purple Pulse', customConfig);

    const savedPreset = useUserPresetStore.getState().presets[0];
    useBladeStore.getState().loadPreset(savedPreset.config);

    const loaded = useBladeStore.getState().config;
    expect(loaded.baseColor).toEqual({ r: 170, g: 60, b: 240 });
    expect(loaded.style).toBe('pulse');
    expect(loaded.shimmer).toBe(0.5);
    expect(loaded.ignitionMs).toBe(500);
  });

  it('loadPreset rebuilds topology when ledCount differs', () => {
    // Default is 144 LEDs
    const shortConfig = makeConfig({ ledCount: 73 });
    useUserPresetStore.getState().savePreset('Shoto', shortConfig);

    const savedPreset = useUserPresetStore.getState().presets[0];
    useBladeStore.getState().loadPreset(savedPreset.config);

    const topology = useBladeStore.getState().topology;
    expect(topology.totalLEDs).toBe(73);
  });

  it('loadPreset does not alter the stored preset', () => {
    const config = makeConfig({ baseColor: { r: 255, g: 40, b: 40 } });
    useUserPresetStore.getState().savePreset('Red Config', config);

    const presetBefore = useUserPresetStore.getState().presets[0];
    useBladeStore.getState().loadPreset(presetBefore.config);

    // Now change the blade config
    useBladeStore.getState().updateConfig({ shimmer: 0.9 });

    // The stored preset should still have the original shimmer
    const presetAfter = useUserPresetStore.getState().presets[0];
    expect(presetAfter.config.shimmer).toBe(0.1);
  });
});

// ─── Delete flow ────────────────────────────────────────────────────

describe('delete flow', () => {
  it('deletePreset removes the preset from the store', () => {
    const config = makeConfig();
    const id = useUserPresetStore.getState().savePreset('Doomed', config);

    expect(useUserPresetStore.getState().presets).toHaveLength(1);

    useUserPresetStore.getState().deletePreset(id);

    expect(useUserPresetStore.getState().presets).toHaveLength(0);
  });

  it('deletePreset removes only the targeted preset', () => {
    const config = makeConfig();
    const id1 = useUserPresetStore.getState().savePreset('Keep', config);
    const id2 = useUserPresetStore.getState().savePreset('Remove', config);
    useUserPresetStore.getState().savePreset('Also Keep', config);

    useUserPresetStore.getState().deletePreset(id2);

    const remaining = useUserPresetStore.getState().presets;
    expect(remaining).toHaveLength(2);
    expect(remaining.find((p) => p.id === id2)).toBeUndefined();
    expect(remaining.find((p) => p.id === id1)).toBeDefined();
  });

  it('deletePreset on a nonexistent id is a no-op', () => {
    const config = makeConfig();
    useUserPresetStore.getState().savePreset('Safe', config);

    useUserPresetStore.getState().deletePreset('nonexistent-id');

    expect(useUserPresetStore.getState().presets).toHaveLength(1);
  });

  it('deleting a preset does not affect bladeStore config', () => {
    const config = makeConfig({ baseColor: { r: 0, g: 255, b: 0 } });
    const id = useUserPresetStore.getState().savePreset('Green', config);

    // Load the preset into the blade
    useBladeStore.getState().loadPreset(config);
    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 0, g: 255, b: 0 });

    // Delete the source preset
    useUserPresetStore.getState().deletePreset(id);

    // Blade config should be unchanged
    expect(useBladeStore.getState().config.baseColor).toEqual({ r: 0, g: 255, b: 0 });
  });
});

// ─── Duplicate flow ─────────────────────────────────────────────────

describe('duplicate flow', () => {
  it('duplicatePreset creates a copy with a new name and id', () => {
    const config = makeConfig({ baseColor: { r: 255, g: 165, b: 0 } });
    const originalId = useUserPresetStore.getState().savePreset('Original', config);

    const dupeId = useUserPresetStore.getState().duplicatePreset(originalId, 'Copy of Original');

    const presets = useUserPresetStore.getState().presets;
    expect(presets).toHaveLength(2);

    const dupe = presets.find((p) => p.id === dupeId);
    expect(dupe).toBeDefined();
    expect(dupe!.name).toBe('Copy of Original');
    expect(dupe!.config.baseColor).toEqual({ r: 255, g: 165, b: 0 });
    expect(dupe!.id).not.toBe(originalId);
  });
});
