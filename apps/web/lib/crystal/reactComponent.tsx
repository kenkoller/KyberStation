'use client';

// ─── <KyberCrystal> — R3F wrapper for the CrystalRenderer ───
//
// Mounts a CrystalRenderer into a React Three Fiber canvas. Subscribes
// to `useBladeStore()` for live config updates; exposes imperative
// triggers + snapshot via ref.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §10.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { useBladeStore } from '@/stores/bladeStore';
import { CrystalRenderer } from './renderer';
import {
  createCrystalPostProcessing,
  type CrystalPostProcessingHandle,
} from './postProcessing';
import { getPerformanceTier } from '@/lib/performanceTier';
import type { BladeConfig } from '@kyberstation/engine';
import type { CrystalHandle, AnimationTrigger } from './types';

// ─── Props ───

export interface KyberCrystalProps {
  /** Config override — if omitted, subscribes to useBladeStore(). */
  config?: BladeConfig;
  /** Initial glyph string embedded in the QR. */
  glyph?: string;
  /** Enable the scannable QR surface. Default true. */
  qrEnabled?: boolean;
  /** Interactive hover tilt + orbit controls. Default true. */
  interactive?: boolean;
  /** Class name applied to the Canvas container. */
  className?: string;
  /** Called once the renderer is ready — the handle lets parents
   *  trigger animations and request snapshots. */
  onReady?: (handle: CrystalHandle) => void;
}

// ─── Scene-internal driver ───
//
// This component is rendered INSIDE the Canvas; it has access to the
// WebGLRenderer, scene, and can safely use useFrame.

interface SceneDriverProps {
  config: BladeConfig;
  glyph: string;
  qrEnabled: boolean;
  onRendererReady: (renderer: CrystalRenderer) => void;
}

function SceneDriver({ config, glyph, qrEnabled, onRendererReady }: SceneDriverProps) {
  const { scene, gl } = useThree();
  const rendererRef = useRef<CrystalRenderer | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const hoverRef = useRef<{ tiltX: number; tiltY: number } | null>(null);
  const envTextureRef = useRef<THREE.Texture | null>(null);

  // ─── Environment map (runtime-generated PMREM from RoomEnvironment) ───
  //
  // Gives the clearcoat something subtle to reflect — without this the
  // gem reads as plastic. We use `scene.environment` (NOT
  // scene.background) so only the material reflection is affected; the
  // canvas background stays transparent.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    envTextureRef.current = envMap;
    pmrem.dispose();

    return () => {
      scene.environment = null;
      envMap.dispose();
      envTextureRef.current = null;
    };
  }, [scene, gl]);

  useEffect(() => {
    const r = new CrystalRenderer({
      config,
      glyph,
      qrEnabled,
    });
    rendererRef.current = r;
    scene.add(r.root);
    onRendererReady(r);

    return () => {
      scene.remove(r.root);
      r.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Apply config updates without rebuilding the scene
  useEffect(() => {
    rendererRef.current?.applyConfig(config);
  }, [config]);

  // Per-frame tick — renderer simulation only. The composer (or
  // fallback render) is driven by PostProcessingDriver at a later
  // priority so we always tick BEFORE we render.
  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    rendererRef.current?.tick(delta, hoverRef.current);
  });

  // Pointer-driven hover tilt
  useEffect(() => {
    const root = rendererRef.current?.root;
    if (!root) return;

    const onPointerMove = (e: PointerEvent) => {
      // Treat coordinates relative to viewport — crystal is centred
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const tiltY = ((e.clientX - cx) / w) * 10; // ±5deg
      const tiltX = -((e.clientY - cy) / h) * 10;
      hoverRef.current = { tiltX, tiltY };
    };
    const onPointerLeave = () => {
      hoverRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return null;
}

// ─── Post-processing driver ───
//
// Owns the EffectComposer lifecycle. Runs `useFrame` at a priority
// AFTER the default render so R3F's auto-render is suppressed (any
// positive priority does this), and delegates to the composer instead.
// Skipped entirely on lite-tier devices; those take the default R3F
// render path.

function PostProcessingDriver() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<CrystalPostProcessingHandle | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const composer = createCrystalPostProcessing({
      scene,
      camera,
      renderer: gl,
      size: { width: size.width, height: size.height },
    });
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [gl, scene, camera, size.width, size.height]);

  // Keep composer buffers in sync with viewport size
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size.width, size.height]);

  // priority=1 takes over the render loop — R3F's internal render is
  // disabled for any priority > 0. This fires after the SceneDriver's
  // useFrame (priority 0, default), so tick has already advanced.
  useFrame((_, delta) => {
    const now = performance.now();
    const deltaSeconds = delta > 0 ? delta : (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    composerRef.current?.render(deltaSeconds);
  }, 1);

  return null;
}

