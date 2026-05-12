// ─── Transition Templates ───
// TrInstant, TrFade, TrWipe, TrWipeIn, TrCenterWipe, TrSmoothFade, TrDelay,
// TrConcat, TrJoin, TrExtend, TrWipeX, TrWipeInX, TrFadeX, TrWaveX, etc.
// Clean-room implementations based on ProffieOS documented behavior.
//
// Transitions in ProffieOS produce a per-LED mix value (0-32768) that blends
// between an "old" color and a "new" color over time. They are used by
// InOutTrL (ignition/retraction), LockupTrL, TransitionEffectL, etc.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, StyleTemplate } from '../types.js';
import { BLACK, clamp, PROFFIE_MAX } from '../types.js';
import { hashPair } from '../utils.js';

// ─── TrInstant ───
// Instant transition — jumps from old to new immediately.

export class TrInstantTemplate extends BaseStyleTemplate {
  getColor(_led: number): Color {
    return BLACK;
  }

  getInteger(_led: number): number {
    // Always fully transitioned
    return PROFFIE_MAX;
  }
}

// ─── TrFade<Ms> ───
// Linear fade over the specified duration.

export class TrFadeTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(_led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / this.durationMs, 0, 1);
    return Math.round(t * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrFadeX<Ms> ───
// Same as TrFade but Ms is a function, evaluated per frame.

export class TrFadeXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / durationMs, 0, 1);
    return Math.round(t * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrSmoothFade<Ms> ───
// Sine-smoothed (Hermite) fade over the specified duration.

export class TrSmoothFadeTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(_led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / this.durationMs, 0, 1);
    // Hermite smoothstep
    const smooth = t * t * (3 - 2 * t);
    return Math.round(smooth * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrWipe<Ms> ───
// Wipe from hilt (LED 0) to tip (LED N-1).

export class TrWipeTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    // LED is fully transitioned if its position is before the wipe front
    if (ledPos <= progress) return PROFFIE_MAX;
    // LED is untransitioned if well ahead of the wipe front
    if (ledPos > progress + 0.05) return 0;
    // Smooth edge zone
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrWipeX<Ms> ───
// Same as TrWipe but with function-based duration.

export class TrWipeXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    if (ledPos <= progress) return PROFFIE_MAX;
    if (ledPos > progress + 0.05) return 0;
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrWipeIn<Ms> ───
// Wipe from tip (LED N-1) to hilt (LED 0).

export class TrWipeInTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = 1 - led / Math.max(1, numLeds - 1); // Reversed

    if (ledPos <= progress) return PROFFIE_MAX;
    if (ledPos > progress + 0.05) return 0;
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrWipeInX<Ms> ───

export class TrWipeInXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = 1 - led / Math.max(1, numLeds - 1);

    if (ledPos <= progress) return PROFFIE_MAX;
    if (ledPos > progress + 0.05) return 0;
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrCenterWipe<Ms> ───
// Wipe from center outward to both ends.

export class TrCenterWipeTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);

    // Distance from center (0 = center, 0.5 = ends)
    const ledPos = led / Math.max(1, numLeds - 1);
    const distFromCenter = Math.abs(ledPos - 0.5) * 2; // 0 at center, 1 at ends

    if (distFromCenter <= progress) return PROFFIE_MAX;
    if (distFromCenter > progress + 0.05) return 0;
    const edge = (distFromCenter - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrCenterWipeX<Ms> ───

export class TrCenterWipeXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);
    const distFromCenter = Math.abs(ledPos - 0.5) * 2;

    if (distFromCenter <= progress) return PROFFIE_MAX;
    if (distFromCenter > progress + 0.05) return 0;
    const edge = (distFromCenter - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrDelay<Ms> ───
// Delay before completing the transition. Returns 0 until the delay is up.

export class TrDelayTemplate extends BaseStyleTemplate {
  private readonly delayMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.delayMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(_led: number): number {
    const elapsed = this.state.timeMs - this.startTime;
    return elapsed >= this.delayMs ? PROFFIE_MAX : 0;
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrConcat<Tr1, Color1, Tr2, Color2, ..., TrN> ───
// Concatenates transitions with intermediate colors.
// Odd indices are transitions, even indices are colors.
// The last element is always a transition.

export class TrConcatTemplate extends BaseStyleTemplate {
  private readonly transitions: StyleTemplate[];
  private readonly intermediateColors: StyleTemplate[];
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    // Parse: Tr1, Color1, Tr2, Color2, ..., TrN
    // Transitions at indices 0, 2, 4, ...
    // Colors at indices 1, 3, 5, ...
    this.transitions = [];
    this.intermediateColors = [];
    for (let i = 0; i < args.length; i++) {
      if (i % 2 === 0) {
        this.transitions.push(args[i]);
      } else {
        this.intermediateColors.push(args[i]);
      }
    }
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
    for (const tr of this.transitions) tr.run(state, effects);
    for (const c of this.intermediateColors) c.run(state, effects);
  }

  getInteger(led: number): number {
    // For now, treat the whole concat as the first transition's progress
    if (this.transitions.length > 0) {
      return this.transitions[0].getInteger(led);
    }
    return PROFFIE_MAX;
  }

  getColor(led: number): Color {
    if (this.intermediateColors.length > 0) {
      return this.intermediateColors[0].getColor(led);
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [...this.transitions, ...this.intermediateColors];
  }
}

// ─── TrJoin<Tr1, Tr2> ───
// Runs two transitions simultaneously, taking the maximum progress.

export class TrJoinTemplate extends BaseStyleTemplate {
  private readonly tr1: StyleTemplate;
  private readonly tr2: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.tr1 = args[0]!;
    this.tr2 = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.tr1.run(state, effects);
    this.tr2.run(state, effects);
  }

  getInteger(led: number): number {
    return Math.max(this.tr1.getInteger(led), this.tr2.getInteger(led));
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.tr1, this.tr2];
  }
}

// ─── TrJoinR<Tr1, Tr2> ───
// Runs two transitions simultaneously, taking the minimum progress.

export class TrJoinRTemplate extends BaseStyleTemplate {
  private readonly tr1: StyleTemplate;
  private readonly tr2: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.tr1 = args[0]!;
    this.tr2 = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.tr1.run(state, effects);
    this.tr2.run(state, effects);
  }

  getInteger(led: number): number {
    return Math.min(this.tr1.getInteger(led), this.tr2.getInteger(led));
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.tr1, this.tr2];
  }
}

