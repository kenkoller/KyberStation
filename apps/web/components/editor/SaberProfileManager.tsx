'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import type { SaberProfile, CardPresetEntry } from '@/stores/saberProfileStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { estimateTotal, formatBytes, CARD_SIZES, BladeEngine } from '@kyberstation/engine';
import type { BladeConfig, RGB } from '@kyberstation/engine';
import { CARD_TEMPLATES } from '@kyberstation/presets';
import type { CardTemplate } from '@kyberstation/presets';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { downloadCardTemplate, readCardTemplateFile } from '@/lib/bladeConfigIO';
import { playUISound } from '@/lib/uiSounds';
import { toast } from '@/lib/toastManager';
import { useModalDialog } from '@/hooks/useModalDialog';

// ─── Helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function sanitizeFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 32) || 'font';
}

/**
 * Derive the "representative" config for a saber profile — the active card
 * config's first entry, falling back to the current editor config if none.
 */
function getRepresentativeConfig(profile: SaberProfile, fallback: BladeConfig): BladeConfig {
  const activeConfig = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
  if (activeConfig && activeConfig.entries.length > 0) return activeConfig.entries[0].config;
  return fallback;
}

// ─── Mini-Blade Hero (co-located) ───

/**
 * Compact live blade preview driven by a specific BladeConfig. Mirrors the
 * shape of <LandingBladeHero> but sized ~100×300 and colour-locked to the
 * passed config rather than rotating through presets. Used in the
 * SaberProfileManager character-sheet hero.
 */
const MINI_CANVAS_W = 36;
const MINI_CANVAS_H = 540;

