// ─── Style Templates ───
// AudioFlicker, Layers, StyleFire, Pulsing, Stripes, etc.
// Clean-room implementations based on ProffieOS documented behavior.

import { BaseStyleTemplate } from '../BaseStyle.js';
import type { BladeState, Color, EffectSystem, StyleTemplate } from '../types.js';
import { BLACK, clamp, colorAlpha, alphaBlend, mixColors, PROFFIE_MAX } from '../types.js';
import { hashPair, lerp, ledToBladePos } from '../utils.js';
import { isFireConfig } from './tags.js';

// ─── Layers<Base, L1, L2, ...> ───
// THE fundamental compositor. Applies layers bottom-up.
// Each layer's color is blended onto the base using its max channel as alpha.
// This is the core of ProffieOS style composition.

export class LayersTemplate extends BaseStyleTemplate {
  private readonly layers: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.layers = args;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    for (const layer of this.layers) layer.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.layers.length === 0) return BLACK;

    // Start with base layer
    let result = this.layers[0].getColor(led);

    // Apply each subsequent layer on top
    for (let i = 1; i < this.layers.length; i++) {
      const layerColor = this.layers[i].getColor(led);
      const alpha = colorAlpha(layerColor);
      if (alpha > 0) {
        result = alphaBlend(result, layerColor, alpha);
      }
    }

    return result;
  }

  getChildren(): StyleTemplate[] {
    return this.layers;
  }
}

// ─── AudioFlicker<A, B> ───
// Random per-LED blend between A and B based on audio level.
// Each LED gets an independent random value per frame, biased by sound.

export class AudioFlickerTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
  }

  getColor(led: number): Color {
    const a = this.colorA.getColor(led);
    const b = this.colorB.getColor(led);

    // Audio-driven random mix per LED
    // Higher sound level = more LED "b" color mixed in (flickering)
    const soundBias = this.state.soundLevel / PROFFIE_MAX; // 0-1
    const rng = hashPair(led, Math.floor(this.state.timeMs / 30));
    // When sound is low, mostly color A; when high, random mix
    const threshold = 0.3 + soundBias * 0.5;
    const mixFactor = rng < threshold ? 0 : (rng - threshold) / (1 - threshold);

    return mixColors(a, b, Math.round(mixFactor * PROFFIE_MAX));
  }

  getChildren(): StyleTemplate[] {
    return [this.colorA, this.colorB];
  }
}

// ─── StyleFire<Color1, Color2, Delay?, Speed?, FireConfig?> ───
// Fire simulation along the blade. The optional trailing `FireConfig`
// arg carries three integers — Cooling, Heating, IntensityBase — that
// tune the heat-map simulation. When absent, falls back to defaults
// that match the original (pre-FireConfig) ProffieOS behavior.

export class StyleFireTemplate extends BaseStyleTemplate {
  private readonly color1: StyleTemplate;
  private readonly color2: StyleTemplate;
  private readonly delay: number;
  private readonly speed: number;
  /** FireConfig Cooling — higher values dissipate heat faster (default 3). */
  private readonly cooling: number;
  /** FireConfig Heating — spark intensity at the base (default 2000). */
  private readonly heating: number;
  /** FireConfig IntensityBase — heat persistence per frame (default 5). */
  private readonly intensityBase: number;
  private heatMap: number[] = [];
  private lastUpdate = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color1 = args[0]!;
    this.color2 = args[1]!;
    this.delay = args[2]?.getInteger(0) ?? 0;
    this.speed = args[3]?.getInteger(0) ?? 2;
    // 5th arg: FireConfig<Cooling, Heating, IntensityBase>. The codegen
    // emits this for the `unstable` and `fire` style families; the
    // older `cinder` shape (4-arg) doesn't pass it, in which case we
    // use defaults that match the pre-FireConfig simulation.
    const fireConfig = args[4];
    if (isFireConfig(fireConfig)) {
      this.cooling = fireConfig.cooling;
      this.heating = fireConfig.heating;
      this.intensityBase = fireConfig.intensityBase;
    } else {
      this.cooling = 3;
      this.heating = 2000;
      this.intensityBase = 5;
    }
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color1.run(state, effects);
    this.color2.run(state, effects);

    const numLeds = state.numLeds || 144;