// ─── TrExtend<Ms, Tr> ───
// Extends a transition by adding extra time at the end.

export class TrExtendTemplate extends BaseStyleTemplate {
  private readonly extraMs: number;
  private readonly transition: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.extraMs = args[0]?.getInteger(0) ?? 0;
    this.transition = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.transition.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const trVal = this.transition.getInteger(led);
    if (trVal >= PROFFIE_MAX) {
      const elapsed = this.state.timeMs - this.startTime;
      if (elapsed >= this.extraMs) return PROFFIE_MAX;
      return Math.round((elapsed / this.extraMs) * PROFFIE_MAX);
    }
    return trVal;
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.transition];
  }
}

// ─── TrWaveX<Color, Fadeout, WaveSize, WaveMs, WaveCenter> ───
// Wave effect centered on a point, used for blast/clash effects.

export class TrWaveXTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly fadeoutMs: StyleTemplate;
  private readonly waveSize: StyleTemplate;
  private readonly waveMs: StyleTemplate;
  private readonly waveCenter: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.fadeoutMs = args[1]!;
    this.waveSize = args[2] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 200; }, getChildren() { return []; } } as StyleTemplate;
    this.waveMs = args[3] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 100; }, getChildren() { return []; } } as StyleTemplate;
    this.waveCenter = args[4] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return PROFFIE_MAX / 2; }, getChildren() { return []; } } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.fadeoutMs.run(state, effects);
    this.waveSize.run(state, effects);
    this.waveMs.run(state, effects);
    this.waveCenter.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getColor(led: number): Color {
    const elapsed = this.state.timeMs - this.startTime;
    const fadeout = this.fadeoutMs.getInteger(led);
    if (fadeout > 0 && elapsed >= fadeout) return BLACK;

    const numLeds = this.state.numLeds || 144;
    const center = (this.waveCenter.getInteger(led) / PROFFIE_MAX) * numLeds;
    const size = this.waveSize.getInteger(led) / PROFFIE_MAX * numLeds;
    const speed = this.waveMs.getInteger(led);

    // Wave expands from center over time
    const radius = speed > 0 ? (elapsed / speed) * numLeds : numLeds;
    const dist = Math.abs(led - center);

    // Check if LED is within the wave ring
    const ringDist = Math.abs(dist - radius);
    if (ringDist > size) return BLACK;

    const brightness = 1 - ringDist / size;
    // Fadeout over time
    const fadeAlpha = fadeout > 0 ? 1 - elapsed / fadeout : 1;
    const alpha = brightness * fadeAlpha;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.max(c.r, c.g, c.b) * 128;
  }

  getChildren(): StyleTemplate[] {
    return [this.color, this.fadeoutMs, this.waveSize, this.waveMs, this.waveCenter];
  }
}

