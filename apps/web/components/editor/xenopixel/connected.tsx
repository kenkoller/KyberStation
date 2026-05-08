'use client';

// ─── Connected Xenopixel panels ─────────────────────────────────────
//
// Thin wrappers that bridge the stateless Xeno* components to the
// blade store (for style/ignition) or to the xenopixelSettingsStore
// (for motion + global settings that don't have Proffie equivalents
// in BladeConfig).
//
// The blade-effect and ignition pickers map between Xenopixel numeric
// IDs and BladeConfig's string-based `style` / `ignition` fields via
// the XENO_BLADE_EFFECTS / XENO_IGNITION_STYLES lookup tables from
// @kyberstation/boards.

import { useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useXenopixelSettingsStore } from '@/stores/xenopixelSettingsStore';
import { XENO_BLADE_EFFECTS } from '@kyberstation/boards';
import { XenoEffectPicker } from './XenoEffectPicker';
import { XenoIgnitionPicker } from './XenoIgnitionPicker';
import { XenoBlasterPicker } from './XenoBlasterPicker';
import { XenoForcePicker } from './XenoForcePicker';
import { XenoMotionPanel } from './XenoMotionPanel';
import { XenoSettingsPanel } from './XenoSettingsPanel';
import { XenoImportPanel } from './XenoImportPanel';
import type { ImportedXenoConfig } from '@/lib/xenopixelImport';

// ─── Blade Effect ↔ BladeConfig.style mapping ──────────────────────

/** Map a BladeConfig.style string to the closest Xenopixel blade effect ID. */
function styleToXenoEffectId(style: string): number {
  const entry = XENO_BLADE_EFFECTS.find((e) => e.kyberStyle === style);
  return entry ? entry.id : 1; // default to Steady (1) if no match
}

/** Map a Xenopixel blade effect ID to a BladeConfig.style string. */
function xenoEffectIdToStyle(id: number): string {
  const entry = XENO_BLADE_EFFECTS.find((e) => e.id === id);
  return entry?.kyberStyle ?? 'stable';
}

// ─── Ignition ↔ BladeConfig.ignition mapping ───────────────────────

/** Map a BladeConfig.ignition string to the closest Xenopixel ignition ID. */
function ignitionToXenoId(ignition: string): number {
  // Blade modes (0-4) + special preon ignitions (5-11)
  const nameMap: Record<string, number> = {
    standard: 0,
    scroll: 1,
    wipe: 2,
    spark: 3,
    ghost: 4,
    stack: 5,
    foldTile: 6,
    word: 7,
    faser: 8,
    scavenger: 9,
    hunter: 10,
    broken: 11,
  };
  if (ignition in nameMap) return nameMap[ignition];
  // For any unmapped ignition, default to Standard (0)
  return 0;
}

/** Map a Xenopixel ignition ID to a BladeConfig.ignition string. */
function xenoIgnitionIdToStyle(id: number): string {
  const nameMap: Record<number, string> = {
    0: 'standard',
    1: 'scroll',
    2: 'wipe',
    3: 'spark',
    4: 'ghost',
    5: 'stack',
    6: 'foldTile',
    7: 'word',
    8: 'faser',
    9: 'scavenger',
    10: 'hunter',
    11: 'broken',
  };
  return nameMap[id] ?? 'standard';
}

// ─── Connected: XenoEffectPicker ────────────────────────────────────

export function XenoEffectPickerConnected() {
  const style = useBladeStore((s) => s.config.style);
  const setStyle = useBladeStore((s) => s.setStyle);

  const selectedEffect = styleToXenoEffectId(style);

  const handleSelect = useCallback(
    (effectId: number) => {
      setStyle(xenoEffectIdToStyle(effectId));
    },
    [setStyle],
  );

  return (
    <XenoEffectPicker
      selectedEffect={selectedEffect}
      onSelectEffect={handleSelect}
    />
  );
}

// ─── Connected: XenoIgnitionPicker ──────────────────────────────────

export function XenoIgnitionPickerConnected() {
  const ignition = useBladeStore((s) => s.config.ignition);
  const setIgnition = useBladeStore((s) => s.setIgnition);

  const selectedIgnition = ignitionToXenoId(ignition);

  const handleSelect = useCallback(
    (ignitionId: number) => {
      setIgnition(xenoIgnitionIdToStyle(ignitionId));
    },
    [setIgnition],
  );

  return (
    <XenoIgnitionPicker
      selectedIgnition={selectedIgnition}
      onSelectIgnition={handleSelect}
    />
  );
}

// ─── Connected: XenoMotionPanel ─────────────────────────────────────
//
// Motion settings are Xenopixel-specific (no Proffie equivalent in
// BladeConfig). State lives in the xenopixelSettingsStore (persisted
// to localStorage) so values survive section navigation.

