'use client';

// ─── QuickRetractionPicker — compact row wrapper for the Inspector ────────
//
// Structurally identical to QuickIgnitionPicker. Consumes the canonical
// 13-retraction catalog from `lib/transitionCatalogs.ts` — shared with
// IgnitionRetractionPanel.tsx. Uses a wider ms range (100–3000) matching
// the deep-tuning panel's slider. Writes via setRetraction +
// updateConfig({ retractionMs }).

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { getRetractionThumbnail } from '@/lib/retractionThumbnails';
import { RETRACTION_STYLES } from '@/lib/transitionCatalogs';
import { QuickTransitionPicker } from './QuickTransitionPicker';

// Back-compat alias for existing test imports.
export const QUICK_RETRACTION_STYLES = RETRACTION_STYLES;

export function QuickRetractionPicker() {
  const config = useBladeStore((s) => s.config);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const items = useMemo(
    () =>
      RETRACTION_STYLES.map((style) => {
        const entry = getRetractionThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
          // T1.2 (2026-04-29): see QuickIgnitionPicker for rationale.
          compactThumbnail: entry.compactThumbnail,
          description: style.desc,
        };
      }),
    [],
  );

  const ms = (config.retractionMs as number | undefined) ?? 500;

  return (
    <QuickTransitionPicker
      label="RETRACTION"
      items={items}
      activeId={config.retraction}
      onSelect={setRetraction}
      ms={ms}
      onChangeMs={(next) => updateConfig({ retractionMs: next })}
      msMin={100}
      msMax={3000}
      msStep={50}
      pickerAriaLabel="Retraction style picker"
    />
  );
}
