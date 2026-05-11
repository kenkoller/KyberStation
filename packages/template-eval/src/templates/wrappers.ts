// ─── Wrapper Templates ───
// InOutTrL, InOutHelper, StyleNormalPtr, TransitionLoop, etc.
// These wrap other styles and handle ignition/retraction state machines.
// Clean-room implementations based on ProffieOS documented behavior.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, StyleTemplate } from '../types.js';
import { BLACK, clamp, PROFFIE_MAX, mixColors } from '../types.js';

// ─── InOutTrL<TrIgnition, TrRetraction, OffColor?> ───
// The standard ignition/retraction wrapper. Manages the on/off state
// transitions using the provided transition objects.
// When blade turns ON: runs TrIgnition from off→on
// When blade turns OFF: runs TrRetraction from on→off
// OffColor is the color shown when blade is fully off (defaults to Black).

export class InOutTrLTemplate extends BaseStyleTemplate {
  private readonly trIgnition: StyleTemplate;
  private readonly trRetraction: StyleTemplate;
  private readonly offColor: StyleTemplate;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;

  constructor(args: StyleTemplate[]) {
    super();
    this.trIgnition = args[0]!;
    this.trRetraction = args[1]!;
    this.offColor = args[2] ?? {
      run() { /* noop */ },
      getColor() { return BLACK; },
      getInteger() { return 0; },
      getChildren() { return []; },
    } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.trIgnition.run(state, effects);
    this.trRetraction.run(state, effects);
    this.offColor.run(state, effects);

    // Detect state transitions
    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
    }

    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    // Fully off state
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return this.offColor.getColor(led);
    }

    if (this.isIgniting) {
      const progress = this.trIgnition.getInteger(led);
      if (progress >= PROFFIE_MAX) {
        this.isIgniting = false;
      }
      // Return progress as alpha (0 = off, PROFFIE_MAX = fully on)
      // The actual color mixing is done by the parent Layers template
      const t = clamp(progress / PROFFIE_MAX, 0, 1);
      return { r: Math.round(255 * t), g: Math.round(255 * t), b: Math.round(255 * t) };
    }

    if (this.isRetracting) {
      const progress = this.trRetraction.getInteger(led);
      if (progress >= PROFFIE_MAX) {
        this.isRetracting = false;
        return this.offColor.getColor(led);
      }
      // Inverse: fully on at start, fading to off
      const t = 1 - clamp(progress / PROFFIE_MAX, 0, 1);
      return { r: Math.round(255 * t), g: Math.round(255 * t), b: Math.round(255 * t) };
    }

    // Blade is on and stable
    if (this.state.isOn) {
      return { r: 255, g: 255, b: 255 };
    }

    return this.offColor.getColor(led);
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.max(c.r, c.g, c.b) * 128;
  }

  getChildren(): StyleTemplate[] {
    return [this.trIgnition, this.trRetraction, this.offColor];
  }
}

// ─── InOutHelperL<OnColor, InMs, OutMs, OffColor?> ───
// Simplified ignition/retraction with plain millisecond durations.
// Uses linear fade for both in and out.

export class InOutHelperLTemplate extends BaseStyleTemplate {
  private readonly onColor: StyleTemplate;
  private readonly inMs: number;
  private readonly outMs: number;
  private readonly offColor: StyleTemplate;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;
  private transitionStartTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.onColor = args[0]!;
    this.inMs = args[1]?.getInteger(0) ?? 300;
    this.outMs = args[2]?.getInteger(0) ?? 300;
    this.offColor = args[3] ?? {
      run() { /* noop */ },
      getColor() { return BLACK; },
      getInteger() { return 0; },
      getChildren() { return []; },
    } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.onColor.run(state, effects);
    this.offColor.run(state, effects);

    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
      this.transitionStartTime = state.timeMs;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
      this.transitionStartTime = state.timeMs;
    }

    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return this.offColor.getColor(led);
    }

    const elapsed = this.state.timeMs - this.transitionStartTime;

    if (this.isIgniting) {
      if (elapsed >= this.inMs) {
        this.isIgniting = false;
        return this.onColor.getColor(led);
      }
      const t = clamp(elapsed / this.inMs, 0, 1);
      return mixColors(this.offColor.getColor(led), this.onColor.getColor(led), Math.round(t * PROFFIE_MAX));
    }

    if (this.isRetracting) {
      if (elapsed >= this.outMs) {
        this.isRetracting = false;
        return this.offColor.getColor(led);
      }
      const t = 1 - clamp(elapsed / this.outMs, 0, 1);
      return mixColors(this.offColor.getColor(led), this.onColor.getColor(led), Math.round(t * PROFFIE_MAX));
    }

    if (this.state.isOn) {
      return this.onColor.getColor(led);
    }

    return this.offColor.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.onColor, this.offColor];
  }
}