// ─── TrCenterWipeIn<Ms> ───
// Wipe from both ends toward center.

export class TrCenterWipeInTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);
    // Distance from nearest end (0 at ends, 0.5 at center)
    const distFromEnd = Math.min(ledPos, 1 - ledPos) * 2;

    if (distFromEnd <= progress) return PROFFIE_MAX;
    if (distFromEnd > progress + 0.05) return 0;
    const edge = (distFromEnd - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrCenterWipeInX<Ms> ───

export class TrCenterWipeInXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);
    const distFromEnd = Math.min(ledPos, 1 - ledPos) * 2;

    if (distFromEnd <= progress) return PROFFIE_MAX;
    if (distFromEnd > progress + 0.05) return 0;
    const edge = (distFromEnd - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrCenterWipeInSpark<Ms, SparkColor> ───
// Center-in wipe with spark particles at the leading edge.
// Same wipe geometry as TrCenterWipeIn but adds randomized
// bright spark pixels near the wipe front.

export class TrCenterWipeInSparkTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private readonly sparkColor: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
    this.sparkColor = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.sparkColor.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);
    // Distance from nearest end (0 at ends, 0.5 at center)
    const distFromEnd = Math.min(ledPos, 1 - ledPos) * 2;

    if (distFromEnd <= progress) return PROFFIE_MAX;
    if (distFromEnd > progress + 0.05) return 0;
    const edge = (distFromEnd - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    if (this.durationMs <= 0) return BLACK;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);
    const distFromEnd = Math.min(ledPos, 1 - ledPos) * 2;

    // Spark zone: pixels near the wipe front (within 10% of blade length)
    const sparkZoneWidth = 0.10;
    const distFromFront = distFromEnd - progress;
    if (distFromFront > 0 && distFromFront < sparkZoneWidth && progress < 1) {
      // Pseudo-random spark: deterministic per LED per time slice
      const sparkHash = hashPair(led, Math.floor(this.state.timeMs / 20));
      if (sparkHash > 0.6) {
        // Spark is active — blend spark color with proximity falloff
        const proximity = 1 - distFromFront / sparkZoneWidth;
        const sparkC = this.sparkColor.getColor(led);
        return {
          r: Math.round(sparkC.r * proximity * sparkHash),
          g: Math.round(sparkC.g * proximity * sparkHash),
          b: Math.round(sparkC.b * proximity * sparkHash),
        };
      }
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.sparkColor];
  }
}

// ─── TrBoingX<Ms, N> ───
// Bounce/spring easing transition. Overshoots and settles with N bounces.
// The X suffix means duration is a function argument.

