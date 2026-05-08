// ─── Function Templates ───
// Templates that produce integer values (0-32768 ProffieOS scale).
// Used as inputs to Scale, Mix, Bump, etc.
// Clean-room implementations based on ProffieOS documented behavior.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, StyleTemplate } from '../types.js';
import { BLACK, clamp, PROFFIE_MAX } from '../types.js';
import { sinWave, bump as bumpFn, ledToBladePos, scaleValue, hashPair, smoothStep as smoothStepFn } from '../utils.js';

// ─── Int<N> ───
// Constant integer value.

export class IntTemplate extends BaseStyleTemplate {
  private readonly value: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.value = args[0]?.getInteger(0) ?? 0;
  }

  getInteger(_led: number): number {
    return this.value;
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── Scale<Input, Min, Max> ───
// Rescale a function output from 0-32768 to [Min, Max] range.

export class ScaleTemplate extends BaseStyleTemplate {
  private readonly input: StyleTemplate;
  private readonly min: StyleTemplate;
  private readonly max: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.input = args[0]!;
    this.min = args[1]!;
    this.max = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.input.run(state, effects);
    this.min.run(state, effects);
    this.max.run(state, effects);
  }

  getInteger(led: number): number {
    const inp = this.input.getInteger(led);
    const minV = this.min.getInteger(led);
    const maxV = this.max.getInteger(led);
    return scaleValue(inp, minV, maxV);
  }
}

// ─── SwingSpeed<MaxSpeed> ───
// Returns current swing speed scaled to 0-32768.
// MaxSpeed is the speed (degrees/sec) that maps to 32768.

export class SwingSpeedTemplate extends BaseStyleTemplate {
  constructor(args: StyleTemplate[]) {
    super();
    // maxSpeed arg ignored — state.swingSpeed is pre-scaled to 0-32768
    void args;
  }

  getInteger(_led: number): number {
    // swingSpeed in state is already 0-32768
    return clamp(this.state.swingSpeed, 0, PROFFIE_MAX);
  }
}

// ─── BladeAngle<min?, max?> ───
// Returns blade angle mapped to 0-32768.

export class BladeAngleTemplate extends BaseStyleTemplate {
  private readonly min: number;
  private readonly max: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.min = args[0]?.getInteger(0) ?? 0;
    this.max = args[1]?.getInteger(0) ?? PROFFIE_MAX;
  }

  getInteger(_led: number): number {
    if (this.min === 0 && this.max === PROFFIE_MAX) {
      return clamp(this.state.bladeAngle, 0, PROFFIE_MAX);
    }
    // Rescale bladeAngle to [min, max] range
    return scaleValue(this.state.bladeAngle, this.min, this.max);
  }
}

// ─── TwistAngle<> ───
// Returns twist angle, 0-32768.

export class TwistAngleTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return clamp(this.state.twistAngle, 0, PROFFIE_MAX);
  }
}

// ─── SoundLevel<> ───
// Returns audio level, 0-32768.

export class SoundLevelTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return clamp(this.state.soundLevel, 0, PROFFIE_MAX);
  }
}

// ─── NoisySoundLevel<> / NoisySoundLevelCompat<> ───
// Noisy version of sound level with per-LED variation.

export class NoisySoundLevelTemplate extends BaseStyleTemplate {
  getInteger(led: number): number {
    const base = clamp(this.state.soundLevel, 0, PROFFIE_MAX);
    const noise = (hashPair(led, Math.floor(this.state.timeMs / 30)) - 0.5) * 4000;
    return clamp(Math.round(base + noise), 0, PROFFIE_MAX);
  }
}

// ─── SmoothSoundLevel<> ───

export class SmoothSoundLevelTemplate extends BaseStyleTemplate {
  private smoothed = 0;

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    const target = state.soundLevel;
    const rate = 0.1;
    this.smoothed += (target - this.smoothed) * rate;
  }

  getInteger(_led: number): number {
    return clamp(Math.round(this.smoothed), 0, PROFFIE_MAX);
  }
}

// ─── BatteryLevel<> ───
// Returns battery level, 0-32768.

export class BatteryLevelTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return clamp(this.state.batteryLevel, 0, PROFFIE_MAX);
  }
}

// ─── Variation ───
// Returns the variation value, 0-32768.

export class VariationTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return clamp(this.state.variation, 0, PROFFIE_MAX);
  }
}

// ─── Sin<PeriodMs, Low?, High?> ───
// Sine wave oscillator.

export class SinTemplate extends BaseStyleTemplate {
  private readonly periodMs: StyleTemplate;
  private readonly low: StyleTemplate | null;
  private readonly high: StyleTemplate | null;

