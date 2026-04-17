'use client';

// ─── CrystalRevealScene — 3D dolly reveal into the Crystal Chamber ───
//
// Renders a minimal hilt + blade scene with a KyberCrystal group placed
// at the hilt's Crystal Chamber position. A CameraChoreographer drives
// the camera between the default wide framing and a tight close-up of
// the crystal.
//
// Only used when the active topology has an `accent-crystal` segment
// (ACCENT_TOPOLOGY). See `docs/KYBER_CRYSTAL_VISUAL.md` §7.4.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import * as THREE from 'three';

import { useBladeStore } from '@/stores/bladeStore';
import { CrystalRenderer } from '@/lib/crystal/renderer';
import {
  CameraChoreographer,
  getCrystalChamberAnchor,
  type ChoreographyAnchor,
  type ChoreographerState,
} from '@/lib/crystal/cameraChoreographer';
import { HILT_PRESETS, type HiltGeometry } from '@/components/hilt/HiltSelector';

// ─── Scene constants — mirror BladeCanvas3D conventions ───

const BLADE_FULL_LENGTH = 4.0;
const BLADE_RADIUS = 0.06;
const GLOW_RADIUS = 0.14;
const DEFAULT_HILT: HiltGeometry = HILT_PRESETS[0];

// Default wide-framing camera pose — matches BladeCanvas3D's Canvas prop.
const WIDE_CAMERA_POSITION = new THREE.Vector3(0, 2, 5);
const WIDE_CAMERA_TARGET = new THREE.Vector3(0, 1.5, 0);
const WIDE_CAMERA_FOV = 40;

// Detect reduced-motion. SSR-safe.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Hilt mesh — minimal, mirrors BladeCanvas3D.HiltMesh ───

function HiltMesh({ geometry }: { geometry: HiltGeometry }) {
  const {
    hiltLength,
    gripDiameter,
    emitterDiameter,
    pommelDiameter,
    guardThickness,
    guardDiameter,
  } = geometry;

  const gripRadius = gripDiameter / 2;
  const emitterRadius = emitterDiameter / 2;
  const pommelRadius = pommelDiameter / 2;

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, hiltLength / 2, 0]}>
        <cylinderGeometry args={[emitterRadius, gripRadius, hiltLength * 0.6, 24]} />
        <meshStandardMaterial color="#2a2a32" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, hiltLength * 0.12, 0]}>
        <cylinderGeometry args={[gripRadius, pommelRadius, hiltLength * 0.35, 24]} />
        <meshStandardMaterial color="#1e1e26" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, hiltLength * 0.85, 0]}>
        <cylinderGeometry args={[emitterRadius + 0.02, emitterRadius, hiltLength * 0.12, 24]} />
        <meshStandardMaterial color="#555560" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, hiltLength * 0.92, 0]}>
        <torusGeometry args={[emitterRadius + 0.01, 0.015, 8, 24]} />
        <meshStandardMaterial color="#6a6a74" metalness={0.95} roughness={0.1} />
      </mesh>
      {guardThickness > 0 && (
        <mesh position={[0, hiltLength * 0.78, 0]}>
          <torusGeometry args={[guardDiameter / 2, guardThickness / 2, 8, 24]} />
          <meshStandardMaterial color="#555560" metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[pommelRadius + 0.02, pommelRadius - 0.01, 0.08, 24]} />
        <meshStandardMaterial color="#3a3a42" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Blade mesh — static, fades during dolly ───

interface BladeMeshProps {
  baseColor: { r: number; g: number; b: number };
  hiltLength: number;
  opacity: number;
}

function BladeMesh({ baseColor, hiltLength, opacity }: BladeMeshProps) {
  const color = useMemo(
    () => new THREE.Color(baseColor.r / 255, baseColor.g / 255, baseColor.b / 255),
    [baseColor.r, baseColor.g, baseColor.b],
  );

  const bladeY = hiltLength * 0.92 + BLADE_FULL_LENGTH / 2;
  const visible = opacity > 0.01;

  return (
    <group visible={visible}>
      <mesh position={[0, bladeY, 0]}>
        <cylinderGeometry args={[BLADE_RADIUS, BLADE_RADIUS, BLADE_FULL_LENGTH, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5}
          transparent
          opacity={0.85 * opacity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, bladeY, 0]}>
        <cylinderGeometry args={[GLOW_RADIUS, GLOW_RADIUS, BLADE_FULL_LENGTH, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15 * opacity}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        color={color}
        intensity={3 * opacity}
        distance={8}
        decay={2}
        position={[0, bladeY, 0]}
      />
    </group>
  );
}

// ─── Crystal-inside-hilt — mounts CrystalRenderer.root as a scene group ───

interface ChamberCrystalProps {
  anchorTarget: THREE.Vector3;
  chamberScale: number;
  revealState: ChoreographerState;
}

function ChamberCrystal({ anchorTarget, chamberScale, revealState }: ChamberCrystalProps) {
  const { scene } = useThree();
  const config = useBladeStore((s) => s.config);
  const rendererRef = useRef<CrystalRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const lastTickRef = useRef(performance.now());

  // Build the renderer exactly once; mount its root into a local group so
  // we control transforms without touching scene directly.
  useEffect(() => {
    const r = new CrystalRenderer({ config, qrEnabled: false });
    rendererRef.current = r;

    const g = new THREE.Group();
    g.name = 'crystal-chamber-mount';
    g.add(r.root);
    g.position.copy(anchorTarget);
    // Scale the crystal to fit inside the hilt's grip tube
    g.scale.setScalar(chamberScale);
    scene.add(g);
    groupRef.current = g;

    return () => {
      scene.remove(g);
      r.dispose();
      rendererRef.current = null;
      groupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Keep the group in sync with the chamber anchor + scale
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.copy(anchorTarget);
    g.scale.setScalar(chamberScale);
  }, [anchorTarget, chamberScale]);

  // Apply live config updates to the crystal
  useEffect(() => {
    rendererRef.current?.applyConfig(config);
  }, [config]);

  // Hide the crystal entirely when idle (not revealing) so it doesn't
  // clutter the pre-reveal wide shot.
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.visible = revealState !== 'idle';
  }, [revealState]);

  // Tick the crystal animation controller every frame
  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    rendererRef.current?.tick(delta, null);
  });

  return null;
}

