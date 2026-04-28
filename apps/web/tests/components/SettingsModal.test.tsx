// ─── SettingsModal — tab structure + section grouping tests ─────────────
//
// v0.14.0 left-rail overhaul restructured this modal from a flat 10-section
// list into a 3-tab UI (Appearance / Behavior / Advanced). The Performance
// Bar section was deleted entirely (the underlying surface is being removed
// in PR 2 of the overhaul).
//
// We exercise:
//   1. All three tabs render with the correct labels.
//   2. Each tab body contains its expected SectionToggle headings.
//   3. The Performance Bar section is gone from every tab body.
//   4. Tab roles + ARIA wiring (role=tablist / role=tab / role=tabpanel
//      / aria-selected / aria-controls / aria-labelledby) are present.
//   5. The first tab (Appearance) is selected by default — its panel is
//      not hidden, the others are.
//
// Like other apps/web tests (see BoardPicker.test.tsx) we run under node
// (no jsdom) and assert against `renderToStaticMarkup`. The modal hook +
// SFX module are mocked to no-op. Keyboard interactions can't be exercised
// against static markup — they're trivially correct given the handler
// shape (well-typed React.KeyboardEvent + array indexing) and would
// require jsdom to test meaningfully.

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Silence modal-open / modal-close SFX. Not testing audio.
vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

// useModalDialog touches document + DOM events. Replace with a no-op hook
// returning a stable ref shape.
vi.mock('@/hooks/useModalDialog', () => ({
  useModalDialog: () => ({ dialogRef: { current: null } }),
}));

// useAurebesh reads localStorage. Stub to a fixed mode.
vi.mock('@/hooks/useAurebesh', () => ({
  useAurebesh: () => ({ mode: 'off', setMode: () => {} }),
}));

// performanceTier reads/writes localStorage + applies CSS classes. Stub.
vi.mock('@/lib/performanceTier', () => ({
  getPerformanceTier: () => ({ tier: 'medium', isAutoDetected: true }),
  setPerformanceTier: () => {},
  applyPerformanceTier: () => {},
}));

// layoutStore + accessibilityStore are real Zustand stores. Their
// initial state is fine for static rendering — selectors return defaults.

import { SettingsModal } from '@/components/layout/SettingsModal';

function html(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

function renderModal(): string {
  return html(
    createElement(SettingsModal, {
      isOpen: true,
      onClose: () => {},
    }),
  );
}

// ─── Tab list + roles ────────────────────────────────────────────────

describe('SettingsModal — tab list', () => {
  it('renders all three tabs with their canonical labels', () => {
    const markup = renderModal();
    expect(markup).toContain('data-testid="settings-tablist"');
    expect(markup).toContain('data-testid="settings-tab-appearance"');
    expect(markup).toContain('data-testid="settings-tab-behavior"');
    expect(markup).toContain('data-testid="settings-tab-advanced"');
    expect(markup).toContain('Appearance');
    expect(markup).toContain('Behavior');
    expect(markup).toContain('Advanced');
  });

  it('uses role=tablist on the container and role=tab on each tab', () => {
    const markup = renderModal();
    expect(markup).toContain('role="tablist"');
    // 3 tabs each with role=tab
    const tabRoles = markup.match(/role="tab"/g) ?? [];
    expect(tabRoles.length).toBe(3);
  });

  it('selects Appearance by default — its tab has aria-selected=true and the others false', () => {
    const markup = renderModal();
    // Use slicing to find each tab's aria-selected. Tab id appears in the
    // surrounding attributes, so we search for both shapes.
    expect(markup).toMatch(/id="settings-tab-appearance"[^>]*aria-selected="true"/);
    expect(markup).toMatch(/id="settings-tab-behavior"[^>]*aria-selected="false"/);
    expect(markup).toMatch(/id="settings-tab-advanced"[^>]*aria-selected="false"/);
  });

  it('wires aria-controls from each tab to its tabpanel id', () => {
    const markup = renderModal();
    expect(markup).toContain('aria-controls="settings-tabpanel-appearance"');
    expect(markup).toContain('aria-controls="settings-tabpanel-behavior"');
    expect(markup).toContain('aria-controls="settings-tabpanel-advanced"');
  });

  it('uses tabIndex=0 on the active tab and tabIndex=-1 on the others (roving tabindex)', () => {
    const markup = renderModal();
    expect(markup).toMatch(/id="settings-tab-appearance"[^>]*tabindex="0"/i);
    expect(markup).toMatch(/id="settings-tab-behavior"[^>]*tabindex="-1"/i);
    expect(markup).toMatch(/id="settings-tab-advanced"[^>]*tabindex="-1"/i);
  });
});

// ─── Tab panels + section grouping ───────────────────────────────────

describe('SettingsModal — tab panels', () => {
  it('renders three tabpanels with role=tabpanel and aria-labelledby pointing at the matching tab', () => {
    const markup = renderModal();
    expect(markup).toMatch(
      /role="tabpanel"[^>]*id="settings-tabpanel-appearance"[^>]*aria-labelledby="settings-tab-appearance"/,
    );
    expect(markup).toMatch(
      /role="tabpanel"[^>]*id="settings-tabpanel-behavior"[^>]*aria-labelledby="settings-tab-behavior"/,
    );
    expect(markup).toMatch(
      /role="tabpanel"[^>]*id="settings-tabpanel-advanced"[^>]*aria-labelledby="settings-tab-advanced"/,
    );
  });

  it('shows the appearance tabpanel and hides behavior + advanced by default', () => {
    const markup = renderModal();
    // The default-active tab's panel has no `hidden` attribute; the other
    // two panels do.
    expect(markup).toMatch(
      /id="settings-tabpanel-appearance"(?![^>]*\bhidden\b)/,
    );
    expect(markup).toMatch(/id="settings-tabpanel-behavior"[^>]*\bhidden\b/);
    expect(markup).toMatch(/id="settings-tabpanel-advanced"[^>]*\bhidden\b/);
  });
});

// ─── Section grouping (per docs/SIDEBAR_IA_AUDIT_2026-04-27.md §6) ───
//
// Appearance: Aurebesh Mode, Display, Row density
// Behavior:   Effect auto-release, Feedback
// Advanced:   Layout
// DELETED v0.15.0: Performance Bar (entire section gone),
//                  UI Sounds (placeholder copy only — never functional),
//                  Keyboard Shortcuts (KeyboardShortcutsModal already shows
//                    the same list, opened via `?` or Help),
//                  Performance Tier (AppPerfStrip at app bottom already
//                    has the same HIGH/MED/LOW segmented control —
//                    duplicate control surface).

/**
 * Extract the markup substring belonging to a specific tabpanel so
 * subsequent contains() assertions are scoped to that tab. Markup is
 * statically rendered, so we slice between the tabpanel's start and the
 * next tabpanel (or the end of the body).
 *
 * Anchor on `data-testid="settings-tabpanel-…"` because the testid is
 * unique to the panel <div>, while `id="settings-tabpanel-…"` also
 * appears inside each tab button's `aria-controls` attribute.
 */
function panelMarkup(markup: string, tabId: 'appearance' | 'behavior' | 'advanced'): string {
  const startToken = `data-testid="settings-tabpanel-${tabId}"`;
  const startIdx = markup.indexOf(startToken);
  if (startIdx < 0) throw new Error(`Tabpanel ${tabId} not found in markup`);
  // Find the next tabpanel start (or end of string).
  const remainder = markup.slice(startIdx + startToken.length);
  const nextIdx = remainder.indexOf('data-testid="settings-tabpanel-');
  return nextIdx < 0 ? remainder : remainder.slice(0, nextIdx);
}

describe('SettingsModal — Appearance tab sections', () => {
  it('contains the Aurebesh Mode, Display, and Row density section toggles', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'appearance');
    expect(panel).toContain('Aurebesh Mode');
    expect(panel).toContain('Display');
    expect(panel).toContain('Row density');
  });

  it('does not contain Behavior- or Advanced-tab section labels', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'appearance');
    expect(panel).not.toContain('Effect auto-release');
    expect(panel).not.toContain('Feedback');
    expect(panel).not.toContain('Layout');
    // Deleted in v0.15.0 — assert they're gone everywhere now.
    expect(panel).not.toContain('UI Sounds');
    expect(panel).not.toContain('Keyboard Shortcuts');
    expect(panel).not.toContain('Performance Tier');
  });
});

