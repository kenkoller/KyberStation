'use client';

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
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
import { playUISound } from '@/lib/uiSounds';

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/**
 * Compute the mean normalized luminance across a packed RGB pixel buffer.
 *
 * BladeEngine.getPixels() returns a Uint8Array of R/G/B triplets (no alpha),
 * exactly `ledCount * 3` bytes. Mean luminance = Σ((R+G+B) / 765) / ledCount,
 * i.e. the average of each LED's mean-channel brightness, normalized to
 * [0, 1]. Good-enough proxy for the shift-light: when the blade is ignited
 * most LEDs are near-max, clashes spike toward 1.0, and retractions fade
 * toward 0.
 */
export function meanLuminance(
  buffer: Uint8Array | null,
  ledCount: number,
): number {
  if (!buffer || ledCount <= 0) return 0;
  const sampleCount = Math.min(ledCount, Math.floor(buffer.length / 3));
  if (sampleCount <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < sampleCount; i++) {
    const base = i * 3;
    sum += buffer[base] + buffer[base + 1] + buffer[base + 2];
  }
  return sum / (sampleCount * 765); // 255 * 3 = 765
}

/**
 * Exponential-moving-average smoothing for the RMS signal. The shift-light
 * should pulse with the blade but not strobe at 60fps — a short EMA (τ ≈
 * 80ms) keeps clashes visible while smoothing the per-frame noise. Alpha
 * is the new-sample weight; `rms_next = prev*(1-α) + current*α`.
 */
export function smoothRms(prev: number, current: number, alpha: number): number {
  const a = Math.max(0, Math.min(1, alpha));
  return prev * (1 - a) + current * a;
}

