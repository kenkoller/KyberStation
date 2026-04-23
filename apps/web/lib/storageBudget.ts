/**
 * storageBudget — shared SD-card budget math for both the
 * StorageBudgetPanel (Output tab / detail view) and the DeliveryRail's
 * STORAGE segment (OV4, bottom chrome).
 *
 * Both surfaces need the same calculation: the active saber profile's
 * active card config → font list → estimateTotal(). Extracting the
 * selector keeps the two consumers in lockstep instead of drifting.
 *
 * `useStorageBudget()` returns the shape StorageBudgetPanel already
 * consumes plus a simple `tier` classification the Delivery rail uses
 * for its status color:
 *   tier = 'ok'   → usage < 60%   (green)
 *   tier = 'warn' → usage < 85%   (amber)
 *   tier = 'error'→ usage ≥ 85%   (red)
 */

import { useMemo } from 'react';
import { estimateTotal, type StorageBudget } from '@kyberstation/engine';
import { usePresetListStore } from '@/stores/presetListStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { useAudioFontStore } from '@/stores/audioFontStore';

export type StorageTier = 'ok' | 'warn' | 'error';

/** Threshold for the Delivery rail's amber tier (§7 proposal defaults). */
export const STORAGE_WARN_FRACTION = 0.6;
/** Threshold for the Delivery rail's red tier. */
export const STORAGE_ERROR_FRACTION = 0.85;

export interface StorageBudgetState {
  budget: StorageBudget;
  /** Card size string passed to estimateTotal (matches Panel default). */
  cardSize: string;
  /** usagePercent / 100 as a [0,1] fraction for tier comparisons. */
  usageFraction: number;
  /** Discretized tier from thresholds above. */
  tier: StorageTier;
}

/**
 * Read the current storage budget from the active profile + preset list.
 * Falls back to the flat preset list when no saber profile is active
 * (same fallback order as StorageBudgetPanel).
 *
 * Argument shape kept minimal because both consumers use the same
 * defaults. If the Delivery rail ever needs a per-rail override (larger
 * card size, extra music tracks), add them here and thread through.
 */
export function useStorageBudget(options?: {
  cardSize?: string;
  musicTracks?: number;
}): StorageBudgetState {
  const cardSize = options?.cardSize ?? '16GB';
  const musicTracks = options?.musicTracks ?? 0;

  const presetListEntries = usePresetListStore((s) => s.entries);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);
  const libraryFonts = useAudioFontStore((s) => s.libraryFonts);

  // Font size overrides map — populated by library scans when the user
  // inspects a font in the Audio tab. Estimate otherwise.
  const fontSizeOverrides = useMemo(() => {
    const overrides: Record<string, number> = {};
    for (const f of libraryFonts) {
      if (f.totalSizeBytes > 0) {
        overrides[f.name] = f.totalSizeBytes;
      }
    }
    return overrides;
  }, [libraryFonts]);

  // Active profile's card config, else the flat preset list.
  const entries = useMemo(() => {
    if (activeProfileId) {
      const profile = profiles.find((p) => p.id === activeProfileId);
      if (profile) {
        const cc =
          profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ??
          profile.cardConfigs[0];
        if (cc && cc.entries.length > 0) {
          return cc.entries.map((e) => ({ fontName: e.fontName }));
        }
      }
    }
    return presetListEntries.map((e) => ({ fontName: e.fontName }));
  }, [activeProfileId, profiles, presetListEntries]);

  const budget = useMemo(() => {
    const fontNames = entries.map((e) => e.fontName);
    return estimateTotal({
      cardSize,
      fontNames: fontNames.length > 0 ? fontNames : ['Default'],
      presetCount: Math.max(entries.length, 1),
      oledFrameCount: 5,
      musicTrackCount: musicTracks,
      fontSizeOverrides,
    });
  }, [entries, cardSize, musicTracks, fontSizeOverrides]);

  const usageFraction = budget.usagePercent / 100;
  const tier = classifyStorageTier(usageFraction);

  return { budget, cardSize, usageFraction, tier };
}

/**
 * Pure helper exported for regression tests. Mirrors the §7 color
 * thresholds from UI_OVERHAUL_v2_PROPOSAL.md.
 */
export function classifyStorageTier(usageFraction: number): StorageTier {
  if (usageFraction >= STORAGE_ERROR_FRACTION) return 'error';
  if (usageFraction >= STORAGE_WARN_FRACTION) return 'warn';
  return 'ok';
}
