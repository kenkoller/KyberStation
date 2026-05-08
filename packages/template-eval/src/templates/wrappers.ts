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
}
