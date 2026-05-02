// ─── ImportStatusBanner — Phase 2B Fett263 import sprint ───────────────
//
// Pins the OUTPUT-panel banner that appears whenever the active config
// carries `importedRawCode`. The banner is the user's surface for
// understanding the "edits don't change export until Convert" model
// that Phase 2A's export-path preservation enables.
//
// Pattern matches `parameterSheetHost.test.tsx` — Zustand's React
// binding pins SSR snapshots to `getInitialState()`, so we mock the
// store hook to read from a mutable hoisted stub that the test body
// can mutate before `renderToStaticMarkup`.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

interface StubConfig {
  importedRawCode?: string;
  importedAt?: number;
  importedSource?: string;
  name?: string;
}

const stubState = vi.hoisted(() => ({
  config: {} as StubConfig,
  convertImportToNative: vi.fn(),
}));

const userPresetStub = vi.hoisted(() => ({
  savePreset: vi.fn(() => 'fake-id'),
}));

vi.mock('@/stores/bladeStore', () => {
  function useBladeStore<T>(selector: (s: typeof stubState) => T): T {
    return selector(stubState);
  }
  return { useBladeStore };
});

vi.mock('@/stores/userPresetStore', () => {
  function useUserPresetStore<T>(selector: (s: typeof userPresetStub) => T): T {
    return selector(userPresetStub);
  }
  return { useUserPresetStore };
});

vi.mock('@/lib/toastManager', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// HelpTooltip pulls in icon assets that aren't worth loading for SSR shape tests.
vi.mock('@/components/shared/HelpTooltip', () => ({
  HelpTooltip: ({ text }: { text: string }) =>
    createElement('span', { 'data-help': text }, '?'),
}));

import { ImportStatusBanner } from '@/components/editor/ImportStatusBanner';

describe('ImportStatusBanner', () => {
  beforeEach(() => {
    stubState.config = {};
    stubState.convertImportToNative.mockReset();
    userPresetStub.savePreset.mockClear();
  });

  it('renders nothing when importedRawCode is absent', () => {
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toBe('');
  });

  it('renders nothing when importedRawCode is the empty string', () => {
    stubState.config = { importedRawCode: '' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toBe('');
  });

  it('renders the banner when importedRawCode is set', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('data-testid="import-status-banner"');
    expect(html).toContain('Imported');
    expect(html).toContain('Convert to Native');
  });

  it('shows the importedSource label when provided', () => {
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedSource: 'Fett263 OS7 Style Library',
    };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('Fett263 OS7 Style Library');
  });

  it('falls back to "External source" when importedSource is absent', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('External source');
  });

  it('renders "moments ago" for very recent imports', () => {
    const now = 1714694400000;
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: now - 1000, // 1s ago
    };
    const html = renderToStaticMarkup(
      createElement(ImportStatusBanner, { nowMs: now }),
    );
    expect(html).toContain('moments ago');
  });

  it('renders singular minute correctly', () => {
    const now = 1714694400000;
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: now - 60_000, // exactly 1 minute ago
    };
    const html = renderToStaticMarkup(
      createElement(ImportStatusBanner, { nowMs: now }),
    );
    expect(html).toContain('1 minute ago');
  });

  it('renders plural minutes correctly', () => {
    const now = 1714694400000;
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: now - 5 * 60_000, // 5 minutes ago
    };
    const html = renderToStaticMarkup(
      createElement(ImportStatusBanner, { nowMs: now }),
    );
    expect(html).toContain('5 minutes ago');
  });

  it('renders hours correctly', () => {
    const now = 1714694400000;
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: now - 3 * 3600_000, // 3 hours ago
    };
    const html = renderToStaticMarkup(
      createElement(ImportStatusBanner, { nowMs: now }),
    );
    expect(html).toContain('3 hours ago');
  });

  it('renders days correctly', () => {
    const now = 1714694400000;
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: now - 2 * 24 * 3600_000, // 2 days ago
    };
    const html = renderToStaticMarkup(
      createElement(ImportStatusBanner, { nowMs: now }),
    );
    expect(html).toContain('2 days ago');
  });

  it('omits the relative time when importedAt is non-finite', () => {
    stubState.config = {
      importedRawCode: 'StylePtr<Blue>()',
      importedAt: NaN,
      importedSource: 'Test source',
    };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('Test source');
    expect(html).not.toContain('ago');
  });

  it('Convert to Native button has accessibility label', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('aria-label="Convert imported code to native');
  });

  it('uses the warn-toned badge color tokens (not status-error or success)', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('--badge-creative');
    expect(html).not.toContain('--status-error');
    expect(html).not.toContain('--status-ok');
  });

  it('exposes the role=status semantic for screen readers', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Imported configuration status"');
  });

  // ── Phase 3.7: Save Preset button (discoverability fix) ──
  it('renders the Save Preset button when import is active', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('data-testid="import-banner-save-button"');
    expect(html).toContain('Save Preset');
  });

  it('Save Preset button has descriptive aria-label', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain(
      'aria-label="Save this imported preset to your library so you can return to it later"',
    );
  });

  it('uses a star glyph for the Save action (visual affordance)', () => {
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    // Match the parent SavePresetButton's ★ glyph convention
    expect(html).toContain('★ Save Preset');
  });

  it('does NOT render Save Preset button when no import is active', () => {
    stubState.config = {};
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).not.toContain('Save Preset');
    expect(html).not.toContain('import-banner-save-button');
  });
});
