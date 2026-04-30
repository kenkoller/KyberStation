'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /**
   * How far below the visible state the section starts (px).
   * Default 12 — subtle nudge, not a parallax slam.
   */
  offsetY?: number;
  /**
   * Reveal-transition duration in ms. Default 600.
   */
  durationMs?: number;
  /**
   * Optional render-as element. Default `'div'`.
   */
  as?: 'div' | 'section' | 'article';
  className?: string;
  /** Extra inline style merged with the reveal transform/opacity. */
  style?: CSSProperties;
}

/**
 * IntersectionObserver-driven fade-and-rise primitive for marketing
 * pages. Cheap (one observer per element, disconnected after first
 * intersection) and respects `prefers-reduced-motion`: when the user
 * has reduced motion enabled, the section is rendered fully visible
 * with no transition.
 *
 * Use sparingly — applying it to every section produces a "loading
 * checklist" feel that fights the static-till-hover discipline from
 * `docs/UX_NORTH_STAR.md`. Best applied to the hero and one or two
 * downstream feature blocks per page.
 */
export function ScrollReveal({
  children,
  offsetY = 12,
  durationMs = 600,
  as = 'div',
  className,
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const node = ref.current;
    if (!node) {
      return;
    }
    if (reducedMotion) {
      setRevealed(true);
      return;
    }
    if (!('IntersectionObserver' in window)) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const transitionStyle: CSSProperties = reducedMotion
    ? {}
    : {
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : `translateY(${offsetY}px)`,
        transition: `opacity ${durationMs}ms ease-out, transform ${durationMs}ms ease-out`,
        willChange: revealed ? undefined : 'opacity, transform',
      };

  const Tag = as as 'div';

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{ ...transitionStyle, ...style }}
    >
      {children}
    </Tag>
  );
}
