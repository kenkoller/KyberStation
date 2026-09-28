// ─── deliverability framework tests ───────────────────────────────────
//
// The deliverability function is the single source of truth for what
// transfers from editor to saber. Tests pin (a) the table values per
// target so silent regressions can't sneak past, (b) the summary
// formatter, and (c) the customizedKnobs detector.

import { describe, it, expect } from 'vitest';
import {
  customizedKnobs,
  getDeliverability,
  getBundleDeliverability,
  getRuntimeFidelityBadge,
  humanizeKnob,
} from '@/lib/deliverability';
import type { BladeConfig } from '@kyberstation/engine';

function defaultConfig(): BladeConfig {
  return {
    baseColor: { r: 0, g: 140, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 220, b: 80 },
    blastColor: { r: 255, g: 255, b: 255 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 300,
    retractionMs: 800,
    shimmer: 0,
    ledCount: 144,
  };
}

describe('customizedKnobs', () => {
  it('returns an empty set when config matches the default baseline', () => {
    expect(customizedKnobs(defaultConfig()).size).toBe(0);
  });

  it('detects a custom base color', () => {
    const c = defaultConfig();
    c.baseColor = { r: 255, g: 0, b: 128 };
    expect(customizedKnobs(c).has('baseColor')).toBe(true);
    expect(customizedKnobs(c).size).toBe(1);
  });

  it('detects multiple customized knobs', () => {
    const c = defaultConfig();
    c.baseColor = { r: 255, g: 0, b: 0 };
    c.style = 'fire';
    c.ignitionMs = 100;
    const knobs = customizedKnobs(c);
    expect(knobs.has('baseColor')).toBe(true);
    expect(knobs.has('style')).toBe(true);
    expect(knobs.has('ignitionMs')).toBe(true);
    expect(knobs.size).toBe(3);
  });

  it('detects modulation bindings as customization', () => {
    const c = defaultConfig() as BladeConfig & { modulation?: unknown };
    (c as { modulation: unknown }).modulation = {
      bindings: [{ id: 'b1', source: 'swing', target: 'hue', amount: 1 }],
    };
    expect(customizedKnobs(c).has('modulation')).toBe(true);
  });
});

describe('getDeliverability — proffie_runtime (Phase A)', () => {
  it('reports name + font + track + order + variation as deliverable', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    for (const knob of ['presetName', 'fontName', 'trackFile', 'presetOrder', 'variation'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('deliverable');
    }
  });

  it('reports every BladeConfig design knob as dropped-silently', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    for (const knob of ['baseColor', 'clashColor', 'lockupColor', 'blastColor', 'style', 'ignition', 'ignitionMs', 'retraction', 'retractionMs', 'shimmer', 'modulation'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('dropped-silently');
    }
  });

  it('overall is "partial" because some knobs drop', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    expect(report.overall).toBe('partial');
  });

  it('summary lists the customized-dropped knobs in plain English', () => {
    const c = defaultConfig();
    c.baseColor = { r: 255, g: 0, b: 0 };
    c.ignitionMs = 100;
    const report = getDeliverability(c, 'proffie_runtime');
    expect(report.summary).toContain('base color');
    expect(report.summary).toContain('ignition timing');
    expect(report.summary).toContain('NOT transfer');
  });

  it('summary is neutral when nothing customized', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    expect(report.summary).toMatch(/not customized any of the dropped knobs/i);
  });

  it('reason text names the custom-styles option (in plain language) as the lift path for color knobs', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    const baseColor = report.knobs.find((k) => k.knob === 'baseColor');
    expect(baseColor?.reason).toMatch(/Use my colors and blade style/);
    expect(baseColor?.reason).not.toMatch(/phase [ac]/i);
  });

  it('explains the factory-slot position indexing', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    const style = report.knobs.find((k) => k.knob === 'style');
    expect(style?.reason).toMatch(/same list position/);
  });
});

