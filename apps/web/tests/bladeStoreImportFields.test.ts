// ─── bladeStore.convertImportToNative — Phase 2B ──────────────────────
//
// Pins the one-way "Convert to Native" action that strips the
// import-preservation fields from the active config. After conversion,
// the next codegen export regenerates from BladeConfig fields rather
// than re-emitting the imported raw code verbatim.

import { describe, it, expect, beforeEach } from 'vitest';
import { useBladeStore } from '@/stores/bladeStore';

const INITIAL_CONFIG = useBladeStore.getState().config;

describe('bladeStore.convertImportToNative', () => {
  beforeEach(() => {
    // Reset to the canonical default before each test so they don't
    // bleed state through the singleton.
    useBladeStore.setState({ config: INITIAL_CONFIG });
  });

  it('strips importedRawCode from the active config', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Blue>()',
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('importedRawCode' in after).toBe(false);
  });

  it('strips importedAt from the active config', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Blue>()',
        importedAt: 1714694400000,
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('importedAt' in after).toBe(false);
  });

  it('strips importedSource from the active config', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Blue>()',
        importedSource: 'Fett263 OS7 Style Library',
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('importedSource' in after).toBe(false);
  });

  it('preserves all other config fields (baseColor, style, etc.)', () => {
    const customConfig = {
      ...INITIAL_CONFIG,
      baseColor: { r: 255, g: 0, b: 100 },
      style: 'unstable',
      ignitionMs: 500,
      shimmer: 0.5,
      ledCount: 132,
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: 1714694400000,
      importedSource: 'Test',
    };
    useBladeStore.setState({ config: customConfig });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect(after.baseColor).toEqual({ r: 255, g: 0, b: 100 });
    expect(after.style).toBe('unstable');
    expect(after.ignitionMs).toBe(500);
    expect(after.shimmer).toBe(0.5);
    expect(after.ledCount).toBe(132);
  });

  it('is a no-op (safe to call) when no import fields are set', () => {
    const before = useBladeStore.getState().config;
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect(after.baseColor).toEqual(before.baseColor);
    expect(after.style).toBe(before.style);
    expect('importedRawCode' in after).toBe(false);
  });

  it('produces a new config object reference (immutable update)', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Blue>()',
      },
    });
    const before = useBladeStore.getState().config;
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect(after).not.toBe(before);
  });

  it('strips all three fields atomically when all are set', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Layers<Blue, ResponsiveLockupL<White>>>()',
        importedAt: 1714694400000,
        importedSource: 'Pasted ProffieOS C++',
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('importedRawCode' in after).toBe(false);
    expect('importedAt' in after).toBe(false);
    expect('importedSource' in after).toBe(false);
  });

  it('is idempotent — calling twice produces the same result', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<Blue>()',
      },
    });
    useBladeStore.getState().convertImportToNative();
    const afterOnce = useBladeStore.getState().config;
    useBladeStore.getState().convertImportToNative();
    const afterTwice = useBladeStore.getState().config;
    // The keys deleted by destructuring stay deleted; subsequent calls
    // are no-ops on an already-clean config.
    expect(afterTwice.baseColor).toEqual(afterOnce.baseColor);
    expect('importedRawCode' in afterTwice).toBe(false);
  });

  // Sprint 5C (2026-05-03): the parser-detected fields are import-time
  // read-only surfaces. Once the user converts to native, the visualizer
  // becomes the source of truth, so detection metadata is cleared too.
  it('strips altPhaseColors from the active config', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<ColorChange<TR, A, B, C>>()',
        altPhaseColors: [
          { r: 255, g: 0, b: 0 },
          { r: 0, g: 255, b: 0 },
        ],
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('altPhaseColors' in after).toBe(false);
  });

  it('strips detectedEffectIds from the active config', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: ['EFFECT_PREON', 'EFFECT_BOOT'],
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('detectedEffectIds' in after).toBe(false);
  });

  it('strips all five import-related fields atomically when all are set', () => {
    useBladeStore.setState({
      config: {
        ...INITIAL_CONFIG,
        importedRawCode: 'StylePtr<...>()',
        importedAt: 1714694400000,
        importedSource: 'Test',
        altPhaseColors: [{ r: 100, g: 200, b: 50 }],
        detectedEffectIds: ['EFFECT_USER1'],
      },
    });
    useBladeStore.getState().convertImportToNative();
    const after = useBladeStore.getState().config;
    expect('importedRawCode' in after).toBe(false);
    expect('importedAt' in after).toBe(false);
    expect('importedSource' in after).toBe(false);
    expect('altPhaseColors' in after).toBe(false);
    expect('detectedEffectIds' in after).toBe(false);
  });
});
