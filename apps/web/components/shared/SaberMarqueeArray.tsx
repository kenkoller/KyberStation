'use client';

import Link from 'next/link';
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BladeConfig, RGB } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

// ─── SaberMarqueeArray — shared horizontal-marquee primitive ─────────────
//
// Originally lived inside `components/landing/LandingSaberArray.tsx`. Lifted
// into a shared primitive so the editor's Gallery tab can reuse the exact
// same visual shape: zip-hue-spread horizontal rows, hover-to-ignite live
// tick, IntersectionObserver lazy-mount, per-row direction + duration.
//
// Two sites consume it:
//   1. Landing page `LandingSaberArray` — clicks open a preset in the
//      editor via a Next.js `<Link href="/editor?s=...">`.
//   2. Editor Gallery tab `GalleryMarquee` — clicks run an onClick
//      callback that loads the preset into bladeStore + switches tabs.
//
// Differences between the two modes are expressed via the `variant` prop
// on `<MarqueeCard>` so both sites share identical hover / halo / engine-
// tick behavior.

// ─── Hue-spread utilities (pure) ────────────────────────────────────────

/**
 * Bucket a color into one of 7 slots (6 hue wheel sectors + 1 achromatic)
 * so the spread algorithm can walk them round-robin. Deterministic — no
 * hydration mismatch. Achromatic = d<25 OR near-white (both channels
 * saturated high).
 */
export function hueBucket(rgb: RGB): number {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 25 || (max > 230 && min > 200)) return 6; // white / near-achromatic
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = ((b - r) / d + 2);
  else h = ((r - g) / d + 4);
  return Math.floor(h) % 6; // 0..5
}

/**
 * Round-robin walk over hue buckets so adjacent items in the output rarely
 * share a color. Deterministic.
 */
export function spreadByHue<T extends { config: BladeConfig }>(items: T[]): T[] {
  const buckets: T[][] = [[], [], [], [], [], [], []];
  for (const item of items) {
    buckets[hueBucket(item.config.baseColor)].push(item);
  }
  const out: T[] = [];
  let remaining = items.length;
  let bi = 0;
  while (remaining > 0) {
    const bucket = buckets[bi];
    if (bucket.length > 0) {
      out.push(bucket.shift()!);
      remaining--;
    }
    bi = (bi + 1) % buckets.length;
  }
  return out;
}

/**
 * Zip two hue-spread pools into a single pool that alternates between
 * them while preserving within-pool hue spread. Used on the landing page
 * to intermingle canonical characters with creative styles so both pools
 * appear evenly throughout each marquee row.
 */
export function zipHueSpread<T extends { config: BladeConfig }>(
  a: T[],
  b: T[],
): T[] {
  const spreadA = spreadByHue(a);
  const spreadB = spreadByHue(b);
  const out: T[] = [];
  const max = Math.max(spreadA.length, spreadB.length);
  for (let i = 0; i < max; i++) {
    if (i < spreadA.length) out.push(spreadA[i]);
    if (i < spreadB.length) out.push(spreadB[i]);
  }
  return out;
}

// ─── MarqueeCard ────────────────────────────────────────────────────────
//
// Wraps a MiniSaber + label pair. Lazy-mounts the engine-backed saber
// once the card scrolls into view (IntersectionObserver), then keeps
// `inView` live so off-screen cards freeze to zero per-tick CPU. On
// hover, brightens the border + halo without shifting the layout by a
// pixel (inset box-shadow simulates a thicker border).
//
// Two variants:
//   - 'link': renders a Next.js <Link href={href}>. Used by landing page
//     where clicking opens the editor via a URL.
//   - 'button': renders a <button> with onClick. Used by the editor's
//     Gallery tab where clicking loads the preset into bladeStore and
//     switches tabs imperatively (no URL change).

export interface MarqueeCardPreset {
  label: string;
  /** Secondary line beneath the label (e.g. character name, style description). */
  subtitle: string;
  config: BladeConfig;
}

export type MarqueeCardVariant =
  | { kind: 'link'; href: string }
  | { kind: 'button'; onClick: () => void };

