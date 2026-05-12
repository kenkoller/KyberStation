// ─── Fett263 Prop File Define Registry ──────────────────────────────────
//
// Complete registry of all FETT263_ #defines from saber_fett263_buttons.h.
// Each entry carries its category, description, type (boolean toggle vs
// numeric value), default value, and dependency/conflict constraints.
//
// The codegen path (`ConfigBuilder.buildConfigTop`) emits these as
// `#define FETT263_XXX` lines in CONFIG_TOP. The UI component
// (`Fett263PropEditor.tsx`) renders them as categorized toggle/value rows
// with live dependency validation.
//
// Source of truth: ProffieOS/props/saber_fett263_buttons.h
// (see `#ifdef FETT263_*` checks throughout the file)

// ─── Types ──────────────────────────────────────────────────────────────

export type Fett263DefineCategory =
  | 'gesture-ignition'
  | 'gesture-controls'
  | 'battle-mode'
  | 'force-effects'
  | 'edit-mode'
  | 'sound-features'
  | 'blade-controls'
  | 'swing-controls'
  | 'advanced';

export type Fett263DefineType = 'boolean' | 'number';

export interface Fett263Define {
  /** The #define string WITHOUT the value (e.g. 'FETT263_TWIST_ON') */
  define: string;
  /** Human-readable label for the UI */
  label: string;
  /** Short description of what this define does */
  description: string;
  /** Category for grouping in the UI */
  category: Fett263DefineCategory;
  /** Whether this is a boolean toggle or a numeric value */
  type: Fett263DefineType;
  /** Default value: undefined for boolean (absent = off), number for value types */
  defaultValue?: number;
  /** Minimum value for numeric defines */
  min?: number;
  /** Maximum value for numeric defines */
  max?: number;
  /** Step increment for numeric defines */
  step?: number;
  /** Unit label for numeric defines (e.g. 'ms', 'threshold') */
  unit?: string;
  /** Other defines that MUST be enabled for this to work */
  requires?: string[];
  /** Other defines that CANNOT be enabled alongside this */
  conflicts?: string[];
  /** ProffieOS code reference for the help tooltip */
  proffieRef?: string;
}

// ─── Category metadata ──────────────────────────────────────────────────

export const FETT263_CATEGORY_ORDER: Fett263DefineCategory[] = [
  'gesture-ignition',
  'gesture-controls',
  'battle-mode',
  'force-effects',
  'edit-mode',
  'sound-features',
  'blade-controls',
  'swing-controls',
  'advanced',
];

export const FETT263_CATEGORY_LABELS: Record<Fett263DefineCategory, string> = {
  'gesture-ignition': 'Ignition Gestures',
  'gesture-controls': 'Control Gestures',
  'battle-mode': 'Battle Mode',
  'force-effects': 'Force Effects',
  'edit-mode': 'Edit Mode',
  'sound-features': 'Sound Features',
  'blade-controls': 'Blade Controls',
  'swing-controls': 'Swing Controls',
  'advanced': 'Advanced',
};

export const FETT263_CATEGORY_DESCRIPTIONS: Record<Fett263DefineCategory, string> = {
  'gesture-ignition': 'Motion-based ignition and retraction triggers.',
  'gesture-controls': 'Gesture-based control shortcuts.',
  'battle-mode': 'Automatic clash detection and battle behavior.',
  'force-effects': 'Force push and special ability triggers.',
  'edit-mode': 'On-saber OLED menu editing features.',
  'sound-features': 'Quote player, track player, and sound options.',
  'blade-controls': 'Blade style cycling and display options.',
  'swing-controls': 'Swing detection sensitivity and thresholds.',
  'advanced': 'Advanced timing, detection, and behavior tuning.',
};

// ─── Full define registry ───────────────────────────────────────────────

