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

  getChildren(): StyleTemplate[] {
    return [this.input, this.min, this.max];
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

  getChildren(): StyleTemplate[] {
    const children: StyleTemplate[] = [this.periodMs];
    if (this.low) children.push(this.low);
    if (this.high) children.push(this.high);
    return children;
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

  getChildren(): StyleTemplate[] {
    return [this.center, this.width];
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

  getChildren(): StyleTemplate[] {
    return [this.start, this.end];
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

  getChildren(): StyleTemplate[] {
    return [this.func, this.min, this.max];
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

  getChildren(): StyleTemplate[] {
    return [this.func, this.speed];
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

  getChildren(): StyleTemplate[] {
    return this.args;
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

  getChildren(): StyleTemplate[] {
    return [this.a, this.b];
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

  getChildren(): StyleTemplate[] {
    return [this.func, this.pct];
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

  getChildren(): StyleTemplate[] {
    return [this.func, this.threshold];
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

  getChildren(): StyleTemplate[] {
    return [this.effectArg];
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

  getChildren(): StyleTemplate[] {
    return [this.effectArg];
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

  getChildren(): StyleTemplate[] {
    const children: StyleTemplate[] = [];
    if (this.center) children.push(this.center);
    return children;
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

  getChildren(): StyleTemplate[] {
    return [this.onStyle, this.offStyle];
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

// ─── PulsingF<Speed> ───
// Function producing a 0-32768 pulsing value based on time.
// Uses a sine wave at the given speed (period in ms).

export class PulsingFTemplate extends BaseStyleTemplate {
  private readonly speed: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.speed = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.speed.run(state, effects);
  }

  getInteger(led: number): number {
    const speedMs = this.speed.getInteger(led);
    if (speedMs <= 0) return PROFFIE_MAX / 2;
    // sin(time * 2pi / speed) * 0.5 + 0.5, scaled to 0-32768
    const phase = (this.state.timeMs % speedMs) / speedMs;
    const value = Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5;
    return Math.round(value * PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.speed];
  }
}

// ─── VolumeLevel<> ───
// Returns the current volume level setting, 0-32768.
// Since BladeState doesn't have a volume field, returns a constant mid-value.

export class VolumeLevelTemplate extends BaseStyleTemplate {
  getInteger(_led: number): number {
    // BladeState doesn't carry volume; return half-max as a reasonable default
    return PROFFIE_MAX / 2;
  }
}

// ─── EffectPulseF<EffectType, PulseMs> ───
// Returns a pulse (32768 → 0) triggered by a specified effect, decaying over time.

export class EffectPulseFTemplate extends BaseStyleTemplate {
  private readonly effectArg: StyleTemplate;
  private readonly pulseMsArg: StyleTemplate;
  private lastTriggerTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.effectArg = args[0]!;
    this.pulseMsArg = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.effectArg.run(state, effects);
    this.pulseMsArg.run(state, effects);

    // Check for recent effect activity — use clash as a proxy trigger
    if (effects) {
      const impact = effects.clashImpact;
      if (impact > 0 && this.lastTriggerTime < 0) {
        this.lastTriggerTime = state.timeMs;
      }
    }
  }

  getInteger(led: number): number {
    if (this.lastTriggerTime < 0) return 0;
    const pulseMs = this.pulseMsArg.getInteger(led);
    if (pulseMs <= 0) return 0;
    const elapsed = this.state.timeMs - this.lastTriggerTime;
    if (elapsed >= pulseMs) {
      this.lastTriggerTime = -1;
      return 0;
    }
    // Linear decay from 32768 to 0
    const t = 1 - elapsed / pulseMs;
    return Math.round(clamp(t, 0, 1) * PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.effectArg, this.pulseMsArg];
  }
}

// ─── ModF<Dividend, Divisor> ───
// Modulo operation on two integer functions.

export class ModFTemplate extends BaseStyleTemplate {
  private readonly dividend: StyleTemplate;
  private readonly divisor: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.dividend = args[0]!;
    this.divisor = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.dividend.run(state, effects);
    this.divisor.run(state, effects);
  }

  getInteger(led: number): number {
    const a = this.dividend.getInteger(led);
    const b = this.divisor.getInteger(led);
    if (b === 0) return 0;
    return a % b;
  }

  getChildren(): StyleTemplate[] {
    return [this.dividend, this.divisor];
  }
}

// ─── BendTimePowX<TimeFunc, Exponent> ───
// Time-bending easing power curve: t^(N/32768) where t is normalized input.

export class BendTimePowXTemplate extends BaseStyleTemplate {
  private readonly timeFunc: StyleTemplate;
  private readonly exponent: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.timeFunc = args[0]!;
    this.exponent = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.timeFunc.run(state, effects);
    this.exponent.run(state, effects);
  }

  getInteger(led: number): number {
    const t = this.timeFunc.getInteger(led) / PROFFIE_MAX; // normalize to 0-1
    const n = this.exponent.getInteger(led);
    if (n <= 0) return this.timeFunc.getInteger(led);
    const power = n / PROFFIE_MAX;
    // t^power, clamped to [0, 1]
    const clamped = clamp(t, 0, 1);
    const result = Math.pow(clamped, power);
    return Math.round(clamp(result, 0, 1) * PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.timeFunc, this.exponent];
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

  getChildren(): StyleTemplate[] {
    return [this.time, this.bend];
  }
}

// ─── HoldPeakF<Input, Delay> ───
// Holds the peak value of Input for Delay milliseconds after it starts decreasing.

export class HoldPeakFTemplate extends BaseStyleTemplate {
  private readonly input: StyleTemplate;
  private readonly delay: StyleTemplate;
  private peak = 0;
  private peakTime = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.input = args[0]!;
    this.delay = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.input.run(state, effects);
    this.delay.run(state, effects);

    const current = this.input.getInteger(0);
    if (current >= this.peak) {
      this.peak = current;
      this.peakTime = state.timeMs;
    } else {
      const delayMs = this.delay.getInteger(0);
      if (state.timeMs - this.peakTime > delayMs) {
        this.peak = current;
        this.peakTime = state.timeMs;
      }
    }
  }

  getInteger(_led: number): number {
    return clamp(this.peak, 0, PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.input, this.delay];
  }
}

// ─── EffectIncrementF<EffectType, MaxCount, Divisor> ───
// Counts effect occurrences, returns count/divisor as integer. Resets at MaxCount.

export class EffectIncrementFTemplate extends BaseStyleTemplate {
  private readonly effectArg: StyleTemplate;
  private readonly maxCount: StyleTemplate;
  private readonly divisor: StyleTemplate;
  private count = 0;
  private lastEventTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.effectArg = args[0]!;
    this.maxCount = args[1]!;
    this.divisor = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.effectArg.run(state, effects);
    this.maxCount.run(state, effects);
    this.divisor.run(state, effects);

    // Use clash as a proxy trigger for counting
    const event = effects.getLastEffect('EFFECT_CLASH');
    if (event && event.startTimeMs > this.lastEventTime) {
      this.lastEventTime = event.startTimeMs;
      this.count++;
      const maxC = this.maxCount.getInteger(0);
      if (maxC > 0 && this.count >= maxC) {
        this.count = 0;
      }
    }
  }

  getInteger(led: number): number {
    const div = this.divisor.getInteger(led);
    if (div <= 0) return 0;
    return clamp(Math.floor(this.count / div), 0, PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.effectArg, this.maxCount, this.divisor];
  }
}

// ─── LinearSectionF<Position, Width> ───
// Returns PROFFIE_MAX for LEDs within a linear section, 0 otherwise.
// Both args are 0-32768 scale.

export class LinearSectionFTemplate extends BaseStyleTemplate {
  private readonly position: StyleTemplate;
  private readonly width: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.position = args[0]!;
    this.width = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.position.run(state, effects);
    this.width.run(state, effects);
  }

  getInteger(led: number): number {
    const pos = this.position.getInteger(led);
    const width = this.width.getInteger(led);
    const bladePos = ledToBladePos(led, this.state.numLeds);

    const halfWidth = width / 2;
    const lo = pos - halfWidth;
    const hi = pos + halfWidth;

    if (bladePos >= lo && bladePos <= hi) {
      return PROFFIE_MAX;
    }
    return 0;
  }

  getChildren(): StyleTemplate[] {
    return [this.position, this.width];
  }
}

// ─── IsGreaterThan<A, B> ───
// Returns PROFFIE_MAX if A > B, else 0.

export class IsGreaterThanTemplate extends BaseStyleTemplate {
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
    return this.a.getInteger(led) > this.b.getInteger(led) ? PROFFIE_MAX : 0;
  }

  getColor(led: number): Color {
    return this.getInteger(led) > 0 ? { r: 255, g: 255, b: 255 } : BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.a, this.b];
  }
}

// ─── SlowNoise<Speed> ───
// Smooth noise function that changes slowly based on Speed.

export class SlowNoiseTemplate extends BaseStyleTemplate {
  private readonly speed: StyleTemplate;
  private noiseValue = PROFFIE_MAX / 2;
  private noiseTarget = PROFFIE_MAX / 2;
  private targetTime = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.speed = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.speed.run(state, effects);

    const speedVal = this.speed.getInteger(0);
    // Speed controls how fast the noise changes; higher = faster transitions
    const intervalMs = speedVal > 0 ? Math.max(50, 100000 / speedVal) : 2000;

    if (state.timeMs >= this.targetTime) {
      this.noiseTarget = Math.floor(hashPair(Math.floor(state.timeMs / intervalMs), 1337) * PROFFIE_MAX);
      this.targetTime = state.timeMs + intervalMs;
    }

    // Smooth interpolation toward target
    const rate = clamp(state.deltaMsF / intervalMs, 0, 1);
    this.noiseValue += (this.noiseTarget - this.noiseValue) * rate;
  }

  getInteger(_led: number): number {
    return clamp(Math.round(this.noiseValue), 0, PROFFIE_MAX);
  }

  getChildren(): StyleTemplate[] {
    return [this.speed];
  }
}

// ─── SwingAcceleration<> ───
// Returns swing acceleration (rate of change of swing speed) as 0-32768.

export class SwingAccelerationTemplate extends BaseStyleTemplate {
  private prevSwingSpeed = 0;
  private acceleration = 0;

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);

    if (state.deltaMsF > 0) {
      const delta = state.swingSpeed - this.prevSwingSpeed;
      // Acceleration in units per ms, scaled to 0-32768
      // Use absolute value — we care about magnitude of change
      this.acceleration = Math.abs(delta);
    }
    this.prevSwingSpeed = state.swingSpeed;
  }

  getInteger(_led: number): number {
    return clamp(this.acceleration, 0, PROFFIE_MAX);
  }
}

// ─── SparkleF<SparkChance> ───
// Per-LED random sparkle function. Returns PROFFIE_MAX with 1/SparkChance
// probability per frame per LED, else 0.

export class SparkleFTemplate extends BaseStyleTemplate {
  private readonly chance: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.chance = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.chance.run(state, effects);
  }

  getInteger(led: number): number {
    const chance = this.chance.getInteger(led);
    if (chance <= 0) return 0;

    const rng = hashPair(led, Math.floor(this.state.timeMs / 16));
    return rng < (1 / chance) ? PROFFIE_MAX : 0;
  }

  getChildren(): StyleTemplate[] {
    return [this.chance];
  }
}

// ─── Remap<F, Shape> ───
// Remaps a function using a lookup shape. F provides the x-coordinate (0-32768),
// Shape provides the y-value at position x/32768 along the blade.

export class RemapTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly shape: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.shape = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.shape.run(state, effects);
  }

  getInteger(led: number): number {
    const x = this.func.getInteger(led);
    // Map x from 0-32768 to a virtual LED position within numLeds
    const numLeds = this.state.numLeds || 144;
    const virtualLed = clamp(Math.round((x / PROFFIE_MAX) * (numLeds - 1)), 0, numLeds - 1);
    return this.shape.getInteger(virtualLed);
  }

  getColor(led: number): Color {
    const x = this.func.getInteger(led);
    const numLeds = this.state.numLeds || 144;
    const virtualLed = clamp(Math.round((x / PROFFIE_MAX) * (numLeds - 1)), 0, numLeds - 1);
    return this.shape.getColor(virtualLed);
  }

  getChildren(): StyleTemplate[] {
    return [this.func, this.shape];
  }
}

