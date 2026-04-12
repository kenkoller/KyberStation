import type { BladeEffect, EffectType, EffectParams, EffectContext, RGB } from '../types.js';

export abstract class BaseEffect implements BladeEffect {
  abstract readonly id: string;
  abstract readonly type: EffectType;

  protected startTime: number = 0;
  protected duration: number = 400;
  protected position: number = 0.5;
  protected active: boolean = false;
  protected sustained: boolean = false; // for lockup, drag, melt, lightning

  trigger(params: EffectParams): void {
    this.active = true;
    this.startTime = performance.now();
    if (params.position !== undefined) this.position = params.position;
    if (params.duration !== undefined) this.duration = params.duration;
  }

  release(): void {
    this.sustained = false;
  }

  reset(): void {
    this.active = false;
    this.sustained = false;
  }

  isActive(): boolean {
    return this.active;
  }

  protected getProgress(currentTime: number): number {
    const elapsed = currentTime - this.startTime;
    if (!this.sustained && elapsed >= this.duration) {
      this.active = false;
      return 1;
    }
    return Math.min(1, elapsed / this.duration);
  }

  protected getFadeOut(progress: number): number {
    return progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
  }

  abstract apply(color: RGB, position: number, context: EffectContext): RGB;
}
