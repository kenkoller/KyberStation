'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import {
  exportMultiPresetZip,
  BOARDS,
  type BoardId,
  type ExportPreset,
} from '@/lib/zipExporter';
import {
  detectBoardFromDirectory,
  listExistingPresets,
  backupConfig,
  writeFileToDirectory,
  ensureDirectory,
  verifyFileContents,
  type DetectedBoard,
  type ExistingPreset,
} from '@/lib/cardDetector';
import { generateStyleCode } from '@kyberstation/codegen';
import { playUISound } from '@/lib/uiSounds';

// ─── Preset Registry ───
// Same presets used in PresetBrowser, kept minimal here for the card writer.

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable',
  unstable: 'Unstable',
  fire: 'Fire',
  pulse: 'Pulse',
  rotoscope: 'Rotoscope',
  gradient: 'Gradient',
  photon: 'Photon',
  plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter',
  aurora: 'Aurora',
  cinder: 'Cinder',
  prism: 'Prism',
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  );
}

// ─── Feature Detection ───

function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ─── Status Types ───

type WritePhase =
  | 'idle'
  | 'selecting'
  | 'detecting'
  | 'backing_up'
  | 'writing'
  | 'verifying'
  | 'done'
  | 'error';

interface StatusMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

// ─── Validation Types ───

interface ValidationNotice {
  type: 'error' | 'warning' | 'info';
  text: string;
}

// ─── Component ───