// ─── StyleNormalPtr<BaseColor, ClashColor, InMs, OutMs> ───
// The most common ProffieOS style wrapper. Simplified entry point.
// Equivalent to: Layers<BaseColor, InOutHelperL<BaseColor, InMs, OutMs>>

export class StyleNormalPtrTemplate extends BaseStyleTemplate {
  private readonly baseColor: StyleTemplate;
  private readonly clashColor: StyleTemplate;
  private readonly inMs: number;
  private readonly outMs: number;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;
  private transitionStartTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.baseColor = args[0]!;
    this.clashColor = args[1]!;
    this.inMs = args[2]?.getInteger(0) ?? 300;
    this.outMs = args[3]?.getInteger(0) ?? 500;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.baseColor.run(state, effects);
    this.clashColor.run(state, effects);

    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
      this.transitionStartTime = state.timeMs;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
      this.transitionStartTime = state.timeMs;
    }

    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return BLACK;
    }

    const baseColor = this.baseColor.getColor(led);
    const elapsed = this.state.timeMs - this.transitionStartTime;

    if (this.isIgniting) {
      if (elapsed >= this.inMs) {
        this.isIgniting = false;
        return baseColor;
      }
      const numLeds = this.state.numLeds || 144;
      const progress = clamp(elapsed / this.inMs, 0, 1);
      const ledPos = led / Math.max(1, numLeds - 1);
      // Wipe from hilt to tip
      if (ledPos <= progress) return baseColor;
      return BLACK;
    }

    if (this.isRetracting) {
      if (elapsed >= this.outMs) {
        this.isRetracting = false;
        return BLACK;
      }
      const numLeds = this.state.numLeds || 144;
      const progress = clamp(elapsed / this.outMs, 0, 1);
      const ledPos = 1 - led / Math.max(1, numLeds - 1);
      // Wipe from tip to hilt
      if (ledPos <= progress) return BLACK;
      return baseColor;
    }

    if (this.state.isOn) {
      return baseColor;
    }

    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.baseColor, this.clashColor];
  }
}

// ─── TransitionLoop<Color, Transition> ───
// Continuously re-runs a transition in a loop. Used for ongoing effects.

export class TransitionLoopTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly transition: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.transition = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.transition.run(state, effects);
  }

  getColor(led: number): Color {
    const t = this.transition.getInteger(led);
    const c = this.color.getColor(led);
    const alpha = clamp(t / PROFFIE_MAX, 0, 1);
    return {
      r: Math.round(c.r * alpha),
      g: Math.round(c.g * alpha),
      b: Math.round(c.b * alpha),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.color, this.transition];
  }
}

// ─── Black (as used in wrappers) ───
// Re-export for convenience in wrapper defaults — actual Black color
// is in colors.ts via the registry.

// ─── SequenceL<...Colors> ───
// Cycles through a list of colors sequentially (one per frame update).

export class SequenceLTemplate extends BaseStyleTemplate {
  private readonly colors: StyleTemplate[];
  private currentIndex = 0;
  private lastUpdateMs = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.colors = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const c of this.colors) c.run(state, effects);

    // Advance every ~100ms
    if (this.colors.length > 0 && state.timeMs - this.lastUpdateMs > 100) {
      this.lastUpdateMs = state.timeMs;
      this.currentIndex = (this.currentIndex + 1) % this.colors.length;
    }
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    return this.colors[this.currentIndex].getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return this.colors;
  }
}

// ─── StylePtr<Layers<BaseColor, ...Layers>> ───
// Thin wrapper — just delegates to the child style tree.
// In ProffieOS, StylePtr instantiates a template pointer. For the
// interpreter this is a transparent pass-through to its single argument.

export class StylePtrTemplate extends BaseStyleTemplate {
  private readonly inner: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.inner = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.inner.run(state, effects);
  }

  getColor(led: number): Color {
    return this.inner.getColor(led);
  }

  getInteger(led: number): number {
    return this.inner.getInteger(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.inner];
  }
}

// ─── StyleFirePtr<Color1, Color2, Delay?, Speed?, Norm?, InMs, OutMs> ───
// Fire style wrapped with InOutHelper-style ignition/retraction.

