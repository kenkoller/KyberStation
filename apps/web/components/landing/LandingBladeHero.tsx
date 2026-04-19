'use client';

import { useEffect, useRef, useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing page hero saber. A single full-height MiniSaber that rotates
 * through 4 canonical presets (Luke ROTJ → Anakin → Kylo → Ahsoka) so
 * the first-impression visual shows the app's range without overwhelming
 * the hero. The 8-saber breadth showcase lives in `LandingSaberArray`
 * below the CTAs.
 */

interface HeroPreset {
  label: string;
  hiltId: string;
  config: BladeConfig;
}

const baseConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'hero',
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

// Hilt stays consistent across every saber on the landing page — the
// Graflex reads as "the" lightsaber hilt for most viewers (Luke ANH)
// and lets the blade stay the hero without the hilt competing for
// attention. Ratified with Ken on 2026-04-19.
const LANDING_HILT_ID = 'graflex';

const HERO_PRESETS: HeroPreset[] = [
  {
    label: 'Luke ROTJ',
    hiltId: LANDING_HILT_ID,
    config: baseConfig({
      baseColor: { r: 60, g: 255, b: 40 },
      style: 'rotoscope',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Anakin',
    hiltId: LANDING_HILT_ID,
    config: baseConfig({
      baseColor: { r: 0, g: 135, b: 255 },
      style: 'stable',
    }),
  },
  {
    label: 'Kylo Ren',
    hiltId: LANDING_HILT_ID,
    config: baseConfig({
      baseColor: { r: 255, g: 40, b: 20 },
      style: 'unstable',
      ignition: 'crackle',
    }),
  },
  {
    label: 'Ahsoka',
    hiltId: LANDING_HILT_ID,
    config: baseConfig({
      baseColor: { r: 250, g: 245, b: 225 },
      style: 'stable',
      shimmer: 0.04,
    }),
  },
];

const DWELL_MS = 5400;
const IGNITION_BUFFER_MS = 320;
const RETRACTION_BUFFER_MS = 420;
const PRESET_CYCLE_MS = DWELL_MS + IGNITION_BUFFER_MS + RETRACTION_BUFFER_MS + 120;

interface LandingBladeHeroProps {
  className?: string;
}

export function LandingBladeHero({ className }: LandingBladeHeroProps) {
  const [presetIdx, setPresetIdx] = useState(0);
  // A bumped key forces MiniSaber to remount with the next preset's
  // hilt + config, picking up the ignite/dwell/retract cycle cleanly
  // instead of trying to mid-animate through it.
  const cycleKey = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setPresetIdx((i) => (i + 1) % HERO_PRESETS.length);
      cycleKey.current += 1;
    }, PRESET_CYCLE_MS);
    return () => clearInterval(iv);
  }, []);

  const active = HERO_PRESETS[presetIdx];
  const { r, g, b } = active.config.baseColor;
  const accentCss = `rgb(${r},${g},${b})`;

  return (
    <div
      className={`relative ${className ?? ''}`}
      aria-label={`${active.label} lightsaber — hero preview`}
      data-active-preset={active.label}
    >
      {/* Ambient halo — radial bloom behind the blade, snaps with preset */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse 40% 80% at center, ${accentCss} 0%, transparent 70%)`,
          opacity: 0.35,
          filter: 'blur(40px)',
        }}
      />
      <div className="relative flex items-center justify-center">
        <MiniSaber
          key={cycleKey.current}
          config={active.config}
          hiltId={active.hiltId}
          orientation="vertical"
          /* Fixed px so SSR output matches the first client render — a
             viewport-relative calc would cause a hydration mismatch.
             If we want responsiveness, do it via CSS clamp() on the
             MiniSaber style, not JS. */
          bladeLength={540}
          bladeThickness={10}
          hiltLength={140}
          dwellMs={DWELL_MS}
          cycle={true}
        />
      </div>
    </div>
  );
}
