'use client';
import { useRef, useEffect, useCallback } from 'react';
import { BladeEngine } from '@bladeforge/engine';
import type { EffectType } from '@bladeforge/engine';
import { useBladeStore } from '@/stores/bladeStore';

export function useBladeEngine() {
  const engineRef = useRef<BladeEngine | null>(null);
  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);
  const motionSim = useBladeStore((s) => s.motionSim);

  // Track previous ignition/retraction/style to detect changes
  const prevIgnitionRef = useRef(config.ignition);
  const prevRetractionRef = useRef(config.retraction);
  const prevStyleRef = useRef(config.style);

  // Lazy init engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new BladeEngine();
    }
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
      engine.replayIgnition();
    }

    // Style changes are picked up automatically by renderSegment reading config.style,
    // no replay needed — the next frame will use the new style.
  }, [config.ignition, config.retraction, config.style]);

  const ignite = useCallback(() => {
    engineRef.current?.ignite();
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