export class StyleFirePtrTemplate extends BaseStyleTemplate {
  private readonly color1: StyleTemplate;
  private readonly color2: StyleTemplate;
  private readonly delay: number;
  private readonly speed: number;
  private readonly inMs: number;
  private readonly outMs: number;

  private heatMap: number[] = [];
  private lastUpdate = 0;
  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;
  private transitionStartTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color1 = args[0]!;
    this.color2 = args[1]!;
    this.delay = args[2]?.getInteger(0) ?? 0;
    this.speed = args[3]?.getInteger(0) ?? 2;
    // args[4] is norm — skip
    this.inMs = args[5]?.getInteger(0) ?? 300;
    this.outMs = args[6]?.getInteger(0) ?? 500;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color1.run(state, effects);
    this.color2.run(state, effects);

    // Ignition/retraction state machine
    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
      this.transitionStartTime = state.timeMs;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
      this.transitionStartTime = state.timeMs;
    }
    this.wasOn = state.isOn;

    // Fire simulation
    const numLeds = state.numLeds || 144;
    if (this.heatMap.length !== numLeds) {
      this.heatMap = new Array(numLeds).fill(0);
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.random() * 128;
      }
    }
    const updateInterval = Math.max(10, 30 + this.delay);
    if (state.timeMs - this.lastUpdate > updateInterval) {
      this.lastUpdate = state.timeMs;
      const coolFactor = Math.max(1, this.speed * 5);
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.max(0, this.heatMap[i] - Math.random() * coolFactor);
      }
      for (let i = numLeds - 1; i >= 2; i--) {
        this.heatMap[i] = (this.heatMap[i - 1] + this.heatMap[i - 2] * 2) / 3;
      }
      if (Math.random() < 0.5) {
        const spark = Math.floor(Math.random() * 7);
        this.heatMap[spark] = Math.min(255, this.heatMap[spark] + 128 + Math.random() * 128);
      }
    }
  }

  getColor(led: number): Color {
    // Off state
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return BLACK;
    }

    // Compute fire color
    const heat = clamp(Math.round(this.heatMap[led] ?? 0), 0, 255);
    const t = heat / 255;
    const c1 = this.color1.getColor(led);
    const c2 = this.color2.getColor(led);
    const fireColor = mixColors(c2, c1, Math.round(t * PROFFIE_MAX));

    const elapsed = this.state.timeMs - this.transitionStartTime;

    if (this.isIgniting) {
      if (elapsed >= this.inMs) {
        this.isIgniting = false;
        return fireColor;
      }
      const numLeds = this.state.numLeds || 144;
      const progress = clamp(elapsed / this.inMs, 0, 1);
      const ledPos = led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return fireColor;
      return BLACK;
    }

    if (this.isRetracting) {
      if (elapsed >= this.outMs) {
        this.isRetracting = false;
        return BLACK;
      }
      const numLeds = this.state.numLeds || 144;
      const progress = clamp(elapsed / this.outMs, 0, 1);
      const ledPos = 1 - led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return BLACK;
      return fireColor;
    }

    if (this.state.isOn) {
      return fireColor;
    }

    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.color1, this.color2];
  }
}

// ─── StyleRainbowPtr<InMs, OutMs> ───
// HSL rainbow across the blade, wrapped with InOutHelper ignition/retraction.

export class StyleRainbowPtrTemplate extends BaseStyleTemplate {
  private readonly inMs: number;
  private readonly outMs: number;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;
  private transitionStartTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.inMs = args[0]?.getInteger(0) ?? 300;
    this.outMs = args[1]?.getInteger(0) ?? 500;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);

    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
      this.transitionStartTime = state.timeMs;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
      this.transitionStartTime = state.timeMs;
    }
    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return BLACK;
    }

    const numLeds = this.state.numLeds || 144;
    const hue = (led / numLeds) * 360;
    const rainbowColor = wrapperHslToRgb(hue, 1, 0.5);

    const elapsed = this.state.timeMs - this.transitionStartTime;

    if (this.isIgniting) {
      if (elapsed >= this.inMs) {
        this.isIgniting = false;
        return rainbowColor;
      }
      const progress = clamp(elapsed / this.inMs, 0, 1);
      const ledPos = led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return rainbowColor;
      return BLACK;
    }

    if (this.isRetracting) {
      if (elapsed >= this.outMs) {
        this.isRetracting = false;
        return BLACK;
      }
      const progress = clamp(elapsed / this.outMs, 0, 1);
      const ledPos = 1 - led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return BLACK;
      return rainbowColor;
    }

    if (this.state.isOn) {
      return rainbowColor;
    }

    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [];
  }
}

