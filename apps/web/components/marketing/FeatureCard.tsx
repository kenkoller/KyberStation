interface FeatureCardProps {
  index?: string;
  title: string;
  description: string;
  bullets?: ReadonlyArray<string>;
  /** Optional footer line (e.g. version tag, preset count). */
  footer?: string;
  variant?: 'default' | 'accent';
}

/**
 * Standard marketing feature card. Matte card surface + index eyebrow
 * + title + body + optional bullet list. Pair with a grid container
 * for feature matrices.
 */
export function FeatureCard({
  index,
  title,
  description,
  bullets,
  footer,
  variant = 'default',
}: FeatureCardProps) {
  const accent = variant === 'accent';
  return (
    <div
      className="relative p-6 md:p-7 rounded-[2px] card-hover"
      style={{
        background: accent
          ? 'linear-gradient(180deg, rgb(var(--accent) / 0.08) 0%, rgb(var(--bg-card)) 60%)'
          : 'rgb(var(--bg-card))',
        border: accent
          ? '1px solid rgb(var(--accent) / 0.25)'
          : '1px solid var(--border-subtle)',
      }}
    >
      {index && (
        <div
          className="dot-matrix mb-3 tabular-nums"
          style={{ color: 'rgb(var(--accent) / 0.75)' }}
        >
          {index}
        </div>
      )}
      <h3 className="font-cinematic text-base md:text-lg tracking-[0.14em] uppercase text-text-primary mb-3 leading-snug">
        {title}
      </h3>
      <p className="text-sm md:text-[15px] text-text-secondary leading-relaxed">
        {description}
      </p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-[13px] text-text-secondary">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-[7px] inline-block w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: 'rgb(var(--accent) / 0.7)' }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && (
        <div className="mt-5 pt-4 border-t border-border-subtle">
          <div className="dot-matrix text-text-muted">{footer}</div>
        </div>
      )}
    </div>
  );
}
