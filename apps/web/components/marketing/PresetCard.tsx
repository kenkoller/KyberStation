import Link from 'next/link';
import type { Preset } from '@kyberstation/presets';
import { EraBadge, FactionBadge } from '@/components/shared/StatusSignal';

interface PresetCardProps {
  preset: Preset;
}

function rgbString(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

/**
 * Lightweight preset card for the showcase grid.
 *
 * Avoids running the full BladeEngine per card (that would be hundreds
 * of simultaneous animation loops); instead renders a static blade-
 * style gradient bar sampled from the preset's baseColor + clashColor.
 * Good enough for a gallery thumbnail at a glance, and scales to 200+
 * cards.
 */
export function PresetCard({ preset }: PresetCardProps) {
  const base = rgbString(preset.config.baseColor);
  const clash = rgbString(preset.config.clashColor);
  const deepLink = `/editor?preset=${encodeURIComponent(preset.id)}`;

  return (
    <Link
      href={deepLink}
      className="gallery-card blade-glow group relative block rounded-[2px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={
        {
          background: 'rgb(var(--bg-card))',
          border: '1px solid var(--border-subtle)',
          '--glow-color': base,
        } as React.CSSProperties
      }
    >
      <div className="relative h-24 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 blade-shimmer"
          style={{
            background: `linear-gradient(180deg, ${base} 0%, ${clash} 55%, ${base} 100%)`,
            opacity: 0.25,
          }}
        />
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${base} 0%, ${clash} 50%, ${base} 100%)`,
            boxShadow: `0 0 12px ${base}, 0 0 28px ${base}`,
          }}
        />
      </div>

      <div className="relative p-4 md:p-5">
        <div className="flex items-center gap-2 mb-2 text-[11px]">
          <EraBadge era={preset.era} label={`Era: ${preset.era}`} />
          <span className="text-text-muted" aria-hidden="true">
            ·
          </span>
          <FactionBadge
            faction={preset.affiliation}
            label={`Faction: ${preset.affiliation}`}
          />
          {preset.screenAccurate && (
            <>
              <span className="text-text-muted" aria-hidden="true">
                ·
              </span>
              <span
                className="dot-matrix tabular-nums"
                style={{ color: 'rgb(var(--badge-screen-accurate))' }}
                aria-label="Screen-accurate"
              >
                SCREEN
              </span>
            </>
          )}
        </div>

        <h3 className="font-cinematic text-[13px] tracking-[0.1em] text-text-primary mb-1 leading-snug">
          {preset.name}
        </h3>
        <p className="text-[11px] text-text-muted mb-3 font-mono">
          {preset.character}
        </p>
        {preset.description && (
          <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-3">
            {preset.description}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="dot-matrix tabular-nums">
            {preset.tier === 'detailed' ? 'TUNED' : 'BASE'}
          </span>
          <span
            className="dot-matrix tabular-nums group-hover:text-text-primary transition-colors"
            style={{ color: 'rgb(var(--accent) / 0.8)' }}
          >
            OPEN →
          </span>
        </div>
      </div>
    </Link>
  );
}
