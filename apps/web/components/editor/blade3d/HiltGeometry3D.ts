// ─── HiltGeometry3D ────────────────────────────────────────────────
//
// Converts 2D SVG hilt parts into Three.js LatheGeometry for the 3D
// blade scene. Extracts the right-side silhouette profile from each
// part's bodyPath, scales it to scene units, and revolves it around
// the Y axis.
//
// Pipeline:
//   1. Parse SVG bodyPath → extract right-side edge points
//   2. Stack parts vertically (bottom-to-top, hilt below blade)
//   3. Convert SVG units to scene units (48 SVG units = 0.048 scene units)
//   4. Build LatheGeometry from the stacked profile

import * as THREE from 'three';
import type { ComposedHilt } from '../../../lib/hilts/types';

// ─── Constants ─

/** Scale factor: SVG units → Three.js scene units. */
const SVG_TO_SCENE = 0.001;

/** Radial segments for the lathe revolution. */
const LATHE_SEGMENTS = 24;

// ─── Profile Extraction ─

interface ProfilePoint {
  /** Radius from center axis (scene units) */
  radius: number;
  /** Height along the Y axis (scene units, 0 = top of hilt) */
  y: number;
}

/**
 * Parse a simplified SVG body path and extract the right-side edge profile.
 *
 * Hilt SVG paths are simple polygons (M/L/Z commands only, no curves).
 * The body is symmetric about x=24 (center). We extract points with x > 24
 * as the radial profile.
 *
 * For asymmetric paths, we take the maximum x extent at each y level.
 */
export function extractProfileFromPath(
  bodyPath: string,
  svgWidth: number,
): ProfilePoint[] {
  const centerX = svgWidth / 2;
  const points: Array<{ x: number; y: number }> = [];

  // Parse M/L/Z path commands
  const commands = bodyPath.match(/[MLZmlz][^MLZmlz]*/g) || [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const nums = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number);

    switch (type) {
      case 'M':
      case 'L':
        for (let i = 0; i < nums.length; i += 2) {
          currentX = nums[i];
          currentY = nums[i + 1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'm':
      case 'l':
        for (let i = 0; i < nums.length; i += 2) {
          currentX += nums[i];
          currentY += nums[i + 1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'Z':
      case 'z':
        // Close path — ignored for profile extraction
        break;
    }
  }

  if (points.length === 0) {
    // Fallback: simple cylinder profile
    return [
      { radius: centerX * SVG_TO_SCENE, y: 0 },
      { radius: centerX * SVG_TO_SCENE, y: 1 },
    ];
  }

  // Group points by Y and take the maximum X (rightmost) at each Y level.
  // This gives us the right-side silhouette as radial distances from center.
  const yMap = new Map<number, number>();
  for (const p of points) {
    const existing = yMap.get(p.y);
    if (existing === undefined || p.x > existing) {
      yMap.set(p.y, p.x);
    }
  }

  // Sort by Y ascending and convert to profile points
  const sorted = [...yMap.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([y, x]) => ({
    radius: Math.abs(x - centerX) * SVG_TO_SCENE,
    y: y * SVG_TO_SCENE,
  }));
}

/**
 * Build a complete hilt radial profile from a composed hilt assembly.
 * Parts are stacked vertically with the emitter at the top (near blade).
 */
export function buildHiltProfile(composedHilt: ComposedHilt): ProfilePoint[] {
  const profile: ProfilePoint[] = [];
  const totalHeightScene = composedHilt.totalHeight * SVG_TO_SCENE;

  for (const placement of composedHilt.placements) {
    const partProfile = extractProfileFromPath(
      placement.part.svg.bodyPath,
      placement.part.svg.width,
    );

    // Offset each part's profile by its placement Y
    const yOffset = placement.y * SVG_TO_SCENE;
    for (const pp of partProfile) {
      profile.push({
        radius: pp.radius,
        y: yOffset + pp.y,
      });
    }
  }

  // Sort by Y for clean lathe generation
  profile.sort((a, b) => a.y - b.y);

  // Deduplicate close Y values (merge within 0.0001 scene units)
  const deduped: ProfilePoint[] = [];
  for (const p of profile) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.y - p.y) < 0.0001) {
      // Keep the larger radius at this Y level
      if (p.radius > last.radius) {
        last.radius = p.radius;
      }
    } else {
      deduped.push({ ...p });
    }
  }

  // Flip Y so that 0 = bottom of hilt, totalHeight = top (near blade)
  // LatheGeometry in Three.js revolves around Y axis with Y pointing up
  for (const p of deduped) {
    p.y = totalHeightScene - p.y;
  }
  deduped.reverse();

  return deduped;
}

/**
 * Build a simple cylindrical hilt profile for use when no assembly is loaded.
 *
 * @param heightScene - Height in scene units (default: 0.16)
 * @param radiusScene - Radius in scene units (default: 0.022)
 */
export function buildDefaultHiltProfile(
  heightScene = 0.16,
  radiusScene = 0.022,
): ProfilePoint[] {
  // A simple hilt with slight taper: wider at pommel, narrow at emitter
  const emitterRadius = radiusScene * 0.9;
  const gripRadius = radiusScene;
  const pommelRadius = radiusScene * 1.1;

  return [
    { radius: pommelRadius, y: 0 },          // pommel bottom
    { radius: pommelRadius, y: 0.01 },        // pommel lip
    { radius: gripRadius, y: 0.02 },          // grip start
    { radius: gripRadius, y: heightScene - 0.02 }, // grip end
    { radius: emitterRadius, y: heightScene - 0.01 }, // emitter taper
    { radius: emitterRadius, y: heightScene },  // emitter top
  ];
}

/**
 * Create a LatheGeometry from a radial profile.
 *
 * @param profile - Array of {radius, y} points defining the silhouette
 * @param segments - Number of radial segments (default: 24)
 * @returns Three.js LatheGeometry positioned with bottom at Y=0
 */
export function createHiltLathGeometry(
  profile: ProfilePoint[],
  segments = LATHE_SEGMENTS,
): THREE.LatheGeometry {
  // LatheGeometry expects Vector2 points where x = radius, y = height
  const points = profile.map((p) => new THREE.Vector2(p.radius, p.y));

  const geometry = new THREE.LatheGeometry(points, segments);

  return geometry;
}

/**
 * Create a 3D hilt mesh from a composed hilt assembly.
 *
 * The hilt is positioned below the blade (Y < 0) so that:
 *   - Blade starts at Y=0 (hilt emitter junction)
 *   - Hilt extends downward (negative Y)
 *
 * @param composedHilt - The resolved hilt assembly, or null for default
 * @returns LatheGeometry ready for mesh creation
 */
export function createHiltGeometry3D(
  composedHilt: ComposedHilt | null,
): THREE.LatheGeometry {
  const profile = composedHilt
    ? buildHiltProfile(composedHilt)
    : buildDefaultHiltProfile();

  const geo = createHiltLathGeometry(profile);

  // Translate so the top of the hilt sits at Y=0 (blade junction)
  // Find the max Y in the profile (top of hilt)
  const maxY = Math.max(...profile.map((p) => p.y));
  geo.translate(0, -maxY, 0);

  return geo;
}

/**
 * Create a simple metallic material for the hilt.
 */
export function createHiltMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.92,
    roughness: 0.25,
    envMapIntensity: 0.8,
  });
}
