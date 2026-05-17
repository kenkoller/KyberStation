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
//   - Mouse interaction (Phase 2C):
//     - Click on blade → clash at that LED position
//     - Hold (400ms+) on blade → lockup at that position
//     - Sustained tip→hilt drag → retract the blade
//     - Pointer move velocity → swing simulation via useMouseSwing
//
// Phase 2A scaffold + Phase 2C interaction wiring of the Visualizer
// Upgrade Plan.

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
import { BladePostProcessing } from './postprocessing';
import { useAccessibilityStore } from '../../../stores/accessibilityStore';
import { useBreakpoint } from '../../../hooks/useBreakpoint';

// ─── Phase 2C Interaction Helpers (exported for tests) ─

/**
 * Threshold (in normalized UV-Y units, range 0..1) of accumulated tip→hilt
 * drag motion that triggers blade retraction. 0.25 = drag covers a quarter
 * of the blade length over the active drag window.
 */
export const DRAG_RETRACT_UV_THRESHOLD = 0.25;

/**
 * Maximum gap (ms) between pointer-move samples before the drag accumulator
 * is reset. Prevents stale state from leaking across separate drag gestures.
 */
export const DRAG_RETRACT_RESET_GAP_MS = 200;

/**
 * Minimum hold duration (ms) before a pointer-down on the blade promotes
 * from "pending clash" to a sustained lockup.
 */
export const HOLD_LOCKUP_MS = 400;

/**
 * OrbitControls rotation sensitivity. The drei default is 1.0; we lower it
 * slightly so a casual click+drag rotates the saber a tame amount, matching
 * the existing 2D canvas's "drag = swing" muscle memory rather than fighting
 * it. Pinch-zoom + two-finger rotate still work on touch devices.
 */
export const ORBIT_ROTATE_SPEED = 0.7;

/**
 * Convert a UV-Y value (0 at hilt, 1 at tip) plus an LED count into the
 * nearest LED index. Clamped to [0, ledCount - 1].
 */
export function uvYToLedIndex(uvY: number, ledCount: number): number {
  if (ledCount <= 0) return 0;
  const idx = Math.floor(uvY * ledCount);
  return Math.max(0, Math.min(ledCount - 1, idx));
}

/**
 * Internal accumulator for tip→hilt drag detection. Tracks the last
 * sample's UV-Y + timestamp and a running sum of negative ΔUV-Y deltas
 * (i.e. motion toward the hilt). A click+release without sustained
 * downward motion never triggers retraction.
 *
 * The accumulator is reset by:
 *   - `resetDragAccumulator()` on pointer-down/up
 *   - A sample whose Δt exceeds `DRAG_RETRACT_RESET_GAP_MS`
 *   - The retract trigger firing (so a second retract requires fresh motion)
 */
export interface DragAccumulator {
  lastUvY: number;
  lastTime: number;
  accumulated: number;
}

export function createDragAccumulator(): DragAccumulator {
  return { lastUvY: -1, lastTime: 0, accumulated: 0 };
}

export function resetDragAccumulator(acc: DragAccumulator): void {
  acc.lastUvY = -1;
  acc.lastTime = 0;
  acc.accumulated = 0;
}

/**
 * Feed a new pointer-move sample into the drag accumulator. Returns `true`
 * if the accumulated tip→hilt motion crossed `DRAG_RETRACT_UV_THRESHOLD`
 * on this sample (in which case the accumulator is reset and the caller
 * should fire the retract trigger). Otherwise returns `false`.
 */
export function updateDragAccumulator(
  acc: DragAccumulator,
  uvY: number,
  timeMs: number,
  threshold: number = DRAG_RETRACT_UV_THRESHOLD,
  resetGapMs: number = DRAG_RETRACT_RESET_GAP_MS,
): boolean {
  // First sample of a drag — just record state.
  if (acc.lastUvY < 0) {
    acc.lastUvY = uvY;
    acc.lastTime = timeMs;
    acc.accumulated = 0;
    return false;
  }
  // Gap too large — treat as a new gesture.
  if (timeMs - acc.lastTime > resetGapMs) {
    acc.lastUvY = uvY;
    acc.lastTime = timeMs;
    acc.accumulated = 0;
    return false;
  }
  const delta = uvY - acc.lastUvY;
  acc.lastUvY = uvY;
  acc.lastTime = timeMs;
  // Negative delta = motion toward hilt (lower UV-Y). We accumulate the
  // magnitude of tip→hilt motion only; tip-ward motion resets progress
  // (e.g. zig-zag drags shouldn't accidentally retract).
  if (delta < 0) {
    acc.accumulated += -delta;
  } else if (delta > 0.05) {
    // Significant tip-ward motion — reset the toward-hilt counter so
    // back-and-forth wiggling never triggers retraction.
    acc.accumulated = 0;
  }
  if (acc.accumulated >= threshold) {
    acc.accumulated = 0;
    return true;
  }
  return false;
}

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
  /** Optional auxiliary callback fired on click (engine.triggerEffect is
   *  already called inline by SceneDriver — callbacks are for audio /
   *  logging side-effects only). */
  onBladeClick?: (ledIndex: number, position: number) => void;
  /** Optional auxiliary callback fired on hold (engine.triggerEffect is
   *  already called inline by SceneDriver — callbacks are for audio /
   *  logging side-effects only). */
  onBladeHold?: (ledIndex: number, position: number) => void;
  /** Optional auxiliary callback fired when a tip→hilt drag retracts the
   *  blade. The engine retract() is already called inline. */
  onDragRetract?: () => void;
}

