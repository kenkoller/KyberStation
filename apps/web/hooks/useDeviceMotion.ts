'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface MotionData {
  swingSpeed: number;   // 0-1 normalized
  bladeAngle: number;   // -1 to 1 (tilt forward/back)
  twistAngle: number;   // -1 to 1 (rotation)
  isActive: boolean;
}

interface SensorState {
  // Raw accelerometer
  ax: number;
  ay: number;
  az: number;
  // Raw gyro (rotation rate)
  alpha: number;
  beta: number;
  gamma: number;
  // Smoothed values
  smoothSwing: number;
  smoothAngle: number;
  smoothTwist: number;
}

const SMOOTHING = 0.15; // Lower = smoother, higher = more responsive
const SWING_THRESHOLD = 2; // m/s² minimum to register swing
const SWING_MAX = 40; // m/s² maps to swing = 1.0

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampNeg1to1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export function useDeviceMotion() {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [motionData, setMotionData] = useState<MotionData>({
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    isActive: false,
  });

  const stateRef = useRef<SensorState>({
    ax: 0, ay: 0, az: 0,
    alpha: 0, beta: 0, gamma: 0,
    smoothSwing: 0, smoothAngle: 0, smoothTwist: 0,
  });

  const isListening = useRef(false);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  // Check if DeviceMotion is available + cleanup on unmount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('DeviceMotionEvent' in window)) {
      setPermissionState('unavailable');
    }
    return () => {
      // Cleanup: remove listener on unmount
      if (handlerRef.current) {
        window.removeEventListener('devicemotion', handlerRef.current);
        handlerRef.current = null;
        isListening.current = false;
      }
    };
  }, []);

  // Request permission (iOS requires explicit permission)
  const requestPermission = useCallback(async () => {
    try {
      // iOS 13+ requires permission request
      const DMEvent = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DMEvent.requestPermission === 'function') {
        const result = await DMEvent.requestPermission();
        if (result === 'granted') {
          setPermissionState('granted');
          startListening();
        } else {
          setPermissionState('denied');
        }
      } else {
        // Android / older iOS — permission is implicit
        setPermissionState('granted');
        startListening();
      }
    } catch {
      setPermissionState('denied');
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening.current) return;
    isListening.current = true;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      const rot = event.rotationRate;
      if (!acc || !rot) return;

      const s = stateRef.current;

      // Update raw values
      s.ax = acc.x ?? 0;
      s.ay = acc.y ?? 0;
      s.az = acc.z ?? 0;
      s.alpha = rot.alpha ?? 0;
      s.beta = rot.beta ?? 0;
      s.gamma = rot.gamma ?? 0;

      // Compute swing speed from acceleration magnitude (minus gravity ~9.8)
      const totalAcc = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
      const swingAcc = Math.abs(totalAcc - 9.8); // Remove gravity baseline
      const rawSwing = swingAcc > SWING_THRESHOLD
        ? clamp01((swingAcc - SWING_THRESHOLD) / (SWING_MAX - SWING_THRESHOLD))
        : 0;

      // Blade angle from device tilt (beta = front/back tilt in portrait)
      // Normalize: -90° to 90° maps to -1 to 1
      const rawAngle = clampNeg1to1(s.beta / 90);

      // Twist from gamma (left/right tilt)
      const rawTwist = clampNeg1to1(s.gamma / 90);

      // Smooth
      s.smoothSwing = lerp(s.smoothSwing, rawSwing, SMOOTHING);
      s.smoothAngle = lerp(s.smoothAngle, rawAngle, SMOOTHING);
      s.smoothTwist = lerp(s.smoothTwist, rawTwist, SMOOTHING);

      setMotionData({
        swingSpeed: s.smoothSwing,
        bladeAngle: s.smoothAngle,
        twistAngle: s.smoothTwist,
        isActive: true,
      });
    };

    handlerRef.current = handleMotion;
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      handlerRef.current = null;
      isListening.current = false;
    };
  }, []);

  const stopListening = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener('devicemotion', handlerRef.current);
      handlerRef.current = null;
    }
    isListening.current = false;
    setMotionData(prev => ({ ...prev, isActive: false }));
  }, []);

  return {
    motionData,
    permissionState,
    requestPermission,
    stopListening,
    isSupported: permissionState !== 'unavailable',
  };
}
