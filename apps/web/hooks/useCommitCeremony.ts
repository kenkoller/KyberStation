'use client';

// ─── commitCeremony() — UX North Star §7 Motion Primitive ───
//
// Scarif-style physical-slot commit ceremony for multi-stage write/flash
// operations. Per the UX North Star spec:
//
//   commitCeremony(stage) — Ambient amber lighting cast on chrome for
//   800–1500ms during commit operations; three-stage reveal
//   (prepared / writing / verified).
//
// This primitive owns *envelope* concerns only:
//
//   1. An ambient amber warm-light halo during the "writing" stage
//      (radial, pulsing, ease-in + hold + ease-out via CSS keyframes).
//   2. A green triumph flash on "verified"/"done" that holds briefly
//      before fading to idle.
//   3. A cross-fade coefficient that consumers can apply to the stage
//      label/glyph so transitions don't hard-cut.
//
// The underlying state-machine (card detection → payload prep → write
// → verify → idle reset) stays in the consumer. This hook only turns
// the current *stage name* into presentation hints.
//
// ── Consumers ──
//
//   - CardWriter (SD card write / ZIP export) — primary consumer.
//   - FlashPanel (WebUSB flash) — same multi-stage semantics, wired
//     in a later pass.
//
// ── API ──
//
//   const {
//     stage,                 // current stage id
//     triggerStage(name),    // advance the ceremony
//     envelopeStyle,         // CSSProperties for the panel wrapper
//     glyphTransition,       // helper for cross-fading stage label/glyph
//     ambientClassName,      // className to apply to the wrapper
//     reducedMotion,         // true when motion should snap
//   } = useCommitCeremony({ stage });
//
// ── Reduced motion ──
//
// We observe `prefers-reduced-motion: reduce`, `.reduced-motion` (set
// by useAccessibilityApplier), and `html.perf-lite`. When any is
// active, the hook returns `reducedMotion: true`, zeroes the
// envelope opacity, and consumers skip the ambient halo entirely.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

// ── Stage type — narrowed to the 3 ceremonial stages mentioned in the
// spec plus an `idle` rest state and an `error` terminal state. The
// CardWriter state machine has more granular phases (selecting,
// detecting, backing_up, writing, verifying, done); consumers map
// those to the ceremonial stages below.

export type CommitStage =
  | 'idle'
  | 'prepared'
  | 'writing'
  | 'verified'
  | 'error';

export interface CommitCeremonyOptions {
  /**
   * Drive the ceremony from an external state source. When set, the
   * hook syncs `stage` to this value on every render and `triggerStage`
   * becomes a no-op (the consumer is authoritative).
   */
  stage?: CommitStage;

  /**
   * Override the amber halo duration in ms. The spec calls for
   * 800–1500ms; the default sits in the middle at 1200ms so the
   * pulse feels ceremonial without dragging.
   */
  haloDurationMs?: number;

  /**
   * Override the "verified" triumph flash hold time. Default 1000ms
   * per task spec ("hold ~1s before returning to idle").
   */
  verifiedHoldMs?: number;
}

export interface CommitCeremonyState {
  /** Current ceremonial stage. */
  stage: CommitStage;

  /**
   * Advance the ceremony. Ignored when `options.stage` is supplied
   * (external source takes precedence).
   */
  triggerStage: (next: CommitStage) => void;

  /**
   * Inline styles for the panel wrapper. Supplies box-shadow halo
   * (amber during `writing`, green during `verified`) and a
   * CSS-variable-driven transition so shadow changes ease in/out.
   */
  envelopeStyle: CSSProperties;

  /**
   * CSS class name to apply to the panel wrapper. Varies by stage
   * so the stylesheet can drive keyframe-based pulses without
   * per-stage `<style>` blocks in the consumer.
   */
  ambientClassName: string;

  /**
   * Helper: returns `{ className, style }` for a crossfade wrapper
   * keyed on the current stage. Consumers use this to wrap the
   * stage label / glyph so stage changes fade rather than hard-cut.
   *
   *   <div {...glyphTransition(stage)}>{label}</div>
   */
  glyphTransition: (stageKey: string) => {
    className: string;
    style: CSSProperties;
    key: string;
  };

  /**
   * True when motion is suppressed. Consumers can branch on this to
   * skip the entire halo layer rather than render an invisible one.
   */
  reducedMotion: boolean;
}