export class TrBoingXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private readonly bounceCount: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
    this.bounceCount = args[1]?.getInteger(0) ?? 3;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / durationMs, 0, 1);

    // Bounce/spring easing: overshoot then settle
    const n = Math.max(1, this.bounceCount);
    const decay = Math.exp(-4 * t);
    const oscillation = Math.cos(t * n * Math.PI);
    // At t=0: boing = 1 - 1*1 = 0; at t=1: boing approaches 1
    const boing = 1 - decay * oscillation;
    return Math.round(clamp(boing, 0, 1) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// ─── TrBoing<Ms, N> ───
// Same as TrBoingX but with literal integer duration.

export class TrBoingTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private readonly bounceCount: number;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
    this.bounceCount = args[1]?.getInteger(0) ?? 3;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(_led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / this.durationMs, 0, 1);

    const n = Math.max(1, this.bounceCount);
    const decay = Math.exp(-4 * t);
    const oscillation = Math.cos(t * n * Math.PI);
    const boing = 1 - decay * oscillation;
    return Math.round(clamp(boing, 0, 1) * PROFFIE_MAX);
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrColorCycleX<Ms> ───
// Color-cycling transition. Rotates hue from the old color toward the
// new color over the given duration. Returns the cycling color via
// getColor() and progress via getInteger().

export class TrColorCycleXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    return Math.round(clamp(elapsed / durationMs, 0, 1) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return BLACK;
    const elapsed = this.state.timeMs - this.startTime;
    const t = clamp(elapsed / durationMs, 0, 1);
    // Cycle through hue: 0->360 degrees over the transition
    const hue = t * 360;
    return hslToRgbLocal(hue, 1, 0.5);
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc];
  }
}

// Local HSL→RGB helper for TrColorCycleX (avoids importing from colors.ts)
function hslToRgbLocal(h: number, s: number, l: number): Color {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

// ─── TrDelayX<Ms> ───
// Function-arg version of TrDelay. Snap transition after dynamic delay.

export class TrDelayXTemplate extends BaseStyleTemplate {
  private readonly delayFunc: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.delayFunc = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.delayFunc.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const delayMs = this.delayFunc.getInteger(led);
    const elapsed = this.state.timeMs - this.startTime;
    return elapsed >= delayMs ? PROFFIE_MAX : 0;
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.delayFunc];
  }
}

// ─── TrDoEffect<Effect, WavNum?, Location?> ───
// No-op transition that triggers an effect when the transition starts.
// Returns PROFFIE_MAX immediately (instant transition).

export class TrDoEffectTemplate extends BaseStyleTemplate {
  private triggered = false;

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    // Trigger the effect once on first run
    if (!this.triggered) {
      this.triggered = true;
      // The first arg identifies the effect type; we trigger EFFECT_USER1 as
      // a sensible default since the actual effect type comes from the parsed
      // enum value which we can't resolve at construction time.
      effects.triggerEffect('EFFECT_USER1');
    }
  }

  getInteger(_led: number): number {
    return PROFFIE_MAX;
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrDoEffectAlwaysX<Effect, WavNum?, Location?> ───
// Like TrDoEffect but re-triggers every time the transition is reset.
// For our interpreter this behaves the same as TrDoEffect since transitions
// are instantiated fresh per use.

export class TrDoEffectAlwaysXTemplate extends BaseStyleTemplate {
  private triggered = false;

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    if (!this.triggered) {
      this.triggered = true;
      effects.triggerEffect('EFFECT_USER1');
    }
  }

  getInteger(_led: number): number {
    return PROFFIE_MAX;
  }

  getColor(_led: number): Color {
    return BLACK;
  }
}

// ─── TrSelect<Selection, Tr1, Tr2, ...> ───
// Selects one transition from a list based on a selection function value.
// The selection function's integer output (0-32768) is mapped to an index
// in the transition list via modulo.

