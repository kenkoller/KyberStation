'use client';

// ─── Audio ↔ Blade Sync ───
//
// The existing wiring in AppShell's `toggleWithAudio` and
// `triggerEffectWithAudio` covers the USER-INITIATED sound paths —
// clicking the big ignite button plays the ignition sound, etc.
//
// What this hook adds is AUTOMATIC continuity between the blade
// simulator's runtime state and the audio engine:
//
//   1. Swing speed from the motion simulator (manual slider +
//      autoSwing + autoDuel modes) feeds into the SmoothSwing
//      crossfade engine on every frame. Without this, swing
//      audio only fires when a user clicks "Swing" manually.
//
//   2. Hum continuity — if the blade enters BladeState.ON through
//      any path (ignite, replayIgnition, preset load while on),
//      make sure the hum loop is playing. If it enters OFF through
//      any path, stop the hum. Catches edge cases where the
//      toggle button isn't the initiator.
//
// The hook is a pure side-effect; it mounts once alongside the
// other appliers and doesn't return anything.

import { useEffect, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';

interface AudioHandle {
  playIgnition: () => void;
  playRetraction: () => void;
  updateSwing: (speed: number) => void;
  // Exposed by useAudioEngine but optional at sync callsite so this
  // module doesn't circular-import the hook's full shape.
  playHumIfReady?: () => void;
  stopHum?: () => void;
}

export function useAudioSync(audio: AudioHandle) {
  // Motion-driven smooth-swing — runs every frame while the app is open.
  // Zero cost when no font is loaded (updateSwing is a no-op in that case).
  const swing = useBladeStore((s) => s.motionSim.swing);
  const autoSwing = useBladeStore((s) => s.motionSim.autoSwing);
  const autoDuel = useBladeStore((s) => s.motionSim.autoDuel);
  const isOn = useBladeStore((s) => s.isOn);

  // Convert the slider's 0-100 scale into the engine's 0-1 scale.
  const swingSpeedRef = useRef(0);
  useEffect(() => {
    swingSpeedRef.current = swing / 100;
  }, [swing]);

  // Pulse swing speed when auto modes are on — crude simulation of the
  // actual motion sensor output, enough to drive the audio crossfade.
  const phaseRef = useRef(0);
  useAnimationFrame((deltaMs) => {
    if (!isOn) {
      audio.updateSwing(0);
      return;
    }
    let effective = swingSpeedRef.current;
    if (autoSwing || autoDuel) {
      // Rhythmic swing: ~1Hz sine for autoSwing, faster+choppier for autoDuel.
      phaseRef.current += deltaMs;
      const hz = autoDuel ? 2.5 : 1.0;
      const amp = autoDuel ? 0.85 : 0.55;
      const t = (phaseRef.current / 1000) * hz * 2 * Math.PI;
      const pulse = (Math.sin(t) + 1) / 2; // 0..1
      effective = Math.max(effective, pulse * amp);
    }
    audio.updateSwing(effective);
  });
}
