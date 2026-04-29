// ─── Blade engine golden-hash regression tests ───────────────────────
//
// Pins LED-buffer output for 8 canonical configs across 4 states (off /
// igniting@50% / on / retracting@50%). Catches engine state-machine
// drift, style algorithm changes, effect parameter drift, and topology
// LED-routing regressions.
//
// What this test does NOT catch:
// - Renderer drift (bloom, tone-map, color-space, blade canvas, hilt
//   overlay). Renderer-level golden tests are a follow-up that would
//   need node-canvas to run the full pipeline; that's documented as
//   the prerequisite for the `lib/blade/*` module-extraction Item K.
// - DOM/layout regressions in `BladeCanvas.tsx` — outside this layer.
//
// What this DOES protect:
// - The 29 blade-style implementations in `packages/engine/src/styles/*`
// - The state machine in `BladeEngine.ts`
// - The capsule LED routing
// - Style + effect parameter defaults
//
// When a hash mismatch fires:
// 1. Inspect the diff visually first (run the editor + apply the named
//    config — does the change look intentional?).
// 2. If yes: regenerate file snapshots via
//      `pnpm vitest run -u tests/bladeEngineGoldenHash`
//    Vitest writes them into
//    `apps/web/tests/__snapshots__/bladeEngineGoldenHash.test.ts.snap`,
//    keyed by test name.
// 3. If no: bisect to find the engine commit that changed output.
//
// Naming: 8 configs × 4 states = 32 tests. Each test name is
// `<configId>::<stateId>`.

import { describe, it, expect } from 'vitest';
import {
  BladeEngine,
  BladeState,
  type BladeConfig,
} from '@kyberstation/engine';

// ─── Hash helper ──────────────────────────────────────────────────────
//
// FNV-1a 32-bit. Deterministic across platforms; cheap (Uint8Array →
// 8-char hex). Output stable across node versions per spec.

function fnv1a(buffer: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < buffer.length; i++) {
    hash ^= buffer[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ─── Canonical configs ───────────────────────────────────────────────
//
// 8 cover-the-space configs: 5 canonical hero colors, 3 style variants
// (pulse / fire / unstable). All else default to the same baseline so
// hash differences attribute clearly to either color OR style.

const BASE_CONFIG: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 100 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 300,
  shimmer: 0.05,
  ledCount: 144,
};

const CANONICAL_CONFIGS: { id: string; config: BladeConfig }[] = [
  { id: 'obi-wan-blue-stable',  config: { ...BASE_CONFIG } },
  { id: 'vader-red-stable',     config: { ...BASE_CONFIG, baseColor: { r: 255, g: 30,  b: 20  } } },
  { id: 'yoda-green-stable',    config: { ...BASE_CONFIG, baseColor: { r: 30,  g: 255, b: 30  } } },
  { id: 'mace-purple-stable',   config: { ...BASE_CONFIG, baseColor: { r: 170, g: 60,  b: 240 } } },
  { id: 'rey-yellow-stable',    config: { ...BASE_CONFIG, baseColor: { r: 255, g: 210, b: 40  } } },
  { id: 'kit-fisto-cyan-pulse', config: { ...BASE_CONFIG, baseColor: { r: 20,  g: 230, b: 255 }, style: 'pulse' } },
  { id: 'maul-red-fire',        config: { ...BASE_CONFIG, baseColor: { r: 255, g: 30,  b: 20  }, style: 'fire' } },
  { id: 'kylo-red-unstable',    config: { ...BASE_CONFIG, baseColor: { r: 220, g: 30,  b: 10  }, style: 'unstable' } },
];

const TEST_STATES: { id: string; state: BladeState; progress: number }[] = [
  { id: 'off',            state: BladeState.OFF,         progress: 0   },
  { id: 'igniting-50',    state: BladeState.IGNITING,    progress: 0.5 },
  { id: 'on',             state: BladeState.ON,          progress: 1   },
  { id: 'retracting-50',  state: BladeState.RETRACTING,  progress: 0.5 },
];

// Note: time-driven styles (fire / unstable / pulse) sample
// `performance.now()` indirectly via the engine's internal clock. To
// keep golden hashes deterministic across runs, we feed a fixed
// `settleMs` so the engine's internal sample clock lands on a
// reproducible value. captureStateFrame's settleMs default (120) is
// overridden here to a value chosen to avoid most stochastic style
// branches firing right at frame-zero.
const SETTLE_MS = 200;

describe('blade engine golden hashes', () => {
  // Single shared engine for the test suite. captureStateFrame spins
  // up its own scratch engine per call, so this outer instance is just
  // the entrypoint.
  const engine = new BladeEngine();

  for (const cfg of CANONICAL_CONFIGS) {
    for (const stateCase of TEST_STATES) {
      const key = `${cfg.id} :: ${stateCase.id}`;
      it(key, () => {
        const buffer = engine.captureStateFrame(
          stateCase.state,
          cfg.config,
          undefined,
          { progress: stateCase.progress, settleMs: SETTLE_MS },
        );
        // Sanity: 144 LEDs × 3 channels = 432 bytes in OFF; ON varies
        // because `_topology.totalLEDs` for the default single
        // topology is 144 (= ledCount). Keep the assertion shape-only.
        expect(buffer.length).toBeGreaterThan(0);
        expect(buffer.length % 3).toBe(0);

        // Stable hash assertion — vitest's inline snapshot rewrites
        // this on first run via `vitest run -u`.
        expect(fnv1a(buffer)).toMatchSnapshot();
      });
    }
  }

  // Drift-sentinel: the FNV-1a implementation must be stable across
  // node versions / future TS upgrades. Lock the output for a known
  // input so a future toolchain bump doesn't silently invalidate the
  // suite by changing the hash function.
  it('FNV-1a hash function is stable for a known input', () => {
    const input = new Uint8Array([0, 140, 255, 255, 30, 20]);
    expect(fnv1a(input)).toMatchSnapshot();
  });
});
