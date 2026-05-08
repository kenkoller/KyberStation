// ─── Effect Layer Templates ───
// ResponsiveLockupL, ResponsiveClashL, BlastL, ResponsiveBlastL,
// ResponsiveStabL, ResponsiveDragL, ResponsiveLightningBlockL,
// ResponsiveMeltL, LockupTrL, TransitionEffectL, SimpleClashL, etc.
// Clean-room implementations based on ProffieOS documented behavior.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, EffectType, StyleTemplate } from '../types.js';
import { BLACK, clamp, PROFFIE_MAX } from '../types.js';
import { bump, ledToBladePos } from '../utils.js';

// ─── SimpleClashL<ClashColor, Ms?, WidthPct?> ───
// Simple clash flash at impact point.

export class SimpleClashLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly durationMs: number;
  private readonly widthPct: number;
  private clashTime = -1;
  private clashLocation = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.durationMs = args[1]?.getInteger(0) ?? 200;
    this.widthPct = args[2]?.getInteger(0) ?? 50;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);

    const clashEvent = effects.getLastEffect('EFFECT_CLASH');
    if (clashEvent && clashEvent.startTimeMs > this.clashTime) {
      this.clashTime = clashEvent.startTimeMs;
      this.clashLocation = clashEvent.location;
    }
  }

  getColor(led: number): Color {
    if (this.clashTime < 0) return BLACK;

    const elapsed = this.state.timeMs - this.clashTime;
    if (elapsed >= this.durationMs) return BLACK;

    const numLeds = this.state.numLeds || 144;
    const centerLed = (this.clashLocation / PROFFIE_MAX) * numLeds;
    const width = (this.widthPct / 100) * numLeds;
    const dist = Math.abs(led - centerLed);

    if (dist > width) return BLACK;

    const spatialFade = 1 - dist / width;
    const timeFade = 1 - elapsed / this.durationMs;
    const alpha = spatialFade * timeFade;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }
}

// ─── ResponsiveClashL<ClashColor, TrTransition?, TrReturn?, Top?, Bottom?, Size?> ───
// Clash effect with configurable transition, responsive to impact position.

export class ResponsiveClashLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly trTransition: StyleTemplate | null;
  private readonly trReturn: StyleTemplate | null;
  private readonly topPct: number;
  private readonly bottomPct: number;
  private readonly size: number;
  private clashTime = -1;
  private clashLocation = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.trTransition = args[1] ?? null;
    this.trReturn = args[2] ?? null;
    this.topPct = args[3]?.getInteger(0) ?? PROFFIE_MAX;
    this.bottomPct = args[4]?.getInteger(0) ?? 0;
    this.size = args[5]?.getInteger(0) ?? (PROFFIE_MAX / 4);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.trTransition?.run(state, effects);
    this.trReturn?.run(state, effects);

    const clashEvent = effects.getLastEffect('EFFECT_CLASH');
    if (clashEvent && clashEvent.startTimeMs > this.clashTime) {
      this.clashTime = clashEvent.startTimeMs;
      this.clashLocation = clashEvent.location;
    }
  }

  getColor(led: number): Color {
    if (this.clashTime < 0) return BLACK;

    const elapsed = this.state.timeMs - this.clashTime;
    // Default 300ms decay
    const durationMs = 300;
    if (elapsed >= durationMs) return BLACK;

    const numLeds = this.state.numLeds || 144;
    const bladePos = ledToBladePos(led, numLeds);

    const clampedLoc = clamp(this.clashLocation, this.bottomPct, this.topPct);
    const bumpVal = bump(bladePos, clampedLoc, this.size);
    const timeFade = 1 - elapsed / durationMs;
    const alpha = (bumpVal / PROFFIE_MAX) * timeFade;

    if (alpha < 0.01) return BLACK;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }
}

// ─── BlastL<BlastColor, FadeMs?, Size?, WaveMs?> ───
// Blast effect — marks from blaster deflection.

