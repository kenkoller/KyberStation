'use client';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useUserPresetStore, type UserPreset } from '@/stores/userPresetStore';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { usePresetDetailStore } from '@/stores/presetDetailStore';
import type { BladeConfig } from '@kyberstation/engine';
import { downloadConfigAsFile, downloadCollection, readCollectionFile } from '@/lib/bladeConfigIO';
import { usePresetAnimation } from '@/hooks/usePresetAnimation';
import { playUISound } from '@/lib/uiSounds';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { PanelSkeleton } from '@/components/shared/Skeleton';
import { CommunityGallery } from './CommunityGallery';
import {
  ALL_PRESETS,
  PREQUEL_ERA_PRESETS,
  ORIGINAL_TRILOGY_PRESETS,
  SEQUEL_ERA_PRESETS,
  ANIMATED_SERIES_PRESETS,
  EXTENDED_UNIVERSE_PRESETS,
  LEGENDS_PRESETS,
  CREATIVE_COMMUNITY_PRESETS,
} from '@kyberstation/presets';
import type { Preset, Era, Affiliation } from '@kyberstation/presets';
import {
  affiliationColor,
  badgeColor,
  badgeTint,
} from '@/lib/factionStyles';
import { toast } from '@/lib/toastManager';
import { FactionBadge, eraGlyph, factionGlyph } from '@/components/shared/StatusSignal';

// ─── Constants ───

const ERA_FILTERS: Array<{ id: Era | 'all'; label: string; shortLabel: string; cssClass: string; count: number }> = [
  { id: 'all', label: 'All Eras', shortLabel: 'All', cssClass: 'text-text-primary', count: ALL_PRESETS.length },
  { id: 'prequel', label: 'Prequel Trilogy', shortLabel: 'PT', cssClass: 'era-prequel', count: PREQUEL_ERA_PRESETS.length },
  { id: 'original-trilogy', label: 'Original Trilogy', shortLabel: 'OT', cssClass: 'era-original', count: ORIGINAL_TRILOGY_PRESETS.length },
  { id: 'sequel', label: 'Sequel Trilogy', shortLabel: 'ST', cssClass: 'era-sequel', count: SEQUEL_ERA_PRESETS.length },
  { id: 'animated', label: 'Animated', shortLabel: 'CW', cssClass: 'era-animated', count: ANIMATED_SERIES_PRESETS.length },
  { id: 'expanded-universe', label: 'Expanded Universe', shortLabel: 'EU', cssClass: 'era-eu', count: EXTENDED_UNIVERSE_PRESETS.length },
];

const AFFILIATION_FILTERS: Array<{ id: Affiliation | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'jedi', label: 'Jedi', icon: '' },
  { id: 'sith', label: 'Sith', icon: '' },
  { id: 'neutral', label: 'Neutral', icon: '' },
];

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable', unstable: 'Unstable', fire: 'Fire', pulse: 'Pulse',
  rotoscope: 'Rotoscope', gradient: 'Gradient', photon: 'Photon', plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter', aurora: 'Aurora', cinder: 'Cinder', prism: 'Prism',
};

type SortMode = 'name' | 'era' | 'affiliation' | 'style';

// ─── Helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
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

function isLegends(preset: Preset): boolean {
  return LEGENDS_PRESETS.some((p) => p.id === preset.id);
}

// ─── Gallery Card ───

