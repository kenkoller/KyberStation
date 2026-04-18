// ─── Shared keyboard-shortcut registry ──────────────────────────────────────
//
// Single source of truth for every keyboard shortcut the editor binds. Both
// `useKeyboardShortcuts` (the event dispatcher) and the
// `KeyboardShortcutsModal` (the human-readable help overlay) import from
// here so the two stay in lockstep — if you add a shortcut, both the
// listener and the help modal pick it up for free.
//
// `key`  — the label shown in the help modal's <kbd> pill (human-facing).
// `code` — `KeyboardEvent.code` value; stable across keyboard layouts so
//          we switch on `code` inside the event handler. `null` for
//          non-effect shortcuts (e.g. Space, ?, F1) that the hook
//          handles specially.

export interface EffectShortcut {
  /** Human-facing label shown in the help modal's <kbd> tag. */
  key: string;
  /** `KeyboardEvent.code` for layout-stable matching. */
  code: string;
  /** Internal effect id passed to `triggerEffect` / `releaseEffect`. */
  effect: string;
  /** Display label shown next to the <kbd>. */
  label: string;
  /** Sustained effects toggle on/off per keypress; one-shots fire once. */
  sustained: boolean;
}

/**
 * Effect triggers bound to single-letter keys. Order here is the order
 * shown in the help modal within each group.
 */
export const EFFECT_SHORTCUTS: readonly EffectShortcut[] = [
  // ── One-shot effects ──
  { key: 'C', code: 'KeyC', effect: 'clash',        label: 'Clash',        sustained: false },
  { key: 'B', code: 'KeyB', effect: 'blast',        label: 'Blast',        sustained: false },
  { key: 'S', code: 'KeyS', effect: 'stab',         label: 'Stab',         sustained: false },
  { key: 'F', code: 'KeyF', effect: 'force',        label: 'Force',        sustained: false },
  { key: 'W', code: 'KeyW', effect: 'shockwave',    label: 'Shockwave',    sustained: false },
  { key: 'R', code: 'KeyR', effect: 'fragment',     label: 'Fragment',     sustained: false },
  { key: 'V', code: 'KeyV', effect: 'bifurcate',    label: 'Bifurcate',    sustained: false },
  { key: 'G', code: 'KeyG', effect: 'ghostEcho',    label: 'Ghost Echo',   sustained: false },
  { key: 'P', code: 'KeyP', effect: 'splinter',     label: 'Splinter',     sustained: false },
  { key: 'E', code: 'KeyE', effect: 'coronary',     label: 'Coronary',     sustained: false },
  { key: 'X', code: 'KeyX', effect: 'glitchMatrix', label: 'Glitch Matrix', sustained: false },
  { key: 'H', code: 'KeyH', effect: 'siphon',       label: 'Siphon',       sustained: false },
  // ── Sustained effects (toggle on/off) ──
  { key: 'L', code: 'KeyL', effect: 'lockup',       label: 'Lockup',       sustained: true  },
  { key: 'D', code: 'KeyD', effect: 'drag',         label: 'Drag',         sustained: true  },
  { key: 'M', code: 'KeyM', effect: 'melt',         label: 'Melt',         sustained: true  },
  { key: 'N', code: 'KeyN', effect: 'lightning',    label: 'Lightning',    sustained: true  },
] as const;

/**
 * Fast `code` → shortcut lookup. Used by the event dispatcher to
 * resolve a KeyboardEvent into an effect definition without linear
 * scanning on every keystroke.
 */
export const EFFECT_SHORTCUTS_BY_CODE: ReadonlyMap<string, EffectShortcut> =
  new Map(EFFECT_SHORTCUTS.map((s) => [s.code, s]));

/** Convenience: set of effect ids that are sustained rather than one-shot. */
export const SUSTAINED_EFFECT_IDS: ReadonlySet<string> = new Set(
  EFFECT_SHORTCUTS.filter((s) => s.sustained).map((s) => s.effect),
);

/**
 * Blade-control shortcuts that aren't effect triggers. Kept separate so
 * the help modal can group them under their own heading.
 */
export interface BladeControlShortcut {
  key: string;
  label: string;
  /** Description of what the shortcut does. */
  description?: string;
}

export const BLADE_CONTROL_SHORTCUTS: readonly BladeControlShortcut[] = [
  { key: 'Space', label: 'Ignite / Retract', description: 'Toggle the blade on or off' },
] as const;

/**
 * Global / editor shortcuts (meta + non-effect keys). Shown in the help
 * modal under their own group. The modal and Settings reference this;
 * the event handlers live in their own feature hooks.
 */
export const EDITOR_SHORTCUTS: readonly BladeControlShortcut[] = [
  { key: '?',     label: 'Keyboard shortcuts',   description: 'Show this help overlay' },
  { key: 'F1',    label: 'Keyboard shortcuts',   description: 'Alternate help shortcut' },
  { key: 'Esc',   label: 'Exit fullscreen / close modal' },
  { key: '\u2318Z',        label: 'Undo' },
  { key: '\u2318\u21E7Z',  label: 'Redo' },
] as const;
