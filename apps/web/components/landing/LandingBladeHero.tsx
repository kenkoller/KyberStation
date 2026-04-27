'use client';

import { useEffect, useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing page hero saber — a single horizontal saber rendered per call.
 * Parent (LandingHero) renders two instances as siblings around the
 * title block so the title sits BETWEEN the two sabers in a flex column:
 *
 *   [top]     ═════════════════[HILT]
 *             KYBERSTATION
 *   [bottom]  [HILT]═════════════════
 *
 * Both sabers are ALWAYS ignited; their colors / styles / presets
 * morph live in place while the blade stays lit — ignition + retraction
 * live in the editor. This hero is pure "watch what the blade can do"
 * theater.
 *
 * `which='top'` cycles canonical hero colors (Anakin → Luke → Vader →
 * Mace → Rey → Ahsoka → Cal → Revan). `which='bottom'` cycles creative
 * showpiece styles (Fire → Aurora → Plasma → DataStream →
 * CrystalShatter → Helix → Nebula → Photon). Each pool advances every
 * 3.5s; the bottom is offset by 1.75s so the two morph on alternating
 * beats.
 */

const LANDING_HILT_ID = 'graflex';

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

// ─── Top saber: canonical hero colors ──────────────────────────────────────
const TOP_POOL: BladeConfig[] = [
  baseConfig({ baseColor: { r: 15, g: 105, b: 245 }, style: 'stable' }),   // Anakin
  baseConfig({ baseColor: { r: 6, g: 234, b: 25 }, style: 'rotoscope' }),   // Luke ROTJ
  baseConfig({ baseColor: { r: 228, g: 12, b: 12 }, style: 'stable' }),    // Vader
  baseConfig({ baseColor: { r: 132, g: 11, b: 218 }, style: 'stable' }),   // Mace
  baseConfig({ baseColor: { r: 245, g: 206, b: 10 }, style: 'stable' }),   // Rey
  baseConfig({ baseColor: { r: 248, g: 247, b: 247 }, style: 'stable' }),  // Ahsoka
  baseConfig({ baseColor: { r: 20, g: 200, b: 245 }, style: 'stable' }),   // Cal cyan
  baseConfig({ baseColor: { r: 68, g: 16, b: 198 }, style: 'stable' }),    // Revan indigo
];

// ─── Bottom saber: creative showpiece styles ───────────────────────────────
const BOTTOM_POOL: BladeConfig[] = [
  baseConfig({ baseColor: { r: 255, g: 106, b: 12 }, style: 'fire', shimmer: 0.1 }),
  baseConfig({ baseColor: { r: 40, g: 240, b: 170 }, style: 'aurora', shimmer: 0.08 }),
  baseConfig({ baseColor: { r: 196, g: 40, b: 245 }, style: 'plasma', shimmer: 0.08 }),
  baseConfig({ baseColor: { r: 60, g: 255, b: 120 }, style: 'dataStream', shimmer: 0.05 }),
  baseConfig({ baseColor: { r: 130, g: 200, b: 255 }, style: 'crystalShatter', shimmer: 0.09 }),
  baseConfig({ baseColor: { r: 255, g: 200, b: 40 }, style: 'helix', shimmer: 0.06 }),
  baseConfig({ baseColor: { r: 180, g: 70, b: 255 }, style: 'nebula', shimmer: 0.08 }),
  baseConfig({ baseColor: { r: 255, g: 250, b: 200 }, style: 'photon', shimmer: 0.07 }),
];

const MORPH_INTERVAL_MS = 3500;
const BOTTOM_OFFSET_MS = 1750;

interface LandingBladeHeroProps {
  which: 'top' | 'bottom';
  className?: string;
}

export function LandingBladeHero({ which, className }: LandingBladeHeroProps) {
  const pool = which === 'top' ? TOP_POOL : BOTTOM_POOL;
  const hiltPosition: 'start' | 'end' = which === 'top' ? 'start' : 'end';
  const initialDelayMs = which === 'top' ? 0 : BOTTOM_OFFSET_MS;

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Offset the bottom saber's first morph by BOTTOM_OFFSET_MS so top
    // and bottom swap on alternating beats.
    const startTimer = setTimeout(() => {
      setIdx((i) => (i + 1) % pool.length);
    }, MORPH_INTERVAL_MS + initialDelayMs);
    const intervalTimer = setInterval(() => {
      setIdx((i) => (i + 1) % pool.length);
    }, MORPH_INTERVAL_MS);
    return () => {
      clearTimeout(startTimer);
      clearInterval(intervalTimer);
    };
  }, [pool, initialDelayMs]);

  const config = pool[idx];

  return (
    <div
      className={`relative pointer-events-none ${className ?? ''}`}
      role="img"
      aria-label={`${which === 'top' ? 'Upper' : 'Lower'} kyber saber preview — ${
        which === 'top'
          ? 'canonical hero colors'
          : 'creative blade styles'
      } morphing while ignited`}
    >
      {/* 4:1 blade:hilt ratio matches real-world Graflex (~27 cm hilt,
          ~100 cm blade). 10:1 looked thin — hilt got lost as the blade
          visually stretched the composition. */}
      <MiniSaber
        config={config}
        hiltId={LANDING_HILT_ID}
        orientation="horizontal"
        hiltPosition={hiltPosition}
        bladeLength={720}
        bladeThickness={10}
        hiltLength={180}
        controlledIgnited={true}
      />
    </div>
  );
}
