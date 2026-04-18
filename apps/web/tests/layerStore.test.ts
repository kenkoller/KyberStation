import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore, type BladeLayer } from '../stores/layerStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset the store back to its single-base-layer factory state. */
function resetStore() {
  useLayerStore.setState({
    layers: [
      {
        id: 'layer-default-base',
        type: 'base',
        name: 'Base Style',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        bypass: false,
        mute: false,
        solo: false,
        config: {
          style: 'stable',
          color: { r: 0, g: 140, b: 255 },
        },
      },
    ],
    selectedLayerId: 'layer-default-base',
  });
}

function addLayer(overrides: Partial<Omit<BladeLayer, 'id'>> = {}): string {
  const before = useLayerStore.getState().layers.length;
  useLayerStore.getState().addLayer({
    type: 'effect',
    name: overrides.name ?? 'Effect Layer',
    visible: true,
    opacity: 1,
    blendMode: 'add',
    config: { effectType: 'clash', color: { r: 255, g: 255, b: 255 }, size: 50 },
    ...overrides,
  });
  const after = useLayerStore.getState().layers;
  expect(after.length).toBe(before + 1);
  return after[after.length - 1].id;
}

// ─── bypass / mute / solo basics ─────────────────────────────────────────────

describe('layerStore — audition flags default off', () => {
  beforeEach(resetStore);

  it('default base layer has bypass/mute/solo all false', () => {
    const layer = useLayerStore.getState().layers[0];
    expect(layer.bypass).toBe(false);
    expect(layer.mute).toBe(false);
    expect(layer.solo).toBe(false);
  });

  it('addLayer creates a layer with clean audition state', () => {
    const id = addLayer();
    const layer = useLayerStore.getState().layers.find((l) => l.id === id)!;
    expect(layer.bypass).toBe(false);
    expect(layer.mute).toBe(false);
    expect(layer.solo).toBe(false);
  });

  it('toggleBypass flips bypass on target layer only', () => {
    const id = addLayer();
    const other = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleBypass(id);
    const afterToggle = useLayerStore.getState().layers;
    expect(afterToggle.find((l) => l.id === id)!.bypass).toBe(true);
    expect(afterToggle.find((l) => l.id === other)!.bypass).toBe(false);
    // Toggle again — should flip back.
    useLayerStore.getState().toggleBypass(id);
    expect(useLayerStore.getState().layers.find((l) => l.id === id)!.bypass).toBe(false);
  });

  it('toggleMute flips mute on target layer only', () => {
    const id = addLayer();
    useLayerStore.getState().toggleMute(id);
    expect(useLayerStore.getState().layers.find((l) => l.id === id)!.mute).toBe(true);
    useLayerStore.getState().toggleMute(id);
    expect(useLayerStore.getState().layers.find((l) => l.id === id)!.mute).toBe(false);
  });
});

// ─── renderState / solo group behavior ───────────────────────────────────────