describe('SettingsModal — Behavior tab sections', () => {
  it('contains Effect auto-release and Feedback', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'behavior');
    expect(panel).toContain('Effect auto-release');
    expect(panel).toContain('Feedback');
  });

  it('does not contain deleted-in-v0.15 sections (UI Sounds / Keyboard Shortcuts)', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'behavior');
    expect(panel).not.toContain('UI Sounds');
    expect(panel).not.toContain('Keyboard Shortcuts');
  });

  it('does not contain Appearance- or Advanced-tab section labels', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'behavior');
    expect(panel).not.toContain('Aurebesh Mode');
    expect(panel).not.toContain('Row density');
    expect(panel).not.toContain('Performance Tier');
    expect(panel).not.toContain('>Layout<');
  });
});

describe('SettingsModal — Advanced tab sections', () => {
  it('contains Layout', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'advanced');
    expect(panel).toContain('Layout');
  });

  it('does not contain deleted-in-v0.15 sections (Performance Tier)', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'advanced');
    expect(panel).not.toContain('Performance Tier');
  });

  it('does not contain Appearance- or Behavior-tab section labels', () => {
    const markup = renderModal();
    const panel = panelMarkup(markup, 'advanced');
    expect(panel).not.toContain('Aurebesh Mode');
    expect(panel).not.toContain('Row density');
    expect(panel).not.toContain('Effect auto-release');
    expect(panel).not.toContain('Feedback');
  });
});

// ─── Performance Bar section deletion ────────────────────────────────

describe('SettingsModal — Performance Bar removal', () => {
  it('does not render a "Performance Bar" SectionToggle anywhere in the modal', () => {
    const markup = renderModal();
    // Sanity: the legacy section's heading text. It should be gone.
    // Note: "Performance Tier" remains and contains the substring
    // "Performance " — so we look for the exact heading text instead.
    expect(markup).not.toContain('>Performance Bar<');
  });

  it('does not render the legacy "Show Performance Bar" toggle', () => {
    const markup = renderModal();
    expect(markup).not.toContain('Show Performance Bar');
    expect(markup).not.toContain('Performance Bar visibility');
  });

  it('does not render the legacy "Reset macro values + page to defaults" button', () => {
    const markup = renderModal();
    expect(markup).not.toContain('Reset macro values');
  });
});

// ─── Modal mechanics preserved ──────────────────────────────────────

describe('SettingsModal — preserved modal mechanics', () => {
  it('renders role=dialog with aria-modal=true and aria-labelledby', () => {
    const markup = renderModal();
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="settings-modal-title"');
  });

  it('renders the close button with the expected aria-label', () => {
    const markup = renderModal();
    expect(markup).toContain('aria-label="Close settings"');
  });

  it('returns null when isOpen=false (modal collapses entirely)', () => {
    const markup = html(
      createElement(SettingsModal, {
        isOpen: false,
        onClose: () => {},
      }),
    );
    expect(markup).toBe('');
  });
});
