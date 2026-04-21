'use client';
import { useEffect, useRef, useState } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

/**
 * Modulator kind — drives which waveform the viz draws.
 *
 *   lfo   — smooth sine wave (cyclical oscillator)
 *   env   — one-shot ADSR silhouette (attack / decay / sustain / release)
 *   sim   — noise trace (random walk, the physical-simulation shape for
 *           SmoothSwing and similar physics-driven modulators)
 *   state — square / step waveform (boolean or discrete state changes)
 */
export type ModulatorKind = 'lfo' | 'env' | 'sim' | 'state';

export interface ModulatorVizProps {
  kind: ModulatorKind;
  /** Stroke color for the waveform. Defaults to `rgb(var(--status-magenta))`. */
  color?: string;
  /** CSS px width. Defaults to 80 (matches the reference `.mod-viz` 80x18). */
  width?: number;
  /** CSS px height. Defaults to 18. */
  height?: number;
  /** Snapshot seed so multiple visualizations on the same page differ. */
  seed?: number;
  /**
   * When false, the viz freezes on the last-drawn frame (zero per-tick
   * CPU). Useful for off-screen or paused rows.
   */
  animated?: boolean;
}

const DEFAULT_COLOR = 'rgb(var(--status-magenta, 180 106 192))';

/**
 * Static ENV silhouette — ADSR profile, drawn once and frozen. The shape
 * is (attack-ramp / decay-drop / sustain-floor / release-ramp-to-zero).
 */
function buildEnvPath(width: number, height: number): string {
  const baseline = height * 0.85;
  const peak = height * 0.15;
  const sustain = height * 0.55;
  const xAttack = width * 0.15;
  const xDecay = width * 0.35;
  const xRelease = width * 0.75;
  return (
    `M 0 ${baseline.toFixed(2)} ` +
    `L ${xAttack.toFixed(2)} ${peak.toFixed(2)} ` +
    `L ${xDecay.toFixed(2)} ${sustain.toFixed(2)} ` +
    `L ${xRelease.toFixed(2)} ${sustain.toFixed(2)} ` +
    `L ${width.toFixed(2)} ${baseline.toFixed(2)}`
  );
}

/** Build a live waveform path for the given kind + phase. */
function buildPath(
  kind: ModulatorKind,
  width: number,
  height: number,
  phase: number,
  seed: number,
): string {
  if (kind === 'env') return buildEnvPath(width, height);

  const N = 40;
  const center = height / 2;
  const amp = height * 0.42;
  const pts: Array<[number, number]> = [];

  if (kind === 'lfo') {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = phase + t * 2;
      const y = center + amp * Math.sin(p * Math.PI * 2);
      pts.push([t * width, y]);
    }
  } else if (kind === 'sim') {
    // Deterministic noise: mix of two offset sines + a seed-biased jitter.
    // Looks like swing-physics telemetry without being a random walk
    // (which would jump on every frame).
    const jitterAmp = height * 0.18;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = phase + t * 2;
      // Low-frequency body
      const base = Math.sin(p * 8) * Math.sin(p * 2 + t * 4);
      // High-frequency wobble, offset by seed so neighbours differ
      const wobble = Math.sin(p * 17 + seed * 2.3 + t * 9);
      const y = center + amp * 0.7 * base + jitterAmp * wobble * 0.5;
      pts.push([t * width, y]);
    }
  } else {
    // state — rectangular waveform flipping on slow period
    const period = 1.0;
    const edgeSoft = 0.02;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = (phase * 0.5 + t) % period;
      // Hard flip with a tiny softening so the path isn't perfectly
      // vertical (SVG rendering of a 0-width segment is fine but the
      // slight slope reads better).
      const high = p < period / 2;
      const y = high ? center - amp * 0.7 : center + amp * 0.7;
      // Add an edge nudge so a small diagonal shows at the transition
      const nearEdge =
        Math.abs(p - period / 2) < edgeSoft || Math.abs(p) < edgeSoft;
      pts.push([t * width, nearEdge ? center : y]);
    }
  }

  return (
    'M ' +
    pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
  );
}

/**
 * Tiny live SVG waveform preview for a modulator row.
 *
 * Ported from the Claude Design reference (`atoms.jsx:ModViz`) with four
 * kinds — LFO sine, ENV one-shot, SIM physical-noise trace, STATE square.
 *
 * The viz uses a single `<path>` regenerated per frame via rAF; no per-
 * pixel work, so cost is negligible per row.
 */
export function ModulatorViz({
  kind,
  color = DEFAULT_COLOR,
  width = 80,
  height = 18,
  seed = 0,
  animated = true,
}: ModulatorVizProps) {
  // Reduced-motion: always draw a single frozen frame.
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const runAnimation = animated && !reducedMotion;

  // ENV never needs to animate — its shape is one-shot.
  const isStatic = kind === 'env' || !runAnimation;

  // SSR / first-client parity: default path is the phase=0 frame so
  // there's no mismatch on hydration.
  const [path, setPath] = useState(() => buildPath(kind, width, height, 0, seed));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (isStatic) {
      // Rebuild once for non-animated cases (kind / dims / seed changed).
      setPath(buildPath(kind, width, height, 0, seed));
      return;
    }
    let canceled = false;
    const tick = (t: number) => {
      if (canceled) return;
      if (!startRef.current) startRef.current = t;
      const elapsed = (t - startRef.current) / 1000;
      // LFO animates fast; SIM slower; STATE slower still. Matches the
      // reference's `phase * 0.8` vs `0.4` multipliers.
      const speed = kind === 'lfo' ? 0.8 : kind === 'sim' ? 0.4 : 0.25;
      const phase = elapsed * speed;
      setPath(buildPath(kind, width, height, phase, seed));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      canceled = true;
      cancelAnimationFrame(rafRef.current);
      startRef.current = 0;
    };
  }, [kind, width, height, seed, isStatic]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
