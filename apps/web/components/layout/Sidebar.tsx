'use client';

// ─── Sidebar — left-rail overhaul (v0.14.0) ──────────────────────────────────
//
// Single nav for the entire editor. Replaces the page-tabs in the header
// (Gallery / Design / Audio / Output) AND the DesignPanel's APPEARANCE /
// BEHAVIOR / ADVANCED / ROUTING pill bar. One ID space, one selection
// store entry (`uiStore.activeSection`).
//
// Layout:
//   GALLERY                       (top-level link to /gallery route)
//   APPEARANCE  ▾                 (collapsible group)
//     Blade Style                 (clickable section)
//     Color
//   BEHAVIOR  ▾
//     Ignition & Retraction
//     Combat Effects
//     Gesture Controls
//   ADVANCED  ▾
//     Layer Compositor
//     Hardware
//     My Crystal
//   ROUTING (BETA)  ▾             (board-gated, hidden on non-Proffie boards)
//     Routing
//   AUDIO                         (top-level — clicking selects whole panel)
//   OUTPUT                        (top-level — clicking selects whole panel)
//
// Click a section → renders the matching panel in MainContent.tsx via the
// activeSection switch. Group headers toggle their own collapse state.

import Link from 'next/link';
import { useUIStore, type SectionId, type SidebarGroupId } from '@/stores/uiStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';
import { playUISound } from '@/lib/uiSounds';

interface GroupDef {
  id: SidebarGroupId;
  label: string;
  /** When set, this is a top-level entry (not a collapsible group) and
   *  clicking selects the section directly without a sub-list. */
  topLevelSection?: SectionId;
  sections?: Array<{ id: SectionId; label: string }>;
  /** When true, hide the entire group on boards that can't modulate. */
  modulationGated?: boolean;
}

const GROUPS: GroupDef[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    sections: [
      { id: 'blade-style', label: 'Blade Style' },
      { id: 'color',       label: 'Color' },
    ],
  },
  {
    id: 'behavior',
    label: 'Behavior',
    sections: [
      { id: 'ignition-retraction', label: 'Ignition & Retraction' },
      { id: 'combat-effects',      label: 'Combat Effects' },
      { id: 'gesture-controls',    label: 'Gesture Controls' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    sections: [
      { id: 'layer-compositor', label: 'Layer Compositor' },
      { id: 'hardware',         label: 'Hardware' },
      { id: 'my-crystal',       label: 'My Crystal' },
    ],
  },
  {
    id: 'routing',
    label: 'Routing',
    modulationGated: true,
    sections: [
      { id: 'routing', label: 'Routing' },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    topLevelSection: 'audio',
  },
  {
    id: 'output',
    label: 'Output',
    topLevelSection: 'output',
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

  const visibleGroups = GROUPS.filter(
    (g) => !g.modulationGated || boardSupportsModulation,
  );

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
          // Top-level entries (Audio / Output) — single click, no sub-list
          if (group.topLevelSection) {
            const sectionId = group.topLevelSection;
            const active = activeSection === sectionId;
            const isBeta = group.id === 'routing';
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => handleSectionClick(sectionId)}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    'w-full text-left px-3 py-1.5 font-mono uppercase text-ui-xs tracking-[0.12em] transition-colors',
                    active
                      ? 'text-accent bg-accent-dim/30 border-l-2 border-accent'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-deep/30 border-l-2 border-transparent',
                  ].join(' ')}
                >
                  {group.label}
                  {isBeta && (
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
          }

          // Collapsible group with sub-sections
          const collapsed = sidebarGroupCollapsed[group.id];
          const isBeta = group.id === 'routing';
          return (
            <li key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => toggleSidebarGroup(group.id)}
                aria-expanded={!collapsed}
                className="w-full flex items-center justify-between px-3 py-1.5 font-mono uppercase text-ui-xs tracking-[0.12em] text-text-secondary hover:text-text-primary hover:bg-bg-deep/30 transition-colors"
              >
                <span>
                  {group.label}
                  {isBeta && (
                    <span
                      className="ml-1.5 text-[8px] tracking-wider"
                      style={{ color: 'rgb(var(--status-magenta))' }}
                    >
                      BETA
                    </span>
                  )}
                </span>
                <span className="text-text-muted text-ui-xs">
                  {collapsed ? '▸' : '▾'}
                </span>
              </button>
              {!collapsed && group.sections && (
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
