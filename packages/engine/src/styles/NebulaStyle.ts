import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { fbm } from '../noise.js';
import { lerpColor } from '../LEDArray.js';

/** A single star-birth flare with fast attack and slow decay. */
interface StarFlare {
  position: number;  // 0-1 along blade
  birth: number;     // time when flare spawned
  brightness: number; // current brightness 0-1
  active: boolean;
}

/**
 * NebulaStyle -- Churning interstellar gas clouds with star-birth flares.
 *
 * Two layered noise fields at different frequencies and scroll speeds produce
 * a dual-color nebula palette (red-to-magenta and teal-to-purple).  The noise
 * coordinates drift lazily via a sinusoidal offset that reverses direction
 * every ~5 seconds.
 *
 * A pool of 4-6 star flares fires independently with fast attack (~50 ms)
 * and slow exponential decay (~500 ms), adding hot white-yellow pops along
 * the blade.  The overall output is tinted toward the user's baseColor.
 */
export class NebulaStyle extends BaseStyle {
  readonly id = 'nebula';
  readonly name = 'Nebula';
  readonly description =
    'Churning interstellar gas clouds with star-birth flares.';

  private readonly flarePool: StarFlare[] = [];
  private readonly maxFlares = 6;
  private nextFlareTime = 0;
  private lastTime = -1;

  /** Deterministic pseudo-random seeded by a float. */
  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Initialize the flare pool on first call. */
  private ensureFlarePool(): void {
    if (this.flarePool.length === 0) {
      for (let i = 0; i < this.maxFlares; i++) {
        this.flarePool.push({
          position: 0,
          birth: -10,
          brightness: 0,
          active: false,
        });
      }
    }
  }

  /**
   * Update flare states.  Called once per time step (guard against
   * duplicate calls for the same time from multiple position queries).
   */
  private updateFlares(time: number): void {
    if (time === this.lastTime) return;
    this.lastTime = time;

    const attackMs = 50;
    const decayMs = 500;
    const attackSec = attackMs / 1000;
    const decaySec = decayMs / 1000;

    // Update existing active flares
    for (const flare of this.flarePool) {
      if (!flare.active) continue;
      const age = time - flare.birth;
      if (age < attackSec) {
        // Fast linear attack
        flare.brightness = age / attackSec;
      } else {
        // Exponential decay
        const decayAge = age - attackSec;
        flare.brightness = Math.exp(-decayAge / (decaySec * 0.33));
        if (flare.brightness < 0.01) {
          flare.active = false;
          flare.brightness = 0;
        }
      }
    }

    // Spawn new flare if cooldown elapsed and a slot is open
    if (time >= this.nextFlareTime) {
      const openSlot = this.flarePool.find((f) => !f.active);
      if (openSlot) {
        openSlot.active = true;
        openSlot.birth = time;
        openSlot.brightness = 0;
        openSlot.position = this.pseudoRandom(time * 77.7 + 13.3);
        // Random cooldown: 200-600 ms
        const cooldown = 0.2 + this.pseudoRandom(time * 31.9 + 5.1) * 0.4;
        this.nextFlareTime = time + cooldown;
      }
    }
  }

  /** Map noise value 0-1 to red-to-magenta color ramp. */
  private rampRedMagenta(t: number): RGB {
    const red: RGB = { r: 180, g: 30, b: 20 };
    const magenta: RGB = { r: 200, g: 40, b: 180 };
    return lerpColor(red, magenta, t);
  }

  /** Map noise value 0-1 to teal-to-purple color ramp. */
  private rampTealPurple(t: number): RGB {
    const teal: RGB = { r: 20, g: 160, b: 140 };
    const purple: RGB = { r: 120, g: 30, b: 200 };
    return lerpColor(teal, purple, t);
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    this.ensureFlarePool();
    this.updateFlares(time);

    const base = context.config.baseColor;

    // ── Sinusoidal drift reversal (period ~5 s) ─────────────────────────
    const driftOffset = Math.sin(time * (2 * Math.PI / 5)) * 0.4;

    // ── Noise layer 1: low frequency, slow scroll ──────────────────────
    const n1x = position * 3.0 + driftOffset + time * 0.15;
    const n1y = time * 0.3;
    const noise1 = fbm(n1x, n1y, 3);

    // ── Noise layer 2: higher frequency, faster scroll ─────────────────
    const n2x = position * 5.5 - driftOffset + time * 0.35;
    const n2y = time * 0.5 + 100; // offset Y seed to decorrelate
    const noise2 = fbm(n2x, n2y, 2);

    // Map noise to color ramps
    const color1 = this.rampRedMagenta(noise1);
    const color2 = this.rampTealPurple(noise2);

    // Blend the two nebula layers (screen-like additive blend)
    const nebula: RGB = {
      r: Math.min(255, color1.r * 0.6 + color2.r * 0.5),
      g: Math.min(255, color1.g * 0.6 + color2.g * 0.5),
      b: Math.min(255, color1.b * 0.6 + color2.b * 0.5),
    };

    // ── Tint with user's base color (50% blend) ─────────────────────────
    let result = lerpColor(nebula, base, 0.35);

    // ── Star flares ─────────────────────────────────────────────────────
    const ledCount = Math.max(1, context.config.ledCount ?? 132);
    const flareRadius = 4 / ledCount; // ~4 LEDs wide
    const flareColor: RGB = { r: 255, g: 250, b: 200 }; // hot white-yellow

    for (const flare of this.flarePool) {
      if (!flare.active || flare.brightness < 0.01) continue;
      const dist = Math.abs(position - flare.position);
      if (dist < flareRadius) {
        const falloff = 1 - dist / flareRadius;
        const intensity = falloff * falloff * flare.brightness;
        result = lerpColor(result, flareColor, intensity * 0.9);
      }
    }

    return {
      r: Math.max(0, Math.min(255, result.r)),
      g: Math.max(0, Math.min(255, result.g)),
      b: Math.max(0, Math.min(255, result.b)),
    };
  }
}
