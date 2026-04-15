'use client';

import { useEffect, useRef } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import type { ColorblindMode } from '@/stores/accessibilityStore';

const COLORBLIND_OPTIONS: Array<{ value: ColorblindMode; label: string; description: string }> = [
  { value: 'none', label: 'None', description: 'Default color palette' },
  { value: 'deuteranopia', label: 'Deuteranopia', description: 'Most common — difficulty distinguishing red and green' },
  { value: 'protanopia', label: 'Protanopia', description: 'Red colors appear dim or absent' },
  { value: 'tritanopia', label: 'Tritanopia', description: 'Difficulty distinguishing blue and yellow' },
];

export function AccessibilityPanel({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Focus trap: save previous focus, trap Tab within dialog, Escape to close
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      (previousFocusRef.current as HTMLElement)?.focus?.();
    };
  }, [onClose]);

  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const setHighContrast = useAccessibilityStore((s) => s.setHighContrast);
  const colorblindMode = useAccessibilityStore((s) => s.colorblindMode);
  const setColorblindMode = useAccessibilityStore((s) => s.setColorblindMode);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const setReducedMotion = useAccessibilityStore((s) => s.setReducedMotion);
  const fontScale = useAccessibilityStore((s) => s.fontScale);
  const setFontScale = useAccessibilityStore((s) => s.setFontScale);
  const reset = useAccessibilityStore((s) => s.reset);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility settings"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-ui-lg font-semibold text-text-primary">Accessibility Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
            aria-label="Close accessibility settings"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* High Contrast */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="a11y-high-contrast" className="text-ui-base font-medium text-text-primary">
                High Contrast
              </label>
              <button
                id="a11y-high-contrast"
                role="switch"
                aria-checked={highContrast}
                onClick={() => setHighContrast(!highContrast)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  highContrast ? 'bg-accent' : 'bg-bg-deep border border-border-subtle'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  highContrast ? 'translate-x-5' : ''
                }`} />
                <span className="sr-only">{highContrast ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
            <p className="text-ui-xs text-text-muted">
              Pure white text on black background with stronger borders and brighter accent colors.
            </p>
          </div>

          {/* Colorblind Mode */}
          <div className="space-y-2">
            <label htmlFor="a11y-colorblind" className="text-ui-base font-medium text-text-primary block">
              Colorblind Mode
            </label>
            <select
              id="a11y-colorblind"
              value={colorblindMode}
              onChange={(e) => setColorblindMode(e.target.value as ColorblindMode)}
              className="w-full bg-bg-deep border border-border-subtle rounded px-3 py-2 text-ui-sm text-text-secondary"
            >
              {COLORBLIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-ui-xs text-text-muted">
              {COLORBLIND_OPTIONS.find((o) => o.value === colorblindMode)?.description}
            </p>
            {/* Color preview swatches */}
            <div className="flex gap-2 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(var(--status-ok))` }} />
                <span className="text-ui-xs text-text-muted">OK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(var(--status-warn))` }} />
                <span className="text-ui-xs text-text-muted">Warning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(var(--status-error))` }} />
                <span className="text-ui-xs text-text-muted">Error</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(var(--status-info))` }} />
                <span className="text-ui-xs text-text-muted">Info</span>
              </div>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="a11y-reduced-motion" className="text-ui-base font-medium text-text-primary">
                Reduced Motion
              </label>
              <button
                id="a11y-reduced-motion"
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  reducedMotion ? 'bg-accent' : 'bg-bg-deep border border-border-subtle'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  reducedMotion ? 'translate-x-5' : ''
                }`} />
                <span className="sr-only">{reducedMotion ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
            <p className="text-ui-xs text-text-muted">
              Disables all ambient animations and transitions. Blade preview still updates normally.
            </p>
          </div>

          {/* Font Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="a11y-font-scale" className="text-ui-base font-medium text-text-primary">
                Font Size
              </label>
              <span className="text-ui-sm text-text-secondary tabular-nums">{Math.round(fontScale * 100)}%</span>
            </div>
            <input
              id="a11y-font-scale"
              type="range"
              min={0.8}
              max={1.5}
              step={0.05}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full"
              aria-label="Font size scale"
              aria-valuemin={80}
              aria-valuemax={150}
              aria-valuenow={Math.round(fontScale * 100)}
            />
            <div className="flex justify-between text-ui-xs text-text-muted">
              <span>80%</span>
              <span>100%</span>
              <span>150%</span>
            </div>
          </div>

          {/* Reset */}
          <div className="pt-2 border-t border-border-subtle">
            <button
              onClick={reset}
              className="px-4 py-2 rounded text-ui-sm font-medium border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