export class BlastLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly fadeMs: number;
  private readonly size: number;
  private readonly waveMs: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.fadeMs = args[1]?.getInteger(0) ?? 400;
    this.size = args[2]?.getInteger(0) ?? 200;
    this.waveMs = args[3]?.getInteger(0) ?? 100;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const effects = this.effects;
    if (!effects) return BLACK;

    const blastEvents = effects.getEffects('EFFECT_BLAST');
    if (blastEvents.length === 0) return BLACK;

    const numLeds = this.state.numLeds || 144;
    let maxAlpha = 0;

    for (const event of blastEvents) {
      const elapsed = this.state.timeMs - event.startTimeMs;
      if (elapsed >= this.fadeMs || elapsed < 0) continue;

      const timeFade = 1 - elapsed / this.fadeMs;
      const centerLed = (event.location / PROFFIE_MAX) * numLeds;
      const dist = Math.abs(led - centerLed);
      const sizeInLeds = (this.size / PROFFIE_MAX) * numLeds;

      if (dist > sizeInLeds) continue;

      const spatialFade = 1 - dist / sizeInLeds;
      const wave = this.waveMs > 0
        ? 0.5 + 0.5 * Math.sin((elapsed / this.waveMs) * Math.PI * 2)
        : 1;
      const alpha = spatialFade * timeFade * wave;
      maxAlpha = Math.max(maxAlpha, alpha);
    }

    if (maxAlpha < 0.01) return BLACK;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(maxAlpha, 0, 1)),
      g: Math.round(c.g * clamp(maxAlpha, 0, 1)),
      b: Math.round(c.b * clamp(maxAlpha, 0, 1)),
    };
  }
}

// ─── ResponsiveBlastL<BlastColor, FadeMs?, Size?, WaveMs?, WaveSize?> ───
// Like BlastL but with additional wave propagation.

export class ResponsiveBlastLTemplate extends BlastLTemplate {
  // Inherits behavior from BlastL — the wave propagation
  // is a visual enhancement we can add later.
}

// ─── ResponsiveLockupL<LockupColor, TrBegin, TrEnd, Position, Size> ───
// Lockup effect — sustained hold at a position on the blade.

export class ResponsiveLockupLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly trBegin: StyleTemplate | null;
  private readonly trEnd: StyleTemplate | null;
  private readonly position: StyleTemplate | null;
  private readonly size: StyleTemplate | null;
  private lockupActive = false;
  private lockupStartTime = -1;
  private lockupEndTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.trBegin = args[1] ?? null;
    this.trEnd = args[2] ?? null;
    this.position = args[3] ?? null;
    this.size = args[4] ?? null;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.trBegin?.run(state, effects);
    this.trEnd?.run(state, effects);
    this.position?.run(state, effects);
    this.size?.run(state, effects);

    // Track lockup state
    const beginEvent = effects.getLastEffect('EFFECT_LOCKUP_BEGIN');
    const endEvent = effects.getLastEffect('EFFECT_LOCKUP_END');

    if (beginEvent && beginEvent.startTimeMs > this.lockupStartTime) {
      this.lockupStartTime = beginEvent.startTimeMs;
      this.lockupActive = true;
    }
    if (endEvent && endEvent.startTimeMs > this.lockupEndTime) {
      this.lockupEndTime = endEvent.startTimeMs;
      if (this.lockupEndTime > this.lockupStartTime) {
        this.lockupActive = false;
      }
    }
  }

  getColor(led: number): Color {
    if (!this.lockupActive) {
      // Fade out after lockup ends
      if (this.lockupEndTime > 0) {
        const elapsed = this.state.timeMs - this.lockupEndTime;
        if (elapsed >= 200) return BLACK;
        const fade = 1 - elapsed / 200;
        return this._getLockedColor(led, fade);
      }
      return BLACK;
    }

    return this._getLockedColor(led, 1.0);
  }

  private _getLockedColor(led: number, intensity: number): Color {
    const numLeds = this.state.numLeds || 144;
    const lockPos = this.position?.getInteger(led) ?? (PROFFIE_MAX * 3 / 4);
    const lockSize = this.size?.getInteger(led) ?? (PROFFIE_MAX / 4);

    const bladePos = ledToBladePos(led, numLeds);
    const bumpVal = bump(bladePos, lockPos, lockSize);
    const alpha = (bumpVal / PROFFIE_MAX) * intensity;

    if (alpha < 0.01) return BLACK;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }
}

// ─── LockupTrL<Color, TrBegin, TrHold, TrEnd, LockupType> ───
// More flexible lockup with explicit transition phases.

