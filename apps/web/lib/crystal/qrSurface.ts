// ─── Kyber Crystal — QR Surface ───
//
// Real QR matrix generation via the `qrcode` npm library, rasterised
// onto a CanvasTexture, mapped onto a planar decal that sits on the
// crystal's front face. The QR payload and decorative crystal body are
// strictly orthogonal — this module owns only the scannable part.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §8.

import * as THREE from 'three';
import QRCode from 'qrcode';

// ─── QR matrix → Canvas ───

export interface QrSurfaceOptions {
  /** Pixel size of the output canvas. Higher = sharper. */
  canvasSize?: number;
  /** Module (dark) colour. */
  darkColor?: string;
  /** Background (light) colour. */
  lightColor?: string;
  /** Error-correction level. 'M' is our default — good balance of
   *  payload size vs camera-stack robustness. */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Invert polarity (white modules on black). Form 4 darksaber case. */
  invertPolarity?: boolean;
}

export interface QrSurfaceResult {
  /** The rasterised QR as a Three.js texture. */
  texture: THREE.CanvasTexture;
  /** The underlying canvas (for snapshot / debugging). */
  canvas: HTMLCanvasElement;
  /** Module count (e.g. 21 for QR Version 1, 25 for V2, 29 for V3). */
  moduleCount: number;
  /** The QR version selected by the encoder. */
  version: number;
}

/**
 * Generate a real, scannable QR code and return it as a CanvasTexture
 * ready to map onto a Three.js material.
 *
 * Caller is responsible for disposing `texture` when the crystal
 * re-renders or unmounts.
 */
export async function createQrSurface(
  glyph: string,
  options: QrSurfaceOptions = {},
): Promise<QrSurfaceResult> {
  const canvasSize = options.canvasSize ?? 512;
  const dark = options.invertPolarity ? '#ffffff' : (options.darkColor ?? '#0a0a10');
  const light = options.invertPolarity ? '#0a0a10' : (options.lightColor ?? '#ffffff');
  const errorLevel = options.errorCorrectionLevel ?? 'M';

  if (typeof document === 'undefined') {
    throw new Error('createQrSurface requires a browser environment (document)');
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  // qrcode.toCanvas writes a proper error-corrected QR matrix.
  // Margin 2 = 2-module quiet zone (we add a little more padding via
  // CSS-in-scene later).
  await QRCode.toCanvas(canvas, glyph, {
    width: canvasSize,
    margin: 2,
    errorCorrectionLevel: errorLevel,
    color: { dark, light },
  });

  // Compute module count from the generated QR — the library writes
  // matrix data we can read via `create()`.
  const qr = QRCode.create(glyph, { errorCorrectionLevel: errorLevel });
  const moduleCount = qr.modules.size;
  const version = qr.version;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, canvas, moduleCount, version };
}

// ─── QR decal mesh ───
//
// A small planar quad positioned on the crystal's front face, offset
// slightly outward along the +Z axis to show through the refractive
// body without z-fighting.

export interface QrDecalLayout {
  /** Width in scene units. */
  width: number;
  /** Height in scene units. */
  height: number;
  /** Y position (vertical centre). */
  centreY: number;
  /** Z offset from axis, outward along +Z. */
  zOffset: number;
}

/**
 * Derive the QR decal layout from crystal metadata. The decal occupies
 * ~75% of body width and ~60% of body height, centred.
 */
export function deriveQrLayout(meta: {
  topY: number;
  bottomY: number;
  radius: number;
}): QrDecalLayout {
  const bodyHeight = meta.topY - meta.bottomY;
  const centreY = (meta.topY + meta.bottomY) / 2;
  // QR is square — size it to the limiting dimension
  const size = Math.min(bodyHeight * 0.6, meta.radius * 1.5);
  return {
    width: size,
    height: size,
    centreY,
    zOffset: meta.radius * 0.95,
  };
}

export function createQrDecalGeometry(layout: QrDecalLayout): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(layout.width, layout.height);
}

// ─── Contrast check (used by tests) ───

export interface ContrastReport {
  darkLuminance: number;
  lightLuminance: number;
  ratio: number;
  passes: boolean;
}

/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(darkHex: string, lightHex: string): ContrastReport {
  const L = (hex: string) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const linearise = (v: number) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return (
      0.2126 * linearise(r) +
      0.7152 * linearise(g) +
      0.0722 * linearise(b)
    );
  };

  const darkL = L(darkHex);
  const lightL = L(lightHex);
  const ratio = (Math.max(darkL, lightL) + 0.05) / (Math.min(darkL, lightL) + 0.05);
  return { darkLuminance: darkL, lightLuminance: lightL, ratio, passes: ratio >= 4.5 };
}

/** Dispose a QR surface's GPU resources. */
export function disposeQrSurface(result: QrSurfaceResult): void {
  result.texture.dispose();
}
