// ─── Kyber Crystal — Renderer ───
//
// Composes geometry + materials + lighting + animations into a single
// THREE.Group the React wrapper mounts to its scene. Framework-agnostic
// — the wrapper only forwards the active BladeConfig and ticks each
// frame.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §10-11.

import * as THREE from 'three';
import type { BladeConfig } from '@kyberstation/engine';
import {
  type CrystalHandle,
  type AnimationTrigger,
  type AnimationState,
  selectForm,
  geometryParamsForConfig,
} from './types';
import { hashConfig } from './hash';
import {
  buildCrystalGeometry,
  computeFleckPhases,
  disposeCrystalGeometry,
  type CrystalGeometryResult,
} from './geometry';
import {
  createBodyMaterial,
  createInnerGlowMaterial,
  createVeinMaterial,
  createSeamMaterial,
  createFleckMaterial,
  createHaloMaterial,
  createQrDecalMaterial,
  type CrystalBodyMaterial,
  type FleckMaterial,
} from './materials';
import {
  createCrystalLighting,
  setInternalGlowColor,
  lerpInternalGlowColor,
  BLEED_COLOR,
  INTERNAL_LIGHT_BASE_INTENSITY,
  type CrystalLights,
} from './lighting';
import {
  CrystalAnimationController,
  type ConfigSnapshot,
} from './animations';
import {
  createQrSurface,
  deriveQrLayout,
  createQrDecalGeometry,
  type QrSurfaceResult,
} from './qrSurface';

// ─── Build / teardown primitives ───

interface CrystalMeshes {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  body: THREE.Mesh;
  bodyLower: THREE.Mesh | null;
  inner: THREE.Mesh;
  veins: THREE.Mesh | null;
  seam: THREE.Mesh | null;
  fleck: THREE.InstancedMesh | null;
  halo: THREE.Mesh;
  qr: THREE.Mesh | null;
  pairedRight: THREE.Mesh | null;
  pairedSaddle: THREE.Mesh | null;
  materials: {
    body: CrystalBodyMaterial;
    inner: THREE.MeshBasicMaterial;
    vein: THREE.MeshBasicMaterial | null;
    seam: THREE.MeshBasicMaterial | null;
    fleck: FleckMaterial | null;
    halo: THREE.MeshBasicMaterial;
    qr: THREE.MeshBasicMaterial | null;
    pairedRightBody?: CrystalBodyMaterial;
    pairedSaddle?: THREE.MeshStandardMaterial;
  };
}

// ─── Renderer options ───

export interface CrystalRendererOptions {
  config: BladeConfig;
  glyph?: string;
  qrEnabled?: boolean;
  respectReducedMotion?: boolean;
}

// ─── Main renderer ───

export class CrystalRenderer implements CrystalHandle {
  readonly root: THREE.Group;
  private lights: CrystalLights;
  private animations: CrystalAnimationController;
  private meshes: CrystalMeshes | null = null;
  private geometry: CrystalGeometryResult | null = null;
  private qrSurface: QrSurfaceResult | null = null;

  private config: BladeConfig;
  private currentHash = 0;
  private currentForm = '';
  private qrEnabled: boolean;
  private glyph: string;
  private disposed = false;
  private reducedMotion: boolean;
  private elapsedSeconds = 0;

  // Bleed snapshot — captured at the time bleed is triggered so the
  // internal point light can crossfade cleanly even if config.baseColor
  // changes mid-animation.
  private bleedFromColor: { r: number; g: number; b: number } | null = null;

  constructor(opts: CrystalRendererOptions) {
    this.config = opts.config;
    this.qrEnabled = opts.qrEnabled ?? true;
    this.glyph = opts.glyph ?? 'JED.000000000000';
    this.reducedMotion = detectReducedMotion(opts.respectReducedMotion ?? true);

    this.root = new THREE.Group();
    this.root.name = 'kyber-crystal';

    this.lights = createCrystalLighting();
    this.root.add(this.lights.group);

    this.animations = new CrystalAnimationController({
      initialSnapshot: snapshotOf(this.config),
      respectReducedMotion: opts.respectReducedMotion,
    });

    this.rebuildAll();

    // Kick off idle pulse + transition-state animations
    this.animations.trigger('idle');
    if (this.config.preonEnabled) this.animations.trigger('preon');
    if (this.config.style === 'unstable') this.animations.trigger('unstable');
  }

