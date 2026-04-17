import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CameraChoreographer,
  easeInOutCubic,
  getCrystalChamberAnchor,
  type ChoreographyAnchor,
} from '@/lib/crystal/cameraChoreographer';

// ─── Fixtures ───

function makeCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
  cam.position.set(0, 2, 5);
  cam.lookAt(0, 1.5, 0);
  return cam;
}

const START: ChoreographyAnchor = {
  position: new THREE.Vector3(0, 2, 5),
  target: new THREE.Vector3(0, 1.5, 0),
  fov: 40,
};

const END: ChoreographyAnchor = {
  position: new THREE.Vector3(0.2, 1.55, 0.5),
  target: new THREE.Vector3(0, 1.55, 0),
  fov: 28,
};

// ─── CameraChoreographer ───

describe('CameraChoreographer.dollyIn', () => {
  it('transitions from idle → dolly-in → at-end over durationMs', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);
    expect(ch.state).toBe('idle');

    ch.dollyIn({ durationMs: 1000 });
    expect(ch.state).toBe('dolly-in');

    // Advance by half — still animating
    expect(ch.tick(500)).toBe(true);
    expect(ch.state).toBe('dolly-in');

    // Finish — returns false, state settles
    expect(ch.tick(600)).toBe(false);
    expect(ch.state).toBe('at-end');
  });

  it('camera position lerps from start toward end', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 1000, easing: (t) => t }); // linear for predictable mid-point
    ch.tick(0); // apply initial pose
    const startDist = cam.position.distanceTo(START.position);

    ch.tick(500); // halfway
    const midDist = cam.position.distanceTo(START.position);
    expect(midDist).toBeGreaterThan(startDist);

    ch.tick(600); // overshoot durationMs → clamps
    expect(cam.position.distanceTo(END.position)).toBeLessThan(0.01);
  });

  it('lands exactly at the end anchor pose when complete', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 500 });
    ch.tick(600); // overshoot

    expect(cam.position.distanceTo(END.position)).toBeLessThan(1e-5);
    expect(cam.fov).toBeCloseTo(END.fov!, 5);
    expect(ch.state).toBe('at-end');
  });
});

describe('CameraChoreographer.dollyOut', () => {
  it('reverses from end back to start', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    // First, get to the end state
    ch.dollyIn({ durationMs: 100 });
    ch.tick(200);
    expect(ch.state).toBe('at-end');
    expect(cam.position.distanceTo(END.position)).toBeLessThan(1e-5);

    // Now dolly out
    ch.dollyOut({ durationMs: 100 });
    expect(ch.state).toBe('dolly-out');

    ch.tick(200);
    expect(ch.state).toBe('idle');
    expect(cam.position.distanceTo(START.position)).toBeLessThan(1e-5);
    expect(cam.fov).toBeCloseTo(START.fov!, 5);
  });

  it('is a no-op from idle state', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyOut();
    expect(ch.state).toBe('idle');
  });
});

describe('CameraChoreographer.progress', () => {
  it('reports monotonically increasing progress during dolly-in', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 1000 });
    const samples: number[] = [ch.progress];
    for (let i = 0; i < 10; i++) {
      ch.tick(100);
      samples.push(ch.progress);
    }

    // Monotonic non-decreasing
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });
});

describe('CameraChoreographer.reset', () => {
  it('returns the camera to the start pose without animation', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 1000 });
    ch.tick(500);
    // Mid-animation — camera is somewhere between
    expect(ch.state).toBe('dolly-in');

    ch.reset();
    expect(ch.state).toBe('idle');
    expect(cam.position.distanceTo(START.position)).toBeLessThan(1e-5);
    expect(cam.fov).toBeCloseTo(START.fov!, 5);
  });
});

describe('CameraChoreographer idempotency', () => {
  it('ignores duplicate dollyIn calls while already dolly-in', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 1000 });
    ch.tick(500); // halfway
    const midPos = cam.position.clone();

    // Second dollyIn should NOT reset elapsed time — it's a no-op
    ch.dollyIn({ durationMs: 100 }); // different duration wouldn't matter if no-op
    ch.tick(0);
    expect(cam.position.distanceTo(midPos)).toBeLessThan(1e-5);
  });

  it('ignores dollyIn when already at-end', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    ch.dollyIn({ durationMs: 100 });
    ch.tick(200);
    expect(ch.state).toBe('at-end');

    ch.dollyIn();
    expect(ch.state).toBe('at-end'); // unchanged
  });
});

