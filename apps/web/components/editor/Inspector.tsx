'use client';

// ─── Inspector — W10 slim + W13 rename (2026-04-22) ────────────────────────
//
// Left-column panel on the Design tab. Two tabs, in order:
//
//   TUNE    — ParameterBank. Renamed from "Quick" → "Tune" per W13;
//             "Quick" implied a Quick-vs-Advanced split that no
//             longer exists. This is where all the live-tuning
//             sliders live (shimmer, noise, swing FX, etc).
//   GALLERY — compact preset picker (thin blade-shaped rows with in-
//             place hover animation). Clicking a row loads the preset
//             into the engine without navigating away from Design.
//
// Everything that used to live in STYLE / COLOR / FX now lives in the
// consolidated DesignPanel. STATE continues to live in the right-side
// RightRail.

import { useRef, useState } from 'react';
import { ParameterBank } from './ParameterBank';
import { useSurpriseMe } from './Randomizer';
import { InspectorGalleryTab } from './InspectorGalleryTab';

export type InspectorTab = 'tune' | 'gallery';

interface TabDef {
  id: InspectorTab;
  label: string;
}

// W13 (2026-04-22): TUNE first (primary editing surface), GALLERY
// second (preset swap). "Quick" renamed to "Tune".
const TABS: TabDef[] = [
  { id: 'tune',    label: 'TUNE' },
  { id: 'gallery', label: 'GALLERY' },
];

interface InspectorProps {
  className?: string;
  /** Inline style overrides. OV11 uses this to thread the user-
   *  draggable width from uiStore.inspectorWidth. */
  style?: React.CSSProperties;
}

export function Inspector({ className, style }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('tune');
  const rootRef = useRef<HTMLElement | null>(null);

  return (
    <aside
      ref={rootRef}
      className={[
        'flex flex-col bg-bg-secondary/60 shrink-0',
        style?.width ? '' : 'w-[320px] xl:w-[400px]',
        className ?? '',
      ].join(' ')}
      role="region"
      aria-label="Inspector"
      style={style}
    >
      {/* Tab bar — two tabs after W10 slim, so labels always fit. */}
      <div
        className="flex items-center border-b border-border-subtle bg-bg-deep/40 shrink-0"
        role="tablist"
        aria-label="Inspector tabs"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={[
                'flex-1 min-w-0 px-2 pt-[9px] pb-2 font-mono uppercase text-ui-xs transition-colors whitespace-nowrap',
                'tracking-[0.1em]',
                active
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'tune' && (
          <div className="p-3 flex flex-col gap-3">
            <TuneTabActionRow />
            <ParameterBank />
          </div>
        )}
        {activeTab === 'gallery' && <InspectorGalleryTab />}
      </div>
    </aside>
  );
}

// InspectorGalleryTab lives in its own file so Inspector.tsx stays
// a lean router-of-tabs shell. STATE tab continues to live in
// RightRail (components/layout/RightRail.tsx + components/editor/StateTab.tsx).
// The ROUTING placeholder was dropped in W10; v1.1 modulation-routing
// work will surface in the LayerStack section inside DesignPanel
// instead (see docs/MODULATION_ROUTING_V1.1.md).

// Phase 1.5u (2026-04-24): Surprise Me + Undo were lifted out of
// DesignPanel's top bar into the TUNE tab top, where they sit
// directly above ParameterBank as the primary "shake the dice"
// entry point for the live-tune surface.
function TuneTabActionRow() {
  const { surprise, undo, canUndo } = useSurpriseMe();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={surprise}
        className="relative flex-1 px-4 py-2 rounded-lg text-ui-sm font-semibold transition-all border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent active:scale-[0.97] font-cinematic overflow-hidden group"
      >
        <span className="absolute inset-0 rounded-lg bg-accent/5 animate-pulse pointer-events-none" />
        <span className="relative z-10">Surprise Me</span>
      </button>
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`px-3 py-2 rounded-lg text-ui-xs font-medium transition-colors border ${
          canUndo
            ? 'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            : 'border-border-subtle/50 text-text-muted/50 cursor-not-allowed'
        }`}
        title={canUndo ? 'Undo last Surprise Me' : 'No history'}
      >
        Undo
      </button>
    </div>
  );
}
