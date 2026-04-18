import { LandingBladeHero } from './LandingBladeHero';

export function LandingHero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 particle-drift pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <LandingBladeHero />
      </div>

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
