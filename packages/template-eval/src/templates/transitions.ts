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
