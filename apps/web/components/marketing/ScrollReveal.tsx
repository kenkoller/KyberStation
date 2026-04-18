'use client';

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

export type ScrollRevealVariant = 'fade-up' | 'fade-in' | 'slide-from-left';

export interface ScrollRevealProps {
  children: ReactNode;
  /** Motion variant. Default: 'fade-up'. */
  variant?: ScrollRevealVariant;
  /** Delay before the transition starts, in ms. Useful for staggering siblings. */
  delay?: number;
  /** Render tag. Default: 'div'. Use 'section' / 'article' / etc. to avoid extra DOM. */
  as?: ElementType;
  /** Optional pass-through className for layout composition. */
  className?: string;
  /** Forwarded to the rendered element. */
  id?: string;
}

const HIDDEN_TRANSFORM: Record<ScrollRevealVariant, string> = {
  'fade-up': 'translate3d(0, 12px, 0)',
  'fade-in': 'translate3d(0, 0, 0)',
  'slide-from-left': 'translate3d(-16px, 0, 0)',
};

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION_MS = 450;

/**
 * Detects any of the three reduced-motion signals the app uses:
 *   - OS-level `@media (prefers-reduced-motion: reduce)`
 *   - `.reduced-motion` on <html> (useAccessibilityApplier)
 *   - `html.perf-lite` perf-tier opt-out
 * SSR-safe: returns false on the server.
 */
function shouldSkipMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  if (
    root.classList.contains('reduced-motion') ||
    root.classList.contains('perf-lite')
  ) {
    return true;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * One-shot scroll-triggered reveal. Uses IntersectionObserver + inline CSS
 * transitions — zero new dependencies. Disconnects the observer once revealed.
 * Falls back to final-state rendering under any reduced-motion signal.
 *
 * Defaults `revealed` to `true` so the SSR-rendered HTML ships visible —
 * crawlers, no-JS users, and reduced-motion users all see working content.
 * We only flip to hidden after client hydration confirms motion is safe.
 */
export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  as = 'div',
  className,
  id,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    if (shouldSkipMotion()) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    setRevealed(false);

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translate3d(0, 0, 0)' : HIDDEN_TRANSFORM[variant],
    transition: `opacity ${DURATION_MS}ms ${EASE} ${delay}ms, transform ${DURATION_MS}ms ${EASE} ${delay}ms`,
    willChange: revealed ? undefined : 'opacity, transform',
  };

  return createElement(
    as,
    {
      ref,
      id,
      className,
      style,
      'data-reveal': revealed ? 'in' : 'out',
      'data-reveal-variant': variant,
    },
    children,
  );
}
