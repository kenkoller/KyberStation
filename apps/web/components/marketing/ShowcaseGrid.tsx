'use client';

import Link from 'next/link';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';

const SHOWCASE_HILT_ID = 'graflex';

interface ShowcaseEntry {
  label: string;
  subtitle: string;
  era: string;
  config: BladeConfig;
}

const baseConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'showcase',
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

const SHOWCASE: ShowcaseEntry[] = [
  // ── Canonical Jedi (5)
  {
    label: 'Obi-Wan Kenobi',
    subtitle: 'A New Hope · graceful azure',
    era: 'JEDI',
    config: baseConfig({
      baseColor: { r: 22, g: 114, b: 243 },
      style: 'stable',
      shimmer: 0.07,
    }),
  },
  {
    label: 'Luke Skywalker',
    subtitle: 'Return of the Jedi · synthetic green',
    era: 'JEDI',
    config: baseConfig({
      baseColor: { r: 6, g: 234, b: 25 },
      style: 'rotoscope',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Mace Windu',
    subtitle: 'Attack of the Clones · rare amethyst',
    era: 'JEDI',
    config: baseConfig({
      baseColor: { r: 170, g: 60, b: 240 },
      style: 'stable',
    }),
  },
  {
    label: 'Yoda',
    subtitle: 'Attack of the Clones · shoto',
    era: 'JEDI',
    config: baseConfig({
      baseColor: { r: 50, g: 245, b: 20 },
      style: 'stable',
      ledCount: 73,
    }),
  },
  {
    label: 'Ahsoka Tano',
    subtitle: 'Rebels · purified white',
    era: 'JEDI',
    config: baseConfig({
      baseColor: { r: 248, g: 247, b: 247 },
      style: 'stable',
      shimmer: 0.04,
    }),
  },
  // ── Sith / Dark side (5)
  {
    label: 'Darth Vader',
    subtitle: 'Empire · steady crimson',
    era: 'SITH',
    config: baseConfig({
      baseColor: { r: 228, g: 12, b: 12 },
      style: 'stable',
    }),
  },
  {
    label: 'Kylo Ren',
    subtitle: 'Force Awakens · cracked unstable',
    era: 'SITH',
    config: baseConfig({
      baseColor: { r: 245, g: 38, b: 15 },
      style: 'unstable',
      shimmer: 0.6,
    }),
  },
  {
    label: 'Darth Maul',
    subtitle: 'Phantom Menace · dual red',
    era: 'SITH',
    config: baseConfig({
      baseColor: { r: 201, g: 8, b: 8 },
      style: 'stable',
    }),
  },
  {
    label: 'Count Dooku',
    subtitle: 'AOTC · curved-hilt crimson',
    era: 'SITH',
    config: baseConfig({
      baseColor: { r: 175, g: 29, b: 29 },
      style: 'stable',
      ignitionMs: 280,
    }),
  },
  {
    label: 'Grand Inquisitor',
    subtitle: 'Rebels · cracked-kyber red',
    era: 'SITH',
    config: baseConfig({
      baseColor: { r: 228, g: 12, b: 12 },
      style: 'unstable',
    }),
  },
  // ── Engine showcases (4) — pick styles that read clearly in a thumbnail
  {
    label: 'Crystal Shatter',
    subtitle: 'Engine showcase · shard pulses',
    era: 'STYLE',
    config: baseConfig({
      baseColor: { r: 220, g: 30, b: 220 },
      style: 'crystalShatter',
      shimmer: 0.55,
    }),
  },
  {
    label: 'Aurora Halo',
    subtitle: 'Engine showcase · soft drift',
    era: 'STYLE',
    config: baseConfig({
      baseColor: { r: 80, g: 220, b: 180 },
      style: 'aurora',
      shimmer: 0.4,
    }),
  },
  {
    label: 'Helix Twist',
    subtitle: 'Engine showcase · double sine',
    era: 'STYLE',
    config: baseConfig({
      baseColor: { r: 255, g: 110, b: 30 },
      style: 'helix',
      shimmer: 0.3,
    }),
  },
  {
    label: 'Plasma Roil',
    subtitle: 'Engine showcase · turbulent core',
    era: 'STYLE',
    config: baseConfig({
      baseColor: { r: 30, g: 200, b: 255 },
      style: 'plasma',
      shimmer: 0.5,
    }),
  },
  // ── Cross-franchise (6)
  {
    label: 'Andúril',
    subtitle: 'LOTR · flame of the West',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 255, g: 200, b: 60 },
      style: 'fire',
      shimmer: 0.55,
      ignitionMs: 380,
    }),
  },
  {
    label: 'Master Sword',
    subtitle: 'Zelda · awakened blue',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 100, g: 200, b: 255 },
      style: 'stable',
      shimmer: 0.15,
    }),
  },
  {
    label: 'Mjolnir',
    subtitle: 'MCU · stormbreaker arc',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 200, g: 220, b: 255 },
      style: 'aurora',
      shimmer: 0.7,
    }),
  },
  {
    label: 'Excalibur',
    subtitle: 'Mythology · holy radiance',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 255, g: 240, b: 180 },
      style: 'photon',
      shimmer: 0.35,
    }),
  },
  {
    label: 'Buster Sword',
    subtitle: 'FF7 · materia glow',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 60, g: 240, b: 220 },
      style: 'stable',
      shimmer: 0.2,
    }),
  },
  {
    label: 'Caladbolg',
    subtitle: 'Mythology · rainbow gradient',
    era: 'CROSS',
    config: baseConfig({
      baseColor: { r: 255, g: 80, b: 200 },
      style: 'gradient',
      shimmer: 0.25,
    }),
  },
];

