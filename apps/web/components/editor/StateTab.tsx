'use client';

// ─── StateTab — W6 (2026-04-22) ─────────────────────────────────────────────
//
// Moved OUT of the Inspector in W6. Now rendered inside the right-rail
// (AnalysisRail side) as the STATE tab alongside the ANALYSIS tab.
// Each row shows a captureStateFrame snapshot for a blade state;
// clicking auditions that state on the live engine:
//
//   - CLASH/BLAST/LOCKUP/DRAG rows loop their effect every 1.2s.
//     Sustained effects (lockup/drag/melt/lightning/force) hold for
//     600ms inside the loop then release.
//   - IGNITING/RETRACTING rows fire the transition once, then auto-
//     clear after the config's ignitionMs / retractionMs duration.
//     An inline 10px ⟳ chip on the right edge toggles a loop mode
//     that re-fires the transition every (duration + 300ms) and
//     keeps state-row-active pulsing through the loop.
//   - OFF / IDLE ON / PREON now forcibly drive the live engine so
//     the user can tune their config against a real frame:
//       OFF  → retracts if on (toggleBlade)
//       ON   → ignites if off (toggleBlade)
//       PREON → engineRef.replayIgnition with a preon-enabled
//               override (preonMs ≈ 400) so the engine authorita-
//               tively sits in PREON for a brief flash before
//               continuing into IGNITING.
//   - Clicking the active row releases/cancels.
//
// Row height is fixed (≤30px) so the 9 rows fit comfortably without
// overflowing the right-rail section-2 height. The loop chip is
// absolutely positioned so it does NOT stretch the row.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { BladeEngine, EffectType } from '@kyberstation/engine';
import { BladeState } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';

interface StateRowDef {
  id: string;
  label: string;
  hint: string;
  state: BladeState;
  effect?: EffectType;
  progress?: number;
}

const STATE_ROWS: readonly StateRowDef[] = [
  { id: 'off',        label: 'OFF',            hint: 'All dark',              state: BladeState.OFF },
  { id: 'preon',      label: 'PREON',          hint: 'Flash tint at 50%',     state: BladeState.PREON,      progress: 0.5 },
  { id: 'igniting',   label: 'IGNITING 50%',   hint: 'Half-extended frame',   state: BladeState.IGNITING,   progress: 0.5 },
  { id: 'on',         label: 'IDLE ON',        hint: 'Steady full blade',     state: BladeState.ON },
  { id: 'clash',      label: 'CLASH',          hint: 'White flash held',      state: BladeState.ON,         effect: 'clash' },
  { id: 'blast',      label: 'BLAST',          hint: 'Blast mark held',       state: BladeState.ON,         effect: 'blast' },
  { id: 'lockup',     label: 'LOCKUP',         hint: 'Flicker bump held',     state: BladeState.ON,         effect: 'lockup' },
  { id: 'drag',       label: 'DRAG',           hint: 'Tip bleed held',        state: BladeState.ON,         effect: 'drag' },
  { id: 'retracting', label: 'RETRACTING 50%', hint: 'Half-retracted frame',  state: BladeState.RETRACTING, progress: 0.5 },
] as const;

/** Auto-cycle interval for sustained state effects. */
const STATE_CYCLE_MS = 1200;
/** Sustained-effect hold duration inside the loop. */
const STATE_SUSTAINED_HOLD_MS = 600;
/** Idle gap between ignition/retraction loop re-fires. */
const TRANSITION_LOOP_GAP_MS = 300;
/** Preon flash duration used by the PREON audition override. */
const PREON_AUDITION_MS = 400;

/** Map key for a transition-loop interval (distinct from the row's activeRow slot). */
const loopKey = (rowId: string) => `${rowId}-loop`;

export interface StateTabProps {
  ledCount: number;
  engineRef?: RefObject<BladeEngine | null>;
  toggleBlade?: () => void;
  triggerEffect?: (type: string) => void;
  releaseEffect?: (type: string) => void;
}

