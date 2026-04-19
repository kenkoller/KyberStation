import { LandingBladeHero } from './LandingBladeHero';

export function LandingHero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 particle-drift pointer-events-none"
        aria-hidden="true"
      />

      {/* Blade — full viewport, behind everything */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <LandingBladeHero />
      </div>

      {/* Title backboard — full-width 25%-opacity black strip sitting
          BETWEEN the blade and the title text. Gives the title a
          readable surface without hiding the blade, per Ken's
          2026-04-19 walkthrough direction. */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-[5] pointer-events-none"
        style={{
          height: 'clamp(160px, 24vh, 240px)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        }}
      />

      <div className="relative z-10 w-full text-center px-6">
        <h1 className="font-cinematic text-[clamp(1.75rem,7vw,5.5rem)] font-bold tracking-[0.04em] sm:tracking-[0.12em] md:tracking-[0.16em] text-text-primary mb-4 leading-none">
          KYBERSTATION
        </h1>
        <div
          className="dot-matrix"
          aria-label="Universal Saber Style Engine"
          style={{ fontSize: 'clamp(12px, 1.4vw, 16px)' }}
        >
          UNIVERSAL · SABER · STYLE · ENGINE
        </div>
      </div>
    </section>
  );
}
