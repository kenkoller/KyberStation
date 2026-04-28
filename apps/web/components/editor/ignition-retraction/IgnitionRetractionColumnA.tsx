'use client';

// ─── IgnitionRetractionColumnA — Sidebar A/B v2 Phase 3 ───────────────
//
// Two-tab toggle (Ignition / Retraction) at the top, then a filtered
// 19-ignition or 13-retraction list with thumbnails. Replaces the
// MiniGalleryPicker grids in legacy `IgnitionRetractionPanel.tsx` (the
// off-flag fallback) with a focused list-of-styles surface.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.3:
//   - Top: tab pair toggling A's contents
//   - Each row: 40×40 thumbnail · label · 1-line description
//   - Active row: matches `config.ignition` (when on Ignition tab) OR
//     `config.retraction` (when on Retraction tab)
//
// Tab state is owned by the parent wrapper (`IgnitionRetractionAB`)
// and threaded in as props — that way Column B can read the same
// state without reaching for uiStore. Tab state is intentionally not
// persisted: it's a transient view filter, not a selection that
// survives reload.

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { playUISound } from '@/lib/uiSounds';
import { getIgnitionThumbnail } from '@/lib/ignitionThumbnails';
import { getRetractionThumbnail } from '@/lib/retractionThumbnails';
import {
  IGNITION_STYLES,
  RETRACTION_STYLES,
  type TransitionStyle,
} from '@/lib/transitionCatalogs';
import type { IgnitionRetractionTab } from './tabState';

interface ListEntry {
  style: TransitionStyle;
  thumbnail: React.ReactNode;
}

export interface IgnitionRetractionColumnAProps {
  activeTab: IgnitionRetractionTab;
  onTabChange: (tab: IgnitionRetractionTab) => void;
}

export function IgnitionRetractionColumnA({
  activeTab,
  onTabChange,
}: IgnitionRetractionColumnAProps): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const setRetraction = useBladeStore((s) => s.setRetraction);

  // Build the list entries lazily — thumbnails are tiny SVGs, but
  // there's no need to recompute on every render.
  const ignitionEntries: ListEntry[] = useMemo(
    () =>
      IGNITION_STYLES.map((style) => ({
        style,
        thumbnail: getIgnitionThumbnail(style.id).thumbnail,
      })),
    [],
  );

  const retractionEntries: ListEntry[] = useMemo(
    () =>
      RETRACTION_STYLES.map((style) => ({
        style,
        thumbnail: getRetractionThumbnail(style.id).thumbnail,
      })),
    [],
  );

  const entries = activeTab === 'ignition' ? ignitionEntries : retractionEntries;
  const activeStyleId = activeTab === 'ignition' ? config.ignition : config.retraction;
  const setStyle = activeTab === 'ignition' ? setIgnition : setRetraction;

  const handleSelect = (id: string): void => {
    if (id === activeStyleId) return;
    playUISound('button-click');
    setStyle(id);
    playUISound('success');
  };

  const handleTabChange = (tab: IgnitionRetractionTab): void => {
    if (tab === activeTab) return;
    onTabChange(tab);
  };

  return (
    <div className="flex flex-col h-full" data-testid="ignition-retraction-column-a">
      {/* Sticky tab pair — Ignition / Retraction. */}
      <div
        className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0 sticky top-0 z-10"
        role="tablist"
        aria-label="Ignition vs Retraction"
      >
        <div className="flex gap-1.5">
          {(
            [
              { id: 'ignition' as const, label: 'Ignition', count: IGNITION_STYLES.length },
              { id: 'retraction' as const, label: 'Retraction', count: RETRACTION_STYLES.length },
            ] satisfies ReadonlyArray<{
              id: IgnitionRetractionTab;
              label: string;
              count: number;
            }>
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={[
                  'flex-1 px-2 py-1.5 rounded text-ui-sm border transition-colors',
                  isActive
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light',
                ].join(' ')}
              >
                {tab.label}
                <span className="ml-1 text-ui-xs text-text-muted font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style list — scrolls below the sticky tabs. */}
      <ul
        role="listbox"
        aria-label={`${activeTab === 'ignition' ? 'Ignition' : 'Retraction'} styles`}
        aria-activedescendant={`ir-row-${activeTab}-${activeStyleId}`}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {entries.map(({ style, thumbnail }) => {
          const isActive = style.id === activeStyleId;
          return (
            <li
              key={style.id}
              id={`ir-row-${activeTab}-${style.id}`}
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
              {/* 40×40 thumbnail well. */}
              <div
                className="shrink-0 bg-bg-deep rounded-chrome overflow-hidden border border-border-subtle"
                style={{ width: 40, height: 40 }}
                aria-hidden="true"
              >
                {thumbnail}
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
