'use client';

// ─── Inspector / Quick Controls — left-rail overhaul (v0.14.0 PR 3) ─────────
//
// Left-column panel of the desktop editor. Post left-rail overhaul, the
// Inspector exists as a single-surface "Quick Controls" panel — the
// tabbed TUNE / GALLERY framing is retired because the sidebar
// (Sidebar.tsx) absorbed the preset Gallery (routed to /gallery) and
// the sidebar section nav absorbed the deep-tuning surfaces. What
// remains here is the always-visible fast-access set:
//
//   · Surprise Me + Undo        (keeps its Phase 1.5u position)
//   · QuickColorChips           (8 canonical saber colors + Custom)
//   · QuickIgnitionPicker       (compact row with MGP popover)
//   · QuickRetractionPicker     (compact row with MGP popover)
//   · ParameterBank             (7 live-tune sliders — existing)
//
// The deep tuning for each of these lives one sidebar click away
// (APPEARANCE ▸ Color, BEHAVIOR ▸ Ignition & Retraction, etc.) — the
// Quick Controls surface is the 80% path for new / non-power users.

import { useRef } from 'react';
import { ParameterBank } from './ParameterBank';
import { useSurpriseMe } from './Randomizer';
import { QuickColorChips } from './quick/QuickColorChips';
import { QuickIgnitionPicker } from './quick/QuickIgnitionPicker';
import { QuickRetractionPicker } from './quick/QuickRetractionPicker';

interface InspectorProps {
  className?: string;
  /** Inline style overrides. The user-draggable width from
   *  `uiStore.inspectorWidth` is threaded through by WorkbenchLayout. */
  style?: React.CSSProperties;
}

export function Inspector({ className, style }: InspectorProps) {
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
      aria-label="Quick Controls"
      style={style}
    >
      {/* Header strip — reads as a section title + aligns visually with
          the STATE/ANALYSIS tabs on the opposite side of the canvas. */}
      <div className="flex items-center px-3 py-2 border-b border-border-subtle bg-bg-deep/40 shrink-0">
        <h2 className="font-mono uppercase text-ui-xs tracking-[0.12em] text-accent">
          Quick Controls
        </h2>
      </div>

      {/* Body — scrolls independently if content exceeds canvas-row
          height. Sections spaced with `gap-4` to separate the action
          row, color chips, transition pickers, and slider stack. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-4">
        <ActionRow />
        <QuickColorChips />
        <QuickIgnitionPicker />
        <QuickRetractionPicker />
        <ParameterBank />
      </div>
    </aside>
  );
}

// Phase 1.5u (2026-04-24): Surprise Me + Undo sit at the top of the
// Quick Controls surface — the "shake the dice" entry point stays
// immediately reachable regardless of which sidebar section the user
// is drilled into.
function ActionRow() {
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
