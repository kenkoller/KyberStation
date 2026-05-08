// ─── Template Eval Bridge ───
// Adapts between the BladeEngine's runtime types and the
// @kyberstation/template-eval interpreter. Handles:
//   - Value scaling (engine 0-1 / -1..1 → ProffieOS 0-32768)
//   - Effect type mapping (engine lowercase → ProffieOS EFFECT_* names)
//   - Per-frame template evaluation → LED buffer write

import {
  evaluateTemplateString,
  EffectManager,
  PROFFIE_MAX,
} from '@kyberstation/template-eval';
import type {
  StyleTemplate,
  BladeState as TemplateBladeState,
  EffectType as TemplateEffectType,
} from '@kyberstation/template-eval';
import type { LEDArray } from '../LEDArray.js';
import type { EffectType as EngineEffectType } from '../types.js';

const ENGINE_TO_TEMPLATE_EFFECT: Partial<Record<EngineEffectType, TemplateEffectType>> = {
  clash: 'EFFECT_CLASH',
  blast: 'EFFECT_BLAST',
  lockup: 'EFFECT_LOCKUP_BEGIN',
  drag: 'EFFECT_DRAG_BEGIN',
  melt: 'EFFECT_MELT',
  stab: 'EFFECT_STAB',
  force: 'EFFECT_FORCE',
};

export class TemplateEvalBridge {
  private template: StyleTemplate | null = null;
  private effects = new EffectManager();
  private currentTemplateStr = '';
  private elapsedMs = 0;

  /**
   * Compile a new template string. No-ops if the string hasn't changed.
   * Returns false if parsing fails (caller should fall back to approximation).
   */
  setTemplate(templateStr: string): boolean {
    if (templateStr === this.currentTemplateStr && this.template) return true;
    try {
      this.template = evaluateTemplateString(templateStr);
      this.currentTemplateStr = templateStr;
      return true;
    } catch {
      this.template = null;
      this.currentTemplateStr = '';
      return false;
    }
  }

  /**
   * Run one frame of the template evaluator and write results into the LED buffer.
   */
  renderFrame(
    leds: LEDArray,
    deltaMs: number,
    isOn: boolean,
    _extendProgress: number,
    swingSpeed: number,
    bladeAngle: number,
    twistAngle: number,
    soundLevel: number,
    batteryLevel: number,
    variation: number,
  ): void {
    if (!this.template) {
      leds.clear();
      return;
    }

    this.elapsedMs += deltaMs;

    const bladeState: TemplateBladeState = {
      isOn,
      numLeds: leds.count,
      timeMs: this.elapsedMs,
      deltaMsF: deltaMs,
      swingSpeed: Math.round(swingSpeed * PROFFIE_MAX),
      bladeAngle: Math.round(((bladeAngle + 1) / 2) * PROFFIE_MAX),
      twistAngle: Math.round(((twistAngle + 1) / 2) * PROFFIE_MAX),
      soundLevel: Math.round(soundLevel * PROFFIE_MAX),
      batteryLevel: Math.round(batteryLevel * PROFFIE_MAX),
      variation: Math.round(variation * PROFFIE_MAX),
    };

    this.template.run(bladeState, this.effects);

    for (let i = 0; i < leds.count; i++) {
      const color = this.template.getColor(i);
      leds.setPixel(i, color.r, color.g, color.b);
    }
  }

  /**
   * Forward an engine effect event to the template-eval effect system.
   */
  triggerEffect(type: EngineEffectType, position?: number): void {
    const mapped = ENGINE_TO_TEMPLATE_EFFECT[type];
    if (!mapped) return;
    const location = position !== undefined
      ? Math.round(position * PROFFIE_MAX)
      : undefined;
    this.effects.triggerEffectAt(mapped, this.elapsedMs, location);
  }

  /**
   * Forward lockup-end / drag-end when the engine releases a sustained effect.
   */
  releaseEffect(type: EngineEffectType): void {
    if (type === 'lockup') {
      this.effects.triggerEffectAt('EFFECT_LOCKUP_END', this.elapsedMs);
      this.effects.lockupType = 'LOCKUP_NONE';
    } else if (type === 'drag') {
      this.effects.triggerEffectAt('EFFECT_DRAG_END', this.elapsedMs);
    }
  }

  /**
   * Reset internal state. Called when switching templates or modes.
   */
  reset(): void {
    this.template = null;
    this.currentTemplateStr = '';
    this.effects.clear();
    this.elapsedMs = 0;
  }

  get isReady(): boolean {
    return this.template !== null;
  }
}
