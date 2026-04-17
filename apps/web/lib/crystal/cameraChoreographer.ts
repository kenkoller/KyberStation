// ─── Camera Choreographer — cinematic dolly into the Crystal Chamber ───
//
// Pure logic module. No React, no DOM. Drives a Three.js PerspectiveCamera
// through a timed animation between two world-space anchors (pose +
// look-at target + fov).
//
// Used by `FullscreenPreview.tsx` when the active topology exposes the
// `accent-crystal` segment (ACCENT_TOPOLOGY, LEDs 132-139): the camera
// dollies from the default wide blade framing into the hilt's Crystal
// Chamber until the Kyber Crystal fills the frame.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §13 and `docs/KYBER_CRYSTAL_VISUAL.md`
// §7.4.

import * as THREE from 'three';

// ─── Public types ───

/** A pose + target the camera can rest at. */
export interface ChoreographyAnchor {
  position: THREE.Vector3;
  /** World-space point the camera looks at. */
  target: THREE.Vector3;
  /** Optional FOV in degrees. If omitted the camera's current FOV is kept. */
  fov?: number;
}

export interface ChoreographyOptions {
  /** Total animation duration in milliseconds. Default 2400. */
  durationMs?: number;
  /** Eased timing curve, t in [0,1] → eased [0,1]. Default easeInOutCubic. */
  easing?: (t: number) => number;
  /** Called once when the animation reaches progress 1 (or 0 on dolly-out). */
  onComplete?: () => void;
  /** Called every tick with the current eased progress (0..1). */
  onProgress?: (t: number) => void;
}

export type ChoreographerState = 'idle' | 'dolly-in' | 'at-end' | 'dolly-out';

// ─── Defaults ───

const DEFAULT_DURATION_MS = 2400;

/** Cubic ease-in-out — smooth, symmetric, no overshoot. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Small exit-ramp applied at the tail of the animation (last 15%) so the
 * camera doesn't jolt to a stop — the "cinematic cue" from the brief.
 * We smooth the derivative to zero by scaling the incremental delta
 * down toward the end.
 */
function cinematicTail(eased: number): number {
  if (eased < 0.85) return eased;
  // Remap [0.85, 1] through a soft landing so velocity -> 0
  const u = (eased - 0.85) / 0.15; // 0..1 within the tail
  const softened = 1 - Math.pow(1 - u, 2); // ease-out quadratic
  return 0.85 + 0.15 * softened;
}

// ─── Main class ───

export class CameraChoreographer {
  private camera: THREE.PerspectiveCamera;
  private startAnchor: ChoreographyAnchor | null = null;
  private endAnchor: ChoreographyAnchor | null = null;

  private _state: ChoreographerState = 'idle';
  private elapsedMs = 0;
  private durationMs = DEFAULT_DURATION_MS;
  private easingFn: (t: number) => number = easeInOutCubic;
  private onComplete: (() => void) | null = null;
  private onProgress: ((t: number) => void) | null = null;
  private completeFired = false;

  /** Direction of travel for the current animation — 1 = start→end, -1 = end→start. */
  private direction: 1 | -1 = 1;

  // Scratch objects to avoid per-frame allocations
  private scratchPos = new THREE.Vector3();
  private scratchTarget = new THREE.Vector3();
  private scratchLookAtMatrix = new THREE.Matrix4();
  private scratchQuatStart = new THREE.Quaternion();
  private scratchQuatEnd = new THREE.Quaternion();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  /** Set or update the two anchors used by subsequent dolly calls. */
  setAnchors(start: ChoreographyAnchor, end: ChoreographyAnchor): void {
    this.startAnchor = cloneAnchor(start);
    this.endAnchor = cloneAnchor(end);
  }