export class LockupTrLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly trBegin: StyleTemplate;
  private readonly trHold: StyleTemplate;
  private readonly trEnd: StyleTemplate;
  private lockupActive = false;
  private lockupEndTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.trBegin = args[1]!;
    this.trHold = args[2]!;
    this.trEnd = args[3]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.trBegin.run(state, effects);
    this.trHold.run(state, effects);
    this.trEnd.run(state, effects);

    if (effects.lockupType !== 'LOCKUP_NONE') {
      if (!this.lockupActive) {
        this.lockupActive = true;
      }
    } else if (this.lockupActive) {
      this.lockupActive = false;
      this.lockupEndTime = state.timeMs;
    }
  }

  getColor(led: number): Color {
    if (this.lockupActive) {
      // During lockup, show the lockup color modulated by the hold transition
      const c = this.color.getColor(led);
      const holdAlpha = this.trHold.getInteger(led) / PROFFIE_MAX;
      return {
        r: Math.round(c.r * clamp(holdAlpha, 0, 1)),
        g: Math.round(c.g * clamp(holdAlpha, 0, 1)),
        b: Math.round(c.b * clamp(holdAlpha, 0, 1)),
      };
    }

    // Fade out
    if (this.lockupEndTime > 0) {
      const endProgress = this.trEnd.getInteger(led) / PROFFIE_MAX;
      if (endProgress >= 1) return BLACK;

      const c = this.color.getColor(led);
      const fade = 1 - endProgress;
      return {
        r: Math.round(c.r * fade),
        g: Math.round(c.g * fade),
        b: Math.round(c.b * fade),
      };
    }

    return BLACK;
  }
}

// ─── ResponsiveStabL<StabColor, TrTransition?, TrReturn?, Size?, Position?> ───
// Stab effect at the tip of the blade.

export class ResponsiveStabLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly size: number;
  private stabTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    // Skip transitions for now, use simple decay
    this.size = args[3]?.getInteger(0) ?? (PROFFIE_MAX / 4);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);

    const stabEvent = effects.getLastEffect('EFFECT_STAB');
    if (stabEvent && stabEvent.startTimeMs > this.stabTime) {
      this.stabTime = stabEvent.startTimeMs;
    }
  }

  getColor(led: number): Color {
    if (this.stabTime < 0) return BLACK;

    const elapsed = this.state.timeMs - this.stabTime;
    if (elapsed >= 300) return BLACK;

    const numLeds = this.state.numLeds || 144;
    // Stab is at the tip
    const tipPos = PROFFIE_MAX;
    const bladePos = ledToBladePos(led, numLeds);
    const bumpVal = bump(bladePos, tipPos, this.size);
    const timeFade = 1 - elapsed / 300;
    const alpha = (bumpVal / PROFFIE_MAX) * timeFade;

    if (alpha < 0.01) return BLACK;

    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(alpha, 0, 1)),
      g: Math.round(c.g * clamp(alpha, 0, 1)),
      b: Math.round(c.b * clamp(alpha, 0, 1)),
    };
  }
}

// ─── ResponsiveDragL<DragColor, TrTransition?, TrReturn?, Size?, Position?> ───
// Drag effect at the base of the blade (simulates dragging the blade tip).

export class ResponsiveDragLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private dragActive = false;
  private dragEndTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);

    const beginEvent = effects.getLastEffect('EFFECT_DRAG_BEGIN');
    const endEvent = effects.getLastEffect('EFFECT_DRAG_END');

    if (beginEvent) {
      if (!endEvent || beginEvent.startTimeMs > endEvent.startTimeMs) {
        this.dragActive = true;
      }
    }
    if (endEvent) {
      if (!beginEvent || endEvent.startTimeMs > beginEvent.startTimeMs) {
        this.dragActive = false;
        this.dragEndTime = endEvent.startTimeMs;
      }
    }
  }

  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const tipRegionStart = numLeds * 0.85;

    if (this.dragActive) {
      if (led >= tipRegionStart) {
        const t = (led - tipRegionStart) / (numLeds - tipRegionStart);
        const c = this.color.getColor(led);
        const alpha = clamp(t, 0, 1);
        return {
          r: Math.round(c.r * alpha),
          g: Math.round(c.g * alpha),
          b: Math.round(c.b * alpha),
        };
      }
      return BLACK;
    }

    // Fade out after drag ends
    if (this.dragEndTime > 0) {
      const elapsed = this.state.timeMs - this.dragEndTime;
      if (elapsed >= 200) return BLACK;
      if (led >= tipRegionStart) {
        const fade = 1 - elapsed / 200;
        const c = this.color.getColor(led);
        return {
          r: Math.round(c.r * fade),
          g: Math.round(c.g * fade),
          b: Math.round(c.b * fade),
        };
      }
    }

    return BLACK;
  }
}

