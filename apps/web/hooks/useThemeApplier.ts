'use client';
import { useEffect } from 'react';
import { getThemeById } from '@/lib/canvasThemes';
import { useUIStore } from '@/stores/uiStore';

/**
 * Applies the selected canvas theme to the entire UI by setting CSS
 * custom properties on <html>. Tailwind's color config references these
 * variables via `rgb(var(--xxx) / <alpha-value>)`, so every bg-*, text-*,
 * accent-*, and border-* class updates automatically when the theme changes.
 */
export function useThemeApplier() {
  const canvasTheme = useUIStore((s) => s.canvasTheme);

  useEffect(() => {
    const theme = getThemeById(canvasTheme);
    const { ui } = theme;
    const s = document.documentElement.style;

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
  }, [canvasTheme]);
}
