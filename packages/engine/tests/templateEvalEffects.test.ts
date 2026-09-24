// ─── Template-eval effect forwarding ───
//
// The TemplateEvalBridge translates engine effect triggers into the
// ProffieOS events / lockup state a flashed saber would raise. Regression
// cover for the v0.23.x bug where `lockup` fired EFFECT_LOCKUP_BEGIN but
// never set the lockup TYPE — codegen's `LockupTrL<…, LOCKUP_NORMAL>`
// layers gate on the type, so lockup rendered nothing under the default
// (template-eval) render mode.

import { describe, it, expect } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import { EFFECT_REGISTRY } from '../src/effects/index';
import {
  ENGINE_EFFECT_TO_TEMPLATE,
  TemplateEvalBridge,
} from '../src/templateEval/TemplateEvalBridge';
import type { BladeConfig, EffectType } from '../src/types';

const ALL_ENGINE_EFFECTS = Object.keys(EFFECT_REGISTRY) as EffectType[];

describe('ENGINE_EFFECT_TO_TEMPLATE', () => {
  it('classifies every engine effect type (mapped or explicitly unmapped)', () => {
    expect(Object.keys(ENGINE_EFFECT_TO_TEMPLATE).sort()).toEqual(
      [...ALL_ENGINE_EFFECTS].sort(),
    );
  });

  it('maps the four sustained effects onto ProffieOS lockup types', () => {
    expect(ENGINE_EFFECT_TO_TEMPLATE.lockup).toMatchObject({
      kind: 'lockup', lockupType: 'LOCKUP_NORMAL',
      begin: 'EFFECT_LOCKUP_BEGIN', end: 'EFFECT_LOCKUP_END',
    });
    expect(ENGINE_EFFECT_TO_TEMPLATE.drag).toMatchObject({
      kind: 'lockup', lockupType: 'LOCKUP_DRAG',
      begin: 'EFFECT_DRAG_BEGIN', end: 'EFFECT_DRAG_END',
    });
    expect(ENGINE_EFFECT_TO_TEMPLATE.melt).toMatchObject({
      kind: 'lockup', lockupType: 'LOCKUP_MELT', begin: 'EFFECT_LOCKUP_BEGIN',
    });
    expect(ENGINE_EFFECT_TO_TEMPLATE.lightning).toMatchObject({
      kind: 'lockup', lockupType: 'LOCKUP_LIGHTNING_BLOCK', begin: 'EFFECT_LOCKUP_BEGIN',
    });
  });

  it('maps the one-shot ProffieOS events', () => {
    expect(ENGINE_EFFECT_TO_TEMPLATE.clash).toEqual({ kind: 'event', event: 'EFFECT_CLASH' });
    expect(ENGINE_EFFECT_TO_TEMPLATE.blast).toEqual({ kind: 'event', event: 'EFFECT_BLAST' });
    expect(ENGINE_EFFECT_TO_TEMPLATE.stab).toEqual({ kind: 'event', event: 'EFFECT_STAB' });
    expect(ENGINE_EFFECT_TO_TEMPLATE.force).toEqual({ kind: 'event', event: 'EFFECT_FORCE' });
    expect(ENGINE_EFFECT_TO_TEMPLATE.change).toEqual({ kind: 'event', event: 'EFFECT_CHANGE' });
  });
});

describe('TemplateEvalBridge lockup state', () => {
  it('sets and clears the lockup type for each sustained effect', () => {
    const cases: Array<[EffectType, string]> = [
      ['lockup', 'LOCKUP_NORMAL'],
      ['drag', 'LOCKUP_DRAG'],
      ['melt', 'LOCKUP_MELT'],
      ['lightning', 'LOCKUP_LIGHTNING_BLOCK'],
    ];
    for (const [effect, lockupType] of cases) {
      const bridge = new TemplateEvalBridge();
      expect(bridge.lockupType).toBe('LOCKUP_NONE');
      bridge.triggerEffect(effect, 0.5);
      expect(bridge.lockupType).toBe(lockupType);
      bridge.releaseEffect(effect);
      expect(bridge.lockupType).toBe('LOCKUP_NONE');
    }
  });

  it('releasing a different sustained effect does not end the held lockup', () => {
    const bridge = new TemplateEvalBridge();
    bridge.triggerEffect('lockup', 0.5);
    bridge.releaseEffect('melt');
    expect(bridge.lockupType).toBe('LOCKUP_NORMAL');
  });

  it('a new lockup type replaces the held one (single lockup at a time)', () => {
    const bridge = new TemplateEvalBridge();
    bridge.triggerEffect('lockup', 0.5);
    bridge.triggerEffect('drag', 0.9);
    expect(bridge.lockupType).toBe('LOCKUP_DRAG');
    bridge.releaseEffect('lockup');
    expect(bridge.lockupType).toBe('LOCKUP_DRAG');
    bridge.releaseEffect('drag');
    expect(bridge.lockupType).toBe('LOCKUP_NONE');
  });

  it('ignores engine-only effects with no ProffieOS equivalent', () => {
    const bridge = new TemplateEvalBridge();
    expect(() => bridge.triggerEffect('shockwave', 0.5)).not.toThrow();
    expect(bridge.lockupType).toBe('LOCKUP_NONE');
  });
});