export interface MarqueeCardProps {
  preset: MarqueeCardPreset;
  variant: MarqueeCardVariant;
  /** Aria-label prefix. Landing says "Open ... in the editor"; gallery says "Load ...". */
  ariaLabelPrefix?: string;
  /** Hilt assembly id to render under the blade. Default 'graflex'. */
  hiltId?: string;
  /** Target frame rate for the animated tick loop. Default 30. */
  fps?: number;
  /** Per-card stable identifier for data-card-key. Default preset.label. */
  cardKey?: string;
}

/**
 * Standalone card component usable outside a marquee row (e.g. if a
 * caller wants to render a grid of these without the horizontal scroll).
 * GalleryMarquee uses the marquee rows below; SurpriseMeCard / NewSaberCard
 * use this shape indirectly through custom rendering that matches these
 * dimensions.
 */
export const MarqueeCard = forwardRef<HTMLAnchorElement | HTMLButtonElement, MarqueeCardProps>(
  function MarqueeCard(
    {
      preset,
      variant,
      ariaLabelPrefix = 'Open',
      hiltId = 'graflex',
      fps = 30,
      cardKey,
    },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
    const [mounted, setMounted] = useState(false);
    const [inView, setInView] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      const node = localRef.current;
      if (!node) return;
      // 200px rootMargin pre-mounts cards slightly before they scroll into
      // view and keeps them animated slightly after they leave, so fast-
      // drifting cards never flash "frozen" at the visible edges.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const intersecting = entry.isIntersecting;
            setInView(intersecting);
            if (intersecting) setMounted(true);
          }
        },
        { rootMargin: '200px 200px 200px 200px' },
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    const { r, g, b } = preset.config.baseColor;
    const accentCss = `rgb(${r},${g},${b})`;

    const setRef = (node: HTMLAnchorElement | HTMLButtonElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node as HTMLAnchorElement & HTMLButtonElement);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLAnchorElement | HTMLButtonElement | null>).current =
          node;
      }
    };

    const commonStyle: React.CSSProperties = {
      width: '200px',
      // Hover: brighten the border color + stack an inset 1px box-shadow
      // on top of the static 1px CSS border. Combined effect reads as a
      // 2px colored edge without toggling border width (which would
      // shift layout by a pixel and cause a twitch).
      borderColor: isHovered ? `rgba(${r},${g},${b},0.85)` : 'rgb(var(--border-subtle))',
      transition:
        'border-color 800ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 800ms cubic-bezier(0.4, 0, 0.2, 1)',
      // Double-layer shadow on hover: inset 1px inner stroke (simulates
      // border thickness) + outer bloom (the halo).
      boxShadow: isHovered
        ? `inset 0 0 0 1px rgba(${r},${g},${b},0.6), 0 0 48px 2px rgba(${r},${g},${b},0.42)`
        : 'none',
    };

    const commonClassName =
      'relative shrink-0 flex flex-col gap-3 rounded-lg border bg-bg-card/60 backdrop-blur-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

    const children = (
      <>
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 35% 70% at center, ${accentCss} 0%, transparent 65%)`,
            opacity: isHovered ? 0.22 : 0.1,
            filter: 'blur(24px)',
            transition:
              'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        <div
          className="relative flex items-end justify-center w-full pt-5"
          style={{ minHeight: '360px' }}
        >
          {mounted ? (
            <MiniSaber
              config={preset.config}
              hiltId={hiltId}
              orientation="vertical"
              bladeLength={260}
              bladeThickness={5}
              hiltLength={72}
              controlledIgnited={true}
              animated={inView}
              fps={fps}
            />
          ) : (
            <MarqueeCardPlaceholder accentCss={accentCss} />
          )}
        </div>

        <div className="relative text-center pb-4 px-3">
          <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary">
            {preset.label.toUpperCase()}
          </div>
          <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
            {preset.subtitle}
          </div>
        </div>
      </>
    );

    const handlers = {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onFocus: () => setIsHovered(true),
      onBlur: () => setIsHovered(false),
    };

    if (variant.kind === 'link') {
      return (
        <Link
          ref={(node) => setRef(node)}
          href={variant.href}
          aria-label={`${ariaLabelPrefix} ${preset.label} in the editor`}
          className={commonClassName}
          style={commonStyle}
          data-card-key={cardKey ?? preset.label}
          {...handlers}
        >
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={(node) => setRef(node)}
        type="button"
        onClick={variant.onClick}
        aria-label={`${ariaLabelPrefix} ${preset.label}`}
        className={`${commonClassName} text-left cursor-pointer`}
        style={commonStyle}
        data-card-key={cardKey ?? preset.label}
        {...handlers}
      >
        {children}
      </button>
    );
  },
);

/**
 * Static silhouette placeholder shown while the card is still outside
 * the IntersectionObserver's root margin. Matches the blade+hilt size
 * roughly so the card doesn't visibly pop in when MiniSaber replaces it.
 */
function MarqueeCardPlaceholder({ accentCss }: { accentCss: string }) {
  return (
    <div className="flex flex-col items-center gap-0">
      <div
        aria-hidden="true"
        style={{
          width: '5px',
          height: '260px',
          background: accentCss,
          opacity: 0.35,
          borderRadius: '2.5px 2.5px 0 0',
          filter: `drop-shadow(0 0 6px ${accentCss}) drop-shadow(0 0 18px ${accentCss})`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          width: '14px',
          height: '72px',
          background: 'linear-gradient(180deg, #3a3a3e 0%, #26262a 60%, #16161a 100%)',
        }}
      />
    </div>
  );
}

// ─── MarqueeRow ─────────────────────────────────────────────────────────
//
// One horizontal drift row. Duplicates its content once so
// translateX(-50%) loops seamlessly. Does not pause on hover (per Ken's
// 2026-04-20 feedback on the landing page — continuous drift reads as
// "premium showcase"). Clicking still works; the Link / button absorbs
// the mouse-down normally even while the row scrolls underneath.

export interface MarqueeRowProps {
  /** The cards to render in this row. Passed straight through — caller
   *  is responsible for hue-spreading them if desired. */
  children: ReactNode;
  direction: 'left' | 'right';
  /** Total loop duration in seconds. Lower = faster drift. Landing uses
   *  280s / 340s per row for a premium-slow showcase; gallery can use
   *  similar values. */
  durationS: number;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

export function MarqueeRow({
  children,
  direction,
  durationS,
  className,
}: MarqueeRowProps) {
  const animationName =
    direction === 'left' ? 'kyber-marquee-left' : 'kyber-marquee-right';

  return (
    <div className={`relative w-full overflow-hidden ${className ?? ''}`}>
      <div
        className="flex gap-4 will-change-transform"
        style={{
          animation: `${animationName} ${durationS}s linear infinite`,
          width: 'max-content',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Convenience: render a single row of cards, doubling the content so the
 * marquee loop is seamless. Matches the landing page pattern 1:1.
 */
export interface MarqueeRowOfCardsProps<T extends MarqueeCardPreset> {
  presets: Array<T & { href?: string; onClick?: () => void }>;
  direction: 'left' | 'right';
  durationS: number;
  /** Shared builder so caller controls whether each card is a link or button. */
  renderCard: (preset: T, index: number) => ReactNode;
  className?: string;
}

export function MarqueeRowOfCards<T extends MarqueeCardPreset>({
  presets,
  direction,
  durationS,
  renderCard,
  className,
}: MarqueeRowOfCardsProps<T>) {
  // Duplicate so translateX(-50%) loops seamlessly. This is the "doubled"
  // pattern from LandingSaberArray — each card keyed by its index in the
  // doubled array so React doesn't reuse engine instances across the
  // seam (which would cause a single visible pop as the halves rotate).
  const doubled = [...presets, ...presets];
  return (
    <MarqueeRow direction={direction} durationS={durationS} className={className}>
      {doubled.map((preset, i) => renderCard(preset, i))}
    </MarqueeRow>
  );
}