const ENCODED = SHOWCASE.map((entry) => ({
  ...entry,
  glyph: encodeGlyphFromConfig(entry.config),
}));

const ERA_TINT: Record<string, string> = {
  JEDI: 'rgb(120, 200, 255)',
  SITH: 'rgb(245, 100, 100)',
  STYLE: 'rgb(var(--accent))',
  CROSS: 'rgb(var(--badge-creative))',
};

/**
 * Curated saber showcase. ~20 hand-picked presets that demonstrate the
 * engine's range — canonical Jedi/Sith, engine-showcase styles, and
 * cross-franchise sabers. Click a card to open the design directly in
 * the editor via `?s=<glyph>`.
 *
 * Glyphs are encoded once at module load (matches the landing
 * `LandingSaberArray` pattern). Cards are static-till-hover — only
 * the actively hovered card pays the engine-tick cost.
 */
export function ShowcaseGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {ENCODED.map((entry) => (
        <Link
          key={entry.label}
          href={`/editor?s=${entry.glyph}`}
          className="group flex flex-col items-center gap-4 p-5 border bg-bg-deep/40 transition-colors hover:border-border-light"
          style={{
            borderColor: 'rgb(var(--border-subtle))',
            borderRadius: 'var(--r-chrome, 2px)',
          }}
          aria-label={`Open ${entry.label} in the editor`}
        >
          <div
            className="w-full overflow-hidden flex justify-center"
            style={{ minHeight: 280 }}
            aria-hidden="true"
          >
            <MiniSaber
              config={entry.config}
              hiltId={SHOWCASE_HILT_ID}
              orientation="vertical"
              hiltPosition="start"
              bladeLength={240}
              hiltLength={48}
              dwellMs={6000}
              fps={30}
              animated
            />
          </div>
          <div className="w-full text-center space-y-1">
            <div
              className="font-mono text-[10px] tracking-widest tabular-nums"
              style={{ color: ERA_TINT[entry.era] ?? 'rgb(var(--accent))' }}
            >
              {entry.era}
            </div>
            <h3 className="font-sans text-[14px] tracking-[0.06em] font-semibold text-text-primary group-hover:text-accent transition-colors">
              {entry.label}
            </h3>
            <p className="font-sans text-[12px] leading-relaxed text-text-muted">
              {entry.subtitle}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
