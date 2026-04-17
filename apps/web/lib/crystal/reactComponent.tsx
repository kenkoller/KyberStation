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

import { useBladeStore } from '@/stores/bladeStore';
import { CrystalRenderer } from './renderer';
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
  const { scene } = useThree();
  const rendererRef = useRef<CrystalRenderer | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const hoverRef = useRef<{ tiltX: number; tiltY: number } | null>(null);

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

  // Per-frame tick
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
            toneMappingExposure: 1.15,
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