function SceneDriver({
  engineRef,
  ledCount,
  bladeLength,
  onBladeClick,
  onBladeHold,
  onDragRetract,
}: SceneDriverProps) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);
  const holdFiredRef = useRef(false);
  const dragAccRef = useRef<DragAccumulator>(createDragAccumulator());

  // Click handler — converts 3D intersection to LED index.
  // R3F pointer events carry `uv` from the mesh intersection.
  const handlePointerDown = useCallback(
    (e: { point: THREE.Vector3; uv?: THREE.Vector2; stopPropagation: () => void }) => {
      if (!e.uv) return;
      e.stopPropagation();
      pointerDownRef.current = true;
      holdFiredRef.current = false;
      resetDragAccumulator(dragAccRef.current);

      const uvY = e.uv.y;
      const ledIndex = uvYToLedIndex(uvY, ledCount);
      const position = ledIndex / Math.max(1, ledCount);

      // Start hold timer for lockup — fires only if pointer is still down
      // after HOLD_LOCKUP_MS without an intervening pointer-up.
      holdTimerRef.current = setTimeout(() => {
        if (pointerDownRef.current) {
          holdFiredRef.current = true;
          engineRef.current?.triggerEffect('lockup', { position });
          onBladeHold?.(ledIndex, position);
        }
      }, HOLD_LOCKUP_MS);
    },
    [ledCount, onBladeHold, engineRef],
  );

  const handlePointerUp = useCallback(
    (e: { uv?: THREE.Vector2; stopPropagation: () => void }) => {
      e.stopPropagation();
      const wasDown = pointerDownRef.current;
      pointerDownRef.current = false;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      // If lockup already fired on this gesture, release it on pointer-up
      // so the lockup doesn't get stuck on after the user lifts.
      if (holdFiredRef.current) {
        engineRef.current?.releaseEffect('lockup');
        holdFiredRef.current = false;
        return;
      }
      // Short click → clash. Only fire if pointer-down originated on the
      // blade (wasDown guards against pointer-up bubbling from elsewhere).
      if (wasDown && e.uv) {
        const ledIndex = uvYToLedIndex(e.uv.y, ledCount);
        const position = ledIndex / Math.max(1, ledCount);
        engineRef.current?.triggerEffect('clash', { position });
        onBladeClick?.(ledIndex, position);
      }
      resetDragAccumulator(dragAccRef.current);
    },
    [ledCount, onBladeClick, engineRef],
  );

  // Pointer-move on the blade mesh — feeds the tip→hilt drag accumulator.
  // Swing-from-velocity is handled by useMouseSwing on the outer container;
  // this handler is only responsible for the retract-on-drag-down gesture.
  const handlePointerMove = useCallback(
    (e: { uv?: THREE.Vector2; stopPropagation: () => void; nativeEvent?: { timeStamp?: number } }) => {
      if (!pointerDownRef.current || !e.uv) return;
      const now = e.nativeEvent?.timeStamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const triggered = updateDragAccumulator(dragAccRef.current, e.uv.y, now);
      if (triggered) {
        engineRef.current?.retract();
        onDragRetract?.();
      }
    },
    [engineRef, onDragRetract],
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
        onPointerMove={handlePointerMove as unknown as (e: unknown) => void}
      >
        <BladeMesh
          engineRef={engineRef}
          ledCount={ledCount}
          bladeLength={bladeLength}
        />
      </group>

      {/* Hilt mesh (LatheGeometry from SVG profile) */}
      <HiltMesh />

      {/* Camera controls — Phase 2C: rotateSpeed tuned slightly below the
          drei default of 1.0 so casual drags don't whip the camera around
          past the swing-velocity reading window. Pan disabled (the saber
          is the subject); pinch-zoom + two-finger rotate route through
          OrbitControls's native pointer-event handling. */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={0.5}
        maxDistance={3.0}
        target={[0, bladeLength * 0.4, 0]}
        autoRotate={false}
        rotateSpeed={ORBIT_ROTATE_SPEED}
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
  /** Auxiliary callback when user clicks the blade — clash effect is
   *  already triggered on the engine; this is for audio / logging. */
  onBladeClick?: (ledIndex: number, position: number) => void;
  /** Auxiliary callback when user holds the blade — lockup effect is
   *  already triggered on the engine; this is for audio / logging. */
  onBladeHold?: (ledIndex: number, position: number) => void;
  /** Auxiliary callback when a sustained tip→hilt drag retracts the
   *  blade — engine.retract() is already called inline. */
  onDragRetract?: () => void;
}

export function BladeScene3D({
  engineRef,
  ledCount: ledCountProp,
  className,
  onBladeClick,
  onBladeHold,
  onDragRetract,
}: BladeScene3DProps) {
  const storeConfig = useBladeStore((s) => s.config);
  const ledCount = ledCountProp ?? storeConfig.ledCount;
  const containerRef = useRef<HTMLDivElement>(null);

  // Phase 2D — pull a11y prefs + breakpoint so the post-processing
  // pipeline can gate motion blur + halve diffusion on mobile.
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const reduceBloom = useAccessibilityStore((s) => s.reduceBloom);
  const graphicsQuality = useAccessibilityStore((s) => s.graphicsQuality);
  const { isMobile } = useBreakpoint();

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
          onDragRetract={onDragRetract}
        />
        {/* Phase 2D — bloom + diffusion + motion-blur composer.
            Replaces the standalone <BladeBloom /> from Phase 2A. The
            composer auto-skips itself when graphicsQuality === 'low'
            so low-tier devices render with the in-shader diffusion
            only (still looks decent, just no halo or motion streak). */}
        <BladePostProcessing
          engineRef={engineRef}
          reducedMotion={reducedMotion}
          reduceBloom={reduceBloom}
          graphicsQuality={graphicsQuality}
          isMobile={isMobile}
        />
      </Canvas>
    </div>
  );
}
