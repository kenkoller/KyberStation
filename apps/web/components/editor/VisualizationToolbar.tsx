'use client';

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CORE_LAYERS,
  EXTENDED_LAYERS,
  getLayerById,
  type VisualizationLayerId,
} from '@/lib/visualizationTypes';
import { useVisualizationStore } from '@/stores/visualizationStore';

// ─── Shared tooltip positioning ───

const VP_PAD = 8;

function calcFixedTooltipPos(
  triggerRect: DOMRect,
  tooltipEl: HTMLElement,
  preferred: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number; resolved: 'top' | 'bottom' | 'left' | 'right' } {
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = triggerRect.left + triggerRect.width / 2;
  const cy = triggerRect.top + triggerRect.height / 2;

  let resolved = preferred;
  let top = 0;
  let left = 0;

  if (resolved === 'top' && triggerRect.top - th - gap < VP_PAD) resolved = 'bottom';
  else if (resolved === 'bottom' && triggerRect.bottom + gap + th > vh - VP_PAD) resolved = 'top';
  else if (resolved === 'left' && triggerRect.left - tw - gap < VP_PAD) resolved = 'right';
  else if (resolved === 'right' && triggerRect.right + gap + tw > vw - VP_PAD) resolved = 'left';

  if (resolved === 'top') { top = triggerRect.top - th - gap; left = cx - tw / 2; }
  else if (resolved === 'bottom') { top = triggerRect.bottom + gap; left = cx - tw / 2; }
  else if (resolved === 'left') { left = triggerRect.left - tw - gap; top = cy - th / 2; }
  else { left = triggerRect.right + gap; top = cy - th / 2; }

  left = Math.max(VP_PAD, Math.min(left, vw - tw - VP_PAD));
  top = Math.max(VP_PAD, Math.min(top, vh - th - VP_PAD));

  return { top, left, resolved };
}

/** Shared hook for tooltip show/hide timers */
function useTooltipTimers(delay = 550) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const show = useCallback(() => {
    clear();
    showTimer.current = setTimeout(() => setVisible(true), delay);
  }, [clear, delay]);

  const hide = useCallback(() => {
    clear();
    hideTimer.current = setTimeout(() => setVisible(false), 150);
  }, [clear]);

  const keepOpen = useCallback(() => {
    clear();
    setVisible(true);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { visible, show, hide, clear, keepOpen };
}

// ─── Portal Tooltip Wrapper ───

interface PortalTooltipProps {
  visible: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  preferred: 'top' | 'bottom' | 'left' | 'right';
  width?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

function PortalTooltip({ visible, triggerRef, preferred, width = 'w-44', onMouseEnter, onMouseLeave, children }: PortalTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, resolved: preferred as string });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    setPos(calcFixedTooltipPos(triggerRect, tooltipRef.current, preferred));
  }, [visible, preferred, triggerRef]);

  const originMap: Record<string, string> = {
    top: 'origin-bottom', bottom: 'origin-top', left: 'origin-right', right: 'origin-left',
  };

  const el = (
    <div
      ref={tooltipRef}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
      className={[
        width, 'p-2 rounded-lg bg-bg-card border border-border-light shadow-xl',
        'transition-all duration-100 ease-out',
        originMap[pos.resolved] ?? 'origin-bottom',
        visible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
      ].join(' ')}
    >
      {children}
    </div>
  );

  return mounted ? createPortal(el, document.body) : el;
}

// ─── Layer Toggle Button ───

interface LayerToggleProps {
  id: VisualizationLayerId;
  isVisible: boolean;
  onToggle: (id: VisualizationLayerId) => void;
}

function LayerToggle({ id, isVisible, onToggle }: LayerToggleProps) {
  const layer = getLayerById(id);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { visible: tooltipVisible, show, hide, keepOpen } = useTooltipTimers();

  if (!layer) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        onClick={() => onToggle(id)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={`${isVisible ? 'Hide' : 'Show'} ${layer.label} layer`}
        aria-pressed={isVisible}
        className={[
          'relative flex items-center justify-center w-8 h-8 rounded-md text-ui-xs font-mono font-semibold',
          'border transition-colors duration-100',
          isVisible
            ? 'border-accent-border/60 text-accent bg-accent-dim/30'
            : 'border-border-light/60 text-text-muted bg-[rgba(255,255,255,0.03)] hover:text-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:border-border-light',
        ].join(' ')}
        style={isVisible ? { boxShadow: `0 0 6px 0 ${layer.color}50` } : undefined}
      >
        {/* Colored dot indicator */}
        <span
          className="absolute top-[3px] right-[3px] w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: isVisible ? layer.color : 'transparent' }}
          aria-hidden="true"
        />
        <span aria-hidden="true">{layer.label.slice(0, 3)}</span>
      </button>

      <PortalTooltip
        visible={tooltipVisible}
        triggerRef={buttonRef}
        preferred="right"
        onMouseEnter={keepOpen}
        onMouseLeave={hide}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: layer.color }}
            aria-hidden="true"
          />
          <p className="text-ui-xs font-semibold text-text-primary">{layer.label}</p>
          <span className="ml-auto text-ui-xs text-text-muted uppercase tracking-wider">
            {layer.category}
          </span>
        </div>
        <p className="text-ui-xs text-text-secondary leading-relaxed">{layer.description}</p>
      </PortalTooltip>
    </span>
  );
}

// ─── Debug Mode Toggle ───

interface DebugToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

