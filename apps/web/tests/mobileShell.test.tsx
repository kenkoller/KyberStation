// ─── MobileShell — Phase 4.2 sticky-mini-shell layout contract ──────────
//
// Pins the StickyMiniShell anatomy from "Claude Design Mobile
// handoff/HANDOFF.md":
//
//   STICKY top:
//     1. App header              (44px / var(--header-h))
//     2. Mini blade canvas       (64px / var(--blade-rod-h))
//     3. Pixel strip             (36px / var(--mobile-pixel-strip-h))
//     4. MobileActionBar         (56px / var(--actionbar-h))
//     5. MobileSectionTabs       (32px / var(--section-tabs-h))
//
//   SCROLLING body:
//     - Analysis rail (rgb-luma LayerCanvas) at top
//     - Inspector when activeSection='my-saber'
//     - MainContent when activeSection is anything else
//
//   STICKY bottom:
//     6. MobileStatusBarStrip    (36px / var(--statusbar-h))
//
// Pattern matches the AB section tests (`react-dom/server` +
// `renderToStaticMarkup`, no jsdom dep). Heavy children (BladeCanvas,
// MainContent, Inspector, etc.) are stubbed; the new mobile primitives
// (MobileActionBar, MobileSectionTabs, MobileStatusBarStrip) render
// their actual SSR shape so the integration is verified.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, createRef } from 'react';
import type { BladeEngine } from '@kyberstation/engine';

// ── Hoisted mock state ────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  activeSection: 'my-saber' as string,
  ledCount: 144,
  isPaused: false,
  reducedMotion: false,
}));

// ── Store mocks ────────────────────────────────────────────────────────

vi.mock('@/stores/uiStore', () => {
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      activeSection: mockState.activeSection,
      setActiveSection: (s: string) => {
        mockState.activeSection = s;
      },
      isPaused: mockState.isPaused,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore };
});

vi.mock('@/stores/bladeStore', () => {
  const state = {
    config: { ledCount: mockState.ledCount },
    isOn: false,
    setIsOn: () => {},
  };
  const getState = () => state;
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector(state)) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => typeof state;
  };
  useBladeStore.getState = getState;
  return { useBladeStore };
});

