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
  LockupType as TemplateLockupType,
} from '@kyberstation/template-eval';
import { ColorChangeTemplate, InOutTrLTemplate } from '@kyberstation/template-eval';
import type { LEDArray } from '../LEDArray.js';
import type { EffectType as EngineEffectType } from '../types.js';

// ─── Engine effect → ProffieOS event mapping ───
//
// How each engine `EffectType` reaches a ProffieOS style on real hardware:
//
//   • `event`  — a one-shot `SaberBase::DoEffect(EFFECT_*)`.
//   • `lockup` — a sustained lockup. ProffieOS sets `SaberBase::Lockup()`
//                to the lockup type and fires `DoBeginLockup()` /
//                `DoEndLockup()`, which raise EFFECT_DRAG_BEGIN/END for a
//                drag and EFFECT_LOCKUP_BEGIN/END for every other type.
//                `LockupTrL<…, SaberBase::LOCKUP_*>` layers gate on the
//                lockup TYPE, so setting it is what makes lockup visible.
//   • `null`   — no ProffieOS equivalent. These are visualizer-only engine
//                effects (shockwave, scatter, fragment, ripple, freeze,
//                overcharge, bifurcate, invert, ghostEcho, splinter,
//                coronary, glitchMatrix, siphon): codegen emits no layer
//                for them and no EFFECT_* event exists that a flashed saber
//                could raise, so under template-eval they render nothing —
//                which is exactly what the real blade would do.
//
// `Record<EngineEffectType, …>` (not Partial) makes the compiler flag any
// new engine effect that hasn't been classified here.

export type TemplateEffectBinding =
  | { readonly kind: 'event'; readonly event: TemplateEffectType }
  | {
      readonly kind: 'lockup';
      readonly lockupType: TemplateLockupType;
      readonly begin: TemplateEffectType;
      readonly end: TemplateEffectType;
    };

const LOCKUP_EVENTS = { begin: 'EFFECT_LOCKUP_BEGIN', end: 'EFFECT_LOCKUP_END' } as const;

export const ENGINE_EFFECT_TO_TEMPLATE: Readonly<
  Record<EngineEffectType, TemplateEffectBinding | null>
> = {
  clash: { kind: 'event', event: 'EFFECT_CLASH' },
  blast: { kind: 'event', event: 'EFFECT_BLAST' },
  stab: { kind: 'event', event: 'EFFECT_STAB' },
  force: { kind: 'event', event: 'EFFECT_FORCE' },
  change: { kind: 'event', event: 'EFFECT_CHANGE' },
  // On hardware the Unstable-Kylo spark spray is the extra
  // `SimpleClashL<White, 60>` codegen emits when `config.unstableKylo` is
  // set — it fires on EFFECT_CLASH, so a clash is the only way to see it.
  unstableKylo: { kind: 'event', event: 'EFFECT_CLASH' },

  lockup: { kind: 'lockup', lockupType: 'LOCKUP_NORMAL', ...LOCKUP_EVENTS },
  drag: {
    kind: 'lockup',
    lockupType: 'LOCKUP_DRAG',
    begin: 'EFFECT_DRAG_BEGIN',
    end: 'EFFECT_DRAG_END',
  },
  melt: { kind: 'lockup', lockupType: 'LOCKUP_MELT', ...LOCKUP_EVENTS },
  lightning: { kind: 'lockup', lockupType: 'LOCKUP_LIGHTNING_BLOCK', ...LOCKUP_EVENTS },

  // No ProffieOS equivalent (see header).
  shockwave: null,
  scatter: null,
  fragment: null,
  ripple: null,
  freeze: null,
  overcharge: null,
  bifurcate: null,
  invert: null,
  ghostEcho: null,
  splinter: null,
  coronary: null,
  glitchMatrix: null,
  siphon: null,
};

export class TemplateEvalBridge {
  private template: StyleTemplate | null = null;
  private effects = new EffectManager();
  private currentTemplateStr = '';
  private elapsedMs = 0;
  private hasInOutTrL = false;

  /**
   * Compile a new template string. No-ops if the string hasn't changed.
   * Returns false if parsing fails (caller should fall back to approximation).
   */
  setTemplate(templateStr: string): boolean {
    if (templateStr === this.currentTemplateStr && this.template) return true;
    try {
      this.template = evaluateTemplateString(templateStr);
      this.currentTemplateStr = templateStr;
      this.hasInOutTrL = findTemplate(this.template, (n) => n instanceof InOutTrLTemplate) !== null;
      return true;
    } catch {
      this.template = null;
      this.currentTemplateStr = '';
      this.hasInOutTrL = false;
      return false;
    }
  }