// ─── IsBetween<F, Bottom, Top> ───
// Returns PROFFIE_MAX if F() is between Bottom and Top, else 0.

export class IsBetweenTemplate extends BaseStyleTemplate {
  private readonly func: StyleTemplate;
  private readonly bottom: StyleTemplate;
  private readonly top: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.func = args[0]!;
    this.bottom = args[1]!;
    this.top = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.func.run(state, effects);
    this.bottom.run(state, effects);
    this.top.run(state, effects);
  }

  getInteger(led: number): number {
    const v = this.func.getInteger(led);
    const lo = this.bottom.getInteger(led);
    const hi = this.top.getInteger(led);
    return (v >= lo && v <= hi) ? PROFFIE_MAX : 0;
  }

  getColor(_led: number): Color { return BLACK; }

  getChildren(): StyleTemplate[] {
    return [this.func, this.bottom, this.top];
  }
}

// ─── IncrementModulo<PulseMs, ModuloMs> ───
// Counter that increments by one each PulseMs, wrapping at ModuloMs.
// Returns 0..PROFFIE_MAX mapped from 0..ModuloMs.

export class IncrementModuloTemplate extends BaseStyleTemplate {
  private readonly pulseMs: StyleTemplate;
  private readonly moduloMs: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.pulseMs = args[0]!;
    this.moduloMs = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.pulseMs.run(state, effects);
    this.moduloMs.run(state, effects);
  }

  getInteger(led: number): number {
    const moduloMs = Math.max(1, this.moduloMs.getInteger(led));
    const phase = (this.state.timeMs % moduloMs) / moduloMs;
    return Math.round(phase * PROFFIE_MAX);
  }

  getColor(_led: number): Color { return BLACK; }

  getChildren(): StyleTemplate[] {
    return [this.pulseMs, this.moduloMs];
  }
}

