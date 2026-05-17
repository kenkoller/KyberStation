// ─── ProffieOS Button-Event Emit Map — Wave 8 ────────────────────────
//
// Mirror of `apps/web/lib/propFileProfiles.ts` event vocabulary +
// `packages/engine/src/modulation/types.ts` `PropFileEvent` union,
// kept local because the codegen workspace doesn't link cross-package
// source at compile time (see CLAUDE.md decision #1 — `node-linker=hoisted`
// with `symlink=false`). A drift sentinel in
// `tests/proffieOSEmitter/buttonEventMap.test.ts` asserts the local
// `PropFileEvent` mirror stays assignment-compatible with the engine
// canonical type.
//
// ─── What this module owns ──────────────────────────────────────────
//
// When a `SerializedBinding` has `triggerEvent` set, the binding's
// source is required to be one of the 8 aux/gesture event modulators
// (registered in `packages/engine/src/modulation/registry.ts`). The
// pair (source, triggerEvent) tells codegen WHICH ProffieOS `EFFECT_*`
// constant the binding fires on, and which wrapper template best
// expresses the trigger semantics.
//
// `BUTTON_EVENT_EMIT_MAP` keys on the `triggerEvent` value (the
// firmware-level event name, not the modulator ID) and returns the
// emit spec. The lookup is `triggerEvent`-keyed rather than
// `(source, triggerEvent)`-keyed because the source's job is to
// declare "this is the latched-envelope value to USE inside the
// EFFECT_* wrapper" — the WHICH-EFFECT decision is event-driven.
//
// Future wave (UI side) may surface a per-binding override letting
// the user pick a different EFFECT_* constant; today the table is the
// single source of truth and bindings either match a known event or
// fall through to the snapshot path.
//
// ─── Mapping rationale ──────────────────────────────────────────────
//
// `'click'`                  → EFFECT_BLAST
//   Single aux button click in the Fett263 prop fires a blaster-deflect
//   blast. EFFECT_BLAST is the canonical ProffieOS trigger.
//
// `'long-press'`             → EFFECT_FORCE
//   Long-press maps to the "force effect" action in Fett263/SA22C.
//   EFFECT_FORCE is the standard trigger.
//
// `'hold'`                   → EFFECT_LOCKUP_BEGIN
//   Holding the aux button begins a lockup (clash + sustained
//   contact). EFFECT_LOCKUP_BEGIN is the standard trigger.
//
// `'double-click'`           → EFFECT_USER1
//   Double-click has no firmware-canonical mapping — it's a
//   prop-file-author free slot. EFFECT_USER1 is the safe userland
//   constant that Fett263 already routes via OS7.
//
// `'triple-click'`           → EFFECT_USER2
//   Same rationale as double-click — userland slot. EFFECT_USER2.
//
// `'click-and-hold'`         → EFFECT_LOCKUP_BEGIN
//   Composite gesture commonly used for lockup in BC button controls.
//   Same target as `hold` since both gestures express "sustained
//   contact" semantics; the prop file disambiguates internally.
//
// `'held-plus-other-click'`  → EFFECT_USER3
//   Two-button combo — narrowest vocabulary entry; userland slot.
//   EFFECT_USER3.
//
// `'swing'`                  → EFFECT_USER4
//   Distinct from the continuous `swing` modulator: a discrete IMU
//   swing-event trigger. Continuous swing already has its own
//   ProffieOS template chain (SwingSpeed<>), so the discrete event
//   maps to a userland slot rather than EFFECT_USER1/2 which the
//   button events already claim.
//
// `'stab'`                   → EFFECT_STAB
//   ProffieOS-canonical stab trigger. Used by all four prop files.
//
// `'thrust'`                 → EFFECT_STAB
//   SA22C-only event; treated as a synonym for `stab` since both map
//   to forward-thrust IMU semantics. EFFECT_STAB.
//
// `'twist'`                  → EFFECT_USER5
//   Twist-gesture in Fett263/SA22C — usually bound to "next preset"
//   navigation, but as an effect trigger it lands in userland.
//
// `'shake'`                  → EFFECT_USER6
//   Fett263-only sustained-shake event. Userland slot.

import type { StyleNode } from '../types.js';

// ─── Local mirror of the engine's PropFileEvent union ────────────────

/**
 * Discrete button events emitted by the prop file on physical input.
 * Mirror of `packages/engine/src/modulation/types.ts` ButtonEvent.
 */
export type ButtonEvent =
  | 'click'
  | 'long-press'
  | 'hold'
  | 'double-click'
  | 'triple-click'
  | 'click-and-hold'
  | 'held-plus-other-click';

/**
 * Discrete gesture events emitted by the prop file on IMU detection.
 * Mirror of `packages/engine/src/modulation/types.ts` GestureEvent.
 */
export type GestureEvent = 'swing' | 'stab' | 'thrust' | 'twist' | 'shake';

