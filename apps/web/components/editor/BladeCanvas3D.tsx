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

// ─── Constants ───

const BLADE_FULL_LENGTH = 4.0;
const BLADE_RADIUS = 0.06;
const GLOW_RADIUS = 0.14;
const BLADE_SEGMENTS = 32;

// ─── Hilt Mesh ───

interface HiltMeshProps {
  geometry: HiltGeometry;
}

function HiltMesh({ geometry }: HiltMeshProps) {
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

  return (
    <group ref={groupRef} position={[0, -hiltLength / 2, 0]}>
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
      {gripRidges > 0 &&
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
    </group>
  );
}

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

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2}
        maxDistance={12}
        target={[0, 1.5, 0]}
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
          camera={{ position: [0, 2, 5], fov: 40 }}
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
