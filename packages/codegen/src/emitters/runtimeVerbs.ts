// ─── ProffieOS Runtime Verbs — style-string builders + BladeConfig mapper ───
//
// Pure, DOM-free. Turns a KyberStation BladeConfig into the `style=` value of
// a ProffieOS runtime preset (`presets.ini`, board `proffie_runtime`).
//
// Ground truth: ProffieOS 7.12 `styles/style_parser.h` `named_styles[]` — the
// same version the 89sabers V3.9-BT factory firmware runs. All eight verbs
// below were accepted by that firmware via serial `set_style1` (2026-05-17);
// `advanced` + `builtin` were validated end-to-end on the SD path (2026-05-18).
//
// Encoding contract (verified against source, 2026-09):
//   - Arguments are space-separated (`common/arg_parser.h` ArgParser::GetArg).
//   - Colors: `RgbArg` (`styles/rgb_arg.h`) reads `r,g,b` with
//     `strtol(…, 0)` straight into `Color16` — 16 bits per channel, NO 8→16
//     scaling. We scale ×257 (what `Color16(Color8)` does for compile-time
//     `Rgb<>`, `common/color.h`) and clamp to 0..65535.
//   - Integers: `IntArg` (`functions/int_arg.h`) — `strtol(…, 0)`.
//   - strtol base 0 treats a leading `0` as octal and `0x` as hex, so every
//     number is emitted as plain decimal with no leading zeros (`String()` of a
//     non-negative integer never produces one).
//   - `~` means "use the default" to ArgParser, but
//     `CurrentPreset::IsValidStyleString()` (`common/current_preset.h:38`)
//     only allows a lowercase verb, a space, then `[0-9 ,]` — so `~` and `-`
//     are never emitted; every argument is written explicitly.
//
// Verb signatures on 7.12 (argument order):
//   builtin   presetIndex bladeNumber
//   standard  color clash extMs retMs
//   advanced  hilt mid tip onSpark onSparkMs blast lockup clash extMs retMs sparkTip
//   fire      warm hot                                  (no timing / effect colors)
//   unstable  warm warmer hot sparks extMs retMs        (white clash/blast)
//   strobe    standby flash flashHz flashMs extMs retMs (Rainbow clash)
//   cycle     start base flicker blast lockup           (no timing; white clash)
//   rainbow   extMs retMs                               (white clash, no blast)

// ─── Types ───

export interface RuntimeRGB {
  r: number;
  g: number;
  b: number;
}

export type RuntimeVerb =
  | 'builtin'
  | 'standard'
  | 'advanced'
  | 'fire'
  | 'unstable'
  | 'strobe'
  | 'cycle'
  | 'rainbow';

/**
 * How closely the runtime verb reproduces the KyberStation style:
 *   - `faithful`    — same kind of blade (solid / gradient / crackle / flame /
 *                     moving rainbow); fine detail may differ.
 *   - `approximate` — the style's colors plus a related-but-different
 *                     animation, or a static stand-in for a moving one.
 *   - `colors-only` — no runtime verb can express the animation; the blade is
 *                     a static `advanced` blade carrying the colors, effect
 *                     colors and timing. Needs a firmware flash to look right.
 */
export type RuntimeFidelity = 'faithful' | 'approximate' | 'colors-only';

export interface RuntimeStyleMapping {
  /** The `style=` value, e.g. `unstable 38550,0,0 65535,0,0 …`. */
  styleString: string;
  verb: RuntimeVerb;
  fidelity: RuntimeFidelity;
  /** One or two plain-English sentences on what the saber will show. */
  note: string;
}

/**
 * BladeConfig-like input. Structural so both the engine's `BladeConfig` and
 * the presets package's `PresetConfig` are accepted; style-specific fields
 * are read defensively from the index signature.
 */
export interface RuntimeStyleInput {
  style: string;
  baseColor: RuntimeRGB;
  clashColor: RuntimeRGB;
  lockupColor: RuntimeRGB;
  blastColor: RuntimeRGB;
  ignitionMs?: number;
  retractionMs?: number;
  [key: string]: unknown;
}

export interface StandardVerbParams {
  color: RuntimeRGB;
  clashColor: RuntimeRGB;
  extensionMs: number;
  retractionMs: number;
}

