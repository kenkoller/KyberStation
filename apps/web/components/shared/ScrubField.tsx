'use client';

import { useId, type ReactNode } from 'react';
import { useDragToScrub } from '@/hooks/useDragToScrub';

export interface ScrubFieldProps {
  /** Visible label text. Becomes the scrub affordance. */
  label: ReactNode;
  /** Current numeric value. */
  value: number;
  /** Lower bound for the slider and the scrubbed value. */
  min: number;
  /** Upper bound for the slider and the scrubbed value. */
  max: number;
  /** Step for the range input. Also multiplied into the scrub delta. */
  step?: number;
  /** Called with the next value on every scrub or native input change. */
  onChange: (next: number) => void;
  /**
   * Optional formatter for the trailing readout. Defaults to
   * `value.toString()` with no decimal padding.
   */
  format?: (value: number) => string;
  /** Optional unit appended to the readout (e.g. "%", "ms"). */
  unit?: string;
  /** Optional aria-label applied to the range input. */
  ariaLabel?: string;
  /** Optional title attribute on the outer row for tooltips. */
  title?: string;
  /** Disabled state — passes through to the range input and the hook. */
  disabled?: boolean;
  /**
   * Row-wrapper classes. Supplies both spacing (gap-*) and any extra
   * utility classes. Keep a `gap-*` here — the wrapper intentionally
   * doesn't bake one in so callers can choose tight (gap-2) or loose
   * (gap-3). Default is `gap-3`.
   */
  className?: string;
  /** Fixed width for the label column (Tailwind class). Default w-28. */
  labelClassName?: string;
  /** Fixed width for the readout column (Tailwind class). Default w-12. */
  readoutClassName?: string;
  /**
   * Optional node rendered between the input and the readout (e.g. a
   * clear button). Most callers won't need this.
   */
  inlineAccessory?: ReactNode;
  /** Optional id override for the range input. */
  id?: string;
  /**
   * Callback invoked when the scrubbed value changes via the drag path
   * specifically (not via the native slider). Useful for emitting sounds
   * or side-effects that should only fire on drag.
   */
  onScrub?: (next: number) => void;
}

/**
 * Drag-to-scrub numeric field. Pairs a Blender-style scrub label with
 * a native `<input type="range">` so keyboard and screen reader users
 * are never regressed. Uses `useDragToScrub` for the pointer path.
 *
 * For layouts that don't fit this shape (e.g. sliders with tick rows,
 * custom knobs, or non-label scrub targets) drop down to `useDragToScrub`
 * directly.
 */
export function ScrubField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  unit,
  ariaLabel,
  title,
  disabled = false,
  className = 'gap-3',
  labelClassName = 'w-28',
  readoutClassName = 'w-12',
  inlineAccessory,
  id: idProp,
  onScrub,
}: ScrubFieldProps) {
  const reactId = useId();
  const id = idProp ?? `scrub-${reactId}`;

  const pointerHandlers = useDragToScrub<HTMLLabelElement>({
    value,
    min,
    max,
    step,
    onScrub: (next) => {
      const snapped = step != null ? Math.round(next / step) * step : next;
      onChange(snapped);
      onScrub?.(snapped);
    },
    disabled,
  });

  const formatted = format ? format(value) : String(value);

  return (
    <div
      className={`flex items-center ${className}`}
      title={title}
    >
      <label
        htmlFor={id}
        title={
          disabled
            ? undefined
            : 'Drag to scrub (Shift 10×, Alt 0.1×). Click input to type.'
        }
        {...pointerHandlers}
        className={`text-ui-xs text-text-secondary shrink-0 select-none touch-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-ew-resize'
        } ${labelClassName}`}
        style={{ touchAction: disabled ? undefined : 'none' }}
      >
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 disabled:opacity-40"
      />
      {inlineAccessory}
      <span
        className={`text-ui-sm text-text-muted font-mono text-right shrink-0 ${readoutClassName}`}
      >
        {formatted}
        {unit ?? ''}
      </span>
    </div>
  );
}
