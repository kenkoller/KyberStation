// ─── Color Templates ───
// Named colors, Rgb, Rgb16, Hue, Mix, Gradient, Rainbow, RotateColorsX, etc.
// Clean-room implementations based on ProffieOS documented behavior.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, StyleTemplate } from '../types.js';
import { BLACK, clamp, PROFFIE_MAX, mixColors, colorAlpha } from '../types.js';
import { lerp } from '../utils.js';

// ─── Named Colors ───
// ProffieOS defines these as constants. Each is a static color template.

function namedColor(r: number, g: number, b: number): new () => StyleTemplate {
  return class extends BaseStyleTemplate {
    private readonly color: Color = { r, g, b };
    getColor(_led: number): Color { return this.color; }
    getInteger(_led: number): number { return colorAlpha(this.color) * 128; }
  };
}

export const Red = namedColor(255, 0, 0);
export const Green = namedColor(0, 255, 0);
export const Blue = namedColor(0, 0, 255);
export const White = namedColor(255, 255, 255);
export const Black = namedColor(0, 0, 0);
export const Yellow = namedColor(255, 255, 0);
export const Cyan = namedColor(0, 255, 255);
export const Magenta = namedColor(255, 0, 255);
export const Orange = namedColor(255, 165, 0);
export const Pink = namedColor(255, 192, 203);
export const DeepSkyBlue = namedColor(0, 191, 255);
export const DodgerBlue = namedColor(30, 144, 255);
export const Purple = namedColor(128, 0, 128);
export const Brown = namedColor(165, 42, 42);
export const Gray = namedColor(128, 128, 128);
export const Silver = namedColor(192, 192, 192);
export const Gold = namedColor(255, 215, 0);
export const Lime = namedColor(0, 255, 0);
export const Maroon = namedColor(128, 0, 0);
export const Navy = namedColor(0, 0, 128);
export const Olive = namedColor(128, 128, 0);
export const Teal = namedColor(0, 128, 128);
export const Crimson = namedColor(220, 20, 60);
export const Coral = namedColor(255, 127, 80);
export const Salmon = namedColor(250, 128, 114);
export const Tomato = namedColor(255, 99, 71);
export const Violet = namedColor(238, 130, 238);
export const Indigo = namedColor(75, 0, 130);
export const Turquoise = namedColor(64, 224, 208);

// ─── Rgb<r, g, b> ───

export class RgbTemplate extends BaseStyleTemplate {
  private readonly color: Color;

  constructor(args: StyleTemplate[]) {
    super();
    // Rgb takes 3 integer args (0-255)
    const r = args[0]?.getInteger(0) ?? 0;
    const g = args[1]?.getInteger(0) ?? 0;
    const b = args[2]?.getInteger(0) ?? 0;
    this.color = {
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
    };
  }

  getColor(_led: number): Color {
    return this.color;
  }
}

// ─── Rgb16<r, g, b> ───

export class Rgb16Template extends BaseStyleTemplate {
  private readonly color: Color;

  constructor(args: StyleTemplate[]) {
    super();
    // Rgb16 takes 3 integer args (0-65535), converts to 0-255
    const r = args[0]?.getInteger(0) ?? 0;
    const g = args[1]?.getInteger(0) ?? 0;
    const b = args[2]?.getInteger(0) ?? 0;
    this.color = {
      r: clamp(Math.round(r / 257), 0, 255),
      g: clamp(Math.round(g / 257), 0, 255),
      b: clamp(Math.round(b / 257), 0, 255),
    };
  }

  getColor(_led: number): Color {
    return this.color;
  }
}

// ─── Hue<h> ───
// h is 0-32768 mapping to 0-360 degrees on the color wheel.

export class HueTemplate extends BaseStyleTemplate {
  private readonly color: Color;

  constructor(args: StyleTemplate[]) {
    super();
    const h = (args[0]?.getInteger(0) ?? 0) / PROFFIE_MAX * 360;
    this.color = hslToRgb(h, 1, 0.5);
  }

  getColor(_led: number): Color {
    return this.color;
  }
}

// ─── Mix<F, A, B> ───
// Mixes between color A and color B based on function F (0-32768).

export class MixTemplate extends BaseStyleTemplate {
  private readonly fFunc: StyleTemplate;
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.fFunc = args[0]!;
    this.colorA = args[1]!;
    this.colorB = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.fFunc.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
  }

  getColor(led: number): Color {
    const f = this.fFunc.getInteger(led);
    const a = this.colorA.getColor(led);
    const b = this.colorB.getColor(led);
    return mixColors(a, b, f);
  }
}

// ─── Gradient<C1, C2, ...> ───
// Gradient across the blade from C1 at hilt to Cn at tip.