/**
 * 11-slot signature for the ProffieOS `advanced` named style (see the
 * description string in `style_parser.h`):
 *   1 hilt color   2 middle color   3 tip color  (body = Gradient<1,2,3>)
 *   4 onspark color   5 onspark ms   6 blast color
 *   7 lockup color (AudioFlicker<7, White>)   8 clash color
 *   9 extension ms   10 retraction ms   11 spark-tip color
 */
export interface AdvancedVerbParams {
  color1: RuntimeRGB;
  color2: RuntimeRGB;
  color3: RuntimeRGB;
  onSparkColor: RuntimeRGB;
  onSparkTimeMs: number;
  blastColor: RuntimeRGB;
  lockupColor: RuntimeRGB;
  clashColor: RuntimeRGB;
  extensionMs: number;
  retractionMs: number;
  sparkTipColor: RuntimeRGB;
}

export interface FireVerbParams {
  warmColor: RuntimeRGB;
  hotColor: RuntimeRGB;
}

export interface UnstableVerbParams {
  warmColor: RuntimeRGB;
  warmerColor: RuntimeRGB;
  hotColor: RuntimeRGB;
  sparksColor: RuntimeRGB;
  extensionMs: number;
  retractionMs: number;
}

export interface StrobeVerbParams {
  standbyColor: RuntimeRGB;
  flashColor: RuntimeRGB;
  /** Flashes per second. ProffieOS computes `1000 / hz` in integer math. */
  flashFrequencyHz: number;
  flashMs: number;
  extensionMs: number;
  retractionMs: number;
}

/**
 * `cycle` = ColorCycle spin-up around
 * `AudioFlicker<RgbArg<3>, RgbArg<2>>` — quiet audio shows the FLICKER color
 * (arg 3), loud audio pushes toward the BASE color (arg 2). Despite the name it
 * is an audio-reactive blade, not a time-based color cycle.
 */
export interface CycleVerbParams {
  /** ColorCycle color while the blade spins up / down. */
  startColor: RuntimeRGB;
  /** Loud-audio color (AudioFlicker top layer). */
  baseColor: RuntimeRGB;
  /** Quiet-audio color (AudioFlicker bottom layer) + lockup flicker partner. */
  flickerColor: RuntimeRGB;
  blastColor: RuntimeRGB;
  lockupColor: RuntimeRGB;
}

export interface RainbowVerbParams {
  extensionMs: number;
  retractionMs: number;
}

// ─── Argument encoders ───

const INT_ARG_MAX = 2147483647; // IntArg stores an `int`

/** 8-bit channel → ProffieOS Color16 channel: ×257, rounded, clamped 0..65535. */
export function toColor16Channel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(65535, Math.round(value * 257)));
}

/** `r,g,b` RgbArg value in Color16 units. */
export function rgbArg16(c: RuntimeRGB): string {
  return `${toColor16Channel(c.r)},${toColor16Channel(c.g)},${toColor16Channel(c.b)}`;
}

/**
 * Non-negative decimal IntArg: floors fractions, clamps to [min, INT_MAX],
 * and falls back for NaN / ±Infinity so the string can never contain letters
 * or a minus sign.
 */
export function intArg(value: number, fallback: number, min = 0): string {
  const n = Number.isFinite(value) ? Math.floor(value) : Math.floor(fallback);
  return String(Math.max(min, Math.min(INT_ARG_MAX, n)));
}

// ─── Byte-exact verb builders ───

export function buildBuiltinStyleString(presetIndex: number, bladeNumber: number): string {
  return `builtin ${intArg(presetIndex, 0)} ${intArg(bladeNumber, 1, 1)}`;
}

export function buildStandardStyleString(p: StandardVerbParams): string {
  return [
    'standard',
    rgbArg16(p.color),
    rgbArg16(p.clashColor),
    intArg(p.extensionMs, 300),
    intArg(p.retractionMs, 800),
  ].join(' ');
}

export function buildAdvancedStyleString(p: AdvancedVerbParams): string {
  return [
    'advanced',
    rgbArg16(p.color1),
    rgbArg16(p.color2),
    rgbArg16(p.color3),
    rgbArg16(p.onSparkColor),
    intArg(p.onSparkTimeMs, 10),
    rgbArg16(p.blastColor),
    rgbArg16(p.lockupColor),
    rgbArg16(p.clashColor),
    intArg(p.extensionMs, 300),
    intArg(p.retractionMs, 800),
    rgbArg16(p.sparkTipColor),
  ].join(' ');
}

