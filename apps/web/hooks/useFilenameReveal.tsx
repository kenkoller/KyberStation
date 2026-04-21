'use client';

// ─── filenameReveal() — UX North Star §7 Motion Primitive ───
//
// Stagger-in reveal of an identifier when it changes. Per the UX
// North Star spec:
//
//   filenameReveal(name) — Large JetBrains Mono Bold (80–120px)
//   stagger-in of identifier, 400ms ease-out, settle.
//
// The primitive is size-agnostic — consumers pick their own typography
// scale; this module only owns the motion. CSS keyframes + per-character
// `animation-delay` drive the reveal (no JS timers), so it participates
// cleanly with React's render cycle and respects `prefers-reduced-motion`
// via a stylesheet rule that nukes the animation to a single frame.
//
// ── API ──
//
//   useFilenameReveal(text, { duration? })
//     → { chars, durationMs, totalMs, isRevealing, staggerMs }
//
//   <FilenameReveal text="obi_wan_anh.h" duration={400} />
//     drop-in JSX — styles the <span>s with the inline CSS variables
//     the `.filename-reveal-char` class consumes.
//
// Consumers can use either form. The hook is handy when you need the
// split characters for a custom layout (mixed fonts, wrapping control);
// the component is the common case.
//
// ── Reduced motion ──
//
// `@media (prefers-reduced-motion: reduce)`, the app `.reduced-motion`
// class (set by useAccessibilityApplier), and `html.perf-lite` all
// override the animation to `none !important` with opacity/transform/
// filter reset. The hook additionally surfaces `isRevealing: false`
// in those cases so consumers can skip glyph-splitting entirely if
// they want.
//
// ── Re-triggering on change ──
//
// Callers use `key={text}` on the component (or on a wrapper when using
// the hook) to force a remount when the filename identifier changes.
// That's the cleanest way to restart a CSS animation in React.

import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';

export interface FilenameRevealOptions {
  /** Total animation duration in ms. Default 400 per §7 spec. */
  duration?: number;
}

export interface FilenameRevealState {
  /** Array of { char, delay } tuples ready for rendering. */
  chars: Array<{ char: string; delayMs: number }>;
  /** The total duration resolved from options or default. */
  durationMs: number;
  /** Delay between adjacent characters (ms). */
  staggerMs: number;
  /** duration + final char delay — useful for downstream coordination. */
  totalMs: number;
  /**
   * Whether motion is expected to run. False when the environment is
   * known-reduced (SSR returns true because we can't detect it yet).
   */
  isRevealing: boolean;
}

/**
 * Split an identifier into per-character render tuples with staggered
 * animation delays. Pure function — safe to unit-test without a DOM.
 */
export function computeReveal(
  text: string,
  opts: FilenameRevealOptions = {},
): FilenameRevealState {
  const durationMs = Math.max(50, opts.duration ?? 400);
  const chars = Array.from(text);
  // Spread delays across ~40% of the total duration so early glyphs
  // start the reveal and the final glyph finishes near `duration`.
  // When len <= 1 there's nothing to stagger.
  const staggerWindow = durationMs * 0.4;
  const staggerMs =
    chars.length > 1 ? staggerWindow / (chars.length - 1) : 0;
  const tuples = chars.map((char, i) => ({
    char,
    delayMs: Math.round(staggerMs * i),
  }));
  const finalDelay = tuples.length > 0 ? tuples[tuples.length - 1]!.delayMs : 0;
  return {
    chars: tuples,
    durationMs,
    staggerMs,
    totalMs: durationMs + finalDelay,
    isRevealing: detectReduced() ? false : true,
  };
}

/**
 * Returns `true` when the current environment prefers reduced motion.
 * Falls back to `false` during SSR (no `window`) — the CSS stylesheet
 * rule handles the client-side override regardless of this return.
 */
function detectReduced(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useFilenameReveal(
  text: string,
  opts: FilenameRevealOptions = {},
): FilenameRevealState {
  return useMemo(() => computeReveal(text, opts), [text, opts.duration]);
}

// ─── <FilenameReveal> component ───────────────────────────────────────

export interface FilenameRevealProps {
  /** The identifier to animate. */
  text: string;
  /** Override the 400ms default. */
  duration?: number;
  /** Optional extra class names on the wrapping <span>. */
  className?: string;
  /** Inline styles on the wrapping <span> (font-size, color, etc). */
  style?: CSSProperties;
  /**
   * `aria-label` override. When omitted, the full text is used so screen
   * readers hear one word rather than each character.
   */
  'aria-label'?: string;
  /** Optional `title` tooltip on the wrapper (useful for truncation). */
  title?: string;
}

/**
 * Stagger-in reveal of `text`. Re-mount with `key={text}` to replay the
 * animation when the identifier changes.
 */
export function FilenameReveal({
  text,
  duration,
  className,
  style,
  title,
  'aria-label': ariaLabel,
}: FilenameRevealProps): ReactElement {
  const { chars, durationMs } = useFilenameReveal(text, { duration });

  return (
    <span
      className={className}
      style={{
        // Expose duration to the stylesheet so `.filename-reveal-char`
        // can consume it without inlining on every <span>.
        ['--filename-reveal-duration' as string]: `${durationMs}ms`,
        ...style,
      }}
      aria-label={ariaLabel ?? text}
      title={title}
    >
      {chars.map((entry, i) => (
        <span
          // Per-character span; aria-hidden so AT reads `aria-label` only.
          key={i}
          aria-hidden="true"
          className="filename-reveal-char"
          style={{
            ['--filename-reveal-delay' as string]: `${entry.delayMs}ms`,
          }}
        >
          {entry.char}
        </span>
      ))}
    </span>
  );
}
