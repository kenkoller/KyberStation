// ─── ProffieOS Template Interpreter — Core Types ───
// Zero DOM dependencies. Runs in browser, tests, and Electron.

/**
 * RGB color in 0-255 range (ProffieOS Rgb<r,g,b> scale).
 */
export interface Color {
  r: number; // 0-255
  g: number;
  b: number;
}

/**
 * RGB color in 0-65535 range (ProffieOS Rgb16<r,g,b> scale).
 * Used internally for higher precision; converted to Color for output.
 */
export interface Color16 {
  r: number; // 0-65535
  g: number;
  b: number;
}

/**
 * Current state of the blade, updated each frame.
 * Integer values use ProffieOS 0-32768 scale unless noted.
 */
export interface BladeState {
  /** Whether the blade is currently on (ignited). */
  isOn: boolean;
  /** Number of LEDs on this blade. Typically 144. */
  numLeds: number;
  /** Milliseconds since power on / style start. */
  timeMs: number;
  /** Delta time since last frame in milliseconds. */
  deltaMsF: number;
  /** Swing speed, 0-32768 (ProffieOS SwingSpeed scale). */
  swingSpeed: number;
  /** Blade angle, 0-32768 (ProffieOS BladeAngle scale). */
  bladeAngle: number;
  /** Twist angle, 0-32768 (ProffieOS TwistAngle scale). */
  twistAngle: number;
  /** Sound level, 0-32768 (ProffieOS SoundLevel scale). */
  soundLevel: number;
  /** Battery level, 0-32768 (ProffieOS BatteryLevel scale). */
  batteryLevel: number;
  /** Variation value for RotateColorsX etc., 0-32768. */
  variation: number;
}

/**
 * ProffieOS effect types. Used by effect layers and TimeSinceEffect.
 */
export type EffectType =
  | 'EFFECT_CLASH'
  | 'EFFECT_BLAST'
  | 'EFFECT_LOCKUP_BEGIN'
  | 'EFFECT_LOCKUP_END'
  | 'EFFECT_DRAG_BEGIN'
  | 'EFFECT_DRAG_END'
  | 'EFFECT_STAB'
  | 'EFFECT_FORCE'
  | 'EFFECT_PREON'
  | 'EFFECT_IGNITION'
  | 'EFFECT_RETRACTION'
  | 'EFFECT_POSTOFF'
  | 'EFFECT_NEWFONT'
  | 'EFFECT_BOOT'
  | 'EFFECT_MELT'
  | 'EFFECT_USER1'
  | 'EFFECT_USER2'
  | 'EFFECT_USER3'
  | 'EFFECT_USER4'
  | 'EFFECT_USER5'
  | 'EFFECT_CHANGE';

/**
 * A single effect event with location and timing.
 */
export interface EffectEvent {
  type: EffectType;
  /** Position on blade, 0-32768. */
  location: number;
  /** Time the effect was triggered (ms since power on). */
  startTimeMs: number;
  /** Random wave number for this effect instance. */
  wavnum: number;
}

/**
 * ProffieOS lockup types. Used by LockupTrL and similar.
 */
export type LockupType =
  | 'LOCKUP_NORMAL'
  | 'LOCKUP_DRAG'
  | 'LOCKUP_ARMED'
  | 'LOCKUP_AUTOFIRE'
  | 'LOCKUP_MELT'
  | 'LOCKUP_LIGHTNING_BLOCK'
  | 'LOCKUP_NONE';

/**
 * Manages effect state for the blade evaluation context.
 */
export interface EffectSystem {
  /** Get the most recent effect event of a given type. */
  getLastEffect(type: EffectType): EffectEvent | undefined;
  /** Get all active effect events of a given type. */
  getEffects(type: EffectType): EffectEvent[];
  /** Trigger a new effect event. */
  triggerEffect(type: EffectType, location?: number): void;
  /** Get ms since the last effect of the given type. -1 if never triggered. */
  timeSinceEffect(type: EffectType, currentTimeMs: number): number;
  /** Current lockup type. */
  lockupType: LockupType;
  /** Current clash impact force, 0-32768. */
  clashImpact: number;
}