    // Initialize heat map
    if (this.heatMap.length !== numLeds) {
      this.heatMap = new Array(numLeds).fill(0);
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.random() * 128;
      }
    }

    const updateInterval = Math.max(10, 30 + this.delay);
    if (state.timeMs - this.lastUpdate > updateInterval) {
      this.lastUpdate = state.timeMs;

      // Cooling per-step is scaled by both the legacy `speed` arg and
      // the FireConfig Cooling param. Higher product = faster decay.
      const coolFactor = Math.max(1, this.speed * 5 * (this.cooling / 3));
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.max(0, this.heatMap[i] - Math.random() * coolFactor);
      }

      // Heat rises (diffusion upward)
      for (let i = numLeds - 1; i >= 2; i--) {
        this.heatMap[i] = (this.heatMap[i - 1] + this.heatMap[i - 2] * 2) / 3;
      }

      // Spark at base — scaled by FireConfig Heating relative to default
      // 2000. Higher heating = brighter sparks. IntensityBase contributes
      // an always-on floor for the base region.
      if (Math.random() < 0.5) {
        const spark = Math.floor(Math.random() * 7);
        const heatScale = this.heating / 2000;
        const baseFloor = this.intensityBase * 3;
        this.heatMap[spark] = Math.min(
          255,
          this.heatMap[spark] + baseFloor + (128 + Math.random() * 128) * heatScale,
        );
      }
    }
  }

  getColor(led: number): Color {
    const heat = clamp(Math.round(this.heatMap[led] ?? 0), 0, 255);
    const t = heat / 255;
    const c1 = this.color1.getColor(led);
    const c2 = this.color2.getColor(led);
    return mixColors(c2, c1, Math.round(t * PROFFIE_MAX));
  }

  getChildren(): StyleTemplate[] {
    return [this.color1, this.color2];
  }
}

// ─── Pulsing<A, B, PulseMs> ───
// Alternating pulse between two colors.

export class PulsingTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;
  private readonly pulseMs: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
    this.pulseMs = args[2]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
    this.pulseMs.run(state, effects);
  }

  getColor(led: number): Color {
    const period = this.pulseMs.getInteger(led);
    if (period <= 0) return this.colorA.getColor(led);

    const phase = (this.state.timeMs % period) / period;
    const t = (Math.cos(phase * 2 * Math.PI) + 1) / 2; // 0 to 1
    return mixColors(
      this.colorA.getColor(led),
      this.colorB.getColor(led),
      Math.round(t * PROFFIE_MAX)
    );
  }

  getChildren(): StyleTemplate[] {
    return [this.colorA, this.colorB, this.pulseMs];
  }
}

// ─── Stripes<Width, Speed, C1, C2, ...> ───
// Moving stripe pattern along the blade.

export class StripesTemplate extends BaseStyleTemplate {
  private readonly width: StyleTemplate;
  private readonly speed: StyleTemplate;
  private readonly colors: StyleTemplate[];

  constructor(args: StyleTemplate[]) {
    super();
    this.width = args[0]!;
    this.speed = args[1]!;
    this.colors = args.slice(2);
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.width.run(state, effects);
    this.speed.run(state, effects);
    for (const c of this.colors) c.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.colors.length === 0) return BLACK;

    const width = Math.max(1, this.width.getInteger(led));
    const speed = this.speed.getInteger(led);
    const numLeds = this.state.numLeds || 144;

    // Position with time-based scroll
    const scroll = (this.state.timeMs * speed) / 1000000;
    const pos = ((led / numLeds) * PROFFIE_MAX + scroll) % width;
    const normalizedPos = pos / width;

    // Map position to color in the stripe pattern
    const segments = this.colors.length;
    const segFloat = ((normalizedPos % 1) + 1) % 1 * segments;
    const seg = Math.floor(segFloat) % segments;
    const nextSeg = (seg + 1) % segments;
    const segT = segFloat - Math.floor(segFloat);

    const a = this.colors[seg].getColor(led);
    const b = this.colors[nextSeg].getColor(led);

    return {
      r: clamp(Math.round(lerp(a.r, b.r, segT)), 0, 255),
      g: clamp(Math.round(lerp(a.g, b.g, segT)), 0, 255),
      b: clamp(Math.round(lerp(a.b, b.b, segT)), 0, 255),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.width, this.speed, ...this.colors];
  }
}

// ─── StripesX<Speed, C1, C2, ...> ───
// Like Stripes but width is determined by number of colors.