/**
 * Map a shift-rail LED index ∈ [0, LED_COUNT) to its color bucket given a
 * current RMS ∈ [0, 1]. Returns one of 'ok' (green), 'warn' (amber), or
 * 'error' (red) when the LED is lit, or 'off' otherwise.
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

const SHIFT_LED_COUNT = 32;
const SHIFT_RMS_ALPHA = 0.25; // ≈ 80ms τ at 60fps

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
 * Wave 5 — PerformanceBar. Persistent chrome strip between the main panel
 * area and the bottom DataTicker. Three rows:
 *
 *   1. Shift-light rail (10px) — 32 LEDs pulsing with live blade RMS.
 *   2. Perf body (148px default; user-resizable via OV11) — page pills
 *      (left) + 8-macro grid (center) + preset / LED / RMS readouts (right).
 *
 * Gated by performanceStore.visible — Settings exposes a toggle. Mounted
 * once at WorkbenchLayout level; never teardown / remount across tab
 * switches so the RAF loop can maintain a stable EMA.
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
  const bladeName = useBladeStore((s) => s.config.name);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const isOn = useBladeStore((s) => s.isOn);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileName = useMemo(
    () => profiles.find((p) => p.id === activeProfileId)?.name ?? null,
    [profiles, activeProfileId],
  );

  // ── Shift-light RMS loop ──
  // Computed per-frame with an EMA so clashes read as a flash without
  // strobing the eye. useState so React re-renders the LED row; the
  // write-back goes through a ref + rAF callback, not inside render.
  const [rms, setRms] = useState(0);
  const rmsRef = useRef(0);

  useAnimationFrame(() => {
    if (!visible) return;
    const engine = engineRef.current;
    const buffer = engine?.getPixels() ?? null;
    const raw = meanLuminance(buffer, ledCount);
    const next = smoothRms(rmsRef.current, raw, SHIFT_RMS_ALPHA);
    rmsRef.current = next;
    setRms(next);
  });

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

  // OV11: 10px shift-light rail stays fixed; the perf body absorbs
  // any extra room from the user-draggable height. Minimum perf-body
  // height is 50 so the knobs never compress below legibility.
  const totalHeight = height ?? 158;
  const bodyHeight = Math.max(50, totalHeight - 10);

  return (
    <div
      // OV11: border-t removed — the ResizeHandle above the bar carries
      // the seam now.
      className="shrink-0 bg-bg-secondary/60"
      role="region"
      aria-label="Performance macro bar"
      style={{ height: totalHeight }}
    >
      {/* ── Row 1: Shift-light rail (10px) ── */}
      <div
        className="flex items-stretch gap-[2px] px-3 bg-bg-deep/60 border-b border-border-subtle"
        style={{ height: 10 }}
        aria-hidden="true"
        title={`Shift-light rail · RMS ${(rms * 100).toFixed(0)}%`}
      >
        {Array.from({ length: SHIFT_LED_COUNT }, (_, i) => {
          const bucket = shiftLedColor(i, SHIFT_LED_COUNT, rms);
          const lit = bucket !== 'off';
          const bgVar = lit
            ? bucket === 'ok'
              ? 'var(--status-ok)'
              : bucket === 'warn'
                ? 'var(--status-warn)'
                : 'var(--status-error)'
            : 'var(--border-subtle)';
          return (
            <div
              key={i}
              className="flex-1 min-w-0"
              style={{
                background: `rgb(${bgVar} / ${lit ? 1 : 0.5})`,
                boxShadow: lit
                  ? `0 0 4px rgb(${bgVar} / 0.6)`
                  : 'none',
                borderRadius: 'var(--r-chrome, 2px)',
              }}
            />
          );
        })}
      </div>

      {/* ── Row 2: Perf body — left pills / center macros / right readouts ── */}
      <div
        className="grid items-stretch"
        style={{
          height: bodyHeight,
          gridTemplateColumns: '180px 1fr 200px',
        }}
      >
        {/* LEFT — Page pills + eyebrow */}
        <div className="flex flex-col justify-between px-3 py-2 border-r border-border-subtle">
          <div>
            <div
              className="font-mono uppercase text-text-muted"
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                lineHeight: '12px',
              }}
            >
              Performance Bar
            </div>
            <div
              className="font-cinematic uppercase text-text-primary"
              style={{
                fontSize: 14,
                letterSpacing: '0.1em',
                lineHeight: '18px',
                marginTop: 2,
                color: pageColor,
              }}
            >
              {PAGE_LABELS[currentPage]}
            </div>
          </div>

          {/* 4 page pills */}
          <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Macro page">
            {PAGE_IDS.map((page) => {
              const active = page === currentPage;
              return (
                <button
                  key={page}
                  role="tab"
                  aria-selected={active}
                  onClick={() => handlePageClick(page)}
                  className="font-mono uppercase transition-colors"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    padding: '4px 0',
                    border: `1px solid ${active ? PAGE_COLORS[page] : 'rgb(var(--border-subtle) / 1)'}`,
                    background: active
                      ? `rgb(var(--bg-deep) / 0.6)`
                      : 'transparent',
                    color: active
                      ? PAGE_COLORS[page]
                      : 'rgb(var(--text-muted) / 1)',
                    borderRadius: 'var(--r-chrome, 2px)',
                    cursor: 'pointer',
                  }}
                  title={PAGE_LABELS[page]}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER — 8-macro grid (2 rows × 4 cols by default). OV10
            (2026-04-21): at narrower desktop widths the 4-column layout
            can get cramped; fall back to a horizontally-scrollable
            single-row layout at tablet breakpoints so knob centers stay
            at their natural 54px size and labels remain legible. */}
        <div
          className="grid grid-rows-2 grid-cols-4 gap-x-2 gap-y-1 items-center justify-items-center px-3 py-2 overflow-x-auto"
          role="group"
          aria-label="Macro knobs"
        >
          {currentBindings.map((binding, slot) => (
            <MacroCell
              key={`${currentPage}-${slot}`}
              slot={slot}
              binding={binding}
              value={currentValues[slot] ?? 0.5}
              color={pageColor}
              onChange={(next) => commitMacro(slot, next)}
            />
          ))}
        </div>

        {/* RIGHT — readouts */}
        <div className="flex flex-col justify-center gap-1.5 px-3 py-2 border-l border-border-subtle">
          <ReadoutRow
            label="Preset"
            value={bladeName ?? 'Untitled'}
          />
          <ReadoutRow
            label="Profile"
            value={activeProfileName ?? '—'}
          />
          <ReadoutRow
            label="LEDs"
            value={String(ledCount)}
            mono
          />
          <ReadoutRow
            label="RMS"
            value={`${(rms * 100).toFixed(0)}%`}
            mono
            accent={rms > 0.75 ? 'rgb(var(--status-error) / 1)' : rms > 0.5 ? 'rgb(var(--status-warn) / 1)' : 'rgb(var(--status-ok) / 1)'}
          />
          <ReadoutRow
            label="State"
            value={isOn ? 'LIVE' : 'IDLE'}
            mono
            accent={isOn ? 'rgb(var(--status-ok) / 1)' : 'rgb(var(--text-muted) / 1)'}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface MacroCellProps {
  slot: number;
  binding: ParamBinding;
  value: number;
  color: string;
  onChange: (next: number) => void;
}

function MacroCell({ binding, value, color, onChange }: MacroCellProps) {
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

  return (
    <MacroKnob
      label={binding.label}
      value={value}
      color={binding.unwired ? 'rgb(var(--border-subtle) / 1)' : color}
      readout={readout}
      onChange={onChange}
      disabled={binding.unwired}
      title={title}
    />
  );
}

interface ReadoutRowProps {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}

function ReadoutRow({ label, value, mono, accent }: ReadoutRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 whitespace-nowrap">
      <span
        className="font-mono uppercase text-text-muted"
        style={{
          fontSize: 9,
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </span>
      <span
        className={mono ? 'font-mono tabular-nums' : ''}
        style={{
          fontSize: 11,
          color: accent ?? 'rgb(var(--text-secondary) / 1)',
          maxWidth: 140,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: mono ? '0.04em' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
