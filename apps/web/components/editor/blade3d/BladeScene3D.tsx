// ─── BladeScene3D ───────────────────────────────────────────────────
//
// R3F scene rendering a 3D lightsaber blade with per-LED emissive
// coloring. Reads the LED buffer from BladeEngine every frame and
// uploads it to a DataTexture uniform on the blade's custom shader.
//
// Features:
//   - Per-LED color accuracy (same data as the 2D canvas)
//   - Polycarbonate diffusion simulation (Gaussian blur along blade)
//   - Ignition/retraction animation via extendProgress uniform
//   - Additive bloom glow via HDR emissive intensity
//   - Orbit controls for rotation (click + drag)
//   - Mouse interaction: click on blade → clash, hold → lockup
//
// Phase 2A of the Visualizer Upgrade Plan.

'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { BladeEngine } from '@kyberstation/engine';
import { useBladeStore } from '../../../stores/bladeStore';
import { useMouseSwing } from '../../../hooks/useMouseSwing';
import { createBladeGeometry, createBladeTipGeometry } from './BladeGeometry';
import {
  createBladeMaterial,
  createLedTexture,
  updateLedTexture,
  getLedTextureFromMaterial,
} from './BladeMaterial';
import { createHiltGeometry3D, createHiltMaterial } from './HiltGeometry3D';
import { BladeBloom } from './BladeBloom';

// ─── Glow Shell ─
// A slightly larger, more transparent copy of the blade for outer glow

