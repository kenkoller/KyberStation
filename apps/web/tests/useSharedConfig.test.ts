// @vitest-environment jsdom
//
// ─── useSharedConfig — URL handler regression tests ───────────────────
//
// `useSharedConfig` is the single entry point that turns a `?s=<glyph>`
// URL into a loaded BladeConfig at editor mount. It also handles the
// legacy `#<base64>` hash. The Saber Card audit (2026-04-27) flagged
// this hook as a P1 untested handler, so this file pins the contract.
//
// Coverage:
//   1. `?s=<glyph>` decodes a v1 glyph + calls loadPreset with the first blade
//   2. `?s=` is stripped from the URL after decode (no double-trigger on reload)
//   3. Other URL params + the hash fragment are preserved post-decode
//   4. A malformed glyph surfaces a shareError + does NOT call loadPreset
//   5. A version-error glyph (forged with byte 99) surfaces a typed
//      KyberGlyphVersionError-shaped error message
//   6. No `?s=` and no hash → no-op (loaded stays false)
//   7. A v2 glyph (with modulation) round-trips cleanly through the hook
//
// Test environment: jsdom for `window.location` + `window.history` +
// `useEffect` execution. Other apps/web tests run under node-only env;
// this file opts in to jsdom via the `@vitest-environment` pragma at
// the very top of the file (must be in the FIRST comment block per
// vitest docs).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  encodeGlyphFromConfig,
  CANONICAL_DEFAULT_CONFIG,
  type GlyphPayload,
  KYBER_GLYPH_VERSION,
  VISUAL_SYSTEM_VERSION,
  encodeGlyph,
} from '@/lib/sharePack/kyberGlyph';
import type {
  BladeConfig,
  ModulationPayload,
  SerializedBinding,
} from '@kyberstation/engine';
import { deflateRaw } from 'pako';
import { Packr } from 'msgpackr';
import bs58 from 'bs58';

// ── Hoisted shared spy state ────────────────────────────────────────
//
// `useBladeStore` is imported by the hook as a module-level singleton.
// We mock the module so its selector returns a stable spy `loadPreset`
// each test can inspect. Tests that need a fresh spy reset the global
// in `beforeEach`.

const mocks = vi.hoisted(() => ({
  loadPresetSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
  toastSuccessSpy: vi.fn(),
}));

vi.mock('@/stores/bladeStore', () => ({
  useBladeStore: (selector: (state: unknown) => unknown) => {
    return selector({ loadPreset: mocks.loadPresetSpy });
  },
}));

vi.mock('@/lib/toastManager', () => ({
  toast: {
    info: vi.fn(),
    success: mocks.toastSuccessSpy,
    warning: vi.fn(),
    error: mocks.toastErrorSpy,
  },
  toastManager: {
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAll: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getToasts: vi.fn(() => []),
  },
}));

// Import the hook AFTER mocks are declared (vi.mock hoists, but the
// import order keeps intent clear).
import { useSharedConfig } from '@/hooks/useSharedConfig';

// ── Test helpers ────────────────────────────────────────────────────

function setUrl(search: string, hash = ''): void {
  // jsdom lets us mutate the location directly via history.replaceState,
  // which is the same primitive the hook itself uses to clean up. We
  // route both `search` and `hash` through a single replaceState call so
  // window.location reads back consistently.
  const path = '/editor';
  const url = `${path}${search}${hash}`;
  window.history.replaceState(null, '', url);
}

function makeMalformedGlyph(): string {
  // A glyph that passes the prefix-format check (`PREFIX.body`) but
  // fails inflate / unpack. Random base58 chars after the prefix.
  return 'JED.zzzzzzzzzzzzzzzzzzzzzzzzzz';
}

function makeVersionErrorGlyph(): string {
  // Hand-craft a glyph whose payload version byte is 99 (unknown).
  // The body itself is a valid (empty) MessagePack object so we KNOW
  // the failure path is the version check, not unpack.
  const packer = new Packr({ useRecords: false });
  const body = packer.pack({ b: [] }) as Uint8Array;
  const framed = new Uint8Array(body.length + 2);
  framed[0] = 99; // unknown version
  framed[1] = VISUAL_SYSTEM_VERSION & 0xff;
  framed.set(body, 2);
  const zipped = deflateRaw(framed, { level: 9 });
  const coded = bs58.encode(zipped);
  return `SPC.${coded}`;
}