export function buildFireStyleString(p: FireVerbParams): string {
  return ['fire', rgbArg16(p.warmColor), rgbArg16(p.hotColor)].join(' ');
}

export function buildUnstableStyleString(p: UnstableVerbParams): string {
  return [
    'unstable',
    rgbArg16(p.warmColor),
    rgbArg16(p.warmerColor),
    rgbArg16(p.hotColor),
    rgbArg16(p.sparksColor),
    intArg(p.extensionMs, 100),
    intArg(p.retractionMs, 200),
  ].join(' ');
}

export function buildStrobeStyleString(p: StrobeVerbParams): string {
  return [
    'strobe',
    rgbArg16(p.standbyColor),
    rgbArg16(p.flashColor),
    // StrobeF divides 1000 by the frequency in integer math — never emit 0.
    intArg(p.flashFrequencyHz, 15, 1),
    intArg(p.flashMs, 1),
    intArg(p.extensionMs, 300),
    intArg(p.retractionMs, 800),
  ].join(' ');
}

export function buildCycleStyleString(p: CycleVerbParams): string {
  return [
    'cycle',
    rgbArg16(p.startColor),
    rgbArg16(p.baseColor),
    rgbArg16(p.flickerColor),
    rgbArg16(p.blastColor),
    rgbArg16(p.lockupColor),
  ].join(' ');
}

export function buildRainbowStyleString(p: RainbowVerbParams): string {
  return ['rainbow', intArg(p.extensionMs, 300), intArg(p.retractionMs, 800)].join(' ');
}

/**
 * TypeScript port of ProffieOS 7.12 `CurrentPreset::IsValidStyleString()`
 * (`common/current_preset.h:38-51`):
 *
 *   if (strlen(s) < 5) return false;
 *   for (; *s != ' '; s++) { if ('a' <= *s && *s <= 'z') continue; return false; }
 *   for (; *s; s++) { if digit / ' ' / ',' continue; return false; }
 *   return true;
 *
 * Note the first loop only ends at a space: a verb with no arguments at all
 * (e.g. bare `rainbow`) hits the terminating NUL and is rejected.
 */
export function isValidRuntimeStyleString(s: string): boolean {
  if (s.length < 5) return false;
  let i = 0;
  for (; i < s.length && s[i] !== ' '; i++) {
    const ch = s[i]!;
    if (ch >= 'a' && ch <= 'z') continue;
    return false;
  }
  if (i >= s.length) return false; // reached NUL before a space
  for (; i < s.length; i++) {
    const ch = s[i]!;
    if (ch >= '0' && ch <= '9') continue;
    if (ch === ' ' || ch === ',') continue;
    return false;
  }
  return true;
}

// ─── Which design knobs each verb has a slot for ───

export interface RuntimeVerbSlots {
  /** Carries the blade's own color(s). */
  baseColor: boolean;
  clashColor: boolean;
  blastColor: boolean;
  lockupColor: boolean;
  ignitionMs: boolean;
  retractionMs: boolean;
}

/** Read straight off the 7.12 `named_styles[]` templates. */
export const RUNTIME_VERB_SLOTS: Readonly<Record<RuntimeVerb, RuntimeVerbSlots>> = {
  // Factory style — nothing from the design reaches the blade.
  builtin: { baseColor: false, clashColor: false, blastColor: false, lockupColor: false, ignitionMs: false, retractionMs: false },
  // StyleNormalPtrX: blast + lockup flicker are fixed WHITE.
  standard: { baseColor: true, clashColor: true, blastColor: false, lockupColor: false, ignitionMs: true, retractionMs: true },
  advanced: { baseColor: true, clashColor: true, blastColor: true, lockupColor: true, ignitionMs: true, retractionMs: true },
  // StyleFirePtr: clash / lockup change flame intensity; no InOut timing.
  fire: { baseColor: true, clashColor: false, blastColor: false, lockupColor: false, ignitionMs: false, retractionMs: false },
  // LocalizedClash<…, White>, Blast<…, White>, fixed Yellow/Red lockup.
  unstable: { baseColor: true, clashColor: false, blastColor: false, lockupColor: false, ignitionMs: true, retractionMs: true },
  // StyleNormalPtrX<StrobeX<…>, Rainbow, …>: Rainbow clash, WHITE blast/lockup.
  strobe: { baseColor: true, clashColor: false, blastColor: false, lockupColor: false, ignitionMs: true, retractionMs: true },
  // ColorCycle spin-up (fixed 1000 ms fade), SimpleClashL<White>.
  cycle: { baseColor: true, clashColor: false, blastColor: true, lockupColor: true, ignitionMs: false, retractionMs: false },
  // StyleRainbowPtrX: no color slots, WHITE clash, no blast layer.
  rainbow: { baseColor: false, clashColor: false, blastColor: false, lockupColor: false, ignitionMs: true, retractionMs: true },
};