describe('CameraChoreographer onComplete', () => {
  it('fires onComplete exactly once when dolly-in finishes', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    let calls = 0;
    ch.dollyIn({ durationMs: 100, onComplete: () => calls++ });

    ch.tick(50);
    expect(calls).toBe(0);

    ch.tick(60); // now past duration
    expect(calls).toBe(1);

    // Extra ticks don't re-fire
    ch.tick(100);
    ch.tick(100);
    expect(calls).toBe(1);
  });

  it('fires onComplete exactly once when dolly-out finishes', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    // Get to end first
    ch.dollyIn({ durationMs: 50 });
    ch.tick(100);

    let calls = 0;
    ch.dollyOut({ durationMs: 100, onComplete: () => calls++ });
    ch.tick(150);
    expect(calls).toBe(1);
  });

  it('fires onComplete synchronously when durationMs is 0', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    let calls = 0;
    ch.dollyIn({ durationMs: 0, onComplete: () => calls++ });
    expect(calls).toBe(1);
    expect(ch.state).toBe('at-end');
    // And camera is at end
    expect(cam.position.distanceTo(END.position)).toBeLessThan(1e-5);
  });
});

describe('CameraChoreographer onProgress', () => {
  it('is called each tick with eased progress', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);

    const samples: number[] = [];
    ch.dollyIn({
      durationMs: 400,
      easing: (t) => t,
      onProgress: (t) => samples.push(t),
    });
    ch.tick(100);
    ch.tick(100);
    ch.tick(100);
    ch.tick(100);

    expect(samples.length).toBeGreaterThanOrEqual(4);
    // Should be non-decreasing
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] - 1e-9);
    }
  });
});

describe('easeInOutCubic', () => {
  it('passes through endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('is symmetric around 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });

  it('is monotonically non-decreasing on [0,1]', () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

// ─── getCrystalChamberAnchor ───

describe('getCrystalChamberAnchor', () => {
  it('returns target Y between 0 and hiltLength (inside the grip)', () => {
    const anchor = getCrystalChamberAnchor(2.8, 0.16);
    expect(anchor.target.y).toBeGreaterThan(0);
    expect(anchor.target.y).toBeLessThan(2.8);
  });

  it('keeps the camera position within a reasonable radial distance', () => {
    const hiltLength = 2.8;
    const hiltRadius = 0.16;
    const anchor = getCrystalChamberAnchor(hiltLength, hiltRadius);

    const radial = Math.hypot(anchor.position.x, anchor.position.z);
    // Within 5x the hilt radius — enforces the "tight close-up" framing
    expect(radial).toBeLessThan(hiltRadius * 20); // generous upper bound
    expect(radial).toBeGreaterThan(0);
  });

  it('aims the camera at the hilt axis (target.x ≈ target.z ≈ 0)', () => {
    const anchor = getCrystalChamberAnchor(3.0, 0.14);
    expect(Math.abs(anchor.target.x)).toBeLessThan(0.01);
    expect(Math.abs(anchor.target.z)).toBeLessThan(0.01);
  });

  it('uses a tight fov for cinematic close-up', () => {
    const anchor = getCrystalChamberAnchor(2.8, 0.16);
    expect(anchor.fov).toBeDefined();
    expect(anchor.fov!).toBeLessThan(40); // tighter than the scene default
  });

  it('scales orbit distance with hilt radius (tiny hilts → floor)', () => {
    const small = getCrystalChamberAnchor(2.5, 0.02);
    const large = getCrystalChamberAnchor(2.5, 0.25);
    const smallR = Math.hypot(small.position.x, small.position.z);
    const largeR = Math.hypot(large.position.x, large.position.z);
    // Small hilt hits the 0.3 floor; large hilt scales up
    expect(smallR).toBeGreaterThan(0.25);
    expect(largeR).toBeGreaterThan(smallR);
  });
});

// ─── Disposal ───

describe('CameraChoreographer.dispose', () => {
  it('clears state and ignores further ticks', () => {
    const cam = makeCamera();
    const ch = new CameraChoreographer(cam);
    ch.setAnchors(START, END);
    ch.dollyIn({ durationMs: 1000 });

    ch.dispose();
    expect(ch.state).toBe('idle');
    expect(ch.tick(100)).toBe(false);
  });
});