// ─── Choreographer driver — owns the dolly lifecycle inside the Canvas ───

interface ChoreographerDriverProps {
  hiltGeometry: HiltGeometry;
  requestedState: 'start' | 'end';
  onStateChange: (state: ChoreographerState) => void;
  onCrystalAnchor: (target: THREE.Vector3, scale: number) => void;
}

function ChoreographerDriver({
  hiltGeometry,
  requestedState,
  onStateChange,
  onCrystalAnchor,
}: ChoreographerDriverProps) {
  const { camera } = useThree();
  const choreographerRef = useRef<CameraChoreographer | null>(null);
  const prevRequestedRef = useRef<'start' | 'end'>(requestedState);
  const perspectiveCamera = camera as THREE.PerspectiveCamera;

  // Build anchors based on the current hilt geometry
  const anchors = useMemo<{ start: ChoreographyAnchor; end: ChoreographyAnchor }>(
    () => {
      const end = getCrystalChamberAnchor(
        hiltGeometry.hiltLength,
        hiltGeometry.gripDiameter / 2,
      );
      const start: ChoreographyAnchor = {
        position: WIDE_CAMERA_POSITION.clone(),
        target: WIDE_CAMERA_TARGET.clone(),
        fov: WIDE_CAMERA_FOV,
      };
      return { start, end };
    },
    [hiltGeometry.hiltLength, hiltGeometry.gripDiameter],
  );

  // Publish the chamber target + a reasonable crystal scale once
  useEffect(() => {
    // Crystal should fit comfortably inside the hilt — roughly the grip
    // diameter. The CrystalRenderer ships a crystal that's ~1 unit tall
    // in local space, so scale to grip radius × 1.3 for a snug fit.
    const scale = (hiltGeometry.gripDiameter / 2) * 1.3;
    onCrystalAnchor(anchors.end.target.clone(), scale);
  }, [anchors.end, hiltGeometry.gripDiameter, onCrystalAnchor]);

  // Init the choreographer and seed the camera to the start pose
  useEffect(() => {
    if (!choreographerRef.current) {
      choreographerRef.current = new CameraChoreographer(perspectiveCamera);
    }
    const ch = choreographerRef.current;
    ch.setAnchors(anchors.start, anchors.end);

    return () => {
      ch.dispose();
    };
  }, [perspectiveCamera, anchors.start, anchors.end]);

  // React to external state requests (start ↔ end) and kick off dolly
  useEffect(() => {
    const ch = choreographerRef.current;
    if (!ch) return;
    if (requestedState === prevRequestedRef.current) return;

    const reduced = prefersReducedMotion();
    const durationMs = reduced ? 0 : 2400;

    if (requestedState === 'end') {
      ch.dollyIn({
        durationMs,
        onComplete: () => onStateChange('at-end'),
      });
      onStateChange('dolly-in');
    } else {
      ch.dollyOut({
        durationMs,
        onComplete: () => onStateChange('idle'),
      });
      onStateChange('dolly-out');
    }

    prevRequestedRef.current = requestedState;
  }, [requestedState, onStateChange]);

  // Advance the camera each frame
  useFrame((_state: RootState, delta: number) => {
    choreographerRef.current?.tick(delta * 1000);
  });

  return null;
}

