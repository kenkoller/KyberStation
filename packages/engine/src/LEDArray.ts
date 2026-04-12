import type { RGB } from './types.js';

/**
 * Typed-array backed LED buffer. Zero allocations per frame.
 */
export class LEDArray {
  readonly count: number;
  readonly buffer: Uint8Array;

  constructor(ledCount: number) {
    this.count = ledCount;
    this.buffer = new Uint8Array(ledCount * 3);
  }

  setPixel(i: number, r: number, g: number, b: number): void {
    const off = i * 3;
    this.buffer[off] = Math.max(0, Math.min(255, r)) | 0;
    this.buffer[off + 1] = Math.max(0, Math.min(255, g)) | 0;
    this.buffer[off + 2] = Math.max(0, Math.min(255, b)) | 0;
  }

  setPixelRGB(i: number, c: RGB): void {
    this.setPixel(i, c.r, c.g, c.b);
  }

  getPixel(i: number): RGB {
    const off = i * 3;
    return { r: this.buffer[off], g: this.buffer[off + 1], b: this.buffer[off + 2] };
  }

  getR(i: number): number { return this.buffer[i * 3]; }
  getG(i: number): number { return this.buffer[i * 3 + 1]; }
  getB(i: number): number { return this.buffer[i * 3 + 2]; }

  fill(r: number, g: number, b: number): void {
    for (let i = 0; i < this.count; i++) {
      this.setPixel(i, r, g, b);
    }
  }

  fillRange(start: number, end: number, r: number, g: number, b: number): void {
    for (let i = start; i <= end && i < this.count; i++) {
      this.setPixel(i, r, g, b);
    }
  }

  clear(): void {
    this.buffer.fill(0);
  }

  copyFrom(other: LEDArray): void {
    this.buffer.set(other.buffer);
  }

  /** Apply a float mask (0-1) to all pixels. */
  applyMask(mask: Float32Array): void {
    for (let i = 0; i < this.count; i++) {
      const m = mask[i];
      const off = i * 3;
      this.buffer[off] = (this.buffer[off] * m) | 0;
      this.buffer[off + 1] = (this.buffer[off + 1] * m) | 0;
      this.buffer[off + 2] = (this.buffer[off + 2] * m) | 0;
    }
  }
}

// ─── Color utilities (zero-allocation) ───

export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  const ct = Math.max(0, Math.min(1, t));
  return {
    r: lerpNum(c1.r, c2.r, ct),
    g: lerpNum(c1.g, c2.g, ct),
    b: lerpNum(c1.b, c2.b, ct),
  };
}

export function clampColor(c: RGB): RGB {
  return {
    r: Math.max(0, Math.min(255, c.r)) | 0,
    g: Math.max(0, Math.min(255, c.g)) | 0,
    b: Math.max(0, Math.min(255, c.b)) | 0,
  };
}

export function blendAdd(base: RGB, overlay: RGB, strength: number = 1): RGB {
  return {
    r: Math.min(255, base.r + overlay.r * strength),
    g: Math.min(255, base.g + overlay.g * strength),
    b: Math.min(255, base.b + overlay.b * strength),
  };
}

export function blendMultiply(base: RGB, overlay: RGB): RGB {
  return {
    r: (base.r * overlay.r) / 255,
    g: (base.g * overlay.g) / 255,
    b: (base.b * overlay.b) / 255,
  };
}

export function blendScreen(base: RGB, overlay: RGB): RGB {
  return {
    r: 255 - ((255 - base.r) * (255 - overlay.r)) / 255,
    g: 255 - ((255 - base.g) * (255 - overlay.g)) / 255,
    b: 255 - ((255 - base.b) * (255 - overlay.b)) / 255,
  };
}

export function scaleColor(c: RGB, factor: number): RGB {
  return {
    r: c.r * factor,
    g: c.g * factor,
    b: c.b * factor,
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}