function makeV1Glyph(overrides?: Partial<BladeConfig>): string {
  const blade: BladeConfig = {
    ...CANONICAL_DEFAULT_CONFIG,
    ...overrides,
  };
  return encodeGlyphFromConfig(blade);
}

function makeV2GlyphWithModulation(): string {
  // A v2 glyph carries a modulation payload. The encoder auto-bumps
  // payloadVersion from 1 → 2 when it detects bindings, so we pass v1
  // as the input version and let the encoder do the bump.
  const binding: SerializedBinding = {
    id: 'b1',
    source: 'swing',
    expression: null,
    target: 'shimmer',
    combinator: 'replace',
    amount: 0.6,
    bypassed: false,
  };
  const modulation: ModulationPayload = {
    version: 1,
    bindings: [binding],
  };
  const blade: BladeConfig & { modulation?: ModulationPayload } = {
    ...CANONICAL_DEFAULT_CONFIG,
    modulation,
  };
  const payload: GlyphPayload = {
    payloadVersion: KYBER_GLYPH_VERSION,
    visualVersion: VISUAL_SYSTEM_VERSION,
    saberType: 'single',
    blades: [blade],
    hiltModel: null,
    soundFontRef: null,
    oledBitmapRef: null,
    propFileId: 'default',
    publicName: null,
    createdAt: 0,
    kyberstationVersion: '',
    extras: {},
  };
  return encodeGlyph(payload);
}

// ── Lifecycle ──────────────────────────────────────────────────────

beforeEach(() => {
  mocks.loadPresetSpy.mockReset();
  mocks.toastErrorSpy.mockReset();
  mocks.toastSuccessSpy.mockReset();
  // Reset URL to a clean slate for every test. jsdom preserves
  // window.location across tests in the same file otherwise.
  window.history.replaceState(null, '', '/editor');
});

afterEach(() => {
  // Defensive — make sure no test leaves a stale URL behind.
  window.history.replaceState(null, '', '/editor');
});

// ── Tests ──────────────────────────────────────────────────────────

describe('useSharedConfig — success toast labelling', () => {
  it("uses payload.publicName when present (e.g. 'Loaded My Saber')", () => {
    // Hand-build a payload with publicName set so we can verify the
    // toast prefers it over the blade name.
    const blade: BladeConfig = { ...CANONICAL_DEFAULT_CONFIG, name: 'InternalName' };
    const payload: GlyphPayload = {
      payloadVersion: KYBER_GLYPH_VERSION,
      visualVersion: VISUAL_SYSTEM_VERSION,
      saberType: 'single',
      blades: [blade],
      hiltModel: null,
      soundFontRef: null,
      oledBitmapRef: null,
      propFileId: 'default',
      publicName: 'My Saber',
      createdAt: 0,
      kyberstationVersion: '',
      extras: {},
    };
    const glyph = encodeGlyph(payload);
    setUrl(`?s=${glyph}`);

    renderHook(() => useSharedConfig());

    expect(mocks.toastSuccessSpy).toHaveBeenCalledWith('Loaded My Saber');
  });

  it("falls back to the first blade's name when publicName is null", () => {
    // The default makeV1Glyph helper leaves publicName null. The
    // CANONICAL_DEFAULT_CONFIG.name ('Obi-Wan ANH') should label the toast.
    const glyph = makeV1Glyph({ name: 'Test Saber' });
    setUrl(`?s=${glyph}`);

    renderHook(() => useSharedConfig());

    expect(mocks.toastSuccessSpy).toHaveBeenCalledWith('Loaded Test Saber');
  });

  it("uses the literal 'crystal' when neither publicName nor blade.name exist", () => {
    // Hand-build a payload with no publicName AND a blade missing name.
    const blade = { ...CANONICAL_DEFAULT_CONFIG } as BladeConfig & { name?: string };
    delete (blade as { name?: string }).name;
    const payload: GlyphPayload = {
      payloadVersion: KYBER_GLYPH_VERSION,
      visualVersion: VISUAL_SYSTEM_VERSION,
      saberType: 'single',
      blades: [blade],
      hiltModel: null,
      soundFontRef: null,
      oledBitmapRef: null,
      propFileId: 'default',
      publicName: null,
      createdAt: 0,
      kyberstationVersion: '',
      extras: {},
    };
    const glyph = encodeGlyph(payload);
    setUrl(`?s=${glyph}`);

    renderHook(() => useSharedConfig());

    expect(mocks.toastSuccessSpy).toHaveBeenCalledWith('Loaded crystal');
  });
});

