import type {
  BladeEffect,
  EffectType,
  EffectParams,
  EffectContext,
  EffectTiming,
  RGB,
} from '../types.js';

/**
 * Progress at which a held sustained effect parks. `getFadeOut()` is 1 up
 * to 0.7 and ramps to 0 at 1, so parking here keeps the effect at full
 * strength while held; on release the fade runs from here to 1.
 */
export const SUSTAINED_HOLD_PROGRESS = 0.7;

export abstract class BaseEffect implements BladeEffect {
  abstract readonly id: string;
  abstract readonly type: EffectType;

  /** Simulated time (engine `update()` clock, ms) of the last trigger. */
  protected startTime: number = 0;
  /** Simulated time of the release of a sustained effect; -1 while held / never released. */
  protected releaseTime: number = -1;
  protected duration: number = 400;
  protected position: number = 0.5;
  protected active: boolean = false;
  protected sustained: boolean = false; // for lockup, drag, melt, lightning

  trigger(params: EffectParams): void {
    this.active = true;
    this.startTime = params.triggerTime ?? 0;
    this.releaseTime = -1;
    if (params.position !== undefined) this.position = params.position;
    if (params.duration !== undefined) this.duration = params.duration;
  }

  release(now?: number): void {
    if (!this.sustained) return;
    this.sustained = false;
    // Without an explicit clock, release "now" = the end of the hold as far
    // as this effect knows: the moment it parked at the fade-out knee.
    this.releaseTime = now ?? this.startTime + this.duration * SUSTAINED_HOLD_PROGRESS;
  }

  reset(): void {
    this.active = false;
    this.sustained = false;
    this.releaseTime = -1;
  }

  isActive(): boolean {
    return this.active;
  }

  isHeld(): boolean {
    return this.active && this.sustained;
  }

  timing(now: number): EffectTiming {
    const elapsed = Math.max(0, now - this.startTime);
    const duration = Math.max(1, this.duration);
    let progress: number;
    if (this.sustained) {
      progress = Math.min(SUSTAINED_HOLD_PROGRESS, elapsed / duration);
    } else if (this.releaseTime >= 0) {
      progress = SUSTAINED_HOLD_PROGRESS + Math.max(0, now - this.releaseTime) / duration;
    } else {
      progress = elapsed / duration;
    }
    return { elapsed, progress: Math.min(1, progress) };
  }

  protected getFadeOut(progress: number): number {
    return progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
  }

  abstract apply(color: RGB, position: number, context: EffectContext): RGB;
}
