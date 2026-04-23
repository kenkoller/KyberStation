'use client';

// ─── QuickMacroPreview — W8b (2026-04-22) ───────────────────────────────────
//
// Opt-in preview of the 8 Blade Dynamics macro knobs, shown in the
// Inspector's QUICK tab below the existing ParameterBank. Lets Ken
// evaluate whether having the macros thumb-reachable from the
// Inspector feels good without committing to a full layout change —
// the macros still live in the bottom Blade Dynamics strip either way.
//
// Collapsible so it doesn't compete with the main ParameterBank
// content when the user isn't using it. Collapsed-by-default.

import { useCallback, useState } from 'react';
import {
  usePerformanceStore,
  scaleMacroValue,
  PAGE_IDS,
  PAGE_LABELS,
  type PageId,
} from '@/stores/performanceStore';
import { useBladeStore } from '@/stores/bladeStore';
import { MacroKnob } from '@/components/shared/MacroKnob';

const PAGE_COLORS: Record<PageId, string> = {
  A: 'rgb(var(--status-warn) / 1)',
  B: 'rgb(var(--status-info) / 1)',
  C: 'rgb(var(--status-magenta) / 1)',
  D: 'rgb(var(--accent) / 1)',
};

export function QuickMacroPreview() {
  const [open, setOpen] = useState(false);
  const currentPage = usePerformanceStore((s) => s.currentPage);
  const setPage = usePerformanceStore((s) => s.setPage);
  const macroValues = usePerformanceStore((s) => s.macroValues);
  const macroAssignments = usePerformanceStore((s) => s.macroAssignments);
  const setMacroValue = usePerformanceStore((s) => s.setMacroValue);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const commit = useCallback(
    (slot: number, next: number) => {
      setMacroValue(currentPage, slot, next);
      const binding = macroAssignments[currentPage][slot];
      if (!binding || binding.unwired) return;
      const scaled = scaleMacroValue(binding, next);
      updateConfig({ [binding.target]: scaled });
    },
    [currentPage, macroAssignments, setMacroValue, updateConfig],
  );

  const currentValues = macroValues[currentPage];
  const currentBindings = macroAssignments[currentPage];
  const pageColor = PAGE_COLORS[currentPage];

  return (
    <section className="border border-border-subtle rounded bg-bg-deep/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-surface/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-text-muted text-ui-xs font-mono"
          >
            {open ? '▾' : '▸'}
          </span>
          <span className="font-mono uppercase text-ui-xs tracking-[0.1em] text-text-secondary">
            Macros
          </span>
          <span
            className="font-cinematic uppercase text-ui-xs tracking-[0.1em]"
            style={{ color: pageColor }}
          >
            {PAGE_LABELS[currentPage]}
          </span>
        </div>
        <span className="text-ui-xs font-mono text-text-muted/70">
          {open ? 'Hide' : 'Preview'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* Page selector — mirrors Blade Dynamics vertical title list
              but as a 4-way horizontal pill row so it fits the narrower
              Inspector column. */}
          <div
            role="tablist"
            aria-label="Macro page"
            className="grid grid-cols-4 gap-1"
          >
            {PAGE_IDS.map((page) => {
              const active = page === currentPage;
              return (
                <button
                  key={page}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPage(page)}
                  className="py-1 font-mono uppercase text-ui-xs tracking-[0.08em] rounded border transition-colors"
                  style={{
                    borderColor: active
                      ? PAGE_COLORS[page]
                      : 'rgb(var(--border-subtle))',
                    color: active
                      ? PAGE_COLORS[page]
                      : 'rgb(var(--text-muted))',
                    background: active ? 'rgb(var(--bg-deep) / 0.6)' : 'transparent',
                  }}
                  title={PAGE_LABELS[page]}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* 8 macros in a 4×2 grid — the Inspector is too narrow for a
              single row of 8 without shrinking the knobs past legibility. */}
          <div className="grid grid-cols-4 gap-x-1 gap-y-2 justify-items-center pt-1">
            {currentBindings.map((binding, slot) => {
              const scaled = scaleMacroValue(binding, currentValues[slot] ?? 0.5);
              const readout = binding.unwired
                ? '—'
                : binding.integer
                  ? String(Math.round(scaled))
                  : binding.max <= 1
                    ? scaled.toFixed(2)
                    : Math.round(scaled).toString();
              return (
                <MacroKnob
                  key={`${currentPage}-${slot}`}
                  label={binding.label}
                  value={currentValues[slot] ?? 0.5}
                  color={binding.unwired ? 'rgb(var(--border-subtle) / 1)' : pageColor}
                  readout={readout}
                  onChange={(next) => commit(slot, next)}
                  disabled={binding.unwired}
                  title={binding.unwired
                    ? `${binding.label} — not yet wired (v1.1)`
                    : `${binding.label} → ${binding.target}`}
                  size={34}
                />
              );
            })}
          </div>
          <p className="text-ui-xs text-text-muted/60 font-mono pt-1">
            Shares state with the Blade Dynamics bar.
          </p>
        </div>
      )}
    </section>
  );
}
