'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useXenopixelSettingsStore } from '@/stores/xenopixelSettingsStore';
import { XENO_BLADE_EFFECTS, XENO_IGNITION_STYLES } from '@kyberstation/boards';

export interface XenoConfigPreviewProps {
  fontNumber?: number;
}

function xenoStyleId(style: string): number {
  const entry = XENO_BLADE_EFFECTS.find((e) => e.kyberStyle === style);
  return entry ? entry.id : 1;
}

function xenoIgnitionId(ignition: string): number {
  const nameMap: Record<string, number> = {
    standard: 0, scroll: 1, wipe: 2, spark: 3,
    ghost: 4, stack: 5, foldTile: 6, word: 7,
    faser: 8, scavenger: 9, hunter: 10, broken: 11,
  };
  return nameMap[ignition] ?? 0;
}

export function XenoConfigPreview({ fontNumber = 1 }: XenoConfigPreviewProps) {
  const config = useBladeStore((s) => s.config);
  const globalSettings = useXenopixelSettingsStore((s) => s.global);
  const motionSettings = useXenopixelSettingsStore((s) => s.motion);

  const fontconfigIni = useMemo(() => {
    const r = Math.max(0, Math.min(255, Math.round(config.baseColor.r)));
    const g = Math.max(0, Math.min(255, Math.round(config.baseColor.g)));
    const b = Math.max(0, Math.min(255, Math.round(config.baseColor.b)));

    const A = xenoStyleId(config.style);
    const B = globalSettings.blasterEffect;
    const C = globalSettings.forceEffect;
    const D = 0;
    const E = 0;
    const F = xenoIgnitionId(config.ignition);
    const G = config.ignitionMs ?? 200;
    const H = config.retractionMs ?? 500;

    return `font${fontNumber}=(${r},${g},${b}),${A},${B},${C},${D},${E},${F},${G},${H}`;
  }, [config, globalSettings.blasterEffect, globalSettings.forceEffect, fontNumber]);

  const configIni = useMemo(() => {
    const g = globalSettings;
    const m = motionSettings;
    const lines: string[] = [];
    lines.push(`pixel_number=${g.pixelNumber}`);
    lines.push(`motion_control=${m.motionControl ? 1 : 0}`);
    lines.push(`swing_on=${m.swingOn ? 1 : 0}`);
    lines.push(`swing_sensitivity=${m.swingSensitivity}`);
    lines.push(`twist_on=${m.twistOn ? 1 : 0}`);
    lines.push(`twist_off=${m.twistOff ? 1 : 0}`);
    lines.push(`twist_sensitivity=${m.twistSensitivity}`);
    lines.push(`volume=${g.volume}`);
    lines.push(`clash_sensitivity=${g.clashSensitivity}`);
    lines.push(`flash_on_clash=${g.flashOnClash ? 1 : 0}`);
    lines.push(`PowerOnTime=${g.powerOnTime}`);
    lines.push(`PowerOffTime=${g.powerOffTime}`);
    return lines.join('\n');
  }, [globalSettings, motionSettings]);

  const fontconfigAnnotation = useMemo(() => {
    const A = xenoStyleId(config.style);
    const F = xenoIgnitionId(config.ignition);
    const bladeEffectName = XENO_BLADE_EFFECTS.find((e) => e.id === A)?.name ?? `Effect ${A}`;
    const ignitionName = XENO_IGNITION_STYLES.find((s) => s.id === F)?.name ?? `Ignition ${F}`;

    return [
      `A (Blade Effect): ${A} — ${bladeEffectName}`,
      `B (Blaster):      ${globalSettings.blasterEffect}`,
      `C (Force):        ${globalSettings.forceEffect}`,
      `F (Ignition):     ${F} — ${ignitionName}`,
      `G (Ignite ms):    ${config.ignitionMs ?? 200}`,
      `H (Retract ms):   ${config.retractionMs ?? 500}`,
    ].join('\n');
  }, [config, globalSettings.blasterEffect, globalSettings.forceEffect]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Config Preview
      </h3>
      <p className="text-xs text-[rgb(var(--text-muted))]">
        Live preview of the INI files that will be written to the SD card.
      </p>

      {/* fontconfig.ini */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-[rgb(var(--color-accent))]">
            fontconfig.ini
          </span>
          <span className="text-xs text-[rgb(var(--text-muted))]">
            (per-font preset line)
          </span>
        </div>
        <pre className="rounded-lg border border-[var(--border-subtle)] bg-[rgb(var(--bg-deep))]/50 p-3 text-xs font-mono text-[rgb(var(--text-primary))] overflow-x-auto whitespace-pre">
          {fontconfigIni}
        </pre>
        <pre className="rounded-lg border border-[var(--border-subtle)]/50 bg-transparent p-2 text-[10px] font-mono text-[rgb(var(--text-muted))] overflow-x-auto whitespace-pre leading-relaxed">
          {fontconfigAnnotation}
        </pre>
      </div>

      {/* config.ini */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-[rgb(var(--color-accent))]">
            set/config.ini
          </span>
          <span className="text-xs text-[rgb(var(--text-muted))]">
            (global settings)
          </span>
        </div>
        <pre className="rounded-lg border border-[var(--border-subtle)] bg-[rgb(var(--bg-deep))]/50 p-3 text-xs font-mono text-[rgb(var(--text-primary))] overflow-x-auto whitespace-pre max-h-48 overflow-y-auto">
          {configIni}
        </pre>
      </div>
    </div>
  );
}