export class StripesXTemplate extends StripesTemplate {
  constructor(args: StyleTemplate[]) {
    // StripesX: speed is first arg, width is auto
    const width = { run() { /* noop */ }, getColor() { return BLACK; }, getInteger() { return 10000; }, getChildren() { return []; } } as StyleTemplate;
    super([width, args[0]!, ...args.slice(1)]);
  }
}

// ─── Blinking<A, B, OnMs, OffMs> ───
// Alternating blink between two colors.

export class BlinkingTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;
  private readonly onMs: StyleTemplate;
  private readonly offMs: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
    this.onMs = args[2]!;
    this.offMs = args[3]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
    this.onMs.run(state, effects);
    this.offMs.run(state, effects);
  }

  getColor(led: number): Color {
    const onTime = this.onMs.getInteger(led);
    const offTime = this.offMs.getInteger(led);
    const period = onTime + offTime;
    if (period <= 0) return this.colorA.getColor(led);

    const phase = this.state.timeMs % period;
    return phase < onTime
      ? this.colorA.getColor(led)
      : this.colorB.getColor(led);
  }
}

// ─── Cylon<Color, Size, Speed> ───
// Knight Rider scanner effect — a bright spot bouncing back and forth.

export class CylonTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly size: number;
  private readonly speed: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.size = args[1]?.getInteger(0) ?? 10;
    this.speed = args[2]?.getInteger(0) ?? 400;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const period = this.speed * 2;
    const t = (this.state.timeMs % period) / period;
    // Bounce: 0→1→0
    const pos = t < 0.5 ? t * 2 : 2 - t * 2;
    const center = pos * numLeds;
    const dist = Math.abs(led - center);

    if (dist < this.size) {
      const brightness = 1 - dist / this.size;
      const c = this.color.getColor(led);
      return {
        r: Math.round(c.r * brightness),
        g: Math.round(c.g * brightness),
        b: Math.round(c.b * brightness),
      };
    }
    return BLACK;
  }
}

// ─── RandomFlicker<A, B> ───
// Random per-LED flickering between two colors.

export class RandomFlickerTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
  }

  getColor(led: number): Color {
    const rng = hashPair(led, Math.floor(this.state.timeMs / 50));
    return rng > 0.5
      ? this.colorA.getColor(led)
      : this.colorB.getColor(led);
  }
}

// ─── BrownNoiseFlicker<A, B, Grade> ───
// Brownian motion flickering between two colors.

export class BrownNoiseFlickerTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;
  private readonly grade: number;
  private noiseValues: number[] = [];

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
    this.grade = args[2]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);

    const numLeds = state.numLeds || 144;
    if (this.noiseValues.length !== numLeds) {
      this.noiseValues = new Array(numLeds).fill(0).map(() => Math.random());
    }

    // Brownian walk
    const step = this.grade / 10000;
    for (let i = 0; i < numLeds; i++) {
      this.noiseValues[i] += (Math.random() - 0.5) * step;
      this.noiseValues[i] = clamp(this.noiseValues[i], 0, 1);
    }
  }

  getColor(led: number): Color {
    const t = this.noiseValues[led] ?? 0.5;
    return mixColors(
      this.colorA.getColor(led),
      this.colorB.getColor(led),
      Math.round(t * PROFFIE_MAX)
    );
  }
}

// ─── BrownNoiseFlickerL<Color, Grade> ───
// Layer variant of BrownNoiseFlicker — single color with alpha from noise.

export class BrownNoiseFlickerLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly grade: number;
  private noiseValues: number[] = [];

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.grade = args[1]?.getInteger(0) ?? 300;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);

    const numLeds = state.numLeds || 144;
    if (this.noiseValues.length !== numLeds) {
      this.noiseValues = new Array(numLeds).fill(0).map(() => Math.random());
    }

    const step = this.grade / 10000;
    for (let i = 0; i < numLeds; i++) {
      this.noiseValues[i] += (Math.random() - 0.5) * step;
      this.noiseValues[i] = clamp(this.noiseValues[i], 0, 1);
    }
  }

  getColor(led: number): Color {
    const c = this.color.getColor(led);
    const alpha = this.noiseValues[led] ?? 0.5;
    return {
      r: Math.round(c.r * alpha),
      g: Math.round(c.g * alpha),
      b: Math.round(c.b * alpha),
    };
  }
}

// ─── HumpFlicker<A, B, HumpCount> ───
// Smooth sine hump pattern flickering.

