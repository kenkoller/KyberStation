// @vitest-environment jsdom
//
// ─── Regression: blade-canvas white-out (P0 — fix/blade-canvas-render-loop-regression) ─
//
// Symptom that landed this test: loading any preset OR clicking Surprise Me
// produced a blade canvas filled with pure white (255, 255, 255) regardless
// of the configured colours. The FPS counter appeared stuck at 0 because
// every frame produced an identical pixel buffer, making the canvas paint
// loop look frozen even though it was firing.
//
// Root cause: `InOutTrLTemplate.getColor` in `@kyberstation/template-eval`
// returned `{255, 255, 255}` for the "blade is on and stable" branch,
// intending to encode "alpha = 255 = blade fully visible". But the `Layers`
// compositor blends each upper-layer's colour onto the base with
// `alphaBlend(base, layer, alpha)` where `alpha = max(r,g,b)`. With a WHITE
// layer + alpha 255, the formula reduces to pure WHITE for every LED.
// Because the codegen wraps every preset in `Layers<base, ..., InOutTrL>`,
// every preset got white-washed the moment the ignition transition latched
// (which happens on frame 0 — `TrWipeIn` returns PROFFIE_MAX for tip LEDs
// immediately, flipping `isIgniting=false` for the stable-on branch to
// take over).
//
// The trigger was the combination of:
//   • PR #285 (2026-05-10) — Hardware Preview enabled by default
//   • PR #352 (2026-05-16) — BladeEngine.renderMode default flipped to
//     'template-eval'
// Together those two PRs put the codegen → template-eval → pixel buffer
// path on the critical render loop for every preset every frame.
//
// The fix lives in
// `packages/template-eval/src/templates/wrappers.ts` (`InOutTrLTemplate`):
// the per-frame contribution is now BLACK (colorAlpha = 0 → Layers skips
// the blend), since the visible ignition/retraction wipe is owned by
// BladeCanvas via `engine.extendProgress`.
//
// This test exercises the same pipeline the live editor uses — generate
// ProffieOS code for a normal config, set up Hardware Preview, ignite,
// tick — and asserts the resulting pixel buffer reflects the configured
// base colour, not pure white. It is intentionally placed in the web
// package because it needs both @kyberstation/codegen and
// @kyberstation/engine, which the engine package cannot import (cycle).

import { describe, it, expect } from 'vitest';
import { BladeEngine } from '@kyberstation/engine';
import { generateStyleCode } from '@kyberstation/codegen';
import type { BladeConfig } from '@kyberstation/engine';