// ─── Color helpers (8-bit domain; rgbArg16 rounds at emit time) ───

const WHITE: RuntimeRGB = { r: 255, g: 255, b: 255 };

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Linear mix a → b (same as ProffieOS `Mix<Int<t·32768>, a, b>`). */
function mix(a: RuntimeRGB, b: RuntimeRGB, t: number): RuntimeRGB {
  const k = clamp01(t);
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  };
}

/** Mirror of ASTBuilder's `brighten()` (rounded toward white by `factor`). */
function brighten(c: RuntimeRGB, factor: number): RuntimeRGB {
  return {
    r: Math.min(255, Math.round(c.r + (255 - c.r) * factor)),
    g: Math.min(255, Math.round(c.g + (255 - c.g) * factor)),
    b: Math.min(255, Math.round(c.b + (255 - c.b) * factor)),
  };
}

function scale(c: RuntimeRGB, k: number): RuntimeRGB {
  return { r: c.r * k, g: c.g * k, b: c.b * k };
}

/** Hue of an RGB color in degrees (0 for greys). */
function hueOf(c: RuntimeRGB): number {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Mirror of the engine's `hslToRgb` (LEDArray.ts), h 0-360, s/l 0-100. */
function hslToRgb(h: number, s: number, l: number): RuntimeRGB {
  const hh = h / 360;
  const ss = s / 100;
  const ll = l / 100;
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  return {
    r: Math.round(hue2rgb(p, q, hh + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hh) * 255),
    b: Math.round(hue2rgb(p, q, hh - 1 / 3) * 255),
  };
}

// ─── Defensive readers for style-specific fields ───

function isRgb(v: unknown): v is RuntimeRGB {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.r === 'number' && Number.isFinite(c.r) &&
    typeof c.g === 'number' && Number.isFinite(c.g) &&
    typeof c.b === 'number' && Number.isFinite(c.b)
  );
}

function readRgb(cfg: RuntimeStyleInput, key: string): RuntimeRGB | undefined {
  const v = cfg[key];
  return isRgb(v) ? v : undefined;
}