export class HumpFlickerTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;
  private readonly humpCount: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
    this.humpCount = args[2]?.getInteger(0) ?? 10;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
  }

  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const phase = (this.state.timeMs / 500) + (led / numLeds) * this.humpCount * Math.PI * 2;
    const t = (Math.sin(phase) + 1) / 2;
    return mixColors(
      this.colorA.getColor(led),
      this.colorB.getColor(led),
      Math.round(t * PROFFIE_MAX)
    );
  }
}

// ─── HumpFlickerL<Color, HumpCount> ───

export class HumpFlickerLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly humpCount: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.humpCount = args[1]?.getInteger(0) ?? 10;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const numLeds = this.state.numLeds || 144;
    const phase = (this.state.timeMs / 500) + (led / numLeds) * this.humpCount * Math.PI * 2;
    const alpha = (Math.sin(phase) + 1) / 2;
    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * alpha),
      g: Math.round(c.g * alpha),
      b: Math.round(c.b * alpha),
    };
  }
}

// ─── RandomPerLEDFlickerL<Color> ───
// Random per-LED flicker as a layer.

export class RandomPerLEDFlickerLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const c = this.color.getColor(led);
    const rng = hashPair(led, Math.floor(this.state.timeMs / 30));
    return {
      r: Math.round(c.r * rng),
      g: Math.round(c.g * rng),
      b: Math.round(c.b * rng),
    };
  }
}

// ─── Strobe<Color, StrobeColor, Frequency, StrobeMs> ───
// Strobe effect — flashes strobe color at given frequency.

export class StrobeTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly strobeColor: StyleTemplate;
  private readonly frequency: number;
  private readonly strobeMs: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.strobeColor = args[1]!;
    this.frequency = args[2]?.getInteger(0) ?? 50;
    this.strobeMs = args[3]?.getInteger(0) ?? 1;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    this.strobeColor.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.frequency <= 0) return this.color.getColor(led);
    const period = 1000 / this.frequency;
    const phase = this.state.timeMs % period;
    return phase < this.strobeMs
      ? this.strobeColor.getColor(led)
      : this.color.getColor(led);
  }
}

// ─── OnSpark<SparkColor, SparkMs?> ───
// Spark effect at ignition — decaying flash.

export class OnSparkTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly durationMs: number;
  private ignitionTime = -1;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.durationMs = args[1]?.getInteger(0) ?? 200;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    // Track ignition
    if (state.isOn && this.ignitionTime < 0) {
      this.ignitionTime = state.timeMs;
    }
    if (!state.isOn) {
      this.ignitionTime = -1;
    }
  }

  getColor(led: number): Color {
    if (this.ignitionTime < 0) return BLACK;
    const elapsed = this.state.timeMs - this.ignitionTime;
    if (elapsed >= this.durationMs) return BLACK;

    const fade = 1 - elapsed / this.durationMs;
    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * fade),
      g: Math.round(c.g * fade),
      b: Math.round(c.b * fade),
    };
  }
}

// ─── AlphaMixL<Position, Shape, Color1, Color2> ───
// Mixes two colors based on a position-aware shape function.
// Shape provides the mix factor at each LED position.

export class AlphaMixLTemplate extends BaseStyleTemplate {
  private readonly position: StyleTemplate;
  private readonly shape: StyleTemplate;
  private readonly color1: StyleTemplate;
  private readonly color2: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.position = args[0]!;
    this.shape = args[1]!;
    this.color1 = args[2]!;
    this.color2 = args[3]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.position.run(state, effects);
    this.shape.run(state, effects);
    this.color1.run(state, effects);
    this.color2.run(state, effects);
  }

  getColor(led: number): Color {
    const factor = clamp(this.shape.getInteger(led), 0, PROFFIE_MAX);
    const c1 = this.color1.getColor(led);
    const c2 = this.color2.getColor(led);
    return mixColors(c1, c2, factor);
  }

  getChildren(): StyleTemplate[] {
    return [this.position, this.shape, this.color1, this.color2];
  }
}

// ─── AudioFlickerL<Color> ───
// Layer version of AudioFlicker — flickers a color based on audio level.
// As a layer, it's used inside Layers<> and blended via max-channel alpha.

export class AudioFlickerLTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    const audioLevel = this.state.soundLevel ?? 0;
    const baseFlicker = 0.5 + audioLevel * 0.5;
    const flickerHash = hashPair(led, Math.floor(this.state.timeMs / 30));
    const flicker = baseFlicker * (0.7 + flickerHash * 0.3);
    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * clamp(flicker, 0, 1)),
      g: Math.round(c.g * clamp(flicker, 0, 1)),
      b: Math.round(c.b * clamp(flicker, 0, 1)),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.color];
  }
}

