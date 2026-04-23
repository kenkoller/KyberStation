'use client';
import { useRef, useEffect, useCallback } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { EffectType } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { PARAMETER_DESCRIPTORS } from '@/lib/parameterGroups';

export function useBladeEngine() {
  const engineRef = useRef<BladeEngine | null>(null);
  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);
  const motionSim = useBladeStore((s) => s.motionSim);

  // Track previous ignition/retraction/style to detect changes
  const prevIgnitionRef = useRef(config.ignition);
  const prevRetractionRef = useRef(config.retraction);
  const prevStyleRef = useRef(config.style);

  // Lazy init engine + push parameter clamp ranges for modulation routing.
  // Without these, `applyBindings` falls back to permissive sanitization —
  // which works, but NaN/∞ go to 0 or MAX_VALUE instead of the parameter's
  // declared default/max. Done once at mount; ranges are static for v1.0.
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new BladeEngine();
      const clampRanges = new Map<string, { min: number; max: number; default: number }>(
        PARAMETER_DESCRIPTORS.map((p) => [
          p.path,
          { min: p.range.min, max: p.range.max, default: p.default },
        ]),
      );
      engineRef.current.setParameterClampRanges(clampRanges);
    }
  }, []);

  // ── Always-on engine tick (state sync) ──
  //
  // The 2D BladeCanvas used to own the engine tick loop. That was fine when
  // the 2D canvas was always mounted, but the workbench now conditionally
  // renders 3D view / fullscreen / mobile views that don't mount BladeCanvas.
  // When those views were active, the engine never ticked — ignition /
  // retraction transitions froze mid-state, and `bladeState` in the store
  // went stale (BladeCanvas3D would keep reading the last value written by
  // a previous 2D session).
  //
  // Fix (saber-visibility 2026-04-18): move the engine tick + bladeState
  // sync to `useBladeEngine`. BladeCanvas's render loop now only paints;
  // the engine advances regardless of which view is mounted. Views that
  // read `bladeState` from the store (BladeCanvas3D, CrystalRevealScene,
  // OLEDPreview) now see the engine's real state.
  useEffect(() => {
    let rafId = 0;
    let prevTime = performance.now();
    const tick = (time: number) => {
      const engine = engineRef.current;
      if (engine) {
        const delta = time - prevTime;
        prevTime = time;
        const paused = useUIStore.getState().animationPaused;
        if (!paused) {
          // Read the current config from the store (not from closure) so
          // live updates (e.g. colour changes) are picked up immediately.
          engine.update(delta, useBladeStore.getState().config);
        }
        // Mirror engine state into store. Zustand dedupes identical writes,
        // but we compare explicitly to skip work when state hasn't transitioned.
        const currentState = useBladeStore.getState().bladeState;
        if (engine.state !== currentState) {
          useBladeStore.getState().setBladeState(engine.state);
        }
      } else {
        prevTime = time;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Sync engine topology when store topology changes (e.g. preset load with different ledCount)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const currentPixels = engine.getPixels();
    if (currentPixels.length !== topology.totalLEDs * 3) {
      engine.setTopology(topology);
    }
  }, [topology]);

  // Sync motion simulation targets
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.motion.targetSwing = motionSim.swing / 100;
    engine.motion.targetAngle = (motionSim.angle - 50) / 50;
    engine.motion.targetTwist = (motionSim.twist - 50) / 50;
    engine.motion.autoSwing = motionSim.autoSwing;
    engine.motion.autoDuel = motionSim.autoDuel;
  }, [motionSim]);

  // Auto-replay ignition when ignition or retraction style changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const ignitionChanged = config.ignition !== prevIgnitionRef.current;
    const retractionChanged = config.retraction !== prevRetractionRef.current;

    prevIgnitionRef.current = config.ignition;
    prevRetractionRef.current = config.retraction;
    prevStyleRef.current = config.style;

    // If ignition or retraction style changed while blade is on, replay ignition
    // so the user immediately sees the new animation
    if ((ignitionChanged || retractionChanged) && useBladeStore.getState().isOn) {
      engine.replayIgnition(useBladeStore.getState().config);
    }

    // Style changes are picked up automatically by renderSegment reading config.style,
    // no replay needed — the next frame will use the new style.
  }, [config.ignition, config.retraction, config.style]);

  const ignite = useCallback(() => {
    // Pass the current config so the engine can trigger the PREON
    // pre-state when config.preonEnabled is on.
    engineRef.current?.ignite(useBladeStore.getState().config);
    useBladeStore.getState().setIsOn(true);
    useBladeStore.getState().addEffectLog(`${new Date().toLocaleTimeString()}: IGNITION`);
  }, []);

  const retract = useCallback(() => {
    engineRef.current?.retract();
    useBladeStore.getState().setIsOn(false);
    useBladeStore.getState().addEffectLog(`${new Date().toLocaleTimeString()}: RETRACTION`);
  }, []);

  const toggle = useCallback(() => {
    if (useBladeStore.getState().isOn) retract();
    else ignite();
  }, [ignite, retract]);

  const triggerEffect = useCallback((type: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.triggerEffect(type as EffectType);
    useBladeStore.getState().addEffectLog(`${new Date().toLocaleTimeString()}: ${type.toUpperCase()}`);
  }, []);

  const releaseEffect = useCallback((type: string) => {
    engineRef.current?.releaseEffect(type as EffectType);
  }, []);

  return { engineRef, config, ignite, retract, toggle, triggerEffect, releaseEffect };
}