  constructor(args: StyleTemplate[]) {
    super();
    this.periodMs = args[0]!;
    this.low = args[1] ?? null;
    this.high = args[2] ?? null;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.periodMs.run(state, effects);
    this.low?.run(state, effects);
    this.high?.run(state, effects);
  }

  getInteger(led: number): number {
    const period = this.periodMs.getInteger(led);
    const raw = sinWave(this.state.timeMs, period);
    if (this.low && this.high) {
      const lo = this.low.getInteger(led);
      const hi = this.high.getInteger(led);
      return scaleValue(raw, lo, hi);
    }
    return raw;
  }
}

// ─── Bump<Center, Width> ───
// Gaussian bump along the blade.

export class BumpTemplate extends BaseStyleTemplate {
  private readonly center: StyleTemplate;
  private readonly width: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.center = args[0]!;
    this.width = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.center.run(state, effects);
    this.width.run(state, effects);
  }

  getInteger(led: number): number {
    const pos = ledToBladePos(led, this.state.numLeds);
    const center = this.center.getInteger(led);
    const width = this.width.getInteger(led);
    return bumpFn(pos, center, width);
  }
}

// ─── SmoothStep<Start, End> ───
// Smooth step function along the blade.

export class SmoothStepTemplate extends BaseStyleTemplate {
  private readonly start: StyleTemplate;
  private readonly end: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.start = args[0]!;
    this.end = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.start.run(state, effects);
    this.end.run(state, effects);
  }

  getInteger(led: number): number {
    const pos = ledToBladePos(led, this.state.numLeds);
    const start = this.start.getInteger(led);
    const end = this.end.getInteger(led);
    const val = smoothStepFn(start, end, pos);
    return Math.round(val * PROFFIE_MAX);
  }
}

// ─── ClampF<F, Min, Max> ───
// Clamp a function value between min and max.

export class ClampFTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly min: StyleTemplate;
  private readonly max: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.min = args[1]!;
    this.max = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.min.run(state, effects);
    this.max.run(state, effects);
  }

  getInteger(led: number): number {
    const val = this.func.getInteger(led);
    const lo = this.min.getInteger(led);
    const hi = this.max.getInteger(led);
    return clamp(val, lo, hi);
  }
}

// ─── ChangeSlowly<F, Speed> ───
// Smooths a rapidly changing function with one-pole filter.

export class ChangeSlowlyTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly speed: StyleTemplate;
  private current = 0;
  private initialized = false;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.speed = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.speed.run(state, effects);

    const target = this.func.getInteger(0);
    if (!this.initialized) {
      this.current = target;
      this.initialized = true;
    } else {
      const speed = this.speed.getInteger(0);
      const maxDelta = (speed * state.deltaMsF) / 1000;
      const diff = target - this.current;
      if (Math.abs(diff) <= maxDelta) {
        this.current = target;
      } else {
        this.current += Math.sign(diff) * maxDelta;
      }
    }
  }

  getInteger(_led: number): number {
    return Math.round(clamp(this.current, 0, PROFFIE_MAX));
  }
}

// ─── Sum<A, B, ...> ───

export class SumTemplate extends BaseStyleTemplate {
  private readonly args: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.args = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const a of this.args) a.run(state, effects);
  }

  getInteger(led: number): number {
    let sum = 0;
    for (const a of this.args) sum += a.getInteger(led);
    return sum;
  }
}

// ─── Mult<A, B> ───
// Multiplies two function values: (A * B) / 32768

export class MultTemplate extends BaseStyleTemplate {
  private readonly a: StyleTemplate;
  private readonly b: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.a = args[0]!;
    this.b = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.a.run(state, effects);
    this.b.run(state, effects);
  }

  getInteger(led: number): number {
    const a = this.a.getInteger(led);
    const b = this.b.getInteger(led);
    return Math.round((a * b) / PROFFIE_MAX);
  }
}

// ─── Percentage<F, Percent> ───
// Returns F * Percent / 100

export class PercentageTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly pct: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.pct = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.pct.run(state, effects);
  }

  getInteger(led: number): number {
    return Math.round((this.func.getInteger(led) * this.pct.getInteger(led)) / 100);
  }
}

// ─── IsLessThan<F, Threshold> ───
// Returns 32768 if F < Threshold, else 0.

export class IsLessThanTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly threshold: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.threshold = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.threshold.run(state, effects);
  }

  getInteger(led: number): number {
    return this.func.getInteger(led) < this.threshold.getInteger(led) ? PROFFIE_MAX : 0;
  }

  getColor(led: number): Color {
    return this.getInteger(led) > 0 ? { r: 255, g: 255, b: 255 } : BLACK;
  }
}

// ─── ClashImpactF<> ───
// Returns current clash impact force, 0-32768.

