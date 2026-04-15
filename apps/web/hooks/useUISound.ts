'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  type UISoundId,
  type UISoundPreset,
  type UISoundCategory,
  getUISoundEngine,
} from '../lib/uiSounds';

/**
 * Hook for playing UI sounds from React components.
 *
 * Returns a `play` function and settings controls. The engine is lazy-initialized
 * on first play (respects browser autoplay policy).
 *
 * Usage:
 *   const { play } = useUISound();
 *   <button onClick={() => { play('button-click'); doThing(); }}>
 *
 * Or with pre-bound sound:
 *   const { playClick } = useUISoundPreset('button-click');
 */
export function useUISound() {
  const engineRef = useRef(getUISoundEngine());

  // Refresh engine ref if singleton was recreated
  useEffect(() => {
    engineRef.current = getUISoundEngine();
  }, []);

  const play = useCallback((id: UISoundId) => {
    engineRef.current.play(id);
  }, []);

  const setPreset = useCallback((preset: UISoundPreset) => {
    engineRef.current.setPreset(preset);
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    engineRef.current.setMasterVolume(volume);
  }, []);

  const setCategoryVolume = useCallback(
    (category: UISoundCategory, volume: number) => {
      engineRef.current.setCategoryVolume(category, volume);
    },
    [],
  );

  const setCategoryMuted = useCallback(
    (category: UISoundCategory, muted: boolean) => {
      engineRef.current.setCategoryMuted(category, muted);
    },
    [],
  );

  const getSettings = useCallback(() => {
    return engineRef.current.getSettings();
  }, []);

  return {
    play,
    setPreset,
    setMasterVolume,
    setCategoryVolume,
    setCategoryMuted,
    getSettings,
  };
}

/**
 * Convenience hook that returns a pre-bound play function for a specific sound.
 *
 * Usage:
 *   const playClick = useUISoundEffect('button-click');
 *   <button onClick={playClick}>Click me</button>
 */
export function useUISoundEffect(id: UISoundId): () => void {
  const engineRef = useRef(getUISoundEngine());

  useEffect(() => {
    engineRef.current = getUISoundEngine();
  }, []);

  return useCallback(() => {
    engineRef.current.play(id);
  }, [id]);
}