function GalleryCard({
  preset,
  isActive,
  onSelect,
}: {
  preset: Preset;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const isLegendsPreset = isLegends(preset);
  const { src: thumbnail, isAnimating, onMouseEnter, onMouseLeave } = usePresetAnimation(preset.config as BladeConfig);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`gallery-card w-full shrink-0 text-left rounded-lg overflow-hidden border transition-all ${
        isActive
          ? 'border-accent ring-1 ring-accent/30'
          : 'border-border-subtle hover:border-border-light'
      } bg-bg-card`}
    >
      {/* Full-width horizontal blade strip */}
      <div className="relative w-full overflow-hidden bg-[#0a0c14]" style={{ height: '40px' }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`${preset.name} blade preview`}
            className="w-full h-full object-fill"
          />
        ) : (
          /* Fallback: CSS horizontal gradient while thumbnail renders */
          <div className="absolute inset-0 flex items-center px-2">
            <div
              className="w-full rounded-full blade-shimmer"
              style={{
                height: '8px',
                background: `linear-gradient(to right, #ffffff 0%, ${hex} 10%, ${hex} 90%, ${hex}44 100%)`,
                boxShadow: `0 0 12px rgba(${r},${g},${b},0.5), 0 0 24px rgba(${r},${g},${b},0.25)`,
              }}
            />
          </div>
        )}

        {/* Era badge overlay — glyph + label for colorblind-safe signal */}
        <div className={`absolute top-1 left-1.5 text-ui-xs font-bold uppercase tracking-wider ${getEraCssClass(preset.era)} bg-black/60 backdrop-blur-sm px-1 rounded inline-flex items-center gap-1`}>
          <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>
            {eraGlyph(preset.era)}
          </span>
          {getEraLabel(preset.era)}
        </div>

        {/* Screen-accuracy / Creative badge — glyph pairs with tint */}
        {preset.screenAccurate ? (
          <div
            className="absolute bottom-1 left-1.5 text-ui-xs font-semibold uppercase tracking-wider px-1 rounded inline-flex items-center gap-1"
            style={{
              color: badgeColor('screen-accurate'),
              background: badgeTint('screen-accurate', 0.45),
            }}
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x2713;</span>
            On-Screen
          </div>
        ) : CREATIVE_COMMUNITY_PRESETS.some((p) => p.id === preset.id) ? (
          <div
            className="absolute bottom-1 left-1.5 text-ui-xs font-semibold uppercase tracking-wider px-1 rounded inline-flex items-center gap-1"
            style={{
              color: badgeColor('creative'),
              background: badgeTint('creative', 0.45),
            }}
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x25B2;</span>
            Creative
          </div>
        ) : null}

        {/* Legends badge — glyph ✧ pairs with amber tint */}
        {isLegendsPreset && (
          <div
            className="absolute top-1 right-1.5 text-ui-xs font-bold uppercase tracking-wider px-1 rounded inline-flex items-center gap-1"
            style={{
              color: badgeColor('legends'),
              background: badgeTint('legends', 0.45),
            }}
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>
              &#x2727;
            </span>
            Legends
          </div>
        )}

        {/* Play indicator (visible when paused) */}
        {!isAnimating && thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-black/30 opacity-40">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                <polygon points="1.5,0.5 7,4 1.5,7.5" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Compact info row */}
      <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-0">
        {/* Color swatch */}
        <div
          className="w-3 h-3 rounded-full shrink-0 border border-white/10"
          style={{ backgroundColor: hex }}
        />
        {/* Name */}
        <span
          className={`font-cinematic text-ui-sm font-bold tracking-wide truncate ${
            isActive ? 'text-accent' : 'text-text-primary'
          }`}
        >
          {preset.name}
        </span>
        {/* Style */}
        <span className="text-ui-xs text-text-muted ml-auto shrink-0">
          {STYLE_LABELS[preset.config.style] ?? preset.config.style}
        </span>
        {/* Add to preset list */}
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            usePresetListStore.getState().addEntry({
              presetName: preset.name,
              fontName: preset.character.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              config: preset.config as BladeConfig,
              sourcePresetId: preset.id,
            });
          }}
          className="text-ui-xs px-1 py-0.5 rounded border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border/40 transition-colors shrink-0 touch-target"
          title="Add to preset list"
          aria-label={`Add ${preset.name} to preset list`}
        >
          + List
        </span>
        {/* Affiliation glyph — monogram pairs with color for colorblind-safe ID */}
        <FactionBadge
          faction={preset.affiliation}
          size="sm"
          className="shrink-0"
          label={`${preset.affiliation} affiliation`}
        />
      </div>
      {/* Identity subtitle — character + tier for VCV-style browsable attribution */}
      <div
        className="flex items-center gap-1.5 px-2.5 pb-1.5 text-ui-xs text-text-muted font-mono truncate"
        aria-hidden="true"
      >
        <span className="truncate">{preset.character}</span>
        <span className="opacity-40 shrink-0">·</span>
        <span className="uppercase tracking-wider shrink-0 opacity-70">
          {preset.tier}
        </span>
      </div>
    </button>
  );
}