function ProfileHeroBlade({ config }: { config: BladeConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef<BladeConfig>(config);
  configRef.current = config;

  // Re-ignite when base colour changes so the halo matches the new saber
  const colorKey = `${config.baseColor.r},${config.baseColor.g},${config.baseColor.b}`;

  useEffect(() => {
    const engine = new BladeEngine();
    engine.ignite(configRef.current);

    // Warm up to steady-state before first paint
    const FRAME_DT = 16;
    const warmupFrames = Math.ceil((configRef.current.ignitionMs ?? 300) / FRAME_DT) + 8;
    for (let i = 0; i < warmupFrames; i++) {
      engine.update(FRAME_DT, configRef.current);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !ctx) return;

    let cancelled = false;
    let lastTime = performance.now();

    const drawPixels = () => {
      const c = canvasRef.current;
      if (!c) return;
      const cx = c.getContext('2d');
      if (!cx) return;
      const pixels = engine.getPixels();
      const count = pixels.length / 3;
      cx.clearRect(0, 0, MINI_CANVAS_W, MINI_CANVAS_H);
      const sliceH = MINI_CANVAS_H / count;
      for (let i = 0; i < count; i++) {
        const off = i * 3;
        const r = pixels[off], g = pixels[off + 1], b = pixels[off + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < 8) continue;
        cx.fillStyle = `rgb(${r},${g},${b})`;
        cx.fillRect(0, MINI_CANVAS_H - (i + 1) * sliceH, MINI_CANVAS_W, sliceH + 0.5);
      }
    };

    drawPixels();

    const tick = (time: number) => {
      if (cancelled) return;
      const dt = Math.min(48, time - lastTime);
      lastTime = time;
      engine.update(dt, configRef.current);
      drawPixels();
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
    // Rebuild engine when colour changes so ignition matches
  }, [colorKey]);

  const accentCss = `rgb(${config.baseColor.r | 0},${config.baseColor.g | 0},${config.baseColor.b | 0})`;

  return (
    <div className="relative shrink-0" aria-hidden="true" style={{ width: 96, height: 300 }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 50% 75% at center, ${accentCss} 0%, transparent 70%)`,
          opacity: 0.3,
          filter: 'blur(24px)',
        }}
      />
      <canvas
        ref={canvasRef}
        width={MINI_CANVAS_W}
        height={MINI_CANVAS_H}
        className="relative block mx-auto rounded-full"
        style={{
          width: 4,
          height: 300,
          filter: `drop-shadow(0 0 6px ${accentCss}) drop-shadow(0 0 16px ${accentCss})`,
        }}
      />
    </div>
  );
}

// ─── Flat Section Header (Linear / LayerStack register) ───

function SectionHeader({ label, help }: { label: string; help?: string }) {
  return (
    <h4 className="text-ui-xs text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1 section-header">
      {label}
      {help && <HelpTooltip text={help} />}
    </h4>
  );
}

// ─── Labelled Data Row (chrome=Inter label, value=JBM) ───

function DataRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border-subtle/40 last:border-b-0">
      <span className="text-ui-xs text-text-muted shrink-0">{label}</span>
      <span className={`text-ui-xs text-text-primary text-right truncate ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Profile Tab Strip (compact switcher) ───

function ProfileTabStrip({
  profiles,
  activeProfileId,
  onSwitch,
}: {
  profiles: SaberProfile[];
  activeProfileId: string | null;
  onSwitch: (id: string) => void;
}) {
  if (profiles.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Saber profiles">
      {profiles.map((p) => {
        const isActive = p.id === activeProfileId;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSwitch(p.id)}
            className={`px-2 py-1 rounded text-ui-xs font-medium border transition-colors ${
              isActive
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'border-border-subtle text-text-muted hover:text-text-primary'
            }`}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Character-Sheet Hero ───

function ProfileHero({
  profile,
  representativeConfig,
}: {
  profile: SaberProfile;
  representativeConfig: BladeConfig;
}) {
  // Use the profile name as-is; the JBM Bold ceremonial scale lives in the class
  return (
    <div className="flex items-stretch gap-4 py-4">
      {/* Mini live blade preview (left) */}
      <ProfileHeroBlade config={representativeConfig} />

      {/* Profile identity block (right) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          className="font-mono font-bold text-text-primary leading-tight tracking-tight break-words"
          style={{ fontSize: 'clamp(32px, 6.5vw, 64px)', letterSpacing: '-0.02em' }}
          title={profile.name}
        >
          {profile.name}
        </div>
        {profile.chassisType && (
          <div className="text-ui-sm text-text-secondary font-mono mt-1 truncate">
            {profile.chassisType}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2 text-ui-xs text-text-muted font-mono tabular-nums flex-wrap">
          <span>{profile.boardType}</span>
          <span aria-hidden="true">·</span>
          <span>{profile.cardSize}</span>
          <span aria-hidden="true">·</span>
          <span>
            {(() => {
              const cc = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
              const count = cc?.entries.length ?? 0;
              return `${count} preset${count !== 1 ? 's' : ''}`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Character-Sheet Category Blocks ───

function BladeSpecsBlock({ profile, config }: { profile: SaberProfile; config: BladeConfig }) {
  const stripType = (config as BladeConfig & { stripType?: string }).stripType ?? 'single';
  return (
    <section className="space-y-1">
      <SectionHeader label="Blade Specs" help="Hardware topology and timing for the blade itself: LED count, strip type, ignition and retraction durations, and base shimmer amount." />
      <div>
        <DataRow label="LED Count" value={config.ledCount} />
        <DataRow label="Strip" value={stripType} mono={false} />
        <DataRow label="Ignition" value={`${config.ignition} · ${config.ignitionMs}ms`} />
        <DataRow label="Retraction" value={`${config.retraction} · ${config.retractionMs}ms`} />
        <DataRow label="Shimmer" value={(config.shimmer * 100).toFixed(0) + '%'} />
        <DataRow label="Board" value={profile.boardType} mono={false} />
      </div>
    </section>
  );
}

function ButtonMapBlock({ profile }: { profile: SaberProfile }) {
  // Button map isn't in the profile model today — show a hint instead of faking data
  return (
    <section className="space-y-1">
      <SectionHeader label="Button Map" help="Prop-file button action mapping. Configure via the Proffie prop file reference." />
      <div className="text-ui-xs text-text-muted italic py-2">
        Button mapping lives in the prop-file reference panel.
        {profile.boardType.includes('Proffie') ? ' Default: saber_fett263_buttons.h.' : ''}
      </div>
    </section>
  );
}

function EquippedStyleBlock({ config }: { config: BladeConfig }) {
  const swatch = (label: string, c: RGB | undefined) => {
    if (!c) return null;
    const hex = rgbToHex(c.r, c.g, c.b);
    return (
      <div className="flex items-center gap-2 py-1">
        <span
          className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        <span className="text-ui-xs text-text-muted w-14 shrink-0">{label}</span>
        <span className="text-ui-xs text-text-primary font-mono tabular-nums">{hex.toUpperCase()}</span>
      </div>
    );
  };
  return (
    <section className="space-y-1">
      <SectionHeader label="Equipped Style" help="The style and colour palette bound to this profile's active preset." />
      <div>
        <DataRow label="Style" value={config.style} mono={false} />
        {config.name && <DataRow label="Preset" value={config.name} mono={false} />}
        <div className="mt-2 space-y-0">
          {swatch('Base', config.baseColor)}
          {swatch('Clash', config.clashColor)}
          {swatch('Lockup', config.lockupColor)}
          {swatch('Blast', config.blastColor)}
        </div>
      </div>
    </section>
  );
}

function EquippedFontBlock({ profile }: { profile: SaberProfile }) {
  const fontName = useAudioFontStore((s) => s.fontName);
  const activeConfig = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
  const firstPresetFont = activeConfig?.entries[0]?.fontName;
  return (
    <section className="space-y-1">
      <SectionHeader label="Equipped Sound Font" help="The sound font directory loaded for preview. Individual presets can override this via the Card Preset composer." />
      <div>
        <DataRow label="Loaded" value={fontName ?? <span className="text-text-muted italic">none</span>} />
        <DataRow label="First Preset" value={firstPresetFont ?? <span className="text-text-muted italic">n/a</span>} />
        <DataRow
          label="Mapped"
          value={`${Object.keys(profile.fontAssignments).length} font${Object.keys(profile.fontAssignments).length !== 1 ? 's' : ''}`}
        />
      </div>
    </section>
  );
}

function SmoothSwingBlock({ config }: { config: BladeConfig }) {
  const c = config as BladeConfig & {
    swingSharpness?: number;
    swingThreshold?: number;
    accentSwingSpeed?: number;
    version?: string;
  };
  return (
    <section className="space-y-1">
      <SectionHeader label="SmoothSwing" help="SmoothSwing V1/V2 crossfade parameters. Configure via the SmoothSwing panel." />
      <div>
        <DataRow label="Version" value={c.version ?? 'V2'} />
        <DataRow label="Sharpness" value={c.swingSharpness ?? <span className="text-text-muted italic">default</span>} />
        <DataRow label="Threshold" value={c.swingThreshold ?? <span className="text-text-muted italic">default</span>} />
        <DataRow label="Accent Speed" value={c.accentSwingSpeed ?? <span className="text-text-muted italic">default</span>} />
      </div>
    </section>
  );
}

// ─── Character Sheet Actions ───

function CharacterSheetActions({
  profile,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: {
  profile: SaberProfile;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={onEdit}
        className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
        aria-label={`Edit ${profile.name}`}
      >
        Edit Notes
      </button>
      <button
        onClick={onDuplicate}
        className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
        aria-label={`Duplicate ${profile.name}`}
      >
        Duplicate
      </button>
      <button
        onClick={onExport}
        className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
        aria-label={`Export ${profile.name}`}
      >
        Export
      </button>
      <button
        onClick={onDelete}
        className="px-2 py-1 rounded text-ui-xs border transition-colors"
        style={{
          borderColor: 'rgb(var(--border-subtle))',
          color: 'rgb(var(--status-error) / 0.7)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgb(var(--status-error))';
          e.currentTarget.style.borderColor = 'rgb(var(--status-error) / 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgb(var(--status-error) / 0.7)';
          e.currentTarget.style.borderColor = 'rgb(var(--border-subtle))';
        }}
        aria-label={`Delete ${profile.name}`}
      >
        Delete
      </button>
    </div>
  );
}

// ─── Storage Bar (inline for character sheet) ───

function ProfileStorageBar({ profile }: { profile: SaberProfile }) {
  const budget = useMemo(() => {
    const activeConfig = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
    const entries = activeConfig?.entries ?? profile.presetEntries;
    const fontNames = entries.map((e) => e.fontName);
    return estimateTotal({
      cardSize: profile.cardSize,
      fontNames: fontNames.length > 0 ? fontNames : ['Default'],
      presetCount: Math.max(entries.length, 1),
    });
  }, [profile]);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider">SD Card</span>
        <span className="text-ui-xs font-mono tabular-nums text-text-primary">
          {formatBytes(budget.totalBytes)} / {profile.cardSize}
        </span>
      </div>
      <div
        className="h-1.5 bg-bg-deep rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(budget.usagePercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`SD card usage for ${profile.name}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, budget.usagePercent)}%`,
            backgroundColor: budget.usagePercent >= 90 ? 'rgb(var(--status-error))' :
              budget.usagePercent >= 75 ? 'rgb(var(--status-warn))' : 'rgb(var(--status-ok))',
          }}
        />
      </div>
    </div>
  );
}

// ─── Card Config Quick-Switch ───

function CardConfigSwitcher({
  profile,
}: {
  profile: SaberProfile;
}) {
  const addCardConfig = useSaberProfileStore((s) => s.addCardConfig);
  const deleteCardConfig = useSaberProfileStore((s) => s.deleteCardConfig);
  const renameCardConfig = useSaberProfileStore((s) => s.renameCardConfig);
  const duplicateCardConfig = useSaberProfileStore((s) => s.duplicateCardConfig);
  const setActiveCardConfig = useSaberProfileStore((s) => s.setActiveCardConfig);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {profile.cardConfigs.map((cc) => (
        <div key={cc.id} className="flex items-center">
          {renamingId === cc.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => { renameCardConfig(profile.id, cc.id, renameValue || cc.name); setRenamingId(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenamingId(null); }}
              className="bg-bg-deep text-ui-xs text-text-primary px-2 py-0.5 rounded border border-accent-border w-24"
            />
          ) : (
            <button
              onClick={() => setActiveCardConfig(profile.id, cc.id)}
              onDoubleClick={() => { setRenamingId(cc.id); setRenameValue(cc.name); }}
              className={`px-2 py-0.5 rounded text-ui-xs font-medium transition-colors border ${
                cc.id === profile.activeCardConfigId
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              title={`${cc.entries.length} presets. Double-click to rename.`}
            >
              {cc.name} ({cc.entries.length})
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => addCardConfig(profile.id, `Config ${profile.cardConfigs.length + 1}`)}
        className="px-1.5 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
        title="New card config"
      >
        +
      </button>
      {profile.cardConfigs.length > 1 && profile.activeCardConfigId && (
        <>
          <button
            onClick={() => duplicateCardConfig(profile.id, profile.activeCardConfigId)}
            className="px-1.5 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-secondary transition-colors"
            title="Duplicate active config"
          >
            Dup
          </button>
          <button
            onClick={() => deleteCardConfig(profile.id, profile.activeCardConfigId)}
            className="px-1.5 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted transition-colors"
            style={{ ['--danger-color' as string]: 'rgb(var(--status-error))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgb(var(--status-error))';
              e.currentTarget.style.borderColor = 'rgb(var(--status-error) / 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '';
              e.currentTarget.style.borderColor = '';
            }}
            title="Delete active config"
          >
            Del
          </button>
        </>
      )}
    </div>
  );
}

// ─── Card Preset Entry Row ───

function CardEntryRow({
  entry,
  index,
  profileId,
  configId,
  totalCount,
}: {
  entry: CardPresetEntry;
  index: number;
  profileId: string;
  configId: string;
  totalCount: number;
}) {
  const removeCardEntry = useSaberProfileStore((s) => s.removeCardEntry);
  const updateCardEntry = useSaberProfileStore((s) => s.updateCardEntry);
  const reorderCardEntries = useSaberProfileStore((s) => s.reorderCardEntries);
  const [editingName, setEditingName] = useState(false);
  const [editingFont, setEditingFont] = useState(false);

  const hex = rgbToHex(entry.config.baseColor.r, entry.config.baseColor.g, entry.config.baseColor.b);

  const sourceBadge = entry.source.type === 'builtin' ? 'Built-in' :
    entry.source.type === 'custom' ? 'Custom' : 'Inline';

  return (
    <div
      tabIndex={0}
      role="option"
      aria-roledescription="draggable item"
      aria-label={`Preset ${index + 1}: ${entry.presetName}`}
      onKeyDown={(e) => {
        if (e.altKey && e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          reorderCardEntries(profileId, configId, index, index - 1);
        } else if (e.altKey && e.key === 'ArrowDown' && index < totalCount - 1) {
          e.preventDefault();
          reorderCardEntries(profileId, configId, index, index + 1);
        }
      }}
      className="group flex items-center gap-2 px-2 py-1.5 rounded border border-border-subtle hover:border-border-light transition-colors"
    >
      {/* Position */}
      <span className="text-ui-xs text-text-muted tabular-nums w-4 text-right shrink-0">{index + 1}.</span>

      {/* Color swatch */}
      <span className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: hex }} />

      {/* Name + Font */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            autoFocus
            defaultValue={entry.presetName}
            className="w-full bg-bg-deep text-ui-xs text-text-primary px-1 py-0.5 rounded border border-accent-border"
            onBlur={(e) => { updateCardEntry(profileId, configId, entry.id, { presetName: e.target.value || entry.presetName }); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingName(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-ui-xs text-text-primary truncate cursor-text" onDoubleClick={() => setEditingName(true)}>
            {entry.presetName}
          </div>
        )}
        {editingFont ? (
          <input
            autoFocus
            defaultValue={entry.fontName}
            className="w-full bg-bg-deep text-ui-xs text-text-muted font-mono px-1 py-0.5 rounded border border-border-subtle"
            onBlur={(e) => { updateCardEntry(profileId, configId, entry.id, { fontName: sanitizeFontName(e.target.value || entry.fontName) }); setEditingFont(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingFont(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-ui-xs text-text-muted font-mono truncate cursor-text" onDoubleClick={() => setEditingFont(true)}>
            {entry.fontName}/
          </div>
        )}
      </div>

      {/* Source badge — tokenised identity colours */}
      <span
        className="text-ui-xs shrink-0 px-1 py-px rounded border"
        style={
          entry.source.type === 'builtin'
            ? {
                color: 'rgb(var(--status-info) / 0.65)',
                borderColor: 'rgb(var(--status-info) / 0.3)',
              }
            : entry.source.type === 'custom'
              ? {
                  color: 'rgb(var(--accent) / 0.65)',
                  borderColor: 'rgb(var(--accent) / 0.3)',
                }
              : {
                  color: 'rgb(var(--text-muted))',
                  borderColor: 'rgb(var(--border-subtle))',
                }
        }
      >
        {sourceBadge}
      </span>

      {/* Style */}
      <span className="text-ui-xs text-text-muted shrink-0">{entry.config.style}</span>

      {/* Remove */}
      <button
        onClick={() => removeCardEntry(profileId, configId, entry.id)}
        className="text-text-muted text-ui-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ ['--hover-color' as string]: 'rgb(var(--status-error))' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--status-error))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
        aria-label={`Remove ${entry.presetName}`}
      >
        &times;
      </button>
    </div>
  );
}

// ─── Card Preset Composer ───

function CardPresetComposer({ profile }: { profile: SaberProfile }) {
  const addCardEntry = useSaberProfileStore((s) => s.addCardEntry);
  const config = useBladeStore((s) => s.config);
  const templateImportRef = useRef<HTMLInputElement>(null);

  const activeConfig = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
  if (!activeConfig) return null;

  const handleAddCurrent = () => {
    addCardEntry(profile.id, activeConfig.id, {
      presetName: config.name ?? 'Custom Style',
      fontName: sanitizeFontName(config.name ?? 'custom'),
      source: { type: 'inline' },
      config: { ...config },
    });
  };

  const handleLoadBuiltinTemplate = (template: CardTemplate) => {
    for (const entry of template.entries) {
      addCardEntry(profile.id, activeConfig.id, {
        presetName: entry.presetName,
        fontName: entry.fontName,
        source: entry.source,
        config: entry.config,
      });
    }
  };

  const handleExportTemplate = () => {
    downloadCardTemplate(activeConfig);
  };

  const handleImportTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { entries } = await readCardTemplateFile(file);
      for (const entry of entries) {
        addCardEntry(profile.id, activeConfig.id, {
          presetName: entry.presetName,
          fontName: entry.fontName,
          source: entry.source as CardPresetEntry['source'],
          config: entry.config,
        });
      }
      toast.success(`Loaded ${entries.length} preset(s) from template`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid template file';
      toast.error(`Template import failed: ${msg}`);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Quick-switch */}
      {profile.cardConfigs.length > 0 && (
        <CardConfigSwitcher profile={profile} />
      )}

      {/* Add actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={handleAddCurrent}
          className="text-ui-xs px-2 py-0.5 rounded border border-accent-border/40 text-accent bg-accent-dim/20 hover:bg-accent-dim/40 transition-colors"
        >
          + Add Current
        </button>
        <select
          value=""
          onChange={(e) => {
            const t = CARD_TEMPLATES.find((t) => t.id === e.target.value);
            if (t) handleLoadBuiltinTemplate(t);
          }}
          aria-label="Load starter template"
          className="text-ui-xs px-2 py-0.5 rounded border border-border-subtle bg-bg-deep text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <option value="" disabled>Starter Templates</option>
          {CARD_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.entries.length})</option>
          ))}
        </select>
        <span className="flex-1" />
        <button
          onClick={handleExportTemplate}
          disabled={activeConfig.entries.length === 0}
          className="text-ui-xs px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
        >
          Save Template
        </button>
        <button
          onClick={() => templateImportRef.current?.click()}
          className="text-ui-xs px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-secondary transition-colors"
        >
          Load Template
        </button>
        <input ref={templateImportRef} type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
        <span className="text-ui-xs text-text-muted w-full">
          {activeConfig.entries.length} preset{activeConfig.entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Entry list */}
      {activeConfig.entries.length === 0 ? (
        <div className="text-ui-xs text-text-muted text-center py-4 border border-dashed border-border-subtle rounded">
          No presets in this card config. Click &quot;+ Add Current&quot; to add from the editor.
        </div>
      ) : (
        <div className="space-y-1" role="listbox" aria-label="Card preset entries" aria-roledescription="reorderable list">
          {activeConfig.entries.map((entry, i) => (
            <CardEntryRow
              key={entry.id}
              entry={entry}
              index={i}
              profileId={profile.id}
              configId={activeConfig.id}
              totalCount={activeConfig.entries.length}
            />
          ))}
        </div>
      )}

      {activeConfig.entries.length > 0 && (
        <div className="text-ui-xs text-text-muted text-center">
          Alt+&uarr;/&darr; to reorder &bull; Double-click name or font to edit &bull; Order = saber preset order
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export function SaberProfileManager() {
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const switchProfile = useSaberProfileStore((s) => s.switchProfile);
  const createProfile = useSaberProfileStore((s) => s.createProfile);
  const duplicateProfile = useSaberProfileStore((s) => s.duplicateProfile);
  const deleteProfile = useSaberProfileStore((s) => s.deleteProfile);
  const updateProfile = useSaberProfileStore((s) => s.updateProfile);
  const exportProfile = useSaberProfileStore((s) => s.exportProfile);
  const importProfile = useSaberProfileStore((s) => s.importProfile);
  const copyPresetsToProfile = useSaberProfileStore((s) => s.copyPresetsToProfile);
  const fallbackConfig = useBladeStore((s) => s.config);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newChassis, setNewChassis] = useState('');
  const [newBoard, setNewBoard] = useState('Proffie V3');
  const [newCard, setNewCard] = useState('16GB');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [showCopyModal, setShowCopyModal] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [copyTarget, setCopyTarget] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProfile(newName.trim(), newChassis.trim(), newBoard, newCard);
    playUISound('success');
    setNewName('');
    setNewChassis('');
    setShowCreate(false);
  };

  const handleExport = (id: string) => {
    const json = exportProfile(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const profile = profiles.find((p) => p.id === id);
    a.href = url;
    a.download = `${profile?.name ?? 'saber-profile'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile import failed: file too large (max 5 MB)');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = importProfile(reader.result as string);
      if (!result) {
        toast.error('Profile import failed: file is not a valid KyberStation saber profile');
      } else {
        toast.success(`Imported profile "${file.name}"`);
      }
    };
    reader.onerror = () => {
      toast.error('Profile import failed: could not read file');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteProfile(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  };

  const handleCopyPresets = () => {
    if (!showCopyModal || !copyTarget || selectedPresets.size === 0) return;
    copyPresetsToProfile(showCopyModal, copyTarget, Array.from(selectedPresets));
    setShowCopyModal(null);
    setSelectedPresets(new Set());
    setCopyTarget('');
  };

  const handleEditSave = () => {
    if (editingId) {
      updateProfile(editingId, { notes: editNotes });
      playUISound('success');
      setEditingId(null);
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const representativeConfig = activeProfile
    ? getRepresentativeConfig(activeProfile, fallbackConfig)
    : null;

  return (
    <div className="space-y-4">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1 section-header">
          Saber Profiles
          <HelpTooltip text="Manage multiple lightsabers. Each profile stores its own preset list, font assignments, and card settings. Copy presets between sabers or export/import entire profiles." />
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => importRef.current?.click()}
            className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
            aria-label="Import saber profile"
          >
            Import
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" aria-hidden="true" />
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-2 py-1 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors"
          >
            + New Saber
          </button>
        </div>
      </div>

      {/* ── Create form ── */}
      {showCreate && (
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="new-saber-name" className="text-ui-xs text-text-muted block mb-1">Name</label>
              <input id="new-saber-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Vader ANH" className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted" autoFocus />
            </div>
            <div>
              <label htmlFor="new-saber-chassis" className="text-ui-xs text-text-muted block mb-1">Chassis</label>
              <input id="new-saber-chassis" type="text" value={newChassis} onChange={(e) => setNewChassis(e.target.value)} placeholder="e.g., 89sabers Vader" className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted" />
            </div>
            <div>
              <label htmlFor="new-saber-board" className="text-ui-xs text-text-muted block mb-1">Board</label>
              <select id="new-saber-board" value={newBoard} onChange={(e) => setNewBoard(e.target.value)} className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary">
                <optgroup label="Pro Tier — Full Customization">
                  <option>Proffie V3</option>
                  <option>Proffie V2</option>
                  <option>Proffie Lite</option>
                  <option>Proffie Clone</option>
                  <option>CFX</option>
                  <option>GH V4</option>
                  <option>GH V3</option>
                </optgroup>
                <optgroup label="Mid Tier — Limited Customization">
                  <option>Xenopixel V3</option>
                  <option>Xenopixel V2</option>
                  <option>Verso</option>
                  <option>DamienSaber</option>
                </optgroup>
                <optgroup label="Budget — Preset Colors Only">
                  <option>SN-Pixel V4</option>
                  <option>SN-Pixel V4 Pro</option>
                  <option>Asteria</option>
                  <option>Darkwolf</option>
                  <option>LGT Baselit</option>
                  <option>S-RGB</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label htmlFor="new-saber-card" className="text-ui-xs text-text-muted block mb-1">SD Card</label>
              <select id="new-saber-card" value={newCard} onChange={(e) => setNewCard(e.target.value)} className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary">
                {Object.keys(CARD_SIZES).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleCreate} className="px-3 py-1.5 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-ui-xs text-text-muted border border-border-subtle hover:text-text-primary transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Profile tab strip (switcher for non-active profiles) ── */}
      {profiles.length > 1 && (
        <ProfileTabStrip
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitch={(id) => { playUISound('preset-loaded'); switchProfile(id); }}
        />
      )}

      {/* ── Active profile: character sheet ── */}
      {activeProfile && representativeConfig && (
        <div className="bg-bg-surface rounded-panel border border-border-subtle overflow-hidden">
          {/* Hero */}
          <div className="px-4 pt-3 pb-2 border-b border-border-subtle/60">
            <ProfileHero profile={activeProfile} representativeConfig={representativeConfig} />
            <div className="mt-2">
              <ProfileStorageBar profile={activeProfile} />
            </div>
            <div className="mt-3">
              <CharacterSheetActions
                profile={activeProfile}
                onEdit={() => { setEditingId(activeProfile.id); setEditNotes(activeProfile.notes); }}
                onDuplicate={() => duplicateProfile(activeProfile.id)}
                onExport={() => handleExport(activeProfile.id)}
                onDelete={() => handleDelete(activeProfile.id)}
              />
            </div>

            {/* Delete confirmation — tokenised, Linear-flat */}
            {deleteConfirm === activeProfile.id && (
              <div
                className="mt-2 p-2 rounded text-ui-xs flex items-center gap-2 border flex-wrap"
                style={{
                  background: 'rgb(var(--status-error) / 0.1)',
                  borderColor: 'rgb(var(--status-error) / 0.3)',
                  color: 'rgb(var(--status-error))',
                }}
              >
                <span aria-hidden="true">✕</span>
                <span>Delete &quot;{activeProfile.name}&quot;? This cannot be undone.</span>
                <button
                  onClick={() => handleDelete(activeProfile.id)}
                  className="px-2 py-0.5 rounded font-medium border"
                  style={{
                    background: 'rgb(var(--status-error) / 0.2)',
                    borderColor: 'rgb(var(--status-error) / 0.5)',
                  }}
                >
                  Confirm
                </button>
                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded border border-border-subtle text-text-muted">Cancel</button>
              </div>
            )}

            {/* Edit notes */}
            {editingId === activeProfile.id && (
              <div className="mt-2 p-2 bg-bg-deep border border-border-subtle rounded space-y-1.5">
                <label htmlFor={`notes-${activeProfile.id}`} className="text-ui-xs text-text-muted block">Notes</label>
                <textarea id={`notes-${activeProfile.id}`} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="e.g., Bass speaker, crystal chamber wired..." className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted resize-none" />
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={handleEditSave} className="px-2 py-1 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-ui-xs text-text-muted border border-border-subtle">Cancel</button>
                  <button onClick={() => { setShowCopyModal(activeProfile.id); setEditingId(null); }} className="px-2 py-1 rounded text-ui-xs text-accent border border-accent-border/40">Copy Presets To...</button>
                </div>
              </div>
            )}

            {/* Saved notes surfaced in hero (read-only) */}
            {activeProfile.notes && editingId !== activeProfile.id && (
              <p className="mt-2 text-ui-xs text-text-muted italic border-l-2 border-border-subtle/60 pl-2">
                {activeProfile.notes}
              </p>
            )}
          </div>

          {/* Category blocks — responsive: 1 col at narrow, 2 col at tablet+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-4 py-4">
            <BladeSpecsBlock profile={activeProfile} config={representativeConfig} />
            <EquippedStyleBlock config={representativeConfig} />
            <EquippedFontBlock profile={activeProfile} />
            <SmoothSwingBlock config={representativeConfig} />
            <div className="md:col-span-2">
              <ButtonMapBlock profile={activeProfile} />
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state (preserved) ── */}
      {profiles.length === 0 && (
        <div className="rounded-panel border border-dashed border-border-subtle bg-bg-surface/50 p-5 text-center space-y-2">
          <div
            className="font-mono uppercase tracking-widest text-text-muted"
            style={{ fontSize: 'clamp(11px, 1.4vw, 14px)' }}
            aria-hidden="true"
          >
            ∅ · NO PROFILES
          </div>
          <p className="text-ui-sm text-text-primary font-medium">
            No saber profiles yet.
          </p>
          <p className="text-ui-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            A saber profile stores one physical lightsaber&rsquo;s hardware — board type, SD card, preset list, and card configs.
            Create your first one to start building cards.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 px-3 py-1.5 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors"
          >
            + Create First Saber
          </button>
        </div>
      )}

      {/* ── Card Preset Composer for active profile ── */}
      {activeProfile && (
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
          <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1 section-header">
            Card Presets
            <HelpTooltip text="Compose the preset list for your SD card. Each card config is an independent set of presets. The active config is used for code generation and SD card export." />
          </h4>
          <CardPresetComposer profile={activeProfile} />
        </div>
      )}

      {/* ── Copy presets modal ── */}
      {showCopyModal && (
        <CopyPresetsModal
          sourceProfileId={showCopyModal}
          profiles={profiles}
          selectedPresets={selectedPresets}
          onTogglePreset={(id) => {
            const s = new Set(selectedPresets);
            s.has(id) ? s.delete(id) : s.add(id);
            setSelectedPresets(s);
          }}
          copyTarget={copyTarget}
          onCopyTargetChange={setCopyTarget}
          onConfirm={handleCopyPresets}
          onClose={() => setShowCopyModal(null)}
        />
      )}
    </div>
  );
}

// ─── Copy Presets Modal ───

function CopyPresetsModal({
  sourceProfileId,
  profiles,
  selectedPresets,
  onTogglePreset,
  copyTarget,
  onCopyTargetChange,
  onConfirm,
  onClose,
}: {
  sourceProfileId: string;
  profiles: SaberProfile[];
  selectedPresets: Set<string>;
  onTogglePreset: (id: string) => void;
  copyTarget: string;
  onCopyTargetChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Modal a11y: ESC-to-close, Tab focus trap, initial + restore focus.
  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: true,
    onClose,
  });

  const source = profiles.find((p) => p.id === sourceProfileId);
  const hasPresets = Boolean(source && source.presetEntries.length > 0);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-presets-modal-title"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-xl w-full max-w-sm mx-4 p-4 space-y-3">
        <h4 id="copy-presets-modal-title" className="text-ui-base font-medium text-text-primary">Copy Presets</h4>
        {!hasPresets || !source ? (
          <p className="text-ui-xs text-text-muted">No presets to copy.</p>
        ) : (
          <>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {source.presetEntries.map((entry) => (
                <label key={entry.id} className="flex items-center gap-2 text-ui-xs text-text-secondary cursor-pointer hover:bg-bg-surface rounded px-2 py-1">
                  <input type="checkbox" checked={selectedPresets.has(entry.id)} onChange={() => onTogglePreset(entry.id)} />
                  {entry.presetName}
                </label>
              ))}
            </div>
            <div>
              <label htmlFor="copy-target" className="text-ui-xs text-text-muted block mb-1">Copy to:</label>
              <select
                id="copy-target"
                data-autofocus
                value={copyTarget}
                onChange={(e) => onCopyTargetChange(e.target.value)}
                className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary"
              >
                <option value="">Select target saber...</option>
                {profiles.filter((p) => p.id !== sourceProfileId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-1.5">
              <button onClick={onConfirm} disabled={!copyTarget || selectedPresets.size === 0} className="px-3 py-1.5 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">Copy {selectedPresets.size} Preset{selectedPresets.size !== 1 ? 's' : ''}</button>
              <button onClick={onClose} className="px-3 py-1.5 rounded text-ui-xs text-text-muted border border-border-subtle">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
