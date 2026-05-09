'use client';
import { useCallback, useState } from 'react';
import type { BladeEngine } from '@kyberstation/engine';

interface VariantCyclerProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * VariantCycler — inline action-bar control for cycling through
 * ColorChange template variants.
 *
 * Only renders when the active template has more than one variant
 * (i.e. `engine.variantCount > 0`). Wraps in both directions.
 *
 * The variant state lives on the engine (not React state). We use a
 * local tick counter to force re-reads after user clicks; the display
 * stays in sync because every click bumps the counter.
 */
export function VariantCycler({ engineRef }: VariantCyclerProps) {
  // Local counter to force re-render after prev/next clicks.
  // The source of truth is `engine.currentVariant` / `engine.variantCount`,
  // but React won't know they changed unless we trigger a state update.
  const [, setTick] = useState(0);

  const engine = engineRef.current;
  const count = engine?.variantCount ?? 0;
  const current = engine?.currentVariant ?? 0;

  const goPrev = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.variantCount <= 0) return;
    const c = eng.currentVariant;
    const n = eng.variantCount;
    eng.setVariant((c - 1 + n) % n);
    setTick((t) => t + 1);
  }, [engineRef]);

  const goNext = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || eng.variantCount <= 0) return;
    const c = eng.currentVariant;
    const n = eng.variantCount;
    eng.setVariant((c + 1) % n);
    setTick((t) => t + 1);
  }, [engineRef]);

  // Don't render when there are no variants to cycle through.
  if (count <= 0) return null;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="group"
      aria-label="Color variant selector"
    >
      <button
        onClick={goPrev}
        className="px-1.5 py-0.5 rounded text-ui-xs text-text-muted hover:text-accent hover:bg-accent/10 transition-colors border border-transparent hover:border-accent-border"
        aria-label="Previous color variant"
        title="Previous variant"
      >
        &#9664;
      </button>
      <span
        className="px-1.5 py-0.5 text-ui-xs text-text-muted tabular-nums select-none"
        aria-live="polite"
        aria-label={`Variant ${current + 1} of ${count}`}
      >
        {current + 1} / {count}
      </span>
      <button
        onClick={goNext}
        className="px-1.5 py-0.5 rounded text-ui-xs text-text-muted hover:text-accent hover:bg-accent/10 transition-colors border border-transparent hover:border-accent-border"
        aria-label="Next color variant"
        title="Next variant"
      >
        &#9654;
      </button>
    </div>
  );
}
