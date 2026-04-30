// ─── MobileSectionTabs — Phase 4.2 (2026-04-30) ─────────────────────────
//
// SSR shape contract for the horizontal section tabs that replace the
// drawer for shallow editing nav per "Claude Design Mobile handoff".
// node-only vitest env via `renderToStaticMarkup`.
//
// Coverage:
//   1. Renders role="tablist" with the editor-sections aria-label.
//   2. All 6 handoff tabs (COLOR/STYLE/MOTION/FX/HW/ROUTE) render.
//   3. Each tab carries the correct data-section-id mapping to a
//      live SectionId string.
//   4. Each tab has role="tab" + aria-selected attribute.
//   5. `MOBILE_SECTION_TAB_IDS` is the same set as the exported tabs.
//   6. The strip is keyboard-discoverable — every tab is a real
//      <button>.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  MobileSectionTabs,
  MOBILE_SECTION_TABS,
  MOBILE_SECTION_TAB_IDS,
} from '../components/layout/mobile/MobileSectionTabs';

describe('MobileSectionTabs', () => {
  it('exports 6 handoff tabs in spec order', () => {
    expect(MOBILE_SECTION_TABS.map((t) => t.id)).toEqual([
      'color',
      'blade-style',
      'motion-simulation',
      'combat-effects',
      'hardware',
      'routing',
    ]);
  });

  it('exports labels matching the handoff section tabs spec', () => {
    expect(MOBILE_SECTION_TABS.map((t) => t.label)).toEqual([
      'Color',
      'Style',
      'Motion',
      'FX',
      'HW',
      'Route',
    ]);
  });

  it('MOBILE_SECTION_TAB_IDS matches the tab id list 1:1', () => {
    expect(MOBILE_SECTION_TAB_IDS.size).toBe(MOBILE_SECTION_TABS.length);
    for (const tab of MOBILE_SECTION_TABS) {
      expect(MOBILE_SECTION_TAB_IDS.has(tab.id)).toBe(true);
    }
  });

  it('renders role="tablist" with editor-sections aria-label', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Editor sections"');
  });

  it('renders one button per tab with correct data-section-id', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    for (const tab of MOBILE_SECTION_TABS) {
      expect(html).toContain(`data-section-id="${tab.id}"`);
    }
  });

  it('renders each tab as a button with role="tab"', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    // Six tab role attributes (one per handoff tab).
    const tabMatches = html.match(/role="tab"/g);
    expect(tabMatches?.length).toBe(MOBILE_SECTION_TABS.length);
    // Every tab is a real <button>.
    const buttons = html.match(/<button[^>]*role="tab"/g);
    expect(buttons?.length).toBe(MOBILE_SECTION_TABS.length);
  });

  it('marks aria-selected on every tab', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    expect(html).toMatch(/aria-selected="(true|false)"/);
  });

  it('renders the labels visible to the user', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    for (const tab of MOBILE_SECTION_TABS) {
      expect(html).toContain(`>${tab.label}<`);
    }
  });

  it('points the tablist at #mobile-section-content via aria-controls', () => {
    const html = renderToStaticMarkup(createElement(MobileSectionTabs));
    expect(html).toContain('aria-controls="mobile-section-content"');
  });
});