// ─── End-to-end through BladeEngine ───

// Hand-written mirror of the codegen output for a stable blue preset
// (the engine package cannot import @kyberstation/codegen — cycle). The
// apps/web differential suite covers the real codegen output for every
// preset.
const CODEGEN_SHAPED = `StylePtr<Layers<
  Rgb<0,0,255>,
  BlastL<Rgb<255,255,255>>,
  SimpleClashL<Rgb<255,255,255>,40>,
  LockupTrL<AudioFlickerL<Rgb<255,200,0>>,TrInstant,TrFade<300>,SaberBase::LOCKUP_NORMAL>,
  LockupTrL<AudioFlickerL<Rgb<255,150,0>>,TrInstant,TrFade<400>,SaberBase::LOCKUP_DRAG>,
  LockupTrL<Stripes<3000,-3500,Rgb<100,100,255>,White,Rgb<50,50,200>>,TrInstant,TrFade<500>,SaberBase::LOCKUP_LIGHTNING_BLOCK>,
  LockupTrL<Mix<SmoothStep<Int<26000>,Int<4000>>,Black,Mix<NoisySoundLevel,Rgb<255,200,0>,White>>,TrInstant,TrFade<500>,SaberBase::LOCKUP_MELT>,
  InOutTrL<TrWipe<300>,TrWipeIn<500>>
>>()`;

function makeConfig(): BladeConfig {
  return {
    baseColor: { r: 0, g: 0, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 200, b: 0 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 500,
    shimmer: 0,
    ledCount: 132,
  };
}

function meanRed(engine: BladeEngine): number {
  const buf = engine.getPixels();
  let r = 0;
  for (let i = 0; i < buf.length; i += 3) r += buf[i]!;
  return r / (buf.length / 3);
}

function tick(engine: BladeEngine, config: BladeConfig, frames: number, dt = 16): void {
  for (let i = 0; i < frames; i++) engine.update(dt, config);
}

describe('BladeEngine lockup under template-eval', () => {
  it('lockup visibly changes the blade, and release fades it back', () => {
    const config = makeConfig();
    const engine = new BladeEngine();
    engine.setPreviewTemplate(CODEGEN_SHAPED);
    engine.ignite(config);
    tick(engine, config, 40);
    expect(engine.state).toBe('on');
    // Base is pure blue — no red anywhere.
    expect(meanRed(engine)).toBe(0);

    engine.triggerEffect('lockup', { position: 0.5 });
    tick(engine, config, 6);
    expect(meanRed(engine)).toBeGreaterThan(20);

    engine.releaseEffect('lockup');
    tick(engine, config, 30); // 480 ms > TrFade<300>
    expect(meanRed(engine)).toBe(0);
  });

  it('each sustained effect lights its own lockup layer', () => {
    for (const effect of ['drag', 'melt', 'lightning'] as const) {
      const config = makeConfig();
      const engine = new BladeEngine();
      engine.setPreviewTemplate(CODEGEN_SHAPED);
      engine.ignite(config);
      tick(engine, config, 40);
      engine.triggerEffect(effect, { position: 0.5 });
      tick(engine, config, 6);
      expect(meanRed(engine), effect).toBeGreaterThan(0);
      engine.releaseEffect(effect);
      tick(engine, config, 40);
      expect(meanRed(engine), `${effect} released`).toBe(0);
    }
  });
});