  /**
   * True when the active template expresses ignition / retraction through
   * an `InOutTrL` layer. That layer is a per-frame no-op in the
   * interpreter (see `InOutTrLTemplate` — returning its real ProffieOS
   * colour whited out every blade, PR #357), so the BladeEngine stands in
   * for it: it scales the evaluated buffer by the configured ignition /
   * retraction class's mask, the same mask the parameter engine draws.
   * Templates without InOutTrL (`InOutHelperL`, `StyleNormalPtr`, or no
   * on/off wrapper at all) own their on/off behaviour and are not masked.
   */
  get delegatesIgnitionMask(): boolean {
    return this.template !== null && this.hasInOutTrL;
  }

  /**
   * Run one frame of the template evaluator and write results into the LED buffer.
   *
   * `_extendProgress` is intentionally unused: the ignition / retraction
   * mask is applied by the engine after evaluation (see
   * `delegatesIgnitionMask`). The positional parameter is kept for the
   * perf bench script, which calls this method directly.
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
   * Forward an engine effect to the template-eval effect system, the way
   * ProffieOS would raise it. Effects with no ProffieOS equivalent are
   * ignored (see `ENGINE_EFFECT_TO_TEMPLATE`).
   */
  triggerEffect(type: EngineEffectType, position?: number): void {
    const binding = ENGINE_EFFECT_TO_TEMPLATE[type];
    if (!binding) return;
    const location = position !== undefined
      ? Math.round(position * PROFFIE_MAX)
      : undefined;

    if (binding.kind === 'event') {
      this.effects.triggerEffectAt(binding.event, this.elapsedMs, location);
      return;
    }

    // Sustained lockup. ProffieOS holds a single lockup at a time; a new
    // lockup type replaces the held one, so end the previous one first.
    const current = this.effects.lockupType;
    if (current === binding.lockupType) return;
    if (current !== 'LOCKUP_NONE') this.endLockup(current);
    this.effects.lockupType = binding.lockupType;
    this.effects.triggerEffectAt(binding.begin, this.elapsedMs, location);
  }

  /**
   * Forward the end of a sustained effect (lockup / drag / melt /
   * lightning). A no-op unless that effect's lockup type is the one held.
   */
  releaseEffect(type: EngineEffectType): void {
    const binding = ENGINE_EFFECT_TO_TEMPLATE[type];
    if (!binding || binding.kind !== 'lockup') return;
    if (this.effects.lockupType !== binding.lockupType) return;
    this.endLockup(binding.lockupType);
  }

  /** Current ProffieOS lockup type (LOCKUP_NONE when nothing is held). */
  get lockupType(): TemplateLockupType {
    return this.effects.lockupType;
  }

  private endLockup(lockupType: TemplateLockupType): void {
    const endEvent: TemplateEffectType =
      lockupType === 'LOCKUP_DRAG' ? 'EFFECT_DRAG_END' : 'EFFECT_LOCKUP_END';
    this.effects.triggerEffectAt(endEvent, this.elapsedMs);
    this.effects.lockupType = 'LOCKUP_NONE';
  }

  /**
   * Reset internal state. Called when switching templates or modes.
   */
  reset(): void {
    this.template = null;
    this.currentTemplateStr = '';
    this.hasInOutTrL = false;
    this.effects.clear();
    this.elapsedMs = 0;
  }

  get isReady(): boolean {
    return this.template !== null;
  }

  /**
   * Number of color variants in the active ColorChange template, or 0 if
   * the template doesn't use ColorChange.
   */
  get variantCount(): number {
    const cc = this.findColorChange();
    return cc ? cc.variantCount : 0;
  }

  /**
   * Currently selected variant index (0-based).
   */
  get currentVariant(): number {
    const cc = this.findColorChange();
    return cc ? cc.currentVariant : 0;
  }

  /**
   * Set the active variant index directly (for UI controls).
   */
  setVariant(index: number): void {
    const cc = this.findColorChange();
    if (cc) cc.setVariant(index);
  }

  private findColorChange(): ColorChangeTemplate | null {
    if (!this.template) return null;
    const found = findTemplate(this.template, (n) => n instanceof ColorChangeTemplate);
    return found as ColorChangeTemplate | null;
  }
}

/** Depth-first search of a template tree. */
function findTemplate(
  node: StyleTemplate,
  predicate: (n: StyleTemplate) => boolean,
): StyleTemplate | null {
  if (predicate(node)) return node;
  for (const child of node.getChildren()) {
    const found = findTemplate(child, predicate);
    if (found) return found;
  }
  return null;
}
