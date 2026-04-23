import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualizationStore } from '../stores/visualizationStore';
import {
  DEFAULT_VISIBLE_LAYER_IDS,
  DEFAULT_LAYER_ORDER,
  type VisualizationLayerId,
} from '../lib/visualizationTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('visualizationStore — default visible layers', () => {
  beforeEach(resetStore);

  it('default visible layers match the registry defaults', () => {
    const { visibleLayers } = useVisualizationStore.getState();
    for (const id of DEFAULT_VISIBLE_LAYER_IDS) {
      expect(visibleLayers.has(id)).toBe(true);
    }
  });

  it('blade, pixel-strip, rgb-luma are visible by default', () => {
    const { visibleLayers } = useVisualizationStore.getState();
    const coreIds: VisualizationLayerId[] = [
      'blade',
      'pixel-strip',
      'rgb-luma',
    ];
    for (const id of coreIds) {
      expect(visibleLayers.has(id)).toBe(true);
    }
  });

  it('extended line-graph layers are visible by default (W1 always-on contract)', () => {
    const { visibleLayers } = useVisualizationStore.getState();
    const lineGraphIds: VisualizationLayerId[] = [
      'power-draw',
      'hue',
      'saturation',
      'swing-response',
      'transition-progress',
    ];
    for (const id of lineGraphIds) {
      expect(visibleLayers.has(id)).toBe(true);
    }
  });

  it('non-line-graph extended layers remain hidden by default', () => {
    const { visibleLayers } = useVisualizationStore.getState();
    const hiddenIds: VisualizationLayerId[] = [
      'effect-overlay',
      'storage-budget',
    ];
    for (const id of hiddenIds) {
      expect(visibleLayers.has(id)).toBe(false);
    }
  });

  it('default layer order contains all layer IDs', () => {
    const { layerOrder } = useVisualizationStore.getState();
    expect(layerOrder).toEqual(DEFAULT_LAYER_ORDER);
  });
});

describe('visualizationStore — toggleLayer', () => {
  beforeEach(resetStore);

  it('hides a visible layer', () => {
    useVisualizationStore.getState().toggleLayer('blade');
    expect(useVisualizationStore.getState().visibleLayers.has('blade')).toBe(false);
  });

  it('shows a hidden layer', () => {
    // 'effect-overlay' is hidden by default
    useVisualizationStore.getState().toggleLayer('effect-overlay');
    expect(useVisualizationStore.getState().visibleLayers.has('effect-overlay')).toBe(true);
  });

  it('toggling twice restores original visibility', () => {
    useVisualizationStore.getState().toggleLayer('rgb-luma');
    useVisualizationStore.getState().toggleLayer('rgb-luma');
    expect(useVisualizationStore.getState().visibleLayers.has('rgb-luma')).toBe(true);
  });

  it('toggling one layer does not affect other layers', () => {
    useVisualizationStore.getState().toggleLayer('blade');
    const { visibleLayers } = useVisualizationStore.getState();
    // pixel-strip, rgb-luma, etc. should be unchanged
    expect(visibleLayers.has('pixel-strip')).toBe(true);
    expect(visibleLayers.has('rgb-luma')).toBe(true);
  });
});

describe('visualizationStore — setLayerVisible', () => {
  beforeEach(resetStore);

  it('explicitly hides a visible layer', () => {
    useVisualizationStore.getState().setLayerVisible('blade', false);
    expect(useVisualizationStore.getState().visibleLayers.has('blade')).toBe(false);
  });

  it('explicitly shows a hidden layer', () => {
    useVisualizationStore.getState().setLayerVisible('hue', true);
    expect(useVisualizationStore.getState().visibleLayers.has('hue')).toBe(true);
  });

  it('setting visible=true on already-visible layer is a no-op', () => {
    const before = useVisualizationStore.getState().visibleLayers.size;
    useVisualizationStore.getState().setLayerVisible('blade', true);
    expect(useVisualizationStore.getState().visibleLayers.size).toBe(before);
  });

  it('setting visible=false on already-hidden layer is a no-op', () => {
    // effect-overlay is hidden by default (the "always-on" contract
    // only applies to line-graph-shaped layers).
    const before = useVisualizationStore.getState().visibleLayers.size;
    useVisualizationStore.getState().setLayerVisible('effect-overlay', false);
    expect(useVisualizationStore.getState().visibleLayers.size).toBe(before);
  });
});

describe('visualizationStore — rgbLumaChannels', () => {
  beforeEach(resetStore);

  it('defaults to all four channels enabled', () => {
    const { rgbLumaChannels } = useVisualizationStore.getState();
    expect(rgbLumaChannels).toEqual({ r: true, g: true, b: true, l: true });
  });

  it('toggleRgbLumaChannel flips the named channel', () => {
    useVisualizationStore.getState().toggleRgbLumaChannel('r');
    expect(useVisualizationStore.getState().rgbLumaChannels.r).toBe(false);
    useVisualizationStore.getState().toggleRgbLumaChannel('r');
    expect(useVisualizationStore.getState().rgbLumaChannels.r).toBe(true);
  });

  it('toggling one channel does not affect the others', () => {
    useVisualizationStore.getState().toggleRgbLumaChannel('g');
    const { rgbLumaChannels } = useVisualizationStore.getState();
    expect(rgbLumaChannels).toEqual({ r: true, g: false, b: true, l: true });
  });

  it('setRgbLumaChannel writes the exact value', () => {
    useVisualizationStore.getState().setRgbLumaChannel('l', false);
    expect(useVisualizationStore.getState().rgbLumaChannels.l).toBe(false);
    useVisualizationStore.getState().setRgbLumaChannel('l', true);
    expect(useVisualizationStore.getState().rgbLumaChannels.l).toBe(true);
  });

  it('setRgbLumaChannel is a no-op when the value already matches', () => {
    const before = useVisualizationStore.getState().rgbLumaChannels;
    useVisualizationStore.getState().setRgbLumaChannel('r', true);
    // Reference equality would be ideal, but zustand may still produce a
    // new top-level state object even when a slice is unchanged. The
    // observable contract is value equality.
    expect(useVisualizationStore.getState().rgbLumaChannels).toEqual(before);
  });
});