export class GradientTemplate extends BaseStyleTemplate {
  private readonly colors: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.colors = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const c of this.colors) c.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    if (this.colors.length === 1) return this.colors[0].getColor(led);

    const numLeds = this.state.numLeds || 144;
    const t = led / Math.max(1, numLeds - 1); // 0.0 to 1.0
    const segments = this.colors.length - 1;
    const segFloat = t * segments;
    const seg = Math.min(Math.floor(segFloat), segments - 1);
    const segT = segFloat - seg;

    const a = this.colors[seg].getColor(led);
    const b = this.colors[seg + 1].getColor(led);

    return {
      r: clamp(Math.round(lerp(a.r, b.r, segT)), 0, 255),
      g: clamp(Math.round(lerp(a.g, b.g, segT)), 0, 255),
      b: clamp(Math.round(lerp(a.b, b.b, segT)), 0, 255),
    };
  }
}

// ─── Rainbow ───
// Full HSL rainbow across the blade.

export class RainbowTemplate extends BaseStyleTemplate {
  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const hue = (led / numLeds) * 360;
    return hslToRgb(hue, 1, 0.5);
  }
}

// ─── RgbCycle ───
// Cycles through RGB over time.

export class RgbCycleTemplate extends BaseStyleTemplate {
  getColor(_led: number): Color {
    const phase = (this.state.timeMs % 3000) / 3000;
    return hslToRgb(phase * 360, 1, 0.5);
  }
}

// ─── RotateColorsX<Rotation, Color> ───
// Rotates the hue of a color by a function value.

export class RotateColorsXTemplate extends BaseStyleTemplate {
  private readonly rotation: StyleTemplate;
  private readonly color: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.rotation = args[0]!;
    this.color = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.rotation.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const c = this.color.getColor(led);
    const rotationVal = this.rotation.getInteger(led);
    // Rotation is 0-32768 mapping to 0-360 degrees
    const degrees = (rotationVal / PROFFIE_MAX) * 360;
    const hsl = rgbToHsl(c.r, c.g, c.b);
    return hslToRgb((hsl.h + degrees) % 360, hsl.s, hsl.l);
  }
}

// ─── ColorChange<Trigger, C1, C2, ...> ───
// Selects a color from a list. In our interpreter, we use the first color
// as the default since we don't have the trigger mechanism.

export class ColorChangeTemplate extends BaseStyleTemplate {
  private readonly trigger: StyleTemplate;
  private readonly colors: StyleTemplate[];
  private selectedIndex = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.trigger = args[0]!;
    this.colors = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.trigger.run(state, effects);
    for (const c of this.colors) c.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    const idx = clamp(this.selectedIndex, 0, this.colors.length - 1);
    return this.colors[idx].getColor(led);
  }
}

// ─── ColorSelect<Selection, C1, C2, ...> ───

export class ColorSelectTemplate extends BaseStyleTemplate {
  private readonly selection: StyleTemplate;
  private readonly colors: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.selection = args[0]!;
    this.colors = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.selection.run(state, effects);
    for (const c of this.colors) c.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    const sel = this.selection.getInteger(led);
    // Selection is 0-32768, map to color index
    const idx = clamp(
      Math.floor((sel / PROFFIE_MAX) * this.colors.length),
      0,
      this.colors.length - 1
    );
    return this.colors[idx].getColor(led);
  }
}

// ─── AlphaL<Color, Shape> ───
// Apply an alpha mask (shape function) to a color layer.

export class AlphaLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly shape: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.shape = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.shape.run(state, effects);
  }

  getColor(led: number): Color {
    const c = this.color.getColor(led);
    const alpha = this.shape.getInteger(led);
    const a = clamp(alpha / PROFFIE_MAX, 0, 1);
    return {
      r: Math.round(c.r * a),
      g: Math.round(c.g * a),
      b: Math.round(c.b * a),
    };
  }
}

// ─── RgbArg<ARG_NAME, DefaultColor> ───
// Argument template that uses the default color.
// In our interpreter, we just use the default.

export class RgbArgTemplate extends BaseStyleTemplate {
  private readonly defaultColor: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    // args[0] is the argument name (e.g. BASE_COLOR_ARG) — we ignore it
    // args[1] is the default color
    this.defaultColor = args[1] ?? new (namedColor(255, 255, 255))();
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.defaultColor.run(state, effects);
  }

  getColor(led: number): Color {
    return this.defaultColor.getColor(led);
  }

  getInteger(led: number): number {
    return this.defaultColor.getInteger(led);
  }
}

// ─── IntArg<ARG_NAME, DefaultValue> ───
// Integer argument that uses the default value.

export class IntArgTemplate extends BaseStyleTemplate {
  private readonly defaultValue: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    // args[0] is argument name, args[1] is default
    this.defaultValue = args[1] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 0; } };
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.defaultValue.run(state, effects);
  }

  getColor(led: number): Color {
    return this.defaultValue.getColor(led);
  }

  getInteger(led: number): number {
    return this.defaultValue.getInteger(led);
  }
}

// ─── Helper: HSL ↔ RGB conversion ───

function hslToRgb(h: number, s: number, l: number): Color {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return {
    r: clamp(Math.round((r1 + m) * 255), 0, 255),
    g: clamp(Math.round((g1 + m) * 255), 0, 255),
    b: clamp(Math.round((b1 + m) * 255), 0, 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60;
  else if (max === gN) h = ((bN - rN) / d + 2) * 60;
  else h = ((rN - gN) / d + 4) * 60;

  return { h, s, l };
}
