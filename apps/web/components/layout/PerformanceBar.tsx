'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import {
  usePerformanceStore,
  scaleMacroValue,
  PAGE_IDS,
  PAGE_LABELS,
  type PageId,
  type ParamBinding,
} from '@/stores/performanceStore';
import { MacroKnob } from '@/components/shared/MacroKnob';
import { useRmsLevel } from '@/hooks/useRmsLevel';
import { playUISound } from '@/lib/uiSounds';

// ─── Pure helpers (exported for tests) ───────────────────────────────────────
//
// W3 (2026-04-22): the shift-light rail moved to `ShiftLightRail.tsx`
// and the RMS compute moved to `useRmsLevel`. Re-exports below keep
// backwards compatibility for existing tests while the helpers live in
// their new home.

export { meanLuminance, smoothRms } from '@/hooks/useRmsLevel';

/**
 * Map a shift-rail LED index ∈ [0, LED_COUNT) to its color bucket given a
 * current RMS ∈ [0, 1].
 *
 *   pos < 0.5  → green  (nominal headroom)
 *   pos < 0.75 → amber  (approaching peak)
 *   pos ≥ 0.75 → red    (peaking / clipping)
 */
export function shiftLedColor(
  index: number,
  ledCount: number,
  rms: number,
): 'off' | 'ok' | 'warn' | 'error' {
  const pos = ledCount <= 1 ? 0 : index / (ledCount - 1);
  const lit = pos < rms;
  if (!lit) return 'off';
  if (pos < 0.5) return 'ok';
  if (pos < 0.75) return 'warn';
  return 'error';
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Width thresholds for the responsive knob label system (W3). Below
 * each threshold, knob labels collapse another step:
 *   - narrow: label → first 4 chars (e.g. "SHIMMER" → "SHIM")
 *   - very narrow: label hidden entirely, knob stands on its color dot
 */
const KNOB_SHORT_LABEL_THRESHOLD = 720;
const KNOB_HIDE_LABEL_THRESHOLD = 480;

/** Accent color per macro page. Pulled from the six-status-color family. */
const PAGE_COLORS: Record<PageId, string> = {
  A: 'rgb(var(--status-warn) / 1)',     // amber — ignition
  B: 'rgb(var(--status-info) / 1)',     // cyan — motion
  C: 'rgb(var(--status-magenta) / 1)',  // magenta — color
  D: 'rgb(var(--accent) / 1)',          // blue — FX
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PerformanceBarProps {
  /** Engine ref from useBladeEngine. Used to read the live pixel buffer for RMS. */
  engineRef: RefObject<BladeEngine | null>;
  /**
   * Total height of the bar in CSS pixels. OV11 threads this from
   * uiStore.performanceBarHeight so the user-draggable handle above
   * the bar can grow / shrink it within REGION_LIMITS. The 10px
   * shift-light rail stays fixed; the remainder goes to the perf
   * body. When omitted, defaults to 158 (the shipped W5 value).
   */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * BladeDynamicsBar (filename: PerformanceBar.tsx for history) — W3
 * reworked (2026-04-22):
 *
 *   - The 10px shift-light rail was moved out to `ShiftLightRail.tsx`
 *     and relocated below the DeliveryRail at half height (5px).
 *   - The 2×4 macro knob grid became 1×8 single-row. Knob labels are
 *     responsive (descriptive → abbreviated → dot-only) based on the
 *     macro area's measured width.
 *   - Section eyebrow renamed "Performance Bar" → "Blade Dynamics" to
 *     disambiguate from the new app-perf strip.
 */
export function PerformanceBar({ engineRef, height }: PerformanceBarProps) {
  const visible = usePerformanceStore((s) => s.visible);
  const currentPage = usePerformanceStore((s) => s.currentPage);
  const macroValues = usePerformanceStore((s) => s.macroValues);
  const macroAssignments = usePerformanceStore((s) => s.macroAssignments);
  const setPage = usePerformanceStore((s) => s.setPage);
  const setMacroValue = usePerformanceStore((s) => s.setMacroValue);
  // OV5 (2026-04-21): gate the bar to the Design tab only. The macro
  // strip is a tweaking surface for live design work — on Gallery /
  // Audio / Output the 148px it occupies is better spent on the tab's
  // own content. Proposal §13 (OV5 row): "PerformanceBar visibility:
  // currently always-on across all tabs. Gate it to DESIGN tab only."
  // The visible-toggle in Settings still wins — users who have turned
  // the bar off globally will not see it on Design either.
  const activeTab = useUIStore((s) => s.activeTab);

  const updateConfig = useBladeStore((s) => s.updateConfig);
  // W11: preset / LEDs / profile / state / RMS readouts moved to the
  // bottom AppPerfStrip. Keeping the `useRmsLevel` call so the engine
  // tick loop is still driven from one place (the hook is idempotent
  // across multiple consumers).
  useRmsLevel(engineRef, visible);

  // ── Macro commit path ──
  // Store update + bladeConfig write share this helper so the keyboard
  // path, pointer drag, and double-click-reset all dispatch identically.
  const commitMacro = useCallback(
    (slot: number, next: number) => {
      setMacroValue(currentPage, slot, next);
      const binding = macroAssignments[currentPage][slot];
      if (!binding || binding.unwired) return;
      const scaled = scaleMacroValue(binding, next);
      updateConfig({ [binding.target]: scaled });
    },
    [currentPage, macroAssignments, setMacroValue, updateConfig],
  );

  const handlePageClick = useCallback(
    (page: PageId) => {
      if (page === currentPage) return;
      playUISound('tab-switch');
      setPage(page);
    },
    [currentPage, setPage],
  );

  // Two independent gates — either hides the bar. The `visible` toggle
  // is global (Settings), `activeTab` is contextual (OV5).
  if (!visible || activeTab !== 'design') return null;

  const pageColor = PAGE_COLORS[currentPage];
  const currentValues = macroValues[currentPage];
  const currentBindings = macroAssignments[currentPage];

  // W3: with the shift-light rail moved out, the entire height is now
  // the perf body. W5e + W8b compaction chain: default 148 → 80 → 64.
  // Minimum 48px so the knobs never compress below legibility.
  const totalHeight = Math.max(48, height ?? 64);

  return (
    <div
      className="shrink-0 bg-bg-secondary/60"
      role="region"
      aria-label="Blade dynamics macro bar"
      style={{ height: totalHeight }}
    >
      {/* Perf body — left pills / center macros / right readouts */}
      <div
        className="grid items-stretch h-full"
        style={{
          // W11: right readout column dropped — macros now fill the
          // remaining space. Old template was '180px 1fr 200px'.
          gridTemplateColumns: '180px 1fr',
        }}
      >
        {/* LEFT — vertical page title list. W8b (2026-04-22): the
            "Blade Dynamics" eyebrow was dropped to fit the 64px row
            height — the page labels (A · IGNITION, etc.) are self-
            descriptive on their own. Line-height tightened from 16 →
            13 so 4 rows fit in ~52px with padding. Active title in
            its page color; others muted. */}
        <div className="flex flex-col justify-center px-3 py-1 border-r border-border-subtle">
          <div role="tablist" aria-label="Macro page" className="flex flex-col">
            {PAGE_IDS.map((page) => {
              const active = page === currentPage;
              return (
                <button
                  key={page}
                  role="tab"
                  aria-selected={active}
                  onClick={() => handlePageClick(page)}
                  className="text-left font-cinematic uppercase transition-colors"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    lineHeight: '13px',
                    color: active
                      ? PAGE_COLORS[page]
                      : 'rgb(var(--text-muted))',
                    cursor: 'pointer',
                  }}
                  title={PAGE_LABELS[page]}
                >
                  {PAGE_LABELS[page]}
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER — single-row 8-macro grid (W3 2026-04-22: 2×4 → 1×8).
            Labels collapse responsively: 4-char abbreviation below
            KNOB_SHORT_LABEL_THRESHOLD, hidden entirely below
            KNOB_HIDE_LABEL_THRESHOLD so the knobs stay legible at narrow
            desktop widths. */}
        <MacroKnobRow
          bindings={currentBindings}
          values={currentValues}
          color={pageColor}
          pageId={currentPage}
          onChange={commitMacro}
        />

        {/* W11 (2026-04-22): right-column readouts (PRESET / STATE /
            PROFILE / LEDS / RMS) migrated to the consolidated
            AppPerfStrip at the bottom of the app. The 200px column
            they occupied is reclaimed for extra knob breathing room. */}
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

/**
 * Compute a short-form label from a descriptive one. "SHIMMER" → "SHIM".
 * Exported so co-located tests can pin the rule.
 */
export function shortenKnobLabel(label: string): string {
  return label.slice(0, 4);
}

interface MacroKnobRowProps {
  bindings: readonly ParamBinding[];
  values: readonly number[];
  color: string;
  pageId: PageId;
  onChange: (slot: number, next: number) => void;
}

function MacroKnobRow({ bindings, values, color, pageId, onChange }: MacroKnobRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mode: 'full' | 'short' | 'hidden' =
    width === 0
      ? 'full'
      : width < KNOB_HIDE_LABEL_THRESHOLD
        ? 'hidden'
        : width < KNOB_SHORT_LABEL_THRESHOLD
          ? 'short'
          : 'full';

  return (
    <div
      ref={rowRef}
      // W10e (2026-04-22): py-1 → py-0 so the 8 knobs sit at their
      // natural row height with zero extra vertical slack. Combined
      // with MacroKnob's margin tightening, the whole strip is now
      // flush top/bottom against the row seams.
      className="grid grid-cols-8 gap-x-1 items-center justify-items-center px-3 py-0"
      role="group"
      aria-label="Macro knobs"
    >
      {bindings.map((binding, slot) => (
        <MacroCell
          key={`${pageId}-${slot}`}
          slot={slot}
          binding={binding}
          value={values[slot] ?? 0.5}
          color={color}
          labelMode={mode}
          onChange={(next) => onChange(slot, next)}
        />
      ))}
    </div>
  );
}

interface MacroCellProps {
  slot: number;
  binding: ParamBinding;
  value: number;
  color: string;
  labelMode: 'full' | 'short' | 'hidden';
  onChange: (next: number) => void;
}

function MacroCell({ binding, value, color, labelMode, onChange }: MacroCellProps) {
  const scaledValue = scaleMacroValue(binding, value);
  const readout = binding.unwired
    ? '—'
    : binding.integer
      ? String(Math.round(scaledValue))
      : binding.max <= 1
        ? scaledValue.toFixed(2)
        : Math.round(scaledValue).toString();

  const title = binding.unwired
    ? `${binding.label} — not yet wired (v1.1 modulation-routing work)`
    : `${binding.label} → ${binding.target} · range ${binding.min}–${binding.max} · drag up / down · double-click to center`;

  const resolvedLabel =
    labelMode === 'hidden'
      ? ''
      : labelMode === 'short'
        ? shortenKnobLabel(binding.label)
        : binding.label;

  return (
    <MacroKnob
      label={resolvedLabel}
      value={value}
      color={binding.unwired ? 'rgb(var(--border-subtle) / 1)' : color}
      readout={readout}
      onChange={onChange}
      disabled={binding.unwired}
      title={title}
      // W5e → W8b: 54 → 38 → 30. At 64px total row height, a 30px
      // knob + 10px label + 10px readout + ~4px padding fits cleanly
      // without crowding. Any smaller and the drag target gets too
      // tight to hit comfortably.
      size={30}
    />
  );
}

// W11: ReadoutRow removed. Readouts now live in AppPerfStrip.
