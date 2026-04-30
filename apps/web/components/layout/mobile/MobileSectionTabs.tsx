'use client';

// ─── MobileSectionTabs — Phase 4.2 (2026-04-30) ──────────────────────────────
//
// Horizontal scrollable tabs that replace the drawer for shallow editing
// navigation. Per "Claude Design Mobile handoff/HANDOFF.md" §"Section
// tabs" verdict:
//   - 6 tabs: COLOR · STYLE · MOTION · FX · HW · ROUTE
//   - Active tab = accent border-bottom + tinted bg
//   - Horizontally scrollable, replaces drawer for shallow nav
//   - Drawer stays reserved for: profiles, presets, library
//
// The 6 tabs are a curated subset of the editor's full SectionId union —
// they cover the "what does my saber look + feel like" surface. Sections
// outside this set (my-saber, my-crystal, audio, output,
// ignition-retraction, layer-compositor, gesture-controls) remain
// reachable via the hamburger drawer.
//
// When `activeSection` is one of those non-tab sections, no tab is
// highlighted — the strip stays visible as a persistent affordance so
// the user can return to an editing tab in one tap.

import type { SectionId } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';

interface TabDef {
  id: SectionId;
  label: string;
}

/** Handoff §3 tab order — kept narrow so the strip is read left-to-right. */
export const MOBILE_SECTION_TABS: ReadonlyArray<TabDef> = [
  { id: 'color', label: 'Color' },
  { id: 'blade-style', label: 'Style' },
  { id: 'motion-simulation', label: 'Motion' },
  { id: 'combat-effects', label: 'FX' },
  { id: 'hardware', label: 'HW' },
  { id: 'routing', label: 'Route' },
];

export const MOBILE_SECTION_TAB_IDS = new Set<SectionId>(
  MOBILE_SECTION_TABS.map((t) => t.id),
);

interface MobileSectionTabsProps {
  /** Optional callback fired after a tab is picked — used by host to close
   *  any open drawer / sheet on selection. */
  onPick?: (id: SectionId) => void;
}

export function MobileSectionTabs({ onPick }: MobileSectionTabsProps) {
  const activeSection = useUIStore((s) => s.activeSection);
  const setActiveSection = useUIStore((s) => s.setActiveSection);

  function handlePick(id: SectionId) {
    if (id !== activeSection) {
      playUISound('tab-switch');
      setActiveSection(id);
    }
    onPick?.(id);
  }

  return (
    <div
      role="tablist"
      aria-label="Editor sections"
      className="mobile-section-tabs w-full flex items-stretch gap-0 overflow-x-auto border-b border-border-subtle bg-bg-secondary/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        height: 'var(--section-tabs-h)',
        // Right-edge fade hint that the strip scrolls (handoff §3).
        WebkitMaskImage:
          'linear-gradient(to right, black calc(100% - 24px), transparent)',
        maskImage:
          'linear-gradient(to right, black calc(100% - 24px), transparent)',
      }}
    >
      {MOBILE_SECTION_TABS.map((tab) => {
        const active = tab.id === activeSection;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="mobile-section-content"
            data-section-id={tab.id}
            data-active={active || undefined}
            onClick={() => handlePick(tab.id)}
            className={[
              'shrink-0 px-3 flex items-center justify-center',
              'text-ui-xs font-medium uppercase tracking-[0.12em]',
              'border-b-2 transition-colors',
              active
                ? 'text-accent border-accent bg-accent-dim/40'
                : 'text-text-secondary border-transparent hover:text-text-primary',
            ].join(' ')}
            style={{
              minWidth: 'var(--touch-target)',
              height: '100%',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
