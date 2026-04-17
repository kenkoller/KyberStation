// ─── Kyber Crystal — PBR Material Factory ───
//
// Materials are small, stateless factories. State lives on the renderer
// (which owns the mesh references and updates uniforms per frame).
//
// Per `docs/KYBER_CRYSTAL_3D.md` §4.

import * as THREE from 'three';
import type { RGB } from '@kyberstation/engine';
import type { CrystalFormId } from './types';
import { seedRng } from './hash';

// ─── Material tuning table ───
//
// Per-form PBR parameter targets. Pulled out of the factory body so the
// visual polish pass lives in one table — tweaks are a single edit.
// See `docs/KYBER_CRYSTAL_3D.md` §4 and `KYBER_CRYSTAL_VISUAL.md` for
// the "reads as photography-of-a-prop" bar.

interface MaterialTuning {
  transmission: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  thickness: number;
  attenuationDistance: number;
  sheen: number;
  /** Hex colour for the sheen's warm/cool bias. */
  sheenColor: number;
  envMapIntensity: number;
  normalScale: number;
}

export const MATERIAL_TUNING: Record<CrystalFormId, MaterialTuning> = {
  natural: {
    transmission: 0.82,
    roughness: 0.05,
    clearcoat: 0.7,
    clearcoatRoughness: 0.05,
    iridescence: 0.45,
    thickness: 0.85,
    attenuationDistance: 0.9,
    sheen: 0.35,
    sheenColor: 0xfff0d8,
    envMapIntensity: 0.6,
    normalScale: 0.12,
  },
  bled: {
    transmission: 0.78,
    roughness: 0.05,
    clearcoat: 0.7,
    clearcoatRoughness: 0.05,
    iridescence: 0.4,
    thickness: 0.85,
    attenuationDistance: 0.85,
    sheen: 0.3,
    sheenColor: 0xfff0d8,
    envMapIntensity: 0.6,
    normalScale: 0.14,
  },
  cracked: {
    transmission: 0.7,
    roughness: 0.08,
    clearcoat: 0.65,
    clearcoatRoughness: 0.06,
    iridescence: 0.35,
    thickness: 0.8,
    attenuationDistance: 0.9,
    sheen: 0.3,
    sheenColor: 0xfff0d8,
    envMapIntensity: 0.6,
    normalScale: 0.16,
  },
  'obsidian-bipyramid': {
    transmission: 0.0,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.04,
    iridescence: 0.0,
    thickness: 0.6,
    attenuationDistance: 1.2,
    sheen: 0.6,
    sheenColor: 0xd0d8e8,
    envMapIntensity: 0.8,
    normalScale: 0.1,
  },
  paired: {
    transmission: 0.82,
    roughness: 0.05,
    clearcoat: 0.7,
    clearcoatRoughness: 0.05,
    iridescence: 0.45,
    thickness: 0.85,
    attenuationDistance: 0.9,
    sheen: 0.35,
    sheenColor: 0xfff0d8,
    envMapIntensity: 0.6,
    normalScale: 0.12,
  },
};

// ─── RGB helpers ───

function rgbToThree(c: RGB): THREE.Color {
  return new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
}

// ─── Procedural micro-facet normal map ───
//
// Deterministic 128×128 noise texture that suggests sub-geometric
// micro-facets the procedural prism can't afford to model. Breaks up
// the specular highlight band so it doesn't read as a single clean
// streak across each face.
//
// Seeded from a constant so every crystal shares the same micro-texture
// — this is a body-surface *look*, not a per-crystal variable.

const MICRO_NORMAL_SEED = 0xa11cebee;
const MICRO_NORMAL_SIZE = 128;

let microNormalTextureCache: THREE.DataTexture | null = null;

