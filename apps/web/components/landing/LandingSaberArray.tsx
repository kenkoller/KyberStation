'use client';

import { useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing-page breadth showcase — edge-to-edge dual-marquee row of
 * ~40 saber cards continuously drifting across the viewport. The top
 * row glides left, the bottom row glides right; together they read
 * as a never-ending catalog of what the engine can render.
 *
 * All cards are STATIC by default (engine warms up to ignited state,
 * draws one frame, then stops ticking — zero per-frame CPU cost).
 * Hovering a card:
 *   - Pauses the marquee animation on that card's row
 *   - Kicks the card's MiniSaber into animated=true so the blade's
 *     style (fire, aurora, plasma, etc.) comes to life at full 60fps
 *   - Slightly scales the card for an emphasis zoom
 *
 * The animation budget is therefore: one live engine at a time
 * (the hovered card), everything else frozen. Perf stays flat
 * regardless of how many cards are in the pool.
 *
 * No retract / ignite transitions anywhere — sabers stay lit; the
 * editor is where ignition customisation lives.
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

// ─── Top row: canonical characters + classic colors (~20 presets) ──────────
const TOP_ROW: ArrayPreset[] = [
  { label: 'Obi-Wan', character: 'Obi-Wan Kenobi · ANH', config: baseConfig({ baseColor: { r: 22, g: 114, b: 243 }, style: 'stable' }) },
  { label: 'Luke', character: 'Luke Skywalker · ROTJ', config: baseConfig({ baseColor: { r: 6, g: 234, b: 25 }, style: 'rotoscope' }) },
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
];

// ─── Bottom row: creative showpiece styles (~20 presets) ───────────────────
const BOTTOM_ROW: ArrayPreset[] = [
  { label: 'Inferno', character: 'Style · Fire', config: baseConfig({ baseColor: { r: 255, g: 106, b: 12 }, style: 'fire', shimmer: 0.1 }) },
  { label: 'Aurora', character: 'Style · Aurora', config: baseConfig({ baseColor: { r: 40, g: 240, b: 170 }, style: 'aurora', shimmer: 0.08 }) },
  { label: 'Plasma Storm', character: 'Style · Plasma', config: baseConfig({ baseColor: { r: 196, g: 40, b: 245 }, style: 'plasma', shimmer: 0.08 }) },
  { label: 'Data Stream', character: 'Style · DataStream', config: baseConfig({ baseColor: { r: 60, g: 255, b: 120 }, style: 'dataStream' }) },
  { label: 'Crystal Shatter', character: 'Style · CrystalShatter', config: baseConfig({ baseColor: { r: 130, g: 200, b: 255 }, style: 'crystalShatter', shimmer: 0.09 }) },
  { label: 'Helix', character: 'Style · Helix', config: baseConfig({ baseColor: { r: 255, g: 200, b: 40 }, style: 'helix' }) },
  { label: 'Nebula', character: 'Style · Nebula', config: baseConfig({ baseColor: { r: 180, g: 70, b: 255 }, style: 'nebula', shimmer: 0.08 }) },
  { label: 'Photon Burst', character: 'Style · Photon', config: baseConfig({ baseColor: { r: 255, g: 250, b: 200 }, style: 'photon' }) },
  { label: 'Cinder', character: 'Style · Cinder', config: baseConfig({ baseColor: { r: 255, g: 80, b: 40 }, style: 'cinder', shimmer: 0.1 }) },
  { label: 'Prism', character: 'Style · Prism', config: baseConfig({ baseColor: { r: 255, g: 255, b: 255 }, style: 'prism', shimmer: 0.08 }) },
  { label: 'Gravity', character: 'Style · Gravity', config: baseConfig({ baseColor: { r: 80, g: 160, b: 255 }, style: 'gravity' }) },
  { label: 'Ember', character: 'Style · Ember', config: baseConfig({ baseColor: { r: 255, g: 140, b: 40 }, style: 'ember', shimmer: 0.1 }) },
  { label: 'Automata', character: 'Style · Automata', config: baseConfig({ baseColor: { r: 80, g: 255, b: 180 }, style: 'automata' }) },
  { label: 'Candle', character: 'Style · Candle', config: baseConfig({ baseColor: { r: 255, g: 160, b: 60 }, style: 'candle', shimmer: 0.12 }) },
  { label: 'Shatter', character: 'Style · Shatter', config: baseConfig({ baseColor: { r: 200, g: 220, b: 255 }, style: 'shatter' }) },
  { label: 'Neutron', character: 'Style · Neutron', config: baseConfig({ baseColor: { r: 140, g: 220, b: 255 }, style: 'neutron' }) },
  { label: 'Torrent', character: 'Style · Torrent', config: baseConfig({ baseColor: { r: 20, g: 180, b: 255 }, style: 'torrent' }) },
  { label: 'Vortex', character: 'Style · Vortex', config: baseConfig({ baseColor: { r: 180, g: 100, b: 255 }, style: 'vortex' }) },
  { label: 'Tidal', character: 'Style · Tidal', config: baseConfig({ baseColor: { r: 60, g: 200, b: 255 }, style: 'tidal' }) },
  { label: 'Mirage', character: 'Style · Mirage', config: baseConfig({ baseColor: { r: 255, g: 200, b: 180 }, style: 'mirage', shimmer: 0.08 }) },
];

// ─── Marquee duration — slow drift, ~50s per full loop ─────────────────────
//
// Duration is applied via inline CSS vars so we can keep the keyframes
// in globals.css and let Tailwind handle the containers. Slower drift
// feels premium; faster feels like a slot machine.
const TOP_ROW_DURATION_S = 50;
const BOTTOM_ROW_DURATION_S = 60; // slightly different so rows de-sync

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
          SCREEN-ACCURATE · CREATIVE · ALL ON DEMAND — HOVER TO IGNITE
        </p>
      </div>

      <MarqueeRow
        presets={TOP_ROW}
        direction="left"
        durationS={TOP_ROW_DURATION_S}
      />
      <div className="h-6" aria-hidden="true" />
      <MarqueeRow
        presets={BOTTOM_ROW}
        direction="right"
        durationS={BOTTOM_ROW_DURATION_S}
      />
    </section>
  );
}

