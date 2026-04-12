'use client';
import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: {
  toggle: () => void;
  triggerEffect: (type: string) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); handlers.toggle(); break;
        case 'KeyC': handlers.triggerEffect('clash'); break;
        case 'KeyL': handlers.triggerEffect('lockup'); break;
        case 'KeyB': handlers.triggerEffect('blast'); break;
        case 'KeyD': handlers.triggerEffect('drag'); break;
        case 'KeyM': handlers.triggerEffect('melt'); break;
        case 'KeyN': handlers.triggerEffect('lightning'); break;
        case 'KeyS': handlers.triggerEffect('stab'); break;
        case 'KeyF': handlers.triggerEffect('force'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
