'use client';

// ─── ShiftLightRail — thin blade-RMS visualiser ──────────────────────────────
//
// W3 (2026-04-22): the 10px green-segmented bar that formerly lived at
// the top of the PerformanceBar was relocated here — below the Delivery
// Rail, above the DataTicker — and halved in height (10px → 5px). The
// underlying signal is the live blade output RMS (mean luminance,
// smoothed), NOT an app-performance indicator. App FPS / GFX toggle
// live in the sibling AppPerfStrip.
//
// Sharing: reads `useRmsLevel` which runs one RAF. PerformanceBar's
// right-column readout reads the same hook so the two surfaces never
// drift and we don't pay for two RAF loops.

import { type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useRmsLevel } from '@/hooks/useRmsLevel';
import { shiftLedColor } from '@/lib/shiftLight';
import { usePerformanceStore } from '@/stores/performanceStore';

const SHIFT_LED_COUNT = 32;

export function ShiftLightRail({
  engineRef,
}: {
  engineRef: RefObject<BladeEngine | null>;
}) {
  // Keep visibility gated by the same `performanceStore.visible` toggle
  // as the macro bar — a user who turned the perf chrome off shouldn't
  // get the rail sneaking back in.
  const visible = usePerformanceStore((s) => s.visible);
  const rms = useRmsLevel(engineRef, visible);

  if (!visible) return null;

  return (
    <div
      className="shrink-0 flex items-stretch gap-[2px] px-3 bg-bg-deep/60 border-t border-b border-border-subtle"
      style={{ height: 5 }}
      aria-hidden="true"
      title={`Shift-light · blade RMS ${(rms * 100).toFixed(0)}%`}
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
              boxShadow: lit ? `0 0 4px rgb(${bgVar} / 0.6)` : 'none',
              borderRadius: 'var(--r-chrome, 2px)',
            }}
          />
        );
      })}
    </div>
  );
}
