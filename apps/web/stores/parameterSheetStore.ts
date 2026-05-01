'use client';

// ─── parameterSheetStore — Phase 4.4.x (2026-05-01) ─────────────────────────
//
// Global single-active-sheet state for the mobile ParameterSheet
// primitive. Decouples slider grids (ColorQuickControls and future
// per-section variants) from sheet rendering.
//
// Architecture:
//   - One sheet open at a time (mobile screen real estate).
//   - Any slider's `onLongPress` callback dispatches `open(spec)`.
//   - <ParameterSheetHost /> mounted once at MobileShell level
//     subscribes to this store + renders the sheet against the
//     active spec.
//
// Why a store instead of inline state in QuickControls:
//   1. Future per-section QuickControls variants (Style / Motion /
//      FX / HW / Route) all need the same sheet behavior — a single
//      shared store avoids reimplementing per-variant.
//   2. The sheet is a portal-style overlay; its rendering should
//      not be tied to any one slider grid's lifecycle.
//   3. Browser-back / route changes can call `close()` from outside
//      the slider component tree.

import { create } from 'zustand';
import type { MiniSliderColor } from '@/components/layout/mobile/MiniSlider';

/**
 * Shape describing one editable parameter for the sheet body.
 * Generic enough to cover any parameter type; the host translates
 * value reads + writes into store calls via the spec's getter +
 * setter.
 *
 * Note: we keep the getter/setter as plain function fields rather
 * than store keypaths so the store doesn't need to know which slice
 * (bladeStore / uiStore / motionSimStore / future) the parameter
 * lives in.
 */
export interface ParameterSheetSpec {
  /** Stable identifier — used as React key + telemetry label. */
  id: string;
  /** Sheet title (rendered in the 56px header). */
  title: string;
  /** Optional unit suffix shown in the headline + readouts. */
  unit?: string;
  /** Min / max / step for the slider input. */
  min: number;
  max: number;
  step: number;
  /** Color category drives the fill/glow color in the body. */
  color: MiniSliderColor;
  /** Default value used by the sheet's Reset button. */
  defaultValue: number;
  /** Format the headline value (e.g. round to int + add unit). */
  formatDisplay: (v: number) => string;
  /** Read the current value. Re-evaluated on every render. */
  read: () => number;
  /** Write a new value to the underlying store. */
  write: (next: number) => void;
}

interface ParameterSheetStoreState {
  isOpen: boolean;
  spec: ParameterSheetSpec | null;
  open: (spec: ParameterSheetSpec) => void;
  close: () => void;
}

export const useParameterSheetStore = create<ParameterSheetStoreState>((set) => ({
  isOpen: false,
  spec: null,
  open: (spec) => set({ isOpen: true, spec }),
  close: () => set({ isOpen: false, spec: null }),
}));
