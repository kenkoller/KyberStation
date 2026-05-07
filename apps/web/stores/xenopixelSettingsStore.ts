'use client';

// ─── xenopixelSettingsStore ─────────────────────────────────────────
//
// Persisted Zustand store for Xenopixel V3 motion + global hardware
// settings. These have no Proffie equivalent in BladeConfig and were
// previously held in component-local useState, causing state loss on
// section navigation (Bug #4).
//
// Persisted to localStorage so values survive both section switches
// and page reloads. Flows into the zip exporter's config.ini
// generation at export time.

import { create } from 'zustand';
import type { XenoMotionSettings } from '@/components/editor/xenopixel/XenoMotionPanel';
import type { XenoGlobalSettings } from '@/components/editor/xenopixel/XenoSettingsPanel';

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_MOTION: XenoMotionSettings = {
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

const DEFAULT_GLOBAL: XenoGlobalSettings = {
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
  blasterEffect: 0,
  forceEffect: 0,
};

// ─── Persistence ─────────────────────────────────────────────────────

const STORAGE_KEY = 'kyberstation-xenopixel-settings';

interface StoredState {
  motion: XenoMotionSettings;
  global: XenoGlobalSettings;
}

function loadFromStorage(): Partial<StoredState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Store ───────────────────────────────────────────────────────────

interface XenopixelSettingsStoreState {
  motion: XenoMotionSettings;
  global: XenoGlobalSettings;
  updateMotion: (settings: XenoMotionSettings) => void;
  updateGlobal: (settings: XenoGlobalSettings) => void;
  reset: () => void;
}

const stored = loadFromStorage();

export const useXenopixelSettingsStore = create<XenopixelSettingsStoreState>((set, get) => ({
  motion: { ...DEFAULT_MOTION, ...stored.motion },
  global: { ...DEFAULT_GLOBAL, ...stored.global },

  updateMotion: (motion) => {
    set({ motion });
    saveToStorage({ motion, global: get().global });
  },

  updateGlobal: (global) => {
    set({ global });
    saveToStorage({ motion: get().motion, global });
  },

  reset: () => {
    set({ motion: DEFAULT_MOTION, global: DEFAULT_GLOBAL });
    saveToStorage({ motion: DEFAULT_MOTION, global: DEFAULT_GLOBAL });
  },
}));
