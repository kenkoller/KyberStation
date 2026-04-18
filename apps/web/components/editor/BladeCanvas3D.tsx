'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeState } from '@kyberstation/engine';
import {
  HiltSelector,
  useHiltSelection,
  type HiltGeometry,
} from '@/components/hilt/HiltSelector';
import { HiltMesh } from '@/components/hilt/HiltMesh';

// ─── Constants ───

const BLADE_FULL_LENGTH = 4.0;
const BLADE_RADIUS = 0.06;
const GLOW_RADIUS = 0.14;
const BLADE_SEGMENTS = 32;

// ─── Blade Mesh ───

interface BladeMeshProps {
  baseColor: { r: number; g: number; b: number };
  bladeState: BladeState;
  ignitionMs: number;
  retractionMs: number;
  hiltLength: number;
}

function BladeMesh({
  baseColor,
  bladeState,
  ignitionMs,
  retractionMs,
  hiltLength,
}: BladeMeshProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const progressRef = useRef(0);
  const prevStateRef = useRef<BladeState>(bladeState);

  const color = useMemo(
    () => new THREE.Color(baseColor.r / 255, baseColor.g / 255, baseColor.b / 255),
    [baseColor.r, baseColor.g, baseColor.b],
  );

  // Brighter core color (white-shifted)
  const coreColor = useMemo(() => {
    const core = color.clone();
    core.lerp(new THREE.Color(1, 1, 1), 0.7);
    return core;
  }, [color]);

  useFrame((_state: RootState, delta: number) => {
    // Reset progress on state change
    if (bladeState !== prevStateRef.current) {
      if (bladeState === BladeState.IGNITING) {
        progressRef.current = 0;
      } else if (bladeState === BladeState.RETRACTING) {
        progressRef.current = 1;
      }
      prevStateRef.current = bladeState;
    }

    // Animate progress
    const speed = delta * 1000; // ms
    if (bladeState === BladeState.IGNITING) {
      progressRef.current = Math.min(1, progressRef.current + speed / ignitionMs);
    } else if (bladeState === BladeState.RETRACTING) {
      progressRef.current = Math.max(0, progressRef.current - speed / retractionMs);
    } else if (bladeState === BladeState.ON) {
      progressRef.current = 1;
    } else {
      progressRef.current = 0;
    }

    const p = progressRef.current;
    const bladeLen = BLADE_FULL_LENGTH * p;
    const bladeY = hiltLength * 0.92 + bladeLen / 2;

    // Update core blade
    if (coreRef.current) {
      coreRef.current.scale.set(1, p < 0.001 ? 0.001 : p, 1);
      coreRef.current.position.y = bladeY;
      coreRef.current.visible = p > 0.001;
    }

    // Update glow cylinder
    if (glowRef.current) {
      glowRef.current.scale.set(1, p < 0.001 ? 0.001 : p, 1);
      glowRef.current.position.y = bladeY;
      glowRef.current.visible = p > 0.001;
    }

    // Update outer glow
    if (outerGlowRef.current) {
      outerGlowRef.current.scale.set(1, p < 0.001 ? 0.001 : p, 1);
      outerGlowRef.current.position.y = bladeY;
      outerGlowRef.current.visible = p > 0.001;
    }

    // Update point light
    if (pointLightRef.current) {
      pointLightRef.current.intensity = p * 3;
      pointLightRef.current.position.y = bladeY;
      pointLightRef.current.color.copy(color);
    }
  });

  return (
    <group>
      {/* Inner core (bright white-shifted) */}
      <mesh ref={coreRef} visible={false}>
        <cylinderGeometry args={[BLADE_RADIUS * 0.6, BLADE_RADIUS * 0.6, BLADE_FULL_LENGTH, BLADE_SEGMENTS]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.95} />
      </mesh>

      {/* Main blade body */}
      <mesh ref={glowRef} visible={false}>
        <cylinderGeometry args={[BLADE_RADIUS, BLADE_RADIUS, BLADE_FULL_LENGTH, BLADE_SEGMENTS]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow aura */}
      <mesh ref={outerGlowRef} visible={false}>
        <cylinderGeometry args={[GLOW_RADIUS, GLOW_RADIUS, BLADE_FULL_LENGTH, BLADE_SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Blade tip cap */}

      {/* Point light for scene illumination */}
      <pointLight
        ref={pointLightRef}
        color={color}
        intensity={0}
        distance={8}
        decay={2}
      />
    </group>
  );
}

// ─── Scene ───

interface SceneProps {
  hiltGeometry: HiltGeometry;
}

function Scene({ hiltGeometry }: SceneProps) {
  const baseColor = useBladeStore((s) => s.config.baseColor);
  const bladeState = useBladeStore((s) => s.bladeState);
  const ignitionMs = useBladeStore((s) => s.config.ignitionMs);
  const retractionMs = useBladeStore((s) => s.config.retractionMs);

  // Auto-frame: center the camera on the midpoint of the fully-lit blade+hilt
  // stack so both the hilt and the tip fit vertically with breathing room.
  // Stack spans Y = 0 (hilt base) to Y = hiltLength*0.92 + BLADE_FULL_LENGTH (tip).
  const stackTop = hiltGeometry.hiltLength * 0.92 + BLADE_FULL_LENGTH;
  const stackBottom = 0;
  const stackMidY = (stackTop + stackBottom) / 2;
  const stackHeight = stackTop - stackBottom;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 2]} intensity={0.4} color="#b0b0c0" />
      <directionalLight position={[-2, -3, -1]} intensity={0.15} color="#4040a0" />

      {/* Hilt */}
      <HiltMesh geometry={hiltGeometry} />

      {/* Blade */}
      <BladeMesh
        baseColor={baseColor}
        bladeState={bladeState}
        ignitionMs={ignitionMs}
        retractionMs={retractionMs}
        hiltLength={hiltGeometry.hiltLength}
      />

      {/* Camera controls — target stack midpoint so full blade fits vertically */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={stackHeight * 0.6}
        maxDistance={stackHeight * 3}
        target={[0, stackMidY, 0]}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Floor reflection hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#050508"
          metalness={0.5}
          roughness={0.8}
          transparent
          opacity={0.5}
        />
      </mesh>
    </>
  );
}

