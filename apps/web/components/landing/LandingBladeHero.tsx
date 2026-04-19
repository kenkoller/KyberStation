'use client';

import { useEffect, useState } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Landing page hero — two horizontal sabers framing the KYBERSTATION
 * title. Both are ALWAYS ignited; their colors / styles / presets
 * morph live in place, as if the owner is adjusting the blade with the
 * saber lit. Ignition + retraction live in the editor — this hero is
 * pure "watch what the blade can do" theater.
 *
 * Composition:
 *
 *   ═════════════════[HILT]   ← top saber: hilt left, blade right
 *          KYBERSTATION
 *   [HILT]═════════════════   ← bottom saber: hilt right, blade left
 *
 * The black backboard banner (25% opacity) sits behind the title and
 * between the two sabers; it sits INSIDE the hero section so sabers
 * above/below read as brackets framing the nameplate.
 *
 * Top cycles canonical hero colors (Anakin, Luke, Vader, Mace, Rey,
 * Ahsoka, Cal, Revan). Bottom cycles creative showpiece styles
 * (Fire, Aurora, Plasma, DataStream, CrystalShatter, Helix, Nebula,
 * Photon). Each pool advances every 3.5 s; the bottom is offset by
 * 1.75 s so the two morph on alternating beats.
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
  className?: string;
}

export function LandingBladeHero({ className }: LandingBladeHeroProps) {
  const [topIdx, setTopIdx] = useState(0);
  const [bottomIdx, setBottomIdx] = useState(0);

  // Top saber morphs on the beat; bottom morphs on the off-beat.
  useEffect(() => {
    const topTimer = setInterval(() => {
      setTopIdx((i) => (i + 1) % TOP_POOL.length);
    }, MORPH_INTERVAL_MS);

    const bottomStart = setTimeout(() => {
      setBottomIdx((i) => (i + 1) % BOTTOM_POOL.length);
    }, BOTTOM_OFFSET_MS);
    const bottomTimer = setInterval(() => {
      setBottomIdx((i) => (i + 1) % BOTTOM_POOL.length);
    }, MORPH_INTERVAL_MS);

    return () => {
      clearInterval(topTimer);
      clearTimeout(bottomStart);
      clearInterval(bottomTimer);
    };
  }, []);

  const topConfig = TOP_POOL[topIdx];
  const bottomConfig = BOTTOM_POOL[bottomIdx];
  const topAccent = `rgb(${topConfig.baseColor.r},${topConfig.baseColor.g},${topConfig.baseColor.b})`;
  const bottomAccent = `rgb(${bottomConfig.baseColor.r},${bottomConfig.baseColor.g},${bottomConfig.baseColor.b})`;

  return (
    // `absolute inset-0` so the top/bottom-offset sabers inside have a
    // concrete parent to anchor to. The parent LandingHero renders this
    // inside its own absolute-inset-0 wrapper so the whole hero section
    // becomes the reference frame.
    <div
      className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
      aria-label="Kyber saber preview — colors and styles morph while ignited"
    >
      {/* Bloom halos — top and bottom blade colors bleed into the
          surrounding dark, giving each saber its own presence. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[180px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 50% 50%, ${topAccent} 0%, transparent 70%)`,
          opacity: 0.22,
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[180px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 50% 50%, ${bottomAccent} 0%, transparent 70%)`,
          opacity: 0.22,
          filter: 'blur(40px)',
        }}
      />

      {/* Saber stack — uses the parent hero section's flex layout. The
          banner-and-title block is rendered by the parent between
          these two sabers, so we emit them as absolutely-positioned
          layers top/bottom of the hero section. */}
      <div className="absolute inset-x-0 top-[clamp(40px,8vh,100px)] flex justify-center">
        <MiniSaber
          config={topConfig}
          hiltId={LANDING_HILT_ID}
          orientation="horizontal"
          hiltPosition="start"
          bladeLength={720}
          bladeThickness={10}
          hiltLength={72}
          controlledIgnited={true}
        />
      </div>
      <div className="absolute inset-x-0 bottom-[clamp(40px,8vh,100px)] flex justify-center">
        <MiniSaber
          config={bottomConfig}
          hiltId={LANDING_HILT_ID}
          orientation="horizontal"
          hiltPosition="end"
          bladeLength={720}
          bladeThickness={10}
          hiltLength={72}
          controlledIgnited={true}
        />
      </div>
    </div>
  );
}
