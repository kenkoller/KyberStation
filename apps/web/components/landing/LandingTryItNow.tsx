'use client';

import Link from 'next/link';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';

/**
 * Mid-page conversion strip. After visitors have seen the gallery and
 * the feature ledger, this is the "stop scrolling, click here" beat.
 * One always-ignited horizontal saber + one big primary CTA.
 *
 * Uses a single Anakin-blue stable saber to feel canonical and
 * unambiguous — not pitching creativity here, just "open the editor."
 */

const TRY_IT_CONFIG: BladeConfig = {
  name: 'tryItNow',
  baseColor: { r: 15, g: 105, b: 245 },
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
} as BladeConfig;

export function LandingTryItNow() {
  return (
    <section
      className="relative border-t border-border-subtle py-20 md:py-28 overflow-hidden"
      aria-labelledby="try-it-heading"
    >
      <div
        className="absolute inset-0 particle-drift pointer-events-none opacity-50"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 flex flex-col items-center gap-8 md:gap-10 text-center">
        <div
          className="w-full overflow-hidden"
          aria-hidden="true"
          style={{ maxWidth: '720px' }}
        >
          <MiniSaber
            config={TRY_IT_CONFIG}
            hiltId="graflex"
            orientation="horizontal"
            hiltPosition="start"
            bladeLength={520}
            hiltLength={130}
            controlledIgnited
            fps={30}
          />
        </div>

        <div className="max-w-2xl">
          <h2
            id="try-it-heading"
            className="font-sans text-2xl md:text-4xl tracking-[0.08em] font-semibold uppercase text-text-primary mb-4"
          >
            Try it now
          </h2>
          <p className="font-sans text-[15px] md:text-base text-text-secondary leading-relaxed mb-8 md:mb-10">
            No install. No accounts. No backend. Your browser is the
            workbench — open the editor, pick a preset, start tweaking.
          </p>

          <Link
            href="/editor"
            aria-label="Open KyberStation editor"
            className="btn-hum group inline-flex items-center justify-center px-10 py-4 rounded-[2px] font-cinematic text-sm tracking-[0.22em] uppercase transition-colors"
            style={{
              background: 'rgb(var(--accent) / 0.10)',
              border: '1px solid rgb(var(--accent) / 0.45)',
              color: 'rgb(var(--accent))',
            }}
          >
            Open KyberStation Editor →
          </Link>
        </div>
      </div>
    </section>
  );
}