describe('visualizationStore — resetToDefaults', () => {
  beforeEach(resetStore);

  it('restores default visible layers after changes', () => {
    useVisualizationStore.getState().toggleLayer('blade');
    useVisualizationStore.getState().toggleLayer('effect-overlay');
    useVisualizationStore.getState().resetToDefaults();

    const { visibleLayers } = useVisualizationStore.getState();
    expect(visibleLayers.has('blade')).toBe(true);
    expect(visibleLayers.has('effect-overlay')).toBe(false);
  });

  it('restores default rgbLumaChannels after channel toggles', () => {
    useVisualizationStore.getState().toggleRgbLumaChannel('r');
    useVisualizationStore.getState().toggleRgbLumaChannel('l');
    useVisualizationStore.getState().resetToDefaults();
    expect(useVisualizationStore.getState().rgbLumaChannels).toEqual({
      r: true, g: true, b: true, l: true,
    });
  });

  it('resets debug mode to false', () => {
    useVisualizationStore.getState().toggleDebugMode();
    useVisualizationStore.getState().resetToDefaults();
    expect(useVisualizationStore.getState().isDebugMode).toBe(false);
  });

  it('clears pinned pixels', () => {
    useVisualizationStore.getState().pinPixel(10);
    useVisualizationStore.getState().pinPixel(20);
    useVisualizationStore.getState().resetToDefaults();
    expect(useVisualizationStore.getState().pinnedPixels).toHaveLength(0);
  });

  it('clears hovered pixel', () => {
    useVisualizationStore.getState().setHoveredPixel(42);
    useVisualizationStore.getState().resetToDefaults();
    expect(useVisualizationStore.getState().hoveredPixel).toBeNull();
  });

  it('restores default layer order', () => {
    useVisualizationStore.getState().resetToDefaults();
    expect(useVisualizationStore.getState().layerOrder).toEqual(DEFAULT_LAYER_ORDER);
  });
});

describe('visualizationStore — debug mode toggle', () => {
  beforeEach(resetStore);

  it('starts as false', () => {
    expect(useVisualizationStore.getState().isDebugMode).toBe(false);
  });

  it('toggleDebugMode turns debug on', () => {
    useVisualizationStore.getState().toggleDebugMode();
    expect(useVisualizationStore.getState().isDebugMode).toBe(true);
  });

  it('toggleDebugMode turns debug off again', () => {
    useVisualizationStore.getState().toggleDebugMode();
    useVisualizationStore.getState().toggleDebugMode();
    expect(useVisualizationStore.getState().isDebugMode).toBe(false);
  });
});

describe('visualizationStore — pinPixel / unpinPixel', () => {
  beforeEach(resetStore);

  it('pinPixel adds a pixel index', () => {
    useVisualizationStore.getState().pinPixel(5);
    expect(useVisualizationStore.getState().pinnedPixels).toContain(5);
  });

  it('pinPixel does not add duplicates', () => {
    useVisualizationStore.getState().pinPixel(5);
    useVisualizationStore.getState().pinPixel(5);
    expect(useVisualizationStore.getState().pinnedPixels.filter((i) => i === 5)).toHaveLength(1);
  });

  it('can pin multiple distinct pixels', () => {
    useVisualizationStore.getState().pinPixel(10);
    useVisualizationStore.getState().pinPixel(50);
    useVisualizationStore.getState().pinPixel(100);
    expect(useVisualizationStore.getState().pinnedPixels).toHaveLength(3);
  });

  it('unpinPixel removes the pixel index', () => {
    useVisualizationStore.getState().pinPixel(10);
    useVisualizationStore.getState().unpinPixel(10);
    expect(useVisualizationStore.getState().pinnedPixels).not.toContain(10);
  });

  it('unpinPixel is a no-op for a pixel that was never pinned', () => {
    useVisualizationStore.getState().pinPixel(10);
    useVisualizationStore.getState().unpinPixel(99);
    expect(useVisualizationStore.getState().pinnedPixels).toHaveLength(1);
  });

  it('unpinPixel only removes the targeted pixel', () => {
    useVisualizationStore.getState().pinPixel(10);
    useVisualizationStore.getState().pinPixel(20);
    useVisualizationStore.getState().unpinPixel(10);
    expect(useVisualizationStore.getState().pinnedPixels).not.toContain(10);
    expect(useVisualizationStore.getState().pinnedPixels).toContain(20);
  });
});

describe('visualizationStore — setHoveredPixel', () => {
  beforeEach(resetStore);

  it('starts as null', () => {
    expect(useVisualizationStore.getState().hoveredPixel).toBeNull();
  });

  it('sets the hovered pixel index', () => {
    useVisualizationStore.getState().setHoveredPixel(42);
    expect(useVisualizationStore.getState().hoveredPixel).toBe(42);
  });

  it('clears the hovered pixel when set to null', () => {
    useVisualizationStore.getState().setHoveredPixel(42);
    useVisualizationStore.getState().setHoveredPixel(null);
    expect(useVisualizationStore.getState().hoveredPixel).toBeNull();
  });

  it('updates when a different pixel is hovered', () => {
    useVisualizationStore.getState().setHoveredPixel(10);
    useVisualizationStore.getState().setHoveredPixel(20);
    expect(useVisualizationStore.getState().hoveredPixel).toBe(20);
  });
});
