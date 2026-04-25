'use client';

// ─── QuickRetractionPicker — compact row wrapper for the Inspector ────────
//
// Structurally identical to QuickIgnitionPicker — see that file's header
// for the rationale behind the duplicated catalog. Changes here:
//   - 13-entry retraction catalog (mirrors RETRACTION_STYLES in
//     IgnitionRetractionPanel.tsx).
//   - Wider ms range (100–3000) matching the deep-tuning panel's slider.
//   - Writes via setRetraction + updateConfig({ retractionMs }).

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { getRetractionThumbnail } from '@/lib/retractionThumbnails';
import { QuickTransitionPicker } from './QuickTransitionPicker';

// 13-entry catalog — mirrors RETRACTION_STYLES in IgnitionRetractionPanel.tsx.
export const QUICK_RETRACTION_STYLES: ReadonlyArray<{
  id: string;
  label: string;
  desc: string;
}> = [
  { id: 'standard', label: 'Standard', desc: 'Linear retraction' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling retract' },
  { id: 'fadeout', label: 'Fade Out', desc: 'Fading retraction' },
  { id: 'center', label: 'Center In', desc: 'Retracts to center' },
  { id: 'shatter', label: 'Shatter', desc: 'Shattering retraction' },
  { id: 'dissolve', label: 'Dissolve', desc: 'Random shuffle turn-off' },
  { id: 'flickerOut', label: 'Flicker Out', desc: 'Tip-to-base flicker band' },
  { id: 'unravel', label: 'Unravel', desc: 'Sinusoidal thread unwind' },
  { id: 'drain', label: 'Drain', desc: 'Gravity drain with meniscus' },
  { id: 'implode', label: 'Implode', desc: 'Collapsing inward retraction' },
  { id: 'evaporate', label: 'Evaporate', desc: 'Fading particle evaporation' },
  { id: 'spaghettify', label: 'Spaghettify', desc: 'Stretching gravitational pull' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

export function QuickRetractionPicker() {
  const config = useBladeStore((s) => s.config);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const items = useMemo(
    () =>
      QUICK_RETRACTION_STYLES.map((style) => {
        const entry = getRetractionThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
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
