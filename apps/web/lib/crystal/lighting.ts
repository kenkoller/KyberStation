// ─── Kyber Crystal — Scene Lighting Preset ───
//
// Fixed studio lighting for every crystal render. Not exposed as a
// user setting — lighting is part of the visual identity and a crystal
// that looks one way today should look the same way tomorrow.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §6.

import * as THREE from 'three';
import type { RGB } from '@kyberstation/engine';

export interface CrystalLights {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  keyRim: THREE.DirectionalLight;
  fillRim: THREE.DirectionalLight;
  internal: THREE.PointLight;
  group: THREE.Group;
}

/** Base intensity of the internal point light at glowIntensity = 1.0.
 *  Exported so renderer's per-frame animation scaling uses the same
 *  constant as `setInternalGlowColor` instead of a divergent literal. */
export const INTERNAL_LIGHT_BASE_INTENSITY = 0.38;

/**
 * Build the fixed studio lighting rig for a crystal scene. The caller
 * is responsible for adding the group to the scene and disposing
 * resources when the renderer tears down.
 */
export function createCrystalLighting(): CrystalLights {
  const group = new THREE.Group();
  group.name = 'crystal-lighting';

  const ambient = new THREE.AmbientLight(0x2a3040, 0.22);
  group.add(ambient);

  const key = new THREE.DirectionalLight(0xf4f8ff, 0.75);
  key.position.set(2.0, 3.0, 2.0);
  group.add(key);

  const keyRim = new THREE.DirectionalLight(0xb8d0ff, 0.5);
  keyRim.position.set(-1.5, 2.5, -1.5);
  group.add(keyRim);

  const fillRim = new THREE.DirectionalLight(0xffcfa0, 0.22);
  fillRim.position.set(1.2, -1.0, -2.0);
  group.add(fillRim);

  // Internal point light — the crystal's colour.
  // Intensity tuned so the body reads as "lit from within" without
  // blowing out the bloom pass. Renderer updates the colour each frame
  // from config.
  const internal = new THREE.PointLight(0xffffff, 0.38, 8, 2.0);
  internal.position.set(0, 0, 0);
  // NOTE: internal light is added to the crystal group, not the lighting
  // group, so it inherits the crystal's transforms.

  return { ambient, key, keyRim, fillRim, internal, group };
}

/** Apply a BladeConfig.baseColor to the internal point light. */
export function setInternalGlowColor(
  light: THREE.PointLight,
  color: RGB,
  brightnessMultiplier = 1.0,
): void {
  light.color.setRGB(color.r / 255, color.g / 255, color.b / 255);
  light.intensity = INTERNAL_LIGHT_BASE_INTENSITY * brightnessMultiplier;
}

/** Crossfade the internal light colour toward red (bleed) or back (heal). */
export function lerpInternalGlowColor(
  light: THREE.PointLight,
  fromColor: RGB,
  toColor: RGB,
  t: number, // 0-1
): void {
  const from = new THREE.Color(fromColor.r / 255, fromColor.g / 255, fromColor.b / 255);
  const to = new THREE.Color(toColor.r / 255, toColor.g / 255, toColor.b / 255);
  light.color.copy(from).lerp(to, Math.max(0, Math.min(1, t)));
}

/** Canonical crimson for bleed animation. */
export const BLEED_COLOR: RGB = { r: 220, g: 30, b: 24 };

export function disposeCrystalLighting(lights: CrystalLights): void {
  lights.group.clear();
  // AmbientLight / DirectionalLight don't hold GPU resources themselves.
}
