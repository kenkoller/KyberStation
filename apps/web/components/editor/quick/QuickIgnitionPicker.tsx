'use client';

// ─── QuickIgnitionPicker — compact row wrapper for the Inspector ──────────
//
// Thin wrapper around QuickTransitionPicker. Holds:
//   - The canonical 19-ignition catalog (kept in sync with the inline
//     IGNITION_STYLES in IgnitionRetractionPanel.tsx — the deep-tuning
//     panel — so the two surfaces stay aligned). Duplication is
//     intentional for this sprint: the task brief explicitly forbids
//     modifying IgnitionRetractionPanel.tsx, so extraction to a shared
//     module is deferred to a follow-up.
//   - Store wiring: reads config.ignition + config.ignitionMs,
//     writes via setIgnition + updateConfig.
//
// The catalog is memoised (module-level, not per-render) so the MGP
// thumbnail lookup + item construction happens once per module load.

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { getIgnitionThumbnail } from '@/lib/ignitionThumbnails';
import { QuickTransitionPicker } from './QuickTransitionPicker';

// 19-entry catalog — mirrors IGNITION_STYLES in IgnitionRetractionPanel.tsx.
// If either list diverges, the two surfaces will disagree about which
// ignitions exist. A future extraction to `lib/transitionCatalogs.ts`
// (or similar) is the correct long-term fix.
export const QUICK_IGNITION_STYLES: ReadonlyArray<{
  id: string;
  label: string;
  desc: string;
}> = [
  { id: 'standard', label: 'Standard', desc: 'Classic linear ignition' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling pixel fill' },
  { id: 'spark', label: 'Spark', desc: 'Crackling spark ignition' },
  { id: 'center', label: 'Center Out', desc: 'Ignites from center' },
  { id: 'wipe', label: 'Wipe', desc: 'Soft wipe reveal' },
  { id: 'stutter', label: 'Stutter', desc: 'Flickering unstable ignition' },
  { id: 'glitch', label: 'Glitch', desc: 'Digital glitch effect' },
  { id: 'twist', label: 'Twist', desc: 'Spiral ignition driven by twist' },
  { id: 'swing', label: 'Swing', desc: 'Speed-reactive swing ignition' },
  { id: 'stab', label: 'Stab', desc: 'Rapid center-out burst' },
  { id: 'crackle', label: 'Crackle', desc: 'Random segment flicker fill' },
  { id: 'fracture', label: 'Fracture', desc: 'Radiating crack points' },
  { id: 'flash-fill', label: 'Flash Fill', desc: 'White flash then color wipe' },
  { id: 'pulse-wave', label: 'Pulse Wave', desc: 'Sequential building waves' },
  { id: 'drip-up', label: 'Drip Up', desc: 'Fluid upward flow' },
  { id: 'hyperspace', label: 'Hyperspace', desc: 'Streaking star-line ignition' },
  { id: 'summon', label: 'Summon', desc: 'Force-pull ignition' },
  { id: 'seismic', label: 'Seismic', desc: 'Ground-shake ripple ignition' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

export function QuickIgnitionPicker() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const items = useMemo(
    () =>
      QUICK_IGNITION_STYLES.map((style) => {
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
