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

// ─── Extended Named Colors (CSS / ProffieOS) ───
export const AliceBlue = namedColor(240, 248, 255);
export const Aqua = namedColor(0, 255, 255);
export const Aquamarine = namedColor(127, 255, 212);
export const Azure = namedColor(240, 255, 255);
export const Bisque = namedColor(255, 228, 196);
export const BlanchedAlmond = namedColor(255, 235, 205);
export const Chartreuse = namedColor(127, 255, 0);
export const Cornsilk = namedColor(255, 248, 220);
export const DarkOrange = namedColor(255, 140, 0);
export const DeepPink = namedColor(255, 20, 147);
export const FloralWhite = namedColor(255, 250, 240);
export const ForestGreen = namedColor(34, 139, 34);
export const Fuchsia = namedColor(255, 0, 255);
export const GhostWhite = namedColor(248, 248, 255);
export const GreenYellow = namedColor(173, 255, 47);
export const HoneyDew = namedColor(240, 255, 240);
export const HotPink = namedColor(255, 105, 180);
export const Ivory = namedColor(255, 255, 240);
export const LavenderBlush = namedColor(255, 240, 245);
export const LemonChiffon = namedColor(255, 250, 205);
export const LightCyan = namedColor(224, 255, 255);
export const LightPink = namedColor(255, 182, 193);
export const LightSalmon = namedColor(255, 160, 122);
export const LightSkyBlue = namedColor(135, 206, 250);
export const LightYellow = namedColor(255, 255, 224);
export const MintCream = namedColor(245, 255, 250);
export const MistyRose = namedColor(255, 228, 225);
export const Moccasin = namedColor(255, 228, 181);
export const NavajoWhite = namedColor(255, 222, 173);
export const PaleGreen = namedColor(152, 251, 152);
export const PapayaWhip = namedColor(255, 239, 213);
export const PeachPuff = namedColor(255, 218, 185);
export const RoyalBlue = namedColor(65, 105, 225);
export const SeaShell = namedColor(255, 245, 238);
export const Snow = namedColor(255, 250, 250);
export const SpringGreen = namedColor(0, 255, 127);
export const SteelBlue = namedColor(70, 130, 180);

// ─── ProffieOS Custom Named Colors ───
export const Amber = namedColor(255, 191, 0);

