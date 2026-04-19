import { LandingBladeHero } from './LandingBladeHero';

export function LandingHero() {
  // The hero is now a flex column with the saber, title, saber laid out
  // as siblings — no absolute positioning needed. The `gap-6` controls
  // how close the blades sit to the KYBERSTATION nameplate; keep it
  // small so the sabers read as brackets around the title rather than
  // banners separated by dead space. The banner backboard is gone — the
  // blades no longer pass through the title so the title is readable
  // on its own.
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center gap-6 overflow-hidden py-12">
      <div
        className="absolute inset-0 particle-drift pointer-events-none"
        aria-hidden="true"
      />

      <LandingBladeHero which="top" />

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

      <LandingBladeHero which="bottom" />
    </section>
  );
}