export class TrSelectTemplate extends BaseStyleTemplate {
  private readonly selection: StyleTemplate;
  private readonly transitions: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.selection = args[0]!;
    this.transitions = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.selection.run(state, effects);
    for (const tr of this.transitions) tr.run(state, effects);
  }

  getInteger(led: number): number {
    if (this.transitions.length === 0) return PROFFIE_MAX;
    const sel = this.selection.getInteger(led);
    const idx = Math.abs(sel) % this.transitions.length;
    return this.transitions[idx].getInteger(led);
  }

  getColor(led: number): Color {
    if (this.transitions.length === 0) return BLACK;
    const sel = this.selection.getInteger(led);
    const idx = Math.abs(sel) % this.transitions.length;
    return this.transitions[idx].getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.selection, ...this.transitions];
  }
}

// ─── TrSparkX<SparkColor, SparkSize, Ms, SparkCenter> ───
// Expanding spark coverage over time. Sparks appear randomly and
// grow in coverage from center outward over the transition duration.

export class TrSparkXTemplate extends BaseStyleTemplate {
  private readonly sparkColor: StyleTemplate;
  private readonly sparkSize: StyleTemplate;
  private readonly durationFunc: StyleTemplate;
  private readonly sparkCenter: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.sparkColor = args[0]!;
    this.sparkSize = args[1] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 400; }, getChildren() { return []; } } as StyleTemplate;
    this.durationFunc = args[2] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 200; }, getChildren() { return []; } } as StyleTemplate;
    this.sparkCenter = args[3] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return PROFFIE_MAX / 2; }, getChildren() { return []; } } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.sparkColor.run(state, effects);
    this.sparkSize.run(state, effects);
    this.durationFunc.run(state, effects);
    this.sparkCenter.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    return Math.round(clamp(elapsed / durationMs, 0, 1) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return BLACK;
    const elapsed = this.state.timeMs - this.startTime;
    if (elapsed >= durationMs) return BLACK;

    const progress = clamp(elapsed / durationMs, 0, 1);
    const numLeds = this.state.numLeds || 144;
    const center = (this.sparkCenter.getInteger(led) / PROFFIE_MAX) * numLeds;
    const size = (this.sparkSize.getInteger(led) / PROFFIE_MAX) * numLeds;
    const dist = Math.abs(led - center);

    // Spark zone expands with progress
    const coverage = size * progress;
    if (dist > coverage) return BLACK;

    // Pseudo-random spark per LED per time slice
    const sparkHash = hashPair(led, Math.floor(this.state.timeMs / 20));
    if (sparkHash < 0.5) return BLACK;

    const proximity = 1 - dist / Math.max(1, coverage);
    const timeFade = 1 - progress;
    const alpha = proximity * timeFade * sparkHash;

    const c = this.sparkColor.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.sparkColor, this.sparkSize, this.durationFunc, this.sparkCenter];
  }
}

// ─── TrWipeSparkTip<Ms, SparkColor> ───
// Wipe from hilt to tip with spark particles at the leading edge.
// Combines TrWipe geometry with spark randomization near the wipe front.

export class TrWipeSparkTipTemplate extends BaseStyleTemplate {
  private readonly durationMs: number;
  private readonly sparkColor: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]?.getInteger(0) ?? 300;
    this.sparkColor = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.sparkColor.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    if (this.durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    if (ledPos <= progress) return PROFFIE_MAX;
    if (ledPos > progress + 0.05) return 0;
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    if (this.durationMs <= 0) return BLACK;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / this.durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    // Spark zone: pixels near the wipe front (within 10% of blade)
    const sparkZoneWidth = 0.10;
    const distFromFront = ledPos - progress;
    if (distFromFront > 0 && distFromFront < sparkZoneWidth && progress < 1) {
      const sparkHash = hashPair(led, Math.floor(this.state.timeMs / 20));
      if (sparkHash > 0.6) {
        const proximity = 1 - distFromFront / sparkZoneWidth;
        const sparkC = this.sparkColor.getColor(led);
        return {
          r: Math.round(sparkC.r * proximity * sparkHash),
          g: Math.round(sparkC.g * proximity * sparkHash),
          b: Math.round(sparkC.b * proximity * sparkHash),
        };
      }
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.sparkColor];
  }
}

