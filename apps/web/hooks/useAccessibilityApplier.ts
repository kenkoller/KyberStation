'use client';
import { useEffect } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

/**
 * Applies accessibility settings to <html> element as CSS classes and
 * custom properties. Should be called once from AppShell alongside
 * useThemeApplier().
 */
export function useAccessibilityApplier() {
  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const colorblindMode = useAccessibilityStore((s) => s.colorblindMode);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const fontScale = useAccessibilityStore((s) => s.fontScale);
  const syncReducedMotionFromOS = useAccessibilityStore((s) => s.syncReducedMotionFromOS);
  const hasExplicitMotionPref = useAccessibilityStore((s) => s.hasExplicitMotionPref);

  // Sync with OS prefers-reduced-motion on mount, and listen for live changes
  useEffect(() => {
    syncReducedMotionFromOS();
    if (hasExplicitMotionPref) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => syncReducedMotionFromOS();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [syncReducedMotionFromOS, hasExplicitMotionPref]);

  useEffect(() => {
    const el = document.documentElement;

    // High contrast
    el.classList.toggle('high-contrast', highContrast);

    // Colorblind modes (mutually exclusive)
    el.classList.remove('cb-deuteranopia', 'cb-protanopia', 'cb-tritanopia');
    if (colorblindMode !== 'none') {
      el.classList.add(`cb-${colorblindMode}`);
    }

    // Reduced motion — also toggle ambient-off to kill all ambient CSS animations
    el.classList.toggle('reduced-motion', reducedMotion);
    el.classList.toggle('ambient-off', reducedMotion);

    // Font scale
    el.style.setProperty('--font-scale', String(fontScale));
  }, [highContrast, colorblindMode, reducedMotion, fontScale]);
}
