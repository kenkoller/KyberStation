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
  altPhaseColors?: Array<{ r: number; g: number; b: number }>;
  detectedEffectIds?: string[];
}

const stubState = vi.hoisted(() => ({
  config: {} as StubConfig,
  convertImportToNative: vi.fn(),
  loadPreset: vi.fn(),
}));

const userPresetStub = vi.hoisted(() => ({
  savePreset: vi.fn(() => 'fake-id'),
  presets: [] as Array<{ id: string; name: string; config: Record<string, unknown> }>,
}));

const uiStoreStub = vi.hoisted(() => ({
  recentImportBatch: null as Array<{ id: string; name: string }> | null,
  setRecentImportBatch: vi.fn(),
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

vi.mock('@/stores/uiStore', () => {
  function useUIStore<T>(selector: (s: typeof uiStoreStub) => T): T {
    return selector(uiStoreStub);
  }
  return { useUIStore };
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
    stubState.loadPreset.mockReset();
    userPresetStub.savePreset.mockClear();
    userPresetStub.presets = [];
    uiStoreStub.recentImportBatch = null;
    uiStoreStub.setRecentImportBatch.mockClear();
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

  // ── Mobile UX audit (2026-05-02): responsive layout drift sentinels ──
  it('inner row defaults to vertical stack on mobile (flex-col)', () => {
    // The default (mobile + tablet) layout stacks description + buttons
    // vertically so the description gets full width on narrow viewports.
    // At ~343px container width, the previous flex-row layout crushed
    // description text into an ~83px column (vertical word-strip).
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toMatch(/class="[^"]*\bflex-col\b/);
  });

  it('inner row switches to horizontal at desktop+ (desktop:flex-row)', () => {
    // Desktop+ keeps the description-left + actions-right side-by-side
    // layout where the banner sits in a roomy right column.
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('desktop:flex-row');
    expect(html).toContain('desktop:items-start');
    expect(html).toContain('desktop:justify-between');
  });

  it('banner root carries scroll-mt for the auto-scroll-into-view anchor', () => {
    // The `scrollIntoView({ block: 'start' })` effect lands the banner
    // flush against its scroll-parent's top edge. `scroll-mt-3` adds a
    // small breathing margin so the banner doesn't visually butt against
    // a sticky header.
    stubState.config = { importedRawCode: 'StylePtr<Blue>()' };
    const html = renderToStaticMarkup(createElement(ImportStatusBanner));
    expect(html).toContain('scroll-mt-3');
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

  // ── Sprint 5E: per-preset switcher (multi-preset import batch) ──
  describe('preset switcher', () => {
    it('does NOT render the switcher when no recent batch is active', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        name: 'Single import',
      };
      uiStoreStub.recentImportBatch = null;
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).not.toContain('import-banner-preset-switcher');
    });

    it('does NOT render the switcher when batch has only one entry', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        name: 'Solo preset',
      };
      uiStoreStub.recentImportBatch = [{ id: 'a', name: 'Solo preset' }];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).not.toContain('import-banner-preset-switcher');
    });

    it('renders the switcher when batch has 2+ entries AND the active config matches one', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        name: 'Obi-Wan ANH',
      };
      uiStoreStub.recentImportBatch = [
        { id: 'a', name: 'Obi-Wan ANH' },
        { id: 'b', name: 'Darth Maul' },
        { id: 'c', name: 'Mace Windu' },
      ];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('data-testid="import-banner-preset-switcher"');
      expect(html).toContain('Preset 1 of 3');
      expect(html).toContain('1. Obi-Wan ANH');
      expect(html).toContain('2. Darth Maul');
      expect(html).toContain('3. Mace Windu');
    });

    it('shows the correct "Preset N of M" indicator for the middle preset', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Red>()',
        name: 'Darth Maul',
      };
      uiStoreStub.recentImportBatch = [
        { id: 'a', name: 'Obi-Wan ANH' },
        { id: 'b', name: 'Darth Maul' },
        { id: 'c', name: 'Mace Windu' },
      ];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('Preset 2 of 3');
    });

    it('does NOT render the switcher when batch is set but active config name is not in the batch', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Yellow>()',
        name: 'Ahsoka', // not in batch
      };
      uiStoreStub.recentImportBatch = [
        { id: 'a', name: 'Obi-Wan ANH' },
        { id: 'b', name: 'Darth Maul' },
      ];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).not.toContain('import-banner-preset-switcher');
    });

    it('switcher select has accessibility label', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        name: 'Obi-Wan ANH',
      };
      uiStoreStub.recentImportBatch = [
        { id: 'a', name: 'Obi-Wan ANH' },
        { id: 'b', name: 'Darth Maul' },
      ];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain(
        'aria-label="Switch the visualizer to a different imported preset"',
      );
    });

    it('switcher select has the correct ID matched to the label', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        name: 'Obi-Wan ANH',
      };
      uiStoreStub.recentImportBatch = [
        { id: 'a', name: 'Obi-Wan ANH' },
        { id: 'b', name: 'Darth Maul' },
      ];
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('for="import-banner-preset-select"');
      expect(html).toContain('id="import-banner-preset-select"');
    });
  });

  // Sprint 5C surface (2026-05-03): the parser already populates
  // altPhaseColors + detectedEffectIds on ReconstructedConfig and
  // applyReconstructedConfig now plumbs them onto BladeConfig. The
  // banner shows a chip-line so users can see at a glance what the
  // imported style cycles through and which effect events it hooks.
  describe('detection summary (altPhaseColors + detectedEffectIds)', () => {
    it('does NOT render the summary when neither field is present', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).not.toContain('data-testid="import-banner-detection-summary"');
    });

    it('does NOT render the summary when both fields are empty arrays', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<Blue>()',
        altPhaseColors: [],
        detectedEffectIds: [],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).not.toContain('data-testid="import-banner-detection-summary"');
    });

    it('renders alt-phase swatches with rgb backgrounds', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<ColorChange<TR, Blue, Red, Green>>()',
        altPhaseColors: [
          { r: 255, g: 0, b: 0 },
          { r: 0, g: 255, b: 0 },
        ],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('data-testid="import-banner-detection-summary"');
      expect(html).toContain('data-testid="alt-phase-swatches"');
      expect(html).toContain('background:rgb(255, 0, 0)');
      expect(html).toContain('background:rgb(0, 255, 0)');
    });

    it('uses singular "phase" when there is exactly one alt phase', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [{ r: 255, g: 0, b: 255 }],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('1 alt phase:');
      expect(html).not.toContain('1 alt phases:');
    });

    it('uses plural "phases" for 2+ alt phases', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [
          { r: 255, g: 0, b: 0 },
          { r: 0, g: 0, b: 255 },
          { r: 0, g: 255, b: 0 },
        ],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('3 alt phases:');
    });

    it('caps swatches at 6 and shows +N overflow chip', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [
          { r: 1, g: 1, b: 1 },
          { r: 2, g: 2, b: 2 },
          { r: 3, g: 3, b: 3 },
          { r: 4, g: 4, b: 4 },
          { r: 5, g: 5, b: 5 },
          { r: 6, g: 6, b: 6 },
          { r: 7, g: 7, b: 7 },
          { r: 8, g: 8, b: 8 },
        ],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('8 alt phases:');
      expect(html).toContain('+2');
    });

    it('renders detected effect ids with EFFECT_ prefix stripped', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: ['EFFECT_PREON', 'EFFECT_BOOT', 'EFFECT_FORCE'],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('3 effects:');
      expect(html).toContain('PREON');
      expect(html).toContain('BOOT');
      expect(html).toContain('FORCE');
      // Stripped, not present as raw EFFECT_PREON in the visible chip text
      expect(html).toContain('PREON, BOOT, FORCE');
    });

    it('uses singular "effect" when there is exactly one detected effect', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: ['EFFECT_PREON'],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('1 effect:');
      expect(html).not.toContain('1 effects:');
    });

    it('caps effect-id chip text at 4 ids and shows +N suffix', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: [
          'EFFECT_PREON',
          'EFFECT_BOOT',
          'EFFECT_FORCE',
          'EFFECT_QUOTE',
          'EFFECT_USER1',
          'EFFECT_USER2',
        ],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('6 effects:');
      expect(html).toContain('+2');
    });

    it('puts the full id list in the title attribute for hover discovery', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: ['EFFECT_PREON', 'EFFECT_BOOT'],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      // The full original list (with EFFECT_ prefix) should appear in title
      expect(html).toContain('title="EFFECT_PREON, EFFECT_BOOT"');
    });

    it('renders both alt-phase + effect rows when both are present', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [{ r: 100, g: 200, b: 50 }],
        detectedEffectIds: ['EFFECT_PREON'],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('1 alt phase:');
      expect(html).toContain('1 effect:');
    });

    it('renders only effects when only detectedEffectIds is present', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        detectedEffectIds: ['EFFECT_BOOT'],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('data-testid="import-banner-detection-summary"');
      expect(html).toContain('1 effect:');
      expect(html).not.toContain('alt phase');
    });

    it('renders only alt phases when only altPhaseColors is present', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [{ r: 255, g: 200, b: 100 }],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('data-testid="import-banner-detection-summary"');
      expect(html).toContain('1 alt phase:');
      expect(html).not.toContain('effects:');
      expect(html).not.toContain('1 effect:');
    });

    it('summary has descriptive aria-label for screen readers', () => {
      stubState.config = {
        importedRawCode: 'StylePtr<...>()',
        altPhaseColors: [{ r: 255, g: 0, b: 0 }],
      };
      const html = renderToStaticMarkup(createElement(ImportStatusBanner));
      expect(html).toContain('aria-label="Detected style features"');
    });
  });
});
