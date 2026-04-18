interface MarketingHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Section hero used on inner marketing pages. Not used on `/` — the
 * homepage has its own blade-rendering hero in `components/landing/`.
 */
export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  children,
}: MarketingHeroProps) {
  return (
    <section className="relative border-b border-border-subtle">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24 text-center">
        <div
          className="dot-matrix mb-5 opacity-80"
          style={{ color: 'rgb(var(--accent) / 0.75)' }}
        >
          {eyebrow}
        </div>
        <h1 className="font-cinematic text-[clamp(1.75rem,5vw,3.5rem)] font-bold tracking-[0.08em] md:tracking-[0.14em] text-text-primary mb-5 leading-[1.05]">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sw-body text-base md:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