export function StateTab({
  ledCount,
  engineRef,
  toggleBlade,
  triggerEffect: triggerEffectProp,
  releaseEffect: releaseEffectProp,
}: StateTabProps) {
  const config = useBladeStore((s) => s.config);
  const isOn = useBladeStore((s) => s.isOn);
  const toggle = toggleBlade ?? (() => {});
  const triggerEffect = triggerEffectProp ?? (() => {});
  const releaseEffect = releaseEffectProp ?? (() => {});

  const cycleRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  // Per-row loop flag for IGNITING / RETRACTING rows. Independent of
  // activeRowId so the chip can toggle without firing the row click.
  const [loopingRows, setLoopingRows] = useState<Set<string>>(new Set());

  const clearAllCycles = useCallback(() => {
    for (const id of cycleRefs.current.values()) clearInterval(id);
    cycleRefs.current.clear();
  }, []);

  useEffect(() => clearAllCycles, [clearAllCycles]);

  // Fire a single ignition/retraction transition on the live engine.
  const fireTransition = useCallback((rowId: 'igniting' | 'retracting') => {
    if (rowId === 'igniting' && !isOn) toggle();
    else if (rowId === 'retracting' && isOn) toggle();
    // If the state doesn't match (e.g. clicking IGNITING while already
    // on), toggle still does the right thing — retracts then the user
    // can click again. Keeps the semantics simple: one click, one
    // observable transition.
  }, [isOn, toggle]);

  const frames = useMemo(() => {
    const engine = engineRef?.current;
    if (!engine) return null;
    return STATE_ROWS.map((row) => {
      try {
        return engine.captureStateFrame(row.state, config, row.effect, {
          progress: row.progress ?? 1,
        });
      } catch {
        return new Uint8Array(ledCount * 3);
      }
    });
  }, [config, engineRef, ledCount]);

  const onRowClick = useCallback((row: StateRowDef) => {
    if (activeRowId === row.id) {
      const handle = cycleRefs.current.get(row.id);
      if (handle) {
        clearInterval(handle);
        cycleRefs.current.delete(row.id);
      }
      // Also clear any transition-loop interval + loop flag so the
      // row is fully released when clicked while looping.
      const loopHandle = cycleRefs.current.get(loopKey(row.id));
      if (loopHandle) {
        clearInterval(loopHandle);
        cycleRefs.current.delete(loopKey(row.id));
      }
      if (loopingRows.has(row.id)) {
        setLoopingRows((prev) => {
          if (!prev.has(row.id)) return prev;
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
      if (row.effect) releaseEffect(row.effect);
      setActiveRowId(null);
      return;
    }

    if (activeRowId) {
      const prevHandle = cycleRefs.current.get(activeRowId);
      if (prevHandle) {
        clearInterval(prevHandle);
        cycleRefs.current.delete(activeRowId);
      }
      // Also tear down any transition-loop interval tied to the row
      // that was previously active — otherwise a stray loop keeps re-
      // firing ignite/retract in the background.
      const prevLoopHandle = cycleRefs.current.get(loopKey(activeRowId));
      if (prevLoopHandle) {
        clearInterval(prevLoopHandle);
        cycleRefs.current.delete(loopKey(activeRowId));
      }
      if (loopingRows.has(activeRowId)) {
        setLoopingRows((prev) => {
          if (!prev.has(activeRowId)) return prev;
          const next = new Set(prev);
          next.delete(activeRowId);
          return next;
        });
      }
      const prevRow = STATE_ROWS.find((r) => r.id === activeRowId);
      if (prevRow?.effect) releaseEffect(prevRow.effect);
    }

    if (row.id === 'igniting' || row.id === 'retracting') {
      fireTransition(row.id);
      setActiveRowId(row.id);
      // If the row isn't looping, auto-clear the active pulse after the
      // transition settles. If it IS looping, leave activeRowId set —
      // the loop interval keeps the state-row-active class pulsing.
      if (!loopingRows.has(row.id)) {
        const durationMs = row.id === 'igniting'
          ? (config.ignitionMs ?? 300) + 100
          : (config.retractionMs ?? 500) + 100;
        window.setTimeout(() => {
          setActiveRowId((curr) => (curr === row.id ? null : curr));
        }, durationMs);
      }
      return;
    }

    if (row.effect) {
      if (!isOn) toggle();
      const isSustained = row.effect === 'lockup' || row.effect === 'drag'
        || row.effect === 'melt' || row.effect === 'lightning' || row.effect === 'force';
      const fire = () => {
        if (isSustained) {
          triggerEffect(row.effect!);
          window.setTimeout(() => releaseEffect(row.effect!), STATE_SUSTAINED_HOLD_MS);
        } else {
          triggerEffect(row.effect!);
        }
      };
      fire();
      const handle = setInterval(fire, STATE_CYCLE_MS);
      cycleRefs.current.set(row.id, handle);
      setActiveRowId(row.id);
      return;
    }

    // OFF / IDLE ON / PREON — force the live engine into that state
    // so the user can customize config against a real frame. Previously
    // this was a visual-only mark; W7 wires it to engineRef / toggleBlade.
    if (row.id === 'off') {
      if (isOn) toggle();
      setActiveRowId(row.id);
      return;
    }
    if (row.id === 'on') {
      if (!isOn) toggle();
      setActiveRowId(row.id);
      return;
    }
    if (row.id === 'preon') {
      // Use the engine's replayIgnition with a preon-enabled config
      // override so the engine authoritatively sits in PREON for a
      // brief flash. Falls back to setBladeState if engineRef isn't
      // wired (e.g. tests / SSR) — that mutation gets clobbered by
      // the engine-tick loop but the flash is still visible for a
      // frame or two. A setTimeout clears the active pulse.
      const engine = engineRef?.current;
      if (engine) {
        engine.replayIgnition({
          ...config,
          preonEnabled: true,
          preonMs: PREON_AUDITION_MS,
        });
      } else {
        useBladeStore.getState().setBladeState(BladeState.PREON);
      }
      setActiveRowId(row.id);
      window.setTimeout(() => {
        setActiveRowId((curr) => (curr === row.id ? null : curr));
      }, PREON_AUDITION_MS + 100);
      return;
    }

    setActiveRowId(row.id);
  }, [activeRowId, config, engineRef, fireTransition, isOn, loopingRows, releaseEffect, toggle, triggerEffect]);

  // Loop-chip toggle for IGNITING / RETRACTING. Independent of the row
  // click so the user can arm/disarm the loop without re-firing the
  // transition. When enabling, fire one transition immediately and
  // schedule repeats on (durationMs + gap). When disabling, clear the
  // interval and drop the row from the looping set.
  const onLoopToggle = useCallback((rowId: 'igniting' | 'retracting') => {
    const key = loopKey(rowId);
    setLoopingRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
        const handle = cycleRefs.current.get(key);
        if (handle) {
          clearInterval(handle);
          cycleRefs.current.delete(key);
        }
        setActiveRowId((curr) => (curr === rowId ? null : curr));
      } else {
        next.add(rowId);
        // Prime + schedule.
        fireTransition(rowId);
        const durationMs = rowId === 'igniting'
          ? (config.ignitionMs ?? 300)
          : (config.retractionMs ?? 500);
        const handle = setInterval(() => {
          fireTransition(rowId);
        }, durationMs + TRANSITION_LOOP_GAP_MS);
        cycleRefs.current.set(key, handle);
        setActiveRowId(rowId);
      }
      return next;
    });
  }, [config.ignitionMs, config.retractionMs, fireTransition]);

  return (
    <div className="p-2 space-y-1">
      <div
        className="font-mono uppercase text-text-muted px-1"
        style={{ fontSize: 9, letterSpacing: '0.1em', lineHeight: '12px' }}
      >
        Click to audition · effects loop every 1.2s
      </div>
      <div className="space-y-0.5">
        {STATE_ROWS.map((row, i) => {
          const isTransition = row.id === 'igniting' || row.id === 'retracting';
          return (
            <StateRow
              key={row.id}
              row={row}
              frame={frames?.[i] ?? null}
              ledCount={ledCount}
              isActive={activeRowId === row.id}
              onClick={() => onRowClick(row)}
              loopEnabled={isTransition ? loopingRows.has(row.id) : undefined}
              onToggleLoop={isTransition
                ? () => onLoopToggle(row.id as 'igniting' | 'retracting')
                : undefined}
            />
          );
        })}
      </div>
      <p className="text-ui-xs text-text-muted/60 pt-1 px-1">
        {ledCount} LEDs · Click active row to release.
      </p>
    </div>
  );
}

