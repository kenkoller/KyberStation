'use client';
import { useId, type ReactNode } from 'react';
import { useDragToScrub } from '@/hooks/useDragToScrub';

/**
 * Label-above-slider scrub field for the layer config panels. Applies
 * `useDragToScrub` to the stacked label so the whole block participates
 * in the shared scrub primitive. Visual shape matches the surrounding
 * layer-config rows — label above, slider + readout below.
 */
export function StackedScrub({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  unit,
  format,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
  unit?: string;
  format?: (v: number) => string;
}) {
  const id = useId();
  const inputId = `stacked-scrub-${id}`;
  const handlers = useDragToScrub<HTMLLabelElement>({ value, min, max, step, onScrub: onChange });
  const formatted = format ? format(value) : String(value);
  return (
    <div>
      <label
        htmlFor={inputId}
        {...handlers}
        className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block cursor-ew-resize select-none touch-none"
        style={{ touchAction: 'none' }}
        title="Drag to scrub (Shift 10×, Alt 0.1×). Click slider to type."
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        />
        <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
          {formatted}{unit ?? ''}
        </span>
      </div>
    </div>
  );
}

/**
 * Mix-ratio scrub row — stacked label with an A/B-anchored slider below.
 * Carries its own handler so the "Mix Ratio" label itself scrubs; the
 * native slider keeps keyboard + screen reader parity.
 */
export function MixRatioScrub({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const inputId = `mix-ratio-${id}`;
  const handlers = useDragToScrub<HTMLLabelElement>({
    value,
    min: 0,
    max: 100,
    step: 1,
    onScrub: onChange,
  });
  return (
    <div>
      <label
        htmlFor={inputId}
        {...handlers}
        className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block cursor-ew-resize select-none touch-none"
        style={{ touchAction: 'none' }}
        title="Drag to scrub (Shift 10×, Alt 0.1×). Click slider to type."
      >
        Mix Ratio
      </label>
      <div className="flex items-center gap-2">
        <span className="text-ui-xs text-text-muted">A</span>
        <input
          id={inputId}
          type="range"
          min={0} max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          aria-label="Mix ratio between Style A and Style B"
        />
        <span className="text-ui-xs text-text-muted">B</span>
        <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{value}%</span>
      </div>
    </div>
  );
}
