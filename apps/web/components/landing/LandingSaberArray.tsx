'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { BladeConfig, RGB } from '@kyberstation/engine';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing-page breadth showcase — dual edge-to-edge marquees showing
 * ~80 distinct saber configurations. All cards are STATIC by default
 * (zero frame cost); hovering a card pauses that row's drift, ignites
 * the blade's live animation, and brightens the accent. Clicking a
 * card deep-links into `/editor?s=<glyph>` so the visitor can jump
 * straight into that saber in the editor.
 *
 * Perf notes:
 *   - Each card lazy-mounts its MiniSaber via IntersectionObserver
 *     so the main thread only pays the engine-warmup cost for cards
 *     that actually scroll into view.
 *   - Glyph encoding runs ONCE at module load (not per-render), so
 *     the click-through URLs are free at the card level.
 *   - Presets are ordered via a hue-spread round-robin so cards of
 *     the same color are rarely adjacent — keeps the visual rhythm
 *     varied as the marquee drifts.
 */

const LANDING_HILT_ID = 'graflex';

interface ArrayPreset {
  label: string;
  character: string;
  config: BladeConfig;
}

const baseConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'array',
    baseColor: { r: 0, g: 135, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.06,
    ledCount: 144,
    swingFxIntensity: 0,
    noiseLevel: 0,
    ...overrides,
  }) as BladeConfig;