function createGlowMaterial(ledCount: number): THREE.ShaderMaterial {
  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform sampler2D uLedTexture;
    uniform float uExtendProgress;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      float v = vUv.y;
      if (v > uExtendProgress) discard;

      vec3 ledColor = texture2D(uLedTexture, vec2(clamp(v, 0.0, 1.0), 0.5)).rgb;

      // Fresnel edge glow — bright at glancing angles
      float fresnel = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
      float glow = pow(fresnel, 1.5) * 0.6;

      // Tip fade
      float tipFade = clamp((uExtendProgress - v) / 0.05, 0.0, 1.0);

      gl_FragColor = vec4(ledColor * 1.8, glow * tipFade);
    }
  `;

  const ledTexture = createLedTexture(ledCount);

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uLedTexture: { value: ledTexture },
      uExtendProgress: { value: 1.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

// ─── Emitter Glow ─
// Point light at the hilt junction that tints the hilt area

function EmitterGlow({ color, intensity }: { color: THREE.Color; intensity: number }) {
  return (
    <pointLight
      position={[0, 0.02, 0]}
      color={color}
      intensity={intensity}
      distance={0.15}
      decay={2}
    />
  );
}

// ─── Hilt Mesh (Phase 2B) ─
// LatheGeometry from SVG profile, or fallback to default cylindrical hilt.

function HiltMesh() {
  const hiltGeo = useMemo(() => createHiltGeometry3D(null), []);
  const hiltMat = useMemo(() => createHiltMaterial(), []);

  useEffect(() => {
    return () => {
      hiltGeo.dispose();
      hiltMat.dispose();
    };
  }, [hiltGeo, hiltMat]);

  return <mesh geometry={hiltGeo} material={hiltMat} />;
}

// ─── Blade Mesh ─
// The core blade with per-LED emissive + outer glow shell

interface BladeMeshProps {
  engineRef: React.RefObject<BladeEngine | null>;
  ledCount: number;
  bladeLength: number;
}

function BladeMesh({ engineRef, ledCount, bladeLength }: BladeMeshProps) {
  const bladeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const emitterColorRef = useRef(new THREE.Color(0, 0, 0));

  // Create geometries
  const bladeGeo = useMemo(
    () => createBladeGeometry({ ledCount, length: bladeLength, radialSegments: 16 }),
    [ledCount, bladeLength],
  );

  const tipGeo = useMemo(
    () => createBladeTipGeometry({ ledCount, length: bladeLength, radialSegments: 16, radius: 0.018 }),
    [ledCount, bladeLength],
  );

  const glowGeo = useMemo(
    () => createBladeGeometry({ ledCount, length: bladeLength, radialSegments: 16, radius: 0.028 }),
    [ledCount, bladeLength],
  );

  // Create materials
  const bladeMat = useMemo(
    () => createBladeMaterial({ ledCount, emissiveIntensity: 2.5, diffusionRadius: 1.5 }),
    [ledCount],
  );

  const glowMat = useMemo(
    () => createGlowMaterial(ledCount),
    [ledCount],
  );

  // Per-frame: upload LED buffer to both materials' textures
  useFrame(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const pixels = engine.getPixels();
    const extendProgress = engine.extendProgress;

    // Update blade material
    const bladeTexture = getLedTextureFromMaterial(bladeMat);
    updateLedTexture(bladeTexture, pixels, ledCount);
    bladeMat.uniforms.uExtendProgress.value = extendProgress;

    // Update glow material (shares the same LED data)
    const glowTexture = glowMat.uniforms.uLedTexture.value as THREE.DataTexture;
    updateLedTexture(glowTexture, pixels, ledCount);
    glowMat.uniforms.uExtendProgress.value = extendProgress;

    // Update emitter color from the first few LEDs
    if (pixels.length >= 3) {
      emitterColorRef.current.setRGB(
        pixels[0] / 255,
        pixels[1] / 255,
        pixels[2] / 255,
      );
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      bladeGeo.dispose();
      tipGeo.dispose();
      glowGeo.dispose();
      bladeMat.dispose();
      glowMat.dispose();
    };
  }, [bladeGeo, tipGeo, glowGeo, bladeMat, glowMat]);

  return (
    <group>
      {/* Core blade */}
      <mesh ref={bladeRef} geometry={bladeGeo} material={bladeMat} />

      {/* Blade tip */}
      <mesh geometry={tipGeo} material={bladeMat} />

      {/* Outer glow shell */}
      <mesh ref={glowRef} geometry={glowGeo} material={glowMat} />

      {/* Emitter point light */}
      <EmitterGlow color={emitterColorRef.current} intensity={0.5} />
    </group>
  );
}

// ─── Scene Driver ─
// Manages the full 3D scene inside the R3F Canvas

interface SceneDriverProps {
  engineRef: React.RefObject<BladeEngine | null>;
  ledCount: number;
  bladeLength: number;
  onBladeClick?: (ledIndex: number) => void;
  onBladeHold?: (ledIndex: number) => void;
}

function SceneDriver({
  engineRef,
  ledCount,
  bladeLength,
  onBladeClick,
  onBladeHold,
}: SceneDriverProps) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Click handler — converts 3D intersection to LED index.
  // R3F pointer events carry `uv` from the mesh intersection.
  const handlePointerDown = useCallback(
    (e: { point: THREE.Vector3; uv?: THREE.Vector2; stopPropagation: () => void }) => {
      if (!e.uv) return;
      e.stopPropagation();
      pointerDownRef.current = true;
      pointerPosRef.current = { x: e.uv.x, y: e.uv.y };

      const uvY = e.uv.y;
      // Start hold timer for lockup
      holdTimerRef.current = setTimeout(() => {
        if (pointerDownRef.current) {
          const ledIndex = Math.floor(uvY * ledCount);
          onBladeHold?.(Math.min(ledIndex, ledCount - 1));
        }
      }, 400);
    },
    [ledCount, onBladeHold],
  );

  const handlePointerUp = useCallback(
    (e: { uv?: THREE.Vector2; stopPropagation: () => void }) => {
      e.stopPropagation();
      pointerDownRef.current = false;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;

        // Short click → clash
        if (e.uv) {
          const ledIndex = Math.floor(e.uv.y * ledCount);
          onBladeClick?.(Math.min(ledIndex, ledCount - 1));
        }
      }
    },
    [ledCount, onBladeClick],
  );

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Scene lighting — minimal, blade is self-luminous */}
      <ambientLight intensity={0.05} />

      {/* Blade mesh group — interactive */}
      <group
        onPointerDown={handlePointerDown as unknown as (e: unknown) => void}
        onPointerUp={handlePointerUp as unknown as (e: unknown) => void}
      >
        <BladeMesh
          engineRef={engineRef}
          ledCount={ledCount}
          bladeLength={bladeLength}
        />
      </group>

      {/* Hilt mesh (LatheGeometry from SVG profile) */}
      <HiltMesh />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={0.5}
        maxDistance={3.0}
        target={[0, bladeLength * 0.4, 0]}
        autoRotate={false}
      />
    </>
  );
}

// ─── Public Component ─

export interface BladeScene3DProps {
  /** Ref to the BladeEngine instance (from useBladeEngine). */
  engineRef: React.RefObject<BladeEngine | null>;
  /** Number of LEDs (segments). Default: from bladeStore config. */
  ledCount?: number;
  /** Additional CSS class for the container. */
  className?: string;
  /** Callback when user clicks the blade (clash trigger). */
  onBladeClick?: (ledIndex: number) => void;
  /** Callback when user holds the blade (lockup trigger). */
  onBladeHold?: (ledIndex: number) => void;
}

export function BladeScene3D({
  engineRef,
  ledCount: ledCountProp,
  className,
  onBladeClick,
  onBladeHold,
}: BladeScene3DProps) {
  const storeConfig = useBladeStore((s) => s.config);
  const ledCount = ledCountProp ?? storeConfig.ledCount;
  const containerRef = useRef<HTMLDivElement>(null);

  // Wire mouse movement on the 3D container to swing simulation.
  // OrbitControls captures drag for rotation; useMouseSwing reads
  // velocity from pointer movement to drive swingSpeed + bladeAngle.
  const { handlePointerMove, handlePointerEnter, handlePointerLeave } =
    useMouseSwing(engineRef);

  // Scale blade length by LED count (144 LEDs ≈ 36 inches ≈ ~0.9m)
  // Normalized to 1.0 scene unit for the default 144 LEDs
  const bladeLength = (ledCount / 144) * 1.0;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className ?? ''}`}
      onPointerMove={handlePointerMove as unknown as React.PointerEventHandler<HTMLDivElement>}
      onPointerEnter={handlePointerEnter as unknown as React.PointerEventHandler<HTMLDivElement>}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{
          position: [0.5, 0.4, 0.8],
          fov: 40,
          near: 0.01,
          far: 10,
        }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'transparent' }}
      >
        <SceneDriver
          engineRef={engineRef}
          ledCount={ledCount}
          bladeLength={bladeLength}
          onBladeClick={onBladeClick}
          onBladeHold={onBladeHold}
        />
        <BladeBloom />
      </Canvas>
    </div>
  );
}
