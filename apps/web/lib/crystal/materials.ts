// ─── Kyber Crystal — PBR Material Factory ───
//
// Materials are small, stateless factories. State lives on the renderer
// (which owns the mesh references and updates uniforms per frame).
//
// Per `docs/KYBER_CRYSTAL_3D.md` §4.

import * as THREE from 'three';
import type { RGB } from '@kyberstation/engine';
import type { CrystalFormId } from './types';

// ─── RGB helpers ───

function rgbToThree(c: RGB): THREE.Color {
  return new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
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
}

export function createBodyMaterial(opts: CrystalBodyMaterialOptions): CrystalBodyMaterial {
  const isObsidian = opts.form === 'obsidian-bipyramid';
  const color = isObsidian ? new THREE.Color(0x0c0c0f) : rgbToThree(opts.baseColor);

  const material = new THREE.MeshPhysicalMaterial({
    color,
    transmission: isObsidian ? 0.0 : 0.6,
    ior: 1.55,
    roughness: isObsidian ? 0.25 : 0.15,
    metalness: 0.0,
    thickness: 0.6,
    attenuationColor: color,
    attenuationDistance: 1.2,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
    sheen: opts.sheenStrength ?? (isObsidian ? 0.6 : 0.3),
    sheenColor: new THREE.Color(isObsidian ? 0xd0d8e8 : 0xfff0d8),
    iridescence: isObsidian ? 0.0 : 0.35,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [100, 800],
    envMapIntensity: 1.2,
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
// material shared by the entire InstancedMesh.

export function createFleckMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
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