// ─── Main Component ───

interface BladeCanvas3DProps {
  className?: string;
}

export function BladeCanvas3DInner({ className }: BladeCanvas3DProps) {
  const { selectedHilt, selectHilt } = useHiltSelection();

  // Auto-frame: size camera so the full hilt+blade stack fits vertically.
  // Stack spans Y=0 → Y=hiltLength*0.92+BLADE_FULL_LENGTH; target the midpoint
  // and place the camera at a distance that gives ~20% vertical breathing room
  // at the chosen FOV.
  const CAMERA_FOV = 40;
  const stackTop = selectedHilt.hiltLength * 0.92 + BLADE_FULL_LENGTH;
  const stackMidY = stackTop / 2;
  const stackHeight = stackTop;
  const halfFovRad = (CAMERA_FOV / 2) * (Math.PI / 180);
  // 1.2 factor = 20% breathing room beyond the tip + base.
  const cameraDistance = (stackHeight * 1.2) / (2 * Math.tan(halfFovRad));

  return (
    <div className={`relative w-full h-full flex flex-col ${className ?? ''}`}>
      {/* Hilt selector row */}
      <HiltSelector
        selectedId={selectedHilt.id}
        onSelect={selectHilt}
        className="shrink-0 px-2 py-1.5 bg-bg-deep/50 border-b border-border-subtle"
      />

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          // key forces a remount when the hilt changes so the initial camera
          // position is reapplied (Canvas bakes camera props on first mount).
          key={selectedHilt.id}
          camera={{ position: [0, stackMidY, cameraDistance], fov: CAMERA_FOV }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ background: '#0a0a10' }}
        >
          <Scene hiltGeometry={selectedHilt} />
        </Canvas>
      </div>
    </div>
  );
}