function DebugToggle({ isActive, onToggle }: DebugToggleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { visible: tooltipVisible, show, hide, keepOpen } = useTooltipTimers();

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        onClick={onToggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={isActive ? 'Disable per-pixel debug mode' : 'Enable per-pixel debug mode'}
        aria-pressed={isActive}
        className={[
          'flex items-center justify-center w-8 h-8 rounded-md text-ui-xs',
          'border transition-colors duration-100',
          isActive
            ? 'border-amber-500/60 text-amber-400 bg-amber-500/10'
            : 'border-border-light/60 text-text-muted bg-[rgba(255,255,255,0.03)] hover:text-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:border-border-light',
        ].join(' ')}
      >
        {/* Magnifying glass — unicode */}
        <span aria-hidden="true" className="text-[13px] leading-none">{'\u{1F50D}'}</span>
      </button>

      <PortalTooltip
        visible={tooltipVisible}
        triggerRef={buttonRef}
        preferred="right"
        onMouseEnter={keepOpen}
        onMouseLeave={hide}
      >
        <p className="text-ui-xs font-semibold text-text-primary mb-0.5">Debug Mode</p>
        <p className="text-ui-xs text-text-secondary leading-relaxed">
          Inspect individual pixel values — hover the blade to see per-pixel RGBL and mA data.
        </p>
      </PortalTooltip>
    </span>
  );
}

// ─── Reset Button ───

interface ResetButtonProps {
  onReset: () => void;
}

function ResetButton({ onReset }: ResetButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { visible: tooltipVisible, show, hide, keepOpen } = useTooltipTimers();

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        onClick={onReset}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label="Reset layers to defaults"
        className={[
          'flex items-center justify-center w-8 h-8 rounded-md text-ui-xs',
          'border border-border-light/60 text-text-muted bg-[rgba(255,255,255,0.03)]',
          'hover:text-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:border-border-light',
          'transition-colors duration-100',
        ].join(' ')}
      >
        <span aria-hidden="true" className="text-[11px] leading-none">{'\u21BA'}</span>
      </button>

      <PortalTooltip
        visible={tooltipVisible}
        triggerRef={buttonRef}
        preferred="right"
        width="w-36"
        onMouseEnter={keepOpen}
        onMouseLeave={hide}
      >
        <p className="text-ui-xs text-text-secondary leading-relaxed">
          Reset all layers to default visibility.
        </p>
      </PortalTooltip>
    </span>
  );
}

// ─── Main Toolbar ───

export interface VisualizationToolbarProps {
  /** Additional CSS classes for positioning/layout */
  className?: string;
  /** Orientation of the toolbar — horizontal row or vertical column */
  orientation?: 'horizontal' | 'vertical';
}

export function VisualizationToolbar({
  className = '',
  orientation = 'horizontal',
}: VisualizationToolbarProps) {
  const visibleLayers = useVisualizationStore((s) => s.visibleLayers);
  const isDebugMode = useVisualizationStore((s) => s.isDebugMode);
  const toggleLayer = useVisualizationStore((s) => s.toggleLayer);
  const toggleDebugMode = useVisualizationStore((s) => s.toggleDebugMode);
  const resetToDefaults = useVisualizationStore((s) => s.resetToDefaults);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={[
        'flex items-center select-none',
        /* Background panel — gives the toggles a visible container */
        'rounded-lg bg-[rgba(10,10,16,0.85)] border border-border-light/40',
        isHorizontal ? 'flex-row gap-0.5 px-1.5 py-1' : 'flex-col gap-0.5 px-1 py-1.5',
        className,
      ].join(' ')}
      aria-label="Visualization layer controls"
    >
      {/* ── Core layers group ── */}
      <div
        className={[
          'flex items-center gap-0.5',
          isHorizontal ? 'flex-row' : 'flex-col',
        ].join(' ')}
        role="group"
        aria-label="Core layers"
      >
        {CORE_LAYERS.map((layer) => (
          <LayerToggle
            key={layer.id}
            id={layer.id}
            isVisible={visibleLayers.has(layer.id)}
            onToggle={toggleLayer}
          />
        ))}
      </div>

      {/* ── Divider ── */}
      <div
        aria-hidden="true"
        className={[
          'flex-shrink-0 bg-border-light/40',
          isHorizontal ? 'w-px h-5 mx-1' : 'h-px w-5 my-1',
        ].join(' ')}
      />

      {/* ── Extended layers group ── */}
      <div
        className={[
          'flex items-center gap-0.5',
          isHorizontal ? 'flex-row' : 'flex-col',
        ].join(' ')}
        role="group"
        aria-label="Extended layers"
      >
        {EXTENDED_LAYERS.map((layer) => (
          <LayerToggle
            key={layer.id}
            id={layer.id}
            isVisible={visibleLayers.has(layer.id)}
            onToggle={toggleLayer}
          />
        ))}
      </div>

      {/* ── Right-side controls ── */}
      <div
        aria-hidden="true"
        className={[
          'flex-shrink-0 bg-border-light/40',
          isHorizontal ? 'w-px h-5 mx-1' : 'h-px w-5 my-1',
        ].join(' ')}
      />

      <div
        className={[
          'flex items-center gap-0.5',
          isHorizontal ? 'flex-row' : 'flex-col',
        ].join(' ')}
      >
        <DebugToggle isActive={isDebugMode} onToggle={toggleDebugMode} />
        <ResetButton onReset={resetToDefaults} />
      </div>
    </div>
  );
}
