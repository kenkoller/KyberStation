'use client';

// ─── HiltMesh — shared React-Three-Fiber hilt renderer ─────────────────
//
// Shared hilt geometry + PBR material setup used by both:
//   - BladeCanvas3D.tsx (optional 3D hilt+blade preview)
//   - CrystalRevealScene.tsx (Fullscreen camera-zoom reveal)
//
// Extracted 2026-04-18 to eliminate drift between the two scenes. Before
// this extraction each file inlined its own hilt mesh; CrystalRevealScene
// had a minimal subset (no ridges, no activation button) while
// BladeCanvas3D rendered the full variant. We kept the richer variant as
// the canonical one — `showRidges` and `showActivationButton` props let
// consumers opt out when the surface area would otherwise be hidden or
// distracting. All geometry, materials, and positions match the prior
// inline implementations exactly.
//
// Positioning: the default `position` is `[0, -hiltLength / 2, 0]` so the
// grip center sits at the world origin (matches BladeCanvas3D's prior
// behaviour). CrystalRevealScene overrides to `[0, 0, 0]` because its
// camera anchors are computed from the hilt base.

import { useRef } from 'react';
import * as THREE from 'three';
import type { HiltGeometry } from '@/components/hilt/HiltSelector';

export interface HiltMeshProps {
  /** Hilt preset geometry (length, diameters, guard, ridges). */
  geometry: HiltGeometry;
  /**
   * Group position. Defaults to `[0, -hiltLength / 2, 0]` so the grip
   * center sits at the world origin. Pass `[0, 0, 0]` if camera anchors
   * are measured from the hilt base (e.g. CrystalRevealScene).
   */
  position?: [number, number, number];
  /**
   * Render the grip ridges (torus ribs along the grip). Defaults to
   * true. CrystalRevealScene originally omitted these because the
   * camera dolly-in hides the grip entirely.
   */
  showRidges?: boolean;
  /**
   * Render the small red activation button on the side of the grip.
   * Defaults to true. CrystalRevealScene originally omitted this for
   * the same dolly-in reason as `showRidges`.
   */
  showActivationButton?: boolean;
}

export function HiltMesh({
  geometry,
  position,
  showRidges = true,
  showActivationButton = true,
}: HiltMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  const {
    hiltLength,
    gripDiameter,
    emitterDiameter,
    pommelDiameter,
    guardThickness,
    guardDiameter,
    gripRidges,
  } = geometry;

  const gripRadius = gripDiameter / 2;
  const emitterRadius = emitterDiameter / 2;
  const pommelRadius = pommelDiameter / 2;

  const resolvedPosition: [number, number, number] =
    position ?? [0, -hiltLength / 2, 0];

  return (
    <group ref={groupRef} position={resolvedPosition}>
      {/* Main grip body */}
      <mesh position={[0, hiltLength / 2, 0]}>
        <cylinderGeometry args={[emitterRadius, gripRadius, hiltLength * 0.6, 24]} />
        <meshStandardMaterial
          color="#2a2a32"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Lower grip section */}
      <mesh position={[0, hiltLength * 0.12, 0]}>
        <cylinderGeometry args={[gripRadius, pommelRadius, hiltLength * 0.35, 24]} />
        <meshStandardMaterial
          color="#1e1e26"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Grip ridges */}
      {showRidges && gripRidges > 0 &&
        Array.from({ length: gripRidges }).map((_, i) => {
          const y = hiltLength * 0.15 + (i / (gripRidges - 1 || 1)) * hiltLength * 0.55;
          return (
            <mesh key={`ridge-${i}`} position={[0, y, 0]}>
              <torusGeometry args={[gripRadius + 0.005, 0.008, 8, 24]} />
              <meshStandardMaterial
                color="#1a1a22"
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
          );
        })}

      {/* Emitter shroud */}
      <mesh position={[0, hiltLength * 0.85, 0]}>
        <cylinderGeometry args={[emitterRadius + 0.02, emitterRadius, hiltLength * 0.12, 24]} />
        <meshStandardMaterial
          color="#555560"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Emitter ring */}
      <mesh position={[0, hiltLength * 0.92, 0]}>
        <torusGeometry args={[emitterRadius + 0.01, 0.015, 8, 24]} />
        <meshStandardMaterial
          color="#6a6a74"
          metalness={0.95}
          roughness={0.1}
        />
      </mesh>

      {/* Guard ring (if present) */}
      {guardThickness > 0 && (
        <mesh position={[0, hiltLength * 0.78, 0]}>
          <torusGeometry args={[guardDiameter / 2, guardThickness / 2, 8, 24]} />
          <meshStandardMaterial
            color="#555560"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* Pommel cap */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[pommelRadius + 0.02, pommelRadius - 0.01, 0.08, 24]} />
        <meshStandardMaterial
          color="#3a3a42"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Activation button */}
      {showActivationButton && (
        <mesh position={[gripRadius + 0.015, hiltLength * 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.015, 12]} />
          <meshStandardMaterial
            color="#cc0000"
            emissive="#cc0000"
            emissiveIntensity={0.3}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