/**
 * Union of all prop-file events a binding can be coupled to. Mirror
 * of `packages/engine/src/modulation/types.ts` PropFileEvent.
 *
 * The drift sentinel in `buttonEventMap.test.ts` asserts this stays
 * assignment-compatible with the engine canonical type.
 */
export type PropFileEvent = ButtonEvent | GestureEvent;

// ─── Wrapper-template identifiers ───────────────────────────────────

/**
 * ProffieOS template wrapper used to express a button-event trigger.
 *
 * - `EffectPulseF`     — fires a one-shot pulse (0→1→0 envelope) on
 *                        the matching EFFECT_* event. Best for
 *                        discrete blast / stab / clash semantics.
 * - `TransitionEffectL` — runs a `Tr*` transition over the layer in
 *                        response to the EFFECT_*. Best for time-
 *                        bounded fade-style responses (lockup begin,
 *                        force push).
 * - `Trigger`          — sustained trigger that holds 1 while the
 *                        event is active. Best for hold-style
 *                        events (sustained press, sustained shake).
 */
export type ButtonEventWrapper =
  | 'EffectPulseF'
  | 'TransitionEffectL'
  | 'Trigger';

// ─── Public spec ─────────────────────────────────────────────────────

export interface ButtonEventEmitSpec {
  /**
   * ProffieOS `EFFECT_*` constant the binding maps to. All values are
   * known firmware-recognised constants in ProffieOS 7.x:
   *
   *   - EFFECT_BLAST, EFFECT_FORCE, EFFECT_STAB
   *   - EFFECT_LOCKUP_BEGIN
   *   - EFFECT_USER1 .. EFFECT_USER6 (userland slots)
   */
  readonly effectConstant: string;
  /**
   * Recommended wrapper template. The emit-time composer picks the
   * default unless the binding's `combinator` overrides it
   * (`replace` ⇒ `EffectPulseF`, `add`/`multiply`/`min`/`max` ⇒
   * `TransitionEffectL`).
   */
  readonly defaultWrapper: ButtonEventWrapper;
  /** Human-readable docstring for the mapping rationale. */
  readonly notes: string;
}

// ─── Mapping table ───────────────────────────────────────────────────

/**
 * Source-of-truth (PropFileEvent → EFFECT_*) mapping table. Keyed on
 * the firmware event name; the emit path reads `triggerEvent` off the
 * `SerializedBinding` and looks it up here.
 *
 * If a future prop file extends the event vocabulary, add an entry
 * here AND update the engine `PropFileEvent` union — the drift
 * sentinel in `buttonEventMap.test.ts` keeps the two in lock-step.
 */
export const BUTTON_EVENT_EMIT_MAP: Readonly<Record<PropFileEvent, ButtonEventEmitSpec>> = Object.freeze({
  // ─── Button events ───────────────────────────────────────────────
  'click': Object.freeze({
    effectConstant: 'EFFECT_BLAST',
    defaultWrapper: 'EffectPulseF',
    notes: 'Standard blaster-deflect blast on single aux click. Canonical Fett263 mapping.',
  }),
  'long-press': Object.freeze({
    effectConstant: 'EFFECT_FORCE',
    defaultWrapper: 'TransitionEffectL',
    notes: 'Force-push / force-effect trigger on long-press. Canonical Fett263/SA22C mapping.',
  }),
  'hold': Object.freeze({
    effectConstant: 'EFFECT_LOCKUP_BEGIN',
    defaultWrapper: 'TransitionEffectL',
    notes: 'Lockup begin on sustained aux hold. Canonical Fett263/SA22C/BC/Default mapping.',
  }),
  'double-click': Object.freeze({
    effectConstant: 'EFFECT_USER1',
    defaultWrapper: 'EffectPulseF',
    notes: 'Userland slot — Fett263 routes through OS7 user effect; prop file authors may rebind.',
  }),
  'triple-click': Object.freeze({
    effectConstant: 'EFFECT_USER2',
    defaultWrapper: 'EffectPulseF',
    notes: 'Userland slot — narrower vocabulary, Fett263-only.',
  }),
  'click-and-hold': Object.freeze({
    effectConstant: 'EFFECT_LOCKUP_BEGIN',
    defaultWrapper: 'TransitionEffectL',
    notes: 'Composite gesture commonly used for lockup in BC button controls — same semantics as `hold`.',
  }),
  'held-plus-other-click': Object.freeze({
    effectConstant: 'EFFECT_USER3',
    defaultWrapper: 'EffectPulseF',
    notes: 'Two-button combo — narrowest vocabulary entry; userland slot.',
  }),
  // ─── Gesture events ──────────────────────────────────────────────
  'swing': Object.freeze({
    effectConstant: 'EFFECT_USER4',
    defaultWrapper: 'EffectPulseF',
    notes: 'Discrete IMU swing-event trigger — distinct from continuous `swing` modulator (which uses SwingSpeed<>).',
  }),
  'stab': Object.freeze({
    effectConstant: 'EFFECT_STAB',
    defaultWrapper: 'EffectPulseF',
    notes: 'Canonical ProffieOS stab trigger. Used by all four prop files (Fett263/SA22C/BC/Default).',
  }),
  'thrust': Object.freeze({
    effectConstant: 'EFFECT_STAB',
    defaultWrapper: 'EffectPulseF',
    notes: 'SA22C-only event — synonym for `stab` since both map to forward-thrust IMU semantics.',
  }),
  'twist': Object.freeze({
    effectConstant: 'EFFECT_USER5',
    defaultWrapper: 'EffectPulseF',
    notes: 'Twist-gesture trigger — Fett263/SA22C usually bind this to navigation, so as an effect it lands in userland.',
  }),
  'shake': Object.freeze({
    effectConstant: 'EFFECT_USER6',
    defaultWrapper: 'Trigger',
    notes: 'Fett263-only sustained shake — Trigger wrapper picked over EffectPulseF since shake is sustained, not one-shot.',
  }),
});