export function CardWriter() {
  const config = useBladeStore((s) => s.config);

  // Board selection
  const [boardId, setBoardId] = useState<BoardId>('proffie');

  // Preset selection — the current config is always an option
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set(['current']));

  // Output method
  const [outputMethod, setOutputMethod] = useState<'zip' | 'card'>('zip');

  // Backup toggle
  const [autoBackup, setAutoBackup] = useState(true);

  // Post-export instructions
  const [showPostExport, setShowPostExport] = useState(false);

  // Write state
  const [phase, setPhase] = useState<WritePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [, setDetectedBoard] = useState<DetectedBoard | null>(null);
  const [existingPresets, setExistingPresets] = useState<ExistingPreset[]>([]);

  // Directory handle ref for card writing
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // ─── Helpers ───

  const addStatus = useCallback((msg: StatusMessage) => {
    setStatusMessages((prev) => [...prev, msg]);
  }, []);

  const clearStatus = useCallback(() => {
    setStatusMessages([]);
  }, []);

  const presetListEntries = usePresetListStore((s) => s.entries);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);

  // Resolve which entries to use: active card config > preset list > current editor config
  const resolvedEntries = useMemo(() => {
    // Prefer active profile's active card config
    if (activeProfileId) {
      const profile = profiles.find((p) => p.id === activeProfileId);
      if (profile) {
        const cc = profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ?? profile.cardConfigs[0];
        if (cc && cc.entries.length > 0) {
          return cc.entries.map((e) => ({
            id: e.id,
            presetName: e.presetName,
            fontName: e.fontName,
            config: e.config,
            style: e.config.style,
          }));
        }
      }
    }
    // Fall back to preset list
    if (presetListEntries.length > 0) {
      return presetListEntries.map((e) => ({
        id: e.id,
        presetName: e.presetName,
        fontName: e.fontName,
        config: e.config,
        style: e.config.style,
      }));
    }
    return null; // Will use current editor config
  }, [activeProfileId, profiles, presetListEntries]);

  const buildExportPresets = useCallback((): ExportPreset[] => {
    if (resolvedEntries) {
      return resolvedEntries.map((entry) => ({
        name: entry.presetName,
        config: entry.config,
        fontName: entry.fontName,
      }));
    }
    // Fallback: single-preset from current editor config
    const presets: ExportPreset[] = [];
    if (selectedPresets.has('current')) {
      presets.push({
        name: config.name ?? 'Custom Style',
        config,
        fontName: (config.name ?? 'custom').replace(/\s+/g, '_').toLowerCase(),
      });
    }
    return presets;
  }, [resolvedEntries, selectedPresets, config]);

  // ─── Pre-export Validation ───

  const validationNotices = useMemo((): ValidationNotice[] => {
    const notices: ValidationNotice[] = [];
    const presets = buildExportPresets();

    // No presets
    if (presets.length === 0) {
      notices.push({
        type: 'error',
        text: "No presets added. Click '+ Add to Card' to add your current design first.",
      });
      return notices;
    }

    // LED count mismatch (Proffie default maxLedsPerStrip is 144)
    if (boardId === 'proffie') {
      const maxLeds = 144;
      for (const preset of presets) {
        if (preset.config.ledCount !== maxLeds) {
          notices.push({
            type: 'warning',
            text: `Your blade has ${preset.config.ledCount} LEDs but maxLedsPerStrip is set to ${maxLeds}. This works but wastes memory. Consider matching them.`,
          });
          break; // Only warn once
        }
      }
    }

    // Empty sound fonts
    const hasAnySoundFiles = presets.some((p) => p.soundFiles && p.soundFiles.length > 0);
    if (!hasAnySoundFiles) {
      notices.push({
        type: 'info',
        text: 'Sound font folders will contain placeholder files. Copy your sound font files (e.g., from your SD card backup) into each font folder after extracting.',
      });
    }

    return notices;
  }, [buildExportPresets, boardId]);

  // ─── Config Summary ───

  const configSummary = useMemo(() => {
    const presets = buildExportPresets();
    const fontFolders = presets.map(
      (p, i) =>
        p.fontName ??
        (p.name ?? 'custom').replace(/\s+/g, '_').toLowerCase() ??
        `font${i + 1}`,
    );

    // Estimate config.h size: generate the style code for each preset + overhead
    let estimatedSize = 0;
    if (boardId === 'proffie') {
      // ~500 bytes of config boilerplate + per-preset style code
      estimatedSize = 500;
      for (const preset of presets) {
        try {
          const code = generateStyleCode(preset.config, { comments: false });
          estimatedSize += code.length + 100; // +100 for preset wrapper boilerplate
        } catch {
          estimatedSize += 400; // fallback estimate per preset
        }
      }
    }

    const editModeEnabled =
      boardId === 'proffie'; // zipExporter always includes FETT263_EDIT_MODE_MENU for proffie

    return {
      presetCount: presets.length,
      boardLabel: BOARDS[boardId].label,
      estimatedSize,
      fontFolders,
      editModeEnabled,
    };
  }, [buildExportPresets, boardId]);

  // ─── Download ZIP ───

  const handleDownloadZip = useCallback(async () => {
    const presets = buildExportPresets();
    if (presets.length === 0) {
      addStatus({ type: 'warning', text: 'No presets selected.' });
      return;
    }

    clearStatus();
    setPhase('writing');
    setProgress(30);
    addStatus({ type: 'info', text: `Building ${BOARDS[boardId].label} ZIP archive...` });

    try {
      const blob = await exportMultiPresetZip({ presets, boardId });
      setProgress(80);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyberstation_${boardId}_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setPhase('done');
      playUISound('success');
      setShowPostExport(true);
      addStatus({
        type: 'success',
        text: `ZIP downloaded with ${presets.length} preset(s) for ${BOARDS[boardId].label}.`,
      });
    } catch (err) {
      setPhase('error');
      playUISound('error');
      addStatus({
        type: 'error',
        text: `Failed to create ZIP: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [buildExportPresets, boardId, addStatus, clearStatus]);

  // ─── Write to Card ───

  const handleWriteToCard = useCallback(async () => {
    const presets = buildExportPresets();
    if (presets.length === 0) {
      addStatus({ type: 'warning', text: 'No presets selected.' });
      return;
    }

    clearStatus();

    // Step 1: Select directory
    setPhase('selecting');
    addStatus({ type: 'info', text: 'Select your SD card directory...' });

    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      dirHandleRef.current = dirHandle;
    } catch {
      setPhase('idle');
      addStatus({ type: 'info', text: 'Directory selection cancelled.' });
      return;
    }

    // Step 2: Detect existing board
    setPhase('detecting');
    setProgress(10);
    addStatus({ type: 'info', text: 'Scanning directory for existing configuration...' });

    try {
      const detected = await detectBoardFromDirectory(dirHandle);
      setDetectedBoard(detected);

      if (detected) {
        addStatus({
          type: 'info',
          text: `Detected ${BOARDS[detected.boardId].label} configuration (${detected.confidence} confidence).`,
        });

        if (detected.boardId !== boardId) {
          addStatus({
            type: 'warning',
            text: `Warning: Detected board (${BOARDS[detected.boardId].label}) differs from selected target (${BOARDS[boardId].label}).`,
          });
        }

        // List existing presets
        const existing = await listExistingPresets(dirHandle, detected.boardId);
        setExistingPresets(existing);
        if (existing.length > 0) {
          addStatus({
            type: 'info',
            text: `Found ${existing.length} existing preset(s): ${existing.map((p) => p.name).join(', ')}`,
          });
        }
      } else {
        addStatus({ type: 'info', text: 'No existing board configuration detected. Writing fresh.' });
      }

      setProgress(25);

      // Step 3: Backup
      if (autoBackup && detected) {
        setPhase('backing_up');
        addStatus({ type: 'info', text: 'Backing up existing configuration...' });

        const existingConfig = await backupConfig(dirHandle);
        if (existingConfig) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupName = `config_backup_${timestamp}.txt`;
          await writeFileToDirectory(dirHandle, backupName, existingConfig);
          addStatus({ type: 'success', text: `Backup saved as ${backupName}` });
        } else {
          addStatus({ type: 'info', text: 'No existing config to back up.' });
        }

        setProgress(40);
      }

      // Step 4: Write files
      setPhase('writing');
      addStatus({ type: 'info', text: `Writing ${BOARDS[boardId].label} configuration...` });

      // Generate the ZIP and extract contents to write directly
      const blob = await exportMultiPresetZip({ presets, boardId });
      setProgress(60);

      // We need to unzip and write files individually using File System Access API.
      // Import JSZip dynamically for reading the blob back.
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(blob);

      const entries = Object.keys(zip.files);
      const totalEntries = entries.length;
      let written = 0;

      const SAFE_PATH_PART = /^[a-zA-Z0-9._-]+$/;
      for (const path of entries) {
        const entry = zip.files[path];

        // Security: reject path traversal, absolute paths, and unsafe characters
        if (path.includes('..') || path.startsWith('/') || path.startsWith('\\')) {
          addStatus({ type: 'warning', text: `Skipped unsafe path: ${path}` });
          continue;
        }

        if (entry.dir) {
          // Create directory
          const parts = path.replace(/\/$/, '').split('/');
          if (!parts.every((p) => SAFE_PATH_PART.test(p))) {
            addStatus({ type: 'warning', text: `Skipped directory with invalid name: ${path}` });
            continue;
          }
          let current = dirHandle;
          for (const part of parts) {
            current = await ensureDirectory(current, part);
          }
        } else {
          // Write file
          const parts = path.split('/');
          const fileName = parts.pop()!;
          if (!parts.every((p) => SAFE_PATH_PART.test(p)) || !SAFE_PATH_PART.test(fileName)) {
            addStatus({ type: 'warning', text: `Skipped file with invalid name: ${path}` });
            continue;
          }
          let current = dirHandle;
          for (const part of parts) {
            current = await ensureDirectory(current, part);
          }
          const content = await entry.async('string');
          await writeFileToDirectory(current, fileName, content);
        }

        written++;
        setProgress(60 + Math.round((written / totalEntries) * 25));
      }

      addStatus({ type: 'success', text: `Wrote ${written} file(s) to SD card.` });

      // Step 5: Verify
      setPhase('verifying');
      setProgress(90);
      addStatus({ type: 'info', text: 'Verifying written files...' });

      const configFileName = BOARDS[boardId].configFileName;
      const configEntry = zip.files[configFileName];
      if (configEntry) {
        const expectedContent = await configEntry.async('string');
        const verified = await verifyFileContents(dirHandle, configFileName, expectedContent);
        if (verified) {
          addStatus({ type: 'success', text: `Verified ${configFileName} matches expected content.` });
        } else {
          addStatus({ type: 'warning', text: `Verification warning: ${configFileName} contents may not match.` });
        }
      }

      setProgress(100);
      setPhase('done');
      playUISound('success');
      setShowPostExport(true);
      addStatus({
        type: 'success',
        text: `SD card write complete. ${presets.length} preset(s) written for ${BOARDS[boardId].label}.`,
      });
    } catch (err) {
      setPhase('error');
      playUISound('error');
      addStatus({
        type: 'error',
        text: `Write failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, [buildExportPresets, boardId, autoBackup, addStatus, clearStatus]);

  // ─── Preset toggle ───

  const togglePreset = useCallback((id: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ─── Derived ───

  const isWorking = phase !== 'idle' && phase !== 'done' && phase !== 'error';
  const canWrite = selectedPresets.size > 0 && !isWorking;
  const fsApiAvailable = supportsFileSystemAccess();

  const currentPresetColor = rgbToHex(
    config.baseColor.r,
    config.baseColor.g,
    config.baseColor.b,
  );

  // ─── Render ───

  return (
    <div>
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-4">
        SD Card Writer
      </h3>

      {/* Target Board Selector */}
      <div className="mb-4">
        <label htmlFor="card-writer-board" className="block text-ui-sm text-text-muted uppercase tracking-wider mb-1.5">
          Target Board
        </label>
        <select
          id="card-writer-board"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value as BoardId)}
          disabled={isWorking}
          className="touch-target w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-ui-xs
            text-text-primary focus:outline-none focus:border-accent transition-colors
            disabled:opacity-50"
        >
          {Object.values(BOARDS).map((board) => (
            <option key={board.id} value={board.id}>
              {board.label}
            </option>
          ))}
        </select>
        <p className="text-ui-xs text-text-muted mt-1">
          Config file: <span className="text-text-secondary">{BOARDS[boardId].configFileName}</span>
        </p>
      </div>

      {/* Preset Selector */}
      <div className="mb-4">
        <label className="block text-ui-sm text-text-muted uppercase tracking-wider mb-1.5">
          Presets to Include
        </label>
        {resolvedEntries ? (
          <div className="bg-bg-surface rounded-panel border border-border-subtle p-2 space-y-1">
            {resolvedEntries.map((entry, i) => {
              const entryHex = rgbToHex(entry.config.baseColor.r, entry.config.baseColor.g, entry.config.baseColor.b);
              return (
                <div key={entry.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-bg-primary/30">
                  <span className="text-ui-sm text-text-muted tabular-nums w-4 text-right shrink-0">{i + 1}.</span>
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entryHex }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-ui-xs text-text-primary truncate block">{entry.presetName}</span>
                    <span className="text-ui-xs text-text-muted font-mono">{entry.fontName}/</span>
                  </div>
                  <span className="text-ui-xs text-text-muted shrink-0">
                    {STYLE_LABELS[entry.style] ?? entry.style}
                  </span>
                </div>
              );
            })}
            <p className="text-ui-xs text-accent mt-1 px-2">
              Using {resolvedEntries.length} preset(s) from {activeProfileId ? 'active card config' : 'Saber Preset List'} (in order)
            </p>
          </div>
        ) : (
          <div className="bg-bg-surface rounded-panel border border-border-subtle p-2 space-y-1">
            <label className="touch-target flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-bg-primary/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selectedPresets.has('current')}
                onChange={() => togglePreset('current')}
                disabled={isWorking}
                aria-label="Include current style preset in export"
                className="accent-accent w-3.5 h-3.5"
              />
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: currentPresetColor }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-ui-xs text-text-primary truncate block">
                  {config.name ?? 'Current Style'}
                </span>
                <span className="text-ui-xs text-text-muted">
                  {STYLE_LABELS[config.style] ?? config.style}
                </span>
              </div>
            </label>
            <p className="text-ui-xs text-text-muted mt-1 px-2">
              {selectedPresets.size} preset(s) selected &mdash; add presets from the Gallery to export multiple
            </p>
          </div>
        )}
      </div>

      {/* Font Folder Preview */}
      <div className="mb-4">
        <label className="block text-ui-sm text-text-muted uppercase tracking-wider mb-1.5">
          Font Folders
        </label>
        <div className="bg-black/30 rounded border border-border-subtle p-3">
          {(() => {
            const exportPresets = resolvedEntries
              ? resolvedEntries.map((e) => ({ id: e.id, name: e.fontName }))
              : selectedPresets.has('current')
                ? [{ id: 'current', name: (config.name ?? 'custom').replace(/\s+/g, '_').toLowerCase() }]
                : [];
            if (exportPresets.length === 0) {
              return <p className="text-ui-sm text-text-muted italic">No presets selected</p>;
            }
            return (
              <div className="space-y-1">
                {exportPresets.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-ui-sm font-mono">
                    <span className="text-text-muted">/</span>
                    <span className="text-text-secondary">{p.name}/</span>
                    <span className="text-text-muted">sound font folder</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-ui-sm font-mono mt-1 pt-1 border-t border-border-subtle">
                  <span className="text-text-muted">/</span>
                  <span className="text-accent">{BOARDS[boardId].configFileName}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Output Method */}
      <div className="mb-4">
        <label className="block text-ui-sm text-text-muted uppercase tracking-wider mb-1.5">
          Output Method
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setOutputMethod('zip')}
            disabled={isWorking}
            className={`touch-target flex-1 px-3 py-2 rounded text-ui-xs font-medium transition-colors border ${
              outputMethod === 'zip'
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            } disabled:opacity-50`}
          >
            Download ZIP
          </button>
          <button
            onClick={() => setOutputMethod('card')}
            disabled={isWorking || !fsApiAvailable}
            title={
              fsApiAvailable
                ? 'Write directly to SD card'
                : 'File System Access API not available (Chrome/Edge only)'
            }
            className={`touch-target flex-1 px-3 py-2 rounded text-ui-xs font-medium transition-colors border ${
              outputMethod === 'card'
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Write to Card
            {!fsApiAvailable && (
              <span className="block text-ui-xs text-text-muted font-normal mt-0.5">
                Chrome/Edge only
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Backup Toggle (card mode only) */}
      {outputMethod === 'card' && (
        <div className="mb-4">
          <label className="touch-target flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              disabled={isWorking}
              aria-label="Auto-backup existing config before overwriting"
              className="accent-accent w-3.5 h-3.5"
            />
            <span className="text-ui-xs text-text-secondary">
              Auto-backup existing config before overwriting
            </span>
          </label>
        </div>
      )}

      {/* Pre-export Validation Notices — tokenised aviation state colors */}
      {validationNotices.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {validationNotices.map((notice, i) => {
            const token =
              notice.type === 'error'
                ? '--status-error'
                : notice.type === 'warning'
                  ? '--status-warn'
                  : '--status-info';
            const glyph = notice.type === 'error' ? '✕' : notice.type === 'warning' ? '⚠' : 'i';
            return (
              <div
                key={i}
                className="text-ui-xs px-3 py-2 rounded flex items-start gap-2 border"
                style={{
                  color: `rgb(var(${token}))`,
                  background: `rgb(var(${token}) / 0.1)`,
                  borderColor: `rgb(var(${token}) / 0.3)`,
                }}
              >
                <span className="shrink-0 mt-px" aria-hidden="true">{glyph}</span>
                <span>{notice.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Summary */}
      {configSummary.presetCount > 0 && (
        <div className="mb-4 bg-bg-surface rounded-panel border border-border-subtle p-3">
          <h4 className="text-ui-xs text-text-muted uppercase tracking-wider mb-2">
            Export Summary
          </h4>
          <div className="space-y-1 text-ui-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Presets</span>
              <span className="text-text-primary">{configSummary.presetCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Target Board</span>
              <span className="text-text-primary">{configSummary.boardLabel}</span>
            </div>
            {configSummary.estimatedSize > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Est. config.h size</span>
                <span className="text-text-primary">
                  {configSummary.estimatedSize < 1024
                    ? `${configSummary.estimatedSize} B`
                    : `${(configSummary.estimatedSize / 1024).toFixed(1)} KB`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-muted">Edit Mode (Fett263)</span>
              <span
                className="font-medium"
                style={{
                  color: configSummary.editModeEnabled
                    ? 'rgb(var(--status-ok))'
                    : 'rgb(var(--text-muted))',
                }}
              >
                {configSummary.editModeEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {configSummary.fontFolders.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border-subtle">
                <span className="text-text-muted block mb-1">Font folders:</span>
                <div className="flex flex-wrap gap-1">
                  {configSummary.fontFolders.map((folder, i) => (
                    <span
                      key={i}
                      className="inline-block px-1.5 py-0.5 rounded bg-bg-primary/50 text-text-secondary font-mono text-ui-xs"
                    >
                      {folder}/
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={outputMethod === 'zip' ? handleDownloadZip : handleWriteToCard}
        disabled={!canWrite}
        className={`w-full py-2.5 rounded text-ui-sm font-semibold transition-colors border ${
          canWrite
            ? 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20 active:bg-accent/30'
            : 'bg-bg-surface border-border-subtle text-text-muted cursor-not-allowed'
        }`}
      >
        {isWorking
          ? phaseLabel(phase)
          : outputMethod === 'zip'
            ? 'Download ZIP'
            : 'Write to SD Card'}
      </button>

      {/* Progress Bar */}
      {isWorking && (
        <div className="mt-3">
          <div
            className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden border border-border-subtle"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="SD card write progress"
          >
            <div
              className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-ui-xs text-text-muted mt-1 text-right">{progress}%</p>
        </div>
      )}

      {/* Multi-stage commit ceremony — Rogue One Scarif physical-slot progression
          (prepare → detect → backup → write → verify). Shows aviation state
          colours (green/amber/red) for each stage. Only visible while working
          or immediately after a card-write attempt. */}
      {(isWorking || (outputMethod === 'card' && phase === 'done')) && (
        <CommitCeremonyStrip phase={phase} isWorking={isWorking} />
      )}

      {/* Status Messages */}
      {statusMessages.length > 0 && (
        <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
          {statusMessages.map((msg, i) => {
            const style = statusColorStyle(msg.type);
            const hasStyle = Object.keys(style).length > 0;
            return (
              <div
                key={i}
                className={`text-ui-sm px-2.5 py-1.5 rounded flex items-start gap-1.5 border ${
                  hasStyle ? '' : 'bg-bg-surface text-text-muted border-border-subtle'
                }`}
                style={hasStyle ? style : undefined}
              >
                <span className="shrink-0 mt-px" aria-hidden="true">{statusIcon(msg.type)}</span>
                <span>{msg.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Existing Presets on Card (shown after detection) */}
      {existingPresets.length > 0 && phase !== 'idle' && (
        <div className="mt-3 bg-bg-surface rounded-panel border border-border-subtle p-3">
          <h4 className="text-ui-sm text-text-muted uppercase tracking-wider mb-1.5">
            Existing Presets on Card
          </h4>
          <div className="space-y-0.5">
            {existingPresets.map((p, i) => (
              <div key={i} className="text-ui-sm text-text-secondary flex items-center gap-2">
                <span className="text-text-muted font-mono">{p.fontFolder}/</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      {(phase === 'done' || phase === 'error') && (
        <button
          onClick={() => {
            setPhase('idle');
            setProgress(0);
            clearStatus();
            setDetectedBoard(null);
            setExistingPresets([]);
            setShowPostExport(false);
          }}
          className="touch-target mt-3 w-full py-1.5 rounded text-ui-xs font-medium transition-colors border
            bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
        >
          Reset
        </button>
      )}

      {/* Post-Export Instructions */}
      {showPostExport && phase === 'done' && (
        <div className="mt-3 bg-bg-surface rounded-panel border border-accent-border/30 overflow-hidden">
          <button
            onClick={() => setShowPostExport((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-ui-xs font-medium text-accent
              hover:bg-accent-dim/30 transition-colors"
          >
            <span>What&apos;s Next?</span>
            <span className="text-text-muted">{showPostExport ? '\u25B2' : '\u25BC'}</span>
          </button>
          <div className="px-3 pb-3">
            <ol className="list-decimal list-inside space-y-1.5 text-ui-xs text-text-secondary">
              {outputMethod === 'zip' ? (
                <>
                  <li>Extract the ZIP to your SD card root</li>
                  <li>Copy your sound font files into each font folder</li>
                  <li>
                    Verify <span className="font-mono text-accent">{BOARDS[boardId].configFileName}</span> is at the SD card root
                  </li>
                  <li>Insert card into your saber and power on</li>
                </>
              ) : (
                <>
                  <li>Copy your sound font files into each font folder on the card</li>
                  <li>
                    Verify <span className="font-mono text-accent">{BOARDS[boardId].configFileName}</span> is at the card root
                  </li>
                  <li>Safely eject the SD card</li>
                  <li>Insert card into your saber and power on</li>
                </>
              )}
            </ol>
            {boardId === 'proffie' && (
              <p className="text-ui-xs text-text-muted mt-2 border-t border-border-subtle pt-2">
                Tip: Edit Mode (Fett263) is enabled &mdash; you can fine-tune colors and effects directly on the saber
                using button combinations. Check the Fett263 prop documentation for details.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <p className="text-ui-xs text-text-muted mt-3">
        {outputMethod === 'zip'
          ? 'Downloads a ZIP file containing the board config and font folder structure. Extract to your SD card.'
          : 'Writes files directly to your SD card using the File System Access API. Requires Chrome or Edge.'}
      </p>
    </div>
  );
}

// ─── Utility Functions ───

function phaseLabel(phase: WritePhase): string {
  switch (phase) {
    case 'selecting':
      return 'Select Directory...';
    case 'detecting':
      return 'Detecting Board...';
    case 'backing_up':
      return 'Backing Up...';
    case 'writing':
      return 'Writing Files...';
    case 'verifying':
      return 'Verifying...';
    default:
      return 'Working...';
  }
}

function statusIcon(type: StatusMessage['type']): string {
  switch (type) {
    case 'success':
      return '\u2713';
    case 'error':
      return '\u2717';
    case 'warning':
      return '\u26A0';
    case 'info':
    default:
      return '\u2022';
  }
}

// ─── Commit Ceremony Strip ───
// Scarif-style physical-slot progression. Five stages mapped to aviation
// colors: green (complete), amber (active), red (error), grey (pending).

const COMMIT_STAGES: Array<{ key: WritePhase | 'prepare'; label: string }> = [
  { key: 'selecting', label: 'Select' },
  { key: 'detecting', label: 'Detect' },
  { key: 'backing_up', label: 'Backup' },
  { key: 'writing', label: 'Write' },
  { key: 'verifying', label: 'Verify' },
];

function stageTone(
  stageKey: WritePhase,
  currentPhase: WritePhase,
): 'complete' | 'active' | 'error' | 'pending' {
  if (currentPhase === 'error') {
    return stageKey === 'verifying' ? 'error' : 'pending';
  }
  if (currentPhase === 'done') return 'complete';
  const order: WritePhase[] = [
    'selecting',
    'detecting',
    'backing_up',
    'writing',
    'verifying',
  ];
  const currentIdx = order.indexOf(currentPhase);
  const stageIdx = order.indexOf(stageKey);
  if (currentIdx < 0 || stageIdx < 0) return 'pending';
  if (stageIdx < currentIdx) return 'complete';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

function CommitCeremonyStrip({
  phase,
  isWorking,
}: {
  phase: WritePhase;
  isWorking: boolean;
}) {
  return (
    <div className="mt-3 bg-bg-surface rounded-panel border border-border-subtle px-3 py-2.5">
      <div className="text-ui-xs uppercase tracking-widest text-text-muted mb-2">
        Commit Sequence
      </div>
      <div className="flex items-center gap-1">
        {COMMIT_STAGES.map((stage, i) => {
          const tone = stageTone(stage.key as WritePhase, phase);
          const tokenVar =
            tone === 'complete'
              ? '--status-ok'
              : tone === 'active'
                ? '--status-warn'
                : tone === 'error'
                  ? '--status-error'
                  : null;
          const glyph =
            tone === 'complete'
              ? '✓'
              : tone === 'active'
                ? '◉'
                : tone === 'error'
                  ? '✕'
                  : '○';
          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded border flex-1 min-w-0 transition-colors ${
                  tone === 'active' && isWorking ? 'animate-pulse' : ''
                }`}
                style={
                  tokenVar
                    ? {
                        color: `rgb(var(${tokenVar}))`,
                        borderColor: `rgb(var(${tokenVar}) / 0.4)`,
                        background: `rgb(var(${tokenVar}) / 0.08)`,
                      }
                    : {
                        color: 'rgb(var(--text-muted))',
                        borderColor: 'rgb(var(--border-subtle))',
                      }
                }
                aria-label={`${stage.label}: ${tone}`}
              >
                <span className="shrink-0 text-ui-xs font-mono" aria-hidden="true">
                  {glyph}
                </span>
                <span className="text-ui-xs font-mono uppercase tracking-wider truncate">
                  {stage.label}
                </span>
              </div>
              {i < COMMIT_STAGES.length - 1 && (
                <span
                  className="text-text-muted text-ui-xs shrink-0"
                  aria-hidden="true"
                >
                  ›
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusColorStyle(type: StatusMessage['type']): React.CSSProperties {
  const token =
    type === 'success'
      ? '--status-ok'
      : type === 'error'
        ? '--status-error'
        : type === 'warning'
          ? '--status-warn'
          : null;
  if (!token) return {};
  return {
    color: `rgb(var(${token}))`,
    background: `rgb(var(${token}) / 0.1)`,
    borderColor: `rgb(var(${token}) / 0.3)`,
  };
}
