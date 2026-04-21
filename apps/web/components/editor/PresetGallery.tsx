'use client';

// ─── PresetGallery — thin wrapper around GalleryMarquee ─────────────────
//
// As of OV3 (2026-04-21) the Gallery tab body is `<GalleryMarquee>` —
// edge-to-edge marquee rows matching the landing page's shape, with
// NEW SABER / SURPRISE ME head cards and a filter chip rail. This
// file keeps the `PresetGallery` named export as the mounted panel
// body (`gallery-browser` slot in layoutStore) but delegates all
// rendering to the marquee.
//
// `PresetDetail` also stays exported — the `preset-detail` panel slot
// still mounts it as a sidecar reader surface. `presetDetailStore`
// tracks the selected preset; GalleryMarquee currently loads presets
// directly into bladeStore without populating the detail store, so
// the `preset-detail` panel is mostly idle after OV3 unless some
// future surface repopulates it. Kept alive for backward compatibility.

import {
  CREATIVE_COMMUNITY_PRESETS,
  LEGENDS_PRESETS,
} from '@kyberstation/presets';
import type { Preset, Era, Affiliation } from '@kyberstation/presets';
import {
  affiliationColor,
  badgeColor,
  badgeTint,
} from '@/lib/factionStyles';
import { eraGlyph, factionGlyph } from '@/components/shared/StatusSignal';
import { FilenameReveal } from '@/hooks/useFilenameReveal';
import { GalleryMarquee } from './GalleryMarquee';

// ─── Helpers used by PresetDetail ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function getEraLabel(era: Era): string {
  switch (era) {
    case 'prequel': return 'Prequel';
    case 'original-trilogy': return 'OT';
    case 'sequel': return 'Sequel';
    case 'animated': return 'Animated';
    case 'expanded-universe': return 'EU';
    default: return era;
  }
}

function getEraCssClass(era: Era): string {
  switch (era) {
    case 'prequel': return 'era-prequel';
    case 'original-trilogy': return 'era-original';
    case 'sequel': return 'era-sequel';
    case 'animated': return 'era-animated';
    case 'expanded-universe': return 'era-eu';
    default: return 'text-text-muted';
  }
}

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable', unstable: 'Unstable', fire: 'Fire', pulse: 'Pulse',
  rotoscope: 'Rotoscope', gradient: 'Gradient', photon: 'Photon', plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter', aurora: 'Aurora', cinder: 'Cinder', prism: 'Prism',
};

// `isLegends` is no longer consumed inside this file (OV3 trim removed
// the Gallery filter UI that used it). Legends handling now lives in
// GalleryMarquee.tsx. Keeping the import symbol reference alive so
// TypeScript doesn't flag LEGENDS_PRESETS as unused.
void LEGENDS_PRESETS;

// ─── Exports ───

/**
 * Preset detail card — sidecar reader surface rendered in the
 * `preset-detail` panel slot when `presetDetailStore.detailPreset` is
 * set. Accepts a preset + onClose callback; displays name, era,
 * affiliation, color swatches, style / ignition / retraction metadata,
 * and an optional extended-parameters block for `tier: 'detailed'`
 * presets.
 */
