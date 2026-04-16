// ─── Base Emitter Interface ───
// All board-specific emitters implement this interface.

import type { StyleNode } from '../types.js';

export interface BoardEmitOptions {
  presetName: string;
  fontName: string;
  baseColor: { r: number; g: number; b: number };
  clashColor: { r: number; g: number; b: number };
  lockupColor?: { r: number; g: number; b: number };
  blastColor?: { r: number; g: number; b: number };
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  ledCount: number;
  volume?: number;
  [key: string]: unknown;
}

export interface EmitterOutput {
  /** Main config file content */
  configContent: string;
  /** File name for the config (e.g., 'config.h', 'profile1.txt') */
  configFileName: string;
  /** Additional files to write (path relative to SD root → content) */
  additionalFiles?: Record<string, string>;
  /** Human-readable notes about the output */
  notes?: string[];
}

export interface BoardEmitter {
  /** Board family identifier */
  readonly boardId: string;
  /** Human-readable board name */
  readonly boardName: string;
  /** Config file format description */
  readonly formatDescription: string;

  /**
   * Generate config file(s) from a KyberStation AST and options.
   * The AST may be used for reference, but board-specific emitters
   * typically generate their own format from the options directly.
   */
  emit(ast: StyleNode, options: BoardEmitOptions): EmitterOutput;

  /**
   * Generate config for multiple presets at once.
   */
  emitMultiPreset(presets: Array<{ ast: StyleNode; options: BoardEmitOptions }>): EmitterOutput;
}
