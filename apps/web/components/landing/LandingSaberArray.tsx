'use client';

import { useEffect, useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing-page breadth showcase — two sets of 8 sabers alternating, to
 * answer "what can this tool actually build?" in two beats:
 *
 *   Set 1 — Canonical (screen-accurate Jedi/Sith icons)
 *   Set 2 — Creative (showpiece blade styles no other editor has)
 *
 * All 8 cards ignite simultaneously, dwell, retract simultaneously,
 * swap to the next set, repeat. The parent orchestrates ignition via
 * MiniSaber's `controlledIgnited` prop so all 8 stay phase-locked
 * regardless of per-engine timing variance.
 *
 * Vertical orientation per Ken's 2026-04-19 direction: hilt at bottom,
 * blade rising up. Hilts use the neutral chrome accent so the blade
 * stays the hero.
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

// ─── Set 1: Canonical screen-accurate sabers ───────────────────────────────
const CANONICAL_SET: ArrayPreset[] = [
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

// ─── Set 2: Creative showpiece blades ──────────────────────────────────────
// Each one pairs a distinctive engine style with a fresh color + hilt
// combination the user could build in the editor. This is the "and
// then some" — things no other Proffie editor renders.
const CREATIVE_SET: ArrayPreset[] = [
  {
    label: 'Inferno',
    character: 'Style · Fire',
    hiltId: 'ren-vent',
    config: baseConfig({
      baseColor: { r: 255, g: 106, b: 12 },
      style: 'fire',
      shimmer: 0.1,
    }),
  },
  {
    label: 'Aurora',
    character: 'Style · Aurora',
    hiltId: 'negotiator',
    config: baseConfig({
      baseColor: { r: 40, g: 240, b: 170 },
      style: 'aurora',
      shimmer: 0.08,
    }),
  },
  {
    label: 'Plasma Storm',
    character: 'Style · Plasma',
    hiltId: 'count',
    config: baseConfig({
      baseColor: { r: 196, g: 40, b: 245 },
      style: 'plasma',
      shimmer: 0.08,
    }),
  },
  {
    label: 'Data Stream',
    character: 'Style · DataStream',
    hiltId: 'graflex',
    config: baseConfig({
      baseColor: { r: 60, g: 255, b: 120 },
      style: 'dataStream',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Crystal Shatter',
    character: 'Style · CrystalShatter',
    hiltId: 'shoto-sage',
    config: baseConfig({
      baseColor: { r: 130, g: 200, b: 255 },
      style: 'crystalShatter',
      shimmer: 0.09,
    }),
  },
  {
    label: 'Helix',
    character: 'Style · Helix',
    hiltId: 'mpp',
    config: baseConfig({
      baseColor: { r: 255, g: 200, b: 40 },
      style: 'helix',
      shimmer: 0.06,
    }),
  },
  {
    label: 'Nebula',
    character: 'Style · Nebula',
    hiltId: 'zabrak-staff',
    config: baseConfig({
      baseColor: { r: 180, g: 70, b: 255 },
      style: 'nebula',
      shimmer: 0.08,
    }),
  },
  {
    label: 'Photon Burst',
    character: 'Style · Photon',
    hiltId: 'fulcrum-pair',
    config: baseConfig({
      baseColor: { r: 255, g: 250, b: 200 },
      style: 'photon',
      shimmer: 0.07,
    }),
  },
];

const SETS: ArrayPreset[][] = [CANONICAL_SET, CREATIVE_SET];

// Cycle timing. "Slow-moving slideshow" per Ken's direction — give the
// visitor time to read each card before the retract.
const DWELL_MS = 8000;
const RETRACT_MS = 900;
const POST_RETRACT_PAUSE_MS = 300;

interface LandingSaberArrayProps {
  className?: string;
}

export function LandingSaberArray({ className }: LandingSaberArrayProps) {
  const [setIdx, setSetIdx] = useState(0);
  const [ignited, setIgnited] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const runCycle = () => {
      if (cancelled) return;
      // Phase 1: ignited dwell
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setIgnited(false);
        // Phase 2: wait for retraction animation to finish
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          // Phase 3: swap set + ignite again
          setSetIdx((i) => (i + 1) % SETS.length);
          setIgnited(true);
          runCycle();
        }, RETRACT_MS + POST_RETRACT_PAUSE_MS);
      }, DWELL_MS);
    };

    runCycle();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const activeSet = SETS[setIdx];
  const setLabel = setIdx === 0 ? 'SCREEN-ACCURATE' : 'PURE CREATIVE';

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
          <p
            className="dot-matrix transition-opacity duration-500"
            style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}
          >
            {setLabel} · ALL LIVE-RENDERED
          </p>
        </div>

        {/* 4-col desktop / 2-col tablet / 2-col phone. The 2-col phone
            keeps the row of blades readable on narrow screens while
            still showing >1 at a time so the "array" concept survives. */}
        <div className="grid grid-cols-2 tablet:grid-cols-2 desktop:grid-cols-4 gap-4 sm:gap-5">
          {activeSet.map((preset) => {
            const { r, g, b } = preset.config.baseColor;
            const accentCss = `rgb(${r},${g},${b})`;
            return (
              <article
                key={`${setIdx}-${preset.label}`}
                className="relative flex flex-col items-center rounded-lg border border-border-subtle bg-bg-card/60 backdrop-blur-sm p-4 pb-3 overflow-hidden transition-colors hover:border-border-light"
              >
                {/* Ambient halo anchored to the saber's axis */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 30% 70% at center, ${accentCss} 0%, transparent 65%)`,
                    opacity: 0.14,
                    filter: 'blur(28px)',
                  }}
                />

                {/* Vertical saber — hilt at bottom, blade rising up */}
                <div className="relative flex items-end justify-center w-full" style={{ minHeight: '360px' }}>
                  <MiniSaber
                    config={preset.config}
                    hiltId={preset.hiltId}
                    orientation="vertical"
                    bladeLength={300}
                    bladeThickness={6}
                    hiltLength={72}
                    controlledIgnited={ignited}
                  />
                </div>

                {/* Identity caption */}
                <div className="relative mt-3 text-center">
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