// ─── Handle wrapper ───

export const KyberCrystal = forwardRef<CrystalHandle, KyberCrystalProps>(
  function KyberCrystal(
    {
      config: configProp,
      glyph: glyphProp,
      qrEnabled = true,
      interactive = true,
      className,
      onReady,
    },
    ref,
  ) {
    const storeConfig = useBladeStore((s) => s.config);
    const config = configProp ?? storeConfig;
    const glyph = glyphProp ?? buildPlaceholderGlyph(config);

    const [renderer, setRenderer] = useState<CrystalRenderer | null>(null);

    // Decide once per mount whether we can afford post-processing.
    // Lite-tier devices skip bloom entirely and use the default R3F
    // render path (no PostProcessingDriver, R3F auto-renders).
    const enablePostProcessing = useMemo(() => {
      if (typeof window === 'undefined') return false;
      try {
        return getPerformanceTier().tier !== 'lite';
      } catch {
        return true;
      }
    }, []);

    useImperativeHandle(
      ref,
      (): CrystalHandle => ({
        trigger: (kind: AnimationTrigger, params?: Record<string, unknown>) => {
          renderer?.trigger(kind, params);
        },
        snapshot: async (size?: number) => {
          if (!renderer) throw new Error('renderer not ready');
          return renderer.snapshot(size);
        },
        dispose: () => renderer?.dispose(),
      }),
      [renderer],
    );

    useEffect(() => {
      if (renderer && onReady) onReady({
        trigger: (kind, params) => renderer.trigger(kind, params),
        snapshot: async (size) => renderer.snapshot(size),
        dispose: () => renderer.dispose(),
      });
    }, [renderer, onReady]);

    // Keep glyph in sync if the prop changes
    useEffect(() => {
      if (renderer && glyphProp != null) {
        renderer.setGlyph(glyphProp).catch((err) => console.warn('[crystal] setGlyph failed:', err));
      }
    }, [renderer, glyphProp]);

    const canvasCamera = useMemo(
      () => ({ position: [0, 0.3, 4.2] as [number, number, number], fov: 32 }),
      [],
    );

    return (
      <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas
          camera={canvasCamera}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.95,
            preserveDrawingBuffer: true,
          }}
          style={{ background: 'transparent' }}
        >
          <SceneDriver
            config={config}
            glyph={glyph}
            qrEnabled={qrEnabled}
            onRendererReady={setRenderer}
          />
          {enablePostProcessing && <PostProcessingDriver />}
          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableDamping
              dampingFactor={0.1}
              rotateSpeed={0.45}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={(Math.PI * 2) / 3}
            />
          )}
        </Canvas>
      </div>
    );
  },
);

// ─── Placeholder glyph ───
//
// Until `apps/web/lib/sharePack/kyberGlyph.ts` ships the real
// encoder, synthesise a deterministic string so the QR is still a
// valid QR (even if it doesn't decode to a real glyph yet).

function buildPlaceholderGlyph(config: BladeConfig): string {
  const prefix = 'JED';
  const { r, g, b } = config.baseColor;
  const seed = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  return `${prefix}.${seed}${(config.style ?? 'stable').toUpperCase().slice(0, 3)}`;
}
