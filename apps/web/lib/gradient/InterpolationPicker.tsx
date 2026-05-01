'use client';
// ─── InterpolationPicker — radio-group of Linear / Smooth / Step buttons ────
//
// Used as a section accessory in two layout shapes: as a top "Mode" row in
// the inline `<GradientEditor>` and as a CollapsibleSection `headerAccessory`
// in `<GradientEditorPanel>`. The buttons themselves are identical; only the
// surrounding layout differs.

import type { GradientInterpolation } from './types';
import { INTERPOLATION_OPTIONS } from './types';

export interface InterpolationPickerProps {
  value: GradientInterpolation;
  onChange: (value: GradientInterpolation) => void;
}

export function InterpolationPicker({ value, onChange }: InterpolationPickerProps) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Interpolation mode">
      {INTERPOLATION_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors ${
            value === opt.id
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
          title={opt.description}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
