'use client';
import { useEffect, useRef } from 'react';
import { getThemeById } from '@/lib/canvasThemes';
import { getThemeExtended } from '@/lib/themeDefinitions';
import { useUIStore } from '@/stores/uiStore';

// CSS class groups that must be mutually exclusive — we remove the whole set
// before adding the new one, so stale classes from a prior theme are gone.
const MATERIAL_CLASSES = ['material-matte', 'material-satin', 'material-gloss'] as const;
const CORNER_CLASSES = ['corner-rounded', 'corner-angular', 'corner-clipped'] as const;
const BORDER_CLASSES = ['border-subtle', 'border-lined', 'border-glow'] as const;

/**
 * Applies the selected canvas theme to the entire UI by:
 *
 * 1. Setting CSS custom properties on <html> for all palette colors.
 *    Tailwind's color config references these via `rgb(var(--xxx) / alpha)`.
 *
 * 2. Swapping material/corner/border CSS classes on <html> so that every
 *    panel using .material-*, .corner-*, or .border-* reflects the theme.
 *
 * 3. Setting --ambient-intensity so all ambient decoration CSS animations
 *    scale their opacity to match the theme's energy level.
 *
 * Called once from AppShell alongside useAccessibilityApplier().
 */
export function useThemeApplier() {
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  // Track the previously applied class set so we only touch what changed.
  const prevExtendedRef = useRef<{
    material: string;
    cornerStyle: string;
    borderStyle: string;
  } | null>(null);

  useEffect(() => {
    const theme = getThemeById(canvasTheme);
    const { ui } = theme;
    const html = document.documentElement;
    const s = html.style;

    // ── 1. Palette CSS custom properties ──────────────────────────────────
    // Channel-format colors (space-separated RGB, e.g. '74 158 255')
    // Tailwind uses these as: rgb(var(--accent) / <alpha-value>)
    s.setProperty('--bg-deep', ui.bgDeep);
    s.setProperty('--bg-primary', ui.bgPrimary);
    s.setProperty('--bg-secondary', ui.bgSecondary);
    s.setProperty('--bg-surface', ui.bgSurface);
    s.setProperty('--bg-card', ui.bgCard);
    s.setProperty('--accent', ui.accent);
    s.setProperty('--accent-warm', ui.accentWarm);
    s.setProperty('--text-primary', ui.textPrimary);
    s.setProperty('--text-secondary', ui.textSecondary);
    s.setProperty('--text-muted', ui.textMuted);

    // Full-value colors (rgba with baked-in alpha, used as-is)
    s.setProperty('--accent-dim', ui.accentDim);
    s.setProperty('--accent-border', ui.accentBorder);
    s.setProperty('--border-subtle', ui.borderSubtle);
    s.setProperty('--border-light', ui.borderLight);

    // Crystal glow (full hex for Canvas2D / radial-gradient usage)
    s.setProperty('--crystal-color', ui.crystalColor);

    // ── 2. Extended visual classes + ambient intensity ─────────────────────
    const ext = getThemeExtended(canvasTheme);
    const prev = prevExtendedRef.current;

    // Material surface
    if (!prev || prev.material !== ext.material) {
      html.classList.remove(...MATERIAL_CLASSES);
      html.classList.add(`material-${ext.material}`);
    }

    // Corner style
    if (!prev || prev.cornerStyle !== ext.cornerStyle) {
      html.classList.remove(...CORNER_CLASSES);
      html.classList.add(`corner-${ext.cornerStyle}`);
    }

    // Border style
    if (!prev || prev.borderStyle !== ext.borderStyle) {
      html.classList.remove(...BORDER_CLASSES);
      html.classList.add(`border-${ext.borderStyle}`);
    }

    // Ambient intensity — drives opacity on all ambient decoration animations
    s.setProperty('--ambient-intensity', String(ext.ambientIntensity));

    prevExtendedRef.current = {
      material: ext.material,
      cornerStyle: ext.cornerStyle,
      borderStyle: ext.borderStyle,
    };
  }, [canvasTheme]);
}
