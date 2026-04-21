'use client';

/**
 * AnalysisExpandOverlay — full-workbench-width overlay for a single
 * AnalysisRail line-graph layer.
 *
 * Each layer in AnalysisRail has a ↗ expand affordance. Clicking
 * opens this overlay with the layer rendered at the full editor
 * width for forensic inspection (e.g. finding a sub-pixel hue
 * wobble that's invisible at 200px column width).
 *
 * Behavior:
 *   - Portal to document.body so it escapes any ancestor
 *     overflow/z-index.
 *   - Fixed top-left-right-bottom positioning with a translucent
 *     backdrop.
 *   - ESC key + click on the backdrop both close.
 *   - Focus trap via useModalDialog.
 *   - Label + layer color swatch in the header.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/hooks/useModalDialog';
import { LayerCanvas } from '@/components/editor/VisualizationStack';
import { getLayerById, type VisualizationLayerId } from '@/lib/visualizationTypes';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

export interface AnalysisExpandOverlayProps {
  /** Which layer is being inspected; null closes the overlay. */
  layerId: VisualizationLayerId | null;
  /** Engine pixel buffer — same reference the rail consumes. */
  pixels: Uint8Array | null;
  /** LED count — matches the engine's getPixels() shape. */
  pixelCount: number;
  /** Called when the overlay should close (ESC, backdrop, close button). */
  onClose: () => void;
}

export function AnalysisExpandOverlay({
  layerId,
  pixels,
  pixelCount,
  onClose,
}: AnalysisExpandOverlayProps) {
  const isOpen = layerId !== null;
  const { dialogRef } = useModalDialog<HTMLDivElement>({ isOpen, onClose });

  // SSR safety — createPortal needs document to exist.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Container ref so we can observe its size — the overlay's canvas
  // occupies the full visible frame minus the chrome (header +
  // breathing room). A resize observer isn't necessary because the
  // LayerCanvas has its own internal resize observer.
  const frameRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !mounted || !layerId) return null;

  const layer = getLayerById(layerId);

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-stretch"
      style={{
        background: 'rgba(6, 8, 11, 0.80)',
        padding: 24,
        animation: 'fade-in 120ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1))',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-expand-heading"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex flex-col w-full min-h-0"
        style={{
          background: 'rgb(var(--bg-secondary))',
          border: '1px solid rgb(var(--border-light) / 1)',
          borderRadius: 'var(--r-interactive, 4px)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-deep/60"
        >
          <div className="flex items-center gap-2">
            {layer && (
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: layer.color }}
              />
            )}
            <h2
              id="analysis-expand-heading"
              className="font-mono uppercase tracking-[0.12em] text-ui-sm text-accent"
            >
              {layer?.label ?? layerId} · EXPAND
            </h2>
            {layer?.description && (
              <span className="text-ui-xs text-text-muted hidden desktop:inline">
                · {layer.description}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expand overlay"
            className="text-text-muted hover:text-text-primary transition-colors text-ui-sm px-2 py-1 rounded-chrome border border-border-subtle hover:border-border-light"
          >
            Close · ESC
          </button>
        </div>

        {/* ── Body — full-workbench-width canvas frame ── */}
        <div
          ref={frameRef}
          className="flex-1 min-h-0 flex items-center justify-center bg-bg-primary p-4 overflow-hidden"
        >
          {/* The LayerCanvas ResizeObserver paints to the container
              width, so wrapping in a full-width flex box is all we
              need. Use a generous height so the waveform reads. */}
          <div className="w-full" style={{ maxWidth: 2200 }}>
            <LayerCanvas
              layerId={layerId}
              pixels={pixels}
              pixelCount={pixelCount}
              height={220}
              isPaused={isPaused}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