describe('layerStore — getRenderState (compositor semantics)', () => {
  beforeEach(resetStore);

  it('default layer renders as "active"', () => {
    const layer = useLayerStore.getState().layers[0];
    expect(useLayerStore.getState().getRenderState(layer.id)).toBe('active');
  });

  it('bypass → "skipped" (compositor can skip entirely)', () => {
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleBypass(id);
    expect(useLayerStore.getState().getRenderState(id)).toBe('skipped');
  });

  it('mute → "muted" (composited but output is black)', () => {
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleMute(id);
    expect(useLayerStore.getState().getRenderState(id)).toBe('muted');
  });

  it('bypass wins over mute (skip is stronger than black)', () => {
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleMute(id);
    useLayerStore.getState().toggleBypass(id);
    expect(useLayerStore.getState().getRenderState(id)).toBe('skipped');
  });

  it('unknown layer id → "skipped"', () => {
    expect(useLayerStore.getState().getRenderState('does-not-exist')).toBe('skipped');
  });

  it('isAnyLayerSoloed reports false by default, true when any is soloed', () => {
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(false);
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleSolo(id);
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(true);
  });

  it('solo isolates — non-soloed layers render as "muted"', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    const c = addLayer({ name: 'Layer C' });
    useLayerStore.getState().toggleSolo(b);
    expect(useLayerStore.getState().getRenderState(b)).toBe('active');
    expect(useLayerStore.getState().getRenderState(a)).toBe('muted');
    expect(useLayerStore.getState().getRenderState(c)).toBe('muted');
  });

  it('multiple layers can be soloed simultaneously', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    const c = addLayer({ name: 'Layer C' });
    useLayerStore.getState().toggleSolo(b);
    useLayerStore.getState().toggleSolo(c);
    expect(useLayerStore.getState().getRenderState(a)).toBe('muted');
    expect(useLayerStore.getState().getRenderState(b)).toBe('active');
    expect(useLayerStore.getState().getRenderState(c)).toBe('active');
  });

  it('clicking solo on a soloed layer removes it from the solo group', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    useLayerStore.getState().toggleSolo(a);
    useLayerStore.getState().toggleSolo(b);
    // Now a and b are both soloed.
    expect(useLayerStore.getState().getRenderState(a)).toBe('active');
    expect(useLayerStore.getState().getRenderState(b)).toBe('active');
    // Remove a from solo.
    useLayerStore.getState().toggleSolo(a);
    // b is still soloed, so a becomes muted.
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(true);
    expect(useLayerStore.getState().getRenderState(a)).toBe('muted');
    expect(useLayerStore.getState().getRenderState(b)).toBe('active');
  });

  it('bypass wins over solo-group mute', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    // Solo b; that would mute a by default.
    useLayerStore.getState().toggleSolo(b);
    // Bypass a — bypass should win, so a is "skipped" not "muted".
    useLayerStore.getState().toggleBypass(a);
    expect(useLayerStore.getState().getRenderState(a)).toBe('skipped');
  });

  it('clearSolo removes solo from all layers in one call', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    const c = addLayer({ name: 'Layer C' });
    useLayerStore.getState().toggleSolo(a);
    useLayerStore.getState().toggleSolo(b);
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(true);
    useLayerStore.getState().clearSolo();
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(false);
    expect(useLayerStore.getState().getRenderState(a)).toBe('active');
    expect(useLayerStore.getState().getRenderState(b)).toBe('active');
    expect(useLayerStore.getState().getRenderState(c)).toBe('active');
  });

  it('clearSolo with no soloed layers is a no-op (preserves references)', () => {
    const before = useLayerStore.getState().layers;
    useLayerStore.getState().clearSolo();
    const after = useLayerStore.getState().layers;
    // Object identity is preserved — no needless re-renders.
    expect(after).toBe(before);
  });

  it('muted wins over solo-muted (same state, still "muted")', () => {
    const a = useLayerStore.getState().layers[0].id;
    const b = addLayer({ name: 'Layer B' });
    useLayerStore.getState().toggleSolo(b);  // a → muted by solo group
    useLayerStore.getState().toggleMute(a);  // a also explicitly muted
    expect(useLayerStore.getState().getRenderState(a)).toBe('muted');
    // Clear the solo — a should stay muted because of its own flag.
    useLayerStore.getState().toggleSolo(b);
    expect(useLayerStore.getState().getRenderState(a)).toBe('muted');
  });
});

// ─── duplicateLayer / audition ───────────────────────────────────────────────

describe('layerStore — duplicateLayer strips audition state', () => {
  beforeEach(resetStore);

  it('duplicate of a muted+bypassed+soloed layer starts clean', () => {
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleBypass(id);
    useLayerStore.getState().toggleMute(id);
    useLayerStore.getState().toggleSolo(id);
    useLayerStore.getState().duplicateLayer(id);
    const dup = useLayerStore.getState().layers[useLayerStore.getState().layers.length - 1];
    expect(dup.id).not.toBe(id);
    expect(dup.bypass).toBe(false);
    expect(dup.mute).toBe(false);
    expect(dup.solo).toBe(false);
  });
});

// ─── Shape persistence across state reset ────────────────────────────────────

describe('layerStore — audition fields are proper store state', () => {
  beforeEach(resetStore);

  it('state snapshot includes bypass/mute/solo for structural clone', () => {
    const id = useLayerStore.getState().layers[0].id;
    useLayerStore.getState().toggleBypass(id);
    useLayerStore.getState().toggleSolo(id);
    const snapshot = structuredClone(useLayerStore.getState().layers);
    const layer = snapshot.find((l) => l.id === id)!;
    expect(layer.bypass).toBe(true);
    expect(layer.solo).toBe(true);
    expect(layer.mute).toBe(false);
    // Restoring the snapshot (history replay) reapplies audition flags.
    useLayerStore.setState({ layers: snapshot });
    expect(useLayerStore.getState().getRenderState(id)).toBe('skipped');
  });
});
