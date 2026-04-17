'use client';

import { useState, useMemo, useRef } from 'react';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import type { SaberProfile, CardPresetEntry } from '@/stores/saberProfileStore';
import { useBladeStore } from '@/stores/bladeStore';
import { estimateTotal, formatBytes, CARD_SIZES } from '@kyberstation/engine';
import { CARD_TEMPLATES } from '@kyberstation/presets';
import type { CardTemplate } from '@kyberstation/presets';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { downloadCardTemplate, readCardTemplateFile } from '@/lib/bladeConfigIO';
import { playUISound } from '@/lib/uiSounds';
import { toast } from '@/lib/toastManager';

function ProfileCard({
  profile,
  isActive,
  onSwitch,
  onDuplicate,
  onDelete,
  onExport,
  onEdit,
}: {
  profile: SaberProfile;
  isActive: boolean;
  onSwitch: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onEdit: () => void;
}) {
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
    <div className={`rounded-panel p-3 border transition-colors ${
      isActive ? 'bg-accent-dim border-accent-border' : 'bg-bg-surface border-border-subtle hover:border-border-light'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-ui-base font-medium text-text-primary truncate">{profile.name}</h4>
            {isActive && <span className="text-ui-xs text-accent font-medium">Active</span>}
          </div>
          {profile.chassisType && (
            <p className="text-ui-xs text-text-muted mt-0.5">{profile.chassisType}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-ui-xs text-text-muted">
            <span>{profile.boardType}</span>
            <span>{profile.cardSize}</span>
            <span>{(() => {
              const cc = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
              const count = cc?.entries.length ?? profile.presetEntries.length;
              return `${count} preset${count !== 1 ? 's' : ''}`;
            })()}</span>
          </div>
          {/* Storage bar */}
          <div className="mt-2">
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
            <span className="text-ui-xs text-text-muted">{formatBytes(budget.totalBytes)} / {profile.cardSize}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-3">
        {!isActive && (
          <button onClick={onSwitch} className="px-2 py-1 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors" aria-label={`Switch to ${profile.name}`}>
            Switch
          </button>
        )}
        <button onClick={onEdit} className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors" aria-label={`Edit ${profile.name}`}>
          Edit
        </button>
        <button onClick={onDuplicate} className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors" aria-label={`Duplicate ${profile.name}`}>
          Duplicate
        </button>
        <button onClick={onExport} className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-primary transition-colors" aria-label={`Export ${profile.name}`}>
          Export
        </button>
        <button onClick={onDelete} className="px-2 py-1 rounded text-ui-xs border border-border-subtle text-red-400/60 hover:text-red-400 hover:border-red-800/30 transition-colors" aria-label={`Delete ${profile.name}`}>
          Delete
        </button>
      </div>

      {profile.notes && (
        <p className="text-ui-xs text-text-muted mt-2 italic">{profile.notes}</p>
      )}
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
            className="px-1.5 py-0.5 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
            title="Delete active config"
          >
            Del
          </button>
        </>
      )}
    </div>
  );
}

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

      {/* Source badge */}
      <span className={`text-ui-xs shrink-0 px-1 py-px rounded border ${
        entry.source.type === 'builtin' ? 'border-blue-800/30 text-blue-400/60' :
        entry.source.type === 'custom' ? 'border-accent-border/30 text-accent/60' :
        'border-border-subtle text-text-muted/60'
      }`}>{sourceBadge}</span>

      {/* Style */}
      <span className="text-ui-xs text-text-muted shrink-0">{entry.config.style}</span>

      {/* Remove */}
      <button
        onClick={() => removeCardEntry(profileId, configId, entry.id)}
        className="text-text-muted hover:text-red-400 text-ui-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
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

      {/* Create form */}
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

      {/* Profile list */}
      <div className="space-y-2">
        {profiles.map((profile) => (
          <div key={profile.id}>
            <ProfileCard
              profile={profile}
              isActive={profile.id === activeProfileId}
              onSwitch={() => { playUISound('preset-loaded'); switchProfile(profile.id); }}
              onDuplicate={() => duplicateProfile(profile.id)}
              onDelete={() => handleDelete(profile.id)}
              onExport={() => handleExport(profile.id)}
              onEdit={() => { setEditingId(profile.id); setEditNotes(profile.notes); }}
            />
            {/* Delete confirmation */}
            {deleteConfirm === profile.id && (
              <div className="mt-1 p-2 bg-red-900/20 border border-red-800/30 rounded text-ui-xs text-red-400 flex items-center gap-2">
                <span>Delete &quot;{profile.name}&quot;? This cannot be undone.</span>
                <button onClick={() => handleDelete(profile.id)} className="px-2 py-0.5 rounded bg-red-900/40 border border-red-700/50 font-medium">Confirm</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded border border-border-subtle text-text-muted">Cancel</button>
              </div>
            )}
            {/* Edit notes */}
            {editingId === profile.id && (
              <div className="mt-1 p-2 bg-bg-surface border border-border-subtle rounded space-y-1.5">
                <label htmlFor={`notes-${profile.id}`} className="text-ui-xs text-text-muted block">Notes</label>
                <textarea id={`notes-${profile.id}`} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="e.g., Bass speaker, crystal chamber wired..." className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted resize-none" />
                <div className="flex gap-1.5">
                  <button onClick={handleEditSave} className="px-2 py-1 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-ui-xs text-text-muted border border-border-subtle">Cancel</button>
                  <button onClick={() => { setShowCopyModal(profile.id); setEditingId(null); }} className="px-2 py-1 rounded text-ui-xs text-accent border border-accent-border/40">Copy Presets To...</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {profiles.length === 0 && (
        <p className="text-ui-xs text-text-muted italic">
          No saber profiles yet. Create one to start managing presets per saber.
        </p>
      )}

      {/* Card Preset Composer for active profile */}
      {(() => {
        const active = profiles.find((p) => p.id === activeProfileId);
        if (!active) return null;
        return (
          <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
              Card Presets
              <HelpTooltip text="Compose the preset list for your SD card. Each card config is an independent set of presets. The active config is used for code generation and SD card export." />
            </h4>
            <CardPresetComposer profile={active} />
          </div>
        );
      })()}

      {/* Copy presets modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowCopyModal(null); }}>
          <div className="bg-bg-secondary border border-border-light rounded-lg shadow-xl w-full max-w-sm mx-4 p-4 space-y-3">
            <h4 className="text-ui-base font-medium text-text-primary">Copy Presets</h4>
            {(() => {
              const source = profiles.find((p) => p.id === showCopyModal);
              if (!source || source.presetEntries.length === 0) return <p className="text-ui-xs text-text-muted">No presets to copy.</p>;
              return (
                <>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {source.presetEntries.map((entry) => (
                      <label key={entry.id} className="flex items-center gap-2 text-ui-xs text-text-secondary cursor-pointer hover:bg-bg-surface rounded px-2 py-1">
                        <input type="checkbox" checked={selectedPresets.has(entry.id)} onChange={() => { const s = new Set(selectedPresets); s.has(entry.id) ? s.delete(entry.id) : s.add(entry.id); setSelectedPresets(s); }} />
                        {entry.presetName}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="copy-target" className="text-ui-xs text-text-muted block mb-1">Copy to:</label>
                    <select id="copy-target" value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)} className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary">
                      <option value="">Select target saber...</option>
                      {profiles.filter((p) => p.id !== showCopyModal).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleCopyPresets} disabled={!copyTarget || selectedPresets.size === 0} className="px-3 py-1.5 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">Copy {selectedPresets.size} Preset{selectedPresets.size !== 1 ? 's' : ''}</button>
                    <button onClick={() => setShowCopyModal(null)} className="px-3 py-1.5 rounded text-ui-xs text-text-muted border border-border-subtle">Cancel</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
