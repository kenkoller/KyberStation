// ─── Hex / RGB conversion helpers (gradient-scoped) ─────────────────────────
//
// Local copies kept inside `lib/gradient/` so the gradient module is
// self-contained and doesn't pull in the broader neopixelColor pipeline.
// ColorPanel.tsx still has its own copies for the regular color picker
// surfaces; intentional duplication — these helpers are a few lines and the
// shared module shouldn't depend on a sibling component.

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  );
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
