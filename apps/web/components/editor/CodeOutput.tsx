'use client';
import { useMemo, useCallback, useState, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { generateStyleCode } from '@bladeforge/codegen';
import { downloadConfigAsFile, readConfigFromFile } from '@/lib/bladeConfigIO';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
import { generateQRDataUrl, downloadQR } from '@/lib/qrCode';

export function CodeOutput() {
  const config = useBladeStore((s) => s.config);
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const code = useMemo(() => {
    try {
      return generateStyleCode(config, { comments: true });
    } catch {
      return '// Error generating code — check your configuration';
    }
  }, [config]);

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
    a.download = `${config.name?.replace(/\s+/g, '_') || 'blade_style'}.h`;
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
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold">
          Generated ProffieOS Code
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Download .h
          </button>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
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
        <pre className="p-4 text-[11px] font-mono leading-[1.7] overflow-x-auto whitespace-pre max-h-[400px] overflow-y-auto">
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

      <p className="text-[9px] text-text-muted mt-2">
        Paste into your config.h presets[] array. Compatible with ProffieOS 7.x on Proffieboard V2.2/V3.9.
        AST-validated with balanced angle brackets.
      </p>

      {/* Import / Export / Share */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Import / Export / Share
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportConfig}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Export Config
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
              bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Import Config
          </button>
          <button
            onClick={handleShareLink}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
              shareCopied
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
          >
            {shareCopied ? 'Link Copied!' : 'Share Link'}
          </button>
          <button
            onClick={handleShowQR}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
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
          className="hidden"
        />
        {importError && (
          <p className="text-[10px] text-red-400 mt-2">{importError}</p>
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
                <p className="text-[11px] text-text-secondary mb-2">
                  Scan to load this preset on another device
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadQR}
                    className="px-2 py-1 rounded text-[10px] font-medium border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    Save QR
                  </button>
                  <button
                    onClick={() => setQrDataUrl(null)}
                    className="px-2 py-1 rounded text-[10px] font-medium border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-[9px] text-text-muted mt-2">
          Export saves your config as a .bladeforge.json file. Share Link copies a URL that
          anyone can open to load your exact configuration. QR Code generates a scannable image.
        </p>
      </div>
    </div>
  );
}
