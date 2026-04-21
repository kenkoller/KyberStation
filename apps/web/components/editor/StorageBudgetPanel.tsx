'use client';

import { useMemo, useState } from 'react';
import { usePresetListStore } from '@/stores/presetListStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { estimateTotal, formatBytes, CARD_SIZES } from '@kyberstation/engine';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { RadialGauge } from '@/components/shared/RadialGauge';

// Identity colors for budget categories — not theme tokens; these are
// category markers that must stay distinguishable even when the caller
// colorblind-toggles the app. They pair with text labels in the breakdown
// list so they remain accessible as redundant identifiers.
const CATEGORY_COLORS: Record<string, string> = {
  font: '#4f8ff7',
  config: '#8b5cf6',
  oled: '#f59e0b',
  music: '#10b981',
  system: '#6b7280',
};

// Usage thresholds — passed to <RadialGauge> which owns the
// `criticalStateChange` pulse (UX_NORTH_STAR §7) on tier escalation.
const WARN_THRESHOLD = 75;
const CRITICAL_THRESHOLD = 90;

export function StorageBudgetPanel() {
  const presetListEntries = usePresetListStore((s) => s.entries);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);
  const libraryFonts = useAudioFontStore((s) => s.libraryFonts);
  const [cardSize, setCardSize] = useState('16GB');
  const [musicTracks, setMusicTracks] = useState(0);

  // Build font size overrides from library scan data
  const fontSizeOverrides = useMemo(() => {
    const overrides: Record<string, number> = {};
    for (const f of libraryFonts) {
      if (f.totalSizeBytes > 0) {
        overrides[f.name] = f.totalSizeBytes;
      }
    }
    return overrides;
  }, [libraryFonts]);

  // Use active profile's active card config if available, otherwise fall back to preset list
  const entries = useMemo(() => {
    if (activeProfileId) {
      const profile = profiles.find((p) => p.id === activeProfileId);
      if (profile) {
        const cc = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
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

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        SD Card Budget
        <HelpTooltip text="Estimated SD card usage based on your preset list, sound fonts, and extras. Actual sizes vary by font quality and file format. See also: Sound Font panel Library tab for per-font file sizes, and Card Writer for SD card export." />
      </h3>

      {/* Card Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-ui-sm text-text-muted">Card Size:</span>
        <select
          value={cardSize}
          onChange={(e) => setCardSize(e.target.value)}
          aria-label="SD card size"
          className="bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-sm text-text-secondary"
        >
          {Object.keys(CARD_SIZES).map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="text-ui-sm text-text-muted">Music Tracks:</span>
        <input
          type="number"
          min={0}
          max={50}
          value={musicTracks}
          onChange={(e) => setMusicTracks(Number(e.target.value))}
          aria-label="Number of music tracks"
          className="w-12 bg-bg-deep border border-border-subtle rounded px-1.5 py-1 text-ui-sm text-text-secondary text-center"
        />
      </div>

      {/* Radial integrity gauge — Returnal-style 270° arc with tick marks.
          The gauge owns the `criticalStateChange` pulse on tier escalation
          (UX_NORTH_STAR §7) and the color-tier token switching. */}
      <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle flex items-center gap-4">
        <RadialGauge
          value={budget.usagePercent}
          max={100}
          unit="%"
          label="FLASH"
          tiers={{ warn: WARN_THRESHOLD, critical: CRITICAL_THRESHOLD }}
          glyphPairing
          size={120}
          pulseOnThresholdCrossing
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-ui-sm text-text-secondary font-mono tabular-nums">
            {formatBytes(budget.totalBytes)} used
          </div>
          <div className="text-ui-xs text-text-muted">
            {formatBytes(budget.freeBytes)} free of {cardSize}
          </div>
          {/* Thin composition strip — keeps the category breakdown visible
              at a glance without reintroducing a primary bar gauge. */}
          <div
            className="h-1.5 bg-bg-deep rounded-full overflow-hidden flex mt-1"
            role="presentation"
            aria-hidden="true"
          >
            {budget.breakdown.map((item, i) => {
              const widthPct = (item.bytes / budget.cardSizeBytes) * 100;
              if (widthPct < 0.1) return null;
              return (
                <div
                  key={i}
                  title={`${item.label}: ${formatBytes(item.bytes)}`}
                  className="h-full transition-all"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: CATEGORY_COLORS[item.category] ?? '#666',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-0.5">
        {budget.breakdown.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-ui-sm">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#666' }}
            />
            <span className="flex-1 text-text-secondary truncate">{item.label}</span>
            <span className="text-text-muted font-mono">{formatBytes(item.bytes)}</span>
          </div>
        ))}
      </div>

      {/* Warnings — tokenised to --status-warn / --status-error */}
      {budget.usagePercent >= 80 && (() => {
        const warnTier = budget.usagePercent >= 95 ? '--status-error' : '--status-warn';
        const glyph = budget.usagePercent >= 95 ? '✕' : '⚠';
        return (
          <div
            className="text-ui-xs p-2 rounded border flex items-start gap-2"
            style={{
              color: `rgb(var(${warnTier}))`,
              background: `rgb(var(${warnTier}) / 0.1)`,
              borderColor: `rgb(var(${warnTier}) / 0.3)`,
            }}
          >
            <span aria-hidden="true" className="shrink-0">{glyph}</span>
            <span>
              {budget.usagePercent >= 95
                ? 'SD card nearly full. Remove fonts or reduce preset count.'
                : 'SD card usage above 80%. Consider a larger card or fewer fonts.'}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
