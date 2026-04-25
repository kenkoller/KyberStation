// ─── v0.14.0 Phase 1 — blade zoom removal regression sentinel ──
//
// The user-facing zoom-in/zoom-out controls were removed from BladeCanvas
// as unnecessary UX. Auto-fit is the only scale now — the ResizeObserver
// tracks container size and the blade rescales to match.
//
// Nothing in the runtime API of BladeCanvas is zoom-aware anymore, so the
// best regression sentinel is a static source-scan against known forbidden
// tokens. If a future session re-introduces a zoom button, zoom state,
// ZOOM_MIN/MAX constants, or a pan clamp that depends on a zoom argument,
// this test fails and prompts a discussion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BLADE_CANVAS_SRC = readFileSync(
  resolve(__dirname, '..', '..', 'components', 'editor', 'BladeCanvas.tsx'),
  'utf8',
);

describe('BladeCanvas zoom removal — v0.14.0 Phase 1', () => {
  it('declares no ZOOM_MIN / ZOOM_MAX / ZOOM_STEP constants', () => {
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bZOOM_MIN\b/);
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bZOOM_MAX\b/);
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bZOOM_STEP\b/);
  });

  it('has no zoom state or setZoom calls', () => {
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bsetZoom\b/);
    expect(BLADE_CANVAS_SRC).not.toMatch(/useState<number>.*zoom/i);
  });

  it('has no computeFitZoom or zoomDisplayValue helpers', () => {
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bcomputeFitZoom\b/);
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bzoomDisplayValue\b/);
  });

  it('has no clampPanX helper (took a zoom argument)', () => {
    expect(BLADE_CANVAS_SRC).not.toMatch(/\bclampPanX\b/);
  });

  it('getScale() no longer multiplies by zoom', () => {
    // The old shape was `getBaseScale() * zoom`. The new shape is just
    // `getBaseScale()`. Search for the compound form explicitly.
    expect(BLADE_CANVAS_SRC).not.toMatch(/getBaseScale\(\)\s*\*\s*zoom\b/);
  });

  it('renders no Zoom in / Zoom out / Fit button', () => {
    expect(BLADE_CANVAS_SRC).not.toMatch(/aria-label=["']Zoom (in|out)["']/);
    expect(BLADE_CANVAS_SRC).not.toMatch(/aria-label=["']Fit blade to panel["']/);
  });
});
