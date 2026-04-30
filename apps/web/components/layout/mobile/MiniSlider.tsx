'use client';

// ─── MiniSlider — Phase 4.3 (2026-04-30) ────────────────────────────────────
//
// Mobile-shaped two-line slider used inside the QuickControls 2-col grid
// on Color / Style / Motion / FX tabs.
//
// Per "Claude Design Mobile handoff/HANDOFF.md" §"Quick controls":
//   - Each MiniSlider is `flex: 1` so the 2-col grid auto-distributes
//     them.
//   - Top line: small-caps label + tabular-nums value (with optional
//     unit suffix).
//   - Bottom line: track + fill + thumb. Drag-along-track sets the
//     value via a transparent `<input type="range">` overlay so iOS /
//     Android touch handling stays native.
//   - Color category drives the fill color: accent (chromatic), warm
//     (power), info (motion), ok (FX), muted (placeholder/disabled).
//
// Long-press → opens the full Sheet for that parameter (Phase 4.4 — the
// callback prop is wired here so 4.4 can hook the sheet without
// touching the primitive).

import { useEffect, useRef } from 'react';

export type MiniSliderColor = 'accent' | 'warm' | 'info' | 'ok' | 'muted';

const COLOR_CSS: Record<MiniSliderColor, string> = {
  accent: 'rgb(var(--accent))',
  warm: 'rgb(var(--accent-warm))',
  info: 'rgb(var(--status-info))',
  ok: 'rgb(var(--status-ok))',
  muted: 'rgb(var(--text-muted))',
};

export interface MiniSliderProps {
  label: string;
  /** Display value — formatted as the host wants. */
  displayValue: string;
  /** Optional unit shown next to the value (°, %, bpm). */
  unit?: string;
  /** Underlying numeric value (for the range input). */
  value: number;
  min: number;
  max: number;
  step?: number;
  color?: MiniSliderColor;
  /** Disabled = read-only display, no interaction. */
  disabled?: boolean;
  /** Called on every value change while dragging. */
  onChange?: (next: number) => void;
  /** Long-press handler — Phase 4.4 wires this to the parameter sheet. */
  onLongPress?: () => void;
  /** Optional aria override; defaults to `${label} slider`. */
  ariaLabel?: string;
}

const LONG_PRESS_MS = 500;

export function MiniSlider({
  label,
  displayValue,
  unit,
  value,
  min,
  max,
  step = 1,
  color = 'accent',
  disabled = false,
  onChange,
  onLongPress,
  ariaLabel,
}: MiniSliderProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  // Clean up the timer on unmount so a quick long-press → unmount
  // doesn't fire onLongPress against a dead component.
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  function startLongPress() {
    if (!onLongPress || disabled) return;
    longPressFiredRef.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress?.();
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // Normalized 0..1 for the visual fill width.
  const range = max - min;
  const norm = range > 0 ? (value - min) / range : 0;
  const pct = Math.max(0, Math.min(1, norm)) * 100;
  const fillColor = COLOR_CSS[disabled ? 'muted' : color];

  return (
    <div
      className="mini-slider relative flex flex-col gap-1.5 px-3 py-2 rounded-interactive bg-bg-surface/40 border border-border-subtle"
      style={{ minHeight: 56 }}
      data-mini-slider
      data-color={color}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-secondary">
          {label}
        </span>
        <span
          className="font-mono tabular-nums text-text-primary"
          style={{ fontSize: 12 }}
        >
          {displayValue}
          {unit && <span className="text-text-muted"> {unit}</span>}
        </span>
      </div>

      <div
        className="mini-slider__track relative h-1.5 rounded-full bg-bg-deep border border-border-subtle/60"
        aria-hidden="true"
      >
        <div
          className="mini-slider__fill absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: fillColor,
            boxShadow: `0 0 6px ${fillColor}`,
          }}
        />
        <div
          className="mini-slider__thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{
            left: `${pct}%`,
            background: fillColor,
            boxShadow: `0 0 8px ${fillColor}, 0 0 0 1px rgb(var(--bg-primary))`,
          }}
        />
      </div>

      {/* Native range input layered on top — gives us iOS / Android
          touch handling for free. We size it to overlay the entire
          mini-slider so taps anywhere on the row hit the input. */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (longPressFiredRef.current) return;
          onChange?.(parseFloat(e.target.value));
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        aria-label={ariaLabel ?? `${label} slider`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        style={{ touchAction: 'pan-y' }}
      />
    </div>
  );
}
