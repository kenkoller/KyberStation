// ─── MobileShell — PR A1 + A2 layout shape contract ───────────────────
//
// Pins the structural layout decisions from PR A1 + A2:
//   PR A1:
//   - Hamburger button has a visible "Menu" text label + border for
//     discoverability (Ken couldn't find the icon-only version)
//   - Blade canvas + effect bar are sticky siblings of the scrollable
//     body region — NOT wrapped in the outer overflow-y-auto. This is
//     the fix for the "odd zoom levels" UX bug where switching sections
//     pushed the blade canvas off-screen.
//   - Effect bar passes `compact` to EffectTriggerBar (drops kbd letter
//     display on mobile — wasted vertical space per Ken's feedback)
//   - Drilled-section bottom bar has a hamburger trigger so users can
//     re-navigate without scrolling back to the header
//
//   PR A2 (density v2 + analysis stack):
//   - Header height tightened to `h-10` (was `h-12`)
//   - Header buttons go below WCAG 44px floor — 30px touch-target
//     for chrome chips (DAW + iOS-app density)
//   - Effect bar wrapper uses `px-1 py-0.5`
//   - Blade canvas region trimmed to `min(15vh, 120px)` floor 96
//   - PixelStripPanel mounted directly below blade canvas (matches
//     desktop CanvasLayout vertical order)
//   - LayerCanvas (rgb-luma analysis) mounted directly below pixel strip
//
// Pattern matches the AB section tests (`react-dom/server` +
// `renderToStaticMarkup`, no jsdom dep). Heavy children (BladeCanvas,
// MainContent, Inspector, etc.) are stubbed because they pull in the
// engine + Zustand stores that don't matter for THIS test's contract.

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

vi.mock('@/lib/uiSounds', () => ({
  playUISound: () => {},
}));

// ── Heavy child stubs ─────────────────────────────────────────────────
//
// We intentionally stub these — the test is asserting the SHELL's
// structure, not the contents of nested components. Each stub renders
// a marker that we can grep for to confirm it mounted at the expected
// point in the tree.

vi.mock('@/components/editor/BladeCanvas', () => ({
  BladeCanvas: () => createElement('div', { 'data-testid': 'mock-blade-canvas' }),
}));

// EffectTriggerBar stub — ECHOES the `compact` prop into the DOM so
// the test can verify MobileShell passes it.
vi.mock('@/components/editor/EffectTriggerBar', () => ({
  EffectTriggerBar: ({ compact }: { onTrigger: (t: string) => void; compact?: boolean }) =>
    createElement('div', {
      'data-testid': 'mock-effect-bar',
      'data-compact': compact ? 'true' : 'false',
    }),
}));

vi.mock('@/components/editor/Inspector', () => ({
  Inspector: () => createElement('div', { 'data-testid': 'mock-inspector' }),
}));

vi.mock('@/components/layout/MainContent', () => ({
  MainContent: () => createElement('div', { 'data-testid': 'mock-main-content' }),
}));

