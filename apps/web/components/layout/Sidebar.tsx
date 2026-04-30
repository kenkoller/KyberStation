'use client';

// ─── Sidebar — IA reorganization (2026-04-27) ───────────────────────────────
//
// Single nav for the entire editor. Replaces the page-tabs in the header
// AND the DesignPanel's old pill bar. One ID space, one selection store
// entry (`uiStore.activeSection`).
//
// Layout (Setup → Design → Reactivity → Output, the order users actually
// move through). Per docs/SIDEBAR_IA_AUDIT_2026-04-27.md §6.
//
//   GALLERY                       (top-level link to /gallery route)
//   SETUP  ▾
//     My Saber                    (NEW — promoted from OutputPanel accordion)
//     Hardware
//   DESIGN  ▾
//     Blade Style
//     Color
//     Ignition & Retraction
//     Combat Effects
//     Layers                      (renamed from "Layer Compositor")
//   REACTIVITY  ▾
//     Routing                     (BETA, modulationGated — hidden on non-Proffie boards)
//     Motion Simulation
//     Gesture Controls
//   OUTPUT  ▾
//     Audio                       (demoted from top-level)
//     Output                      (demoted from top-level)
//
// Click a section → renders the matching panel in MainContent.tsx via the
// activeSection switch. Group headers toggle their own collapse state.
// modulationGated now lives on individual sections so siblings stay visible
// when Routing is hidden.

import Link from 'next/link';
import { useUIStore, type SectionId, type SidebarGroupId } from '@/stores/uiStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';
import { playUISound } from '@/lib/uiSounds';

interface SectionDef {
  id: SectionId;
  label: string;
  /** When true, hide this section on boards that can't modulate.
   *  (Was previously a group-level flag; now per-section so REACTIVITY
   *  siblings stay visible when Routing is hidden.) */
  modulationGated?: boolean;
  /** When true, render a small magenta "BETA" chip after the label. */
  beta?: boolean;
}

interface GroupDef {
  id: SidebarGroupId;
  label: string;
  sections: SectionDef[];
}

const GROUPS: GroupDef[] = [
  {
    id: 'setup',
    label: 'Setup',
    sections: [
      { id: 'my-saber', label: 'Saber Profiles' },
      { id: 'hardware', label: 'Hardware' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    sections: [
      { id: 'blade-style',         label: 'Blade Style' },
      { id: 'color',               label: 'Color' },
      { id: 'ignition-retraction', label: 'Ignition & Retraction' },
      { id: 'combat-effects',      label: 'Combat Effects' },
      { id: 'layer-compositor',    label: 'Layers' },
    ],
  },
  {
    id: 'reactivity',
    label: 'Reactivity',
    sections: [
      { id: 'routing',           label: 'Routing', modulationGated: true, beta: true },
      { id: 'motion-simulation', label: 'Motion Simulation' },
      { id: 'gesture-controls',  label: 'Gesture Controls' },
    ],
  },
  {
    id: 'output',
    label: 'Output',
    sections: [
      { id: 'audio',      label: 'Audio' },
      { id: 'output',     label: 'Output' },
      { id: 'my-crystal', label: 'Saber Card / Crystal' },
    ],
  },
];

interface SidebarProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Sidebar({ className, style }: SidebarProps) {
  const activeSection = useUIStore((s) => s.activeSection);
  const setActiveSection = useUIStore((s) => s.setActiveSection);
  const sidebarGroupCollapsed = useUIStore((s) => s.sidebarGroupCollapsed);
  const toggleSidebarGroup = useUIStore((s) => s.toggleSidebarGroup);
  const boardId = useBoardProfile().boardId;
  const boardSupportsModulation = canBoardModulate(boardId);

  // Filter modulation-gated sections out per-group; if a group ends up
  // with zero visible sections (won't happen with the v0.15 taxonomy
  // since every group has at least one always-visible section), hide it.
  const visibleGroups = GROUPS
    .map((g) => ({
      ...g,
      sections: g.sections.filter(
        (s) => !s.modulationGated || boardSupportsModulation,
      ),
    }))
    .filter((g) => g.sections.length > 0);

  const handleSectionClick = (id: SectionId) => {
    playUISound('tab-switch');
    setActiveSection(id);
  };

  return (
    <aside
      className={[
        'flex flex-col bg-bg-secondary/60 border-r border-border-subtle shrink-0 overflow-y-auto',
        className ?? '',
      ].join(' ')}
      role="navigation"
      aria-label="Editor sections"
      style={style}
    >
      {/* Top: Gallery link (route, not a section selection) */}
      <Link
        href="/gallery"
        className="px-3 py-2 font-mono uppercase text-ui-xs tracking-[0.12em] text-text-muted hover:text-text-secondary hover:bg-bg-deep/30 border-b border-border-subtle transition-colors"
      >
        Gallery →
      </Link>

      {/* Groups */}
      <ul className="flex-1 min-h-0 py-1">
        {visibleGroups.map((group) => {
          const collapsed = sidebarGroupCollapsed[group.id];
          return (
            <li key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggleSidebarGroup(group.id)}
                aria-expanded={!collapsed}
                className="w-full flex items-center justify-between px-3 py-1.5 font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary hover:text-text-primary hover:bg-bg-deep/30 transition-colors"
              >
                <span>{group.label}</span>
                <span className="text-text-muted text-ui-xs">
                  {collapsed ? '▸' : '▾'}
                </span>
              </button>
              {!collapsed && (
                <ul role="list" className="mt-0.5">
                  {group.sections.map((section) => {
                    const active = activeSection === section.id;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => handleSectionClick(section.id)}
                          aria-current={active ? 'true' : undefined}
                          className={[
                            'w-full text-left pl-6 pr-3 py-1 text-ui-xs transition-colors',
                            active
                              ? 'text-accent bg-accent-dim/30 border-l-2 border-accent'
                              : 'text-text-secondary hover:text-text-primary hover:bg-bg-deep/30 border-l-2 border-transparent',
                          ].join(' ')}
                        >
                          {section.label}
                          {section.beta && (
                            <span
                              className="ml-1.5 text-[8px] tracking-wider"
                              style={{ color: 'rgb(var(--status-magenta))' }}
                            >
                              BETA
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