// ─── CircularSectionF<Position, Width> ───
// Returns PROFFIE_MAX for LEDs within a circular (wrapping) section
// centered at Position with the given Width, else 0.

export class CircularSectionFTemplate extends BaseStyleTemplate {
  private readonly position: StyleTemplate;
  private readonly width: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.position = args[0]!;
    this.width = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.position.run(state, effects);
    this.width.run(state, effects);
  }

  getInteger(led: number): number {
    const numLeds = this.state.numLeds || 144;
    const pos = this.position.getInteger(led) / PROFFIE_MAX;
    const width = this.width.getInteger(led) / PROFFIE_MAX;
    const bladePos = led / Math.max(1, numLeds - 1);

    // Circular distance (wrapping around)
    let dist = Math.abs(bladePos - pos);
    if (dist > 0.5) dist = 1 - dist;

    const halfWidth = width / 2;
    return dist <= halfWidth ? PROFFIE_MAX : 0;
  }

  getColor(_led: number): Color { return BLACK; }

  getChildren(): StyleTemplate[] {
    return [this.position, this.width];
  }
}

// ─── TwistAcceleration<> ───
// Returns the rate of change of TwistAngle, 0-PROFFIE_MAX.

export class TwistAccelerationTemplate extends BaseStyleTemplate {
  private prevTwist = 0;

