// ─── Ignition / retraction under template-eval ───
//
// Regression cover for the v0.23.x gap: after PR #357 made InOutTrL a
// per-frame no-op (its real ProffieOS colour whited out every blade), no
// one drew the ignition or retraction in template-eval mode — the canvas
// renders the per-LED buffer, so the blade snapped fully on at the first
// IGNITING frame and stayed fully lit until the end of retraction,
// whatever ignition style was picked.
//
// The engine now applies the configured ignition / retraction class's
// getMask() to the evaluated buffer whenever the template's on/off
// behaviour is an InOutTrL. These tests pin that both render modes draw
// the SAME shape: for a solid-colour blade the two pixel buffers must be
// identical on every frame, for every registered ignition and retraction.

import { describe, it, expect } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import { IGNITION_REGISTRY, RETRACTION_REGISTRY } from '../src/ignition/index';
import type { BladeConfig } from '../src/types';

// A solid blue blade wrapped in InOutTrL — the codegen shape minus the
// effect layers. (The transitions inside InOutTrL do not matter: the
// interpreter treats InOutTrL as a no-op and the engine draws the mask.)
const SOLID_BLUE_TEMPLATE =
  'StylePtr<Layers<Rgb<0,0,255>,InOutTrL<TrWipe<300>,TrWipeIn<500>>>>()';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 480,
    shimmer: 0, // exact base colour → pixel-exact comparison
    ledCount: 132,
    ...overrides,
  };
}

function pair(): { param: BladeEngine; tmpl: BladeEngine } {
  const param = new BladeEngine();
  param.setRenderMode('proffie');
  const tmpl = new BladeEngine();
  tmpl.setPreviewTemplate(SOLID_BLUE_TEMPLATE);
  return { param, tmpl };
}

/** Step both engines in lockstep and assert identical buffers each frame. */
function expectLockstep(
  param: BladeEngine,
  tmpl: BladeEngine,
  config: BladeConfig,
  frames: number,
  label: string,
): void {
  for (let f = 0; f < frames; f++) {
    param.update(16, config);
    tmpl.update(16, config);
    expect(tmpl.lastRenderPath, label).toBe(tmpl.state === 'off' ? 'off' : 'template-eval');
    expect(Array.from(tmpl.getPixels()), `${label} frame ${f}`).toEqual(
      Array.from(param.getPixels()),
    );
  }
}

describe('template-eval draws the configured ignition', () => {
  for (const ignition of Object.keys(IGNITION_REGISTRY)) {
    it(`${ignition}: identical to the parameter engine on every frame`, () => {
      const config = makeConfig({ ignition });
      const { param, tmpl } = pair();
      param.ignite(config);
      tmpl.ignite(config);
      expectLockstep(param, tmpl, config, 24, `ignite ${ignition}`);
      expect(tmpl.state).toBe('on');
    });
  }
});

describe('template-eval draws the configured retraction', () => {
  for (const retraction of Object.keys(RETRACTION_REGISTRY)) {
    it(`${retraction}: identical to the parameter engine on every frame`, () => {
      const config = makeConfig({ retraction });
      const { param, tmpl } = pair();
      param.ignite(config);
      tmpl.ignite(config);
      expectLockstep(param, tmpl, config, 24, 'ignite');
      param.retract();
      tmpl.retract();
      // 480 ms retraction = 30 frames; the last frames fall through to OFF.
      expectLockstep(param, tmpl, config, 34, `retract ${retraction}`);
      expect(tmpl.state).toBe('off');
    });
  }
});

describe('shared ignition resolution', () => {
  it('honours easing, dual-mode ignition and custom curves in template-eval too', () => {
    const cases: Array<Partial<BladeConfig>> = [
      { ignition: 'standard', ignitionEasing: { type: 'preset', name: 'ease-in-cubic' } },
      { dualModeIgnition: true, ignitionUp: 'center', ignitionDown: 'spark' },
      { ignition: 'custom-curve', ignitionCurve: [0.9, 0.1, 0.1, 0.9] },
    ];
    for (const overrides of cases) {
      const config = makeConfig(overrides);
      const { param, tmpl } = pair();
      param.ignite(config);
      tmpl.ignite(config);
      expectLockstep(param, tmpl, config, 24, JSON.stringify(overrides));
    }
  });

  it('shows a partially extended blade mid-ignition (not a fully lit one)', () => {
    const config = makeConfig({ ignition: 'standard' });
    const { tmpl } = pair();
    tmpl.ignite(config);
    for (let i = 0; i < 8; i++) tmpl.update(16, config); // ~40% of 320 ms
    const px = tmpl.getPixels();
    const lit = (led: number) => px[led * 3 + 2]! > 0;
    expect(lit(5)).toBe(true); // near the emitter
    expect(lit(125)).toBe(false); // near the tip
  });
});

describe('templates that own their on/off behaviour are not masked', () => {
  it('a template without InOutTrL lights instantly (as the firmware would)', () => {
    const config = makeConfig({ ignition: 'standard' });
    const engine = new BladeEngine();
    engine.setPreviewTemplate('StylePtr<Rgb<0,0,255>>()');
    engine.ignite(config);
    engine.update(16, config);
    const px = engine.getPixels();
    expect(px[125 * 3 + 2]).toBe(255);
  });
});