  /** Animate from start → end. Idempotent: calling mid-animation while
   *  dollying-in is a no-op. Calling during `at-end` or `dolly-out` restarts
   *  in the correct direction. */
  dollyIn(options?: ChoreographyOptions): void {
    if (!this.startAnchor || !this.endAnchor) return;
    if (this._state === 'dolly-in') return; // already running
    if (this._state === 'at-end') return;   // nothing to do
    this.beginAnimation(1, options);
  }

  /** Animate from end → start. Idempotent while already dollying-out. */
  dollyOut(options?: ChoreographyOptions): void {
    if (!this.startAnchor || !this.endAnchor) return;
    if (this._state === 'dolly-out') return;
    if (this._state === 'idle') return;
    this.beginAnimation(-1, options);
  }

  /**
   * Advance the animation by `deltaMs`. Returns `true` while an animation is
   * still running, `false` when idle or settled.
   *
   * Safe to call every frame unconditionally — when idle it does nothing.
   */
  tick(deltaMs: number): boolean {
    if (this._state !== 'dolly-in' && this._state !== 'dolly-out') {
      return false;
    }
    if (!this.startAnchor || !this.endAnchor) return false;

    this.elapsedMs = Math.min(this.elapsedMs + Math.max(0, deltaMs), this.durationMs);
    const rawT = this.durationMs > 0 ? this.elapsedMs / this.durationMs : 1;
    const eased = this.easingFn(rawT);
    const cinematic = cinematicTail(eased);

    // Direction 1: interp from start → end with t = cinematic
    // Direction -1: interp from end → start with t = cinematic
    const t = this.direction === 1 ? cinematic : 1 - cinematic;
    this.applyInterpolatedPose(t);

    this.onProgress?.(cinematic);

    if (rawT >= 1) {
      // Snap to final pose to avoid floating-point drift
      this.applyInterpolatedPose(this.direction === 1 ? 1 : 0);
      this._state = this.direction === 1 ? 'at-end' : 'idle';
      if (!this.completeFired) {
        this.completeFired = true;
        this.onComplete?.();
      }
      return false;
    }

    return true;
  }

  /** Progress 0..1 of the currently-running animation (or the last completed one). */
  get progress(): number {
    if (this.durationMs <= 0) return 1;
    return Math.min(1, Math.max(0, this.elapsedMs / this.durationMs));
  }

  get state(): ChoreographerState {
    return this._state;
  }

  /** Instantly return to the start anchor, cancelling any animation. */
  reset(): void {
    this._state = 'idle';
    this.elapsedMs = 0;
    this.completeFired = false;
    this.onComplete = null;
    this.onProgress = null;
    if (this.startAnchor) {
      this.applyPose(this.startAnchor);
    }
  }

  /** Release callback references. Camera is externally owned — not touched. */
  dispose(): void {
    this.startAnchor = null;
    this.endAnchor = null;
    this.onComplete = null;
    this.onProgress = null;
    this._state = 'idle';
    this.elapsedMs = 0;
  }

  // ── Internal ────────────────────────────────────────────────────────

  private beginAnimation(direction: 1 | -1, options?: ChoreographyOptions): void {
    this.direction = direction;
    this.elapsedMs = 0;
    this.durationMs = Math.max(0, options?.durationMs ?? DEFAULT_DURATION_MS);
    this.easingFn = options?.easing ?? easeInOutCubic;
    this.onComplete = options?.onComplete ?? null;
    this.onProgress = options?.onProgress ?? null;
    this.completeFired = false;
    this._state = direction === 1 ? 'dolly-in' : 'dolly-out';

    // If durationMs is 0 (reduced-motion jump), settle immediately.
    if (this.durationMs === 0) {
      this.applyInterpolatedPose(direction === 1 ? 1 : 0);
      this._state = direction === 1 ? 'at-end' : 'idle';
      this.completeFired = true;
      this.onComplete?.();
    }
  }

