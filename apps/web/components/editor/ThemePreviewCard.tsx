'use client';

import type { CanvasTheme } from '@/lib/canvasThemes';
import type { ExtendedCanvasTheme } from '@/lib/extendedThemes';

interface ThemePreviewCardProps {
  theme: CanvasTheme | ExtendedCanvasTheme;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

function isExtended(theme: CanvasTheme | ExtendedCanvasTheme): theme is ExtendedCanvasTheme {
  return 'category' in theme;
}

export function ThemePreviewCard({ theme, isActive, onClick, className }: ThemePreviewCardProps) {
  const extended = isExtended(theme);
  const crystalColor = theme.ui.crystalColor;
  const accent = theme.ui.accent; // space-separated RGB channels

  const cornerClass =
    'material' in theme
      ? theme.material.cornerStyle === 'angular'
        ? 'corner-angular'
        : theme.material.cornerStyle === 'clipped'
          ? 'corner-clipped'
          : 'corner-rounded'
      : 'corner-rounded';

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${theme.label} theme${isActive ? ' (active)' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`card-hover ${cornerClass} cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${className ?? ''}`}
      style={{
        width: 120,
        minHeight: 80,
        border: `1px solid rgb(${accent} / ${isActive ? 0.6 : 0.15})`,
        boxShadow: isActive ? `0 0 12px 2px rgb(${accent} / 0.25)` : 'none',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {/* --- Swatch Preview --- */}
      <div
        style={{
          position: 'relative',
          height: 52,
          backgroundColor: theme.bgColor,
          overflow: 'hidden',
        }}
      >
        {/* Blade stripe */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 10,
            right: 10,
            height: 4,
            transform: 'translateY(-50%)',
            backgroundColor: crystalColor,
            borderRadius: 2,
            boxShadow: `0 0 8px 2px ${crystalColor}80, 0 0 16px 4px ${crystalColor}40`,
          }}
        />

        {/* Accent dots */}
        <div style={{ position: 'absolute', bottom: 6, left: 10, display: 'flex', gap: 5 }}>
          {[0.8, 0.5, 0.35].map((opacity, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: `rgb(${accent} / ${opacity})`,
              }}
            />
          ))}
        </div>

        {/* Category badge (extended themes only) */}
        {extended && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              fontSize: 7,
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: 2,
              backgroundColor: `rgb(${accent} / 0.15)`,
              color: `rgb(${accent} / 0.8)`,
            }}
          >
            {(theme as ExtendedCanvasTheme).category === 'location' ? 'loc' : 'fac'}
          </span>
        )}
      </div>

      {/* --- Label --- */}
      <div
        className="dot-matrix"
        style={{
          padding: '5px 8px',
          backgroundColor: theme.stripBg,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: `rgb(${accent} / ${isActive ? 0.9 : 0.6})`,
          fontSize: 8,
        }}
      >
        {theme.label}
      </div>
    </div>
  );
}
