'use client';
import { useMemo, useCallback, useState, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { generateStyleCode, buildConfigFile, parseStyleCode, reconstructConfig } from '@bladeforge/codegen';
import type { ReconstructedConfig } from '@bladeforge/codegen';
import { downloadConfigAsFile, readConfigFromFile } from '@/lib/bladeConfigIO';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
import { generateQRDataUrl, downloadQR } from '@/lib/qrCode';

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
  const [editMode, setEditMode] = useState(false);
  const [showCppImport, setShowCppImport] = useState(false);
  const [cppInput, setCppInput] = useState('');
  const [cppResult, setCppResult] = useState<ReconstructedConfig | null>(null);
  const [cppErrors, setCppErrors] = useState<string[]>([]);
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
          volume: 2000,
          clashThresholdG: 3.0,
          maxClashStrength: 200,
          propFile: 'saber_fett263_buttons.h',
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
  }, [config, presetListEntries, editMode, gestureDefines]);

  const lines = useMemo(() => code.split('\n'), [code]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
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
      const encoded = await encodeConfig(config);
      const url = buildShareUrl(encoded);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }, [config]);

  const handleShowQR = useCallback(async () => {
    try {
      const encoded = await encodeConfig(config);
      const url = buildShareUrl(encoded);
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
      const encoded = await encodeConfig(config);
      const url = buildShareUrl(encoded);
      downloadQR(url, config.name?.replace(/\s+/g, '_') || 'blade_preset');
    } catch {
      // silently fail
    }
  }, [config]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
          {isMultiPreset ? `Full Config (${presetListEntries.length} presets)` : `Generated ${isProffie ? 'ProffieOS' : profileBoard} Code`}
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
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
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
              <span className="text-[#a0b0c8]">{line}</span>
            </div>
          ))}
        </pre>
      </div>

      <p className="text-ui-xs text-text-muted mt-2">
        {!hasCodegen ? (
          `${profileBoard} does not support custom code generation. BladeForge can preview styles, but code export is available for Proffie, CFX, Golden Harvest, and Xenopixel boards.`
        ) : isMultiPreset ? (
          `Complete config for ${profileBoard} with ${presetListEntries.length} preset(s) in order.${isProffie ? ' Ready to flash with ProffieOS 7.x.' : ''}`
        ) : (
          `Generated for ${profileBoard}.${isProffie ? ' Paste into your config.h presets[] array. AST-validated with balanced angle brackets.' : ' Export format depends on board.'}`
        )}
      </p>

      {/* Fett263 Edit Mode Toggle */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="touch-target flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editMode}
                onChange={(e) => setEditMode(e.target.checked)}
                className="w-3 h-3 rounded border-border-subtle accent-[var(--color-accent)]"
              />
              <span className="text-ui-sm font-medium text-text-secondary">
                Fett263 Edit Mode
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
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-3">
          Import / Export / Share
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
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
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
          accept=".json,.bladeforge.json"
          onChange={handleImportConfig}
          aria-label="Import BladeForge config file"
          className="hidden"
        />
        {importError && (
          <p className="text-ui-sm text-red-400 mt-2">{importError}</p>
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
          Export saves your config as a .bladeforge.json file. Share Link copies a URL that
          anyone can open to load your exact configuration. QR Code generates a scannable image.
        </p>
      </div>

      {/* C++ Style Import */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
            Import C++ Style
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
              onChange={(e) => setCppInput(e.target.value)}
              placeholder="Paste ProffieOS C++ style code here, e.g. StylePtr<Layers<AudioFlicker<Rgb<0,0,255>,...>>>()"
              aria-label="ProffieOS C++ style code input"
              className="w-full h-24 bg-black/40 rounded border border-border-subtle p-2 text-ui-base font-mono text-text-secondary placeholder:text-text-muted resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!cppInput.trim()) return;
                  const result = parseStyleCode(cppInput);
                  if (result.ast) {
                    const config = reconstructConfig(result.ast);
                    setCppResult(config);
                    setCppErrors(result.errors.map((e) => e.message));
                  } else {
                    setCppResult(null);
                    setCppErrors(result.errors.map((e) => e.message));
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
                    loadPreset({
                      baseColor: cppResult.baseColor ?? { r: 0, g: 0, b: 255 },
                      clashColor: cppResult.clashColor ?? { r: 255, g: 255, b: 255 },
                      blastColor: cppResult.blastColor ?? { r: 255, g: 255, b: 255 },
                      lockupColor: cppResult.lockupColor ?? { r: 255, g: 255, b: 255 },
                      style: cppResult.style ?? 'stable',
                      ignition: cppResult.ignition ?? 'standard',
                      retraction: cppResult.retraction ?? 'standard',
                      ignitionMs: cppResult.ignitionMs ?? 300,
                      retractionMs: cppResult.retractionMs ?? 800,
                      shimmer: 0,
                      ledCount: config.ledCount || 144,
                    });
                    setShowCppImport(false);
                    setCppInput('');
                    setCppResult(null);
                  }}
                  className="touch-target px-3 py-1.5 rounded text-ui-xs font-medium border bg-green-900/30 border-green-700/50 text-green-400 hover:bg-green-900/50 transition-colors"
                >
                  Apply to Editor
                </button>
              )}
            </div>

            {cppErrors.length > 0 && (
              <div className="text-ui-sm text-yellow-400 bg-yellow-900/20 rounded p-2 border border-yellow-800/30">
                {cppErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            {cppResult && (
              <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-ui-sm text-text-secondary font-medium">Parse Result</span>
                  <span className={`text-ui-xs font-mono px-1.5 py-0.5 rounded ${
                    cppResult.confidence >= 0.7
                      ? 'bg-green-900/30 text-green-400'
                      : cppResult.confidence >= 0.4
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-red-900/30 text-red-400'
                  }`}>
                    {cppResult.confidence >= 0.7 ? 'High' : cppResult.confidence >= 0.4 ? 'Medium' : 'Low'}: {Math.round(cppResult.confidence * 100)}% confidence
                  </span>
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
                  <div className="text-ui-xs text-yellow-400 mt-1">
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