// ─── Main scene component ───

export interface CrystalRevealSceneProps {
  /** Whether the user has requested the reveal (dolly-in). */
  active: boolean;
  /** Fires whenever the internal choreographer state changes. */
  onStateChange?: (state: ChoreographerState) => void;
  /** Optional: hilt geometry to render. Defaults to Graflex. */
  hiltGeometry?: HiltGeometry;
}

export function CrystalRevealScene({
  active,
  onStateChange,
  hiltGeometry = DEFAULT_HILT,
}: CrystalRevealSceneProps) {
  const baseColor = useBladeStore((s) => s.config.baseColor);
  const [internalState, setInternalState] = useState<ChoreographerState>('idle');
  const [chamberAnchor, setChamberAnchor] = useState<THREE.Vector3>(
    () => new THREE.Vector3(0, hiltGeometry.hiltLength * 0.55, 0),
  );
  const [chamberScale, setChamberScale] = useState<number>(
    () => (hiltGeometry.gripDiameter / 2) * 1.3,
  );

  const handleStateChange = (s: ChoreographerState) => {
    setInternalState(s);
    onStateChange?.(s);
  };

  const handleCrystalAnchor = (target: THREE.Vector3, scale: number) => {
    setChamberAnchor(target);
    setChamberScale(scale);
  };

  // Fade the blade as we dolly in — blade is physically outside the hilt so
  // it reads as visual noise once the camera is inside the chamber. Fade is
  // a judgement call; keeps the hero shot clean.
  const bladeOpacity = internalState === 'idle' || internalState === 'dolly-out' ? 1 : 0;

  const requestedState: 'start' | 'end' = active ? 'end' : 'start';

  return (
    <Canvas
      camera={{ position: WIDE_CAMERA_POSITION.toArray(), fov: WIDE_CAMERA_FOV }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      style={{ background: 'transparent' }}
    >
      {/* Lighting — matches BladeCanvas3D */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 2]} intensity={0.4} color="#b0b0c0" />
      <directionalLight position={[-2, -3, -1]} intensity={0.15} color="#4040a0" />

      <HiltMesh geometry={hiltGeometry} />
      <BladeMesh
        baseColor={baseColor}
        hiltLength={hiltGeometry.hiltLength}
        opacity={bladeOpacity}
      />

      <ChamberCrystal
        anchorTarget={chamberAnchor}
        chamberScale={chamberScale}
        revealState={internalState}
      />

      <ChoreographerDriver
        hiltGeometry={hiltGeometry}
        requestedState={requestedState}
        onStateChange={handleStateChange}
        onCrystalAnchor={handleCrystalAnchor}
      />
    </Canvas>
  );
}