  private applyInterpolatedPose(t: number): void {
    if (!this.startAnchor || !this.endAnchor) return;

    // Position lerp
    this.scratchPos.lerpVectors(this.startAnchor.position, this.endAnchor.position, t);
    this.camera.position.copy(this.scratchPos);

    // Target lerp (for lookAt)
    this.scratchTarget.lerpVectors(this.startAnchor.target, this.endAnchor.target, t);

    // Use quaternion slerp for smoother rotation than raw lookAt lerp
    // Build start quaternion
    this.scratchLookAtMatrix.lookAt(
      this.startAnchor.position,
      this.startAnchor.target,
      this.camera.up,
    );
    this.scratchQuatStart.setFromRotationMatrix(this.scratchLookAtMatrix);
    // Build end quaternion
    this.scratchLookAtMatrix.lookAt(
      this.endAnchor.position,
      this.endAnchor.target,
      this.camera.up,
    );
    this.scratchQuatEnd.setFromRotationMatrix(this.scratchLookAtMatrix);
    // Slerp
    this.camera.quaternion.slerpQuaternions(
      this.scratchQuatStart,
      this.scratchQuatEnd,
      t,
    );

    // FOV lerp
    const startFov = this.startAnchor.fov ?? this.camera.fov;
    const endFov = this.endAnchor.fov ?? this.camera.fov;
    this.camera.fov = startFov + (endFov - startFov) * t;
    this.camera.updateProjectionMatrix();
  }

  private applyPose(anchor: ChoreographyAnchor): void {
    this.camera.position.copy(anchor.position);
    this.camera.lookAt(anchor.target);
    if (anchor.fov != null) {
      this.camera.fov = anchor.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

// ─── Anchor helpers ────────────────────────────────────────────────────

function cloneAnchor(a: ChoreographyAnchor): ChoreographyAnchor {
  return {
    position: a.position.clone(),
    target: a.target.clone(),
    fov: a.fov,
  };
}

/**
 * Derive a Crystal-Chamber camera anchor from the hilt geometry.
 *
 * The ACCENT_TOPOLOGY declares a "Crystal Chamber" segment (LEDs 132-139,
 * `role: 'accent-crystal'`). Semantically this represents the accent LEDs
 * inside the hilt's crystal chamber — visually, the chamber sits roughly
 * mid-hilt, slightly toward the emitter.
 *
 * The `physicalLayout` in types.ts uses a 2D normalised layout that doesn't
 * yet translate to world space, so this first-pass uses a deterministic
 * fixed offset: mid-hilt, biased toward emitter, with the camera orbiting
 * ~0.3 units away on a 3/4 angle looking at that point.
 *
 * BladeCanvas3D convention: hilt is centred on Y axis, hiltLength of grip,
 * top of emitter at y ≈ `hiltLength * 0.92`. "Mid-grip" therefore ≈
 * `hiltLength * 0.55`.
 */
export function getCrystalChamberAnchor(
  hiltLength: number,
  hiltRadius: number,
): ChoreographyAnchor {
  // Crystal chamber world position — mid-grip, slightly emitter-ward.
  // The hilt in BladeCanvas3D is drawn with its base at y=0 and emitter at
  // y≈hiltLength*0.92 (see HiltMesh), so this Y value puts us inside the
  // grip tube at the visual "heart" of the hilt.
  const chamberY = hiltLength * 0.55;
  const chamberX = 0;
  const chamberZ = 0;

  // Camera sits in front of and slightly above the chamber on a gentle
  // 3/4 angle. Distance ~= 0.3 world units + a bit of hilt radius so
  // small hilts still get a clean frame without clipping.
  const orbitDistance = Math.max(0.3, hiltRadius * 6);

  return {
    position: new THREE.Vector3(
      orbitDistance * 0.35,     // slight right-of-axis
      chamberY + orbitDistance * 0.15, // slight high angle
      orbitDistance,             // in front
    ),
    target: new THREE.Vector3(chamberX, chamberY, chamberZ),
    fov: 28, // tighter than default 40 for cinematic close-up
  };
}