describe('useSharedConfig — `?s=<glyph>` decode path', () => {
  it('decodes a v1 glyph and calls loadPreset with the first blade', () => {
    const glyph = makeV1Glyph({ name: 'Test Saber', shimmer: 0.42 });
    setUrl(`?s=${glyph}`);

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).toHaveBeenCalledTimes(1);
    const calledWith = mocks.loadPresetSpy.mock.calls[0]?.[0] as BladeConfig;
    expect(calledWith.name).toBe('Test Saber');
    expect(calledWith.shimmer).toBeCloseTo(0.42, 5);
    expect(result.current.loaded).toBe(true);
    expect(result.current.shareError).toBeNull();
  });

  it('strips `?s=` from the URL after decode (no double-trigger on reload)', () => {
    const glyph = makeV1Glyph();
    setUrl(`?s=${glyph}`);

    renderHook(() => useSharedConfig());

    // After the effect runs, the URL should no longer carry `?s=`.
    // The hook calls `window.history.replaceState` synchronously inside
    // the useEffect — `renderHook` flushes effects before returning.
    const search = window.location.search;
    expect(search).not.toContain('s=');
    // Path is preserved.
    expect(window.location.pathname).toBe('/editor');
  });

  it('preserves other URL params + hash after stripping `?s=`', () => {
    const glyph = makeV1Glyph();
    // Add an unrelated query param + a hash fragment.
    setUrl(`?s=${glyph}&tab=design&theme=mustafar`, '#anchor');

    renderHook(() => useSharedConfig());

    // The remaining params + hash survive.
    expect(window.location.search).toContain('tab=design');
    expect(window.location.search).toContain('theme=mustafar');
    expect(window.location.search).not.toContain('s=');
    expect(window.location.hash).toBe('#anchor');
  });
});

describe('useSharedConfig — error paths', () => {
  it('surfaces shareError on a malformed glyph + does NOT call loadPreset', () => {
    setUrl(`?s=${makeMalformedGlyph()}`);

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    expect(result.current.shareError).toBeTruthy();
    // The hook reports the underlying parse error message.
    expect(typeof result.current.shareError).toBe('string');
    // User-facing toast says "malformed".
    expect(mocks.toastErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/malformed/i),
    );
  });

  it('surfaces a typed error for a version-mismatched glyph', () => {
    const glyph = makeVersionErrorGlyph();
    setUrl(`?s=${glyph}`);

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    // The error message comes from KyberGlyphVersionError, which mentions
    // the version number explicitly.
    expect(result.current.shareError).toBeTruthy();
    expect(result.current.shareError).toMatch(/version/i);
    // User-facing toast points at "newer version".
    expect(mocks.toastErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/newer version/i),
    );
  });
});

describe('useSharedConfig — no-op path', () => {
  it('does nothing when there is no `?s=` and no hash', () => {
    setUrl('');

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    expect(result.current.shareError).toBeNull();
    // No toasts on a clean URL.
    expect(mocks.toastErrorSpy).not.toHaveBeenCalled();
    expect(mocks.toastSuccessSpy).not.toHaveBeenCalled();
  });

  it('ignores a too-short hash fragment as a no-op', () => {
    // The legacy `#<base64>` handler bails when the hash is < 10 chars.
    setUrl('', '#short');

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    expect(result.current.shareError).toBeNull();
  });
});

describe('useSharedConfig — v2 modulation round-trip', () => {
  it('decodes a v2 glyph (with modulation) and applies it via loadPreset', () => {
    const glyph = makeV2GlyphWithModulation();
    setUrl(`?s=${glyph}`);

    const { result } = renderHook(() => useSharedConfig());

    expect(mocks.loadPresetSpy).toHaveBeenCalledTimes(1);
    const calledWith = mocks.loadPresetSpy.mock.calls[0]?.[0] as BladeConfig & {
      modulation?: ModulationPayload;
    };
    // Sanity: the decoded blade still carries the modulation payload.
    expect(calledWith.modulation).toBeDefined();
    expect(calledWith.modulation?.bindings).toHaveLength(1);
    expect(calledWith.modulation?.bindings[0].source).toBe('swing');
    expect(calledWith.modulation?.bindings[0].target).toBe('shimmer');
    expect(calledWith.modulation?.bindings[0].combinator).toBe('replace');
    expect(calledWith.modulation?.bindings[0].amount).toBeCloseTo(0.6, 5);
    expect(result.current.loaded).toBe(true);
    expect(result.current.shareError).toBeNull();
  });
});
