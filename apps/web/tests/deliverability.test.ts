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

  it('reason text references Phase C as the lift path for color knobs', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime');
    const baseColor = report.knobs.find((k) => k.knob === 'baseColor');
    expect(baseColor?.reason).toMatch(/phase c|custom styles/i);
  });
});

describe('getDeliverability — proffie_runtime Phase C (advanced verb)', () => {
  it('lifts color knobs from dropped to partial when runtimeUseAdvancedVerb=true', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    for (const knob of ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('partial');
    }
  });

  it('lifts ignitionMs + retractionMs from dropped to partial', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    const ignitionMs = report.knobs.find((k) => k.knob === 'ignitionMs');
    const retractionMs = report.knobs.find((k) => k.knob === 'retractionMs');
    expect(ignitionMs?.capability).toBe('partial');
    expect(retractionMs?.capability).toBe('partial');
  });

  it('keeps style + ignition + retraction animation type dropped (advanced verb has fixed template)', () => {
    const report = getDeliverability(defaultConfig(), 'proffie_runtime', {
      runtimeUseAdvancedVerb: true,
    });
    for (const knob of ['style', 'ignition', 'retraction'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('dropped-silently');
    }
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
    for (const knob of ['baseColor', 'clashColor', 'lockupColor', 'blastColor', 'ignitionMs', 'retractionMs', 'shimmer'] as const) {
      const entry = report.knobs.find((k) => k.knob === knob);
      expect(entry?.capability).toBe('deliverable');
    }
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

describe('humanizeKnob', () => {
  it('returns lowercase human-friendly labels', () => {
    expect(humanizeKnob('baseColor')).toBe('base color');
    expect(humanizeKnob('ignitionMs')).toBe('ignition timing');
    expect(humanizeKnob('modulation')).toBe('modulation bindings');
  });
});