/** Build (or return cached) the shared micro-facet normal map. */
function getMicroNormalTexture(): THREE.DataTexture {
  if (microNormalTextureCache) return microNormalTextureCache;

  const size = MICRO_NORMAL_SIZE;
  const data = new Uint8Array(size * size * 4);
  const rng = seedRng(MICRO_NORMAL_SEED);

  // Stage 1: raw per-texel gaussian-ish noise for a height field
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    // Box-Muller would be overkill — sum of three uniforms approximates
    // a low-variance gaussian well enough for this.
    height[i] = (rng() + rng() + rng()) / 3;
  }

  // Stage 2: one pass of a 3-tap horizontal + vertical blur so the
  // noise has *some* spatial coherence — pure per-texel noise reads
  // as video grain, not micro-facets.
  const blurred = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const c = height[y * size + x];
      const l = height[y * size + xm];
      const r = height[y * size + xp];
      const u = height[ym * size + x];
      const d = height[yp * size + x];
      blurred[y * size + x] = (c * 4 + l + r + u + d) / 8;
    }
  }

  // Stage 3: central-difference gradient → normal
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const dx = (blurred[y * size + xp] - blurred[y * size + xm]) * 2;
      const dy = (blurred[yp * size + x] - blurred[ym * size + x]) * 2;
      // Normal pointing mostly +z with slight x/y perturbation
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      const px = (nx / len) * 0.5 + 0.5;
      const py = (ny / len) * 0.5 + 0.5;
      const pz = (nz / len) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      data[i + 0] = Math.round(px * 255);
      data[i + 1] = Math.round(py * 255);
      data[i + 2] = Math.round(pz * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  // Tile the micro-pattern several times over each face for fine detail
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;

  microNormalTextureCache = tex;
  return tex;
}

// ─── Body material ───
//
// Transmissive, refractive PBR glass. The colour passed in is used as
// both tint and attenuation colour so deeper paths through the body
// appear more saturated.

export interface CrystalBodyMaterialOptions {
  baseColor: RGB;
  form: CrystalFormId;
  /** 0-1 pearlescent sheen strength. */
  sheenStrength?: number;
}

export interface CrystalBodyMaterial extends THREE.MeshPhysicalMaterial {
  setBaseColor(color: RGB): void;
  setSheen(strength: number): void;
  setIridescence(value: number): void;
}

export function createBodyMaterial(opts: CrystalBodyMaterialOptions): CrystalBodyMaterial {
  const isObsidian = opts.form === 'obsidian-bipyramid';
  const tuning = MATERIAL_TUNING[opts.form];
  const color = isObsidian ? new THREE.Color(0x0c0c0f) : rgbToThree(opts.baseColor);

  const normalMap = getMicroNormalTexture();

  const material = new THREE.MeshPhysicalMaterial({
    color,
    transmission: tuning.transmission,
    ior: 1.55,
    roughness: tuning.roughness,
    metalness: 0.0,
    thickness: tuning.thickness,
    attenuationColor: color,
    attenuationDistance: tuning.attenuationDistance,
    clearcoat: tuning.clearcoat,
    clearcoatRoughness: tuning.clearcoatRoughness,
    sheen: opts.sheenStrength ?? tuning.sheen,
    sheenColor: new THREE.Color(tuning.sheenColor),
    iridescence: tuning.iridescence,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [100, 800],
    envMapIntensity: tuning.envMapIntensity,
    normalMap,
    normalScale: new THREE.Vector2(tuning.normalScale, tuning.normalScale),
    flatShading: true,
    transparent: !isObsidian,
    side: THREE.FrontSide,
  }) as CrystalBodyMaterial;

  // Imperative setters — called by the renderer on config changes
  material.setBaseColor = (color: RGB) => {
    if (isObsidian) return; // darksaber stays black regardless of baseColor
    const c = rgbToThree(color);
    material.color.copy(c);
    material.attenuationColor.copy(c);
  };

  material.setSheen = (strength: number) => {
    material.sheen = Math.max(0, Math.min(1, strength));
  };

  material.setIridescence = (value: number) => {
    material.iridescence = Math.max(0, Math.min(1, value));
  };

  return material;
}

// ─── Inner glow material ───
//
// The soft additive mesh that catches the internal point light to fake
// subsurface scattering without the real SSS cost.