// ─── TrWipeSparkTipX<Ms, SparkColor> ───
// Function-arg version of TrWipeSparkTip.

export class TrWipeSparkTipXTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private readonly sparkColor: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
    this.sparkColor = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    this.sparkColor.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    if (ledPos <= progress) return PROFFIE_MAX;
    if (ledPos > progress + 0.05) return 0;
    const edge = (ledPos - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return BLACK;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const ledPos = led / Math.max(1, numLeds - 1);

    const sparkZoneWidth = 0.10;
    const distFromFront = ledPos - progress;
    if (distFromFront > 0 && distFromFront < sparkZoneWidth && progress < 1) {
      const sparkHash = hashPair(led, Math.floor(this.state.timeMs / 20));
      if (sparkHash > 0.6) {
        const proximity = 1 - distFromFront / sparkZoneWidth;
        const sparkC = this.sparkColor.getColor(led);
        return {
          r: Math.round(sparkC.r * proximity * sparkHash),
          g: Math.round(sparkC.g * proximity * sparkHash),
          b: Math.round(sparkC.b * proximity * sparkHash),
        };
      }
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc, this.sparkColor];
  }
}

// ─── TrBlink<MILLIS, ONMS, OFFMS> ───
// Blink transition — alternates between fully transitioned and not,
// producing a blinking on/off pattern over the transition duration.

export class TrBlinkTemplate extends BaseStyleTemplate {
  private readonly durationMs: StyleTemplate;
  private readonly onMs: StyleTemplate;
  private readonly offMs: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationMs = args[0]!;
    this.onMs = args[1] ?? { run() {}, getInteger() { return 100; }, getColor() { return BLACK; }, getChildren() { return []; } } as StyleTemplate;
    this.offMs = args[2] ?? { run() {}, getInteger() { return 100; }, getColor() { return BLACK; }, getChildren() { return []; } } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationMs.run(state, effects);
    this.onMs.run(state, effects);
    this.offMs.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const duration = this.durationMs.getInteger(led);
    if (duration <= 0) return PROFFIE_MAX;
    const elapsed = this.state.timeMs - this.startTime;
    if (elapsed >= duration) return PROFFIE_MAX;
    const onMs = Math.max(1, this.onMs.getInteger(led));
    const offMs = Math.max(1, this.offMs.getInteger(led));
    const period = onMs + offMs;
    const phase = elapsed % period;
    return phase < onMs ? PROFFIE_MAX : 0;
  }

  getColor(_led: number): Color { return BLACK; }
  getChildren(): StyleTemplate[] { return [this.durationMs, this.onMs, this.offMs]; }
}

// ─── TrCenterWipeSpark<MILLIS, SPARK_COLOR> ───
// Center-out wipe transition with spark trail. Wipe starts from the
// center of the blade and extends toward both ends simultaneously,
// with random spark pixels near the wipe front.

