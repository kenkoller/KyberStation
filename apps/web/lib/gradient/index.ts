// Public surface of the gradient editor module.
//
// Consumers should import from `@/lib/gradient` rather than reaching into
// the individual files — keeps the boundary explicit and lets the internals
// be reorganized without breaking call sites.

export { GradientEditor, GradientEditorPanel } from './GradientEditor';
export type { GradientEditorPanelProps } from './GradientEditor';
export { GradientEditorBody } from './GradientEditorBody';
export type { GradientEditorBodyProps } from './GradientEditorBody';
export { InterpolationPicker } from './InterpolationPicker';
export type { InterpolationPickerProps } from './InterpolationPicker';
export { useGradientEditor } from './useGradientEditor';
export type { UseGradientEditorReturn } from './useGradientEditor';
export { hexToRgb, rgbToHex } from './colorUtils';
export {
  DEFAULT_GRADIENT_STOPS,
  INTERPOLATION_OPTIONS,
  type GradientInterpolation,
  type GradientStop,
} from './types';