interface StateRowProps {
  row: StateRowDef;
  frame: Uint8Array | null;
  ledCount: number;
  isActive: boolean;
  onClick: () => void;
  /** Defined only for IGNITING / RETRACTING rows — current loop state. */
  loopEnabled?: boolean;
  /** Defined only for IGNITING / RETRACTING rows — toggles loop independent of row click. */
  onToggleLoop?: () => void;
}

function StateRow({
  row,
  frame,
  ledCount,
  isActive,
  onClick,
  loopEnabled,
  onToggleLoop,
}: StateRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, w, h);
    if (!frame || ledCount <= 0) return;
    const leds = Math.min(ledCount, Math.floor(frame.length / 3));
    const cellW = w / leds;
    for (let i = 0; i < leds; i++) {
      const r = frame[i * 3] ?? 0;
      const g = frame[i * 3 + 1] ?? 0;
      const b = frame[i * 3 + 2] ?? 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * cellW, 0, Math.max(cellW + 0.5, 1), h);
    }
  }, [frame, ledCount]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={isActive ? `Release ${row.label}` : row.hint}
      aria-pressed={isActive}
      className={[
        'w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-colors group text-left relative',
        isActive
          ? 'border-accent text-accent bg-accent-dim/25 shadow-[0_0_8px_rgb(var(--accent)/0.35)] state-row-active'
          : 'border-border-subtle bg-bg-deep/40 hover:border-border-light hover:bg-bg-deep',
      ].join(' ')}
    >
      <span
        className={`font-mono uppercase shrink-0 ${
          isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'
        }`}
        style={{ fontSize: 9, letterSpacing: '0.06em', width: 72 }}
      >
        {row.label}
      </span>
      <canvas
        ref={canvasRef}
        width={256}
        height={10}
        className="flex-1 h-2.5 rounded-sm"
        style={{
          imageRendering: 'pixelated',
          minWidth: 0,
          // Leave space for the loop chip on transition rows so it
          // doesn't overlap the waveform. No-op on other rows.
          marginRight: onToggleLoop ? 14 : 0,
        }}
        aria-hidden="true"
      />
      {onToggleLoop && (
        <span
          role="button"
          tabIndex={0}
          aria-label={loopEnabled ? `Disable ${row.label} loop` : `Enable ${row.label} loop`}
          aria-pressed={!!loopEnabled}
          title={loopEnabled ? 'Looping — click to stop' : 'Loop this transition'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLoop();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggleLoop();
            }
          }}
          // Absolutely positioned so the row height (22–26px) is
          // preserved regardless of whether the chip renders.
          className={[
            'absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-sm font-mono cursor-pointer select-none',
            'transition-colors',
            loopEnabled
              ? 'bg-accent/25 text-accent border border-accent'
              : 'bg-bg-deep/60 text-text-muted border border-border-subtle hover:border-accent/60 hover:text-accent/80',
          ].join(' ')}
          style={{
            width: 12,
            height: 12,
            fontSize: 9,
            lineHeight: '10px',
          }}
        >
          {'\u27F3'}
        </span>
      )}
    </button>
  );
}
