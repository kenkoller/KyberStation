'use client';

// ─── BladeStyleColumnA — Sidebar A/B v2 Phase 2 ────────────────────────
//
// 29-style scrollable list rendered in Column A of the MainContentABLayout
// when the active sidebar section is `blade-style` AND `useABLayout` is
// true. Replaces the in-panel MiniGalleryPicker grid that legacy
// `StylePanel.tsx` (the off-flag fallback) still renders.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §3 + §4.1:
//   - Each row: 40×40 thumbnail · label + 1-line description · active stripe
//   - Top of A: search input ("Filter 29 styles…")
//   - Active row matches `config.style`; visual treatment mirrors the
//     sidebar's active item (`bg-accent-dim/30 border-l-2 border-accent
//     text-accent`).
//
// Sort dropdown is intentionally NOT shipped in Phase 2 — catalog order
// is the only sort the existing UI exposes today, and adding sort options
// would be a v1.x decision that needs design input on what the alternate
// orderings should be (era, popularity, complexity, etc.). The
// scaffolding is here in `useMemo` so a future commit only needs to add
// sort modes, not restructure the component.

import { useMemo, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { playUISound } from '@/lib/uiSounds';
import { getStyleThumbnail } from '@/lib/styleThumbnails';
import { BLADE_STYLES } from './styleCatalog';

export function BladeStyleColumnA(): JSX.Element {
  const activeStyle = useBladeStore((s) => s.config.style);
  const setStyle = useBladeStore((s) => s.setStyle);

  const [filter, setFilter] = useState('');

  // Lowercase the filter once per change rather than per row.
  const filteredStyles = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return BLADE_STYLES;
    return BLADE_STYLES.filter(
      (s) =>
        s.label.toLowerCase().includes(needle) ||
        s.desc.toLowerCase().includes(needle),
    );
  }, [filter]);

  const handleSelect = (id: string): void => {
    if (id === activeStyle) return; // no-op; avoid stacking SFX on re-clicks
    playUISound('button-click');
    setStyle(id);
    playUISound('success');
  };

  return (
    <div className="flex flex-col h-full" data-testid="blade-style-column-a">
      {/* Filter input — sticky at the top of A */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <label htmlFor="blade-style-filter" className="sr-only">
          Filter blade styles
        </label>
        <input
          id="blade-style-filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${BLADE_STYLES.length} styles…`}
          className="w-full px-2 py-1 text-ui-xs bg-bg-surface border border-border-subtle rounded-chrome text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border"
        />
      </div>

      {/* Scrollable list body */}
      <ul
        role="listbox"
        aria-label="Blade style"
        aria-activedescendant={`blade-style-row-${activeStyle}`}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {filteredStyles.length === 0 && (
          <li className="px-3 py-4 text-ui-xs text-text-muted italic text-center">
            No styles match &ldquo;{filter}&rdquo;
          </li>
        )}
        {filteredStyles.map((style) => {
          const isActive = style.id === activeStyle;
          const entry = getStyleThumbnail(style.id);
          return (
            <li
              key={style.id}
              id={`blade-style-row-${style.id}`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleSelect(style.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(style.id);
                }
              }}
              className={[
                'flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
            >
              {/* 40×40 thumbnail well — gives the SVG a fixed aspect */}
              <div
                className="shrink-0 bg-bg-deep rounded-chrome overflow-hidden border border-border-subtle"
                style={{ width: 40, height: 40 }}
                aria-hidden="true"
              >
                {entry.thumbnail}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={[
                    'text-ui-sm font-medium truncate',
                    isActive ? 'text-accent' : 'text-text-primary',
                  ].join(' ')}
                >
                  {style.label}
                </div>
                <div className="text-ui-xs text-text-muted truncate">
                  {style.desc}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