// ─── Marquee row ──────────────────────────────────────────────────────────
//
// A single horizontal marquee. Content is duplicated twice inside the
// track so the CSS translate-to-negative-50% keyframe creates a
// seamless infinite loop. Hovering any card pauses the whole row and
// animates that card's saber.

interface MarqueeRowProps {
  presets: ArrayPreset[];
  direction: 'left' | 'right';
  durationS: number;
}

function MarqueeRow({ presets, direction, durationS }: MarqueeRowProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Duplicate the list so `-translate-x-1/2` scrolls exactly one pool
  // worth and loops seamlessly.
  const doubled = [...presets, ...presets];

  const animationName =
    direction === 'left' ? 'kyber-marquee-left' : 'kyber-marquee-right';

  return (
    <div
      className="relative w-full overflow-hidden"
      // Inline CSS vars for the animation — keeps keyframes in globals
      // and lets us tune per-row duration cleanly.
      style={
        {
          // Pause-on-hover lives on the track; we also manually pause
          // via `hoveredKey` state so hover cues immediate response.
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div
        className="flex gap-4 will-change-transform"
        style={{
          animation: `${animationName} ${durationS}s linear infinite`,
          animationPlayState: hoveredKey ? 'paused' : 'running',
          width: 'max-content',
        }}
      >
        {doubled.map((preset, i) => {
          // Make key unique across the two copies so React keeps them
          // as distinct instances (else both copies share mount state).
          const key = `${preset.label}-${i}`;
          const { r, g, b } = preset.config.baseColor;
          const accentCss = `rgb(${r},${g},${b})`;
          const isHovered = hoveredKey === key;
          return (
            <article
              key={key}
              className="relative shrink-0 rounded-lg border border-border-subtle bg-bg-card/60 backdrop-blur-sm overflow-hidden transition-transform duration-200"
              style={{
                width: '200px',
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                borderColor: isHovered
                  ? `rgba(${r},${g},${b},0.5)`
                  : undefined,
              }}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background: `radial-gradient(ellipse 35% 70% at center, ${accentCss} 0%, transparent 65%)`,
                  opacity: isHovered ? 0.22 : 0.1,
                  filter: 'blur(24px)',
                }}
              />
              <div className="relative flex items-end justify-center w-full pt-5" style={{ minHeight: '320px' }}>
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
              </div>
              <div className="relative text-center pb-3 px-3">
                <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary">
                  {preset.label.toUpperCase()}
                </div>
                <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
                  {preset.character}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
