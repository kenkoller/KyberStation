import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLayerStore,
  SMOOTHSWING_DEFAULTS,
  type BladeLayer,
} from '../stores/layerStore';

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
    blendMode: 'normal',
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

// ─── SmoothSwing layer type (item #15) ───────────────────────────────────────

describe('layerStore — smoothswing modulator plate layer type', () => {
  beforeEach(resetStore);

  it('accepts "smoothswing" as a valid LayerType via addLayer', () => {
    useLayerStore.getState().addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS },
    });
    const layers = useLayerStore.getState().layers;
    const added = layers[layers.length - 1];
    expect(added.type).toBe('smoothswing');
    expect(added.name).toBe('SmoothSwing');
    // Config must round-trip the full SmoothSwing payload.
    expect(added.config.version).toBe('V2');
    expect(added.config.swingThreshold).toBe(SMOOTHSWING_DEFAULTS.swingThreshold);
    expect(added.config.swingSharpness).toBe(SMOOTHSWING_DEFAULTS.swingSharpness);
    expect(added.config.swingStrength).toBe(SMOOTHSWING_DEFAULTS.swingStrength);
    expect(added.config.humVolume).toBe(SMOOTHSWING_DEFAULTS.humVolume);
    expect(added.config.accentSwingSpeed).toBe(SMOOTHSWING_DEFAULTS.accentSwingSpeed);
    expect(added.config.accentSwingLength).toBe(SMOOTHSWING_DEFAULTS.accentSwingLength);
  });

  it('SMOOTHSWING_DEFAULTS matches the ProffieOS V2 recommended values', () => {
    // Locks in the exported defaults so a casual edit doesn\u2019t silently
    // change what every new SmoothSwing layer starts with.
    expect(SMOOTHSWING_DEFAULTS).toEqual({
      version: 'V2',
      swingThreshold: 250,
      swingSharpness: 1.75,
      swingStrength: 700,
      humVolume: 3,
      accentSwingSpeed: 300,
      accentSwingLength: 150,
    });
  });

  it('updateLayerConfig merges partial SmoothSwing config onto the layer', () => {
    useLayerStore.getState().addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS },
    });
    const layers = useLayerStore.getState().layers;
    const id = layers[layers.length - 1].id;
    useLayerStore.getState().updateLayerConfig(id, { swingThreshold: 320, version: 'V1' });
    const updated = useLayerStore.getState().layers.find((l) => l.id === id)!;
    expect(updated.config.swingThreshold).toBe(320);
    expect(updated.config.version).toBe('V1');
    // Other fields untouched.
    expect(updated.config.humVolume).toBe(SMOOTHSWING_DEFAULTS.humVolume);
  });

  it('SmoothSwing state moves with the layer through reorder (moveLayer)', () => {
    const first = useLayerStore.getState().layers[0].id; // default base layer
    useLayerStore.getState().addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS, swingThreshold: 420 },
    });
    const plateId = useLayerStore.getState().layers.find((l) => l.type === 'smoothswing')!.id;
    // Reorder the plate down past the base layer.
    useLayerStore.getState().moveLayer(plateId, 'down');
    const layers = useLayerStore.getState().layers;
    expect(layers[0].id).toBe(plateId);
    expect(layers[1].id).toBe(first);
    // Config survives reorder.
    expect(layers[0].config.swingThreshold).toBe(420);
  });

  it('SmoothSwing state moves with the layer through duplicateLayer', () => {
    useLayerStore.getState().addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS, swingSharpness: 3.25 },
    });
    const plateId = useLayerStore.getState().layers.find((l) => l.type === 'smoothswing')!.id;
    useLayerStore.getState().duplicateLayer(plateId);
    const layers = useLayerStore.getState().layers;
    const plates = layers.filter((l) => l.type === 'smoothswing');
    expect(plates).toHaveLength(2);
    // The duplicate must keep the plate's configuration.
    expect(plates[0].config.swingSharpness).toBe(3.25);
    expect(plates[1].config.swingSharpness).toBe(3.25);
    // Duplicate has a fresh id and the copy-suffixed name.
    expect(plates[0].id).not.toBe(plates[1].id);
    expect(plates[1].name).toBe('SmoothSwing (copy)');
  });

  it('SmoothSwing layers participate in audition controls like any other type', () => {
    useLayerStore.getState().addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS },
    });
    const plateId = useLayerStore.getState().layers.find((l) => l.type === 'smoothswing')!.id;
    // Bypass \u2192 skipped.
    useLayerStore.getState().toggleBypass(plateId);
    expect(useLayerStore.getState().getRenderState(plateId)).toBe('skipped');
    useLayerStore.getState().toggleBypass(plateId);
    // Solo an audio plate in isolation.
    useLayerStore.getState().toggleSolo(plateId);
    expect(useLayerStore.getState().isAnyLayerSoloed()).toBe(true);
    expect(useLayerStore.getState().getRenderState(plateId)).toBe('active');
    // The base layer becomes muted by the solo group.
    const baseId = useLayerStore.getState().layers.find((l) => l.type === 'base')!.id;
    expect(useLayerStore.getState().getRenderState(baseId)).toBe('muted');
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
