'use client';
import { useMemo, useCallback, useState, useRef } from 'react';
import { playUISound } from '@/lib/uiSounds';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { generateStyleCode, buildConfigFile, parseStyleCode, reconstructConfig } from '@kyberstation/codegen';
import type { ReconstructedConfig } from '@kyberstation/codegen';
import type { BladeConfig } from '@kyberstation/engine';
import { downloadConfigAsFile, readConfigFromFile } from '@/lib/bladeConfigIO';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';
import { generateQRDataUrl, downloadQR } from '@/lib/qrCode';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ErrorState } from '@/components/shared/ErrorState';
import { FilenameReveal } from '@/hooks/useFilenameReveal';
import { toast } from '@/lib/toastManager';
import { ImportStatusBanner } from './ImportStatusBanner';
import {
  detectConfigShape,
  extractFirstStylePtr,
  type ConfigShape,
} from '@/lib/import/configShapeDetect';

/**
 * Map a `ReconstructedConfig` (output of `reconstructConfig`) into a full
 * `BladeConfig` suitable for `loadPreset`. Previously the Apply button
 * inlined this conversion but only passed the base 11 fields — dropping
 * spatial lockup, spatial blast, Preon, and extended colours silently on
 * import round-trip. Centralising + widening here means a single file edit
 * whenever BladeConfig gains a new field the reconstructor recovers.
 *
 * **Import preservation (Phase 2B, 2026-05-02):** when `rawCode` is
 * supplied, the BladeConfig also carries `importedRawCode` /
 * `importedAt` / `importedSource` fields. The codegen export path
 * detects these and re-emits `rawCode` verbatim instead of regenerating
 * from BladeConfig — the only way a Fett263 OS7 import can survive the
 * round-trip without losing templates KyberStation's reconstructor
 * doesn't recognize. The "Convert to Native" button in the OUTPUT
 * panel's import banner strips these fields when the user is ready to
 * trade fidelity for full editability.
 */
export function applyReconstructedConfig(
  cppResult: ReconstructedConfig,
  ledCount: number,
  rawCode?: string,
  source?: string,
): BladeConfig {
  const trimmedRaw = rawCode?.trim() ?? '';
  const hasRawCode = trimmedRaw.length > 0;
  return {
    baseColor: cppResult.baseColor ?? { r: 0, g: 0, b: 255 },
    clashColor: cppResult.clashColor ?? { r: 255, g: 255, b: 255 },
    blastColor: cppResult.blastColor ?? { r: 255, g: 255, b: 255 },
    lockupColor: cppResult.lockupColor ?? { r: 255, g: 255, b: 255 },
    // Extended effect colours — recovered by container resolution.
    dragColor: cppResult.dragColor,
    lightningColor: cppResult.lightningColor,
    meltColor: cppResult.meltColor,
    style: cppResult.style ?? 'stable',
    ignition: cppResult.ignition ?? 'standard',
    retraction: cppResult.retraction ?? 'standard',
    ignitionMs: cppResult.ignitionMs ?? 300,
    retractionMs: cppResult.retractionMs ?? 800,
    // Spatial effects (Edit Mode).
    lockupPosition: cppResult.lockupPosition,
    lockupRadius: cppResult.lockupRadius,
    blastPosition: cppResult.blastPosition,
    blastRadius: cppResult.blastRadius,
    dragPosition: cppResult.dragPosition,
    dragRadius: cppResult.dragRadius,
    meltPosition: cppResult.meltPosition,
    meltRadius: cppResult.meltRadius,
    stabPosition: cppResult.stabPosition,
    stabRadius: cppResult.stabRadius,
    // Preon — pre-ignition flash.
    preonEnabled: cppResult.preonEnabled,
    preonColor: cppResult.preonColor,
    preonMs: cppResult.preonMs,
    shimmer: 0,
    ledCount: ledCount || 144,
    ...(hasRawCode
      ? {
          importedRawCode: trimmedRaw,
          importedAt: Date.now(),
          importedSource: source ?? 'Pasted ProffieOS C++',
        }
      : {}),
  };
}

/** Maps user-facing board names to Proffie config board IDs */
const PROFFIE_BOARD_MAP: Record<string, 'proffieboard_v2' | 'proffieboard_v3'> = {
  'Proffie V3': 'proffieboard_v3',
  'Proffie V2': 'proffieboard_v2',
  'Proffie Lite': 'proffieboard_v2',
  'Proffie Clone': 'proffieboard_v2',
};

