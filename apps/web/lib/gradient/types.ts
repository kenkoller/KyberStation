// ─── Gradient editor types + canonical defaults ─────────────────────────────
//
// Shared by `<GradientEditor>` (inline shape used by ColorPanel) and
// `<GradientEditorPanel>` (CollapsibleSection-wrapped shape used by
// ColorColumnB + BladeStyleColumnB). Previously duplicated between
// `components/editor/GradientBuilder.tsx` and `components/editor/ColorPanel.tsx`'s
// private `GradientRegion()` until the 2026-05-01 consumer-migration cleanup.

export interface GradientStop {
  position: number;
  color: { r: number; g: number; b: number };
}

export type GradientInterpolation = 'linear' | 'smooth' | 'step';

export const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { position: 0, color: { r: 0, g: 100, b: 255 } },
  { position: 1, color: { r: 255, g: 50, b: 0 } },
];

export const INTERPOLATION_OPTIONS: Array<{
  id: GradientInterpolation;
  label: string;
  description: string;
}> = [
  { id: 'linear', label: 'Linear', description: 'Straight-line blending between colors' },
  { id: 'smooth', label: 'Smooth', description: 'Eased transitions (S-curve) between colors' },
  { id: 'step', label: 'Step', description: 'Hard color bands with no blending' },
];