// ─── Detail Panel ───

export function PresetDetail({ preset, onClose }: { preset: Preset; onClose: () => void }) {
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
            {preset.name}
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
            {/* Decorative glyph — adjacent UPPERCASE text already conveys meaning to AT */}
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
          {CREATIVE_COMMUNITY_PRESETS.some((p) => p.id === preset.id) && (
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

// ─── Save Preset Modal ───

type GalleryTab = 'gallery' | 'my-presets' | 'community';
type MyPresetSort = 'newest' | 'alphabetical' | 'modified';

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function SavePresetModal({ onClose }: { onClose: () => void }) {
  // Modal a11y: ESC-to-close, Tab focus trap, initial + restore focus.
  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: true,
    onClose,
  });
  const config = useBladeStore((s) => s.config);
  const fontName = useAudioFontStore((s) => s.fontName);
  const savePreset = useUserPresetStore((s) => s.savePreset);
  const presets = useUserPresetStore((s) => s.presets);

  const [name, setName] = useState(config.name ?? 'My Custom Preset');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fontAssociation, setFontAssociation] = useState(fontName ?? '');

  const existingPreset = presets.find((p) => p.name === name);

  const handleSave = (overwrite: boolean) => {
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (overwrite && existingPreset) {
      useUserPresetStore.getState().updatePreset(existingPreset.id, {
        config: { ...config },
        description: description || undefined,
        tags,
        fontAssociation: fontAssociation || undefined,
      });
    } else {
      savePreset(name, config, {
        description: description || undefined,
        tags,
        fontAssociation: fontAssociation || undefined,
      });
    }
    onClose();
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-gallery-save-modal-title"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 id="preset-gallery-save-modal-title" className="text-ui-base font-semibold text-text-primary flex items-center gap-1">Save As Preset <HelpTooltip text="Save the current blade style, colors, and all parameters as a reusable preset in your personal collection." /></h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors" aria-label="Close">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label htmlFor="save-preset-name" className="text-ui-xs text-text-muted block mb-1">Name</label>
            <input id="save-preset-name" data-autofocus type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary focus:outline-none focus:border-accent" />
            {existingPreset && <p className="text-ui-xs text-yellow-400 mt-0.5">A preset with this name exists.</p>}
          </div>
          <div>
            <label htmlFor="save-preset-desc" className="text-ui-xs text-text-muted block mb-1">Description (optional)</label>
            <textarea id="save-preset-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary focus:outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label htmlFor="save-preset-tags" className="text-ui-xs text-text-muted block mb-1">Tags (comma-separated)</label>
            <input id="save-preset-tags" type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="dark side, dueling, favorite" className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label htmlFor="save-preset-font" className="text-ui-xs text-text-muted block mb-1">Font Association</label>
            <input id="save-preset-font" type="text" value={fontAssociation} onChange={(e) => setFontAssociation(e.target.value)} placeholder="e.g. KSith_Vader" className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent" />
            {fontName && fontAssociation !== fontName && (
              <button onClick={() => setFontAssociation(fontName)} className="text-ui-xs text-accent mt-0.5 hover:underline">Use loaded font: {fontName}</button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            {existingPreset ? (
              <>
                <button onClick={() => handleSave(true)} disabled={!name.trim()} className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-yellow-900/30 border border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/50 transition-colors disabled:opacity-40">Update Existing</button>
                <button onClick={() => handleSave(false)} disabled={!name.trim()} className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">Save as New</button>
              </>
            ) : (
              <button onClick={() => handleSave(false)} disabled={!name.trim()} className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">Save Preset</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Preset Card ───

function UserPresetCard({
  preset,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onExport,
  fontInLibrary,
}: {
  preset: UserPreset;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  fontInLibrary: boolean | null; // null = no library set
}) {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`gallery-card w-full shrink-0 text-left rounded-lg overflow-hidden border transition-all relative ${isActive ? 'border-accent ring-1 ring-accent/30' : 'border-border-subtle hover:border-border-light'} bg-bg-card`}>
      <button onClick={onSelect} className="block w-full text-left">
        {/* Blade strip */}
        <div className="relative w-full overflow-hidden bg-[#0a0c14]" style={{ height: '40px' }}>
          {preset.thumbnail ? (
            <img src={preset.thumbnail} alt={`${preset.name} blade preview`} className="w-full h-full object-fill" />
          ) : (
            <div className="absolute inset-0 flex items-center px-2">
              <div className="w-full rounded-full" style={{ height: '8px', background: `linear-gradient(to right, #ffffff 0%, ${hex} 10%, ${hex} 90%, ${hex}44 100%)`, boxShadow: `0 0 12px rgba(${r},${g},${b},0.5)` }} />
            </div>
          )}
          <div className="absolute top-1 left-1.5 text-ui-xs font-bold uppercase tracking-wider text-accent/80 bg-black/40 px-1 rounded inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x25C9;</span>
            Custom
          </div>
        </div>
        {/* Info row */}
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="w-3 h-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: hex }} />
          <span className={`font-cinematic text-ui-sm font-bold tracking-wide truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>{preset.name}</span>
          <span className="text-ui-xs text-text-muted ml-auto shrink-0">{STYLE_LABELS[preset.config.style] ?? preset.config.style}</span>
          {preset.fontAssociation && (
            <span className={`text-ui-xs shrink-0 truncate max-w-[80px] flex items-center gap-0.5 ${fontInLibrary === false ? 'text-yellow-400/70' : 'text-text-muted/60'}`} title={fontInLibrary === false ? `Font "${preset.fontAssociation}" not found in library` : preset.fontAssociation}>
              {fontInLibrary === false && <span aria-label="Font not found">!</span>}
              {preset.fontAssociation}
            </span>
          )}
          <span className="text-ui-xs text-text-muted/40 shrink-0">{formatRelativeDate(preset.createdAt)}</span>
        </div>
        {preset.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 px-2.5 pb-1.5">
            {preset.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-ui-xs px-1 py-px rounded bg-bg-deep text-text-muted border border-border-subtle">{tag}</span>
            ))}
          </div>
        )}
      </button>
      {/* Overflow menu */}
      <div className="absolute top-1 right-1">
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="w-6 h-6 flex items-center justify-center rounded text-text-muted/60 hover:text-text-primary hover:bg-black/40 transition-colors text-ui-sm" aria-label={`Actions for ${preset.name}`}>&hellip;</button>
        {showMenu && (
          <div className="absolute right-0 top-7 w-32 bg-bg-secondary border border-border-light rounded shadow-lg z-20 py-1">
            <button onClick={() => { onSelect(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Load</button>
            <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Duplicate</button>
            <button onClick={() => { onExport(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Export</button>
            <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-red-400 hover:bg-bg-surface">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Gallery Component ───

interface PresetGalleryProps {
  /** Open a specific internal tab on mount. Defaults to 'gallery'. */
  initialTab?: GalleryTab;
}

export function PresetGallery({ initialTab = 'gallery' }: PresetGalleryProps) {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const config = useBladeStore((s) => s.config);

  const [activeTab, setActiveTab] = useState<GalleryTab>(initialTab);
  const [selectedEra, setSelectedEra] = useState<Era | 'all'>('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState<Affiliation | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegends, setShowLegends] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<'all' | 'on-screen' | 'creative'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const detailPreset = usePresetDetailStore((s) => s.detailPreset);
  const setDetailPreset = usePresetDetailStore((s) => s.setDetailPreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // My Presets
  const userPresets = useUserPresetStore((s) => s.presets);
  const isLoadingPresets = useUserPresetStore((s) => s.isLoading);
  const hydrate = useUserPresetStore((s) => s.hydrate);
  const deletePreset = useUserPresetStore((s) => s.deletePreset);
  const duplicatePreset = useUserPresetStore((s) => s.duplicatePreset);
  const libraryFonts = useAudioFontStore((s) => s.libraryFonts);
  const libraryHandle = useAudioFontStore((s) => s.libraryHandle);
  const [mySearch, setMySearch] = useState('');
  const [mySort, setMySort] = useState<MyPresetSort>('newest');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const collectionImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  // Check if a font name exists in the library
  const libraryFontNames = useMemo(
    () => new Set(libraryFonts.map((f) => f.name)),
    [libraryFonts],
  );

  // Load user preset + auto-load associated font from library
  const handleLoadUserPreset = useCallback(async (preset: UserPreset) => {
    playUISound('preset-loaded');
    loadPreset(preset.config);
    // Auto-load font if associated and available in library
    if (preset.fontAssociation && libraryHandle && libraryFontNames.has(preset.fontAssociation)) {
      const currentFont = useAudioFontStore.getState().fontName;
      if (currentFont !== preset.fontAssociation) {
        try {
          const { loadFontFromDirectoryHandle, parseFileList, decodeFilesByCategory } = await import('@kyberstation/sound');
          const files = await loadFontFromDirectoryHandle(libraryHandle, preset.fontAssociation);
          if (files.length > 0) {
            // Use the same loadFont path from audioEngine
            const { setFont, setIsLoading, setLoadProgress } = useAudioFontStore.getState();
            setIsLoading(true);
            setLoadProgress(0);
            const manifest = parseFileList(files);
            const ctx = new AudioContext();
            const { buffers, warnings } = await decodeFilesByCategory(files, manifest, ctx, (loaded, total) => {
              setLoadProgress(loaded / total);
            });
            setFont(preset.fontAssociation, manifest, buffers, [...manifest.warnings, ...warnings]);
          }
        } catch (err) {
          // Surface silently-failed font auto-load so the user understands
          // why their preset loaded without its associated font. Toast is
          // the right surface here — the preset itself loaded fine.
          const msg = err instanceof Error ? err.message : 'Unknown error';
          toast.warning(`Couldn't auto-load font "${preset.fontAssociation}": ${msg}`);
        }
      }
    }
  }, [loadPreset, libraryHandle, libraryFontNames]);

  const handleCollectionImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const presets = await readCollectionFile(file);
      if (presets.length > 0) {
        useUserPresetStore.getState().importPresets(presets);
        toast.success(`Imported ${presets.length} preset(s) from ${file.name}`);
      } else {
        toast.warning(`No valid presets found in ${file.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid collection file';
      toast.error(`Import failed: ${msg}`);
    }
    e.target.value = '';
  }, []);

  const handleCollectionExport = useCallback(() => {
    const presets = useUserPresetStore.getState().presets;
    if (presets.length === 0) return;
    downloadCollection(presets);
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    userPresets.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [userPresets]);

  const filteredUserPresets = useMemo(() => {
    let result = userPresets;
    if (mySearch.trim()) {
      const q = mySearch.toLowerCase().trim();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tagFilter) result = result.filter((p) => p.tags.includes(tagFilter));
    if (mySort === 'alphabetical') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (mySort === 'modified') result = [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }, [userPresets, mySearch, mySort, tagFilter]);

  const filteredPresets = useMemo(() => {
    let presets = showLegends
      ? ALL_PRESETS
      : ALL_PRESETS.filter((p) => !isLegends(p));

    if (selectedEra !== 'all') {
      presets = presets.filter((p) => p.era === selectedEra);
    }
    if (selectedAffiliation !== 'all') {
      presets = presets.filter((p) => p.affiliation === selectedAffiliation);
    }
    if (selectedOrigin !== 'all') {
      if (selectedOrigin === 'on-screen') {
        presets = presets.filter((p) => p.screenAccurate === true);
      } else {
        presets = presets.filter((p) => !p.screenAccurate);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      presets = presets.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.character.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }

    // Sort
    presets = [...presets];
    switch (sortMode) {
      case 'name':
        presets.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'era':
        presets.sort((a, b) => a.era.localeCompare(b.era) || a.name.localeCompare(b.name));
        break;
      case 'affiliation':
        presets.sort((a, b) => a.affiliation.localeCompare(b.affiliation) || a.name.localeCompare(b.name));
        break;
      case 'style':
        presets.sort((a, b) => {
          const { h: hA } = rgbToHsl(a.config.baseColor.r, a.config.baseColor.g, a.config.baseColor.b);
          const { h: hB } = rgbToHsl(b.config.baseColor.r, b.config.baseColor.g, b.config.baseColor.b);
          return hA - hB;
        });
        break;
    }

    return presets;
  }, [selectedEra, selectedAffiliation, selectedOrigin, searchQuery, showLegends, sortMode]);

  const handleSelect = useCallback(
    (preset: Preset) => {
      playUISound('preset-loaded');
      loadPreset(preset.config as BladeConfig);
      setDetailPreset(preset);
    },
    [loadPreset],
  );

  return (
    <div>
      {/* Tab bar + Save */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => { playUISound('tab-switch'); setActiveTab('gallery'); }}
          className={`px-3 py-1 rounded text-ui-sm font-semibold transition-colors border ${
            activeTab === 'gallery'
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          Gallery ({filteredPresets.length})
        </button>
        <button
          onClick={() => { playUISound('tab-switch'); setActiveTab('my-presets'); }}
          className={`px-3 py-1 rounded text-ui-sm font-semibold transition-colors border ${
            activeTab === 'my-presets'
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          My Presets ({userPresets.length})
        </button>
        <button
          onClick={() => { playUISound('tab-switch'); setActiveTab('community'); }}
          className={`px-3 py-1 rounded text-ui-sm font-semibold transition-colors border ${
            activeTab === 'community'
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          Community
        </button>
        <HelpTooltip text="Your saved presets, community shared styles, and the full character preset gallery." />
        <button
          onClick={() => setShowSaveModal(true)}
          className="ml-auto px-2.5 py-1 rounded text-ui-xs font-medium transition-colors border
            bg-accent-dim border-accent-border text-accent hover:bg-accent/20"
        >
          Save Current
        </button>
      </div>

      {showSaveModal && <SavePresetModal onClose={() => setShowSaveModal(false)} />}

      {/* ─── My Presets Tab ─── */}
      {activeTab === 'my-presets' && (
        <div>
          <input
            type="text"
            value={mySearch}
            onChange={(e) => setMySearch(e.target.value)}
            placeholder="Search my presets..."
            aria-label="Search my presets"
            className="w-full mb-2 px-3 py-1.5 rounded text-ui-xs bg-bg-primary border border-border-subtle
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-sw-body touch-target"
          />
          <div className="flex flex-wrap items-center gap-1 mb-2">
            {(['newest', 'alphabetical', 'modified'] as MyPresetSort[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMySort(mode)}
                className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border ${
                  mySort === mode ? 'bg-accent-dim border-accent-border text-accent' : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
              >
                {mode === 'newest' ? 'Newest' : mode === 'alphabetical' ? 'A-Z' : 'Modified'}
              </button>
            ))}
            <span className="flex-1" />
            <button
              onClick={handleCollectionExport}
              disabled={userPresets.length === 0}
              className="px-2 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              Export All
            </button>
            <button
              onClick={() => collectionImportRef.current?.click()}
              className="px-2 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-secondary transition-colors"
            >
              Import
            </button>
            <HelpTooltip text="Export all presets as a .kyberstation-collection.json file, or import a collection to merge into your library." />
            <input ref={collectionImportRef} type="file" accept=".json" onChange={handleCollectionImport} className="hidden" />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <button onClick={() => setTagFilter(null)} className={`px-2 py-0.5 rounded text-ui-xs transition-colors border ${tagFilter === null ? 'bg-accent-dim border-accent-border text-accent' : 'bg-bg-primary border-border-subtle text-text-muted'}`}>All</button>
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} className={`px-2 py-0.5 rounded text-ui-xs transition-colors border ${tagFilter === tag ? 'bg-accent-dim border-accent-border text-accent' : 'bg-bg-primary border-border-subtle text-text-muted'}`}>{tag}</button>
              ))}
            </div>
          )}
          {isLoadingPresets ? (
            <PanelSkeleton title="My Presets" />
          ) : filteredUserPresets.length === 0 ? (
            <div className="text-ui-sm text-text-muted text-center py-8 border border-dashed border-border-subtle rounded">
              {userPresets.length === 0 ? 'No saved presets yet. Customize a style and click "Save Current".' : 'No presets match your search.'}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredUserPresets.map((preset) => (
                <UserPresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={config.name === preset.name}
                  onSelect={() => handleLoadUserPreset(preset)}
                  onDelete={() => deletePreset(preset.id)}
                  onDuplicate={() => duplicatePreset(preset.id, `${preset.name} (Copy)`)}
                  onExport={() => downloadConfigAsFile(preset.config)}
                  fontInLibrary={
                    !preset.fontAssociation
                      ? null
                      : !libraryHandle
                        ? null
                        : libraryFontNames.has(preset.fontAssociation)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Community Tab ─── */}
      {activeTab === 'community' && <CommunityGallery />}

      {/* ─── Gallery Tab ─── */}
      {activeTab === 'gallery' && (
        <div>
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search characters, styles..."
        aria-label="Search presets"
        className="w-full mb-2 px-3 py-1.5 rounded text-ui-xs bg-bg-primary border border-border-subtle
          text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-sw-body touch-target"
      />

      {/* Era filters — each era carries its monogram glyph alongside the label */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {ERA_FILTERS.map((era) => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border touch-target inline-flex items-center gap-1 ${
              selectedEra === era.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {era.id !== 'all' && (
              <span
                aria-hidden="true"
                className={era.cssClass}
                style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}
              >
                {eraGlyph(era.id)}
              </span>
            )}
            <span className="desktop:hidden">{era.shortLabel}</span>
            <span className="hidden desktop:inline">{era.label}</span>
            <span className="ml-1 opacity-50">{era.count}</span>
          </button>
        ))}
      </div>

      {/* Affiliation + Sort + Legends — each side carries its glyph monogram */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {AFFILIATION_FILTERS.map((aff) => (
          <button
            key={aff.id}
            onClick={() => setSelectedAffiliation(aff.id)}
            className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border touch-target inline-flex items-center gap-1 ${
              selectedAffiliation === aff.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {aff.id !== 'all' && (
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
                  color: affiliationColor(aff.id),
                }}
              >
                {factionGlyph(aff.id)}
              </span>
            )}
            {aff.label}
          </button>
        ))}

        {/* Origin filter */}
        <span className="text-text-muted/40 px-0.5">|</span>
        {(['all', 'on-screen', 'creative'] as const).map((origin) => {
          const isActive = selectedOrigin === origin;
          const activeStyle: React.CSSProperties | undefined = isActive
            ? origin === 'on-screen'
              ? {
                  color: badgeColor('screen-accurate'),
                  background: badgeTint('screen-accurate', 0.25),
                  borderColor: badgeTint('screen-accurate', 0.4),
                }
              : origin === 'creative'
                ? {
                    color: badgeColor('creative'),
                    background: badgeTint('creative', 0.25),
                    borderColor: badgeTint('creative', 0.4),
                  }
                : undefined
            : undefined;
          return (
            <button
              key={origin}
              onClick={() => setSelectedOrigin(origin)}
              className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border touch-target ${
                isActive && origin === 'all'
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : !isActive
                    ? 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
                    : ''
              }`}
              style={activeStyle}
            >
              {origin === 'all' ? (
                'All'
              ) : origin === 'on-screen' ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x2713;</span>
                  On-Screen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x25B2;</span>
                  Creative
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex gap-1">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort presets by"
            className="px-1.5 py-0.5 rounded text-ui-xs bg-bg-primary border border-border-subtle text-text-muted touch-target"
          >
            <option value="name">A-Z</option>
            <option value="era">Era</option>
            <option value="affiliation">Side</option>
            <option value="style">Color</option>
          </select>
          <button
            onClick={() => setShowLegends(!showLegends)}
            className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border touch-target inline-flex items-center gap-1 ${
              showLegends
                ? ''
                : 'bg-bg-primary border-border-subtle text-text-muted'
            }`}
            style={
              showLegends
                ? {
                    color: badgeColor('legends'),
                    background: badgeTint('legends', 0.25),
                    borderColor: badgeTint('legends', 0.4),
                  }
                : undefined
            }
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace" }}>&#x2727;</span>
            Legends
          </button>
        </div>
      </div>

      {/* Gallery List — full-width blade strips */}
      <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => (
          <GalleryCard
            key={preset.id}
            preset={preset}
            isActive={config.name === preset.config.name}
            onSelect={() => handleSelect(preset)}
          />
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-ui-xs text-text-muted font-sw-body">No presets match your filters.</p>
        </div>
      )}

      {/* Detail panel for selected preset */}
      {detailPreset && (
        <PresetDetail
          preset={detailPreset}
          onClose={() => setDetailPreset(null)}
        />
      )}
        </div>
      )}
    </div>
  );
}