// ─── BlastFadeout<Color, Ms> ───
// Blast effect that fades out over Ms milliseconds.

export class BlastFadeoutTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly durationMs: number;
  private blastTime = -1;
  private blastLocation = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.durationMs = args[1]?.getInteger(0) ?? 250;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    const blast = effects.getLastEffect('EFFECT_BLAST');
    if (blast && blast.startTimeMs > this.blastTime) {
      this.blastTime = blast.startTimeMs;
      this.blastLocation = blast.location ?? 0.5;
    }
  }

  getColor(led: number): Color {
    if (this.blastTime < 0) return BLACK;
    const elapsed = this.state.timeMs - this.blastTime;
    if (elapsed >= this.durationMs) return BLACK;

    const fade = 1 - elapsed / this.durationMs;
    const numLeds = this.state.numLeds || 144;
    const ledPos = ledToBladePos(led, numLeds);
    const dist = Math.abs(ledPos - this.blastLocation) * PROFFIE_MAX;
    const width = PROFFIE_MAX * 0.1;
    if (dist > width) return BLACK;

    const proximity = 1 - dist / width;
    const intensity = fade * proximity;
    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * intensity),
      g: Math.round(c.g * intensity),
      b: Math.round(c.b * intensity),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.color];
  }
}

// ─── Lockup<Base, LockupColor, DragColor, LockupShape?, DragShape?> ───
// Lockup style — shows LockupColor during lockup, DragColor during drag.

export class LockupTemplate extends BaseStyleTemplate {
  private readonly base: StyleTemplate;
  private readonly lockupColor: StyleTemplate;
  private readonly dragColor: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.base = args[0]!;
    this.lockupColor = args[1]!;
    this.dragColor = args[2] ?? args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.base.run(state, effects);
    this.lockupColor.run(state, effects);
    this.dragColor.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.effects?.lockupType === 'LOCKUP_DRAG') {
      return this.dragColor.getColor(led);
    }
    if (this.effects?.lockupType === 'LOCKUP_NORMAL') {
      return this.lockupColor.getColor(led);
    }
    return this.base.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.base, this.lockupColor, this.dragColor];
  }
}

// ─── LocalizedClash<Color, Ms?, Width?, Top?> ───
// Non-layer version of clash at impact location.

export class LocalizedClashTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly durationMs: number;
  private readonly width: number;
  private clashTime = -1;
  private clashLocation = 0;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.durationMs = args[1]?.getInteger(0) ?? 400;
    this.width = args[2]?.getInteger(0) ?? 16384;
    // args[3] is top position (optional)
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
    const clash = effects.getLastEffect('EFFECT_CLASH');
    if (clash && clash.startTimeMs > this.clashTime) {
      this.clashTime = clash.startTimeMs;
      this.clashLocation = clash.location ?? 0.7;
    }
  }

  getColor(led: number): Color {
    if (this.clashTime < 0) return BLACK;
    const elapsed = this.state.timeMs - this.clashTime;
    if (elapsed >= this.durationMs) return BLACK;

    const fade = 1 - elapsed / this.durationMs;
    const numLeds = this.state.numLeds || 144;
    const ledPos = led / Math.max(1, numLeds - 1);
    const dist = Math.abs(ledPos - this.clashLocation);
    const halfWidth = (this.width / PROFFIE_MAX) * 0.5;
    if (dist > halfWidth) return BLACK;

    const intensity = fade * (1 - dist / halfWidth);
    const c = this.color.getColor(led);
    return {
      r: Math.round(c.r * intensity),
      g: Math.round(c.g * intensity),
      b: Math.round(c.b * intensity),
    };
  }

  getChildren(): StyleTemplate[] {
    return [this.color];
  }
}

// ─── LocalizedClashL<Color, Ms?, Width?, Top?> ───
// Layer version of localized clash.

export class LocalizedClashLTemplate extends LocalizedClashTemplate {}

// ─── RandomBlink<Ms, OnMs?, OffMs?> ───
// Random per-LED blinking with configurable timing.

