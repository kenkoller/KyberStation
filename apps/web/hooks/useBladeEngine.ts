'use client';
import { useRef, useEffect, useCallback } from 'react';
import { BladeEngine } from '@bladeforge/engine';
import type { EffectType } from '@bladeforge/engine';
import { useBladeStore } from '@/stores/bladeStore';

export function useBladeEngine() {
  const engineRef = useRef<BladeEngine | null>(null);
  const config = useBladeStore((s) => s.config);
  const motionSim = useBladeStore((s) => s.motionSim);

  // Lazy init engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new BladeEngine();
    }
  }, []);

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
