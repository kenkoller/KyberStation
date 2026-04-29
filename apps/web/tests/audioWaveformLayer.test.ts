// ─── Audio waveform layer — registration + readout ──────────────────────────
//
// Pins the visualizationTypes registration:
//
//   1. Layer is registered with the right shape / category / default
//      visibility / color / height.
//   2. Layer is line-graph-shaped (so it lives in the AnalysisRail).
//   3. Layer is opt-in (defaultVisible: false) — gated on user
//      enabling. AudioContext autoplay policy means we don't want the
//      rail to flicker live on first paint with nothing playing.
//   4. computeLayerReadout('audio-waveform', …) returns sensible values
//      for the three states: OFF (no analyser yet), SILENT (analyser
//      published but buffer is below the audible-floor), and a peak
//      dBFS readout for live audio.

import { describe, it, expect } from 'vitest';
import {
  VISUALIZATION_LAYERS,
  getLayerById,
  LINE_GRAPH_SHAPED_LAYER_IDS,
  DEFAULT_VISIBLE_LAYER_IDS,
} from '../lib/visualizationTypes';
import { computeLayerReadout } from '../components/editor/VisualizationStack';

describe('audio-waveform layer — registration', () => {
  it('is registered in VISUALIZATION_LAYERS exactly once', () => {
    const matches = VISUALIZATION_LAYERS.filter((l) => l.id === 'audio-waveform');
    expect(matches.length).toBe(1);
  });

  it('has the expected shape / category / default-off semantics', () => {
    const layer = getLayerById('audio-waveform');
    expect(layer).toBeDefined();
    expect(layer?.shape).toBe('line-graph');
    expect(layer?.category).toBe('extended');
    expect(layer?.defaultVisible).toBe(false);
    expect(layer?.height).toBeGreaterThan(0);
    expect(layer?.label).toMatch(/AUDIO/i);
    expect(layer?.shortLabel.length).toBeGreaterThan(0);
  });

  it('appears in LINE_GRAPH_SHAPED_LAYER_IDS', () => {
    expect(LINE_GRAPH_SHAPED_LAYER_IDS.has('audio-waveform')).toBe(true);
  });

  it('does NOT appear in DEFAULT_VISIBLE_LAYER_IDS (opt-in)', () => {
    expect(DEFAULT_VISIBLE_LAYER_IDS.has('audio-waveform')).toBe(false);
  });

  it('uses a hex color string', () => {
    const layer = getLayerById('audio-waveform');
    expect(layer?.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
  });
});

describe('audio-waveform layer — computeLayerReadout', () => {
  it('returns "OFF" when no audioWaveform context is provided', () => {
    expect(computeLayerReadout('audio-waveform', null, 0)).toBe('OFF');
  });

  it('returns "OFF" when audioWaveform is null', () => {
    expect(
      computeLayerReadout('audio-waveform', null, 0, { audioWaveform: null }),
    ).toBe('OFF');
  });

  it('returns "OFF" when buffer length is 0', () => {
    expect(
      computeLayerReadout('audio-waveform', null, 0, {
        audioWaveform: new Float32Array(0),
      }),
    ).toBe('OFF');
  });

  it('returns "SILENT" for a near-zero buffer (below audible floor)', () => {
    const buf = new Float32Array(64);
    // All zeros — peak amplitude well below 1e-4 threshold.
    expect(
      computeLayerReadout('audio-waveform', null, 0, { audioWaveform: buf }),
    ).toBe('SILENT');
  });

  it('returns a dBFS readout for a live signal', () => {
    const buf = new Float32Array(64);
    // Half-amplitude sine — peak == 0.5 → dBFS ≈ -6.
    for (let i = 0; i < buf.length; i++) {
      buf[i] = 0.5 * Math.sin((i / buf.length) * 2 * Math.PI);
    }
    const out = computeLayerReadout('audio-waveform', null, 0, { audioWaveform: buf });
    expect(out).toMatch(/dBFS$/);
    // -6 is the textbook dBFS for half-amplitude; rounding gives -6 exactly.
    expect(out).toMatch(/-6 dBFS/);
  });

  it('clips peak readout at 0 dBFS for a full-amplitude signal', () => {
    const buf = new Float32Array(64);
    for (let i = 0; i < buf.length; i++) buf[i] = 1.0;
    const out = computeLayerReadout('audio-waveform', null, 0, { audioWaveform: buf });
    // log10(1) === 0, so the readout should be "0 dBFS"
    expect(out).toMatch(/0 dBFS/);
  });
});