function makeConfig(overrides: Partial<BladeConfig> = {}): BladeConfig {
  return {
    name: 'Regression-Test',
    baseColor: { r: 22, g: 114, b: 243 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.07,
    // 132 matches the engine's DEFAULT_TOPOLOGY so we don't have to
    // explicitly resize.
    ledCount: 132,
    ...overrides,
  } as BladeConfig;
}

describe('BladeCanvas white-out regression — codegen → template-eval → pixels', () => {
  it('renders the configured BLUE base color (not WHITE) after the ignition transient', () => {
    const config = makeConfig({
      baseColor: { r: 22, g: 114, b: 243 },
    });
    const code = generateStyleCode(config, { comments: false });

    const engine = new BladeEngine();
    // The web layer (useHardwarePreview + useBladeEngine) flips into
    // template-eval mode and primes the preview template before the
    // first frame. Replicate that here.
    engine.setRenderMode('template-eval');
    engine.setPreviewTemplate(code);
    engine.ignite(config);

    // Tick well past the 320 ms ignition window so the engine reaches a
    // stable-on state — that's where the bug manifested.
    for (let i = 0; i < 30; i++) engine.update(16, config);

    const pixels = engine.getPixels();
    expect(pixels.length).toBeGreaterThan(0);

    // ── Assertion 1: not ALL LEDs are pure white ──
    // Pre-fix every LED was (255, 255, 255). Allow a small tolerance for
    // AudioFlicker's per-LED flicker — but the base is bright BLUE
    // (22, 114, 243), so the dominant colour cannot legitimately be
    // near-white.
    const sampleCount = Math.min(20, Math.floor(pixels.length / 3));
    let whiteish = 0;
    for (let i = 0; i < sampleCount; i++) {
      const r = pixels[i * 3] ?? 0;
      const g = pixels[i * 3 + 1] ?? 0;
      const b = pixels[i * 3 + 2] ?? 0;
      if (r >= 245 && g >= 245 && b >= 245) whiteish++;
    }
    // < 25 % of the sample is whiteish under normal AudioFlicker; pre-fix
    // this ratio was 100 %.
    expect(whiteish).toBeLessThan(sampleCount / 4);

    // ── Assertion 2: at least one LED rendered near the base BLUE ──
    // The flicker mix usually nudges a few LEDs toward the lighter
    // sibling colour, but the dominant rest must read as the configured
    // base.
    let bluishLeds = 0;
    for (let i = 0; i < sampleCount; i++) {
      const r = pixels[i * 3] ?? 0;
      const g = pixels[i * 3 + 1] ?? 0;
      const b = pixels[i * 3 + 2] ?? 0;
      if (
        Math.abs(r - 22) <= 30 &&
        Math.abs(g - 114) <= 30 &&
        Math.abs(b - 243) <= 30
      ) {
        bluishLeds++;
      }
    }
    expect(bluishLeds).toBeGreaterThan(0);
  });

  it('paint loop animates (per-frame buffer is not stuck on one colour)', () => {
    // The bug also presented as "FPS counter shows 0" — every frame
    // produced an identical white buffer so the canvas looked frozen.
    // Asserting per-frame variance catches the regression even if it
    // re-emerges with a different colour stuck. AudioFlicker is the base
    // wrapped around `Rgb<22,114,243>`, so we expect at least a handful
    // of distinct (r, g, b) tuples for LED 0 across 30 frames.
    const config = makeConfig();
    const code = generateStyleCode(config, { comments: false });
    const engine = new BladeEngine();
    engine.setRenderMode('template-eval');
    engine.setPreviewTemplate(code);
    engine.ignite(config);

    const triples = new Set<string>();
    for (let i = 0; i < 30; i++) {
      engine.update(16, config);
      const pixels = engine.getPixels();
      triples.add(`${pixels[0]},${pixels[1]},${pixels[2]}`);
    }
    // Pre-fix every frame produced (255, 255, 255) → triples.size === 1.
    expect(triples.size).toBeGreaterThan(1);
  });

  it('keeps the configured base color stable for distinct base RGBs (red, green, purple)', () => {
    // Spot-check that the fix is colour-independent. Pre-fix every base
    // produced pure white; post-fix each base produces a buffer whose
    // dominant channel matches the configured colour.
    const cases: Array<{ rgb: { r: number; g: number; b: number }; dominant: 'r' | 'g' | 'b' }> = [
      { rgb: { r: 220, g: 30, b: 30 }, dominant: 'r' },
      { rgb: { r: 30, g: 220, b: 60 }, dominant: 'g' },
      { rgb: { r: 130, g: 30, b: 220 }, dominant: 'b' },
    ];

    for (const { rgb, dominant } of cases) {
      const config = makeConfig({ baseColor: rgb });
      const code = generateStyleCode(config, { comments: false });
      const engine = new BladeEngine();
      engine.setRenderMode('template-eval');
      engine.setPreviewTemplate(code);
      engine.ignite(config);
      for (let i = 0; i < 30; i++) engine.update(16, config);

      const pixels = engine.getPixels();
      const sampleCount = Math.min(20, Math.floor(pixels.length / 3));

      // Count LEDs whose dominant channel matches the configured base.
      let onColour = 0;
      for (let i = 0; i < sampleCount; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        const max = Math.max(r, g, b);
        if (dominant === 'r' && r === max && r > g + 10 && r > b + 10) onColour++;
        if (dominant === 'g' && g === max && g > r + 10 && g > b + 10) onColour++;
        if (dominant === 'b' && b === max && b > r + 10 && b > g + 10) onColour++;
      }
      // Most LEDs should be the configured hue; allow ~25 % flicker drift.
      expect(onColour).toBeGreaterThan(sampleCount * 0.5);
    }
  });
});