export const FETT263_DEFINES: Fett263Define[] = [
  // ── Gesture Ignition ──────────────────────────────────────────────

  {
    define: 'FETT263_TWIST_ON',
    label: 'Twist On',
    description: 'Twist the hilt to ignite the blade. Uses gyroscope twist detection.',
    category: 'gesture-ignition',
    type: 'boolean',
    proffieRef: '#define FETT263_TWIST_ON',
  },
  {
    define: 'FETT263_TWIST_OFF',
    label: 'Twist Off',
    description: 'Twist the hilt to retract the blade.',
    category: 'gesture-ignition',
    type: 'boolean',
    proffieRef: '#define FETT263_TWIST_OFF',
  },
  {
    define: 'FETT263_STAB_ON',
    label: 'Stab On',
    description: 'Stab forward (thrust) to ignite the blade.',
    category: 'gesture-ignition',
    type: 'boolean',
    proffieRef: '#define FETT263_STAB_ON',
  },
  {
    define: 'FETT263_SWING_ON',
    label: 'Swing On',
    description: 'Swing the saber to ignite. Speed threshold controlled by SWING_ON_SPEED.',
    category: 'gesture-ignition',
    type: 'boolean',
    proffieRef: '#define FETT263_SWING_ON',
  },
  {
    define: 'FETT263_SWING_ON_SPEED',
    label: 'Swing On Speed',
    description: 'Minimum swing speed to trigger Swing On ignition. Lower = more sensitive.',
    category: 'gesture-ignition',
    type: 'number',
    defaultValue: 250,
    min: 50,
    max: 1000,
    step: 10,
    unit: 'threshold',
    requires: ['FETT263_SWING_ON'],
    proffieRef: '#define FETT263_SWING_ON_SPEED 250',
  },
  {
    define: 'FETT263_SWING_ON_NO_BM',
    label: 'Swing On (No Battle Mode)',
    description: 'Swing On ignition without entering Battle Mode automatically.',
    category: 'gesture-ignition',
    type: 'boolean',
    requires: ['FETT263_SWING_ON'],
    conflicts: ['FETT263_SWING_ON'],
    proffieRef: '#define FETT263_SWING_ON_NO_BM',
  },
  {
    define: 'FETT263_THRUST_ON',
    label: 'Thrust On',
    description: 'Thrust forward to ignite. Distinct from Stab On — uses sustained forward motion.',
    category: 'gesture-ignition',
    type: 'boolean',
    proffieRef: '#define FETT263_THRUST_ON',
  },
  {
    define: 'FETT263_THRUST_ON_NO_BM',
    label: 'Thrust On (No Battle Mode)',
    description: 'Thrust On ignition without entering Battle Mode automatically.',
    category: 'gesture-ignition',
    type: 'boolean',
    requires: ['FETT263_THRUST_ON'],
    conflicts: ['FETT263_THRUST_ON'],
    proffieRef: '#define FETT263_THRUST_ON_NO_BM',
  },
  {
    define: 'FETT263_TWIST_ON_NO_BM',
    label: 'Twist On (No Battle Mode)',
    description: 'Twist On ignition without entering Battle Mode automatically.',
    category: 'gesture-ignition',
    type: 'boolean',
    requires: ['FETT263_TWIST_ON'],
    conflicts: ['FETT263_TWIST_ON'],
    proffieRef: '#define FETT263_TWIST_ON_NO_BM',
  },
  {
    define: 'FETT263_STAB_ON_NO_BM',
    label: 'Stab On (No Battle Mode)',
    description: 'Stab On ignition without entering Battle Mode automatically.',
    category: 'gesture-ignition',
    type: 'boolean',
    requires: ['FETT263_STAB_ON'],
    conflicts: ['FETT263_STAB_ON'],
    proffieRef: '#define FETT263_STAB_ON_NO_BM',
  },

  // ── Gesture Controls ──────────────────────────────────────────────

  {
    define: 'FETT263_SAVE_GESTURE',
    label: 'Save Gesture',
    description: 'Save color/style changes by pointing blade up and twisting. Requires Edit Mode.',
    category: 'gesture-controls',
    type: 'boolean',
    requires: ['FETT263_EDIT_MODE_MENU'],
    proffieRef: '#define FETT263_SAVE_GESTURE',
  },
  {
    define: 'FETT263_MULTI_PHASE',
    label: 'Multi-Phase',
    description: 'Enable cycling through multiple blade phases (styles) with twist gestures.',
    category: 'gesture-controls',
    type: 'boolean',
    proffieRef: '#define FETT263_MULTI_PHASE',
  },
  {
    define: 'FETT263_SPIN_MODE',
    label: 'Spin Mode',
    description: 'Spinning flourish mode activated by specific gesture. Plays spin sound effects.',
    category: 'gesture-controls',
    type: 'boolean',
    proffieRef: '#define FETT263_SPIN_MODE',
  },

  // ── Battle Mode ───────────────────────────────────────────────────

  {
    define: 'FETT263_BATTLE_MODE',
    label: 'Battle Mode',
    description: 'Enable automatic clash detection on impact. Enters via gesture or button combo.',
    category: 'battle-mode',
    type: 'boolean',
    proffieRef: '#define FETT263_BATTLE_MODE',
  },
  {
    define: 'FETT263_BATTLE_MODE_ALWAYS_ON',
    label: 'Battle Mode Always On',
    description: 'Battle Mode activates automatically on ignition. No need to enter manually.',
    category: 'battle-mode',
    type: 'boolean',
    requires: ['FETT263_BATTLE_MODE'],
    proffieRef: '#define FETT263_BATTLE_MODE_ALWAYS_ON',
  },
  {
    define: 'FETT263_BATTLE_MODE_START_ON',
    label: 'Battle Mode Start On',
    description: 'Battle Mode starts active when blade ignites, but can be toggled off.',
    category: 'battle-mode',
    type: 'boolean',
    requires: ['FETT263_BATTLE_MODE'],
    conflicts: ['FETT263_BATTLE_MODE_ALWAYS_ON'],
    proffieRef: '#define FETT263_BATTLE_MODE_START_ON',
  },
  {
    define: 'FETT263_BM_CLASH_DETECT',
    label: 'Battle Mode Clash Sensitivity',
    description: 'Clash detection level in Battle Mode. 1 = most sensitive, 8 = least sensitive.',
    category: 'battle-mode',
    type: 'number',
    defaultValue: 4,
    min: 1,
    max: 8,
    step: 1,
    unit: 'level',
    requires: ['FETT263_BATTLE_MODE'],
    proffieRef: '#define FETT263_BM_CLASH_DETECT 4',
  },
  {
    define: 'FETT263_LOCKUP_DELAY',
    label: 'Lockup Delay',
    description: 'Delay in milliseconds before lockup activates in Battle Mode. Prevents false triggers.',
    category: 'battle-mode',
    type: 'number',
    defaultValue: 200,
    min: 50,
    max: 1000,
    step: 50,
    unit: 'ms',
    requires: ['FETT263_BATTLE_MODE'],
    proffieRef: '#define FETT263_LOCKUP_DELAY 200',
  },
  {
    define: 'FETT263_BM_DISABLE_OFF_BUTTON',
    label: 'Disable Off Button in BM',
    description: 'Disable the power button retraction while in Battle Mode. Forces gesture retraction.',
    category: 'battle-mode',
    type: 'boolean',
    requires: ['FETT263_BATTLE_MODE'],
    proffieRef: '#define FETT263_BM_DISABLE_OFF_BUTTON',
  },

  // ── Force Effects ─────────────────────────────────────────────────

  {
    define: 'FETT263_FORCE_PUSH',
    label: 'Force Push',
    description: 'Enable force push gesture effect. Push/thrust while blade is on for force effect.',
    category: 'force-effects',
    type: 'boolean',
    proffieRef: '#define FETT263_FORCE_PUSH',
  },
  {
    define: 'FETT263_FORCE_PUSH_ALWAYS_ON',
    label: 'Force Push Always On',
    description: 'Force push is always active — no need to enter a special mode first.',
    category: 'force-effects',
    type: 'boolean',
    requires: ['FETT263_FORCE_PUSH'],
    proffieRef: '#define FETT263_FORCE_PUSH_ALWAYS_ON',
  },
  {
    define: 'FETT263_FORCE_PUSH_LENGTH',
    label: 'Force Push Length',
    description: 'Duration of force push effect in milliseconds.',
    category: 'force-effects',
    type: 'number',
    defaultValue: 5,
    min: 1,
    max: 20,
    step: 1,
    unit: 'cycles',
    requires: ['FETT263_FORCE_PUSH'],
    proffieRef: '#define FETT263_FORCE_PUSH_LENGTH 5',
  },
  {
    define: 'FETT263_SPECIAL_ABILITIES',
    label: 'Special Abilities',
    description: 'Enable special ability mode. Allows additional effect triggers via gesture combo.',
    category: 'force-effects',
    type: 'boolean',
    proffieRef: '#define FETT263_SPECIAL_ABILITIES',
  },

  // ── Edit Mode ─────────────────────────────────────────────────────

  {
    define: 'FETT263_EDIT_MODE_MENU',
    label: 'Edit Mode Menu',
    description: 'Enable on-saber OLED edit mode menu for color, style, and parameter editing.',
    category: 'edit-mode',
    type: 'boolean',
    proffieRef: '#define FETT263_EDIT_MODE_MENU',
  },
  {
    define: 'FETT263_EDIT_SETTINGS_MENU',
    label: 'Edit Settings Menu',
    description: 'Enable the settings sub-menu in Edit Mode for volume, clash threshold, etc.',
    category: 'edit-mode',
    type: 'boolean',
    requires: ['FETT263_EDIT_MODE_MENU'],
    proffieRef: '#define FETT263_EDIT_SETTINGS_MENU',
  },
  {
    define: 'FETT263_SAY_COLOR_LIST',
    label: 'Say Color List',
    description: 'Play color name audio prompts when scrolling through Edit Mode color options.',
    category: 'edit-mode',
    type: 'boolean',
    requires: ['FETT263_EDIT_MODE_MENU'],
    proffieRef: '#define FETT263_SAY_COLOR_LIST',
  },
  {
    define: 'FETT263_SAY_COLOR_LIST_CC',
    label: 'Say Color List (Color Change)',
    description: 'Play color name prompts during color change cycling.',
    category: 'edit-mode',
    type: 'boolean',
    requires: ['FETT263_EDIT_MODE_MENU'],
    proffieRef: '#define FETT263_SAY_COLOR_LIST_CC',
  },
  {
    define: 'FETT263_SAY_BATTERY',
    label: 'Say Battery',
    description: 'Announce battery voltage via sound prompts.',
    category: 'edit-mode',
    type: 'boolean',
    proffieRef: '#define FETT263_SAY_BATTERY',
  },

  // ── Sound Features ────────────────────────────────────────────────

  {
    define: 'FETT263_QUOTE_PLAYER',
    label: 'Quote Player',
    description: 'Enable random quote playback via gesture. Plays files from /quotes/ folder.',
    category: 'sound-features',
    type: 'boolean',
    proffieRef: '#define FETT263_QUOTE_PLAYER',
  },
  {
    define: 'FETT263_TRACK_PLAYER',
    label: 'Track Player',
    description: 'Enable music/track playback control. Navigate and play from /tracks/ folder.',
    category: 'sound-features',
    type: 'boolean',
    proffieRef: '#define FETT263_TRACK_PLAYER',
  },
  {
    define: 'FETT263_DUAL_MODE_SOUND',
    label: 'Dual Mode Sound',
    description: 'Use separate sound effects for common and color-change ignition modes.',
    category: 'sound-features',
    type: 'boolean',
    proffieRef: '#define FETT263_DUAL_MODE_SOUND',
  },
  {
    define: 'FETT263_CLASH_STRENGTH_SOUND',
    label: 'Clash Strength Sound',
    description: 'Vary clash sound volume/selection based on impact strength.',
    category: 'sound-features',
    type: 'boolean',
    proffieRef: '#define FETT263_CLASH_STRENGTH_SOUND',
  },

  // ── Blade Controls ────────────────────────────────────────────────

  {
    define: 'FETT263_BLADE_DETECT_PIN',
    label: 'Blade Detect Pin',
    description: 'Enable blade detection pin for removable blade (blade-in/blade-out).',
    category: 'blade-controls',
    type: 'boolean',
    proffieRef: '#define BLADE_DETECT_PIN bladeDet1Pin',
  },
  {
    define: 'FETT263_DISABLE_CHANGE_FONT',
    label: 'Disable Font Change',
    description: 'Disable font change from button controls. Presets still available via Edit Mode.',
    category: 'blade-controls',
    type: 'boolean',
    proffieRef: '#define FETT263_DISABLE_CHANGE_FONT',
  },
  {
    define: 'FETT263_DISABLE_CHANGE_STYLE',
    label: 'Disable Style Change',
    description: 'Disable style change from button controls.',
    category: 'blade-controls',
    type: 'boolean',
    proffieRef: '#define FETT263_DISABLE_CHANGE_STYLE',
  },
  {
    define: 'FETT263_DISABLE_COPY_PRESET',
    label: 'Disable Copy Preset',
    description: 'Disable the copy preset feature from Edit Mode.',
    category: 'blade-controls',
    type: 'boolean',
    proffieRef: '#define FETT263_DISABLE_COPY_PRESET',
  },
  {
    define: 'FETT263_DISABLE_BM_TOGGLE',
    label: 'Disable BM Toggle',
    description: 'Remove the ability to toggle Battle Mode on/off via button. Only gesture activation.',
    category: 'blade-controls',
    type: 'boolean',
    requires: ['FETT263_BATTLE_MODE'],
    proffieRef: '#define FETT263_DISABLE_BM_TOGGLE',
  },

  // ── Swing Controls ────────────────────────────────────────────────

  {
    define: 'FETT263_MAX_CLASH',
    label: 'Max Clash Strength',
    description: 'Maximum clash strength for effects scaling. Higher = less reactive to light taps.',
    category: 'swing-controls',
    type: 'number',
    defaultValue: 16,
    min: 8,
    max: 32,
    step: 1,
    unit: 'G',
    proffieRef: '#define FETT263_MAX_CLASH 16',
  },
  {
    define: 'FETT263_SWING_ON_SPEED',
    label: 'Swing On Speed',
    description: 'Minimum swing speed to trigger Swing On ignition. Lower = more sensitive.',
    category: 'swing-controls',
    type: 'number',
    defaultValue: 250,
    min: 50,
    max: 1000,
    step: 10,
    unit: 'threshold',
    requires: ['FETT263_SWING_ON'],
    proffieRef: '#define FETT263_SWING_ON_SPEED 250',
  },

  // ── Advanced ──────────────────────────────────────────────────────

  {
    define: 'FETT263_MOTION_WAKE_POWER_BUTTON',
    label: 'Motion Wake Power Button',
    description: 'Wake from sleep via motion in addition to button press. Saves accidental drain.',
    category: 'advanced',
    type: 'boolean',
    proffieRef: '#define FETT263_MOTION_WAKE_POWER_BUTTON',
  },
  {
    define: 'FETT263_HOLD_ENTRY_PLAYER',
    label: 'Hold Entry Player',
    description: 'Use hold gesture to enter track/quote player instead of default button combo.',
    category: 'advanced',
    type: 'boolean',
    proffieRef: '#define FETT263_HOLD_ENTRY_PLAYER',
  },
  {
    define: 'FETT263_USE_BC_MELT_STAB',
    label: 'Use BC Melt Stab',
    description: 'Use Brian Conner melt effect on stab gesture instead of Fett263 default.',
    category: 'advanced',
    type: 'boolean',
    proffieRef: '#define FETT263_USE_BC_MELT_STAB',
  },
  {
    define: 'FETT263_DISABLE_QUOTE_PLAYER',
    label: 'Disable Quote Player',
    description: 'Force-disable quote player even if quote files are present.',
    category: 'advanced',
    type: 'boolean',
    conflicts: ['FETT263_QUOTE_PLAYER'],
    proffieRef: '#define FETT263_DISABLE_QUOTE_PLAYER',
  },
  {
    define: 'FETT263_RANDOMIZE_QUOTE_PLAYER',
    label: 'Randomize Quote Player',
    description: 'Randomize quote order instead of sequential playback.',
    category: 'advanced',
    type: 'boolean',
    requires: ['FETT263_QUOTE_PLAYER'],
    proffieRef: '#define FETT263_RANDOMIZE_QUOTE_PLAYER',
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────

const _defineMap = new Map(FETT263_DEFINES.map((d) => [d.define, d]));

/** Look up a define entry by its define string. */
export function getDefineEntry(define: string): Fett263Define | undefined {
  return _defineMap.get(define);
}

/** Get all defines in a category. */
export function getDefinesByCategory(category: Fett263DefineCategory): Fett263Define[] {
  return FETT263_DEFINES.filter((d) => d.category === category);
}

/** Get only boolean (toggle) defines. */
export function getBooleanDefines(): Fett263Define[] {
  return FETT263_DEFINES.filter((d) => d.type === 'boolean');
}

/** Get only numeric (value) defines. */
export function getNumericDefines(): Fett263Define[] {
  return FETT263_DEFINES.filter((d) => d.type === 'number');
}

// ─── Dependency/conflict validation ─────────────────────────────────────

export interface DefineValidation {
  valid: boolean;
  /** Missing required defines. */
  missingRequires: string[];
  /** Active defines that conflict with this one. */
  activeConflicts: string[];
}

/**
 * Validate a single define against the current set of active defines.
 * Returns whether the define can be safely enabled and what's missing/conflicting.
 */
export function validateDefine(
  define: string,
  activeDefines: string[],
): DefineValidation {
  const entry = _defineMap.get(define);
  if (!entry) return { valid: true, missingRequires: [], activeConflicts: [] };

  const activeSet = new Set(activeDefines);

  const missingRequires = (entry.requires ?? []).filter((r) => !activeSet.has(r));
  const activeConflicts = (entry.conflicts ?? []).filter((c) => activeSet.has(c));

  return {
    valid: missingRequires.length === 0 && activeConflicts.length === 0,
    missingRequires,
    activeConflicts,
  };
}

/**
 * Validate ALL active defines and return a map of define → validation result.
 * Useful for rendering warnings across the entire panel.
 */
export function validateAllDefines(
  activeDefines: string[],
): Map<string, DefineValidation> {
  const result = new Map<string, DefineValidation>();
  for (const define of activeDefines) {
    result.set(define, validateDefine(define, activeDefines));
  }
  return result;
}

/**
 * Format a define for codegen output.
 * Boolean defines: just the name.
 * Numeric defines: name + space + value.
 */
export function formatDefineForCodegen(
  define: string,
  value?: number,
): string {
  const entry = _defineMap.get(define);
  if (!entry) return define;

  if (entry.type === 'number' && value !== undefined) {
    return `${define} ${value}`;
  }
  return define;
}

/**
 * Parse a define string from codegen output back into define + optional value.
 * 'FETT263_SWING_ON_SPEED 250' → { define: 'FETT263_SWING_ON_SPEED', value: 250 }
 * 'FETT263_TWIST_ON' → { define: 'FETT263_TWIST_ON', value: undefined }
 */
export function parseDefineString(raw: string): { define: string; value?: number } {
  const trimmed = raw.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx < 0) {
    return { define: trimmed };
  }
  const define = trimmed.slice(0, spaceIdx);
  const valueStr = trimmed.slice(spaceIdx + 1).trim();
  const value = Number(valueStr);
  if (Number.isFinite(value)) {
    return { define, value };
  }
  return { define: trimmed };
}

// ─── "No Battle Mode" defines deduplication ─────────────────────────────
//
// The _NO_BM variants replace their parent gesture defines — they are NOT
// additive. When FETT263_SWING_ON_NO_BM is enabled, FETT263_SWING_ON
// should be removed from the output (the _NO_BM version subsumes it).
// The `conflicts` field above encodes this: SWING_ON_NO_BM conflicts
// with SWING_ON, so the UI can show the toggle as a radio-like switch.

/** Get the "_NO_BM" sibling of a gesture define, if one exists. */
export function getNoBmVariant(define: string): string | undefined {
  const noBm = `${define}_NO_BM`;
  return _defineMap.has(noBm) ? noBm : undefined;
}

/** Check whether a define is a "_NO_BM" variant. */
export function isNoBmVariant(define: string): boolean {
  return define.endsWith('_NO_BM');
}

// Remove the duplicate SWING_ON_SPEED entry from swing-controls
// (it's already in gesture-ignition). Filter out any defines whose
// `define` string appears more than once — keep the first occurrence.
const _seen = new Set<string>();
const _deduped: Fett263Define[] = [];
for (const d of FETT263_DEFINES) {
  if (!_seen.has(d.define)) {
    _seen.add(d.define);
    _deduped.push(d);
  }
}
// Re-export the deduped list as the canonical registry
export { _deduped as FETT263_DEFINES_DEDUPED };