// ─── Lookup helper ───────────────────────────────────────────────────

/**
 * Look up the emit spec for a prop-file event. Returns `null` when
 * the event isn't a known `PropFileEvent` — the caller should treat
 * the binding as snapshot-fallback in that case (forward-compat for
 * prop files that extend the vocabulary out-of-band).
 *
 * Accepts a `string` because `SerializedBinding.triggerEvent` is
 * typed as `string` on the wire form (engine types.ts §"prop-file
 * event vocabulary"). The lookup performs the runtime narrowing.
 */
export function lookupButtonEventEmit(
  triggerEvent: string,
): ButtonEventEmitSpec | null {
  return (BUTTON_EVENT_EMIT_MAP as Record<string, ButtonEventEmitSpec | undefined>)[triggerEvent] ?? null;
}

// ─── AST builders ────────────────────────────────────────────────────

/**
 * Build the ProffieOS template wrapper that fires `inner` on the
 * given EFFECT_* event.
 *
 * Output shapes per wrapper:
 *
 *   EffectPulseF<EFFECT_X>
 *     One-shot pulse function — emits when the event fires, decays
 *     per ProffieOS firmware. Used directly as a driver in
 *     `Scale<>`-style compositions.
 *
 *   TransitionEffectL<TrInstant, inner, EFFECT_X>
 *     Layer-level transition wrapper — the `inner` template is
 *     instantly substituted when the event fires. `TrInstant` is
 *     used as the default transition; the UI can grow knobs for
 *     other transition shapes later.
 *
 *   Trigger<EFFECT_X, inner>
 *     Sustained trigger — `inner` is active for the duration of the
 *     event. Used for hold-style events.
 *
 * The choice between wrappers is the spec's `defaultWrapper`; the
 * caller may override via the wrapper arg. `inner` is the driver
 * sub-AST (typically a `Scale<...>` from `mapBindings`'s standard
 * builder, or the bare modulator if the caller composes its own).
 */
export function buildButtonEventWrapper(
  spec: ButtonEventEmitSpec,
  inner: StyleNode,
  wrapperOverride?: ButtonEventWrapper,
): StyleNode {
  const wrapper = wrapperOverride ?? spec.defaultWrapper;
  const effectConst: StyleNode = { type: 'raw', name: spec.effectConstant, args: [] };

  switch (wrapper) {
    case 'EffectPulseF':
      // EffectPulseF<EFFECT_X> — discards `inner` because EffectPulseF
      // is itself a numeric driver. We keep `inner` as a sibling Scale<>
      // wrapping on the outside (handled by the caller), but the
      // wrapper template here is just the bare pulse function.
      return { type: 'function', name: 'EffectPulseF', args: [effectConst] };
    case 'TransitionEffectL':
      // TransitionEffectL<TrInstant, inner, EFFECT_X>
      return {
        type: 'function',
        name: 'TransitionEffectL',
        args: [
          { type: 'raw', name: 'TrInstant', args: [] },
          inner,
          effectConst,
        ],
      };
    case 'Trigger':
      // Trigger<EFFECT_X, inner>
      return {
        type: 'function',
        name: 'Trigger',
        args: [effectConst, inner],
      };
  }
}

// ─── Validation helper ──────────────────────────────────────────────

/**
 * Returns `true` iff `s` is a known `EFFECT_*` constant string. Used
 * by the table-coverage test to assert every spec carries a valid
 * ProffieOS effect constant.
 *
 * Pattern: `EFFECT_` followed by uppercase letters / digits / underscores.
 * Matches the ProffieOS firmware constant naming convention from
 * `props/saber.h` and `props/prop_base.h`.
 */
export function isValidEffectConstant(s: string): boolean {
  return /^EFFECT_[A-Z0-9_]+$/.test(s);
}
