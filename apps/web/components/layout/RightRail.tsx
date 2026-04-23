'use client';

// ─── RightRail — W6 (2026-04-22) ───────────────────────────────────────────
//
// Replaces the raw AnalysisRail mount in WorkbenchLayout. Wraps two
// tabs in a thin tab bar:
//
//   STATE    — 9 click-to-audition state rows (StateTab). Moved out
//              of the Inspector in W6 so the blade states live next
//              to the analysis waveforms on the right.
//   ANALYSIS — the existing AnalysisRail (RGB + Luma, Power, Hue, etc.).
//
// Active-tab state is local to this component (no persistence yet).
// Width + resize-handle wiring still live in WorkbenchLayout; this
// component just owns what fills the column.

import { useState, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { AnalysisRail } from './AnalysisRail';
import { StateTab } from '@/components/editor/StateTab';
import type { VisualizationLayerId } from '@/lib/visualizationTypes';

export type RightRailTab = 'state' | 'analysis';

interface RightRailProps {
  pixels: Uint8Array | null;
  pixelCount: number;
  onExpand: (layerId: VisualizationLayerId) => void;
  expandedLayerId?: VisualizationLayerId | null;
  engineRef?: RefObject<BladeEngine | null>;
  toggleBlade?: () => void;
  triggerEffect?: (type: string) => void;
  releaseEffect?: (type: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function RightRail({
  pixels,
  pixelCount,
  onExpand,
  expandedLayerId,
  engineRef,
  toggleBlade,
  triggerEffect,
  releaseEffect,
  className = '',
  style,
}: RightRailProps) {
  const [activeTab, setActiveTab] = useState<RightRailTab>('analysis');

  return (
    <aside
      role="region"
      aria-label="State and analysis"
      className={`shrink-0 flex flex-col bg-bg-secondary/40 overflow-hidden ${className}`}
      style={style}
    >
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-border-subtle bg-bg-deep/40 shrink-0"
        role="tablist"
        aria-label="Right rail tabs"
      >
        {(['state', 'analysis'] as const).map((id) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(id)}
              className={[
                'flex-1 min-w-0 px-2 py-1.5 font-mono uppercase text-ui-xs transition-colors whitespace-nowrap',
                'tracking-[0.1em]',
                active
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent',
              ].join(' ')}
            >
              {id}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'state' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <StateTab
              ledCount={pixelCount}
              engineRef={engineRef}
              toggleBlade={toggleBlade}
              triggerEffect={triggerEffect}
              releaseEffect={releaseEffect}
            />
          </div>
        ) : (
          <AnalysisRail
            pixels={pixels}
            pixelCount={pixelCount}
            onExpand={onExpand}
            expandedLayerId={expandedLayerId}
            className="flex-1 min-h-0"
            // Width comes from the parent; AnalysisRail's own `style.width`
            // default of 200px would fight the wrapper, so force it to
            // fill the column.
            style={{ width: '100%' }}
          />
        )}
      </div>
    </aside>
  );
}