export class ClashImpactFTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return this.effects?.clashImpact ?? 0;
  }
}

// ─── TimeSinceEffect<Effect> ───
// Returns ms since the last effect of given type.

export class TimeSinceEffectTemplate extends BaseStyleTemplate {
  private readonly effectArg: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.effectArg = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.effectArg.run(state, effects);
  }

  getInteger(_led: number): number {
    // For now return time since start — full effect tracking requires mapping
    // the argument name to an EffectType, which would need the string name.
    return this.state.timeMs;
  }
}

// ─── EffectPosition<Effect?> ───
// Returns position of last effect.

export class EffectPositionTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    // Return center of blade as default
    return PROFFIE_MAX / 2;
  }
}

// ─── EffectRandomF<Effect> ───
// Returns a random value that was set when the effect was triggered.

export class EffectRandomFTemplate extends BaseStyleTemplate {
  private readonly effectArg: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.effectArg = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.effectArg.run(state, effects);
  }

  getInteger(_led: number): number {
    // Return a pseudo-random value based on time
    return Math.floor(hashPair(this.state.timeMs, 42) * PROFFIE_MAX);
  }
}

// ─── RandomF ───
// Returns a random value 0-32768 that changes each frame.

export class RandomFTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return Math.floor(hashPair(this.state.timeMs, 7919) * PROFFIE_MAX);
  }
}

// ─── RandomPerLEDF ───
// Returns a random value per LED, different each frame.

export class RandomPerLEDFTemplate extends BaseStyleTemplate {
  getInteger(led: number): number {
    return Math.floor(hashPair(led, Math.floor(this.state.timeMs / 30)) * PROFFIE_MAX);
  }
}

// ─── CenterDistF<Center?> ───
// Returns distance from blade center (or specified center), 0-32768.

export class CenterDistFTemplate extends BaseStyleTemplate {
  private readonly center: StyleTemplate | null;

  constructor(args: StyleTemplate[]) {
    super();
    this.center = args[0] ?? null;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.center?.run(state, effects);
  }

  getInteger(led: number): number {
    const pos = ledToBladePos(led, this.state.numLeds);
    const center = this.center?.getInteger(led) ?? (PROFFIE_MAX / 2);
    const dist = Math.abs(pos - center);
    return clamp(dist * 2, 0, PROFFIE_MAX); // Scale so edge = 32768
  }
}

// ─── WavLen<Effect?> ───
// Returns length/duration of an effect's WAV file. Approximated.

export class WavLenTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return 1000; // Approximate 1 second
  }
}

// ─── IncrementWithReset<Trigger> ───
// Counter that increments each call and resets on trigger.

export class IncrementWithResetTemplate extends BaseStyleTemplate {
  private count = 0;

  getInteger(_led: number): number {
    this.count++;
    return clamp(this.count, 0, PROFFIE_MAX);
  }
}

// ─── AltF ───
// Returns 0 or 32768 based on alternate state.

export class AltFTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    return 0;
  }
}

// ─── Ifon<A, B> ───
// Returns A if blade is on, B if off.

export class IfonTemplate extends BaseStyleTemplate {
  private readonly onStyle: StyleTemplate;
  private readonly offStyle: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.onStyle = args[0]!;
    this.offStyle = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.onStyle.run(state, effects);
    this.offStyle.run(state, effects);
  }

  getInteger(led: number): number {
    return this.state.isOn ? this.onStyle.getInteger(led) : this.offStyle.getInteger(led);
  }

  getColor(led: number): Color {
    return this.state.isOn ? this.onStyle.getColor(led) : this.offStyle.getColor(led);
  }
}

// ─── IgnitionTime<Default?> / RetractionTime<Default?> ───
// Returns the ignition/retraction time. Uses default or 300ms.

export class IgnitionTimeTemplate extends BaseStyleTemplate {
  private readonly defaultMs: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.defaultMs = args[0]?.getInteger(0) ?? 300;
  }

  getInteger(_led: number): number {
    return this.defaultMs;
  }
}

export class RetractionTimeTemplate extends BaseStyleTemplate {
  private readonly defaultMs: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.defaultMs = args[0]?.getInteger(0) ?? 500;
  }

  getInteger(_led: number): number {
    return this.defaultMs;
  }
}

// ─── BendTimePowInvX<T, Bend> ───
// Time modifier for ignition/retraction curves. Returns the time value.

export class BendTimePowInvXTemplate extends BaseStyleTemplate {
  private readonly time: StyleTemplate;
  private readonly bend: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.time = args[0]!;
    this.bend = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.time.run(state, effects);
    this.bend.run(state, effects);
  }

  getInteger(led: number): number {
    // Simplified: just return the time value
    return this.time.getInteger(led);
  }
}