  /**
   * Update the config and re-apply. Cheap when only colour / shimmer /
   * timing changes; rebuilds geometry when the form-selecting fields change.
   */
  applyConfig(config: BladeConfig): void {
    if (this.disposed) return;
    const prev = this.config;
    this.config = config;

    // Detect narrative transitions BEFORE rebuilding — the animation
    // controller needs the previous snapshot.
    this.animations.notifyConfigChange(snapshotOf(config));

    const nextHash = hashConfig(config);
    const nextForm = selectForm(config);
    const formChanged = nextForm !== this.currentForm;
    const hashChanged = nextHash !== this.currentHash;

    if (formChanged || hashChanged) {
      this.rebuildAll();
    } else if (this.meshes) {
      // Just update material uniforms — cheap path
      this.meshes.materials.body.setBaseColor(config.baseColor);
      this.meshes.materials.inner.color.setRGB(
        config.baseColor.r / 255,
        config.baseColor.g / 255,
        config.baseColor.b / 255,
      );
      if (this.meshes.materials.pairedRightBody) {
        this.meshes.materials.pairedRightBody.setBaseColor(config.baseColor);
      }
      setInternalGlowColor(this.lights.internal, config.baseColor);
    }

    // Only remember the _prev_ snapshot once we're done reacting to it
    void prev;
  }

  /**
   * Per-frame tick. The caller is responsible for passing elapsed time
   * in ms and the interactive hover state.
   */
  tick(deltaMs: number, hover?: { tiltX: number; tiltY: number } | null): void {
    if (this.disposed || !this.meshes) return;

    if (hover) {
      this.animations.trigger('hover', { tiltX: hover.tiltX, tiltY: hover.tiltY });
    }

    // Advance the shared clock used by shader uniforms (fleck twinkle).
    // When reduced-motion is honoured we leave the clock frozen so the
    // material's static phase offsets show steady flecks.
    if (!this.reducedMotion) {
      this.elapsedSeconds += deltaMs / 1000;
      if (this.meshes.materials.fleck) {
        this.meshes.materials.fleck.setTime(this.elapsedSeconds);
      }
    }

    const state = this.animations.tick(deltaMs);
    this.applyAnimationState(state);
  }

  trigger(kind: AnimationTrigger, params?: Record<string, unknown>): void {
    if (kind === 'bleed') {
      // Capture current colour for smooth crossfade
      this.bleedFromColor = { ...this.config.baseColor };
    }
    this.animations.trigger(kind, params);
  }

  get animationBlocking(): boolean {
    return this.animations.isBlocking;
  }

  async snapshot(size = 512): Promise<Blob> {
    // Render-to-target via a headless WebGLRenderer. The React wrapper
    // provides a ready WebGLRenderer in its onReady callback; for
    // standalone snapshot we spin one up here.
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    try {
      renderer.setPixelRatio(2);
      renderer.setSize(size, size);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;

      const scene = new THREE.Scene();
      scene.background = null;
      // Detach the root temporarily to render against a clean scene
      const parent = this.root.parent;
      scene.add(this.root);

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0.3, 4.2);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      const blob = await new Promise<Blob>((resolve, reject) => {
        renderer.domElement.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
          1.0,
        );
      });