export function createInnerGlowMaterial(baseColor: RGB): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: rgbToThree(baseColor),
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.BackSide, // renders inside-out so the body is "lit" from within
  });
}

// ─── Vein material (Form 2 Bled, Form 3 Cracked seams) ───
//
// Bled veins use a crimson additive; Cracked seams use a white-hot
// additive with a colour shift toward the base. Both use the same
// material type with different colour / blending.

export function createVeinMaterial(color = 0xff3020): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0, // renderer animates this
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

// ─── Energy seam material (Form 3 Cracked gap) ───

export function createSeamMaterial(baseColor: RGB): THREE.MeshBasicMaterial {
  // White-hot core with the faintest hue shift toward baseColor
  const hot = new THREE.Color(1.0, 0.95, 0.82);
  const tint = rgbToThree(baseColor);
  hot.lerp(tint, 0.1);

  return new THREE.MeshBasicMaterial({
    color: hot,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

// ─── Fleck / shimmer material ───
//
// Tiny additive-white billboards scattered across the surface. One
// material shared by the entire InstancedMesh. A per-instance `phase`
// attribute + `uTime` uniform drive subtle twinkle (injected via
// onBeforeCompile so we stay on MeshBasicMaterial and inherit its
// lighting-free path).

export interface FleckMaterial extends THREE.MeshBasicMaterial {
  /** Update the global time (seconds) driving the twinkle. */
  setTime(seconds: number): void;
  /** Freeze animation (sets the shader's time uniform to a fixed value). */
  freeze(atSeconds?: number): void;
}

export function createFleckMaterial(opts?: { reducedMotion?: boolean }): FleckMaterial {
  const reducedMotion = opts?.reducedMotion ?? false;

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0, // animated by controller (base opacity band) + shader (per-instance phase)
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  }) as FleckMaterial;

  const uTime = { value: 0 };
  const uReducedMotion = { value: reducedMotion ? 1 : 0 };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uReducedMotion = uReducedMotion;

    // Per-instance phase attribute. Mesh-level wire-up happens in
    // renderer.ts via an InstancedBufferAttribute named `aPhase`.
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aPhase;
         varying float vTwinkle;
         uniform float uTime;
         uniform float uReducedMotion;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         // Oscillate per-instance opacity 0.2..1.0 at ~0.3 Hz. Reduced
         // motion freezes the phase (constant offset, no time term).
         float tw = uReducedMotion > 0.5
           ? (0.5 + 0.5 * sin(aPhase * 6.2831853))
           : (0.5 + 0.5 * sin(uTime * 1.8849556 + aPhase * 6.2831853));
         vTwinkle = mix(0.2, 1.0, tw);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vTwinkle;`,
      )
      // Scale the diffuse alpha before opaque_fragment builds
      // gl_FragColor. Because this material has `transparent: true`,
      // the `#ifdef OPAQUE` branch isn't taken, so our alpha scaling
      // survives.
      .replace(
        '#include <opaque_fragment>',
        `diffuseColor.a *= vTwinkle;
         #include <opaque_fragment>`,
      );
  };

  mat.setTime = (seconds: number) => {
    uTime.value = seconds;
  };
  mat.freeze = (atSeconds = 0) => {
    uTime.value = atSeconds;
    uReducedMotion.value = 1;
  };

  return mat;
}

// ─── Preon halo material ───
//
// Soft outer shell that reads as an aura. Very low opacity, additive,
// coloured by the base.

export function createHaloMaterial(baseColor: RGB): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: rgbToThree(baseColor),
    transparent: true,
    opacity: 0, // renderer animates
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.BackSide,
  });
}

// ─── QR decal material ───
//
// Flat planar material showing the real QR matrix. Textured via
// CanvasTexture — see qrSurface.ts. Uses a basic unlit material so
// the scan contrast isn't affected by scene lighting.

export function createQrDecalMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false,
    side: THREE.FrontSide,
  });
}

/** Dispose every material in the set. */
export function disposeMaterialSet(materials: Record<string, THREE.Material>): void {
  for (const m of Object.values(materials)) {
    m.dispose();
  }
}
