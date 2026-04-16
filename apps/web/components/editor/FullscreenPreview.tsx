'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import type { BladeEngine } from '@bladeforge/engine';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';

// ── Effect definitions (mirrors EffectTriggerBar) ──────────────────────────

const EFFECTS = [
  { type: 'clash',     label: 'Clash',  key: 'C', shortKey: 'C' },
  { type: 'blast',     label: 'Blast',  key: 'B', shortKey: 'B' },
  { type: 'stab',      label: 'Stab',   key: 'S', shortKey: 'S' },
  { type: 'lockup',    label: 'Lock',   key: 'L', shortKey: 'L' },
  { type: 'lightning', label: 'Ltng',   key: 'N', shortKey: 'N' },
  { type: 'drag',      label: 'Drag',   key: 'D', shortKey: 'D' },
  { type: 'melt',      label: 'Melt',   key: 'M', shortKey: 'M' },
  { type: 'force',     label: 'Force',  key: 'F', shortKey: 'F' },
];

const HIDE_DELAY_MS = 3000;

// ── Props ──────────────────────────────────────────────────────────────────

interface FullscreenPreviewProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
  onTriggerEffect: (type: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function FullscreenPreview({ engineRef, onTriggerEffect }: FullscreenPreviewProps) {
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const orientation = useUIStore((s) => s.fullscreenOrientation);
  const setOrientation = useUIStore((s) => s.setFullscreenOrientation);
  const isPaused = useUIStore((s) => s.isPaused);
  const isOn = useBladeStore((s) => s.isOn);

  // Overlay visibility (auto-hide after HIDE_DELAY_MS of no movement)
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setOverlayVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setOverlayVisible(false), HIDE_DELAY_MS);
  }, []);

  // Start auto-hide on mount / fullscreen open
  useEffect(() => {
    if (!isFullscreen) return;
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  // Keyboard: Escape exits, orientation toggle with O
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleFullscreen();
        return;
      }
      if (e.key === 'o' || e.key === 'O') {
        setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal');
        return;
      }
      // Effect keyboard shortcuts
      const effect = EFFECTS.find(
        (ef) => ef.shortKey.toLowerCase() === e.key.toLowerCase(),
      );
      if (effect && isOn) {
        onTriggerEffect(effect.type);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen, toggleFullscreen, orientation, setOrientation, isOn, onTriggerEffect]);

  if (!isFullscreen) return null;

  const isVertical = orientation === 'vertical';

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      aria-label="Fullscreen blade preview"
      role="dialog"
      aria-modal="true"
    >
      {/* ── Blade Canvas ─────────────────────────────────────────── */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={
          isVertical
            ? { transform: 'rotate(90deg)', transformOrigin: 'center center' }
            : undefined
        }
      >
        <BladeCanvas
          engineRef={engineRef}
          vertical={false}
          renderMode="photorealistic"
          panelMode
        />
      </div>

      {/* ── Paused indicator ─────────────────────────────────────── */}
      {isPaused && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded border border-amber-500/60 bg-black/70 text-amber-400 text-xs font-mono tracking-widest uppercase pointer-events-none">
          Paused
        </div>
      )}

      {/* ── HUD Overlay ──────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pb-6 pt-4 px-4 transition-opacity duration-500"
        style={{ opacity: overlayVisible ? 1 : 0, pointerEvents: overlayVisible ? 'auto' : 'none' }}
      >
        {/* Scanline accent */}
        <div className="w-full max-w-xl h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-1" />

        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Effect trigger buttons */}
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm border border-cyan-900/50 rounded-lg px-2 py-1.5 shadow-lg shadow-black/60">
            {EFFECTS.map((ef, i) => (
              <button
                key={ef.type}
                onClick={() => onTriggerEffect(ef.type)}
                disabled={!isOn}
                title={`${ef.label} (${ef.shortKey})`}
                aria-label={`Trigger ${ef.label} effect`}
                className={[
                  'relative w-10 h-8 rounded text-[10px] font-bold tracking-wider',
                  'border transition-all duration-100 active:scale-90',
                  i > 0 && i % 3 === 0 ? 'ml-1.5' : '',
                  isOn
                    ? 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300 hover:bg-cyan-800/60 hover:border-cyan-400/70 hover:text-cyan-100 hover:shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                    : 'bg-black/40 border-cyan-900/30 text-cyan-900 cursor-not-allowed',
                ].join(' ')}
              >
                {/* HUD corner accents */}
                <span className="absolute top-0 left-0 w-1 h-1 border-t border-l border-cyan-500/40 rounded-tl" />
                <span className="absolute top-0 right-0 w-1 h-1 border-t border-r border-cyan-500/40 rounded-tr" />
                {ef.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="w-px h-8 bg-cyan-900/50" />

          {/* Orientation toggle */}
          <button
            onClick={() => setOrientation(isVertical ? 'horizontal' : 'vertical')}
            title={`Switch to ${isVertical ? 'horizontal' : 'vertical'} (O)`}
            aria-label="Toggle blade orientation"
            className="w-9 h-8 flex items-center justify-center rounded border border-cyan-700/50 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-800/60 hover:border-cyan-400/70 hover:text-cyan-100 hover:shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-all duration-100 active:scale-90 text-xs font-mono"
          >
            {isVertical ? (
              // Horizontal icon: two horizontal arrows
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="8" x2="14" y2="8" />
                <polyline points="11,5 14,8 11,11" />
                <polyline points="5,5 2,8 5,11" />
              </svg>
            ) : (
              // Vertical icon: two vertical arrows
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="8" y1="2" x2="8" y2="14" />
                <polyline points="5,5 8,2 11,5" />
                <polyline points="5,11 8,14 11,11" />
              </svg>
            )}
          </button>

          {/* Exit fullscreen */}
          <button
            onClick={toggleFullscreen}
            title="Exit fullscreen (Esc)"
            aria-label="Exit fullscreen preview"
            className="w-9 h-8 flex items-center justify-center rounded border border-red-800/60 bg-red-950/50 text-red-400 hover:bg-red-900/60 hover:border-red-500/70 hover:text-red-200 hover:shadow-[0_0_8px_rgba(239,68,68,0.4)] transition-all duration-100 active:scale-90"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-cyan-900 text-[10px] font-mono tracking-widest mt-0.5 select-none">
          ESC · EXIT &nbsp;|&nbsp; O · ROTATE &nbsp;|&nbsp; C B S L N D M F · EFFECTS
        </p>
      </div>
    </div>
  );
}

// ── FullscreenButton ───────────────────────────────────────────────────────
// Small icon button to be placed in toolbar / canvas header.

export function FullscreenButton({ className }: { className?: string }) {
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const isFullscreen = useUIStore((s) => s.isFullscreen);

  return (
    <button
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen blade preview'}
      aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Enter fullscreen blade preview'}
      className={[
        'flex items-center justify-center rounded border transition-all duration-100 active:scale-90',
        isFullscreen
          ? 'border-cyan-400/70 bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/60'
          : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-accent-border hover:text-text-primary hover:bg-accent-dim',
        className ?? 'w-7 h-7',
      ].join(' ')}
    >
      {isFullscreen ? (
        // Compress/exit icon
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
          <polyline points="6,2 6,6 2,6" />
          <polyline points="10,2 10,6 14,6" />
          <polyline points="6,14 6,10 2,10" />
          <polyline points="10,14 10,10 14,10" />
        </svg>
      ) : (
        // Expand/fullscreen icon
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
          <polyline points="2,6 2,2 6,2" />
          <polyline points="10,2 14,2 14,6" />
          <polyline points="14,10 14,14 10,14" />
          <polyline points="6,14 2,14 2,10" />
        </svg>
      )}
    </button>
  );
}
