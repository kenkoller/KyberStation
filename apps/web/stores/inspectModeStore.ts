'use client';

// ─── inspectModeStore — Phase 4.5 (2026-05-01) ──────────────────────────────
//
// Mobile blade-canvas Inspect-mode state. Per "Claude Design Mobile
// handoff/HANDOFF.md" §Q4:
//
//   - 500ms long-press in `.blade-canvas` enters Inspect.
//   - Zoom HUD lets the user pick 1× / 2.4× / 4× / 🎯 (re-center).
//   - Single-finger drag pans the zoomed blade laterally.
//   - On enter: chrome (header / action bar / section tabs / status
//     strip) dims to 0.4 opacity.
//   - Exit: tap outside the canvas + HUD, or Escape on iPad keyboard.
//   - Live blade animation must keep running while inspecting.
//
// State shape:
//   - isInspecting: gates the chrome dim + the BladeCanvas transform
//   - zoom: 1 | 2.4 | 4 — the canonical three steps from the HUD
//   - panX: lateral pan offset in CSS pixels (clamped by host)
//   - originXFraction: 0..1, fraction of the canvas width where the
//     long-press happened. transform-origin uses this so 2.4× / 4×
//     zoom centers on the LED the user pointed at.
//
// Why separate from uiStore: this is pure-runtime mobile state with no
// persistence. Keeping it isolated avoids re-rendering uiStore
// subscribers on every pan tick, and makes 4.5-only logic easy to
// exclude from desktop bundles when tree-shaking improves.

import { create } from 'zustand';

/** Three canonical zoom steps per handoff §Q4 HUD spec. */
export type InspectZoom = 1 | 2.4 | 4;

interface InspectModeStoreState {
  isInspecting: boolean;
  zoom: InspectZoom;
  /** Lateral pan offset in CSS pixels. Y is fixed (blade rod is horizontal). */
  panX: number;
  /** 0..1 — where on the blade the long-press happened. */
  originXFraction: number;
  enter: (originXFraction: number) => void;
  exit: () => void;
  setZoom: (zoom: InspectZoom) => void;
  setPanX: (px: number) => void;
  recenter: () => void;
}

export const useInspectModeStore = create<InspectModeStoreState>((set) => ({
  isInspecting: false,
  zoom: 1,
  panX: 0,
  originXFraction: 0.5,
  enter: (originXFraction) =>
    set({
      isInspecting: true,
      // Default to 2.4× on entry — gives an immediately-useful zoom
      // without overshooting to 4× where pan friction increases.
      zoom: 2.4,
      panX: 0,
      originXFraction: Math.max(0, Math.min(1, originXFraction)),
    }),
  exit: () =>
    set({
      isInspecting: false,
      zoom: 1,
      panX: 0,
      originXFraction: 0.5,
    }),
  setZoom: (zoom) => set({ zoom }),
  setPanX: (panX) => set({ panX }),
  recenter: () => set({ zoom: 1, panX: 0, originXFraction: 0.5 }),
}));