export function PresetDetail({
  preset,
  onClose,
}: {
  preset: Preset;
  onClose: () => void;
}) {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const clashHex = rgbToHex(preset.config.clashColor.r, preset.config.clashColor.g, preset.config.clashColor.b);
  const lockupHex = rgbToHex(preset.config.lockupColor.r, preset.config.lockupColor.g, preset.config.lockupColor.b);
  const blastHex = rgbToHex(preset.config.blastColor.r, preset.config.blastColor.g, preset.config.blastColor.b);

  return (
    <div className="bg-bg-surface rounded-lg border border-border-subtle p-4 mt-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-cinematic text-ui-sm font-bold tracking-wider text-text-primary">
            <FilenameReveal
              key={preset.id}
              text={preset.name}
              className="inline-block"
              aria-label={preset.name}
            />
          </h3>
          <span className={`text-ui-sm font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getEraCssClass(preset.era)}`}>
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>
              {eraGlyph(preset.era)}
            </span>
            {getEraLabel(preset.era)}
          </span>
          <span
            className="text-ui-sm ml-2 inline-flex items-center gap-1"
            style={{ color: affiliationColor(preset.affiliation) }}
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>
              {factionGlyph(preset.affiliation)}
            </span>
            {preset.affiliation.toUpperCase()}
          </span>
          {preset.screenAccurate && (
            <span
              className="text-ui-xs ml-2 px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1"
              style={{
                color: badgeColor('screen-accurate'),
                background: badgeTint('screen-accurate', 0.25),
                borderColor: badgeTint('screen-accurate', 0.4),
              }}
            >
              <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x2713;</span>
              On-Screen
            </span>
          )}
          {CREATIVE_COMMUNITY_PRESETS.some((p: Preset) => p.id === preset.id) && (
            <span
              className="text-ui-xs ml-2 px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1"
              style={{
                color: badgeColor('creative'),
                background: badgeTint('creative', 0.25),
                borderColor: badgeTint('creative', 0.4),
              }}
            >
              <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x25B2;</span>
              Creative
            </span>
          )}
        </div>
        <button onClick={onClose} aria-label="Close preset detail panel" className="text-text-muted hover:text-text-primary text-ui-sm touch-target">
          x
        </button>
      </div>

      {preset.description && (
        <p className="text-ui-base text-text-secondary font-sw-body leading-relaxed mb-3">
          {preset.description}
        </p>
      )}

      {/* Color swatches */}
      <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Base', hex: hex },
          { label: 'Clash', hex: clashHex },
          { label: 'Lockup', hex: lockupHex },
          { label: 'Blast', hex: blastHex },
        ].map(({ label, hex: h }) => (
          <div key={label} className="text-center">
            <div
              className="w-full h-5 rounded border border-white/10 mb-0.5"
              style={{ backgroundColor: h }}
            />
            <span className="text-ui-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-2 text-ui-xs text-text-muted">
        <div>
          <span className="text-text-secondary font-medium">Style</span>
          <br />
          {STYLE_LABELS[preset.config.style] ?? preset.config.style}
        </div>
        <div>
          <span className="text-text-secondary font-medium">Ignition</span>
          <br />
          {preset.config.ignition} ({preset.config.ignitionMs}ms)
        </div>
        <div>
          <span className="text-text-secondary font-medium">Retraction</span>
          <br />
          {preset.config.retraction} ({preset.config.retractionMs}ms)
        </div>
      </div>

      {preset.hiltNotes && (
        <p className="text-ui-xs text-text-muted mt-2 italic">
          Hilt: {preset.hiltNotes}
        </p>
      )}

      {/* Detailed-tier extras */}
      {preset.tier === 'detailed' && (
        <div className="mt-2 pt-2 border-t border-border-subtle">
          <span className="text-ui-xs font-medium text-text-secondary">Extended Parameters</span>
          <div className="grid grid-cols-2 tablet:grid-cols-3 gap-x-3 gap-y-1 mt-1 text-ui-xs text-text-muted">
            {typeof preset.config.shimmer === 'number' && preset.config.shimmer > 0 && (
              <div><span className="text-text-secondary">Shimmer:</span> {preset.config.shimmer}</div>
            )}
            {typeof preset.config.swingFxIntensity === 'number' && (
              <div><span className="text-text-secondary">Swing FX:</span> {String(preset.config.swingFxIntensity)}</div>
            )}
            {typeof preset.config.noiseLevel === 'number' && (
              <div><span className="text-text-secondary">Noise:</span> {String(preset.config.noiseLevel)}</div>
            )}
            {(() => {
              const dc = preset.config.dragColor;
              if (dc && typeof dc === 'object' && 'r' in dc && 'g' in dc && 'b' in dc) {
                const c = dc as { r: number; g: number; b: number };
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-text-secondary">Drag:</span>
                    <div className="w-3 h-3 rounded-full border border-white/10" style={{
                      backgroundColor: rgbToHex(c.r, c.g, c.b),
                    }} />
                  </div>
                );
              }
              return null;
            })()}
            {typeof preset.config.swingColorShift === 'number' && (
              <div><span className="text-text-secondary">Color Shift:</span> {String(preset.config.swingColorShift)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Gallery body — mounted in the `gallery-browser` panel slot.
 * Since OV3 (2026-04-21) this is a thin wrapper around the
 * edge-to-edge `<GalleryMarquee>` shape.
 */
export function PresetGallery() {
  return <GalleryMarquee />;
}

// Keep a handful of unused-symbol imports so the public surface stays
// the same for any external module that imports from this file. These
// re-exports are intentional.
export type { Preset, Era, Affiliation };
