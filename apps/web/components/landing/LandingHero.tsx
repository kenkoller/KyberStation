import Link from 'next/link';
import { LandingBladeHero } from './LandingBladeHero';

export function LandingHero() {
  // Flex column: top saber → nameplate group (title + subtitle + CTAs)
  // → bottom saber. The CTAs live INSIDE the hero now so they read as
  // part of the nameplate instead of a separate section below. The two
  // saber wrappers carry explicit translateY offsets so Ken can pull
  // them further from the title without widening the flex gap (which
  // would also widen the gap between subtitle and CTAs).
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center gap-6 overflow-hidden py-12">
      <div
        className="absolute inset-0 particle-drift pointer-events-none"
        aria-hidden="true"
      />

      <div style={{ transform: 'translateY(-15px)' }}>
        <LandingBladeHero which="top" />
      </div>

      <div className="relative z-10 w-full text-center px-6">
        <h1 className="font-cinematic text-[clamp(1.75rem,7vw,5.5rem)] font-bold tracking-[0.04em] sm:tracking-[0.12em] md:tracking-[0.16em] text-text-primary mb-4 leading-none">
          KYBERSTATION
        </h1>
        <div
          className="dot-matrix mb-6"
          aria-label="Universal Saber Style Engine"
          style={{ fontSize: 'clamp(12px, 1.4vw, 16px)' }}
        >
          UNIVERSAL · SABER · STYLE · ENGINE
        </div>

        {/* CTAs — nested with the title so the nameplate reads as one
            block. Original standalone LandingCTAs section is gone. */}
        <div className="max-w-2xl lg:max-w-none mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-4 lg:gap-5">
          <Link
            href="/editor"
            aria-label="Open KyberStation editor"
            className="btn-hum group inline-flex items-center justify-center w-full lg:w-auto lg:min-w-[220px] px-8 py-3.5 rounded-[2px] font-cinematic text-sm tracking-[0.22em] uppercase transition-colors"
            style={{
              background: 'rgb(var(--accent) / 0.10)',
              border: '1px solid rgb(var(--accent) / 0.45)',
              color: 'rgb(var(--accent))',
            }}
          >
            Open Editor
          </Link>
          <Link
            href="/editor?wizard=1"
            aria-label="Begin The Gathering — guided saber design ritual"
            className="btn-hum inline-flex items-center justify-center w-full lg:w-auto lg:min-w-[220px] px-8 py-3.5 rounded-[2px] border border-border-light text-text-secondary hover:text-text-primary font-cinematic text-sm tracking-[0.22em] uppercase transition-colors hover:bg-bg-surface"
          >
            The Gathering
          </Link>
          <Link
            href="/gallery"
            aria-label="Browse the preset gallery"
            className="inline-flex items-center justify-center w-full lg:w-auto lg:min-w-[220px] px-8 py-3.5 rounded-[2px] border border-border-subtle text-text-secondary hover:text-text-primary font-cinematic text-sm tracking-[0.22em] uppercase transition-colors hover:bg-bg-surface"
          >
            Browse Gallery
          </Link>
        </div>
      </div>

      <div style={{ transform: 'translateY(25px)' }}>
        <LandingBladeHero which="bottom" />
      </div>
    </section>
  );
}
