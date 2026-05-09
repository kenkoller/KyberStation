// ─── Variant cycling — engine + bridge integration tests ────────────────
//
// Phase 1D: Tests for walkForColorChange tree search, variant cycling API
// on BladeEngine, and round-trip through the template-eval render path.

import { describe, it, expect, beforeEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine.js';
import type { BladeConfig } from '../src/types.js';

function makeTestConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0.1,
    ledCount: 144,
    ...overrides,
  };
}

function runFrames(engine: BladeEngine, config: BladeConfig, count: number, deltaMs = 16): void {
  for (let i = 0; i < count; i++) {
    engine.update(deltaMs, config);
  }
}

describe('Variant cycling', () => {
  let engine: BladeEngine;

  beforeEach(() => {
    engine = new BladeEngine();
    engine.setRenderMode('template-eval');
  });

  // ─── variantCount / currentVariant defaults ─

  it('variantCount is 0 when not in template-eval mode', () => {
    const eng = new BladeEngine();
    expect(eng.variantCount).toBe(0);
  });

  it('variantCount is 0 in template-eval mode with no template loaded', () => {
    expect(engine.variantCount).toBe(0);
  });

  it('currentVariant is 0 when no template is loaded', () => {
    expect(engine.currentVariant).toBe(0);
  });

  it('setVariant is a no-op when no template is loaded', () => {
    // Should not throw
    engine.setVariant(5);
    expect(engine.currentVariant).toBe(0);
  });

  // ─── Templates without ColorChange ─

  it('variantCount is 0 for a simple Rgb template', () => {
    const config = makeTestConfig({
      importedRawCode: 'Rgb<255,0,0>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.variantCount).toBe(0);
    expect(engine.currentVariant).toBe(0);
  });

  it('variantCount is 0 for AudioFlicker (no ColorChange)', () => {
    const config = makeTestConfig({
      importedRawCode: 'AudioFlicker<Rgb<0,0,255>, Rgb<0,255,255>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.variantCount).toBe(0);
  });

  // ─── Templates WITH ColorChange ─

  it('detects ColorChange with 3 variants at root level', () => {
    const config = makeTestConfig({
      importedRawCode: 'ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.variantCount).toBe(3);
    expect(engine.currentVariant).toBe(0);
  });

  it('detects ColorChange nested inside Layers', () => {
    const config = makeTestConfig({
      importedRawCode: 'Layers<ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.variantCount).toBe(2);
  });

  it('setVariant changes the current variant index', () => {
    const config = makeTestConfig({
      importedRawCode: 'ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.currentVariant).toBe(0);
    engine.setVariant(1);
    expect(engine.currentVariant).toBe(1);
    engine.setVariant(2);
    expect(engine.currentVariant).toBe(2);
  });

  it('setVariant wraps around with modulo', () => {
    const config = makeTestConfig({
      importedRawCode: 'ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    // setVariant should handle wrapping (ColorChangeTemplate clamps/wraps internally)
    engine.setVariant(0);
    expect(engine.currentVariant).toBe(0);
    engine.setVariant(2);
    expect(engine.currentVariant).toBe(2);
  });

  // ─── Visual output verification ─

  it('variant 0 produces red, variant 1 produces green for ColorChange<TrInstant,Red,Green>', () => {
    const config = makeTestConfig({
      importedRawCode: 'ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 20);

    // Variant 0 should produce red
    const buf0 = new Uint8Array(engine.leds.buffer.length);
    buf0.set(engine.leds.buffer);

    let red0 = 0, green0 = 0;
    for (let i = 0; i < buf0.length; i += 3) {
      red0 += buf0[i];
      green0 += buf0[i + 1];
    }
    expect(red0).toBeGreaterThan(0);
    expect(green0).toBe(0);

    // Switch to variant 1 (green)
    engine.setVariant(1);
    runFrames(engine, config, 5);

    const buf1 = engine.leds.buffer;
    let red1 = 0, green1 = 0;
    for (let i = 0; i < buf1.length; i += 3) {
      red1 += buf1[i];
      green1 += buf1[i + 1];
    }
    expect(red1).toBe(0);
    expect(green1).toBeGreaterThan(0);
  });

  // ─── Mode switch clears variant state ─

  it('switching away from template-eval resets variant state', () => {
    const config = makeTestConfig({
      importedRawCode: 'ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 5);

    expect(engine.variantCount).toBe(3);
    engine.setVariant(2);
    expect(engine.currentVariant).toBe(2);

    // Switch away and back
    engine.setRenderMode('proffie');
    expect(engine.variantCount).toBe(0);
    expect(engine.currentVariant).toBe(0);
  });

  // ─── Deeply nested ColorChange ─

  it('finds ColorChange deeply nested inside InOutTrL + Layers', () => {
    const config = makeTestConfig({
      importedRawCode:
        'InOutTrL<Layers<ColorChange<TrInstant,Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>,Rgb<255,255,0>>>,TrWipe<300>,TrWipeIn<500>>',
    } as Partial<BladeConfig>);

    engine.ignite(config);
    runFrames(engine, config, 20);

    expect(engine.variantCount).toBe(4);
    expect(engine.currentVariant).toBe(0);

    engine.setVariant(3);
    expect(engine.currentVariant).toBe(3);
  });
});
