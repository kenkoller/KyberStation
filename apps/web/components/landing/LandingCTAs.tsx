import Link from 'next/link';

export function LandingCTAs() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-2xl lg:max-w-none mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-4 lg:gap-5 px-6">
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
    </section>
  );
}