// ─── Canonical pool: 40 screen-accurate characters ────────────────────────
const CANONICAL_SOURCE: ArrayPreset[] = [
  { label: 'Obi-Wan', character: 'Obi-Wan Kenobi · ANH', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Luke ROTJ', character: 'Luke Skywalker · ROTJ', config: baseConfig({ baseColor: { r: 6, g: 234, b: 25 }, style: 'rotoscope' }) },
  { label: 'Kylo Ren', character: 'Ben Solo · TFA', config: baseConfig({ baseColor: { r: 245, g: 38, b: 15 }, style: 'unstable' }) },
  { label: 'Darth Maul', character: 'Maul · TPM', config: baseConfig({ baseColor: { r: 201, g: 8, b: 8 }, style: 'stable' }) },
  { label: 'Ahsoka', character: 'Ahsoka Tano · Rebels', config: baseConfig({ baseColor: { r: 248, g: 247, b: 247 }, style: 'stable' }) },
  { label: 'Mace Windu', character: 'Mace Windu · AOTC', config: baseConfig({ baseColor: { r: 132, g: 11, b: 218 }, style: 'stable' }) },
  { label: 'Rey', character: 'Rey Skywalker · TROS', config: baseConfig({ baseColor: { r: 245, g: 206, b: 10 }, style: 'stable' }) },
  { label: 'Ezra', character: 'Ezra Bridger · Rebels', config: baseConfig({ baseColor: { r: 0, g: 135, b: 255 }, style: 'stable' }) },
  { label: 'Anakin', character: 'Anakin Skywalker · AOTC', config: baseConfig({ baseColor: { r: 15, g: 105, b: 245 }, style: 'stable' }) },
  { label: 'Vader', character: 'Darth Vader · ESB', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Yoda', character: 'Yoda · AOTC', config: baseConfig({ baseColor: { r: 50, g: 245, b: 20 }, style: 'stable' }) },
  { label: 'Qui-Gon', character: 'Qui-Gon Jinn · TPM', config: baseConfig({ baseColor: { r: 54, g: 210, b: 30 }, style: 'stable' }) },
  { label: 'Dooku', character: 'Count Dooku · AOTC', config: baseConfig({ baseColor: { r: 175, g: 29, b: 29 }, style: 'stable' }) },
  { label: 'Kit Fisto', character: 'Kit Fisto · AOTC', config: baseConfig({ baseColor: { r: 17, g: 238, b: 109 }, style: 'stable' }) },
  { label: 'Ventress', character: 'Asajj Ventress · CW', config: baseConfig({ baseColor: { r: 228, g: 7, b: 7 }, style: 'stable' }) },
  { label: 'Cal Cyan', character: 'Cal Kestis · JFO', config: baseConfig({ baseColor: { r: 20, g: 200, b: 245 }, style: 'stable' }) },
  { label: 'Cal Orange', character: 'Cal Kestis · JS', config: baseConfig({ baseColor: { r: 245, g: 116, b: 10 }, style: 'stable' }) },
  { label: 'Revan', character: 'Revan · KOTOR', config: baseConfig({ baseColor: { r: 68, g: 16, b: 198 }, style: 'stable' }) },
  { label: 'Starkiller', character: 'Starkiller · TFU', config: baseConfig({ baseColor: { r: 249, g: 16, b: 20 }, style: 'stable' }) },
  { label: 'Kanan', character: 'Kanan Jarrus · Rebels', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Plo Koon', character: 'Plo Koon · AOTC', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Luminara', character: 'Luminara Unduli · AOTC', config: baseConfig({ baseColor: { r: 60, g: 220, b: 60 }, style: 'stable' }) },
  { label: 'Barriss', character: 'Barriss Offee · CW', config: baseConfig({ baseColor: { r: 60, g: 220, b: 60 }, style: 'stable' }) },
  { label: 'Shaak Ti', character: 'Shaak Ti · AOTC', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Aayla Secura', character: 'Aayla Secura · AOTC', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Ki-Adi-Mundi', character: 'Ki-Adi-Mundi · TPM', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Saesee Tiin', character: 'Saesee Tiin · ROTS', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Adi Gallia', character: 'Adi Gallia · CW', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Quinlan Vos', character: 'Quinlan Vos · CW', config: baseConfig({ baseColor: { r: 60, g: 220, b: 60 }, style: 'stable' }) },
  { label: 'Fifth Brother', character: 'Fifth Brother · Rebels', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Seventh Sister', character: 'Seventh Sister · Rebels', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Grand Inquisitor', character: 'Grand Inquisitor · Rebels', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Mara Jade', character: 'Mara Jade · Legends', config: baseConfig({ baseColor: { r: 132, g: 11, b: 218 }, style: 'stable' }) },
  { label: 'Exar Kun', character: 'Exar Kun · Legends', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Darth Malgus', character: 'Darth Malgus · SWTOR', config: baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }) },
  { label: 'Satele Shan', character: 'Satele Shan · SWTOR', config: baseConfig({ baseColor: { r: 76, g: 38, b: 227 }, style: 'stable' }) },
  { label: 'Ulic Qel-Droma', character: 'Ulic · Legends', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Cara Dune', character: 'Cara Dune · Mandalorian', config: baseConfig({ baseColor: { r: 245, g: 245, b: 245 }, style: 'stable' }) },
  { label: 'Tera Sinube', character: 'Tera Sinube · CW', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Jocasta Nu', character: 'Jocasta Nu · AOTC', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
];

// ─── Creative pool: 40 showpiece blade styles ────────────────────────────
const CREATIVE_SOURCE: ArrayPreset[] = [
  { label: 'Inferno', character: 'Fire · Orange', config: baseConfig({ baseColor: { r: 255, g: 106, b: 12 }, style: 'fire', shimmer: 0.1 }) },
  { label: 'Aurora', character: 'Aurora · Emerald', config: baseConfig({ baseColor: { r: 40, g: 240, b: 170 }, style: 'aurora', shimmer: 0.08 }) },
  { label: 'Plasma Storm', character: 'Plasma · Violet', config: baseConfig({ baseColor: { r: 196, g: 40, b: 245 }, style: 'plasma', shimmer: 0.08 }) },
  { label: 'Data Stream', character: 'DataStream · Matrix', config: baseConfig({ baseColor: { r: 60, g: 255, b: 120 }, style: 'dataStream' }) },
  { label: 'Crystal Shatter', character: 'CrystalShatter · Ice', config: baseConfig({ baseColor: { r: 130, g: 200, b: 255 }, style: 'crystalShatter', shimmer: 0.09 }) },
  { label: 'Helix', character: 'Helix · Gold', config: baseConfig({ baseColor: { r: 255, g: 200, b: 40 }, style: 'helix' }) },
  { label: 'Nebula', character: 'Nebula · Cosmic', config: baseConfig({ baseColor: { r: 180, g: 70, b: 255 }, style: 'nebula', shimmer: 0.08 }) },
  { label: 'Photon Burst', character: 'Photon · White', config: baseConfig({ baseColor: { r: 255, g: 250, b: 200 }, style: 'photon' }) },
  { label: 'Cinder', character: 'Cinder · Ember', config: baseConfig({ baseColor: { r: 255, g: 80, b: 40 }, style: 'cinder', shimmer: 0.1 }) },
  { label: 'Prism', character: 'Prism · Rainbow', config: baseConfig({ baseColor: { r: 255, g: 255, b: 255 }, style: 'prism', shimmer: 0.08 }) },
  { label: 'Gravity', character: 'Gravity · Pool', config: baseConfig({ baseColor: { r: 80, g: 160, b: 255 }, style: 'gravity' }) },
  { label: 'Ember', character: 'Ember · Rise', config: baseConfig({ baseColor: { r: 255, g: 140, b: 40 }, style: 'ember', shimmer: 0.1 }) },
  { label: 'Automata', character: 'Automata · Mint', config: baseConfig({ baseColor: { r: 80, g: 255, b: 180 }, style: 'automata' }) },
  { label: 'Candle', character: 'Candle · Flicker', config: baseConfig({ baseColor: { r: 255, g: 160, b: 60 }, style: 'candle', shimmer: 0.12 }) },
  { label: 'Shatter', character: 'Shatter · Ice', config: baseConfig({ baseColor: { r: 200, g: 220, b: 255 }, style: 'shatter' }) },
  { label: 'Neutron', character: 'Neutron · Cyan', config: baseConfig({ baseColor: { r: 140, g: 220, b: 255 }, style: 'neutron' }) },
  { label: 'Torrent', character: 'Torrent · Azure', config: baseConfig({ baseColor: { r: 20, g: 180, b: 255 }, style: 'torrent' }) },
  { label: 'Vortex', character: 'Vortex · Indigo', config: baseConfig({ baseColor: { r: 180, g: 100, b: 255 }, style: 'vortex' }) },
  { label: 'Tidal', character: 'Tidal · Ocean', config: baseConfig({ baseColor: { r: 60, g: 200, b: 255 }, style: 'tidal' }) },
  { label: 'Mirage', character: 'Mirage · Heat', config: baseConfig({ baseColor: { r: 255, g: 200, b: 180 }, style: 'mirage', shimmer: 0.08 }) },
  { label: 'Wildfire', character: 'Fire · Scarlet', config: baseConfig({ baseColor: { r: 255, g: 60, b: 20 }, style: 'fire', shimmer: 0.12 }) },
  { label: 'Pacific Aurora', character: 'Aurora · Cyan', config: baseConfig({ baseColor: { r: 40, g: 200, b: 255 }, style: 'aurora', shimmer: 0.08 }) },
  { label: 'Magenta Plasma', character: 'Plasma · Pink', config: baseConfig({ baseColor: { r: 245, g: 80, b: 180 }, style: 'plasma', shimmer: 0.09 }) },
  { label: 'Terminal', character: 'DataStream · Amber', config: baseConfig({ baseColor: { r: 255, g: 176, b: 40 }, style: 'dataStream' }) },
  { label: 'Frost Shatter', character: 'CrystalShatter · Pale', config: baseConfig({ baseColor: { r: 220, g: 240, b: 255 }, style: 'crystalShatter', shimmer: 0.1 }) },
  { label: 'Double Helix', character: 'Helix · Aqua', config: baseConfig({ baseColor: { r: 60, g: 220, b: 210 }, style: 'helix' }) },
  { label: 'Red Nebula', character: 'Nebula · Rose', config: baseConfig({ baseColor: { r: 255, g: 80, b: 120 }, style: 'nebula', shimmer: 0.08 }) },
  { label: 'Golden Photon', character: 'Photon · Amber', config: baseConfig({ baseColor: { r: 255, g: 200, b: 60 }, style: 'photon' }) },
  { label: 'Charred', character: 'Cinder · Red', config: baseConfig({ baseColor: { r: 220, g: 30, b: 20 }, style: 'cinder', shimmer: 0.1 }) },
  { label: 'Spectrum', character: 'Prism · Cyan', config: baseConfig({ baseColor: { r: 40, g: 220, b: 230 }, style: 'prism', shimmer: 0.08 }) },
  { label: 'Violet Gravity', character: 'Gravity · Plum', config: baseConfig({ baseColor: { r: 180, g: 80, b: 220 }, style: 'gravity' }) },
  { label: 'Gold Ember', character: 'Ember · Sun', config: baseConfig({ baseColor: { r: 255, g: 200, b: 60 }, style: 'ember', shimmer: 0.08 }) },
  { label: 'Rule 30', character: 'Automata · White', config: baseConfig({ baseColor: { r: 255, g: 255, b: 255 }, style: 'automata' }) },
  { label: 'Green Candle', character: 'Candle · Verdant', config: baseConfig({ baseColor: { r: 120, g: 220, b: 80 }, style: 'candle', shimmer: 0.12 }) },
  { label: 'Crystal Blue', character: 'Shatter · Sapphire', config: baseConfig({ baseColor: { r: 40, g: 120, b: 255 }, style: 'shatter' }) },
  { label: 'Violet Neutron', character: 'Neutron · Amethyst', config: baseConfig({ baseColor: { r: 180, g: 100, b: 255 }, style: 'neutron' }) },
  { label: 'Amber Torrent', character: 'Torrent · Gold', config: baseConfig({ baseColor: { r: 255, g: 180, b: 60 }, style: 'torrent' }) },
  { label: 'Crimson Vortex', character: 'Vortex · Blood', config: baseConfig({ baseColor: { r: 220, g: 40, b: 60 }, style: 'vortex' }) },
  { label: 'Green Tidal', character: 'Tidal · Jade', config: baseConfig({ baseColor: { r: 60, g: 220, b: 120 }, style: 'tidal' }) },
  { label: 'Cool Mirage', character: 'Mirage · Chill', config: baseConfig({ baseColor: { r: 180, g: 220, b: 255 }, style: 'mirage', shimmer: 0.08 }) },
];

// ─── Hue-spread shuffle ────────────────────────────────────────────────────
//
// Deterministic — runs at module load, same result every time, same on
// server and client (no hydration mismatch). Groups presets by their
// blade's hue bucket (0-5 for hue wheel sectors + 6 for achromatic /
// white), then walks buckets round-robin so adjacent cards rarely
// share a color.

function hueBucket(rgb: RGB): number {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 25 || max > 230 && min > 200) return 6; // white / near-achromatic
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = ((b - r) / d + 2);
  else h = ((r - g) / d + 4);
  return Math.floor(h) % 6; // 0..5
}

function spreadByHue<T extends { config: BladeConfig }>(items: T[]): T[] {
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

// ─── Precompute glyph URLs + intermingled split at module load ─────────────
//
// encodeGlyphFromConfig is pure JS and runs fine during SSR. Doing it
// once per preset keeps the click URLs free at render time.
//
// Strategy per Ken's 2026-04-20 feedback: the canonical pool is almost
// entirely `style: 'stable'` — visually static even when animated, so
// the old "top row = canonicals, bottom row = creatives" split left
// the top row looking dead. Fix:
//
//   1. Hue-spread each pool separately so within-type color runs are
//      broken up (no cluster of blue Jedi, no cluster of green styles).
//   2. Zip the two spread pools — canonical, creative, canonical,
//      creative — so every pair of adjacent cards is type-mixed.
//   3. Split the final list by index parity into two rows. Both rows
//      get ~half canonicals + ~half creatives, with the hue spread
//      preserved at the within-row cadence.
//
// Result: each row alternates "familiar face, wild style, familiar
// face, wild style" while still avoiding adjacent same-color cards.

interface ResolvedPreset extends ArrayPreset {
  href: string;
}

function zipHueSpread(
  a: ArrayPreset[],
  b: ArrayPreset[],
): ArrayPreset[] {
  const spreadA = spreadByHue(a);
  const spreadB = spreadByHue(b);
  const out: ArrayPreset[] = [];
  const max = Math.max(spreadA.length, spreadB.length);
  for (let i = 0; i < max; i++) {
    if (i < spreadA.length) out.push(spreadA[i]);
    if (i < spreadB.length) out.push(spreadB[i]);
  }
  return out;
}

const INTERMINGLED: ResolvedPreset[] = zipHueSpread(
  CANONICAL_SOURCE,
  CREATIVE_SOURCE,
).map((p) => ({
  ...p,
  href: `/editor?s=${encodeGlyphFromConfig(p.config)}`,
}));

// Split into halves — NOT parity. zipHueSpread strictly alternates
// canonical / creative, so parity-split would separate them back into
// single-type rows. Half-split keeps the alternation inside each row.
const HALF = Math.floor(INTERMINGLED.length / 2);
const TOP_ROW = INTERMINGLED.slice(0, HALF);
const BOTTOM_ROW = INTERMINGLED.slice(HALF);

// ─── Marquee timing (per-row, slightly de-synced) ──────────────────────────
const TOP_ROW_DURATION_S = 140;
const BOTTOM_ROW_DURATION_S = 170;

interface LandingSaberArrayProps {
  className?: string;
}

export function LandingSaberArray({ className }: LandingSaberArrayProps) {
  return (
    <section
      className={`relative py-16 ${className ?? ''}`}
      aria-labelledby="landing-saber-array-heading"
    >
      <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
        <h2
          id="landing-saber-array-heading"
          className="font-cinematic text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.08em] text-text-primary mb-2"
        >
          ONE HILT. INFINITE BLADES.
        </h2>
        <p className="dot-matrix" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
          HOVER TO IGNITE · CLICK TO OPEN IN EDITOR
        </p>
      </div>

      <MarqueeRow presets={TOP_ROW} direction="left" durationS={TOP_ROW_DURATION_S} />
      <div className="h-6" aria-hidden="true" />
      <MarqueeRow presets={BOTTOM_ROW} direction="right" durationS={BOTTOM_ROW_DURATION_S} />
    </section>
  );
}

// ─── Marquee row ──────────────────────────────────────────────────────────
//
// Duplicates its content once so `translateX(-50%)` scrolls one pool
// worth of cards and loops seamlessly. Hover on any card pauses the
// whole row instantly (no transition easing on the pause itself —
// that's what Ken wanted, immediate response to the cursor).

interface MarqueeRowProps {
  presets: ResolvedPreset[];
  direction: 'left' | 'right';
  durationS: number;
}

function MarqueeRow({ presets, direction, durationS }: MarqueeRowProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const doubled = [...presets, ...presets];
  const animationName =
    direction === 'left' ? 'kyber-marquee-left' : 'kyber-marquee-right';

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex gap-4 will-change-transform"
        style={{
          animation: `${animationName} ${durationS}s linear infinite`,
          animationPlayState: hoveredKey ? 'paused' : 'running',
          width: 'max-content',
        }}
      >
        {doubled.map((preset, i) => {
          const key = `${preset.label}-${i}`;
          return (
            <MarqueeCard
              key={key}
              cardKey={key}
              preset={preset}
              isHovered={hoveredKey === key}
              onHoverChange={(hovered) =>
                setHoveredKey((current) =>
                  hovered ? key : current === key ? null : current,
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────
//
// Wraps a MiniSaber + label in a Next.js <Link>. Lazy-mounts the
// saber via IntersectionObserver so ~160 card-level DOM articles
// only pay engine-warmup cost when they scroll into view. Hover
// transitions are 800ms ease-in-out so pointer-in / pointer-out
// reads as intentional rather than twitchy.

interface MarqueeCardProps {
  cardKey: string;
  preset: ResolvedPreset;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}

function MarqueeCard({ cardKey, preset, isHovered, onHoverChange }: MarqueeCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    // Pre-mount 200px before scroll-into-view so fast-drifting cards
    // are already live by the time they enter the visible region.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '200px 200px 200px 200px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const { r, g, b } = preset.config.baseColor;
  const accentCss = `rgb(${r},${g},${b})`;

  return (
    <Link
      ref={ref}
      href={preset.href}
      aria-label={`Open ${preset.label} in the editor`}
      className="relative shrink-0 flex flex-col gap-3 rounded-lg border bg-bg-card/60 backdrop-blur-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        width: '200px',
        borderColor: isHovered ? `rgba(${r},${g},${b},0.55)` : 'rgb(var(--border-subtle))',
        // Ease in/out so hover state changes feel intentional. 800ms
        // matches the human perception window for "deliberate" vs
        // "twitchy" transitions.
        transition:
          'border-color 800ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered
          ? `0 0 30px 0 rgba(${r},${g},${b},0.22)`
          : 'none',
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      data-card-key={cardKey}
    >
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
        {visible ? (
          <MiniSaber
            config={preset.config}
            hiltId={LANDING_HILT_ID}
            orientation="vertical"
            bladeLength={260}
            bladeThickness={5}
            hiltLength={72}
            controlledIgnited={true}
            animated={isHovered}
          />
        ) : (
          <CardPlaceholder accentCss={accentCss} />
        )}
      </div>

      <div className="relative text-center pb-4 px-3">
        <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary">
          {preset.label.toUpperCase()}
        </div>
        <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
          {preset.character}
        </div>
      </div>
    </Link>
  );
}

// Static placeholder for cards that haven't entered the viewport yet.
// Matches the blade + hilt silhouette roughly so the card doesn't
// visibly pop in when MiniSaber replaces it.
function CardPlaceholder({ accentCss }: { accentCss: string }) {
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