describe('getDeliverability — proffie_runtime Phase C (advanced verb)', () => {
  it('lifts color knobs from dropped to deliverable when runtimeUseAdvancedVerb=true', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    // Bench-verified 2026-05-16: with 16-bit RGB scaling fix in
    // ProffieRuntimeEmitter (× 257), Phase C renders at factory-equivalent
    // brightness. Colors fully transfer.
    for (const knob of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('deliverable');
    }
  });

  it('lifts ignitionMs + retractionMs from dropped to deliverable', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    const ignitionMs = report.knobs.find((k) => k.knob === 'ignitionMs');
    const retractionMs = report.knobs.find((k) => k.knob === 'retractionMs');
    expect(ignitionMs?.capability).toBe('deliverable');
    expect(retractionMs?.capability).toBe('deliverable');
  });

  it('keeps ignition + retraction animation type dropped (runtime verbs have fixed shapes)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    for (const knob of ['ignition', 'retraction'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('dropped-silently');
    }
  });

  it('a stable blade maps faithfully, so blade style transfers', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    const style = report.knobs.find((k) => k.knob === 'style');
    expect(style?.capability).toBe('deliverable');
  });

  it('rationale mentions DISABLE_BASIC_PARSER_STYLES caveat for color knobs', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    const baseColor = report.knobs.find((k) => k.knob === 'baseColor');
    expect(baseColor?.reason).toMatch(/DISABLE_BASIC_PARSER_STYLES/);
  });

  it('Phase A behavior preserved when runtimeUseAdvancedVerb=false', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: false,
    });
    const baseColor = report.knobs.find((k) => k.knob === 'baseColor');
    expect(baseColor?.capability).toBe('dropped-silently');
  });

  it('Phase A is the default (no ctx)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    const baseColor = report.knobs.find((k) => k.knob === 'baseColor');
    expect(baseColor?.capability).toBe('dropped-silently');
  });
});

describe('getDeliverability — cfx + golden_harvest (design-reference)', () => {
  it('cfx overall is "design-only"', () => {
    const report = getDeliverability(defaultConfig(), 'cfx');
    expect(report.overall).toBe('design-only');
  });

  it('golden_harvest overall is "design-only"', () => {
    const report = getDeliverability(defaultConfig(), 'golden_harvest');
    expect(report.overall).toBe('design-only');
  });

  it('every knob is design-reference', () => {
    const report = getDeliverability(defaultConfig(), 'cfx');
    for (const entry of report.knobs) {
      expect(entry.capability).toBe('design-reference');
    }
  });

  it('summary says KyberStation cannot write flashable firmware', () => {
    const report = getDeliverability(defaultConfig(), 'cfx');
    expect(report.summary).toMatch(/cannot write flashable firmware/i);
  });
});

describe('getDeliverability — proffie (compile+flash)', () => {
  it('overall is "partial" because style + modulation are partial', () => {
    const report = getDeliverability(defaultConfig(), 'proffie');
    expect(report.overall).toBe('partial');
  });

  it('colors + timing are deliverable', () => {
    const report = getDeliverability(defaultConfig(), 'proffie');
    for (const knob of ['baseColor', 'clashColor', 'lockupColor', 'blastColor', 'ignitionMs', 'retractionMs'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('deliverable');
    }
  });

  it('shimmer is honestly reported as dropped (ASTBuilder never reads config.shimmer)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie');
    const shimmer = report.knobs.find((k) => k.knob === 'shimmer');
    expect(shimmer?.capability).toBe('dropped-silently');
    expect(shimmer?.reason).toMatch(/does not read the shimmer value/);
    expect(shimmer?.reason).not.toMatch(/emitted as AudioFlicker/i);
  });

  it('a customized shimmer shows up in the summary as not transferring', () => {
    const c = defaultConfig();
    c.shimmer = 0.3;
    expect(getDeliverability(c, 'proffie').summary).toMatch(/shimmer will NOT transfer/);
  });

  it('style is "partial" (engine parity gap)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie');
    const style = report.knobs.find((k) => k.knob === 'style');
    expect(style?.capability).toBe('partial');
  });

  it('modulation is "partial" (composer + snapshot fallback)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie');
    const mod = report.knobs.find((k) => k.knob === 'modulation');
    expect(mod?.capability).toBe('partial');
  });
});

