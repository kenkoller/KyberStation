'use client';

import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing-page breadth showcase — 8 canonical saber designs rendered
 * live + simultaneously so a first-time visitor sees "this tool makes
 * lightsabers like THESE" at a glance.
 *
 * Each card pairs a screen-canon character preset with the hilt
 * design most associated with that character, so visitors can map
 * "this is Obi-Wan's actual hilt" to "I could build my own the same
 * way". Ignitions are staggered so all 8 don't light at once — each
 * card gets a short initialDelay that's a function of its index.
 */

interface ArrayPreset {
  label: string;
  character: string;
  hiltId: string;
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

// ─── Canonical character-to-hilt pairings (ratified in the walkthrough
//     on 2026-04-19 with Ken's explicit curation). Order is left-to-right
//     top-to-bottom in a 4-col grid; the sequence flows through the three
//     eras (prequels → OT → sequels) for a cinematic-history read. ───
const ARRAY_PRESETS: ArrayPreset[] = [
  {
    label: 'Obi-Wan',
    character: 'Obi-Wan Kenobi · ANH',
    hiltId: 'negotiator',
    config: baseConfig({
      baseColor: { r: 22, g: 114, b: 243 },
      style: 'stable',
    }),
  },
  {
    label: 'Luke',
    character: 'Luke Skywalker · ROTJ',
    hiltId: 'mpp',
    config: baseConfig({
      baseColor: { r: 6, g: 234, b: 25 },
      style: 'rotoscope',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Kylo Ren',
    character: 'Ben Solo · TFA',
    hiltId: 'ren-vent',
    config: baseConfig({
      baseColor: { r: 245, g: 38, b: 15 },
      style: 'unstable',
      ignition: 'crackle',
    }),
  },
  {
    label: 'Darth Maul',
    character: 'Maul · TPM',
    hiltId: 'zabrak-staff',
    config: baseConfig({
      baseColor: { r: 201, g: 8, b: 8 },
      style: 'stable',
    }),
  },
  {
    label: 'Ahsoka',
    character: 'Ahsoka Tano · Rebels',
    hiltId: 'shoto-sage',
    config: baseConfig({
      baseColor: { r: 248, g: 247, b: 247 },
      style: 'stable',
      shimmer: 0.04,
    }),
  },
  {
    label: 'Mace Windu',
    character: 'Mace Windu · AOTC',
    hiltId: 'count',
    config: baseConfig({
      baseColor: { r: 132, g: 11, b: 218 },
      style: 'stable',
    }),
  },
  {
    label: 'Rey',
    character: 'Rey Skywalker · TROS',
    hiltId: 'graflex',
    config: baseConfig({
      baseColor: { r: 245, g: 206, b: 10 },
      style: 'stable',
    }),
  },
  {
    label: 'Ezra',
    character: 'Ezra Bridger · Rebels',
    hiltId: 'fulcrum-pair',
    config: baseConfig({
      baseColor: { r: 0, g: 135, b: 255 },
      style: 'stable',
    }),
  },
];

// Stagger each card's first ignition by this much * idx. 260ms gives a
// cinematic wave without feeling sluggish (8 cards fully ignited by ~2s).
const IGNITION_STAGGER_MS = 260;

interface LandingSaberArrayProps {
  className?: string;
}

export function LandingSaberArray({ className }: LandingSaberArrayProps) {
  return (
    <section
      className={`relative py-16 px-6 ${className ?? ''}`}
      aria-labelledby="landing-saber-array-heading"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2
            id="landing-saber-array-heading"
            className="font-cinematic text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.08em] text-text-primary mb-2"
          >
            EIGHT HILTS. INFINITE BLADES.
          </h2>
          <p className="dot-matrix" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
            SCREEN-ACCURATE · ALL LIVE-RENDERED
          </p>
        </div>

        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4 sm:gap-5">
          {ARRAY_PRESETS.map((preset, i) => {
            const { r, g, b } = preset.config.baseColor;
            const accentCss = `rgb(${r},${g},${b})`;
            return (
              <article
                key={preset.label}
                className="relative group flex flex-col items-stretch rounded-lg border border-border-subtle bg-bg-card/60 backdrop-blur-sm p-4 overflow-hidden transition-colors hover:border-border-light"
                style={{
                  // Soft accent wash so each card carries its saber's color
                  // even before the blade ignites.
                  boxShadow: `inset 0 0 40px 0 rgba(${r},${g},${b},0.05)`,
                }}
              >
                {/* Subtle halo behind the saber */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 80% 30% at center, ${accentCss} 0%, transparent 65%)`,
                    opacity: 0.12,
                    filter: 'blur(20px)',
                  }}
                />

                {/* Saber composition */}
                <div className="relative flex items-center justify-center py-6 min-h-[88px]">
                  <MiniSaber
                    config={preset.config}
                    hiltId={preset.hiltId}
                    orientation="horizontal"
                    bladeLength={180}
                    bladeThickness={5}
                    hiltLength={48}
                    dwellMs={4800}
                    initialDelayMs={i * IGNITION_STAGGER_MS}
                    cycle={true}
                  />
                </div>

                {/* Identity caption — character on top, hilt id below */}
                <div className="relative mt-2 text-center">
                  <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary">
                    {preset.label.toUpperCase()}
                  </div>
                  <div className="text-ui-xs text-text-muted font-mono mt-0.5">
                    {preset.character}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
