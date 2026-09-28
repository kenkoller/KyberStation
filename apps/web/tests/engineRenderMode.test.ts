// ─── Engine render-mode resolution — single source of truth ──────────
//
// Pins `lib/engineRenderMode.ts`, which replaced the duplicated mode
// ternaries in `useBladeEngine` + the retired `useHardwarePreview` hook.
// The old split had a race: on a board change `useBladeEngine` forced
// 'proffie' (tearing down the template bridge) and `useHardwarePreview`
// only re-applied 'template-eval' when the generated code string changed.
// Switching between two Proffie boards (or Proffie → Xenopixel → Proffie)
// left the canvas on the parameter-engine approximation until the next
// config edit. These tests drive a real BladeEngine through the same
// plan → apply sequence the hook runs on every input change.

import { describe, it, expect } from 'vitest';
import { BladeEngine, type BladeConfig } from '@kyberstation/engine';
import { generateStyleCode } from '@kyberstation/codegen';
import {
  applyEngineRenderPlan,
  planEngineRender,
  resolveEngineRenderMode,
} from '@/lib/engineRenderMode';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    name: 'render-mode-test',
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
    ledCount: 132,
    ...overrides,
  };
}

function tick(engine: BladeEngine, config: BladeConfig, frames = 5): void {
  for (let i = 0; i < frames; i++) engine.update(16, config);
}

describe('resolveEngineRenderMode', () => {
  it('imported raw code always renders through template-eval', () => {
    for (const boardId of ['proffie-v3.9', 'proffie-v2.2', 'xenopixel', 'cfx']) {
      for (const hardwarePreview of [true, false]) {
        expect(
          resolveEngineRenderMode({ boardId, hardwarePreview, importedRawCode: 'StylePtr<Blue>()' }),
        ).toBe('template-eval');
      }
    }
  });

  it('a Xenopixel board uses the Xenopixel renderer regardless of the HW toggle', () => {
    expect(resolveEngineRenderMode({ boardId: 'xenopixel', hardwarePreview: true })).toBe('xenopixel');
    expect(resolveEngineRenderMode({ boardId: 'xenopixel', hardwarePreview: false })).toBe('xenopixel');
  });

  it('the HW toggle picks template-eval vs the parameter engine on every other board', () => {
    for (const boardId of ['proffie-v3.9', 'proffie-v2.2', 'golden-harvest-v3', 'cfx', 'verso']) {
      expect(resolveEngineRenderMode({ boardId, hardwarePreview: true })).toBe('template-eval');
      expect(resolveEngineRenderMode({ boardId, hardwarePreview: false })).toBe('proffie');
    }
  });
});

describe('planEngineRender', () => {
  it('carries the generated ProffieOS code in template-eval mode', () => {
    const config = makeConfig();
    const plan = planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: true });
    expect(plan.mode).toBe('template-eval');
    expect(plan.previewTemplate).toBe(generateStyleCode(config, { comments: false }));
  });

  it('carries no preview template when the config renders its own imported code', () => {
    const plan = planEngineRender(
      makeConfig({ importedRawCode: 'StylePtr<Layers<Red,InOutTrL<TrWipe<300>,TrWipeIn<500>>>>()' }),
      { boardId: 'proffie-v3.9', hardwarePreview: true },
    );
    expect(plan).toEqual({ mode: 'template-eval', previewTemplate: null });
  });

  it('carries no preview template outside template-eval', () => {
    expect(
      planEngineRender(makeConfig(), { boardId: 'proffie-v3.9', hardwarePreview: false }),
    ).toEqual({ mode: 'proffie', previewTemplate: null });
    expect(
      planEngineRender(makeConfig(), { boardId: 'xenopixel', hardwarePreview: true }),
    ).toEqual({ mode: 'xenopixel', previewTemplate: null });
  });

  it('falls back to no template (parameter-engine safety net) when codegen throws', () => {
    const plan = planEngineRender(
      makeConfig(),
      { boardId: 'proffie-v3.9', hardwarePreview: true },
      () => { throw new Error('codegen failure'); },
    );
    expect(plan).toEqual({ mode: 'template-eval', previewTemplate: null });
  });
});

describe('applyEngineRenderPlan on a live engine', () => {
  it('stays on template-eval when switching between two Proffie boards', () => {
    const config = makeConfig();
    const engine = new BladeEngine();
    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: true }));
    engine.ignite(config);
    tick(engine, config, 30);
    expect(engine.lastRenderPath).toBe('template-eval');

    // Board change — same config, so the generated code is identical.
    // The pre-fix hooks left the engine in 'proffie' here.
    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v2.2', hardwarePreview: true }));
    tick(engine, config);
    expect(engine.renderMode).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(true);
    expect(engine.lastRenderPath).toBe('template-eval');
  });

  it('returns to template-eval after a Proffie → Xenopixel → Proffie round trip', () => {
    const config = makeConfig();
    const engine = new BladeEngine();
    const apply = (boardId: string) =>
      applyEngineRenderPlan(engine, planEngineRender(config, { boardId, hardwarePreview: true }));

    apply('proffie-v3.9');
    engine.ignite(config);
    tick(engine, config, 30);
    expect(engine.lastRenderPath).toBe('template-eval');

    apply('xenopixel');
    tick(engine, config);
    expect(engine.lastRenderPath).toBe('xenopixel');

    apply('proffie-v3.9');
    tick(engine, config);
    expect(engine.lastRenderPath).toBe('template-eval');
  });

  it('follows the HW toggle both ways', () => {
    const config = makeConfig();
    const engine = new BladeEngine();
    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: true }));
    engine.ignite(config);
    tick(engine, config, 30);
    expect(engine.lastRenderPath).toBe('template-eval');

    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: false }));
    tick(engine, config);
    expect(engine.lastRenderPath).toBe('parameter');
    expect(engine.hasPreviewTemplate).toBe(false);

    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: true }));
    tick(engine, config);
    expect(engine.lastRenderPath).toBe('template-eval');
  });

  it('re-applying an unchanged plan keeps template state (a held lockup survives)', () => {
    const config = makeConfig({ baseColor: { r: 0, g: 0, b: 255 }, lockupColor: { r: 255, g: 0, b: 0 } });
    const engine = new BladeEngine();
    const plan = () => planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: true });
    applyEngineRenderPlan(engine, plan());
    engine.ignite(config);
    tick(engine, config, 30);
    engine.triggerEffect('lockup', { position: 0.5 });
    tick(engine, config, 4);
    const redWhileHeld = engine.getPixels()[0]!;
    expect(redWhileHeld).toBeGreaterThan(100);

    applyEngineRenderPlan(engine, plan()); // e.g. a board switch between Proffie boards
    tick(engine, config, 4);
    expect(engine.getPixels()[0]!).toBeGreaterThan(100);
  });

  it('uses imported raw code instead of a preview template', () => {
    const importedRawCode = 'StylePtr<Layers<Rgb<255,0,0>,InOutTrL<TrWipe<300>,TrWipeIn<500>>>>()';
    const config = makeConfig({ importedRawCode });
    const engine = new BladeEngine();
    applyEngineRenderPlan(engine, planEngineRender(config, { boardId: 'proffie-v3.9', hardwarePreview: false }));
    engine.ignite(config);
    tick(engine, config, 30);
    expect(engine.lastRenderPath).toBe('template-eval');
    expect(engine.hasPreviewTemplate).toBe(false);
    const px = engine.getPixels();
    expect([px[0], px[1], px[2]]).toEqual([255, 0, 0]);
  });
});