export class TrCenterWipeSparkTemplate extends BaseStyleTemplate {
  private readonly durationFunc: StyleTemplate;
  private readonly sparkColor: StyleTemplate;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.durationFunc = args[0]!;
    this.sparkColor = args[1] ?? { run() {}, getColor() { return { r: 255, g: 255, b: 255 }; }, getInteger() { return PROFFIE_MAX; }, getChildren() { return []; } } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.durationFunc.run(state, effects);
    this.sparkColor.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
    }
  }

  getInteger(led: number): number {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return PROFFIE_MAX;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const center = (numLeds - 1) / 2;
    const maxDist = center;
    const distFromCenter = Math.abs(led - center) / Math.max(1, maxDist);

    // Wipe extends outward from center
    if (distFromCenter <= progress) return PROFFIE_MAX;
    if (distFromCenter > progress + 0.05) return 0;
    const edge = (distFromCenter - progress) / 0.05;
    return Math.round((1 - edge) * PROFFIE_MAX);
  }

  getColor(led: number): Color {
    const durationMs = this.durationFunc.getInteger(led);
    if (durationMs <= 0) return BLACK;
    const numLeds = this.state.numLeds || 144;
    const elapsed = this.state.timeMs - this.startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const center = (numLeds - 1) / 2;
    const maxDist = center;
    const distFromCenter = Math.abs(led - center) / Math.max(1, maxDist);

    const sparkZoneWidth = 0.10;
    const distFromFront = distFromCenter - progress;
    if (distFromFront > 0 && distFromFront < sparkZoneWidth && progress < 1) {
      const sparkHash = hashPair(led, Math.floor(this.state.timeMs / 20));
      if (sparkHash > 0.6) {
        const proximity = 1 - distFromFront / sparkZoneWidth;
        const sparkC = this.sparkColor.getColor(led);
        return {
          r: Math.round(sparkC.r * proximity * sparkHash),
          g: Math.round(sparkC.g * proximity * sparkHash),
          b: Math.round(sparkC.b * proximity * sparkHash),
        };
      }
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.durationFunc, this.sparkColor];
  }
}

// ─── TrLoopN<N, TRANSITION> ───
// Loop a transition N times, then complete.

export class TrLoopNTemplate extends BaseStyleTemplate {
  private readonly countArg: StyleTemplate;
  private readonly transition: StyleTemplate;
  private loopCount = 0;
  private startTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.countArg = args[0]!;
    this.transition = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.countArg.run(state, effects);
    this.transition.run(state, effects);
    if (this.startTime < 0) {
      this.startTime = state.timeMs;
      this.loopCount = Math.max(1, this.countArg.getInteger(0));
    }
  }

  getInteger(led: number): number {
    if (this.loopCount <= 0) return PROFFIE_MAX;
    return this.transition.getInteger(led);
  }

  getColor(led: number): Color {
    return this.transition.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.countArg, this.transition];
  }
}

// ─── TrLoopUntil<CONDITION_F, TRANSITION, END_TRANSITION> ───
// Loop first transition until condition is true, then run end transition.

export class TrLoopUntilTemplate extends BaseStyleTemplate {
  private readonly condition: StyleTemplate;
  private readonly loopTr: StyleTemplate;
  private readonly endTr: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.condition = args[0]!;
    this.loopTr = args[1]!;
    this.endTr = args[2] ?? args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.condition.run(state, effects);
    this.loopTr.run(state, effects);
    this.endTr.run(state, effects);
  }

  getInteger(led: number): number {
    const cond = this.condition.getInteger(led);
    if (cond > 0) {
      return this.endTr.getInteger(led);
    }
    return this.loopTr.getInteger(led);
  }

  getColor(led: number): Color {
    const cond = this.condition.getInteger(led);
    if (cond > 0) {
      return this.endTr.getColor(led);
    }
    return this.loopTr.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.condition, this.loopTr, this.endTr];
  }
}

// ─── TrSequence<TR1, TR2, ...> ───
// Cycle through transitions in order (variadic).

export class TrSequenceTemplate extends BaseStyleTemplate {
  private readonly transitions: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.transitions = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const tr of this.transitions) tr.run(state, effects);
  }

  getInteger(led: number): number {
    if (this.transitions.length === 0) return PROFFIE_MAX;
    // Use time to step through transitions
    const idx = Math.floor(this.state.timeMs / 500) % this.transitions.length;
    return this.transitions[idx]!.getInteger(led);
  }

  getColor(led: number): Color {
    if (this.transitions.length === 0) return BLACK;
    const idx = Math.floor(this.state.timeMs / 500) % this.transitions.length;
    return this.transitions[idx]!.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [...this.transitions];
  }
}