// ─── ResponsiveLightningBlockL<Color, TrTransition?, TrReturn?, Size?> ───
// Lightning block — electrical crackling effect along the blade.

export class ResponsiveLightningBlockLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private blockActive = false;
  private blockEndTime = -1;
  private frameCounter = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.frameCounter++;

    // Lightning block uses lockup type
    if (effects.lockupType === 'LOCKUP_LIGHTNING_BLOCK') {
      this.blockActive = true;
    } else if (this.blockActive) {
      this.blockActive = false;
      this.blockEndTime = state.timeMs;
    }
  }

  getColor(led: number): Color {
    if (!this.blockActive) {
      if (this.blockEndTime > 0) {
        const elapsed = this.state.timeMs - this.blockEndTime;
        if (elapsed >= 200) return BLACK;
      }
      return BLACK;
    }

    // Lightning effect — random flashing per LED
    const seed = led * 31 + this.frameCounter * 7;
    const hash = ((seed * 2654435761) >>> 0) / 4294967296;

    if (hash > 0.85) {
      // This LED flashes
      const c = this.color.getColor(led);
      return {
        r: Math.round(c.r * (0.5 + hash * 0.5)),
        g: Math.round(c.g * (0.5 + hash * 0.5)),
        b: Math.round(c.b * (0.5 + hash * 0.5)),
      };
    }

    return BLACK;
  }
}

// ─── ResponsiveMeltL<MeltColor, TrTransition?, TrReturn?, Size?> ───
// Melt effect at the tip — simulates the blade melting through something.

export class ResponsiveMeltLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private meltActive = false;
  private meltEndTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);

    if (effects.lockupType === 'LOCKUP_MELT') {
      this.meltActive = true;
    } else if (this.meltActive) {
      this.meltActive = false;
      this.meltEndTime = state.timeMs;
    }
  }

  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const tipStart = numLeds * 0.9;

    const isActive = this.meltActive;
    const isFading = !isActive && this.meltEndTime > 0 &&
      (this.state.timeMs - this.meltEndTime) < 300;

    if (!isActive && !isFading) return BLACK;
    if (led < tipStart) return BLACK;

    const intensity = isActive
      ? 1.0
      : 1 - (this.state.timeMs - this.meltEndTime) / 300;

    const c = this.color.getColor(led);
    const alpha = clamp(intensity, 0, 1);
    return {
      r: Math.round(c.r * alpha),
      g: Math.round(c.g * alpha),
      b: Math.round(c.b * alpha),
    };
  }
}

// ─── TransitionEffectL<Tr, Effect> ───
// Triggers a transition when a specific effect fires.

export class TransitionEffectLTemplate extends BaseStyleTemplate {
  private readonly transition: StyleTemplate;
  private readonly effectType: EffectType;
  private lastEventTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.transition = args[0]!;
    // The effect type is the second argument, usually an enum like EFFECT_CLASH
    this.effectType = 'EFFECT_CLASH'; // Default
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.transition.run(state, effects);

    const event = effects.getLastEffect(this.effectType);
    if (event && event.startTimeMs > this.lastEventTime) {
      this.lastEventTime = event.startTimeMs;
    }
  }

  getColor(led: number): Color {
    return this.transition.getColor?.(led) ?? BLACK;
  }
}

// ─── EffectSequence<Effect, C1, C2, ...> ───
// Cycles through colors on each effect trigger.

export class EffectSequenceTemplate extends BaseStyleTemplate {
  private readonly colors: StyleTemplate[];
  private currentIndex = 0;
  private lastEventTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    // First arg is the effect type identifier — skip it
    this.colors = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const c of this.colors) c.run(state, effects);

    // Check for any clash event to advance
    const event = effects.getLastEffect('EFFECT_CLASH');
    if (event && event.startTimeMs > this.lastEventTime) {
      this.lastEventTime = event.startTimeMs;
      if (this.colors.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % this.colors.length;
      }
    }
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    return this.colors[this.currentIndex].getColor(led);
  }
}

// ─── MultiTransitionEffectL<...> ───
// Convenience alias for TransitionEffectL with multiple phases.
// For our purposes, behaves same as TransitionEffectL.

export class MultiTransitionEffectLTemplate extends TransitionEffectLTemplate {}