vi.mock('@/components/layout/StatusBar', () => ({
  StatusBar: () => createElement('div', { 'data-testid': 'mock-status-bar' }),
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

describe('MobileShell — PR A1 layout shape', () => {
  beforeEach(() => {
    mockState.activeSection = 'my-saber';
  });

  it('header uses h-10 (PR A2 density v2)', () => {
    const html = renderShell();
    const headerMatch = html.match(/<header[^>]*>/);
    expect(headerMatch).toBeTruthy();
    expect(headerMatch![0]).toContain('h-10');
    expect(headerMatch![0]).not.toContain('h-12');
    expect(headerMatch![0]).not.toContain('h-14');
  });

  it('hamburger button shows visible "Menu" label', () => {
    const html = renderShell();
    // The hamburger has aria-label="Open editor sections menu" + a
    // visible "Menu" text node. Both must be present.
    expect(html).toContain('aria-label="Open editor sections menu"');
    expect(html).toContain('>Menu<');
  });

  it('hamburger has border affordance (not bare icon)', () => {
    const html = renderShell();
    // Look for the button containing the menu label, then verify it
    // has border classes. The first hamburger is in the header.
    const hamburgerBtn = html.match(
      /<button[^>]*aria-label="Open editor sections menu"[^>]*>/,
    );
    expect(hamburgerBtn).toBeTruthy();
    expect(hamburgerBtn![0]).toContain('border');
  });

  it('effect bar passes compact prop to EffectTriggerBar', () => {
    const html = renderShell();
    expect(html).toContain('data-testid="mock-effect-bar"');
    expect(html).toContain('data-compact="true"');
  });

  it('effect bar wrapper uses tightened px-1 py-0.5 padding (single-row, ~24px)', () => {
    const html = renderShell();
    // Find the effect-bar wrapper — the parent div of mock-effect-bar.
    // We assert the wrapper's class string contains px-1 + py-0.5.
    const m = html.match(/<div class="([^"]*)"[^>]*>\s*<div class="flex items-center gap-1 min-w-fit">/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('px-1');
    expect(m![1]).toContain('py-0.5');
    // Make sure the old looser values are gone from the wrapper.
    expect(m![1]).not.toContain('px-2');
    expect(m![1]).not.toContain('py-2');
    // py-1 was an intermediate step — also gone.
    expect(m![1]).not.toMatch(/\bpy-1\b/);
  });

  it('blade canvas region uses PR A2 height (15vh / 120px cap / 96px floor)', () => {
    const html = renderShell();
    // Blade canvas wrapper inline style: `min(15vh, 120px)` cap with
    // `minHeight: 96` floor. Per Ken's "blade preview should take less
    // vertical space" feedback (was 178px in PR A1).
    expect(html).toMatch(/height:\s*min\(15vh,\s*120px\)/);
    expect(html).toMatch(/min-height:96px/);
    // PR A1's intermediate value should be gone.
    expect(html).not.toMatch(/min\(22vh,\s*180px\)/);
    // And the original values too.
    expect(html).not.toMatch(/min\(28vh,\s*220px\)/);
  });

  it('mounts PixelStripPanel directly below the blade canvas (PR A2)', () => {
    const html = renderShell();
    // The blade canvas region (aria-label="Blade preview") should be
    // immediately followed by the pixel strip region (aria-label="Pixel strip").
    const m = html.match(
      /aria-label="Blade preview"[\s\S]*?aria-label="Pixel strip"[\s\S]*?data-testid="mock-pixel-strip"/,
    );
    expect(m).toBeTruthy();
  });

  it('mounts LayerCanvas (rgb-luma analysis) directly below the pixel strip (PR A2)', () => {
    const html = renderShell();
    // Pixel strip region followed by the analysis rail region with
    // a LayerCanvas mounted with layerId="rgb-luma".
    const m = html.match(
      /aria-label="Pixel strip"[\s\S]*?aria-label="Analysis rail"[\s\S]*?data-testid="mock-layer-canvas"[\s\S]*?data-layer-id="rgb-luma"/,
    );
    expect(m).toBeTruthy();
  });

  it('header chrome buttons are min-h-[30px] (sub-WCAG density per PR A2)', () => {
    const html = renderShell();
    // The audio mute button is a clear touchstone — should be
    // min-h-[30px] / min-w-[30px] now (was min-h-[44px] in PR A1).
    const muteBtn = html.match(/<button[^>]*aria-label="(?:Mute|Unmute) audio"[^>]*>/);
    expect(muteBtn).toBeTruthy();
    expect(muteBtn![0]).toContain('min-h-[30px]');
    expect(muteBtn![0]).toContain('min-w-[30px]');
    // The 44px floor should be gone.
    expect(muteBtn![0]).not.toContain('min-h-[44px]');
  });

  it('blade canvas + effect bar are sticky — outer wrapper does NOT have overflow-y-auto', () => {
    const html = renderShell();
    // The outer Main-Content-Area wrapper used to be `<div class="...
    // overflow-y-auto">`. After PR A1 it's `min-w-0` instead. The body
    // region (Inspector or MainContent) gets its own overflow-y-auto.
    //
    // Look for the wrapper that contains the effect bar. It must NOT
    // have `overflow-y-auto` in its className — only `min-h-0`.
    const m = html.match(
      /<div class="(flex-1[^"]*?)">\s*<div class="px-1 py-0\.5[^"]*?overflow-x-auto">/,
    );
    expect(m).toBeTruthy();
    expect(m![1]).not.toContain('overflow-y-auto');
    expect(m![1]).toContain('min-w-0');
  });

  it('home view body region (Inspector wrapper) has its own overflow-y-auto', () => {
    mockState.activeSection = 'my-saber'; // home
    const html = renderShell();
    // Inspector is wrapped in `flex-1 min-h-0 flex flex-col overflow-y-auto`.
    expect(html).toMatch(/<div class="flex-1 min-h-0 flex flex-col overflow-y-auto">\s*<div data-testid="mock-inspector"/);
  });

  it('drilled section view body region has overflow-y-auto + bottom bar', () => {
    mockState.activeSection = 'blade-style'; // drilled
    const html = renderShell();
    // MainContent wrapper has overflow-y-auto.
    expect(html).toMatch(/<div class="flex-1 min-h-0 flex flex-col overflow-y-auto">\s*<div data-testid="mock-main-content"/);
    // Bottom bar appears (region with aria-label="Editor navigation").
    expect(html).toContain('aria-label="Editor navigation"');
  });

  it('drilled section bottom bar contains hamburger trigger', () => {
    mockState.activeSection = 'blade-style';
    const html = renderShell();
    // Two hamburger buttons should exist in the SSR markup when
    // drilled: one in the header, one in the bottom bar. Both share
    // the same aria-label, so we count occurrences.
    const matches = html.match(/aria-label="Open editor sections menu"/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(2);
  });

  it('home view does NOT show the in-editor bottom bar (StatusBar shows instead)', () => {
    mockState.activeSection = 'my-saber';
    const html = renderShell();
    expect(html).not.toContain('aria-label="Editor navigation"');
    // Mock StatusBar mounts in its place.
    expect(html).toContain('data-testid="mock-status-bar"');
    // Only ONE hamburger button on home (header only — bottom bar's
    // hamburger only appears when drilled).
    const matches = html.match(/aria-label="Open editor sections menu"/g);
    expect(matches!.length).toBe(1);
  });
});
