'use client';

// ─── Connected Xenopixel panels ─────────────────────────────────────
//
// Thin wrappers that bridge the stateless Xeno* components to the
// blade store (for style/ignition) or to component-local state (for
// motion settings and global settings, which don't have Proffie
// equivalents in BladeConfig).
//
// The blade-effect and ignition pickers map between Xenopixel numeric
// IDs and BladeConfig's string-based `style` / `ignition` fields via
// the XENO_BLADE_EFFECTS / XENO_IGNITION_STYLES lookup tables from
// @kyberstation/boards.

import { useState, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { XENO_BLADE_EFFECTS } from '@kyberstation/boards';
import { XenoEffectPicker } from './XenoEffectPicker';
import { XenoIgnitionPicker } from './XenoIgnitionPicker';
import { XenoMotionPanel, type XenoMotionSettings } from './XenoMotionPanel';
import { XenoSettingsPanel, type XenoGlobalSettings } from './XenoSettingsPanel';

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
  // Blade modes (0-4) have direct name mappings
  const nameMap: Record<string, number> = {
    standard: 0,
    scroll: 1,
    wipe: 2,
    spark: 3,
    ghost: 4,
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
// BladeConfig). State lives in component-local useState for now;
// persisted to the xenopixel config.ini via the zip exporter at
// export time. A dedicated xenopixelStore is a future follow-up.

const DEFAULT_MOTION_SETTINGS: XenoMotionSettings = {
  motionControl: true,
  swingOn: false,
  swingSensitivity: 1000,
  twistOn: true,
  twistOff: true,
  twistSensitivity: 200,
  pullPushOn: false,
  pushPullOff: false,
  pushSensitivity: 10,
  pullSensitivity: 10,
};

export function XenoMotionPanelConnected() {
  const [settings, setSettings] = useState<XenoMotionSettings>(DEFAULT_MOTION_SETTINGS);
  return <XenoMotionPanel settings={settings} onSettingsChange={setSettings} />;
}

// ─── Connected: XenoSettingsPanel ───────────────────────────────────
//
// Global settings are Xenopixel-specific. Component-local state for
// now; flows into the zip exporter's `set/config.ini` generation.

const DEFAULT_GLOBAL_SETTINGS: XenoGlobalSettings = {
  volume: 70,
  clashSensitivity: 3.0,
  flashOnClash: true,
  pixelNumber: 133,
  velocityMode: false,
  torchMode: false,
  multiblockMode: true,
  multilockMode: true,
  lightningBlockMode: false,
  blasterMode: false,
  ghostMode: false,
  powerOnTime: 1500,
  powerOffTime: 5000,
  countdown: false,
};

export function XenoSettingsPanelConnected() {
  const [settings, setSettings] = useState<XenoGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  return <XenoSettingsPanel settings={settings} onSettingsChange={setSettings} />;
}
