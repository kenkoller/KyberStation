'use client';
import { useEffect, useRef } from 'react';

/** Effects that stay active until released (toggle on key press) */
const SUSTAINED_EFFECTS = new Set(['lockup', 'drag', 'melt', 'lightning']);

export function useKeyboardShortcuts(handlers: {
  toggle: () => void;
  triggerEffect: (type: string) => void;
  releaseEffect?: (type: string) => void;
}) {
  // Track which sustained effects are currently active via keyboard
  const activeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      let effectType: string | null = null;
      switch (e.code) {
        case 'Space': e.preventDefault(); handlers.toggle(); return;
        case 'KeyC': effectType = 'clash'; break;
        case 'KeyL': effectType = 'lockup'; break;
        case 'KeyB': effectType = 'blast'; break;
        case 'KeyD': effectType = 'drag'; break;
        case 'KeyM': effectType = 'melt'; break;
        case 'KeyN': effectType = 'lightning'; break;
        case 'KeyS': effectType = 'stab'; break;
        case 'KeyF': effectType = 'force'; break;
        case 'KeyR': effectType = 'fragment'; break;
        case 'KeyV': effectType = 'bifurcate'; break;
        case 'KeyG': effectType = 'ghostEcho'; break;
        case 'KeyP': effectType = 'splinter'; break;
        case 'KeyE': effectType = 'coronary'; break;
        case 'KeyX': effectType = 'glitchMatrix'; break;
        case 'KeyH': effectType = 'siphon'; break;
      }

      if (!effectType) return;

      if (SUSTAINED_EFFECTS.has(effectType)) {
        // Toggle: if active → release, if inactive → trigger
        if (activeRef.current.has(effectType)) {
          activeRef.current.delete(effectType);
          handlers.releaseEffect?.(effectType);
        } else {
          activeRef.current.add(effectType);
          handlers.triggerEffect(effectType);
        }
      } else {
        // One-shot: just trigger
        handlers.triggerEffect(effectType);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
