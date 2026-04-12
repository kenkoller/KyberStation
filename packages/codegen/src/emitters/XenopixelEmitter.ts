// ─── Xenopixel Emitter ───
// Generates Xenopixel config files (JSON-based config format).
// Xenopixel boards use a simpler JSON configuration stored on SD card.

import type { StyleNode } from '../types.js';
import type { BoardEmitter, BoardEmitOptions, EmitterOutput } from './BaseEmitter.js';

function xpBladeStyle(style: string): number {
  // Xenopixel uses numeric style IDs
  switch (style) {
    case 'stable': return 0;
    case 'unstable': return 1;
    case 'fire': return 2;
    case 'pulse': return 3;
    case 'rotoscope': return 0;     // Degraded to stable
    case 'gradient': return 4;
    case 'photon': return 5;        // Rainbow
    case 'plasma': return 2;        // Degraded to fire
    case 'crystalShatter': return 1; // Degraded to unstable
    case 'aurora': return 5;        // Rainbow
    case 'cinder': return 2;        // Degraded to fire
    case 'prism': return 5;         // Rainbow
    default: return 0;
  }
}

function xpIgnition(ignition: string): number {
  switch (ignition) {
    case 'standard': return 0;
    case 'scroll': return 1;
    case 'spark': return 2;
    case 'center': return 3;
    case 'wipe': return 1;
    case 'stutter': return 0;   // Not supported, fallback
    case 'glitch': return 0;    // Not supported, fallback
    default: return 0;
  }
}

function xpRetraction(retraction: string): number {
  switch (retraction) {
    case 'standard': return 0;
    case 'scroll': return 1;
    case 'fadeout': return 2;
    case 'center': return 3;
    case 'shatter': return 0;   // Not supported, fallback
    default: return 0;
  }
}

interface XenoPreset {
  name: string;
  font: string;
  blade_color: [number, number, number];
  clash_color: [number, number, number];
  lockup_color: [number, number, number];
  blast_color: [number, number, number];
  blade_style: number;
  ignition_type: number;
  retraction_type: number;
  ignition_time: number;
  retraction_time: number;
  led_count: number;
}

interface XenoConfig {
  version: number;
  board: string;
  presets: XenoPreset[];
  settings: {
    volume: number;
    smooth_swing: boolean;
    clash_sensitivity: number;
  };
}

export class XenopixelEmitter implements BoardEmitter {
  readonly boardId = 'xenopixel';
  readonly boardName = 'Xenopixel';
  readonly formatDescription = 'Xenopixel JSON configuration (config.json on SD)';

  emit(ast: StyleNode, options: BoardEmitOptions): EmitterOutput {
    return this.emitMultiPreset([{ ast, options }]);
  }

  emitMultiPreset(presets: Array<{ ast: StyleNode; options: BoardEmitOptions }>): EmitterOutput {
    const notes: string[] = [];

    const xePresets: XenoPreset[] = presets.map(({ options }) => {
      const style = options.style;
      if (['rotoscope', 'plasma', 'crystalShatter', 'cinder', 'stutter', 'glitch'].includes(style) || ['stutter', 'glitch'].includes(options.ignition)) {
        notes.push(`Preset "${options.presetName}": Some features degraded for Xenopixel compatibility.`);
      }

      return {
        name: options.presetName,
        font: options.fontName,
        blade_color: [options.baseColor.r, options.baseColor.g, options.baseColor.b],
        clash_color: [options.clashColor.r, options.clashColor.g, options.clashColor.b],
        lockup_color: options.lockupColor
          ? [options.lockupColor.r, options.lockupColor.g, options.lockupColor.b]
          : [255, 200, 80],
        blast_color: options.blastColor
          ? [options.blastColor.r, options.blastColor.g, options.blastColor.b]
          : [255, 255, 255],
        blade_style: xpBladeStyle(options.style),
        ignition_type: xpIgnition(options.ignition),
        retraction_type: xpRetraction(options.retraction),
        ignition_time: options.ignitionMs,
        retraction_time: options.retractionMs,
        led_count: options.ledCount,
      };
    });

    const config: XenoConfig = {
      version: 2,
      board: 'xenopixel',
      presets: xePresets,
      settings: {
        volume: presets[0]?.options.volume ?? 1500,
        smooth_swing: true,
        clash_sensitivity: 3,
      },
    };

    return {
      configContent: JSON.stringify(config, null, 2),
      configFileName: 'config.json',
      notes,
    };
  }
}
