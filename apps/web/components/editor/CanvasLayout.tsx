'use client';
import { useRef } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useUIStore } from '@/stores/uiStore';
import { BladeCanvas } from './BladeCanvas';
import { PixelStripPanel } from './PixelStripPanel';
import { RGBGraphPanel } from './RGBGraphPanel';

interface CanvasLayoutProps {
  engineRef: React.MutableRefObject<BladeEngine | null>;
}

/**
 * CanvasLayout — vertically stacked full-width visualization panels.
 *
 * Renders:
 *   1. Blade canvas — horizontal, full width (hilt left, tip right)
 *   2. Pixel strip — horizontal, full width
 *   3. RGB graph — horizontal, full width
 *
 * All panels span the entire workbench width. The blade always renders
 * horizontally (left-to-right) in the desktop workbench layout.
 */
export function CanvasLayout({ engineRef }: CanvasLayoutProps) {
  const showBladePanel = useUIStore((s) => s.showBladePanel);
  const showPixelPanel = useUIStore((s) => s.showPixelPanel);
  const showGraphPanel = useUIStore((s) => s.showGraphPanel);
  const showHilt = useUIStore((s) => s.showHilt);
  const toggleBladePanel = useUIStore((s) => s.toggleBladePanel);
  const togglePixelPanel = useUIStore((s) => s.togglePixelPanel);
  const toggleGraphPanel = useUIStore((s) => s.toggleGraphPanel);
  const toggleShowHilt = useUIStore((s) => s.toggleShowHilt);
  const animationPaused = useUIStore((s) => s.animationPaused);
  const toggleAnimationPaused = useUIStore((s) => s.toggleAnimationPaused);

  const containerRef = useRef<HTMLDivElement>(null);

  const visiblePanels = [showBladePanel, showPixelPanel, showGraphPanel].filter(Boolean).length;

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full gap-0 overflow-hidden rounded-panel border border-border-subtle">
      {/* ── Blade Panel — full width, horizontal ── */}
      {showBladePanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative flex-1">
          <PanelHeader
            title="Blade Preview"
            onToggle={toggleBladePanel}
          >
            <button
              onClick={toggleAnimationPaused}
              className={`text-ui-xs px-1.5 py-0.5 rounded transition-colors ${
                animationPaused
                  ? 'text-yellow-400 bg-yellow-900/20'
                  : 'text-text-muted/40 hover:text-text-muted'
              }`}
              aria-label={animationPaused ? 'Resume animation' : 'Pause animation'}
              title={animationPaused ? 'Resume' : 'Pause'}
            >
              {animationPaused ? 'Paused' : 'Pause'}
            </button>
            <button
              onClick={toggleShowHilt}
              className={`text-ui-xs px-1.5 py-0.5 rounded transition-colors ${
                showHilt
                  ? 'text-accent/70 bg-accent/10'
                  : 'text-text-muted/40 hover:text-text-muted'
              }`}
              aria-label={showHilt ? 'Hide hilt' : 'Show hilt'}
              title={showHilt ? 'Hide hilt' : 'Show hilt'}
            >
              Hilt
            </button>
          </PanelHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <BladeCanvas engineRef={engineRef} vertical={false} renderMode="photorealistic" panelMode />
          </div>
        </div>
      )}

      {/* ── Pixel Strip Panel — horizontal, full width ── */}
      {showPixelPanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative shrink-0" style={{ height: 36 }}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PixelStripPanel engineRef={engineRef} />
          </div>
        </div>
      )}

      {/* ── RGB Graph Panel — horizontal, full width ── */}
      {showGraphPanel && (
        <div className="flex flex-col min-h-0 overflow-hidden relative shrink-0" style={{ height: 90 }}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <RGBGraphPanel engineRef={engineRef} />
          </div>
        </div>
      )}

      {/* Show hidden panels indicator when panels are hidden */}
      {visiblePanels < 3 && (
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          {!showBladePanel && (
            <button onClick={toggleBladePanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + Blade
            </button>
          )}
          {!showPixelPanel && (
            <button onClick={togglePixelPanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + Pixel
            </button>
          )}
          {!showGraphPanel && (
            <button onClick={toggleGraphPanel} className="text-ui-xs bg-bg-deep/80 border border-border-subtle rounded px-1.5 py-0.5 text-text-muted hover:text-accent transition-colors">
              + RGB
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function PanelHeader({
  title,
  onToggle,
  children,
}: {
  title: string;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary/80 border-b border-border-subtle shrink-0">
      <span className="text-ui-xs text-text-muted uppercase tracking-wider font-medium select-none">
        {title}
      </span>
      <div className="flex items-center gap-1">
        {children}
        <button
          onClick={onToggle}
          className="text-ui-xs text-text-muted/50 hover:text-text-muted transition-colors px-1"
          aria-label={`Hide ${title} panel`}
          title={`Hide ${title}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