// ─── StyleStrobePtr<Color, StrobeColor, Frequency, StrobeMs, InMs, OutMs> ───
// Strobe style wrapped with InOutHelper ignition/retraction.

export class StyleStrobePtrTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly strobeColor: StyleTemplate;
  private readonly frequency: number;
  private readonly strobeMs: number;
  private readonly inMs: number;
  private readonly outMs: number;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;
  private transitionStartTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.strobeColor = args[1]!;
    this.frequency = args[2]?.getInteger(0) ?? 50;
    this.strobeMs = args[3]?.getInteger(0) ?? 1;
    this.inMs = args[4]?.getInteger(0) ?? 300;
    this.outMs = args[5]?.getInteger(0) ?? 500;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.strobeColor.run(state, effects);

    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
      this.transitionStartTime = state.timeMs;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
      this.transitionStartTime = state.timeMs;
    }
    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return BLACK;
    }

    // Compute strobe color
    let baseColor: Color;
    if (this.frequency <= 0) {
      baseColor = this.color.getColor(led);
    } else {
      const period = 1000 / this.frequency;
      const phase = this.state.timeMs % period;
      baseColor = phase < this.strobeMs
        ? this.strobeColor.getColor(led)
        : this.color.getColor(led);
    }

    const elapsed = this.state.timeMs - this.transitionStartTime;
    const numLeds = this.state.numLeds || 144;

    if (this.isIgniting) {
      if (elapsed >= this.inMs) {
        this.isIgniting = false;
        return baseColor;
      }
      const progress = clamp(elapsed / this.inMs, 0, 1);
      const ledPos = led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return baseColor;
      return BLACK;
    }

    if (this.isRetracting) {
      if (elapsed >= this.outMs) {
        this.isRetracting = false;
        return BLACK;
      }
      const progress = clamp(elapsed / this.outMs, 0, 1);
      const ledPos = 1 - led / Math.max(1, numLeds - 1);
      if (ledPos <= progress) return BLACK;
      return baseColor;
    }

    if (this.state.isOn) {
      return baseColor;
    }

    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.color, this.strobeColor];
  }
}

// ─── InOutSparkTipL<TrIgnition, TrRetraction, SparkColor?, OffColor?> ───
// Ignition/retraction wrapper that adds a spark effect at the wipe tip.
// The spark region produces random bright flashes near the leading edge
// of the extension/retraction wipe.

export class InOutSparkTipLTemplate extends BaseStyleTemplate {
  private readonly trIgnition: StyleTemplate;
  private readonly trRetraction: StyleTemplate;
  private readonly sparkColor: StyleTemplate;
  private readonly offColor: StyleTemplate;

  private wasOn = false;
  private isIgniting = false;
  private isRetracting = false;

  constructor(args: StyleTemplate[]) {
    super();
    this.trIgnition = args[0]!;
    this.trRetraction = args[1]!;
    this.sparkColor = args[2] ?? {
      run() { /* noop */ },
      getColor() { return { r: 255, g: 255, b: 255 }; },
      getInteger() { return PROFFIE_MAX; },
      getChildren() { return []; },
    } as StyleTemplate;
    this.offColor = args[3] ?? {
      run() { /* noop */ },
      getColor() { return BLACK; },
      getInteger() { return 0; },
      getChildren() { return []; },
    } as StyleTemplate;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.trIgnition.run(state, effects);
    this.trRetraction.run(state, effects);
    this.sparkColor.run(state, effects);
    this.offColor.run(state, effects);

    if (state.isOn && !this.wasOn) {
      this.isIgniting = true;
      this.isRetracting = false;
    } else if (!state.isOn && this.wasOn) {
      this.isRetracting = true;
      this.isIgniting = false;
    }
    this.wasOn = state.isOn;
  }