  constructor(_args: StyleTemplate[]) {
    super();
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
  }

  getInteger(_led: number): number {
    const twist = this.state.twistAngle;
    const dt = this.state.deltaMsF || 1;
    const accel = Math.abs(twist - this.prevTwist) / dt;
    this.prevTwist = twist;
    // Scale: raw delta per ms → 0..PROFFIE_MAX
    return clamp(Math.round(accel * 200), 0, PROFFIE_MAX);
  }

  getColor(_led: number): Color { return BLACK; }
  getChildren(): StyleTemplate[] { return []; }
}

// ─── IntSelect<Selection, Int1, Int2, ...> ───
// Selects one of several integer children based on a selector value.

export class IntSelectTemplate extends BaseStyleTemplate {
  private readonly selector: StyleTemplate;
  private readonly options: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.selector = args[0]!;
    this.options = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.selector.run(state, effects);
    for (const opt of this.options) opt.run(state, effects);
  }

  getInteger(led: number): number {
    if (this.options.length === 0) return 0;
    const sel = this.selector.getInteger(led);
    const idx = clamp(Math.round((sel / PROFFIE_MAX) * (this.options.length - 1)), 0, this.options.length - 1);
    return this.options[idx]!.getInteger(led);
  }

  getColor(led: number): Color {
    if (this.options.length === 0) return BLACK;
    const sel = this.selector.getInteger(led);
    const idx = clamp(Math.round((sel / PROFFIE_MAX) * (this.options.length - 1)), 0, this.options.length - 1);
    return this.options[idx]!.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.selector, ...this.options];
  }
}

// ─── BlastF<FadeMs?, Size?> ───
// Function version: returns 0-PROFFIE_MAX based on blast proximity + time.

export class BlastFTemplate extends BaseStyleTemplate {
  private readonly fadeMs: number;
  private readonly size: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.fadeMs = args[0]?.getInteger(0) ?? 200;
    this.size = args[1]?.getInteger(0) ?? (PROFFIE_MAX / 4);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
  }

  getInteger(led: number): number {
    const effects = this.effects;
    if (!effects) return 0;

    const blasts = effects.getEffects('EFFECT_BLAST');
    if (blasts.length === 0) return 0;

    const numLeds = this.state.numLeds || 144;
    let maxVal = 0;

    for (const event of blasts) {
      const elapsed = this.state.timeMs - event.startTimeMs;
      if (elapsed >= this.fadeMs || elapsed < 0) continue;

      const bladePos = ledToBladePos(led, numLeds);
      const spatial = bumpFn(bladePos, event.location, this.size) / PROFFIE_MAX;
      const timeFade = 1 - elapsed / this.fadeMs;
      maxVal = Math.max(maxVal, spatial * timeFade);
    }

    return clamp(Math.round(maxVal * PROFFIE_MAX), 0, PROFFIE_MAX);
  }

  getColor(_led: number): Color { return BLACK; }
  getChildren(): StyleTemplate[] { return []; }
}