      // Restore root to its original parent if any
      if (parent) parent.add(this.root);
      return blob;
    } finally {
      renderer.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardownMeshes();
    this.lights.group.clear();
    this.animations.dispose();
    if (this.qrSurface) {
      this.qrSurface.texture.dispose();
      this.qrSurface = null;
    }
  }

  // ─── Internals ───

  private rebuildAll(): void {
    this.teardownMeshes();
    const seed = hashConfig(this.config);
    this.currentHash = seed;
    this.currentForm = selectForm(this.config);

    const params = geometryParamsForConfig(this.config, seed);
    this.geometry = buildCrystalGeometry(params);

    this.meshes = this.buildMeshes();
    this.root.add(this.meshes.root);

    // Position the internal point light at the geometric centre
    const midY = (this.geometry.meta.topY + this.geometry.meta.bottomY) / 2;
    this.lights.internal.position.set(0, midY, 0);
    setInternalGlowColor(this.lights.internal, this.config.baseColor);
    this.meshes.root.add(this.lights.internal);

    // QR surface — async because qrcode library is async
    if (this.qrEnabled) {
      this.attachQrAsync().catch((err) => {
        console.warn('[crystal] QR surface failed:', err);
      });
    }
  }

  private buildMeshes(): CrystalMeshes {
    if (!this.geometry) throw new Error('geometry not built');
    const root = new THREE.Group();
    root.name = 'crystal-meshes';

    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'crystal-body';
    root.add(bodyGroup);

    const bodyMat = createBodyMaterial({
      baseColor: this.config.baseColor,
      form: this.currentForm as CrystalGeometryResult['meta']['form'],
      sheenStrength: 0.35,
    });
    const innerMat = createInnerGlowMaterial(this.config.baseColor);
    const haloMat = createHaloMaterial(this.config.baseColor);

    const body = new THREE.Mesh(this.geometry.body, bodyMat);
    body.renderOrder = 2;
    bodyGroup.add(body);

    let bodyLower: THREE.Mesh | null = null;
    if (this.geometry.bodyLower) {
      bodyLower = new THREE.Mesh(this.geometry.bodyLower, bodyMat);
      bodyLower.renderOrder = 2;
      bodyGroup.add(bodyLower);
    }

    let pairedRight: THREE.Mesh | null = null;
    let pairedSaddle: THREE.Mesh | null = null;
    let pairedRightBody: CrystalBodyMaterial | undefined;
    let pairedSaddleMat: THREE.MeshStandardMaterial | undefined;
    if (this.geometry.pairedRight) {
      pairedRightBody = createBodyMaterial({
        baseColor: this.config.baseColor,
        form: this.currentForm as CrystalGeometryResult['meta']['form'],
        sheenStrength: 0.35,
      });
      pairedRight = new THREE.Mesh(this.geometry.pairedRight, pairedRightBody);
      pairedRight.renderOrder = 2;
      // Side-by-side layout
      body.position.set(-0.32, 0, 0);
      pairedRight.position.set(0.32, -0.05, 0);
      bodyGroup.add(pairedRight);

      if (this.geometry.pairedSaddle) {
        pairedSaddleMat = new THREE.MeshStandardMaterial({
          color: 0x101018,
          roughness: 0.6,
          metalness: 0.2,
        });
        pairedSaddle = new THREE.Mesh(this.geometry.pairedSaddle, pairedSaddleMat);
        bodyGroup.add(pairedSaddle);
      }
    }

    // Inner glow mesh — slightly smaller, additive, attached to same bodyGroup
    const inner = new THREE.Mesh(this.geometry.inner, innerMat);
    inner.renderOrder = 1;
    inner.scale.setScalar(0.96);
    bodyGroup.add(inner);

    // Halo — outer shell
    const haloScale = 1.18;
    const halo = new THREE.Mesh(this.geometry.inner, haloMat);
    halo.renderOrder = 5;
    halo.scale.setScalar(haloScale);
    bodyGroup.add(halo);

    // Veins
    let veinMat: THREE.MeshBasicMaterial | null = null;
    let veins: THREE.Mesh | null = null;
    if (this.geometry.veins) {
      veinMat = createVeinMaterial(0xff3020);
      veinMat.opacity = 0; // animated
      veins = new THREE.Mesh(this.geometry.veins, veinMat);
      veins.renderOrder = 4;
      bodyGroup.add(veins);
    }

    // Seam (Form 3 Cracked energy gap)
    let seamMat: THREE.MeshBasicMaterial | null = null;
    let seam: THREE.Mesh | null = null;
    if (this.geometry.seam) {
      seamMat = createSeamMaterial(this.config.baseColor);
      seam = new THREE.Mesh(this.geometry.seam, seamMat);
      seam.renderOrder = 3;
      bodyGroup.add(seam);
    }

    // Flecks — InstancedMesh for efficiency. Each instance has a
    // deterministic `aPhase` attribute that the fleck material's
    // custom shader consumes to twinkle each fleck independently.
    let fleck: THREE.InstancedMesh | null = null;
    let fleckMat: FleckMaterial | null = null;
    if (this.geometry.fleckTransforms.length > 0) {
      fleckMat = createFleckMaterial({ reducedMotion: this.reducedMotion });
      fleck = new THREE.InstancedMesh(
        this.geometry.fleck,
        fleckMat,
        this.geometry.fleckTransforms.length,
      );
      fleck.renderOrder = 6;
      for (let i = 0; i < this.geometry.fleckTransforms.length; i++) {
        fleck.setMatrixAt(i, this.geometry.fleckTransforms[i]);
      }
      fleck.instanceMatrix.needsUpdate = true;

      // Attach the per-instance phase attribute. Note: InstancedMesh's
      // underlying geometry is shared, so we add the attribute to
      // `geometry.fleck` rather than creating a wrapper — Three.js
      // picks it up automatically in the vertex shader via `attribute
      // float aPhase`.
      const phases = computeFleckPhases({
        count: this.geometry.fleckTransforms.length,
        seed: this.currentHash,
      });
      this.geometry.fleck.setAttribute(
        'aPhase',
        new THREE.InstancedBufferAttribute(phases, 1),
      );

      bodyGroup.add(fleck);
    }

    // QR — attached later (async)
    const qr: THREE.Mesh | null = null;
    const qrMat: THREE.MeshBasicMaterial | null = null;

    return {
      root,
      bodyGroup,
      body,
      bodyLower,
      inner,
      veins,
      seam,
      fleck,
      halo,
      qr,
      pairedRight,
      pairedSaddle,
      materials: {
        body: bodyMat,
        inner: innerMat,
        vein: veinMat,
        seam: seamMat,
        fleck: fleckMat,
        halo: haloMat,
        qr: qrMat,
        pairedRightBody,
        pairedSaddle: pairedSaddleMat,
      },
    };
  }

  private async attachQrAsync(): Promise<void> {
    if (!this.geometry || !this.meshes) return;
    if (this.qrSurface) {
      this.qrSurface.texture.dispose();
      this.qrSurface = null;
    }
    const isObsidian = this.currentForm === 'obsidian-bipyramid';
    this.qrSurface = await createQrSurface(this.glyph, {
      canvasSize: 512,
      errorCorrectionLevel: 'M',
      invertPolarity: isObsidian,
    });

    const layout = deriveQrLayout(this.geometry.meta);
    const qrGeom = createQrDecalGeometry(layout);
    const qrMat = createQrDecalMaterial(this.qrSurface.texture);
    const qrMesh = new THREE.Mesh(qrGeom, qrMat);
    qrMesh.position.set(0, layout.centreY, layout.zOffset);
    qrMesh.renderOrder = 7;

    this.meshes.bodyGroup.add(qrMesh);
    this.meshes.qr = qrMesh;
    this.meshes.materials.qr = qrMat;
  }

  /** Update glyph payload — dispose + re-attach the QR. */
  async setGlyph(glyph: string): Promise<void> {
    this.glyph = glyph;
    if (!this.qrEnabled) return;
    if (this.meshes?.qr) {
      this.meshes.bodyGroup.remove(this.meshes.qr);
      this.meshes.qr.geometry.dispose();
      this.meshes.materials.qr?.dispose();
      this.meshes.qr = null;
      this.meshes.materials.qr = null;
    }
    await this.attachQrAsync();
  }

  private applyAnimationState(state: AnimationState): void {
    if (!this.meshes) return;
    const m = this.meshes;

    // Internal glow intensity + bleed colour crossfade. Intensity always
    // follows the shared INTERNAL_LIGHT_BASE_INTENSITY so `lighting.ts`
    // and the per-frame animation scaling never drift apart.
    const base = this.config.baseColor;
    if (state.bleedProgress > 0 && this.bleedFromColor) {
      lerpInternalGlowColor(this.lights.internal, this.bleedFromColor, BLEED_COLOR, state.bleedProgress);
    } else {
      setInternalGlowColor(this.lights.internal, base, state.glowIntensity);
    }
    this.lights.internal.intensity = INTERNAL_LIGHT_BASE_INTENSITY * state.glowIntensity;

    // Vein opacity
    if (m.materials.vein) {
      m.materials.vein.opacity = state.veinOpacity;
    }
    // Seam opacity (Cracked form)
    if (m.materials.seam) {
      m.materials.seam.opacity = state.seamOpacity;
    }
    // Fleck opacity
    if (m.materials.fleck) {
      m.materials.fleck.opacity = state.fleckOpacity;
    }
    // Halo opacity (Preon)
    if (m.materials.halo) {
      m.materials.halo.opacity = state.haloOpacity;
    }

    // Group-level transforms
    m.bodyGroup.rotation.x = (state.tiltX * Math.PI) / 180;
    m.bodyGroup.rotation.y = (state.tiltY * Math.PI) / 180;
    m.bodyGroup.scale.setScalar(state.scale);
  }

  private teardownMeshes(): void {
    if (this.meshes) {
      // Dispose materials (geometry is disposed via geometry.dispose)
      const mats = this.meshes.materials;
      mats.body.dispose();
      mats.inner.dispose();
      mats.vein?.dispose();
      mats.seam?.dispose();
      mats.fleck?.dispose();
      mats.halo.dispose();
      mats.qr?.dispose();
      mats.pairedRightBody?.dispose();
      mats.pairedSaddle?.dispose();
      this.meshes.root.parent?.remove(this.meshes.root);
      this.meshes = null;
    }
    if (this.geometry) {
      disposeCrystalGeometry(this.geometry);
      this.geometry = null;
    }
  }
}

// ─── Helpers ───

function snapshotOf(config: BladeConfig): ConfigSnapshot {
  return {
    baseColor: config.baseColor,
    style: config.style,
    preonEnabled: config.preonEnabled ?? false,
  };
}

/**
 * Detect OS-level reduced-motion preference. When disabled we always
 * animate, regardless of the OS setting. Safe for SSR (returns false
 * if matchMedia isn't available).
 */
function detectReducedMotion(respect: boolean): boolean {
  if (!respect) return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ─── Barrel export of frequently used items ───

export { hashConfig } from './hash';
export { selectForm, CRYSTAL_FORMS } from './types';
export type { CrystalFormId, CrystalHandle, AnimationTrigger } from './types';
