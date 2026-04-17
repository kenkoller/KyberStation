import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BladeEngine } from '../src/BladeEngine';
import { BladeState } from '../src/types';
import type { BladeConfig, BladeTopology } from '../src/types';

function makeTestConfig(): BladeConfig {
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
  };
}

/**
 * Run enough update frames to complete an ignition or retraction.
 * Uses 16ms frames (~60fps) and runs well past the configured duration.
 */
function runFrames(engine: BladeEngine, config: BladeConfig, count: number, deltaMs = 16): void {
  for (let i = 0; i < count; i++) {
    engine.update(deltaMs, config);
  }
}

describe('BladeEngine', () => {
  beforeEach(() => {
    // Mock performance.now for deterministic effect timing
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now++);
  });

  describe('construction', () => {
    it('creates with default topology', () => {
      const engine = new BladeEngine();
      expect(engine).toBeDefined();
      expect(engine.leds).toBeDefined();
      expect(engine.motion).toBeDefined();
      expect(engine.topology.totalLEDs).toBe(132);
    });

    it('creates with custom topology', () => {
      const engine = new BladeEngine({
        presetId: 'custom',
        totalLEDs: 72,
        physicalLayout: {
          hiltOrigin: { x: 0.5, y: 0.85 },
          segments: [{ segmentId: 'short', origin: { x: 0.5, y: 0.85 }, angle: 0, length: 0.7 }],
        },
        segments: [
          {
            id: 'short',
            name: 'Short Blade',
            startLED: 0,
            endLED: 71,
            direction: 'normal',
            layers: [{ style: 'stable', direction: 'hilt-to-tip', opacity: 1, blendMode: 'normal' }],
            ignition: 'standard',
            retraction: 'standard',
            ignitionDelay: 0,
            role: 'main-blade',
            effectScoping: 'mirror-main',
          },
        ],
      });
      expect(engine.topology.totalLEDs).toBe(72);
    });
  });

  describe('state machine', () => {
    it('starts in OFF state', () => {
      const engine = new BladeEngine();
      expect(engine.state).toBe(BladeState.OFF);
      expect(engine.getState()).toBe(BladeState.OFF);
    });

    it('ignite() transitions to IGNITING', () => {
      const engine = new BladeEngine();
      engine.ignite();
      expect(engine.state).toBe(BladeState.IGNITING);
    });

    it('after enough update() calls, transitions from IGNITING to ON', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      engine.ignite();
      expect(engine.state).toBe(BladeState.IGNITING);

      // ignitionMs = 300, so ~19 frames at 16ms should be enough (19*16=304)
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);
    });

    it('retract() transitions ON to RETRACTING', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // First get to ON
      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);

      engine.retract();
      expect(engine.state).toBe(BladeState.RETRACTING);
    });

    it('after enough update() calls, transitions from RETRACTING to OFF', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      // Ignite fully
      engine.ignite();
      runFrames(engine, config, 25);

      // Retract fully (retractionMs = 500, 35 frames * 16ms = 560)
      engine.retract();
      runFrames(engine, config, 40);

      expect(engine.state).toBe(BladeState.OFF);
    });

    it('ignite() is a no-op when already IGNITING', () => {
      const engine = new BladeEngine();
      engine.ignite();
      expect(engine.state).toBe(BladeState.IGNITING);
      engine.ignite(); // should not change state
      expect(engine.state).toBe(BladeState.IGNITING);
    });

    it('ignite() is a no-op when already ON', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);
      engine.ignite(); // should not change state
      expect(engine.state).toBe(BladeState.ON);
    });

    it('retract() is a no-op when already OFF', () => {
      const engine = new BladeEngine();
      engine.retract();
      expect(engine.state).toBe(BladeState.OFF);
    });

    it('retract() is a no-op when already RETRACTING', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      engine.retract();
      expect(engine.state).toBe(BladeState.RETRACTING);
      engine.retract(); // should not change state
      expect(engine.state).toBe(BladeState.RETRACTING);
    });
  });

  describe('toggle()', () => {
    it('OFF -> IGNITING', () => {
      const engine = new BladeEngine();
      engine.toggle();
      expect(engine.state).toBe(BladeState.IGNITING);
    });

    it('ON -> RETRACTING', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);
      engine.toggle();
      expect(engine.state).toBe(BladeState.RETRACTING);
    });

    it('RETRACTING -> IGNITING (re-ignite during retraction)', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      engine.retract();
      expect(engine.state).toBe(BladeState.RETRACTING);
      engine.toggle(); // should re-ignite
      expect(engine.state).toBe(BladeState.IGNITING);
    });
  });

  describe('update() and pixel output', () => {
    it('getPixels() returns a Uint8Array', () => {
      const engine = new BladeEngine();
      const pixels = engine.getPixels();
      expect(pixels).toBeInstanceOf(Uint8Array);
      expect(pixels.length).toBe(132 * 3);
    });

    it('when OFF, all pixels are 0', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.update(16, config);
      const pixels = engine.getPixels();
      for (let i = 0; i < pixels.length; i++) {
        expect(pixels[i]).toBe(0);
      }
    });

    it('when ON, at least some pixels are non-zero', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);

      // Do one more update to render with ON state
      engine.update(16, config);

      const pixels = engine.getPixels();
      let hasNonZero = false;
      for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] > 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    });

    it('during IGNITING, some pixels are non-zero (partial extension)', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      // Run a few frames to get partial ignition
      runFrames(engine, config, 5);
      expect(engine.state).toBe(BladeState.IGNITING);

      const pixels = engine.getPixels();
      let hasNonZero = false;
      for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] > 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    });
  });

  describe('effects', () => {
    it('triggerEffect("clash") does not throw', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);

      expect(() => engine.triggerEffect('clash')).not.toThrow();
    });

    it('triggerEffect("clash") modifies pixel output', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);

      // Capture pixels before clash
      engine.update(16, config);
      const beforePixels = new Uint8Array(engine.getPixels());

      // Trigger clash and update
      engine.triggerEffect('clash', { position: 0.5 });
      engine.update(16, config);
      const afterPixels = engine.getPixels();

      // At least some pixels should differ (clash flashes the blade)
      let hasDifference = false;
      for (let i = 0; i < beforePixels.length; i++) {
        if (beforePixels[i] !== afterPixels[i]) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });

    it('releaseEffect("lockup") does not throw', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);

      // Release without triggering first should be safe
      expect(() => engine.releaseEffect('lockup')).not.toThrow();
    });

    it('triggerEffect then releaseEffect for lockup works', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);

      engine.triggerEffect('lockup', { position: 0.5 });
      engine.update(16, config);

      expect(() => engine.releaseEffect('lockup')).not.toThrow();
    });

    it('multiple effects can be triggered', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);

      expect(() => {
        engine.triggerEffect('clash', { position: 0.5 });
        engine.triggerEffect('blast', { position: 0.3 });
        engine.update(16, config);
      }).not.toThrow();
    });
  });

  describe('reset()', () => {
    it('resets engine to initial state', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.state).toBe(BladeState.ON);

      engine.reset();

      expect(engine.state).toBe(BladeState.OFF);
      expect(engine.extendProgress).toBe(0);

      const pixels = engine.getPixels();
      for (let i = 0; i < pixels.length; i++) {
        expect(pixels[i]).toBe(0);
      }
    });
  });

  describe('setTopology()', () => {
    it('reconfigures the engine with a new topology', () => {
      const engine = new BladeEngine();
      expect(engine.topology.totalLEDs).toBe(132);

      engine.setTopology({
        presetId: 'staff',
        totalLEDs: 288,
        physicalLayout: {
          hiltOrigin: { x: 0.5, y: 0.5 },
          segments: [
            { segmentId: 'staff-1', origin: { x: 0.5, y: 0.5 }, angle: 0, length: 0.4 },
            { segmentId: 'staff-2', origin: { x: 0.5, y: 0.5 }, angle: 180, length: 0.4 },
          ],
        },
        segments: [
          {
            id: 'staff-1',
            name: 'Blade 1',
            startLED: 0,
            endLED: 143,
            direction: 'normal',
            layers: [{ style: 'stable', direction: 'hilt-to-tip', opacity: 1, blendMode: 'normal' }],
            ignition: 'standard',
            retraction: 'standard',
            ignitionDelay: 0,
            role: 'main-blade',
            effectScoping: 'independent',
          },
          {
            id: 'staff-2',
            name: 'Blade 2',
            startLED: 144,
            endLED: 287,
            direction: 'normal',
            layers: [{ style: 'stable', direction: 'hilt-to-tip', opacity: 1, blendMode: 'normal' }],
            ignition: 'standard',
            retraction: 'standard',
            ignitionDelay: 0,
            role: 'secondary-blade',
            effectScoping: 'independent',
          },
        ],
      });

      expect(engine.topology.totalLEDs).toBe(288);
      expect(engine.getPixels().length).toBe(288 * 3);
    });
  });

  describe('extendProgress', () => {
    it('starts at 0', () => {
      const engine = new BladeEngine();
      expect(engine.extendProgress).toBe(0);
    });

    it('increases during ignition', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      engine.update(16, config);
      expect(engine.extendProgress).toBeGreaterThan(0);
    });

    it('reaches 1 when fully ignited', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();
      engine.ignite();
      runFrames(engine, config, 25);
      expect(engine.extendProgress).toBe(1);
    });

    it('decreases during retraction', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      engine.ignite();
      runFrames(engine, config, 25);
      const progressAtOn = engine.extendProgress;

      engine.retract();
      engine.update(16, config);
      expect(engine.extendProgress).toBeLessThan(progressAtOn);
    });

    it('reaches 0 when fully retracted', () => {
      const engine = new BladeEngine();
      const config = makeTestConfig();

      engine.ignite();
      runFrames(engine, config, 25);
      engine.retract();
      runFrames(engine, config, 40);

      expect(engine.extendProgress).toBe(0);
    });
  });

  describe('preon', () => {
    it('ignite(config) transitions OFF → PREON when preonEnabled', () => {
      const engine = new BladeEngine();
      const config: BladeConfig = { ...makeTestConfig(), preonEnabled: true };
      engine.ignite(config);
      expect(engine.state).toBe(BladeState.PREON);
    });

    it('ignite(config) goes straight to IGNITING when preonEnabled is false/unset', () => {
      const engine = new BladeEngine();
      engine.ignite(makeTestConfig());
      expect(engine.state).toBe(BladeState.IGNITING);
    });

    it('preon auto-advances to IGNITING after preonMs elapsed', () => {
      const engine = new BladeEngine();
      const config: BladeConfig = {
        ...makeTestConfig(),
        preonEnabled: true,
        preonMs: 100,
      };
      engine.ignite(config);
      expect(engine.state).toBe(BladeState.PREON);
      // 8 frames × 16ms = 128ms > 100ms preon; state should have flipped.
      runFrames(engine, config, 8);
      expect(engine.state).not.toBe(BladeState.PREON);
      expect([BladeState.IGNITING, BladeState.ON]).toContain(engine.state);
    });

    it('during PREON the blade is painted with preonColor (or baseColor fallback)', () => {
      const engine = new BladeEngine();
      const config: BladeConfig = {
        ...makeTestConfig(),
        preonEnabled: true,
        preonMs: 500,
        preonColor: { r: 200, g: 50, b: 255 },
      };
      engine.ignite(config);
      // One frame into preon — pulse should have a non-zero value since
      // the intensity ramps from 0 over the first half.
      engine.update(125, config); // 25% into preon → intensity ≈ 0.5
      const pixels = engine.getPixels();
      // Purple tint — red and blue channels both non-zero, green low.
      expect(pixels[0]).toBeGreaterThan(40);
      expect(pixels[2]).toBeGreaterThan(60);
      expect(pixels[1]).toBeLessThan(pixels[0]);
    });

    it('replayIgnition(config) honours preon', () => {
      const engine = new BladeEngine();
      const config: BladeConfig = { ...makeTestConfig(), preonEnabled: true };
      engine.replayIgnition(config);
      expect(engine.state).toBe(BladeState.PREON);
    });
  });
});
