'use client';

// ─── QuickIgnitionPicker — compact row wrapper for the Inspector ──────────
//
// Thin wrapper around QuickTransitionPicker. Consumes the canonical
// 19-ignition catalog from `lib/transitionCatalogs.ts` — shared with
// IgnitionRetractionPanel.tsx so the Inspector's quick picker and the
// deep-tuning panel can never disagree about which ignitions exist.
//
// Store wiring: reads config.ignition + config.ignitionMs, writes via
// setIgnition + updateConfig. The MGP item list is memoised per render;
// the catalog itself lives at module scope in the shared lib.

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { getIgnitionThumbnail } from '@/lib/ignitionThumbnails';
import { IGNITION_STYLES } from '@/lib/transitionCatalogs';
import { QuickTransitionPicker } from './QuickTransitionPicker';

// Back-compat alias: test files imported `QUICK_IGNITION_STYLES` as a named
// export before the catalog was extracted. Re-export the canonical list
// under the old name so existing tests keep resolving without a rewrite.
export const QUICK_IGNITION_STYLES = IGNITION_STYLES;

export function QuickIgnitionPicker() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const items = useMemo(
    () =>
      IGNITION_STYLES.map((style) => {
        const entry = getIgnitionThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
          description: style.desc,
        };
      }),
    [],
  );

  const ms = (config.ignitionMs as number | undefined) ?? 300;

  return (
    <QuickTransitionPicker
      label="IGNITION"
      items={items}
      activeId={config.ignition}
      onSelect={setIgnition}
      ms={ms}
      onChangeMs={(next) => updateConfig({ ignitionMs: next })}
      msMin={50}
      msMax={2000}
      msStep={50}
      pickerAriaLabel="Ignition style picker"
    />
  );
}
