'use client';

// ─── Crystal Accent Applier ───
//
// Publishes the current blade's base colour as a CSS custom property
// so UI accents (Edit button glow, Wizard button sheen, etc.) can
// reference the saber's colour directly. Complements the
// useThemeApplier hook, which sets the palette-wide `--accent` from
// the selected theme — `--crystal-accent` is the PER-SABER colour
// on top of that theme.
//
// Consumers use the var via Tailwind's arbitrary-value syntax:
//   style={{ boxShadow: '0 0 12px rgb(var(--crystal-accent) / 0.4)' }}
//
// Values are space-separated RGB triples (Tailwind-compatible),
// e.g. "0 140 255".

import { useEffect } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

export function useCrystalAccent() {
  const baseColor = useBladeStore((s) => s.config.baseColor);

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty(
      '--crystal-accent',
      `${baseColor.r} ${baseColor.g} ${baseColor.b}`,
    );
  }, [baseColor.r, baseColor.g, baseColor.b]);
}
