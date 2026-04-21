// ─── AnalysisRail — classification + visibility-round-trip regression ─────
//
// Node-only vitest, matching the apps/web suite. Component cannot be
// rendered here without jsdom + the canvas 2D stub, so we verify the
// pure + store-driven pieces:
//
//   1. Shape classification: each of the 13 layers lands in exactly
//      one shape bucket (pixel / line-graph / scalar). The three
//      buckets cover every layer id.
//   2. `selectAnalysisRailLayerIds` — the pure selector used by
//      AnalysisRail — returns only line-graph ids, respects the
//      `visibleLayers` filter, and preserves the `layerOrder` order.
//   3. visibility toggle round-trip: toggle in the store → selector
//      output updates → toggle back → selector output restored. This
//      is the store wiring AnalysisRail rows depend on when a user
//      clicks the × (hide) button on a layer.
//   4. Agent-prompt acceptance: AnalysisExpandOverlay is importable
//      and renders a function component, and the overlay's open/close
//      contract is the same `layerId|null` shape the rail passes
//      (structural check, covered by higher-level smoke tests in
//      live preview).

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

  it('line-graph-shaped layers include the 9 analytical waveforms (per prompt)', () => {
    // Agent-prompt default list — the 9 layers that move into
    // AnalysisRail.
    const expected: VisualizationLayerId[] = [
      'luminance',
      'power-draw',
      'hue',
      'saturation',
      'channel-r',
      'channel-g',
      'channel-b',
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
    // Reverse the default order and ensure the selector keeps the
    // reversed sequence.
    const reversed = [...DEFAULT_LAYER_ORDER].reverse();
    const visible = new Set<VisualizationLayerId>(reversed);
    const out = selectAnalysisRailLayerIds(reversed, visible);
    // Filter-preserving: each adjacent pair in `out` must appear in
    // the same direction in the `reversed` input.
    for (let i = 1; i < out.length; i++) {
      const aIdx = reversed.indexOf(out[i - 1]);
      const bIdx = reversed.indexOf(out[i]);
      expect(aIdx).toBeLessThan(bIdx);
    }
  });

  it('excludes hidden layers', () => {
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

  it('returns the default line-graph set from a default store', () => {
    const state = useVisualizationStore.getState();
    const out = selectAnalysisRailLayerIds(state.layerOrder, state.visibleLayers);
    // Default visible line-graphs are R/G/B. Luminance, hue, power etc.
    // are hidden by default until the user opts in.
    expect(out.length).toBeGreaterThan(0);
    for (const id of out) {
      expect(LINE_GRAPH_SHAPED_LAYER_IDS.has(id)).toBe(true);
      expect(state.visibleLayers.has(id)).toBe(true);
    }
  });
});

describe('AnalysisRail — visibility toggle round-trip', () => {
  beforeEach(resetStore);

  it('toggling a line-graph layer adds/removes it from the selector output', () => {
    const initial = selectAnalysisRailLayerIds(
      useVisualizationStore.getState().layerOrder,
      useVisualizationStore.getState().visibleLayers,
    );

    // `luminance` is hidden by default — toggling it on should make
    // the selector include it.
    useVisualizationStore.getState().toggleLayer('luminance');
    let next = selectAnalysisRailLayerIds(
      useVisualizationStore.getState().layerOrder,
      useVisualizationStore.getState().visibleLayers,
    );
    expect(next).toContain('luminance');
    expect(next.length).toBe(initial.length + 1);

    // Toggle off — back to baseline.
    useVisualizationStore.getState().toggleLayer('luminance');
    next = selectAnalysisRailLayerIds(
      useVisualizationStore.getState().layerOrder,
      useVisualizationStore.getState().visibleLayers,
    );
    expect(next).not.toContain('luminance');
    expect(next).toEqual(initial);
  });

  it('hiding all RGB channels yields an empty selector output', () => {
    useVisualizationStore.getState().setLayerVisible('channel-r', false);
    useVisualizationStore.getState().setLayerVisible('channel-g', false);
    useVisualizationStore.getState().setLayerVisible('channel-b', false);
    const out = selectAnalysisRailLayerIds(
      useVisualizationStore.getState().layerOrder,
      useVisualizationStore.getState().visibleLayers,
    );
    expect(out).toEqual([]);
  });
});

describe('AnalysisRail — expand overlay contract', () => {
  it('AnalysisExpandOverlay module exports the component', async () => {
    const mod = await import('../components/layout/AnalysisExpandOverlay');
    expect(typeof mod.AnalysisExpandOverlay).toBe('function');
  });

  it('AnalysisRail module exports its component + selector', async () => {
    const mod = await import('../components/layout/AnalysisRail');
    expect(typeof mod.AnalysisRail).toBe('function');
    expect(typeof mod.selectAnalysisRailLayerIds).toBe('function');
  });
});