describe('getDeliverability — xenopixel', () => {
  it('overall is "partial"', () => {
    const report = getDeliverability(defaultConfig(), 'xenopixel');
    expect(report.overall).toBe('partial');
  });

  it('baseColor + ignitionMs + retractionMs are deliverable', () => {
    const report = getDeliverability(defaultConfig(), 'xenopixel');
    for (const knob of ['baseColor', 'ignitionMs', 'retractionMs'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('deliverable');
    }
  });

  it('clashColor + lockupColor + blastColor are dropped', () => {
    const report = getDeliverability(defaultConfig(), 'xenopixel');
    for (const knob of ['clashColor', 'lockupColor', 'blastColor'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('dropped-silently');
    }
  });
});

describe('getDeliverability — proffie_runtime custom styles follow the mapped verb', () => {
  const custom = { runtimeUseAdvancedVerb: true };
  const knob = (c: BladeConfig, k: string) =>
    getDeliverability(c, 'proffie_runtime', custom).knobs.find((e) => e.knob === k)!;

  it('unstable verb: style faithful, effect colors fixed (white clash/blast, fixed lockup)', () => {
    const c = { ...defaultConfig(), style: 'unstable' };
    expect(knob(c, 'style').capability).toBe('deliverable');
    for (const k of ['clashColor', 'blastColor', 'lockupColor']) {
      expect(knob(c, k).capability).toBe('dropped-silently');
    }
    expect(knob(c, 'clashColor').reason).toMatch(/clashes flash white/);
    expect(knob(c, 'ignitionMs').capability).toBe('deliverable');
  });

  it('fire verb: no ignition/retraction timing slots', () => {
    const c = { ...defaultConfig(), style: 'fire' };
    expect(knob(c, 'ignitionMs').capability).toBe('dropped-silently');
    expect(knob(c, 'retractionMs').reason).toMatch(/heats up/);
  });

  it('cycle verb (pulse): style partial, blast + lockup carried, clash fixed white', () => {
    const c = { ...defaultConfig(), style: 'pulse' };
    expect(knob(c, 'style').capability).toBe('partial');
    expect(knob(c, 'style').reason).toMatch(/audio-reactive/i);
    expect(knob(c, 'blastColor').capability).toBe('deliverable');
    expect(knob(c, 'lockupColor').capability).toBe('deliverable');
    expect(knob(c, 'clashColor').capability).toBe('dropped-silently');
    expect(knob(c, 'ignitionMs').capability).toBe('dropped-silently');
  });

  it('rainbow verb (prism): base color is partial, not a false "dropped" warning', () => {
    const c = { ...defaultConfig(), style: 'prism' };
    expect(knob(c, 'baseColor').capability).toBe('partial');
    expect(knob(c, 'style').capability).toBe('deliverable');
  });

  it('colors-only styles drop the blade style and say it needs a firmware flash', () => {
    const c = { ...defaultConfig(), style: 'helix' };
    expect(knob(c, 'style').capability).toBe('dropped-silently');
    expect(knob(c, 'style').reason).toMatch(/firmware flash/);
    expect(knob(c, 'baseColor').capability).toBe('deliverable');
  });
});

describe('getBundleDeliverability', () => {
  it('single preset matches getDeliverability', () => {
    const c = defaultConfig();
    expect(getBundleDeliverability([c], 'proffie')).toEqual(getDeliverability(c, 'proffie'));
  });

  it('empty bundle falls back to a default config instead of throwing', () => {
    const report = getBundleDeliverability([], 'proffie_runtime');
    expect(report.knobs).toHaveLength(16);
  });

  it('reports the worst capability per knob and says how many presets it applies to', () => {
    const stable = defaultConfig();
    const unstable = { ...defaultConfig(), style: 'unstable' };
    const report = getBundleDeliverability([stable, unstable], 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    const clash = report.knobs.find((k) => k.knob === 'clashColor')!;
    expect(clash.capability).toBe('dropped-silently');
    expect(clash.reason).toMatch(/^1 of 2 presets: /);
    const base = report.knobs.find((k) => k.knob === 'baseColor')!;
    expect(base.capability).toBe('deliverable');
    expect(base.reason).not.toMatch(/of 2 presets/);
  });

  it('summary lists knobs customized in any preset that some preset drops', () => {
    const plain = defaultConfig();
    const customClash = { ...defaultConfig(), style: 'unstable', clashColor: { r: 255, g: 0, b: 0 } };
    const report = getBundleDeliverability([plain, customClash], 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    expect(report.summary).toMatch(/clash color/);
  });
});

describe('describeRuntimeFidelity / getRuntimeFidelityBadge', () => {
  it('faithful → "Faithful · <verb> verb"', () => {
    const badge = getRuntimeFidelityBadge({ ...defaultConfig(), style: 'unstable' });
    expect(badge).toMatchObject({ label: 'Faithful · unstable verb', tone: 'ok' });
    expect(badge.detail.length).toBeGreaterThan(0);
  });

  it('approximate cycle → flags it as audio-reactive', () => {
    const badge = getRuntimeFidelityBadge({ ...defaultConfig(), style: 'aurora' });
    expect(badge).toMatchObject({ label: 'Approximate · cycle verb (audio-reactive)', tone: 'partial' });
  });

  it('colors-only → says the style needs a firmware flash', () => {
    const badge = getRuntimeFidelityBadge({ ...defaultConfig(), style: 'photon' });
    expect(badge).toMatchObject({ label: 'Colors only — this style needs a firmware flash', tone: 'warn' });
  });
});

describe('humanizeKnob', () => {
  it('returns lowercase human-friendly labels', () => {
    expect(humanizeKnob('baseColor')).toBe('base color');
    expect(humanizeKnob('ignitionMs')).toBe('ignition timing');
    expect(humanizeKnob('modulation')).toBe('modulation bindings');
  });
});
