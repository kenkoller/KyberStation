// ─── AST Node Types ───

export type StyleNodeType =
  | 'template'
  | 'color'
  | 'integer'
  | 'function'
  | 'transition'
  | 'wrapper'
  | 'mix'
  | 'raw';

export interface StyleNode {
  type: StyleNodeType;
  name: string;
  args: StyleNode[];
}

export interface ColorNode extends StyleNode {
  type: 'color';
  name: 'Rgb' | 'RgbArg' | string;
}

export interface IntNode extends StyleNode {
  type: 'integer';
  name: 'Int' | 'IntArg' | string;
}

export interface TemplateNode extends StyleNode {
  type: 'template';
}

export interface TransitionNode extends StyleNode {
  type: 'transition';
}

export interface FunctionNode extends StyleNode {
  type: 'function';
}

export interface WrapperNode extends StyleNode {
  type: 'wrapper';
}

export interface MixNode extends StyleNode {
  type: 'mix';
  name: 'Mix';
}

export interface RawNode extends StyleNode {
  type: 'raw';
  value: string;
}

// ─── Emit Options ───

export interface EmitOptions {
  minified?: boolean;
  comments?: boolean;
  rgbArgWrappers?: boolean;
  indent?: number;
}

// ─── Validation ───

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ─── Config Generation ───

export interface ConfigOptions {
  boardType: 'proffieboard_v2' | 'proffieboard_v3';
  propFile?: string;
  numBlades: number;
  numButtons: 1 | 2 | 3;
  volume: number;
  clashThresholdG: number;
  maxClashStrength: number;
  maxLedsPerStrip?: number;
  fett263Defines?: string[];
  presets: PresetEntry[];
  bladeConfig: BladeHardwareConfig[];
  /**
   * `#define ORIENTATION` value. Vendor chassis where the board is mounted
   * USB-toward-blade need `ORIENTATION_USB_TOWARDS_BLADE` so the IMU is
   * read with the correct axis. Omit to leave ProffieOS at its default
   * (USB toward pommel).
   */
  orientation?: 'USB_TOWARDS_BLADE' | 'USB_TOWARDS_POMMEL' | 'USB_PORT_TOWARDS_BLADE';
  /**
   * `#define MOTION_TIMEOUT` value in milliseconds. Controls how long the
   * IMU stays active after the saber is set down. Omit to leave at the
   * ProffieOS default (~5 min).
   */
  motionTimeoutMs?: number;
  /**
   * Emit `#define ENABLE_SERIAL` for chassis with a Bluetooth module or
   * external serial peripheral on UART3. Default is `false`.
   */
  enableSerial?: boolean;
}

export interface PresetEntry {
  fontName: string;
  trackFile?: string;
  styleCodes: string[];
  presetName: string;
}

export interface BladeHardwareConfig {
  type: 'ws281x' | 'subblade';
  ledCount: number;
  pin: string;
  colorOrder?: string;
  powerPins?: string[];
  subBladeStart?: number;
  subBladeEnd?: number;
}

// ─── Template Definition ───

export type ArgType = 'COLOR' | 'FUNCTION' | 'TRANSITION' | 'INTEGER' | 'LOCKUP_TYPE' | 'EFFECT';

export interface TemplateDefinition {
  name: string;
  argTypes: ArgType[];
  defaults?: StyleNode[];
  description?: string;
}
