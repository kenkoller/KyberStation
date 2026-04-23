// ─── AnalysisRail — classification + visibility regression ─────
//
// Node-only vitest, matching the apps/web suite. Component cannot be
// rendered here without jsdom + the canvas 2D stub, so we verify the
// pure + store-driven pieces:
//
//   1. Shape classification: each layer lands in exactly one shape
//      bucket (pixel / line-graph / scalar). The three buckets cover
//      every layer id.
//   2. `selectAnalysisRailLayerIds` — the pure selector used by
//      AnalysisRail — returns only line-graph ids, respects the
//      `visibleLayers` filter, and preserves the `layerOrder` order.
//   3. Default-visible contract: every line-graph layer is visible by
//      default (post-W1 2026-04-22 — "always on" product contract).
//   4. AnalysisRail module exports its component + selector.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VISUALIZATION_LAYERS,
  PIXEL_SHAPED_LAYERS,
  LINE_GRAPH_SHAPED_LAYERS,
  SCALAR_SHAPED_LAYERS,
  PIXEL_SHAPED_LAYER_IDS,
  LINE_GRAPH_SHAPED_LAYER_IDS,
  DEFAULT_LAYER_ORDER,
  DEFAULT_VISIBLE_LAYER_IDS,
  type VisualizationLayerId,
} from '../lib/visualizationTypes';
import { selectAnalysisRailLayerIds } from '../components/layout/AnalysisRail';
import { useVisualizationStore } from '../stores/visualizationStore';

function resetStore() {
  useVisualizationStore.setState({
    visibleLayers: new Set<VisualizationLayerId>(DEFAULT_VISIBLE_LAYER_IDS),
    layerOrder: [...DEFAULT_LAYER_ORDER],
    rgbLumaChannels: { r: true, g: true, b: true, l: true },
    isDebugMode: false,
    pinnedPixels: [],
    hoveredPixel: null,
  });
}

describe('visualizationTypes — shape classification', () => {
  it('every layer has exactly one shape', () => {
    for (const l of VISUALIZATION_LAYERS) {
      expect(['pixel', 'line-graph', 'scalar']).toContain(l.shape);
    }
  });

  it('every layer has both a descriptive label and a short fallback', () => {
    for (const l of VISUALIZATION_LAYERS) {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.shortLabel.length).toBeGreaterThan(0);
    }
  });

  it('three shape buckets collectively cover every layer id', () => {
    const bucketIds = new Set<string>([
      ...PIXEL_SHAPED_LAYERS.map((l) => l.id),
      ...LINE_GRAPH_SHAPED_LAYERS.map((l) => l.id),
      ...SCALAR_SHAPED_LAYERS.map((l) => l.id),
    ]);
    for (const l of VISUALIZATION_LAYERS) {
      expect(bucketIds.has(l.id)).toBe(true);
    }
  });

  it('pixel-shaped layers include blade + pixel-strip + effect-overlay', () => {
    expect(PIXEL_SHAPED_LAYER_IDS.has('blade')).toBe(true);
    expect(PIXEL_SHAPED_LAYER_IDS.has('pixel-strip')).toBe(true);
    expect(PIXEL_SHAPED_LAYER_IDS.has('effect-overlay')).toBe(true);
  });

  it('line-graph-shaped layers include the post-merge analytical waveforms', () => {
    const expected: VisualizationLayerId[] = [
      'rgb-luma',
      'power-draw',
      'hue',
      'saturation',
      'swing-response',
      'transition-progress',
    ];
    expect(LINE_GRAPH_SHAPED_LAYER_IDS.size).toBe(expected.length);
    for (const id of expected) {
      expect(LINE_GRAPH_SHAPED_LAYER_IDS.has(id)).toBe(true);
    }
  });

  it('storage-budget is scalar-shaped and moves to the Delivery rail', () => {
    expect(SCALAR_SHAPED_LAYERS.map((l) => l.id)).toEqual(['storage-budget']);
  });

  it('pixel + line-graph buckets do not overlap', () => {
    for (const id of PIXEL_SHAPED_LAYER_IDS) {
      expect(LINE_GRAPH_SHAPED_LAYER_IDS.has(id)).toBe(false);
    }
  });
});

describe('visualizationTypes — always-on analysis rail contract', () => {
  it('every line-graph layer is default-visible', () => {
    for (const id of LINE_GRAPH_SHAPED_LAYER_IDS) {
      expect(DEFAULT_VISIBLE_LAYER_IDS.has(id)).toBe(true);
    }
  });
});

describe('AnalysisRail — selectAnalysisRailLayerIds selector', () => {
  beforeEach(resetStore);

  it('returns only line-graph ids from the input order', () => {
    const all = [...DEFAULT_LAYER_ORDER];
    const visible = new Set<VisualizationLayerId>(all);
    const out = selectAnalysisRailLayerIds(all, visible);
    for (const id of out) {
      expect(LINE_GRAPH_SHAPED_LAYER_IDS.has(id)).toBe(true);
    }
  });

  it('preserves the layerOrder ordering', () => {
    const reversed = [...DEFAULT_LAYER_ORDER].reverse();
    const visible = new Set<VisualizationLayerId>(reversed);
    const out = selectAnalysisRailLayerIds(reversed, visible);
    for (let i = 1; i < out.length; i++) {
      const aIdx = reversed.indexOf(out[i - 1]);
      const bIdx = reversed.indexOf(out[i]);
      expect(aIdx).toBeLessThan(bIdx);
    }
  });

  it('excludes hidden layers (API-level hiding still works for programmatic callers)', () => {
    const all = [...DEFAULT_LAYER_ORDER];
    const visible = new Set<VisualizationLayerId>([]);
    const out = selectAnalysisRailLayerIds(all, visible);
    expect(out).toEqual([]);
  });

  it('excludes pixel-shaped + scalar-shaped layers even when visible', () => {
    const all = [...DEFAULT_LAYER_ORDER];
    const visible = new Set<VisualizationLayerId>([
      'blade',
      'pixel-strip',
      'effect-overlay',
      'storage-budget',
    ]);
    const out = selectAnalysisRailLayerIds(all, visible);
    expect(out).toEqual([]);
  });

  it('returns all six line-graph layers from a default store', () => {
    const state = useVisualizationStore.getState();
    const out = selectAnalysisRailLayerIds(state.layerOrder, state.visibleLayers);
    expect(out).toHaveLength(LINE_GRAPH_SHAPED_LAYER_IDS.size);
    for (const id of out) {
      expect(LINE_GRAPH_SHAPED_LAYER_IDS.has(id)).toBe(true);
      expect(state.visibleLayers.has(id)).toBe(true);
    }
  });
});

describe('AnalysisRail — module exports', () => {
  it('AnalysisRail module exports its component + selector', async () => {
    const mod = await import('../components/layout/AnalysisRail');
    expect(typeof mod.AnalysisRail).toBe('function');
    expect(typeof mod.selectAnalysisRailLayerIds).toBe('function');
  });
});
