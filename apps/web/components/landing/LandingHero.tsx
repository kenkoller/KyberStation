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
        <div
          className="dot-matrix mb-6 opacity-70"
          aria-label="Universal Saber Style Engine"
        >
          UNIVERSAL · SABER · STYLE · ENGINE
        </div>
        <h1 className="font-cinematic text-[clamp(1.75rem,7vw,5.5rem)] font-bold tracking-[0.04em] sm:tracking-[0.12em] md:tracking-[0.16em] text-text-primary mb-6 leading-none">
          KYBERSTATION
        </h1>
        <p className="font-sw-body text-base md:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
          A visual editor for lightsaber blade styles. Design by hand, preview
          with motion and sound, generate ProffieOS code, and export straight
          to SD card. No guesswork, no trial-and-error compiles.
        </p>
      </div>
    </section>
  );
}
