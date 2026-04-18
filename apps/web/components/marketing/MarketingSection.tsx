interface MarketingSectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  /** Top/bottom padding tier. Default: 'lg'. */
  density?: 'md' | 'lg';
  className?: string;
}

/**
 * Standardised section wrapper. Eyebrow + title are optional — pass
 * raw children for custom layouts.
 */
export function MarketingSection({
  id,
  eyebrow,
  title,
  children,
  density = 'lg',
  className = '',
}: MarketingSectionProps) {
  const pad = density === 'lg' ? 'py-16 md:py-24' : 'py-10 md:py-14';
  return (
    <section
      id={id}
      className={`relative border-b border-border-subtle ${pad} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        {(eyebrow || title) && (
          <div className="mb-10 md:mb-14 max-w-3xl">
            {eyebrow && (
              <div
                className="dot-matrix mb-3"
                style={{ color: 'rgb(var(--accent) / 0.7)' }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="font-cinematic text-[clamp(1.25rem,3vw,2.25rem)] tracking-[0.08em] md:tracking-[0.12em] text-text-primary leading-tight">
                {title}
              </h2>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
