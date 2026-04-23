'use client';

import type { BladeConfig } from '@kyberstation/engine';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';
import {
  MarqueeCard,
  MarqueeRow,
  zipHueSpread,
} from '@/components/shared/SaberMarqueeArray';

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

// Cap the total unique-preset pool across both scroll rows. The source
// arrays contribute 40 canonical + 40 creative = 80 potential items; we
// slice the zipped output down to keep the landing array lean. Lower =
// smaller landing bundle + faster module-load (every preset calls
// encodeGlyphFromConfig at import time) and less scroll-loop repetition.
// Higher = more variety per loop. 50 is Ken's 2026-04-20 target.
const LANDING_PRESET_CAP = 50;

const INTERMINGLED: ResolvedPreset[] = zipHueSpread<ArrayPreset>(
  CANONICAL_SOURCE,
  CREATIVE_SOURCE,
)
  .slice(0, LANDING_PRESET_CAP)
  .map((p) => ({
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
// Doubled from 140s/170s per Ken's 2026-04-20 feedback — slower drift
// reads as "premium showcase" rather than a ticker, and gives each
// blade long enough in view to appreciate its style.
const TOP_ROW_DURATION_S = 280;
const BOTTOM_ROW_DURATION_S = 340;

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

      <LandingMarqueeRow
        presets={TOP_ROW}
        direction="left"
        durationS={TOP_ROW_DURATION_S}
      />
      <div className="h-6" aria-hidden="true" />
      <LandingMarqueeRow
        presets={BOTTOM_ROW}
        direction="right"
        durationS={BOTTOM_ROW_DURATION_S}
      />
    </section>
  );
}

// ─── Marquee row (landing-specific wrapper around shared primitive) ──────
//
// The shared `<MarqueeRow>` takes already-rendered children so each site
// can decide how to render its cards. Landing: each card becomes a
// Next.js Link pointing at `/editor?s=<glyph>`. Gallery: each card
// becomes a button that loads the preset in-place.

// Target frame rate for every on-screen blade in the array. ~30 fps is
// the sweet spot for 20+ concurrent cards: styles like fire / plasma
// still read as lively, and the frame budget stays well under what a
// single editor-grade BladeCanvas consumes. Lower = smoother landing
// scroll at the cost of style liveness; higher = more per-card CPU.
const LANDING_CARD_FPS = 30;

interface LandingMarqueeRowProps {
  presets: ResolvedPreset[];
  direction: 'left' | 'right';
  durationS: number;
}

function LandingMarqueeRow({
  presets,
  direction,
  durationS,
}: LandingMarqueeRowProps) {
  // Duplicate so translateX(-50%) loops seamlessly. Keyed by index in the
  // doubled array so React doesn't reuse engine instances across the seam.
  const doubled = [...presets, ...presets];
  return (
    <MarqueeRow direction={direction} durationS={durationS}>
      {doubled.map((preset, i) => {
        const key = `${preset.label}-${i}`;
        return (
          <MarqueeCard
            key={key}
            cardKey={key}
            preset={{
              label: preset.label,
              subtitle: preset.character,
              config: preset.config,
            }}
            variant={{ kind: 'link', href: preset.href }}
            ariaLabelPrefix="Open"
            hiltId={LANDING_HILT_ID}
            fps={LANDING_CARD_FPS}
          />
        );
      })}
    </MarqueeRow>
  );
}