  getColor(led: number): Color {
    // Fully off
    if (!this.state.isOn && !this.isRetracting && !this.isIgniting) {
      return this.offColor.getColor(led);
    }

    if (this.isIgniting) {
      const progress = this.trIgnition.getInteger(led);
      if (progress >= PROFFIE_MAX) {
        this.isIgniting = false;
      }
      const t = clamp(progress / PROFFIE_MAX, 0, 1);

      // Spark region: LEDs near the wipe leading edge
      const numLeds = this.state.numLeds || 144;
      const wipeEdge = t * numLeds;
      const ledDist = Math.abs(led - wipeEdge);
      const sparkWidth = numLeds * 0.06;
      if (ledDist < sparkWidth && t > 0 && t < 1) {
        // Random spark brightness based on time + led position
        const sparkRng = Math.sin(led * 127.1 + this.state.timeMs * 0.03) * 0.5 + 0.5;
        if (sparkRng > 0.4) {
          const sparkIntensity = clamp(sparkRng * (1 - ledDist / sparkWidth), 0, 1);
          const sc = this.sparkColor.getColor(led);
          return {
            r: Math.round(sc.r * sparkIntensity),
            g: Math.round(sc.g * sparkIntensity),
            b: Math.round(sc.b * sparkIntensity),
          };
        }
      }

      return {
        r: Math.round(255 * t),
        g: Math.round(255 * t),
        b: Math.round(255 * t),
      };
    }

    if (this.isRetracting) {
      const progress = this.trRetraction.getInteger(led);
      if (progress >= PROFFIE_MAX) {
        this.isRetracting = false;
        return this.offColor.getColor(led);
      }
      const t = 1 - clamp(progress / PROFFIE_MAX, 0, 1);

      // Spark region at retraction wipe edge
      const numLeds = this.state.numLeds || 144;
      const wipeEdge = t * numLeds;
      const ledDist = Math.abs(led - wipeEdge);
      const sparkWidth = numLeds * 0.06;
      if (ledDist < sparkWidth && t > 0 && t < 1) {
        const sparkRng = Math.sin(led * 127.1 + this.state.timeMs * 0.03) * 0.5 + 0.5;
        if (sparkRng > 0.4) {
          const sparkIntensity = clamp(sparkRng * (1 - ledDist / sparkWidth), 0, 1);
          const sc = this.sparkColor.getColor(led);
          return {
            r: Math.round(sc.r * sparkIntensity),
            g: Math.round(sc.g * sparkIntensity),
            b: Math.round(sc.b * sparkIntensity),
          };
        }
      }

      return {
        r: Math.round(255 * t),
        g: Math.round(255 * t),
        b: Math.round(255 * t),
      };
    }

    // Blade on and stable
    if (this.state.isOn) {
      return { r: 255, g: 255, b: 255 };
    }

    return this.offColor.getColor(led);
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.max(c.r, c.g, c.b) * 128;
  }

  getChildren(): StyleTemplate[] {
    return [this.trIgnition, this.trRetraction, this.sparkColor, this.offColor];
  }
}

// ─── TransitionEffectL<Tr, Effect?> ───
// Wrapper alias — triggers a transition on a specific effect.
// This is a convenience re-export naming variant of TransitionEffectLTemplate
// from effects.ts. In ProffieOS, TransitionEffect<> (without L suffix)
// is the non-layer version that returns a color directly rather than
// an alpha-masked layer. For the interpreter, both behave the same way:
// run the transition when the effect fires.

export class TransitionEffectTemplate extends BaseStyleTemplate {
  private readonly transition: StyleTemplate;
  private lastEventTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.transition = args[0]!;
    // args[1] would be the effect type — default to EFFECT_CLASH
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.transition.run(state, effects);

    const event = effects.getLastEffect('EFFECT_CLASH');
    if (event && event.startTimeMs > this.lastEventTime) {
      this.lastEventTime = event.startTimeMs;
    }
  }

  getColor(led: number): Color {
    return this.transition.getColor?.(led) ?? BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.transition];
  }
}

// ─── TransitionLoopL<Transition> ───
// Layer variant of TransitionLoop — continuously loops a transition,
// outputting its result as a layer alpha. Like TransitionLoopTemplate
// but designed to sit inside a Layers<> stack as an alpha-contributing
// layer rather than a standalone color source.

export class TransitionLoopLTemplate extends BaseStyleTemplate {
  private readonly transition: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.transition = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.transition.run(state, effects);
  }

  getColor(led: number): Color {
    // The transition's getColor provides the layer color
    return this.transition.getColor?.(led) ?? BLACK;
  }

  getInteger(led: number): number {
    return this.transition.getInteger(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.transition];
  }
}

// ─── HSL→RGB helper for StyleRainbowPtr ───

function wrapperHslToRgb(h: number, s: number, l: number): Color {
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
    r: clamp(Math.round((r1 + m) * 255), 0, 255),
    g: clamp(Math.round((g1 + m) * 255), 0, 255),
    b: clamp(Math.round((b1 + m) * 255), 0, 255),
  };
}