function readNumber(cfg: RuntimeStyleInput, key: string): number | undefined {
  const v = cfg[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

interface ColorStop {
  position: number;
  color: RuntimeRGB;
}

function readStops(cfg: RuntimeStyleInput, key: string): ColorStop[] {
  const v = cfg[key];
  if (!Array.isArray(v)) return [];
  const out: ColorStop[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    if (typeof s.position === 'number' && Number.isFinite(s.position) && isRgb(s.color)) {
      out.push({ position: s.position, color: s.color });
    }
  }
  return out.sort((a, b) => a.position - b.position);
}

/**
 * Color of a stop list at `pos` — mirrors the engine's GradientStyle
 * (minus its slow time offset): bracket by stops, else first→last with the
 * lerp clamped, so positions outside the stop range hold the end color.
 */
function sampleStops(
  stops: ColorStop[],
  pos: number,
  interpolation: 'linear' | 'smooth' | 'step',
): RuntimeRGB {
  let lower = stops[0]!;
  let upper = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    if (pos >= stops[i]!.position && pos <= stops[i + 1]!.position) {
      lower = stops[i]!;
      upper = stops[i + 1]!;
      break;
    }
  }
  const range = upper.position - lower.position;
  const t = clamp01(range > 0 ? (pos - lower.position) / range : 0);
  if (interpolation === 'step') return t < 0.5 ? lower.color : upper.color;
  if (interpolation === 'smooth') return mix(lower.color, upper.color, t * t * (3 - 2 * t));
  return mix(lower.color, upper.color, t);
}

// ─── Mapping ───

const STYLE_LABELS: Record<string, string> = {
  photon: 'Photon',
  crystalShatter: 'Crystal Shatter',
  helix: 'Helix',
  dataStream: 'Data Stream',
  shatter: 'Shatter',
  cascade: 'Cascade',
  vortex: 'Vortex',
  torrent: 'Torrent',
  tidal: 'Tidal',
  moire: 'Moiré',
  neutron: 'Neutron',
  gravity: 'Gravity',
  bladeCharge: 'Blade Charge',
  automata: 'Automata',
  imageScroll: 'Image scroll',
};

function effectAndTiming(cfg: RuntimeStyleInput): Pick<
  AdvancedVerbParams,
  'blastColor' | 'lockupColor' | 'clashColor' | 'extensionMs' | 'retractionMs'
> {
  return {
    blastColor: cfg.blastColor,
    lockupColor: cfg.lockupColor,
    clashColor: cfg.clashColor,
    extensionMs: cfg.ignitionMs ?? 300,
    retractionMs: cfg.retractionMs ?? 800,
  };
}

/** The `advanced` verb with a hilt/mid/tip body and everything else from the config. */
function advancedBlade(
  cfg: RuntimeStyleInput,
  hilt: RuntimeRGB,
  mid: RuntimeRGB,
  tip: RuntimeRGB,
): string {
  return buildAdvancedStyleString({
    color1: hilt,
    color2: mid,
    color3: tip,
    // ProffieOS defaults for the slots KyberStation doesn't model.
    onSparkColor: WHITE,
    onSparkTimeMs: 10,
    sparkTipColor: WHITE,
    ...effectAndTiming(cfg),
  });
}

/** Gradient end the compile+flash codegen uses when `gradientEnd` is unset. */
function gradientEndOf(cfg: RuntimeStyleInput): RuntimeRGB {
  return readRgb(cfg, 'gradientEnd') ?? brighten(cfg.baseColor, 0.4);
}

function mapGradient(cfg: RuntimeStyleInput): RuntimeStyleMapping {
  const stops = readStops(cfg, 'gradientStops');
  const interpRaw = cfg.gradientInterpolation;
  const interpolation =
    interpRaw === 'smooth' || interpRaw === 'step' ? interpRaw : 'linear';

  if (stops.length >= 2) {
    const hilt = sampleStops(stops, 0, interpolation);
    const mid = sampleStops(stops, 0.5, interpolation);
    const tip = sampleStops(stops, 1, interpolation);
    const onGrid = stops.every((s) => [0, 0.5, 1].some((g) => Math.abs(s.position - g) < 1e-6));
    const exact = onGrid && interpolation !== 'step';
    const note = exact
      ? 'Hilt → tip gradient in your colors, held static, with your effect colors and timing.'
      : stops.length > 3
        ? `${stops.length}-stop gradient sampled at hilt, middle and tip (the advanced verb holds 3 evenly spaced stops), held static.`
        : interpolation === 'step'
          ? 'Hard-edged (step) gradient becomes a smooth hilt → middle → tip blend, held static.'
          : 'Gradient re-sampled at hilt, middle and tip (the advanced verb spaces its 3 stops evenly), held static.';
    return {
      styleString: advancedBlade(cfg, hilt, mid, tip),
      verb: 'advanced',
      fidelity: exact ? 'faithful' : 'approximate',
      note,
    };
  }

  const tip = gradientEndOf(cfg);
  return {
    styleString: advancedBlade(cfg, cfg.baseColor, mix(cfg.baseColor, tip, 0.5), tip),
    verb: 'advanced',
    fidelity: 'faithful',
    note: 'Hilt → tip gradient in your colors, held static, with your effect colors and timing.',
  };
}

function mapPainted(cfg: RuntimeStyleInput): RuntimeStyleMapping {
  // The compile+flash codegen emits the painted colors as an evenly spaced
  // Gradient<c1, …, cN>; sample that at hilt / middle / tip.
  const colors = readStops(cfg, 'colorPositions').map((s) => s.color);
  if (colors.length === 0) {
    const tip = gradientEndOf(cfg);
    return {
      styleString: advancedBlade(cfg, cfg.baseColor, mix(cfg.baseColor, tip, 0.5), tip),
      verb: 'advanced',
      fidelity: 'faithful',
      note: 'No painted regions — hilt → tip gradient in your colors, held static.',
    };
  }
  const even: ColorStop[] = colors.map((color, i) => ({
    position: colors.length === 1 ? 0 : i / (colors.length - 1),
    color,
  }));
  const hilt = sampleStops(even, 0, 'linear');
  const mid = colors.length === 1 ? hilt : sampleStops(even, 0.5, 'linear');
  const tip = colors.length === 1 ? hilt : sampleStops(even, 1, 'linear');
  const exact = colors.length <= 3;
  return {
    styleString: advancedBlade(cfg, hilt, mid, tip),
    verb: 'advanced',
    fidelity: exact ? 'faithful' : 'approximate',
    note: exact
      ? 'Painted colors as a static hilt → tip gradient.'
      : `${colors.length} painted colors sampled at hilt, middle and tip (the advanced verb holds 3 stops).`,
  };
}

function colorsOnly(cfg: RuntimeStyleInput, label: string): RuntimeStyleMapping {
  return {
    styleString: advancedBlade(cfg, cfg.baseColor, cfg.baseColor, cfg.baseColor),
    verb: 'advanced',
    fidelity: 'colors-only',
    note: `${label}'s animation needs a firmware flash — the saber shows a solid blade in your base color with your effect colors and timing.`,
  };
}

/**
 * `strobe` arguments that blink at `hz` with roughly even on/off halves.
 * StrobeF (`functions/strobe.h`) holds the flash for STROBE_MILLIS, then the
 * standby color for `1000 / STROBE_FREQUENCY` ms (integer division) — so the
 * real period is flashMs + 1000/freq. Pick freq ≈ 2·hz for the off half, then
 * size the flash so the full period lands on 1000/hz.
 */
function strobeFrom(cfg: RuntimeStyleInput, standby: RuntimeRGB, hz: number): string {
  const periodMs = 1000 / Math.max(0.05, hz);
  const freqArg = Math.max(1, Math.round((2 * 1000) / periodMs));
  const offMs = Math.floor(1000 / freqArg);
  return buildStrobeStyleString({
    standbyColor: standby,
    flashColor: cfg.baseColor,
    flashFrequencyHz: freqArg,
    flashMs: Math.max(1, Math.round(periodMs - offMs)),
    extensionMs: cfg.ignitionMs ?? 300,
    retractionMs: cfg.retractionMs ?? 800,
  });
}

function mapStyle(cfg: RuntimeStyleInput): RuntimeStyleMapping {
  const base = cfg.baseColor;

  switch (cfg.style) {
    case 'stable':
      return {
        styleString: advancedBlade(cfg, base, base, base),
        verb: 'advanced',
        fidelity: 'faithful',
        note: 'Solid blade in your color with your clash/blast/lockup colors and ignition/retraction timing (steady body — no audio flicker).',
      };

    case 'gradient':
      return mapGradient(cfg);

    case 'painted':
      return mapPainted(cfg);

    case 'rotoscope':
      return {
        styleString: advancedBlade(cfg, base, base, base),
        verb: 'advanced',
        fidelity: 'approximate',
        note: 'Solid blade in your color; the rotoscope core shimmer and swing brightening need a firmware flash.',
      };

    case 'darksaber':
      // Compile+flash emits Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>;
      // the advanced verb has 3 stops, so the core greys toward both ends.
      return {
        styleString: advancedBlade(cfg, WHITE, { r: 5, g: 5, b: 5 }, WHITE),
        verb: 'advanced',
        fidelity: 'approximate',
        note: 'White emitter and tip over a dark core — with only 3 gradient stops the core shades grey toward both ends.',
      };

    case 'mirage': {
      const tip = brighten(base, 0.4);
      return {
        styleString: advancedBlade(cfg, base, mix(base, tip, 0.5), tip),
        verb: 'advanced',
        fidelity: 'colors-only',
        note: "Mirage's heat-haze shimmer needs a firmware flash — the saber shows its base → bright gradient, held static.",
      };
    }

    case 'unstable':
      // Derivation (documented in docs/research/RUNTIME_PRESET_COVERAGE_2026-09-24.md):
      //   warm   = base × 150/255   (ProffieOS default warm:warmer ratio, Rgb<150,0,0>:Red)
      //   warmer = base
      //   hot    = Mix<Int<10000>, base, White>  (the codegen's unstable hot color)
      //   sparks = base 60% toward white          (the engine's peak crackle spike)
      return {
        styleString: buildUnstableStyleString({
          warmColor: scale(base, 150 / 255),
          warmerColor: base,
          hotColor: mix(base, WHITE, 10000 / 32768),
          sparksColor: mix(base, WHITE, 0.6),
          extensionMs: cfg.ignitionMs ?? 300,
          retractionMs: cfg.retractionMs ?? 800,
        }),
        verb: 'unstable',
        fidelity: 'faithful',
        note: "ProffieOS's unstable crackle in your colors with your ignition/retraction timing. Clash and blast flash white; lockup is a fixed yellow/red flicker.",
      };

    case 'fire':
      return {
        styleString: buildFireStyleString({ warmColor: base, hotColor: { r: 255, g: 200, b: 50 } }),
        verb: 'fire',
        fidelity: 'faithful',
        note: 'ProffieOS fire in your color. No ignition/retraction timing (the flame heats up) and no clash/blast/lockup colors — clash and lockup stoke the flames.',
      };

    case 'plasma':
      return {
        styleString: buildFireStyleString({
          warmColor: base,
          hotColor: readRgb(cfg, 'edgeColor') ?? brighten(base, 0.5),
        }),
        verb: 'fire',
        fidelity: 'approximate',
        note: 'Plasma arcs become ProffieOS fire in your base and edge colors. No timing or clash/blast/lockup colors.',
      };

    case 'cinder':
      return {
        styleString: buildFireStyleString({ warmColor: base, hotColor: { r: 255, g: 100, b: 0 } }),
        verb: 'fire',
        fidelity: 'approximate',
        note: 'Smoldering ProffieOS fire in your color; the swing-to-solid switch needs a firmware flash. No timing or clash/blast/lockup colors.',
      };

    case 'ember':
      return {
        styleString: buildFireStyleString({
          warmColor: scale(base, 0.12),
          hotColor: { r: 255, g: 80, b: 20 },
        }),
        verb: 'fire',
        fidelity: 'approximate',
        note: 'A dim smolder in your color with orange ProffieOS flames; the drifting embers need a firmware flash.',
      };

    case 'candle':
      return {
        styleString: buildFireStyleString({
          warmColor: { r: 255, g: 80, b: 10 },
          hotColor: { r: 255, g: 140, b: 40 },
        }),
        verb: 'fire',
        fidelity: 'approximate',
        note: 'Warm ProffieOS fire in the candle palette; the slow gust flicker needs a firmware flash.',
      };

    case 'pulse':
      return {
        styleString: buildCycleStyleString({
          startColor: base,
          baseColor: mix(base, WHITE, 8000 / 32768),
          flickerColor: base,
          blastColor: cfg.blastColor,
          lockupColor: cfg.lockupColor,
        }),
        verb: 'cycle',
        fidelity: 'approximate',
        note: "Audio-reactive: brightness follows the saber's sound instead of a timed pulse (no runtime verb pulses on a clock). Spin-up ignition, white clash.",
      };

    case 'aurora': {
      // The engine's Aurora blends the base 50/50 with a hue band drifting
      // across ~100° (mean offset +50°, HSL 80/55). The engine anchors that
      // band at hue = baseColor.r — a quirk that greys a blue preset out —
      // so the tint here anchors at the base color's own hue instead: the
      // blade stays on-color and shimmers toward its neighbor hue.
      // (Compile+flash currently emits a full Rainbow for aurora; see
      // docs/research/RUNTIME_PRESET_COVERAGE_2026-09-24.md.)
      const tint = mix(base, hslToRgb((hueOf(base) + 50) % 360, 80, 55), 0.5);
      return {
        styleString: buildCycleStyleString({
          startColor: base,
          baseColor: tint,
          flickerColor: base,
          blastColor: cfg.blastColor,
          lockupColor: cfg.lockupColor,
        }),
        verb: 'cycle',
        fidelity: 'approximate',
        note: 'Audio-reactive shimmer between your color and its aurora tint; moving color bands need a firmware flash. Spin-up ignition, white clash.',
      };
    }

    case 'nebula':
      return {
        styleString: buildCycleStyleString({
          startColor: base,
          baseColor: WHITE,
          flickerColor: mix(base, brighten(base, 0.6), 16000 / 32768),
          blastColor: cfg.blastColor,
          lockupColor: cfg.lockupColor,
        }),
        verb: 'cycle',
        fidelity: 'approximate',
        note: 'Audio-reactive flicker toward white over your nebula color; the churning gas needs a firmware flash. Spin-up ignition, white clash.',
      };

    case 'prism':
      return {
        styleString: buildRainbowStyleString({
          extensionMs: cfg.ignitionMs ?? 300,
          retractionMs: cfg.retractionMs ?? 800,
        }),
        verb: 'rainbow',
        fidelity: 'faithful',
        note: "Moving rainbow with your ignition/retraction timing — ProffieOS's Rainbow runs faster and packs more bands than the editor preview. White clash, no blast color.",
      };

    case 'sithFlicker': {
      // Codegen: Mix<Sin<1000/rate ms>, Mix<floor, Black, base>, base>.
      const rate = Math.max(0.1, readNumber(cfg, 'flickerRate') ?? 5);
      const floor = clamp01(readNumber(cfg, 'flickerMinBright') ?? 0.1);
      return {
        styleString: strobeFrom(cfg, scale(base, floor), rate),
        verb: 'strobe',
        fidelity: 'approximate',
        note: `Hard on/off strobe at ${Number(rate.toFixed(2))} Hz between dim and full color instead of a smooth flicker. The strobe verb flashes a rainbow on clash; blast is white.`,
      };
    }

    case 'tempoLock': {
      // Codegen: Mix<Sin<60000/BPM ms>, Mix<(1-depth), Black, base>, base>.
      const bpm = Math.max(1, Math.min(300, readNumber(cfg, 'tempoBpm') ?? 120));
      const depth = clamp01(readNumber(cfg, 'tempoDepth') ?? 0.5);
      return {
        styleString: strobeFrom(cfg, scale(base, 1 - depth), bpm / 60),
        verb: 'strobe',
        fidelity: 'approximate',
        note: `Flashes on the beat (${Math.round(bpm)} BPM) — a hard on/off strobe instead of a smooth pulse. The strobe verb flashes a rainbow on clash; blast is white.`,
      };
    }

    case 'imageScroll': {
      const tip = gradientEndOf(cfg);
      return {
        styleString: advancedBlade(cfg, base, mix(base, tip, 0.5), tip),
        verb: 'advanced',
        fidelity: 'colors-only',
        note: 'Image scroll (light painting) needs a firmware flash — the saber shows a static base → end gradient.',
      };
    }

    default: {
      const label = STYLE_LABELS[cfg.style];
      if (label) return colorsOnly(cfg, label);
      return {
        styleString: advancedBlade(cfg, base, base, base),
        verb: 'advanced',
        fidelity: 'colors-only',
        note: `Style "${cfg.style}" has no runtime verb — the saber shows a solid blade in your base color with your effect colors and timing.`,
      };
    }
  }
}

/**
 * Map a KyberStation blade design to the closest ProffieOS 7.12 runtime verb.
 * Always returns a string that passes `isValidRuntimeStyleString()`.
 */
export function mapBladeConfigToRuntimeStyle(config: RuntimeStyleInput): RuntimeStyleMapping {
  const mapped = mapStyle(config);
  const caveats: string[] = [];
  let fidelity = mapped.fidelity;

  const bindings = (config.modulation as { bindings?: unknown[] } | undefined)?.bindings;
  if (Array.isArray(bindings) && bindings.length > 0) {
    caveats.push('Modulation bindings (motion/sound routing) do not transfer.');
    if (fidelity === 'faithful') fidelity = 'approximate';
  }
  if (typeof config.importedRawCode === 'string' && config.importedRawCode.length > 0) {
    caveats.push('Imported ProffieOS code cannot run from the SD card; this maps the reconstructed style.');
    if (fidelity === 'faithful') fidelity = 'approximate';
  }

  return {
    ...mapped,
    fidelity,
    note: caveats.length > 0 ? `${mapped.note} ${caveats.join(' ')}` : mapped.note,
  };
}
