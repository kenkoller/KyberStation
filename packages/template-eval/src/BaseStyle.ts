// ─── Base Style Template ───
// Abstract base class that all template implementations extend.
// Provides default implementations so subclasses only override what they need.

import type { BladeState, Color, EffectSystem, StyleTemplate } from './types.js';
import { BLACK, PROFFIE_MAX } from './types.js';

/**
 * Base implementation of StyleTemplate. Subclasses override run() and
 * either getColor() (for color-producing templates) or getInteger()
 * (for function templates).
 */
export abstract class BaseStyleTemplate implements StyleTemplate {
  protected state: BladeState = {
    isOn: false,
    numLeds: 144,
    timeMs: 0,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: 24576, // ~75%
    variation: 0,
  };
  protected effects: EffectSystem | null = null;

  run(state: BladeState, effects: EffectSystem): void {
    this.state = state;
    this.effects = effects;
  }

  getColor(_led: number): Color {
    return BLACK;
  }

  getInteger(_led: number): number {
    return 0;
  }
}

/**
 * Wrapper that converts a constant integer into a StyleTemplate.
 * Used for bare integer literals in parsed template strings.
 */
export class IntegerLiteral extends BaseStyleTemplate {
  private readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  getInteger(_led: number): number {
    return this.value;
  }

  getColor(_led: number): Color {
    // When used as a color, interpret as grayscale
    const v = Math.round((this.value / PROFFIE_MAX) * 255);
    return { r: v, g: v, b: v };
  }
}
