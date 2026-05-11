// ─── BladeGeometry ──────────────────────────────────────────────────
//
// Creates a segmented CylinderGeometry for the blade mesh.
// Each LED maps to one ring of vertices, allowing per-LED emissive
// coloring via a custom shader material.
//
// The geometry uses a UV layout where U encodes the LED index
// (0 = hilt end, 1 = tip) so the shader can look up the correct
// LED color per fragment.

import * as THREE from 'three';

export interface BladeGeometryOptions {
  /** Number of LEDs (segments along the blade). Default: 144 */
  ledCount?: number;
  /** Blade radius in scene units. Default: 0.018 */
  radius?: number;
  /** Blade length in scene units. Default: 1.0 */
  length?: number;
  /** Radial segments (cross-section smoothness). Default: 16 */
  radialSegments?: number;
  /** Whether to add a hemisphere cap at the tip. Default: true */
  cappedTip?: boolean;
}

const DEFAULTS: Required<BladeGeometryOptions> = {
  ledCount: 144,
  radius: 0.018,
  length: 1.0,
  radialSegments: 16,
  cappedTip: true,
};

/**
 * Create a segmented cylinder geometry for the blade.
 *
 * The cylinder is oriented along the Y-axis (tip at +Y, hilt at 0).
 * Each heightSegment corresponds to one LED, so the shader can read
 * the UV.y coordinate to determine which LED color to apply.
 *
 * UV mapping:
 *   - U: angle around circumference (0..1)
 *   - V: LED position along blade (0 = hilt, 1 = tip)
 */
export function createBladeGeometry(options?: BladeGeometryOptions): THREE.CylinderGeometry {
  const opts = { ...DEFAULTS, ...options };
  const { ledCount, radius, length, radialSegments, cappedTip } = opts;

  // One height segment per LED for accurate per-LED coloring
  const geometry = new THREE.CylinderGeometry(
    radius,           // radiusTop
    radius,           // radiusBottom (uniform cylinder)
    length,           // height
    radialSegments,   // radialSegments
    ledCount,         // heightSegments = LED count
    !cappedTip,       // openEnded (closed if capped)
  );

  // Center the blade so Y=0 is the hilt end, Y=length is the tip
  geometry.translate(0, length / 2, 0);

  return geometry;
}

/**
 * Create a hemisphere cap geometry for the blade tip.
 * Positioned at the top of the blade (Y = length).
 */
export function createBladeTipGeometry(options?: BladeGeometryOptions): THREE.SphereGeometry {
  const opts = { ...DEFAULTS, ...options };
  const { radius, radialSegments } = opts;

  // Half-sphere for the tip
  const tipGeo = new THREE.SphereGeometry(
    radius,
    radialSegments,
    8,              // heightSegments
    0,              // phiStart
    Math.PI * 2,   // phiLength
    0,              // thetaStart (top hemisphere)
    Math.PI / 2,   // thetaLength (half sphere)
  );

  // Rotate so the flat side faces down (toward blade)
  tipGeo.rotateX(Math.PI);
  // Position at blade tip
  tipGeo.translate(0, opts.length, 0);

  return tipGeo;
}

/**
 * Create the full blade mesh geometry (cylinder + optional tip cap).
 * Returns a merged BufferGeometry.
 */
export function createFullBladeGeometry(options?: BladeGeometryOptions): THREE.BufferGeometry {
  const opts = { ...DEFAULTS, ...options };

  const cylinder = createBladeGeometry(opts);

  if (!opts.cappedTip) {
    return cylinder;
  }

  const tip = createBladeTipGeometry(opts);

  // Merge geometries
  const merged = mergeGeometries([cylinder, tip]);
  cylinder.dispose();
  tip.dispose();

  return merged;
}

/**
 * Simple geometry merge (without importing BufferGeometryUtils to avoid
 * the three/examples import overhead in the main bundle).
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  for (const geo of geometries) {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const norm = geo.getAttribute('normal') as THREE.BufferAttribute;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    const idx = geo.getIndex();

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.array[i] + indexOffset);
      }
    }

    indexOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length) merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (uvs.length) merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (indices.length) merged.setIndex(indices);

  return merged;
}
