'use client';

import { useState, useCallback } from 'react';
import {
  importXenoSdCard,
  type XenoFontConfig,
  type ImportedXenoConfig,
} from '@/lib/xenopixelImport';

export interface XenoImportPanelProps {
  onApplyFont: (fontIndex: number, config: ImportedXenoConfig) => void;
}

type ImportMode = 'paste' | 'results';

export function XenoImportPanel({ onApplyFont }: XenoImportPanelProps) {
  const [mode, setMode] = useState<ImportMode>('paste');
  const [fontconfigText, setFontconfigText] = useState('');
  const [configIniText, setConfigIniText] = useState('');
  const [result, setResult] = useState<ImportedXenoConfig | null>(null);
  const [selectedFont, setSelectedFont] = useState(0);

  const handleParse = useCallback(() => {
    const files = new Map<string, string>();
    if (fontconfigText.trim()) {
      files.set('fontconfig.ini', fontconfigText);
    }
    if (configIniText.trim()) {
      files.set('set/config.ini', configIniText);
    }

    if (files.size === 0) return;

    const imported = importXenoSdCard(files);
    setResult(imported);
    setSelectedFont(0);
    setMode('results');
  }, [fontconfigText, configIniText]);

  const handleReset = useCallback(() => {
    setMode('paste');
    setResult(null);
    setSelectedFont(0);
  }, []);

  const handleApply = useCallback(() => {
    if (!result || result.fonts.length === 0) return;
    onApplyFont(selectedFont, result);
  }, [result, selectedFont, onApplyFont]);

  if (mode === 'results' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
            Import Results
          </h3>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            ← Back to paste
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[rgb(var(--bg-deep))]/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[rgb(var(--color-accent))]">
              Firmware
            </span>
            <span className="text-xs text-[rgb(var(--text-primary))]">
              v{result.detectedFirmwareVersion} (detected)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[rgb(var(--color-accent))]">
              Fonts
            </span>
            <span className="text-xs text-[rgb(var(--text-primary))]">
              {result.fonts.length} preset{result.fonts.length !== 1 ? 's' : ''} found
            </span>
          </div>
          {result.global.pixelNumber !== 133 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[rgb(var(--color-accent))]">
                LEDs
              </span>
              <span className="text-xs text-[rgb(var(--text-primary))]">
                {result.global.pixelNumber} pixels
              </span>
            </div>
          )}
        </div>

        {result.warnings.length > 0 && (
          <div className="rounded-lg border border-[rgb(var(--status-warn))]/30 bg-[rgb(var(--status-warn))]/5 p-3">
            <p className="text-xs font-medium text-[rgb(var(--status-warn))] mb-1">
              Warnings
            </p>
            <ul className="space-y-0.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-[10px] text-[rgb(var(--text-muted))]">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.fonts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Select a font preset to load:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.fonts.map((font, idx) => (
                <FontRow
                  key={font.fontNumber}
                  font={font}
                  selected={selectedFont === idx}
                  onSelect={() => setSelectedFont(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="w-full rounded-lg bg-[rgb(var(--color-accent))] px-3 py-2 text-xs font-medium text-white transition-colors hover:brightness-110"
            >
              Apply Font {result.fonts[selectedFont]?.fontNumber ?? 1} to Editor
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Import from SD Card
      </h3>
      <p className="text-xs text-[rgb(var(--text-muted))]">
        Paste your Xenopixel SD card config files to import presets into KyberStation.
      </p>

      <div className="space-y-1">
        <label className="text-xs font-mono font-medium text-[rgb(var(--color-accent))]">
          fontconfig.ini
        </label>
        <textarea
          value={fontconfigText}
          onChange={(e) => setFontconfigText(e.target.value)}
          placeholder="font1=(0,0,255),1,0,0,0,0,0,300,500"
          rows={4}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[rgb(var(--bg-deep))]/50 p-2 text-xs font-mono text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))]/50 resize-y"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono font-medium text-[rgb(var(--color-accent))]">
            set/config.ini
          </label>
          <span className="text-[10px] text-[rgb(var(--text-muted))]">
            (optional)
          </span>
        </div>
        <textarea
          value={configIniText}
          onChange={(e) => setConfigIniText(e.target.value)}
          placeholder="pixel_number=133&#10;volume=80&#10;clash_sensitivity=2"
          rows={3}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[rgb(var(--bg-deep))]/50 p-2 text-xs font-mono text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))]/50 resize-y"
        />
      </div>

      <button
        type="button"
        onClick={handleParse}
        disabled={!fontconfigText.trim() && !configIniText.trim()}
        className="w-full rounded-lg bg-[rgb(var(--color-accent))] px-3 py-2 text-xs font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Parse Config
      </button>
    </div>
  );
}

function FontRow({
  font,
  selected,
  onSelect,
}: {
  font: XenoFontConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const { r, g, b } = font.baseColor;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        selected
          ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10'
          : 'border-[var(--border-subtle)] hover:border-[rgb(var(--color-accent))]/50',
      ].join(' ')}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
        style={{ backgroundColor: `rgb(${r},${g},${b})` }}
      />
      <span className="text-xs text-[rgb(var(--text-primary))]">
        Font {font.fontNumber}
      </span>
      <span className="text-[10px] text-[rgb(var(--text-muted))] ml-auto font-mono">
        ({r},{g},{b})
      </span>
    </button>
  );
}
