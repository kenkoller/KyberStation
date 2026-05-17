// ─── Constant Tag Templates ───
// ProffieOS uses several bare identifiers that aren't first-class style
// templates — they're type/enum tags consumed by a parent template's
// constructor logic. The interpreter still has to *evaluate* them
// (because `evaluateTemplate` walks every child arg eagerly), so they
// must be registered. These leaf templates carry their string tag for
// the parent to read via `getTag()`.
//
// Three tag families live here:
//   - `LockupTypeTagTemplate`   — `SaberBase::LOCKUP_NORMAL` etc.
//   - `EffectTypeTagTemplate`   — `EFFECT_PREON` etc.
//   - `FireConfigTemplate`      — `FireConfig<Cooling, Heating, IntensityBase>`
//
// Tag templates are no-ops at the per-LED rendering level — they exist
// purely as inert payloads that parent templates inspect.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { EffectType, LockupType, StyleTemplate } from '../types.js';

// ─── LockupTypeTagTemplate ───
// Carries one of: LOCKUP_NORMAL, LOCKUP_DRAG, LOCKUP_LIGHTNING_BLOCK,
// LOCKUP_MELT, etc. The parent LockupTrL uses this to filter which
// `effects.lockupType` values activate the layer.

export class LockupTypeTagTemplate extends BaseStyleTemplate {
  readonly lockupType: LockupType;

  constructor(type: LockupType) {
    super();
    this.lockupType = type;
  }

  /** Tag-style introspection — parent templates read this. */
  getTag(): LockupType {
    return this.lockupType;
  }
}

// ─── EffectTypeTagTemplate ───
// Carries one of: EFFECT_CLASH, EFFECT_BLAST, EFFECT_PREON, etc. The
// parent TransitionEffectL / MultiTransitionEffectL uses this to decide
// which effect triggers the wrapped transition.

export class EffectTypeTagTemplate extends BaseStyleTemplate {
  readonly effectType: EffectType;

  constructor(type: EffectType) {
    super();
    this.effectType = type;
  }

  /** Tag-style introspection — parent templates read this. */
  getTag(): EffectType {
    return this.effectType;
  }
}

// ─── FireConfig<Cooling, Heating, IntensityBase> ───
// Structured leaf used as the trailing arg of `StyleFire<>` for the
// `unstable` and `fire` style families. ProffieOS interprets these
// three integers as fire-simulation parameters:
//   - Cooling: per-step heat dissipation rate
//   - Heating: spark intensity at the base
//   - IntensityBase: how much heat persists each frame
// We expose the three values so the parent StyleFire template can use
// them in its heat-map simulation.

export class FireConfigTemplate extends BaseStyleTemplate {
  readonly cooling: number;
  readonly heating: number;
  readonly intensityBase: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.cooling = args[0]?.getInteger(0) ?? 3;
    this.heating = args[1]?.getInteger(0) ?? 2000;
    this.intensityBase = args[2]?.getInteger(0) ?? 5;
  }

  getChildren(): StyleTemplate[] {
    return [];
  }
}

// ─── Type guards ───
// Parent templates use these to detect whether an optional arg is one
// of our tag templates. Lets them fall back to safe defaults when the
// expected tag is missing.

export function isLockupTypeTag(t: StyleTemplate | undefined | null): t is LockupTypeTagTemplate {
  return t instanceof LockupTypeTagTemplate;
}

export function isFireConfig(t: StyleTemplate | undefined | null): t is FireConfigTemplate {
  return t instanceof FireConfigTemplate;
}
