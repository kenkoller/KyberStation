// ─── Phase 3C: RenderMode Tests ─────────────────────────────────
//
// Covers the BladeEngine's board-aware rendering mode:
//   1. Default mode is proffie
//   2. setRenderMode() switches mode + clears caches
//   3. Xenopixel mode resolves styles from XENO_STYLE_REGISTRY
//   4. Xenopixel mode resolves ignitions from XENO_IGNITION_REGISTRY
//   5. Unknown xeno styles fall back to xeno-steady
//   6. Unknown xeno ignitions fall back to xeno-standard
//   7. Modulation routing is skipped in xenopixel mode
//   8. State machine (ignite/retract) works identically in both modes
//   9. Mode switch mid-ignition doesn't crash

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import { BladeState } from '../src/types';
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

function runFrames(engine: BladeEngine, config: BladeConfig, count: number, deltaMs = 16): void {
  for (let i = 0; i < count; i++) {
    engine.update(deltaMs, config);
  }
}

describe('BladeEngine renderMode', () => {
  beforeEach(() => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now++);
  });

  // ─── Default mode ──────────────────────────────────────────────

  describe('default mode', () => {
    it('defaults to proffie render mode', () => {
      const engine = new BladeEngine();
      expect(engine.renderMode).toBe('proffie');
    });
  });

  // ─── setRenderMode ─────────────────────────────────────────────

  describe('setRenderMode', () => {
    it('switches to xenopixel mode', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      expect(engine.renderMode).toBe('xenopixel');
    });

    it('switches back to proffie mode', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      engine.setRenderMode('proffie');
      expect(engine.renderMode).toBe('proffie');
    });

    it('is idempotent — same mode does not clear caches needlessly', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // Warm the cache by running a frame
      engine.ignite();
      runFrames(engine, config, 5);

      // Setting same mode should not disrupt
      engine.setRenderMode('proffie');
      expect(engine.renderMode).toBe('proffie');

      // Engine should still function
      runFrames(engine, config, 5);
      const buf = engine.leds.buffer;
      expect(buf.length).toBeGreaterThan(0);
    });
  });

  // ─── Xenopixel style resolution ────────────────────────────────

  describe('xenopixel style resolution', () => {
    it('renders without error using xeno-fire style', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'fire' });

      engine.ignite();
      // Run enough frames to complete ignition
      runFrames(engine, config, 30);

      const buf = engine.leds.buffer;
      // Should have non-zero pixel data (blade is on)
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });

    it('renders without error using xeno-rainbow style', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'rainbow' });

      engine.ignite();
      runFrames(engine, config, 30);

      const buf = engine.leds.buffer;
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });

    it('accepts xeno-prefixed style IDs directly', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'xeno-unstable' });

      engine.ignite();
      runFrames(engine, config, 30);

      const buf = engine.leds.buffer;
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });

    it('falls back to xeno-steady for unknown styles', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'totallyUnknownStyle' });

      engine.ignite();
      // Should not throw — falls back to steady blade
      runFrames(engine, config, 30);

      const buf = engine.leds.buffer;
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });

    it('renders all 8 xeno styles without error', () => {
      const xenoStyles = [
        'fire', 'steady', 'unstable', 'rainbow',
        'candy', 'roaming', 'pulse', 'flashing',
      ];

      for (const style of xenoStyles) {
        const engine = new BladeEngine();
        engine.setRenderMode('xenopixel');
        const config = makeTestConfig({ style });

        engine.ignite();
        expect(() => runFrames(engine, config, 20)).not.toThrow();
      }
    });
  });

  // ─── Xenopixel ignition resolution ─────────────────────────────

  describe('xenopixel ignition resolution', () => {
    it('ignites with xeno-standard ignition', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ ignition: 'standard' });

      engine.ignite();
      expect(engine.state).toBe(BladeState.IGNITING);

      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);
    });

    it('ignites with xeno-ghost ignition', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ ignition: 'ghost' });

      engine.ignite();
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);
    });

    it('ignites with xeno-prefixed ignition ID directly', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ ignition: 'xeno-blaster' });

      engine.ignite();
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);
    });

    it('falls back to xeno-standard for unknown ignitions', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ ignition: 'totallyUnknownIgnition' });

      engine.ignite();
      // Should not throw — falls back to standard
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);
    });

    it('uses the same ignition animation for retraction', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({
        ignition: 'ghost',
        retraction: 'ghost',
      });

      // Full ignite → on → retract cycle
      engine.ignite();
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);

      engine.retract();
      expect(engine.state).toBe(BladeState.RETRACTING);

      runFrames(engine, config, 50);
      expect(engine.state).toBe(BladeState.OFF);
    });

    it('renders all 12 xeno ignitions without error', () => {
      const xenoIgnitions = [
        'standard', 'velocity', 'torch', 'blaster', 'ghost',
        'stack', 'fold-tile', 'word', 'faser', 'scavenger',
        'hunter', 'broken',
      ];

      for (const ignition of xenoIgnitions) {
        const engine = new BladeEngine();
        engine.setRenderMode('xenopixel');
        const config = makeTestConfig({ ignition });

        engine.ignite();
        expect(() => runFrames(engine, config, 20)).not.toThrow();
      }
    });
  });

  // ─── Modulation skip ───────────────────────────────────────────

  describe('modulation routing in xenopixel mode', () => {
    it('skips modulation routing — config passes through unchanged', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');

      const config = makeTestConfig({
        style: 'fire',
        shimmer: 0.5,
        modulation: {
          bindings: [
            {
              id: 'test-binding',
              source: 'swing',
              target: 'shimmer',
              combinator: 'multiply',
              amount: 1.0,
              bypassed: false,
              expression: null,
            },
          ],
        },
      } as Partial<BladeConfig>);

      engine.ignite();
      // Should not throw even with modulation bindings present
      expect(() => runFrames(engine, config, 20)).not.toThrow();
    });
  });

  // ─── State machine integrity ───────────────────────────────────

  describe('state machine in xenopixel mode', () => {
    it('full lifecycle: OFF → IGNITING → ON → RETRACTING → OFF', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'fire', ignition: 'standard' });

      expect(engine.state).toBe(BladeState.OFF);

      engine.ignite();
      expect(engine.state).toBe(BladeState.IGNITING);

      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);

      engine.retract();
      expect(engine.state).toBe(BladeState.RETRACTING);

      runFrames(engine, config, 50);
      expect(engine.state).toBe(BladeState.OFF);
    });

    it('effect triggers work in xenopixel mode', () => {
      const engine = new BladeEngine();
      engine.setRenderMode('xenopixel');
      const config = makeTestConfig({ style: 'steady' });

      engine.ignite();
      runFrames(engine, config, 30);

      // Trigger a clash — should not throw
      expect(() => engine.triggerEffect('clash')).not.toThrow();
      runFrames(engine, config, 10);
    });
  });

  // ─── Mode switch during operation ──────────────────────────────

  describe('mode switch during operation', () => {
    it('switching mode mid-ignition does not crash', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // Start in proffie mode
      engine.ignite();
      runFrames(engine, config, 5);

      // Switch to xeno mid-ignition
      engine.setRenderMode('xenopixel');

      // Continue running — should not crash
      expect(() => runFrames(engine, config, 30)).not.toThrow();
    });

    it('switching mode while ON re-resolves style', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig({ style: 'stable' });

      // Full ignition in proffie mode
      engine.ignite();
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);

      // Switch to xenopixel — should re-resolve 'stable' → 'xeno-steady'
      engine.setRenderMode('xenopixel');
      expect(() => runFrames(engine, config, 10)).not.toThrow();

      const buf = engine.leds.buffer;
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });

    it('proffie mode still works after switching back from xenopixel', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig({ style: 'fire' });

      // Xenopixel first
      engine.setRenderMode('xenopixel');
      engine.ignite();
      runFrames(engine, config, 30);
      engine.retract();
      runFrames(engine, config, 50);

      // Back to proffie
      engine.setRenderMode('proffie');
      engine.ignite();
      runFrames(engine, config, 30);
      expect(engine.state).toBe(BladeState.ON);

      const buf = engine.leds.buffer;
      const hasColor = buf.some((v) => v > 0);
      expect(hasColor).toBe(true);
    });
  });
});