vi.mock('@/stores/accessibilityStore', () => {
  const useAccessibilityStore = ((selector: (s: unknown) => unknown) =>
    selector({
      reducedMotion: mockState.reducedMotion,
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useAccessibilityStore };
});

// MobileActionBar reads activeEffectsStore.active (Set). Default empty.
vi.mock('@/stores/activeEffectsStore', () => {
  const state = { active: new Set<string>() };
  const useActiveEffectsStore = ((selector: (s: unknown) => unknown) =>
    selector(state)) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
    getState: () => typeof state;
  };
  useActiveEffectsStore.getState = () => state;
  return {
    useActiveEffectsStore,
    isActiveSelector: () => () => false,
  };
});

vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

vi.mock('@/lib/effectToggle', () => ({
  toggleOrTriggerEffect: () => {},
}));

// ── Heavy child stubs ─────────────────────────────────────────────────
//
// We intentionally stub these — the test is asserting the SHELL's
// structure, not the contents of nested components. The new mobile
// primitives (MobileActionBar / MobileSectionTabs / MobileStatusBarStrip)
// are NOT stubbed — their integration is part of the contract under
// test.

vi.mock('@/components/editor/BladeCanvas', () => ({
  BladeCanvas: () => createElement('div', { 'data-testid': 'mock-blade-canvas' }),
}));

vi.mock('@/components/editor/Inspector', () => ({
  Inspector: () => createElement('div', { 'data-testid': 'mock-inspector' }),
}));

vi.mock('@/components/layout/MainContent', () => ({
  MainContent: () => createElement('div', { 'data-testid': 'mock-main-content' }),
}));

// MobileStatusBarStrip wraps StatusBar — we stub the underlying
// StatusBar (it has heavy live-data wiring) and verify the wrapper
// mounts correctly.
vi.mock('@/components/layout/StatusBar', () => ({
  StatusBar: ({ mode }: { mode?: string }) =>
    createElement('div', {
      'data-testid': 'mock-status-bar',
      'data-mode': mode ?? 'default',
    }),
}));

vi.mock('@/components/editor/AccessibilityPanel', () => ({
  AccessibilityPanel: () => createElement('div', { 'data-testid': 'mock-a11y-panel' }),
}));

vi.mock('@/components/editor/FullscreenPreview', () => ({
  FullscreenPreview: () => createElement('div', { 'data-testid': 'mock-fullscreen-preview' }),
  FullscreenButton: () => createElement('button', { 'data-testid': 'mock-fullscreen-btn' }),
}));

vi.mock('@/components/layout/PauseButton', () => ({
  PauseButton: () => createElement('button', { 'data-testid': 'mock-pause-btn' }),
}));

vi.mock('@/components/layout/MobileSidebarDrawer', () => ({
  MobileSidebarDrawer: () => createElement('div', { 'data-testid': 'mock-sidebar-drawer' }),
}));

vi.mock('@/components/editor/PixelStripPanel', () => ({
  PixelStripPanel: () => createElement('div', { 'data-testid': 'mock-pixel-strip' }),
}));

vi.mock('@/components/editor/VisualizationStack', () => ({
  LayerCanvas: ({ layerId }: { layerId: string }) =>
    createElement('div', {
      'data-testid': 'mock-layer-canvas',
      'data-layer-id': layerId,
    }),
}));

import { MobileShell } from '@/components/layout/MobileShell';

// ── Test harness ──────────────────────────────────────────────────────

function renderShell() {
  const engineRef = createRef<BladeEngine | null>();
  return renderToStaticMarkup(
    createElement(MobileShell, {
      showA11yPanel: false,
      setShowA11yPanel: () => {},
      engineRef,
      isOn: false,
      toggleWithAudio: () => {},
      triggerEffectWithAudio: () => {},
      releaseEffect: () => {},
      audio: { muted: false, toggleMute: () => {} },
    }),
  );
}

describe('MobileShell — Phase 4.2 layout shape', () => {
  beforeEach(() => {
    mockState.activeSection = 'my-saber';
  });

  // ── Sticky top chrome (5 stacked regions) ────────────────────────

  it('header uses --header-h via inline style (not Tailwind h-10/h-12)', () => {
    const html = renderShell();
    const headerMatch = html.match(/<header[^>]*>/);
    expect(headerMatch).toBeTruthy();
    expect(headerMatch![0]).toContain('height:var(--header-h)');
  });

  it('hamburger button has aria-label + visible "Menu" label', () => {
    const html = renderShell();
    expect(html).toContain('aria-label="Open editor sections menu"');
    expect(html).toContain('>Menu<');
  });

  it('only ONE hamburger button (in header) — bottom-bar copy was removed in 4.2', () => {
    const html = renderShell();
    // Phase 4.1's drilled-section bottom bar duplicated the hamburger
    // in the bottom chrome. Phase 4.2 retires the bottom bar; section
    // tabs replace it. Header is the single discoverable entry point.
    const matches = html.match(/aria-label="Open editor sections menu"/g);
    expect(matches?.length).toBe(1);
  });

  it('blade canvas region uses --blade-rod-h (64px) inline style', () => {
    const html = renderShell();
    // Match the wrapper div containing aria-label="Blade preview" — attr
    // order in renderToStaticMarkup output is class→style→role→aria-label,
    // so we anchor on the wrapper opening tag and check both attrs.
    const m = html.match(/<div[^>]*aria-label="Blade preview"[^>]*>/);
    expect(m).toBeTruthy();
    expect(m![0]).toContain('style="height:var(--blade-rod-h)"');
    // PR A1/A2's intermediate values must be gone.
    expect(html).not.toMatch(/min\(15vh,\s*120px\)/);
    expect(html).not.toMatch(/min\(22vh,\s*180px\)/);
  });

  it('pixel strip region uses --mobile-pixel-strip-h inline style', () => {
    const html = renderShell();
    const m = html.match(/<div[^>]*aria-label="Pixel strip"[^>]*>/);
    expect(m).toBeTruthy();
    expect(m![0]).toContain('style="height:var(--mobile-pixel-strip-h)"');
  });

  it('mounts MobileActionBar (toolbar role + 5 chips + overflow)', () => {
    const html = renderShell();
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Effect triggers"');
    // 5 primary chip ids
    for (const id of ['ignite', 'clash', 'blast', 'lockup', 'stab']) {
      expect(html).toContain(`data-chip-id="${id}"`);
    }
    // Overflow trigger
    expect(html).toContain('aria-label="More effects"');
  });

  it('mounts MobileSectionTabs (tablist + 6 tabs)', () => {
    const html = renderShell();
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Editor sections"');
    for (const id of [
      'color',
      'blade-style',
      'motion-simulation',
      'combat-effects',
      'hardware',
      'routing',
    ]) {
      expect(html).toContain(`data-section-id="${id}"`);
    }
  });

  it('sticky chrome order is header → blade → pixel → action bar → section tabs', () => {
    const html = renderShell();
    const m = html.match(
      /<header[\s\S]*?aria-label="Blade preview"[\s\S]*?aria-label="Pixel strip"[\s\S]*?role="toolbar"[\s\S]*?role="tablist"/,
    );
    expect(m).toBeTruthy();
  });

  // ── Scrolling body ───────────────────────────────────────────────

  it('body scroll region carries id="mobile-section-content" + overflow-y-auto', () => {
    const html = renderShell();
    expect(html).toMatch(/<div id="mobile-section-content"[^>]*overflow-y-auto/);
  });

  it('analysis rail (rgb-luma LayerCanvas) is inside the scroll body, not sticky', () => {
    const html = renderShell();
    // Analysis rail appears AFTER the sticky chrome (after section tabs)
    // and INSIDE #mobile-section-content.
    const m = html.match(
      /<div id="mobile-section-content"[\s\S]*?aria-label="Analysis rail"[\s\S]*?data-layer-id="rgb-luma"/,
    );
    expect(m).toBeTruthy();
  });

  it('home (my-saber) view renders Inspector inside scroll body', () => {
    mockState.activeSection = 'my-saber';
    const html = renderShell();
    expect(html).toMatch(
      /<div id="mobile-section-content"[\s\S]*?data-testid="mock-inspector"/,
    );
    expect(html).not.toContain('data-testid="mock-main-content"');
  });

  it('drilled section (blade-style) renders MainContent inside scroll body', () => {
    mockState.activeSection = 'blade-style';
    const html = renderShell();
    expect(html).toMatch(
      /<div id="mobile-section-content"[\s\S]*?data-testid="mock-main-content"/,
    );
    expect(html).not.toContain('data-testid="mock-inspector"');
  });

  // ── Bottom chrome ────────────────────────────────────────────────

  it('mounts MobileStatusBarStrip (StatusBar mode="scroll") at the bottom', () => {
    const html = renderShell();
    expect(html).toContain('data-testid="mock-status-bar"');
    expect(html).toContain('data-mode="scroll"');
  });

  it('does NOT render the legacy "Editor navigation" bottom bar', () => {
    // The Phase 4.1 in-editor bottom bar (Back-to-Canvas + section pill
    // + duplicate hamburger) was retired in 4.2 — section tabs cover
    // the same nav role with persistent visibility.
    const html = renderShell();
    expect(html).not.toContain('aria-label="Editor navigation"');
  });

  it('bottom chrome wrapper applies safe-area-inset-bottom padding', () => {
    const html = renderShell();
    expect(html).toContain('pb-[env(safe-area-inset-bottom)]');
  });
});
