// ─── Effect State Management ───
// Tracks effect events (clash, blast, lockup, etc.) with timing and location.

import type { EffectEvent, EffectType, EffectSystem as IEffectSystem, LockupType } from './types.js';

export class EffectManager implements IEffectSystem {
  private effects: Map<EffectType, EffectEvent[]> = new Map();
  private _lockupType: LockupType = 'LOCKUP_NONE';
  private _clashImpact = 0;
  private nextWavnum = 0;

  get lockupType(): LockupType {
    return this._lockupType;
  }

  set lockupType(value: LockupType) {
    this._lockupType = value;
  }

  get clashImpact(): number {
    return this._clashImpact;
  }

  set clashImpact(value: number) {
    this._clashImpact = value;
  }

  triggerEffect(type: EffectType, location?: number): void {
    const event: EffectEvent = {
      type,
      location: location ?? Math.floor(Math.random() * 32768),
      startTimeMs: 0, // Will be set externally or by the caller
      wavnum: this.nextWavnum++,
    };

    let list = this.effects.get(type);
    if (!list) {
      list = [];
      this.effects.set(type, list);
    }
    list.push(event);

    // Keep only the last 10 events per type to avoid memory growth
    if (list.length > 10) {
      list.shift();
    }
  }

  /**
   * Trigger an effect with a specific timestamp.
   */
  triggerEffectAt(type: EffectType, timeMs: number, location?: number): void {
    const event: EffectEvent = {
      type,
      location: location ?? Math.floor(Math.random() * 32768),
      startTimeMs: timeMs,
      wavnum: this.nextWavnum++,
    };

    let list = this.effects.get(type);
    if (!list) {
      list = [];
      this.effects.set(type, list);
    }
    list.push(event);

    if (list.length > 10) {
      list.shift();
    }
  }

  getLastEffect(type: EffectType): EffectEvent | undefined {
    const list = this.effects.get(type);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  getEffects(type: EffectType): EffectEvent[] {
    return this.effects.get(type) ?? [];
  }

  timeSinceEffect(type: EffectType, currentTimeMs: number): number {
    const last = this.getLastEffect(type);
    if (!last) return -1;
    return currentTimeMs - last.startTimeMs;
  }

  /**
   * Clear all effects. Useful for resetting between tests.
   */
  clear(): void {
    this.effects.clear();
    this._lockupType = 'LOCKUP_NONE';
    this._clashImpact = 0;
  }
}