export class RandomBlinkTemplate extends BaseStyleTemplate {
  private readonly periodMs: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.periodMs = args[0]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.periodMs.run(state, effects);
  }

  getInteger(led: number): number {
    const period = Math.max(10, this.periodMs.getInteger(led));
    const phase = hashPair(led, 9999) * period;
    const t = ((this.state.timeMs + phase) % period) / period;
    return t < 0.5 ? PROFFIE_MAX : 0;
  }

  getColor(led: number): Color {
    return this.getInteger(led) > 0 ? { r: 255, g: 255, b: 255 } : BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.periodMs];
  }
}

// ─── RandomPerLEDFlicker<Color1, Color2> ───
// Each LED randomly flickers between two colors per frame.

export class RandomPerLEDFlickerTemplate extends BaseStyleTemplate {
  private readonly colorA: StyleTemplate;
  private readonly colorB: StyleTemplate;

  constructor(args: StyleTemplate[]) {
    super();
    this.colorA = args[0]!;
    this.colorB = args[1]!;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.colorA.run(state, effects);
    this.colorB.run(state, effects);
  }

  getColor(led: number): Color {
    const rng = hashPair(led, Math.floor(this.state.timeMs / 16));
    return rng > 0.5 ? this.colorA.getColor(led) : this.colorB.getColor(led);
  }

  getChildren(): StyleTemplate[] {
    return [this.colorA, this.colorB];
  }
}

// ─── Sparkle<SparkColor, SparkChance?, SparkMs?> ───
// Random sparkle effect on top of other colors.

export class SparkleTemplate extends BaseStyleTemplate {
  private readonly color: StyleTemplate;
  private readonly chance: number;
  private readonly durationMs: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color = args[0]!;
    this.chance = args[1]?.getInteger(0) ?? 3;
    this.durationMs = args[2]?.getInteger(0) ?? 100;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color.run(state, effects);
  }

  getColor(led: number): Color {
    if (this.chance <= 0) return BLACK;
    const timeSlot = Math.floor(this.state.timeMs / this.durationMs);
    const rng = hashPair(led, timeSlot);
    if (rng < 1 / this.chance) {
      return this.color.getColor(led);
    }
    return BLACK;
  }

  getChildren(): StyleTemplate[] {
    return [this.color];
  }
}

// ─── StaticFire<Color1, Color2, Delay?, Speed?, Norm?> ───
// Static fire pattern — similar to StyleFire but with fixed parameters.

export class StaticFireTemplate extends BaseStyleTemplate {
  private readonly color1: StyleTemplate;
  private readonly color2: StyleTemplate;
  private heatMap: number[] = [];
  private lastUpdate = 0;
  private readonly delay: number;
  private readonly speed: number;

  constructor(args: StyleTemplate[]) {
    super();
    this.color1 = args[0]!;
    this.color2 = args[1]!;
    this.delay = args[2]?.getInteger(0) ?? 0;
    this.speed = args[3]?.getInteger(0) ?? 2;
  }

  run(state: BladeState, effects: EffectSystem): void {
    super.run(state, effects);
    this.color1.run(state, effects);
    this.color2.run(state, effects);

    const numLeds = state.numLeds || 144;

    if (this.heatMap.length !== numLeds) {
      this.heatMap = new Array(numLeds).fill(0);
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.random() * 128;
      }
    }

    const updateInterval = Math.max(10, 30 + this.delay);
    if (state.timeMs - this.lastUpdate > updateInterval) {
      this.lastUpdate = state.timeMs;

      const coolFactor = Math.max(1, this.speed * 5);
      for (let i = 0; i < numLeds; i++) {
        this.heatMap[i] = Math.max(0, this.heatMap[i] - Math.random() * coolFactor);
      }

      for (let i = numLeds - 1; i >= 2; i--) {
        this.heatMap[i] = (this.heatMap[i - 1] + this.heatMap[i - 2] * 2) / 3;
      }

      if (Math.random() < 0.5) {
        const spark = Math.floor(Math.random() * 7);
        this.heatMap[spark] = Math.min(255, this.heatMap[spark] + 128 + Math.random() * 128);
      }
    }
  }

  getColor(led: number): Color {
    const heat = clamp(Math.round(this.heatMap[led] ?? 0), 0, 255);
    const t = heat / 255;
    const c1 = this.color1.getColor(led);
    const c2 = this.color2.getColor(led);
    return mixColors(c2, c1, Math.round(t * PROFFIE_MAX));
  }

  getChildren(): StyleTemplate[] {
    return [this.color1, this.color2];
  }
}