/** Boards that support some form of code/config generation */
const BOARDS_WITH_CODEGEN = new Set([
  ...Object.keys(PROFFIE_BOARD_MAP),
  'CFX', 'GH V4', 'GH V3', 'Xenopixel V3', 'Xenopixel V2',
]);

export function CodeOutput() {
  const config = useBladeStore((s) => s.config);
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const presetListEntries = usePresetListStore((s) => s.entries);
  const activeProfile = useSaberProfileStore((s) => s.getActiveProfile());
  const profileBoard = activeProfile?.boardType ?? 'Proffie V3';
  const proffieBoardType = PROFFIE_BOARD_MAP[profileBoard] ?? 'proffieboard_v3';
  const isProffie = profileBoard in PROFFIE_BOARD_MAP;
  const hasCodegen = BOARDS_WITH_CODEGEN.has(profileBoard);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Edit Mode moved from local useState to the shared uiStore so the blade
  // canvas can also toggle it (see Phase 5). Legacy behaviour preserved: the
  // existing "Fett263 Edit Mode" checkbox in this panel still controls the
  // same flag.
  const editMode = useUIStore((s) => s.editMode);
  const setEditMode = useUIStore((s) => s.setEditMode);
  const [volume, setVolume] = useState(1500);
  const [showCppImport, setShowCppImport] = useState(false);
  const [cppInput, setCppInput] = useState('');
  const [cppResult, setCppResult] = useState<ReconstructedConfig | null>(null);
  const [cppErrors, setCppErrors] = useState<string[]>([]);
  const [cppWarnings, setCppWarnings] = useState<string[]>([]);
  const [cppConfigShape, setCppConfigShape] = useState<ConfigShape | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMultiPreset = presetListEntries.length > 0;

  // Merge gesture defines from config with base Fett263 defines
  const gestureDefines = (config.gestureDefines as string[] | undefined) ?? [];

  const code = useMemo(() => {
    try {
      if (presetListEntries.length > 0) {
        // Generate full config.h with all presets from the list
        const presets = presetListEntries.map((entry) => {
          const styleCode = generateStyleCode(entry.config, { comments: false, editMode });
          return {
            fontName: entry.fontName,
            styleCodes: [styleCode],
            presetName: entry.presetName,
          };
        });

        // Build combined Fett263 defines: base + gesture panel selections
        const baseDefines = [
          'MOTION_TIMEOUT 60 * 15 * 1000',
        ];
        if (editMode) {
          baseDefines.push('FETT263_EDIT_MODE_MENU');
        }
        const allDefines = [...baseDefines, ...gestureDefines];

        return buildConfigFile({
          boardType: proffieBoardType,
          numBlades: 1,
          numButtons: 2,
          volume,
          clashThresholdG: 3.0,
          maxClashStrength: 200,
          propFile: (config.propFile as string | undefined) ?? 'saber_fett263_buttons.h',
          fett263Defines: allDefines,
          presets,
          bladeConfig: [
            {
              type: 'ws281x',
              ledCount: config.ledCount || 144,
              pin: 'bladePin',
              colorOrder: 'Color8::GRB',
              powerPins: ['bladePowerPin2', 'bladePowerPin3'],
            },
          ],
        });
      }
      return generateStyleCode(config, { comments: true, editMode });
    } catch {
      return '// Error generating code — check your configuration';
    }
  }, [config, presetListEntries, editMode, gestureDefines, volume]);

  const lines = useMemo(() => code.split('\n'), [code]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      playUISound('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      playUISound('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isMultiPreset ? 'config.h' : `${config.name?.replace(/\s+/g, '_') || 'blade_style'}.h`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, config.name]);

  const handleExportConfig = useCallback(() => {
    downloadConfigAsFile(config);
  }, [config]);

  const handleImportConfig = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const imported = await readConfigFromFile(file);
      loadPreset(imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import config');
    }
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [loadPreset]);

  const handleShareLink = useCallback(async () => {
    try {
      const glyph = encodeGlyphFromConfig(config);
      const url = `${window.location.origin}/editor?s=${glyph}`;
      await navigator.clipboard.writeText(url);
      playUISound('copy');
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }, [config]);

  const handleShowQR = useCallback(async () => {
    try {
      const glyph = encodeGlyphFromConfig(config);
      const url = `${window.location.origin}/editor?s=${glyph}`;
      // QR codes are machine-read — use fixed high-contrast colours
      // rather than theme tokens so scanners consistently recognise them
      // regardless of which UI theme is active.
      const dataUrl = generateQRDataUrl(url, {
        size: 256,
        fgColor: '#ffffff',
        bgColor: '#0a0a10',
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  }, [config]);

  const handleDownloadQR = useCallback(async () => {
    try {
      const glyph = encodeGlyphFromConfig(config);
      const url = `${window.location.origin}/editor?s=${glyph}`;
      downloadQR(url, config.name?.replace(/\s+/g, '_') || 'blade_preset');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`QR download failed: ${msg}`);
    }
  }, [config]);

  // Derived identifier for BR2049 hero header treatment.
  const styleIdentifier = useMemo(() => {
    if (isMultiPreset) return `config.h / ${presetListEntries.length} PRESETS`;
    const styleName = (config.name ?? config.style ?? 'blade_style')
      .toString()
      .replace(/\s+/g, '_')
      .toLowerCase();
    return `${styleName}.h`;
  }, [isMultiPreset, presetListEntries.length, config.name, config.style]);

  const codeLineCount = lines.length;
  const codeByteCount = code.length;

  return (
    <div>
      {/* BR2049-scale display header — identifier + proffie version strip */}
      <div className="mb-3 px-3 py-3 bg-black/40 rounded-panel border border-border-subtle">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-ui-xs uppercase tracking-widest text-text-muted font-mono">
              Generated
            </div>
            {/* filenameReveal() — re-mounts on identifier change to replay CSS stagger. */}
            <FilenameReveal
              key={styleIdentifier}
              text={styleIdentifier}
              className="block font-mono font-bold uppercase truncate leading-none tracking-tight text-accent"
              style={{ fontSize: 'clamp(20px, 3.2vw, 34px)', marginTop: '4px' }}
              title={styleIdentifier}
            />
          </div>
          <div className="text-ui-xs font-mono text-text-muted tabular-nums shrink-0 flex flex-col items-end gap-0.5">
            <span>ProffieOS 7.x / {profileBoard}</span>
            <span className="text-text-secondary">
              {codeLineCount} LINES · {(codeByteCount / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </div>

      {/* Helper text for non-technical users */}
      <div className="mb-3 px-3 py-2.5 bg-bg-surface rounded-lg border border-border-subtle">
        <p className="text-ui-xs text-text-secondary leading-relaxed">
          This is the generated configuration code for your {isProffie ? 'Proffieboard' : profileBoard}.
          <span className="text-text-muted"> You don&apos;t need to understand C++ &mdash; KyberStation
          writes this automatically from your design choices. Use the Card Writer panel to export
          everything to your SD card, or download the .h file below if you prefer manual setup.</span>
        </p>
      </div>

      {/* Imported-config status banner. Renders only when
          config.importedRawCode is set (paste-in import flow). */}
      <ImportStatusBanner />

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
          {isMultiPreset ? `Full Config (${presetListEntries.length} presets)` : `Generated ${isProffie ? 'ProffieOS' : profileBoard} Code`}
          <HelpTooltip text="AST-validated ProffieOS C++ code generated from your current configuration. Copy and paste into your config.h presets[] array, or download as a .h file. Multi-preset mode generates a complete config.h ready to flash." proffie="StylePtr<Layers<...>>" />
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            aria-label="Download generated code as .h file"
            className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Download .h
          </button>
          <button
            onClick={handleCopy}
            aria-label="Copy generated code to clipboard"
            className={`touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border ${
              copied
                ? ''
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
            style={
              copied
                ? {
                    background: 'rgb(var(--status-ok) / 0.2)',
                    borderColor: 'rgb(var(--status-ok) / 0.5)',
                    color: 'rgb(var(--status-ok))',
                  }
                : undefined
            }
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      <div className="bg-black/40 rounded-panel border border-border-subtle overflow-hidden">
        <pre className="p-4 text-ui-base font-mono leading-[1.7] overflow-x-auto whitespace-pre max-h-[400px] overflow-y-auto">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="inline-block w-8 text-right text-text-muted select-none mr-4 shrink-0">
                {i + 1}
              </span>
              <span className="text-text-secondary">{line}</span>
            </div>
          ))}
        </pre>
      </div>

      <p className="text-ui-xs text-text-muted mt-2">
        {!hasCodegen ? (
          `${profileBoard} does not support custom code generation. KyberStation can preview styles, but code export is available for Proffie, CFX, Golden Harvest, and Xenopixel boards.`
        ) : isMultiPreset ? (
          `Complete config for ${profileBoard} with ${presetListEntries.length} preset(s) in order.${isProffie ? ' Ready to flash with ProffieOS 7.x.' : ''}`
        ) : (
          `Generated for ${profileBoard}.${isProffie ? ' Paste into your config.h presets[] array. AST-validated with balanced angle brackets.' : ' Export format depends on board.'}`
        )}
      </p>

      {/* Volume Control — only relevant when generating a full config */}
      {isMultiPreset && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <label htmlFor="volume-slider" className="text-ui-sm font-medium text-text-secondary shrink-0 flex items-center gap-1">
              Volume
              <HelpTooltip text="Master volume written into config.h. ProffieOS range is 0–3000. Default 1500 is safe for most speakers; lower if your speaker distorts, raise only if you've confirmed your speaker can handle it." proffie="VOLUME" />
            </label>
            <input
              id="volume-slider"
              type="range"
              min={500}
              max={3000}
              step={50}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-ui-sm font-mono text-text-muted w-12 text-right tabular-nums">{volume}</span>
          </div>
          <p className="text-ui-xs text-text-muted mt-1">
            Outputs <code className="font-mono">#define VOLUME {volume}</code> in CONFIG_TOP. Range 500–3000.
          </p>
        </div>
      )}

      {/* Fett263 Edit Mode Toggle */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="touch-target flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editMode}
                onChange={(e) => setEditMode(e.target.checked)}
                className="w-3 h-3 rounded border-border-subtle accent-accent"
              />
              <span className="text-ui-sm font-medium text-text-secondary flex items-center gap-1">
                Fett263 Edit Mode
                <HelpTooltip text="Wraps color values in RgbArg<>/IntArg<> so you can change colors directly on the saber without re-uploading config. Requires Fett263 prop file. See also: Gesture Control Panel for button mapping." proffie="FETT263_EDIT_MODE_MENU" />
              </span>
            </label>
          </div>
          {editMode && (
            <span className="text-ui-xs text-accent">
              RgbArg / IntArg wrappers active
            </span>
          )}
        </div>
        <p className="text-ui-xs text-text-muted mt-1">
          {editMode
            ? 'Colors wrapped in RgbArg<> for on-saber editing without re-uploading config. Requires Fett263 prop file.'
            : 'Enable to wrap colors in RgbArg<>/IntArg<> for on-saber color editing with Fett263 Edit Mode.'}
        </p>
        {gestureDefines.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {gestureDefines.map((d) => (
              <span
                key={d}
                className="text-ui-xs font-mono text-accent bg-accent-dim px-1.5 py-0.5 rounded"
              >
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Import / Export / Share */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3 flex items-center gap-1">
          Import / Export / Share
          <HelpTooltip text="Export your config as a .kyberstation.json file for backup, share via URL (Kyber Code), or generate a QR code. Import loads a previously exported config or one shared by another user." />
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportConfig}
            className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Export Config
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Import Config
          </button>
          <button
            onClick={handleShareLink}
            className={`touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border ${
              shareCopied
                ? ''
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
            style={
              shareCopied
                ? {
                    background: 'rgb(var(--status-ok) / 0.2)',
                    borderColor: 'rgb(var(--status-ok) / 0.5)',
                    color: 'rgb(var(--status-ok))',
                  }
                : undefined
            }
          >
            {shareCopied ? 'Link Copied!' : 'Share Link'}
          </button>
          <button
            onClick={handleShowQR}
            className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            QR Code
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.kyberstation.json"
          onChange={handleImportConfig}
          aria-label="Import KyberStation config file"
          className="hidden"
        />
        {importError && (
          <div className="mt-2">
            <ErrorState
              variant="import-failed"
              message={importError}
              onRetry={() => {
                setImportError(null);
                fileInputRef.current?.click();
              }}
              compact
            />
          </div>
        )}

        {/* QR Code Display */}
        {qrDataUrl && (
          <div className="mt-3 p-3 bg-bg-surface rounded-panel border border-border-subtle">
            <div className="flex items-start gap-3">
              <img
                src={qrDataUrl}
                alt="QR Code for blade preset"
                className="w-32 h-32 rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-ui-base text-text-secondary mb-2">
                  Scan to load this preset on another device
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadQR}
                    aria-label="Download QR code image"
                    className="touch-target px-2 py-1 rounded text-ui-sm font-medium border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    Save QR
                  </button>
                  <button
                    onClick={() => setQrDataUrl(null)}
                    aria-label="Close QR code panel"
                    className="touch-target px-2 py-1 rounded text-ui-sm font-medium border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-ui-xs text-text-muted mt-2">
          Export saves your config as a .kyberstation.json file. Share Link copies a URL that
          anyone can open to load your exact configuration. QR Code generates a scannable image.
        </p>
      </div>

      {/* C++ Style Import */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
            Import C++ Style
            <HelpTooltip text="Paste existing ProffieOS C++ style code to reverse-engineer it into KyberStation. The parser extracts colors, style type, ignition, and retraction settings. Confidence score indicates how complete the reconstruction is." proffie="StylePtr<...>" />
          </h3>
          <button
            onClick={() => setShowCppImport(!showCppImport)}
            className="touch-target px-2 py-1 rounded text-ui-sm font-medium border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
          >
            {showCppImport ? 'Close' : 'Paste C++'}
          </button>
        </div>

        {showCppImport && (
          <div className="space-y-2">
            <textarea
              value={cppInput}
              onChange={(e) => {
                setCppInput(e.target.value);
                // Clear stale config-shape state on edit so the
                // "Detected N presets" notice doesn't linger after
                // the user paste-overwrites with a different blob.
                setCppConfigShape(null);
              }}
              placeholder="Paste ProffieOS C++ style code here, e.g. StylePtr<Layers<AudioFlicker<Rgb<0,0,255>,...>>>() — or paste your entire config.h file"
              aria-label="ProffieOS C++ style code input"
              className="w-full h-24 bg-black/40 rounded border border-border-subtle p-2 text-ui-base font-mono text-text-secondary placeholder:text-text-muted resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!cppInput.trim()) return;
                  // Detect whether the pasted blob is a full config.h
                  // (with #ifdef wrapping + multi-preset Preset[]) or
                  // a naked StylePtr<...>(). For full configs, parse
                  // ONLY the first style template so the visualizer
                  // gets a clean reconstruction; the export path
                  // separately preserves the FULL pasted text via
                  // applyReconstructedConfig's rawCode parameter.
                  const shape = detectConfigShape(cppInput);
                  setCppConfigShape(shape);
                  const codeForParser = shape.isFullConfig
                    ? extractFirstStylePtr(cppInput) ?? cppInput
                    : cppInput;
                  const result = parseStyleCode(codeForParser);
                  setCppErrors(result.errors.map((e) => e.message));
                  setCppWarnings(
                    result.warnings?.map((w) => w.message) ?? [],
                  );
                  if (result.ast) {
                    setCppResult(reconstructConfig(result.ast));
                  } else {
                    setCppResult(null);
                  }
                }}
                className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium border bg-accent-dim border-accent-border text-accent hover:bg-accent/20 transition-colors"
              >
                Parse
              </button>
              {cppResult && (
                <button
                  onClick={() => {
                    if (!cppResult) return;
                    loadPreset(
                      applyReconstructedConfig(
                        cppResult,
                        config.ledCount || 144,
                        cppInput,
                        'Pasted ProffieOS C++',
                      ),
                    );
                    setShowCppImport(false);
                    setCppInput('');
                    setCppResult(null);
                    setCppErrors([]);
                    setCppWarnings([]);
                    setCppConfigShape(null);
                  }}
                  className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium border"
                  style={{
                    background: 'rgb(var(--status-ok) / 0.2)',
                    borderColor: 'rgb(var(--status-ok) / 0.5)',
                    color: 'rgb(var(--status-ok))',
                  }}
                >
                  Apply to Editor
                </button>
              )}
            </div>

            {/* Multi-preset detection notice — surfaces when the
                user pasted a full config.h with multiple presets.
                The visualizer reconstructs from the FIRST preset
                only (Step 2 of Sprint 5); full multi-preset
                extraction with per-preset library entries lands
                in Sprint 5D. The full original code is preserved
                verbatim on export regardless. */}
            {cppConfigShape?.isFullConfig && (
              <div
                role="note"
                data-testid="multi-preset-detection-notice"
                className="text-ui-sm rounded p-2 border"
                style={{
                  color: 'rgb(var(--badge-creative))',
                  background: 'rgb(var(--badge-creative) / 0.1)',
                  borderColor: 'rgb(var(--badge-creative) / 0.4)',
                }}
              >
                <div className="font-semibold mb-1">
                  Detected full config.h
                  {cppConfigShape.styleCount > 1
                    ? ` with ${cppConfigShape.styleCount} presets`
                    : ''}
                </div>
                <div className="text-ui-xs leading-relaxed text-text-secondary">
                  {cppConfigShape.styleCount > 1 ? (
                    <>
                      The visualizer is showing preset 1 only.
                      Your full config will be preserved verbatim
                      on export so it&apos;s flashable as-is.
                      Multi-preset library extraction with
                      per-preset switching is coming soon.
                    </>
                  ) : (
                    <>
                      The full file (including <code>#ifdef</code>{' '}
                      blocks and <code>#define</code> directives) is
                      preserved verbatim on export.
                    </>
                  )}
                </div>
              </div>
            )}

            {cppErrors.length > 0 && (
              <div
                className="text-ui-sm rounded p-2 border"
                style={{
                  color: 'rgb(var(--status-error))',
                  background: 'rgb(var(--status-error) / 0.12)',
                  borderColor: 'rgb(var(--status-error) / 0.35)',
                }}
              >
                <div className="font-semibold mb-1">Errors:</div>
                {cppErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            {cppWarnings.length > 0 && (
              <div
                className="text-ui-sm rounded p-2 border"
                style={{
                  color: 'rgb(var(--status-warn))',
                  background: 'rgb(var(--status-warn) / 0.12)',
                  borderColor: 'rgb(var(--status-warn) / 0.35)',
                }}
              >
                <div className="font-semibold mb-1">Warnings ({cppWarnings.length}):</div>
                {cppWarnings.slice(0, 10).map((w, i) => <div key={i}>{w}</div>)}
                {cppWarnings.length > 10 && (
                  <div className="opacity-70 mt-1">
                    + {cppWarnings.length - 10} more…
                  </div>
                )}
              </div>
            )}

            {cppResult && (
              <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-ui-sm text-text-secondary font-medium">Parse Result</span>
                  {(() => {
                    const statusVar =
                      cppResult.confidence >= 0.7
                        ? '--status-ok'
                        : cppResult.confidence >= 0.4
                          ? '--status-warn'
                          : '--status-error';
                    return (
                      <span
                        className="text-ui-xs font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: `rgb(var(${statusVar}) / 0.2)`,
                          color: `rgb(var(${statusVar}))`,
                        }}
                      >
                        {cppResult.confidence >= 0.7
                          ? 'High'
                          : cppResult.confidence >= 0.4
                            ? 'Medium'
                            : 'Low'}
                        : {Math.round(cppResult.confidence * 100)}% confidence
                      </span>
                    );
                  })()}
                </div>
                <div className="text-ui-sm text-text-muted space-y-0.5">
                  <div>Style: <span className="text-text-secondary">{cppResult.style}</span></div>
                  {cppResult.baseColor && (
                    <div className="flex items-center gap-1">
                      Base:
                      <span
                        className="inline-block w-3 h-3 rounded border border-border-subtle"
                        style={{ backgroundColor: `rgb(${cppResult.baseColor.r},${cppResult.baseColor.g},${cppResult.baseColor.b})` }}
                      />
                      <span className="text-text-secondary font-mono">
                        {cppResult.baseColor.r},{cppResult.baseColor.g},{cppResult.baseColor.b}
                      </span>
                    </div>
                  )}
                  <div>Ignition: <span className="text-text-secondary">{cppResult.ignition} ({cppResult.ignitionMs}ms)</span></div>
                  <div>Retraction: <span className="text-text-secondary">{cppResult.retraction} ({cppResult.retractionMs}ms)</span></div>
                </div>
                {cppResult.warnings.length > 0 && (
                  <div
                    className="text-ui-xs mt-1"
                    style={{ color: 'rgb(var(--status-warn))' }}
                  >
                    {cppResult.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