// ── Reduced-motion detection ─────────────────────────────────────────
//
// Mirrors useFilenameReveal's approach — matchMedia is the source of
// truth when available, plus we watch `.reduced-motion` and
// `html.perf-lite` as explicit user/app overrides.

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return true;
    }
  } catch {
    /* fallthrough */
  }
  if (typeof document === 'undefined') return false;
  const body = document.body;
  const html = document.documentElement;
  if (body && body.classList.contains('reduced-motion')) return true;
  if (html && html.classList.contains('perf-lite')) return true;
  return false;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useCommitCeremony(
  options: CommitCeremonyOptions = {},
): CommitCeremonyState {
  const haloDuration = options.haloDurationMs ?? 1200;
  const verifiedHoldMs = options.verifiedHoldMs ?? 1000;

  // Internal stage when no external stage is provided.
  const [internalStage, setInternalStage] = useState<CommitStage>('idle');
  // Track reduced-motion reactively so toggling the OS setting
  // mid-session takes effect without a page reload.
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    detectReducedMotion(),
  );

  const externalStage = options.stage;
  const stage: CommitStage = externalStage ?? internalStage;

  // Keep reducedMotion in sync with matchMedia changes.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => setReducedMotion(detectReducedMotion());
    // Older Safari uses addListener/removeListener.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mql as any).addListener?.(onChange);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mql as any).removeListener?.(onChange);
    };
  }, []);

  // `triggerStage` advances the internal stage and auto-decays
  // `verified` back to `idle` after the triumph-flash hold.
  const decayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerStage = useCallback(
    (next: CommitStage) => {
      if (externalStage !== undefined) return; // external source wins
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
        decayTimerRef.current = null;
      }
      setInternalStage(next);
      if (next === 'verified') {
        decayTimerRef.current = setTimeout(() => {
          setInternalStage('idle');
          decayTimerRef.current = null;
        }, verifiedHoldMs);
      }
    },
    [externalStage, verifiedHoldMs],
  );

  // Clear any pending decay on unmount.
  useEffect(() => {
    return () => {
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
        decayTimerRef.current = null;
      }
    };
  }, []);

  const envelopeStyle = useMemo<CSSProperties>(() => {
    // Reduced motion: no halo at all. Consumers skip the visual
    // layer entirely; this style block becomes inert.
    if (reducedMotion) {
      return {
        // Transparent rings so the wrapper's layout stays identical.
        boxShadow: 'none',
        transition: 'none',
      };
    }

    // Expose CSS custom properties the stylesheet keyframes read.
    return {
      ['--commit-ceremony-halo-duration' as string]: `${haloDuration}ms`,
      // No inline box-shadow — the ambientClassName drives the
      // animation via keyframes so the halo eases in + holds + eases
      // out without React re-renders.
    };
  }, [reducedMotion, haloDuration]);

  const ambientClassName = useMemo<string>(() => {
    if (reducedMotion) return 'commit-ceremony commit-ceremony--reduced';
    switch (stage) {
      case 'writing':
        return 'commit-ceremony commit-ceremony--writing';
      case 'verified':
        return 'commit-ceremony commit-ceremony--verified';
      case 'error':
        return 'commit-ceremony commit-ceremony--error';
      case 'prepared':
        return 'commit-ceremony commit-ceremony--prepared';
      case 'idle':
      default:
        return 'commit-ceremony commit-ceremony--idle';
    }
  }, [stage, reducedMotion]);

  const glyphTransition = useCallback(
    (stageKey: string) => {
      if (reducedMotion) {
        return {
          className: 'commit-ceremony-glyph commit-ceremony-glyph--reduced',
          style: {} as CSSProperties,
          key: stageKey,
        };
      }
      return {
        className: 'commit-ceremony-glyph',
        style: {} as CSSProperties,
        key: stageKey,
      };
    },
    [reducedMotion],
  );

  return {
    stage,
    triggerStage,
    envelopeStyle,
    ambientClassName,
    glyphTransition,
    reducedMotion,
  };
}

// ── Pure helpers (exported for tests) ────────────────────────────────

/**
 * Map a CardWriter WritePhase (or any granular phase string) to the
 * ceremonial stage. Pure function — safe to unit-test without a DOM.
 *
 * The mapping deliberately collapses granular phases to the 3-stage
 * ceremony mentioned in the spec:
 *
 *   - idle               → idle
 *   - selecting          → idle   (pre-ceremony; user is choosing)
 *   - detecting          → prepared
 *   - backing_up         → prepared
 *   - writing            → writing
 *   - verifying          → writing (still an "in-flight commit")
 *   - done               → verified
 *   - error              → error
 *
 * The choice to map `verifying` to `writing` keeps the amber halo lit
 * until the final "verified" triumph — verification is still part of
 * the hot-path commit in user-perception terms.
 */
export function phaseToStage(phase: string): CommitStage {
  switch (phase) {
    case 'idle':
    case 'selecting':
      return 'idle';
    case 'detecting':
    case 'backing_up':
      return 'prepared';
    case 'writing':
    case 'verifying':
      return 'writing';
    case 'done':
      return 'verified';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}
