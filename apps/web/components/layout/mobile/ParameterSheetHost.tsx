'use client';

// ─── ParameterSheetHost — Phase 4.4.x (2026-05-01) ──────────────────────────
//
// Single-mount subscriber for the global parameterSheetStore. Mounted
// once at the MobileShell level. Renders the ParameterSheet primitive
// + the ParameterSheetBody for the currently-active spec, or returns
// null when no parameter is being edited.
//
// The host is the only consumer of the store's `spec.read` / `spec.write`
// getters — so binding details (Hue → bladeStore HSL conversion;
// Bright → uiStore.brightness) live entirely inside whoever called
// `open(spec)`. The sheet stays generic.

import { ParameterSheet } from '@/components/layout/mobile/ParameterSheet';
import { ParameterSheetBody } from '@/components/layout/mobile/ParameterSheetBody';
import { useParameterSheetStore } from '@/stores/parameterSheetStore';

export function ParameterSheetHost() {
  const isOpen = useParameterSheetStore((s) => s.isOpen);
  const spec = useParameterSheetStore((s) => s.spec);
  const close = useParameterSheetStore((s) => s.close);

  // Subscribing to the spec object means a swap to a different param
  // (e.g. user closes Hue sheet, immediately long-presses Sat) re-
  // renders against the new spec. Re-reading `spec.read()` per render
  // ensures the slider value reflects live store state.
  if (!isOpen || !spec) return null;

  return (
    <ParameterSheet
      open={isOpen}
      initialState="peek"
      onClose={close}
      title={spec.title}
      onReset={() => spec.write(spec.defaultValue)}
    >
      <ParameterSheetBody
        value={spec.read()}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        unit={spec.unit}
        color={spec.color}
        formatDisplay={spec.formatDisplay}
        onChange={(v) => spec.write(v)}
      />
    </ParameterSheet>
  );
}
