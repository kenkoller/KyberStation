'use client';
import { useEffect, useRef, useState } from 'react';

export interface DebugLayerCapture {
  name: string;
  description: string;
  canvas: HTMLCanvasElement;
}

interface BladeLayersDebugOverlayProps {
  enabled: boolean;
  captures: DebugLayerCapture[] | null;
  onCapture: () => void;
  onClear: () => void;
}

export function BladeLayersDebugOverlay({
  enabled,
  captures,
  onCapture,
  onClear,
}: BladeLayersDebugOverlayProps) {
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);

  if (!enabled) return null;

  return (
    <>
      {/* Floating capture trigger — always visible when debug mode is on */}
      <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 items-end">
        <button
          onClick={onCapture}
          className="px-3 py-2 rounded-md bg-accent text-bg-deep font-mono text-sm font-semibold shadow-lg hover:bg-accent/90"
          title="Capture each render pass and show on black"
        >
          Capture Layers
        </button>
        {captures && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-md bg-bg-secondary text-text-secondary border border-border-subtle font-mono text-xs hover:text-text-primary"
          >
            Clear ({captures.length})
          </button>
        )}
      </div>

      {/* Grid modal — only when captures are present */}
      {captures && captures.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/95 overflow-auto">
          <div className="sticky top-0 bg-black/90 border-b border-border-subtle px-4 py-3 flex items-center justify-between z-10">
            <div className="font-mono text-text-primary">
              <span className="text-accent font-semibold">Blade render layers</span>{' '}
              <span className="text-text-muted text-sm">
                · {captures.length} passes · click to enlarge
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCapture}
                className="px-3 py-1.5 rounded-md bg-accent text-bg-deep font-mono text-sm font-semibold hover:bg-accent/90"
              >
                Re-capture
              </button>
              <button
                onClick={onClear}
                className="px-3 py-1.5 rounded-md bg-bg-secondary text-text-secondary border border-border-subtle font-mono text-sm hover:text-text-primary"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {captures.map((c, i) => (
              <LayerThumbnail
                key={i}
                capture={c}
                onClick={() => setEnlargedIndex(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Enlarged single layer */}
      {enlargedIndex !== null && captures && captures[enlargedIndex] && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex flex-col"
          onClick={() => setEnlargedIndex(null)}
        >
          <div className="px-4 py-3 border-b border-border-subtle bg-black/90 flex items-center justify-between">
            <div className="font-mono">
              <div className="text-accent font-semibold">{captures[enlargedIndex].name}</div>
              <div className="text-text-muted text-xs">{captures[enlargedIndex].description}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedIndex(null);
              }}
              className="px-3 py-1.5 rounded-md bg-bg-secondary text-text-secondary border border-border-subtle font-mono text-sm"
            >
              Back
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <CanvasMirror canvas={captures[enlargedIndex].canvas} />
          </div>
        </div>
      )}
    </>
  );
}

function LayerThumbnail({
  capture,
  onClick,
}: {
  capture: DebugLayerCapture;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-bg-deep border border-border-subtle rounded-md overflow-hidden hover:border-accent/60 transition-colors"
    >
      <div className="aspect-video bg-black">
        <CanvasMirror canvas={capture.canvas} />
      </div>
      <div className="px-3 py-2">
        <div className="font-mono text-xs text-accent font-semibold truncate">
          {capture.name}
        </div>
        <div className="font-mono text-[11px] text-text-muted leading-snug mt-1 line-clamp-2">
          {capture.description}
        </div>
      </div>
    </button>
  );
}

/**
 * Renders a captured HTMLCanvasElement into a visible <canvas> via drawImage,
 * scaling to fit the container. We can't put the captured canvas into the DOM
 * directly because it's an off-DOM element produced by the render pipeline;
 * we mirror its pixels into a DOM-attached canvas of our own.
 */
function CanvasMirror({ canvas }: { canvas: HTMLCanvasElement }) {
  const mirrorRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mirror = mirrorRef.current;
    const wrap = wrapRef.current;
    if (!mirror || !wrap) return;

    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.floor(rect.width * dpr));
      const targetH = Math.max(1, Math.floor(rect.height * dpr));
      if (mirror.width !== targetW) mirror.width = targetW;
      if (mirror.height !== targetH) mirror.height = targetH;
      const ctx = mirror.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, targetW, targetH);
      const srcAspect = canvas.width / canvas.height;
      const dstAspect = targetW / targetH;
      let drawW = targetW;
      let drawH = targetH;
      if (srcAspect > dstAspect) {
        drawH = targetW / srcAspect;
      } else {
        drawW = targetH * srcAspect;
      }
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offsetX, offsetY, drawW, drawH);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [canvas]);

  return (
    <div ref={wrapRef} className="w-full h-full" style={{ position: 'relative' }}>
      <canvas
        ref={mirrorRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
