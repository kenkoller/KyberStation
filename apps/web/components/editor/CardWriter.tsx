'use client';

import { useState, useCallback, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
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
import { generateStyleCode } from '@bladeforge/codegen';

// ─── Preset Registry ───
// Same presets used in PresetBrowser, kept minimal here for the card writer.

interface LocalPreset {
  id: string;
  name: string;
  style: string;
  baseColor: { r: number; g: number; b: number };
  fontName?: string;
}

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

  // Write state
  const [phase, setPhase] = useState<WritePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [detectedBoard, setDetectedBoard] = useState<DetectedBoard | null>(null);
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

  const buildExportPresets = useCallback((): ExportPreset[] => {
    const presets: ExportPreset[] = [];
    if (selectedPresets.has('current')) {
      presets.push({
        name: config.name ?? 'Custom Style',
        config,
        fontName: (config.name ?? 'custom').replace(/\s+/g, '_').toLowerCase(),
      });
    }
    return presets;
  }, [selectedPresets, config]);

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
      a.download = `bladeforge_${boardId}_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setPhase('done');
      addStatus({
        type: 'success',
        text: `ZIP downloaded with ${presets.length} preset(s) for ${BOARDS[boardId].label}.`,
      });
    } catch (err) {
      setPhase('error');
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
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
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

      for (const path of entries) {
        const entry = zip.files[path];

        if (entry.dir) {
          // Create directory
          const parts = path.replace(/\/$/, '').split('/');
          let current = dirHandle;
          for (const part of parts) {
            current = await ensureDirectory(current, part);
          }
        } else {
          // Write file
          const parts = path.split('/');
          const fileName = parts.pop()!;
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
      addStatus({
        type: 'success',
        text: `SD card write complete. ${presets.length} preset(s) written for ${BOARDS[boardId].label}.`,
      });
    } catch (err) {
      setPhase('error');
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
      <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-4">
        SD Card Writer
      </h3>

      {/* Target Board Selector */}
      <div className="mb-4">
        <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
          Target Board
        </label>
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value as BoardId)}
          disabled={isWorking}
          className="w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-xs
            text-text-primary focus:outline-none focus:border-accent transition-colors
            disabled:opacity-50"
        >
          {Object.values(BOARDS).map((board) => (
            <option key={board.id} value={board.id}>
              {board.label}
            </option>
          ))}
        </select>
        <p className="text-[9px] text-text-muted mt-1">
          Config file: <span className="text-text-secondary">{BOARDS[boardId].configFileName}</span>
        </p>
      </div>

      {/* Preset Selector */}
      <div className="mb-4">
        <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
          Presets to Include
        </label>
        <div className="bg-bg-surface rounded-panel border border-border-subtle p-2 space-y-1">
          {/* Current config */}
          <label className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-bg-primary/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={selectedPresets.has('current')}
              onChange={() => togglePreset('current')}
              disabled={isWorking}
              className="accent-[var(--color-accent)] w-3.5 h-3.5"
            />
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: currentPresetColor }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-text-primary truncate block">
                {config.name ?? 'Current Style'}
              </span>
              <span className="text-[9px] text-text-muted">
                {STYLE_LABELS[config.style] ?? config.style}
              </span>
            </div>
          </label>
        </div>
        <p className="text-[9px] text-text-muted mt-1">
          {selectedPresets.size} preset(s) selected
        </p>
      </div>

      {/* Font Folder Preview */}
      <div className="mb-4">
        <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
          Font Folders
        </label>
        <div className="bg-black/30 rounded border border-border-subtle p-3">
          {selectedPresets.size === 0 ? (
            <p className="text-[10px] text-text-muted italic">No presets selected</p>
          ) : (
            <div className="space-y-1">
              {Array.from(selectedPresets).map((id, i) => {
                const name = id === 'current'
                  ? (config.name ?? 'custom').replace(/\s+/g, '_').toLowerCase()
                  : id;
                return (
                  <div key={id} className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-text-muted">/</span>
                    <span className="text-text-secondary">{name}/</span>
                    <span className="text-text-muted">sound font folder</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-[10px] font-mono mt-1 pt-1 border-t border-border-subtle">
                <span className="text-text-muted">/</span>
                <span className="text-accent">{BOARDS[boardId].configFileName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Method */}
      <div className="mb-4">
        <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
          Output Method
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setOutputMethod('zip')}
            disabled={isWorking}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors border ${
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
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors border ${
              outputMethod === 'card'
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Write to Card
            {!fsApiAvailable && (
              <span className="block text-[8px] text-text-muted font-normal mt-0.5">
                Chrome/Edge only
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Backup Toggle (card mode only) */}
      {outputMethod === 'card' && (
        <div className="mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              disabled={isWorking}
              className="accent-[var(--color-accent)] w-3.5 h-3.5"
            />
            <span className="text-xs text-text-secondary">
              Auto-backup existing config before overwriting
            </span>
          </label>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={outputMethod === 'zip' ? handleDownloadZip : handleWriteToCard}
        disabled={!canWrite}
        className={`w-full py-2.5 rounded text-sm font-semibold transition-colors border ${
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
          <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden border border-border-subtle">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] text-text-muted mt-1 text-right">{progress}%</p>
        </div>
      )}

      {/* Status Messages */}
      {statusMessages.length > 0 && (
        <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
          {statusMessages.map((msg, i) => (
            <div
              key={i}
              className={`text-[10px] px-2.5 py-1.5 rounded flex items-start gap-1.5 ${statusColorClasses(msg.type)}`}
            >
              <span className="shrink-0 mt-px">{statusIcon(msg.type)}</span>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Existing Presets on Card (shown after detection) */}
      {existingPresets.length > 0 && phase !== 'idle' && (
        <div className="mt-3 bg-bg-surface rounded-panel border border-border-subtle p-3">
          <h4 className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
            Existing Presets on Card
          </h4>
          <div className="space-y-0.5">
            {existingPresets.map((p, i) => (
              <div key={i} className="text-[10px] text-text-secondary flex items-center gap-2">
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
          }}
          className="mt-3 w-full py-1.5 rounded text-xs font-medium transition-colors border
            bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
        >
          Reset
        </button>
      )}

      {/* Info Footer */}
      <p className="text-[9px] text-text-muted mt-3">
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

function statusColorClasses(type: StatusMessage['type']): string {
  switch (type) {
    case 'success':
      return 'bg-green-900/20 text-green-400 border border-green-800/30';
    case 'error':
      return 'bg-red-900/20 text-red-400 border border-red-800/30';
    case 'warning':
      return 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/30';
    case 'info':
    default:
      return 'bg-bg-surface text-text-muted border border-border-subtle';
  }
}