// ─── Style Template Interface ───

/**
 * Base interface for all ProffieOS template implementations.
 *
 * ProffieOS templates follow a two-phase pattern:
 * 1. `run(state)` is called ONCE per frame to update internal state.
 * 2. `getColor(led)` is called per-LED to get the color at that position.
 *
 * Functions (Int, Scale, SwingSpeed, etc.) implement `getInteger(led)`
 * instead of (or in addition to) `getColor(led)`.
 */
export interface StyleTemplate {
  /** Called once per frame to update internal state from blade state. */
  run(state: BladeState, effects: EffectSystem): void;
  /** Get the RGB color for a specific LED position. */
  getColor(led: number): Color;
  /** Get the integer value (0-32768) for functions. */
  getInteger(led: number): number;
  /** Child templates for tree walking (empty for leaf templates). */
  getChildren(): StyleTemplate[];
}

// ─── Parser AST ───

/**
 * AST node produced by the template parser. Represents a template
 * call with its name and child arguments (which are themselves nodes).
 */
export interface TemplateNode {
  /** Template name, e.g. 'Layers', 'AudioFlicker', 'Rgb', 'Int'. */
  name: string;
  /** Child arguments (other template nodes or integer literals). */
  args: TemplateNode[];
}

/**
 * Factory function that instantiates a StyleTemplate from parsed args.
 * Each registered template provides one of these.
 */
export type TemplateFactory = (args: StyleTemplate[]) => StyleTemplate;

// ─── Utility constants ───

/** ProffieOS integer scale maximum. Most functions return 0-32768. */
export const PROFFIE_MAX = 32768;

/** Convert a 0-32768 ProffieOS integer to a 0.0-1.0 float. */
export function intToFloat(value: number): number {
  return value / PROFFIE_MAX;
}

/** Convert a 0.0-1.0 float to a 0-32768 ProffieOS integer. */
export function floatToInt(value: number): number {
  return Math.round(value * PROFFIE_MAX);
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert Color16 (0-65535) to Color (0-255). */
export function color16to8(c: Color16): Color {
  return {
    r: clamp(Math.round(c.r / 257), 0, 255),
    g: clamp(Math.round(c.g / 257), 0, 255),
    b: clamp(Math.round(c.b / 257), 0, 255),
  };
}

/** Convert Color (0-255) to Color16 (0-65535). */
export function color8to16(c: Color): Color16 {
  return {
    r: c.r * 257,
    g: c.g * 257,
    b: c.b * 257,
  };
}

/** Mix two colors. f=0 returns a, f=32768 returns b. */
export function mixColors(a: Color, b: Color, f: number): Color {
  const t = clamp(f, 0, PROFFIE_MAX) / PROFFIE_MAX;
  return {
    r: clamp(Math.round(a.r * (1 - t) + b.r * t), 0, 255),
    g: clamp(Math.round(a.g * (1 - t) + b.g * t), 0, 255),
    b: clamp(Math.round(a.b * (1 - t) + b.b * t), 0, 255),
  };
}

/** Alpha-blend a layer color onto a base color. alpha 0-255. */
export function alphaBlend(base: Color, layer: Color, alpha: number): Color {
  const a = clamp(alpha, 0, 255) / 255;
  return {
    r: clamp(Math.round(base.r * (1 - a) + layer.r * a), 0, 255),
    g: clamp(Math.round(base.g * (1 - a) + layer.g * a), 0, 255),
    b: clamp(Math.round(base.b * (1 - a) + layer.b * a), 0, 255),
  };
}

/** Black constant. */
export const BLACK: Color = { r: 0, g: 0, b: 0 };

/** White constant. */
export const WHITE: Color = { r: 255, g: 255, b: 255 };

/** Check if a color is effectively black (all channels zero). */
export function isBlack(c: Color): boolean {
  return c.r === 0 && c.g === 0 && c.b === 0;
}

/** Get the maximum channel value of a color (used as alpha for layers). */
export function colorAlpha(c: Color): number {
  return Math.max(c.r, c.g, c.b);
}