export function XenoMotionPanelConnected() {
  const motionSettings = useXenopixelSettingsStore((s) => s.motion);
  const updateMotion = useXenopixelSettingsStore((s) => s.updateMotion);
  return <XenoMotionPanel settings={motionSettings} onSettingsChange={updateMotion} />;
}

// ─── Connected: XenoSettingsPanel ───────────────────────────────────
//
// Global settings are Xenopixel-specific. Persisted via the
// xenopixelSettingsStore so values survive section navigation.

export function XenoSettingsPanelConnected() {
  const globalSettings = useXenopixelSettingsStore((s) => s.global);
  const updateGlobal = useXenopixelSettingsStore((s) => s.updateGlobal);
  return <XenoSettingsPanel settings={globalSettings} onSettingsChange={updateGlobal} />;
}

// ─── Connected: XenoBlasterPicker ──────────────────────────────────
//
// Blaster effect is Xenopixel-specific (fontconfig.ini "B" field).
// Persisted via the xenopixelSettingsStore.

export function XenoBlasterPickerConnected() {
  const blasterEffect = useXenopixelSettingsStore((s) => s.global.blasterEffect);
  const updateGlobal = useXenopixelSettingsStore((s) => s.updateGlobal);
  const globalSettings = useXenopixelSettingsStore((s) => s.global);

  const handleSelect = useCallback(
    (id: number) => {
      updateGlobal({ ...globalSettings, blasterEffect: id });
    },
    [updateGlobal, globalSettings],
  );

  return (
    <XenoBlasterPicker
      selectedBlaster={blasterEffect}
      onSelectBlaster={handleSelect}
    />
  );
}

// ─── Connected: XenoForcePicker ────────────────────────────────────
//
// Force effect is Xenopixel-specific (fontconfig.ini "C" field).
// Persisted via the xenopixelSettingsStore.

export function XenoForcePickerConnected() {
  const forceEffect = useXenopixelSettingsStore((s) => s.global.forceEffect);
  const updateGlobal = useXenopixelSettingsStore((s) => s.updateGlobal);
  const globalSettings = useXenopixelSettingsStore((s) => s.global);

  const handleSelect = useCallback(
    (id: number) => {
      updateGlobal({ ...globalSettings, forceEffect: id });
    },
    [updateGlobal, globalSettings],
  );

  return (
    <XenoForcePicker
      selectedForce={forceEffect}
      onSelectForce={handleSelect}
    />
  );
}

// ─── Connected: XenoImportPanel ───────────────────────────────────
//
// Bridges the stateless import panel to bladeStore (loadPreset) and
// xenopixelSettingsStore (updateMotion + updateGlobal) so a parsed
// SD card config can be applied in one click.

export function XenoImportPanelConnected() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const updateMotion = useXenopixelSettingsStore((s) => s.updateMotion);
  const updateGlobal = useXenopixelSettingsStore((s) => s.updateGlobal);

  const handleApply = useCallback(
    (fontIndex: number, imported: ImportedXenoConfig) => {
      const bladeConfig = imported.bladeConfigs[fontIndex];
      if (bladeConfig) {
        loadPreset({ ...bladeConfig, modulation: undefined });
      }

      const g = imported.global;
      updateGlobal({
        volume: g.volume,
        clashSensitivity: g.clashSensitivity,
        flashOnClash: g.flashOnClash,
        pixelNumber: g.pixelNumber,
        velocityMode: g.velocityMode,
        torchMode: g.torchMode,
        multiblockMode: g.multiblockMode,
        multilockMode: g.multilockMode,
        lightningBlockMode: g.lightningBlockMode,
        blasterMode: g.blasterMode,
        ghostMode: g.ghostMode,
        powerOnTime: g.powerOnTime,
        powerOffTime: g.powerOffTime,
        countdown: g.countdown,
        blasterEffect: imported.fonts[fontIndex]?.blasterEffect ?? 0,
        forceEffect: imported.fonts[fontIndex]?.forceEffect ?? 0,
      });

      updateMotion({
        motionControl: g.motionControl,
        swingOn: g.swingOn,
        swingSensitivity: g.swingSensitivity,
        twistOn: g.twistOn,
        twistOff: g.twistOff,
        twistSensitivity: g.twistSensitivity,
        pullPushOn: g.pullPushOn,
        pushPullOff: g.pushPullOff,
        pushSensitivity: g.pushSensitivity,
        pullSensitivity: g.pullSensitivity,
      });
    },
    [loadPreset, updateGlobal, updateMotion],
  );

  return <XenoImportPanel onApplyFont={handleApply} />;
}