// ─── ProffieOS Extended Named Colors (Fett263 / ProffieOS color wheel) ───
export const MossGreen = namedColor(138, 154, 91);
export const ElectricPurple = namedColor(127, 0, 255);
export const ElectricViolet = namedColor(71, 0, 255);
export const ElectricLime = namedColor(156, 255, 0);
export const CyberYellow = namedColor(255, 168, 0);
export const CanaryYellow = namedColor(255, 221, 0);
export const Flamingo = namedColor(255, 80, 154);
export const VividViolet = namedColor(90, 0, 255);
export const PsychedelicPurple = namedColor(186, 0, 255);
export const HotMagenta = namedColor(255, 0, 156);
export const BrutalPink = namedColor(255, 0, 128);
export const NeonRose = namedColor(255, 0, 55);
export const VividRaspberry = namedColor(255, 0, 38);
export const HaltRed = namedColor(255, 0, 19);
export const MoltenCore = namedColor(255, 24, 0);
export const SafetyOrange = namedColor(255, 33, 0);
export const OrangeJuice = namedColor(255, 55, 0);
export const ImperialYellow = namedColor(255, 115, 0);
export const SchoolBus = namedColor(255, 176, 0);
export const SuperSaiyan = namedColor(255, 186, 0);
export const Star = namedColor(255, 201, 0);
export const Lemon = namedColor(255, 237, 0);
export const ElectricBanana = namedColor(246, 255, 0);
export const BusyBee = namedColor(231, 255, 0);
export const ZeusBolt = namedColor(219, 255, 0);
export const LimeZest = namedColor(186, 255, 0);
export const Limoncello = namedColor(135, 255, 0);
export const CathodeGreen = namedColor(0, 255, 22);
export const MintyParadise = namedColor(0, 255, 128);
export const PlungePool = namedColor(0, 255, 156);
export const VibrantMint = namedColor(0, 255, 201);
export const MasterSwordBlue = namedColor(0, 255, 219);
export const BrainFreeze = namedColor(0, 219, 255);
export const BlueRibbon = namedColor(0, 33, 255);
export const RareBlue = namedColor(0, 13, 255);
export const OverdueBlue = namedColor(13, 0, 255);
export const ViolentViolet = namedColor(55, 0, 255);

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

  getChildren(): StyleTemplate[] {
    return [this.fFunc, this.colorA, this.colorB];
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

  getChildren(): StyleTemplate[] {
    return this.colors;
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

  getChildren(): StyleTemplate[] {
    return [this.rotation, this.color];
  }
}

// ─── ColorChange<Trigger, C1, C2, ...> ───
// Selects a color from a list. In our interpreter, we use the first color
// as the default since we don't have the trigger mechanism.

export class ColorChangeTemplate extends BaseStyleTemplate {
  private readonly trigger: StyleTemplate;
  private readonly colors: StyleTemplate[];
  private selectedIndex = 0;
  private lastChangeEventWavnum = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.trigger = args[0]!;
    this.colors = args.slice(1);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.trigger.run(state, effects);
    for (const c of this.colors) c.run(state, effects);

    if (this.colors.length > 1) {
      const changeEvent = effects.getLastEffect('EFFECT_CHANGE');
      if (changeEvent && changeEvent.wavnum !== this.lastChangeEventWavnum) {
        this.lastChangeEventWavnum = changeEvent.wavnum;
        this.selectedIndex = (this.selectedIndex + 1) % this.colors.length;
      }
    }
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;
    const idx = clamp(this.selectedIndex, 0, this.colors.length - 1);
    return this.colors[idx].getColor(led);
  }

  get variantCount(): number {
    return this.colors.length;
  }

  get currentVariant(): number {
    return this.selectedIndex;
  }

  setVariant(index: number): void {
    if (this.colors.length > 0) {
      this.selectedIndex = clamp(index, 0, this.colors.length - 1);
    }
  }

  getChildren(): StyleTemplate[] {
    return [this.trigger, ...this.colors];
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

  getChildren(): StyleTemplate[] {
    return [this.selection, ...this.colors];
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

  getChildren(): StyleTemplate[] {
    return [this.color, this.shape];
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

  getChildren(): StyleTemplate[] {
    return [this.defaultColor];
  }
}

// ─── IntArg<ARG_NAME, DefaultValue> ───
// Integer argument that uses the default value.

export class IntArgTemplate extends BaseStyleTemplate {
  private readonly defaultValue: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    // args[0] is argument name, args[1] is default
    this.defaultValue = args[1] ?? { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 0; }, getChildren() { return []; } };
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

// ─── PixelateX<F, COLOR1, COLOR2> ───
// Pixelated mosaic between two colors. Each pixel block uses the function
// value to decide color1 vs color2 based on position hash.

export class PixelateXTemplate extends BaseStyleTemplate {
  private readonly sizeFunc: StyleTemplate;
  private readonly color1: StyleTemplate;
  private readonly color2: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.sizeFunc = args[0]!;
    this.color1 = args[1] ?? new (namedColor(255, 255, 255))();
    this.color2 = args[2] ?? new (namedColor(0, 0, 0))();
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.sizeFunc.run(state, effects);
    this.color1.run(state, effects);
    this.color2.run(state, effects);
  }

  getColor(led: number): Color {
    const blockSize = Math.max(1, Math.round(this.sizeFunc.getInteger(led) * 144 / PROFFIE_MAX));
    const blockIdx = Math.floor(led / blockSize);
    // Simple hash to pick color per block
    return (blockIdx % 2 === 0) ? this.color1.getColor(led) : this.color2.getColor(led);
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.round((c.r + c.g + c.b) / 3 * PROFFIE_MAX / 255);
  }

  getChildren(): StyleTemplate[] {
    return [this.sizeFunc, this.color1, this.color2];
  }
}

// ─── ColorSequence<MILLIS, COLOR1, COLOR2, ...> ───
// Steps through colors in order at a fixed period.

export class ColorSequenceTemplate extends BaseStyleTemplate {
  private readonly periodMs: StyleTemplate;
  private readonly colors: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.periodMs = args[0]!;
    this.colors = args.slice(1);
    if (this.colors.length === 0) {
      this.colors = [new (namedColor(255, 255, 255))()];
    }
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.periodMs.run(state, effects);
    for (const c of this.colors) c.run(state, effects);
  }

  getColor(led: number): Color {
    const period = Math.max(1, this.periodMs.getInteger(led));
    const idx = Math.floor(this.state.timeMs / period) % this.colors.length;
    return this.colors[idx]!.getColor(led);
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.round((c.r + c.g + c.b) / 3 * PROFFIE_MAX / 255);
  }

  getChildren(): StyleTemplate[] {
    return [this.periodMs, ...this.colors];
  }
}

// ─── ColorCycle<COLOR, percentage, start, COLOR2, percentage2, start2, RPM> ───
// Cycles a band of color along the blade at a given RPM.

export class ColorCycleTemplate extends BaseStyleTemplate {
  private readonly args: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.args = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const a of this.args) a.run(state, effects);
  }

  getColor(led: number): Color {
    const color1 = this.args[0];
    const pct1 = this.args[1]?.getInteger(0) ?? 50;
    const color2 = this.args[3];
    const rpm = this.args[6]?.getInteger(0) ?? 200;

    // Fraction along blade
    const pos = led / 144;
    // Rotating phase
    const phase = (this.state.timeMs * rpm / 60000) % 1;
    const p = ((pos + phase) % 1);
    const band1 = pct1 / 100;

    if (p < band1) {
      return color1 ? color1.getColor(led) : { r: 255, g: 255, b: 255 };
    }
    return color2 ? color2.getColor(led) : BLACK;
  }

  getInteger(led: number): number {
    const c = this.getColor(led);
    return Math.round((c.r + c.g + c.b) / 3 * PROFFIE_MAX / 255);
  }

  getChildren(): StyleTemplate[] {
    return [...this.args];
  }
}

// ─── RandomL<COLOR> ───
// Random per-frame flicker overlay. Legacy alias for RandomFlickerL.

export class RandomLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0] ?? new (namedColor(255, 255, 255))();
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    // Random flicker: each LED has a random chance of showing the color
    const hash = ((led * 2654435761 + Math.floor(this.state.timeMs)) & 0xFFFF) / 0xFFFF;
    if (hash > 0.5) {
      return this.color.getColor(led);
    }
    return BLACK;
  }

  getInteger(led: number): number {
    const hash = ((led * 2654435761 + Math.floor(this.state.timeMs)) & 0xFFFF) / 0xFFFF;
    return hash > 0.5 ? PROFFIE_MAX : 0;
  }

  getChildren(): StyleTemplate[] {
    return [this.color];
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
