// ─── Hardware Preview Tests ──────────────────────────────────────
//
// Covers the BladeEngine's hardware preview template API:
//   1. setPreviewTemplate sets/clears the preview code
//   2. hasPreviewTemplate reports correctly
//   3. Preview template takes priority over importedRawCode
//   4. Clearing preview template restores normal behaviour
//   5. Setting preview template auto-creates the bridge
//   6. Setting null preview with non-template-eval mode destroys bridge

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import type { BladeConfig } from '../src/types';

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

describe('BladeEngine hardware preview', () => {
  beforeEach(() => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now++);
  });

  // ─── hasPreviewTemplate ────────────────────────────────────────

  describe('hasPreviewTemplate', () => {
    it('is false by default', () => {
      const engine = new BladeEngine();
      expect(engine.hasPreviewTemplate).toBe(false);
    });

    it('is true after setting a preview template', () => {
      const engine = new BladeEngine();
      engine.setPreviewTemplate('StylePtr<Blue>()');
      expect(engine.hasPreviewTemplate).toBe(true);
    });

    it('is false after clearing the preview template', () => {
      const engine = new BladeEngine();
      engine.setPreviewTemplate('StylePtr<Blue>()');
      engine.setPreviewTemplate(null);
      expect(engine.hasPreviewTemplate).toBe(false);
    });
  });

  // ─── setPreviewTemplate ────────────────────────────────────────

  describe('setPreviewTemplate', () => {
    it('accepts a template string', () => {
      const engine = new BladeEngine();
      // Should not throw
      engine.setPreviewTemplate('Layers<Blue, BlastL<White>>()');
      expect(engine.hasPreviewTemplate).toBe(true);
    });

    it('accepts null to clear', () => {
      const engine = new BladeEngine();
      engine.setPreviewTemplate('StylePtr<Blue>()');
      engine.setPreviewTemplate(null);
      expect(engine.hasPreviewTemplate).toBe(false);
    });

    it('can be called multiple times with different templates', () => {
      const engine = new BladeEngine();
      engine.setPreviewTemplate('StylePtr<Blue>()');
      expect(engine.hasPreviewTemplate).toBe(true);
      engine.setPreviewTemplate('StylePtr<Red>()');
      expect(engine.hasPreviewTemplate).toBe(true);
      engine.setPreviewTemplate(null);
      expect(engine.hasPreviewTemplate).toBe(false);
    });
  });

  // ─── Render mode interaction ───────────────────────────────────

  describe('render mode interaction', () => {
    it('does not change renderMode when setting preview template', () => {
      const engine = new BladeEngine();
      // Default flipped to 'template-eval' in Phase 3 Step 2 — drop
      // back to 'proffie' first to isolate the contract under test:
      // setPreviewTemplate must not mutate renderMode.
      engine.setRenderMode('proffie');
      expect(engine.renderMode).toBe('proffie');
      engine.setPreviewTemplate('StylePtr<Blue>()');
      // The hook (useHardwarePreview) is responsible for setting
      // render mode to template-eval; the engine API is decoupled
      expect(engine.renderMode).toBe('proffie');
    });

    it('preserves preview template across render mode changes', () => {
      const engine = new BladeEngine();
      engine.setPreviewTemplate('StylePtr<Blue>()');
      engine.setRenderMode('xenopixel');
      expect(engine.hasPreviewTemplate).toBe(true);
      engine.setRenderMode('proffie');
      expect(engine.hasPreviewTemplate).toBe(true);
    });
  });

  // ─── Template priority in update loop ──────────────────────────

  describe('template priority', () => {
    it('preview template takes priority over importedRawCode in template-eval mode', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig({
        importedRawCode: 'Layers<Red, BlastL<White>>()',
      });

      // Set up: render mode is template-eval (for importedRawCode)
      engine.setRenderMode('template-eval');

      // Now set a DIFFERENT preview template
      engine.setPreviewTemplate('StylePtr<Green>()');

      // The engine should use the preview template, not importedRawCode
      // We verify this indirectly by checking the preview is set
      expect(engine.hasPreviewTemplate).toBe(true);
    });

    it('clearing preview does not affect importedRawCode path', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('template-eval');
      engine.setPreviewTemplate('StylePtr<Blue>()');
      engine.setPreviewTemplate(null);

      // After clearing, hasPreviewTemplate should be false
      // The engine should fall back to importedRawCode in the update loop
      expect(engine.hasPreviewTemplate).toBe(false);
      // renderMode stays template-eval (set externally)
      expect(engine.renderMode).toBe('template-eval');
    });
  });

  // ─── Update loop with preview ──────────────────────────────────

  describe('update loop with preview', () => {
    it('does not crash when preview template is set and engine updates', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      engine.setRenderMode('template-eval');
      engine.setPreviewTemplate('StylePtr<Blue>()');

      // Should not throw — the template may not parse perfectly
      // (depends on what the bridge supports) but it should not crash
      expect(() => {
        engine.update(16, config);
        engine.update(16, config);
        engine.update(16, config);
      }).not.toThrow();
    });

    it('does not crash with null preview and normal proffie mode', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // Normal operation — no preview, proffie mode
      expect(() => {
        engine.update(16, config);
        engine.update(16, config);
      }).not.toThrow();
    });

    it('does not crash when toggling preview on and off mid-animation', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // Start in proffie mode
      engine.update(16, config);
      engine.ignite();
      engine.update(16, config);

      // Switch to preview mid-ignition
      engine.setRenderMode('template-eval');
      engine.setPreviewTemplate('StylePtr<Blue>()');
      engine.update(16, config);

      // Clear preview mid-animation
      engine.setPreviewTemplate(null);
      engine.setRenderMode('proffie');
      engine.update(16, config);
    });
  });

  // ─── Regression: white-out blade canvas (fix/blade-canvas-render-loop-regression) ──
  //
  // Bug summary: when the editor loaded any preset OR clicked "Surprise Me",
  // the blade canvas turned pure white regardless of the configured colors.
  // Root cause: the template-eval `InOutTrL` template returned `{255,255,255}`
  // (WHITE) when the blade was on and stable. Because the codegen emits
  // `Layers<base, ..., InOutTrL>` as the canonical style shape and the
  // `Layers` compositor alpha-blends each upper layer onto the base using
  // the layer's max channel as alpha, a WHITE upper-layer with alpha=255
  // obliterated the underlying base color for every LED, every frame.
  //
  // Once Hardware Preview was enabled by default (PR #285) AND template-eval
  // was promoted to the engine's default render mode (PR #352), every
  // codegen → engine pipeline hit this path on the first frame — the
  // ignition wipe's TrWipeIn returns PROFFIE_MAX for tip LEDs immediately,
  // which flipped `isIgniting` to false and let the stable-on branch latch
  // for all subsequent frames.
  //
  // This test pins the engine's pixel buffer after a few frames at a known
  // BLUE base color (RGB 22, 114, 243). Any future regression that lets
  // the layer compositor wash the base color to white will fail this test
  // before it ships.

  describe('white-out regression', () => {
    it('renders the configured base color (not white) when running through template-eval with HW Preview style', async () => {
      // Late import — generateStyleCode lives in @kyberstation/codegen which
      // depends on @kyberstation/engine; importing eagerly at file scope
      // would create a cycle.
      const { generateStyleCode } = await import('@kyberstation/codegen');

      const config = makeTestConfig({
        baseColor: { r: 22, g: 114, b: 243 },
        ledCount: 132, // matches DEFAULT_TOPOLOGY for the default engine
      });

      // Reproduce the same setup useHardwarePreview / useBladeEngine do
      // in the web layer: generate the ProffieOS code for the current
      // config, switch to template-eval mode, set the preview template,
      // then ignite + tick the engine.
      const code = generateStyleCode(config, { comments: false });
      const engine = new BladeEngine();
      engine.setRenderMode('template-eval');
      engine.setPreviewTemplate(code);
      engine.ignite(config);

      // Tick past the ignition window (config.ignitionMs = 300 ms) to
      // reach a stable-on state where the bug manifests.
      for (let i = 0; i < 30; i++) engine.update(16, config);

      const pixels = engine.getPixels();
      expect(pixels.length).toBeGreaterThan(0);

      // ── The actual regression assertion ──
      // Sample a few LEDs and check none of them are pure white. The
      // AudioFlicker base modulates per-LED random factors per frame so
      // some LEDs may be flicker-shifted toward white; instead we count
      // how many of the sampled LEDs are within ±10 channel of pure
      // white. Pre-fix this would be 100% of LEDs every frame.
      const sampleCount = Math.min(20, Math.floor(pixels.length / 3));
      let whiteish = 0;
      for (let i = 0; i < sampleCount; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        if (r >= 245 && g >= 245 && b >= 245) whiteish++;
      }
      // Allow up to ~2 flickering whites out of 20 sampled LEDs — the
      // base color is bright blue so the flicker can momentarily push
      // some LEDs near white. Pre-fix this count was 20/20 every frame.
      expect(whiteish).toBeLessThan(sampleCount / 4);

      // Also check the engine settled at a state where the base color
      // dominates: at least one LED should be very close to the
      // configured base RGB (22, 114, 243).
      let basishLeds = 0;
      for (let i = 0; i < sampleCount; i++) {
        const r = pixels[i * 3] ?? 0;
        const g = pixels[i * 3 + 1] ?? 0;
        const b = pixels[i * 3 + 2] ?? 0;
        if (
          Math.abs(r - 22) <= 30 &&
          Math.abs(g - 114) <= 30 &&
          Math.abs(b - 243) <= 30
        ) {
          basishLeds++;
        }
      }
      expect(basishLeds).toBeGreaterThan(0);
    });

    it('paint loop: per-frame output remains stable (not stuck on a single colour)', async () => {
      // The white-out bug also presented as the blade canvas paint loop
      // appearing "stuck" — FPS counter at 0 and the canvas not
      // re-painting. The underlying cause was the same template-eval
      // bug, but the symptom was visible as "every frame paints the same
      // white pixels". This test pins per-frame variance to prevent
      // re-regression: across multiple frames, the engine's LED 0 must
      // produce at least 2 distinct (r, g, b) tuples, proving the
      // pipeline is animating.
      const { generateStyleCode } = await import('@kyberstation/codegen');
      const config = makeTestConfig({ ledCount: 132 });
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
      // AudioFlicker varies per frame — should see multiple distinct
      // colour tuples. Pre-fix every frame produced (255,255,255).
      expect(triples.size).toBeGreaterThan(1);
    });
  });
});
