// ─── MobileShell — PR A1 layout shape contract ────────────────────────
//
// Pins the structural layout decisions from PR A1:
//   - Header height is `h-12` (was `h-14`) — saves vertical space
//   - Hamburger button has a visible "Menu" text label + border for
//     discoverability (Ken couldn't find the icon-only version)
//   - Blade canvas + effect bar are sticky siblings of the scrollable
//     body region — NOT wrapped in the outer overflow-y-auto. This is
//     the fix for the "odd zoom levels" UX bug where switching sections
//     pushed the blade canvas off-screen.
//   - Effect bar passes `compact` to EffectTriggerBar (drops kbd letter
//     display on mobile — wasted vertical space per Ken's feedback)
//   - Effect bar wrapper uses `px-1 py-1` (was `px-2 py-2`)
//   - Drilled-section bottom bar has a hamburger trigger so users can
//     re-navigate without scrolling back to the header
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
}));

// ── Store mocks ────────────────────────────────────────────────────────

vi.mock('@/stores/uiStore', () => {
  const useUIStore = ((selector: (s: unknown) => unknown) =>
    selector({
      activeSection: mockState.activeSection,
      setActiveSection: (s: string) => {
        mockState.activeSection = s;
      },
    })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useUIStore };
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

  it('header uses h-12 (tightened from h-14)', () => {
    const html = renderShell();
    expect(html).toContain('h-12');
    // Sanity: ensure the old h-14 is gone from the header (other
    // components might use h-14 for unrelated reasons; this is a
    // scoped check — header is the first <header> tag).
    const headerMatch = html.match(/<header[^>]*>/);
    expect(headerMatch).toBeTruthy();
    expect(headerMatch![0]).toContain('h-12');
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

  it('effect bar wrapper uses tightened px-1 py-1 padding', () => {
    const html = renderShell();
    // Find the effect-bar wrapper — the parent div of mock-effect-bar.
    // We assert the wrapper's class string contains px-1 + py-1.
    const m = html.match(/<div class="([^"]*)"[^>]*>\s*<div class="flex items-center gap-1 min-w-fit">/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('px-1');
    expect(m![1]).toContain('py-1');
    // Make sure the old looser values are gone from the wrapper.
    expect(m![1]).not.toContain('px-2');
    expect(m![1]).not.toContain('py-2');
  });

  it('blade canvas region uses tightened height (22vh / 180px / 140px floor)', () => {
    const html = renderShell();
    // Blade canvas wrapper carries an inline style="height:..." with
    // the new min(22vh, 180px) cap and minHeight: 140 floor. React's
    // SSR renders inline styles in the form `style="height:min(22vh, 180px);min-height:140px"`.
    // React serializes inline numeric styles like minHeight as `min-height:140px` (kebab-case).
    expect(html).toMatch(/height:\s*min\(22vh,\s*180px\)/);
    expect(html).toMatch(/min-height:140px/);
    // And the old taller values shouldn't still be there.
    expect(html).not.toMatch(/min\(28vh,\s*220px\)/);
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
      /<div class="(flex-1[^"]*?)">\s*<div class="px-1 py-1[^"]*?overflow-x-auto">/,
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
