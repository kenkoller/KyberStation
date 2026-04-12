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
  fett263Defines?: string[];
  presets: PresetEntry[];
  bladeConfig: BladeHardwareConfig[];
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
