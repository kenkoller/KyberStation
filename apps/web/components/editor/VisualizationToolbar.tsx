'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  CORE_LAYERS,
  EXTENDED_LAYERS,
  getLayerById,
  type VisualizationLayerId,
} from '@/lib/visualizationTypes';
import { useVisualizationStore } from '@/stores/visualizationStore';

// ─── Layer Toggle Button ───

interface LayerToggleProps {
  id: VisualizationLayerId;
  isVisible: boolean;
  onToggle: (id: VisualizationLayerId) => void;
}

function LayerToggle({ id, isVisible, onToggle }: LayerToggleProps) {
  const layer = getLayerById(id);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const showTooltip = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setTooltipVisible(true), 200);
  }, [clearTimers]);

  const hideTooltip = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setTooltipVisible(false), 100);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!layer) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        onClick={() => onToggle(id)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={`${isVisible ? 'Hide' : 'Show'} ${layer.label} layer`}
        aria-pressed={isVisible}
        className={[
          'relative flex items-center justify-center w-7 h-7 rounded text-ui-xs font-mono font-semibold',
          'border transition-colors duration-100',
          isVisible
            ? 'border-accent-border/60 text-accent bg-accent-dim/30'
            : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
        ].join(' ')}
        style={isVisible ? { boxShadow: `0 0 4px 0 ${layer.color}40` } : undefined}
      >
        {/* Colored dot indicator */}
        <span
          className="absolute top-[3px] right-[3px] w-1 h-1 rounded-full"
          style={{ backgroundColor: isVisible ? layer.color : 'transparent' }}
          aria-hidden="true"
        />
        <span aria-hidden="true">{layer.label.slice(0, 3)}</span>
      </button>

      {/* Tooltip */}
      <div
        role="tooltip"
        className={[
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
          'w-44 p-2 rounded-lg bg-bg-card border border-border-light shadow-xl',
          'transition-all duration-100 ease-out origin-bottom pointer-events-none',
          tooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: layer.color }}
            aria-hidden="true"
          />
          <p className="text-ui-xs font-semibold text-text-primary">{layer.label}</p>
          <span className="ml-auto text-[9px] text-text-muted uppercase tracking-wider">
            {layer.category}
          </span>
        </div>
        <p className="text-ui-xs text-text-secondary leading-relaxed">{layer.description}</p>
      </div>
    </span>
  );
}

// ─── Debug Mode Toggle ───

interface DebugToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

function DebugToggle({ isActive, onToggle }: DebugToggleProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const showTooltip = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setTooltipVisible(true), 200);
  }, [clearTimers]);

  const hideTooltip = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setTooltipVisible(false), 100);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={onToggle}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={isActive ? 'Disable per-pixel debug mode' : 'Enable per-pixel debug mode'}
        aria-pressed={isActive}
        className={[
          'flex items-center justify-center w-7 h-7 rounded text-ui-xs',
          'border transition-colors duration-100',
          isActive
            ? 'border-amber-500/60 text-amber-400 bg-amber-500/10'
            : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
        ].join(' ')}
      >
        {/* Magnifying glass — unicode */}
        <span aria-hidden="true" className="text-[13px] leading-none">{'\u{1F50D}'}</span>
      </button>

      {/* Tooltip */}
      <div
        role="tooltip"
        className={[
          'absolute bottom-full right-0 mb-2 z-50',
          'w-44 p-2 rounded-lg bg-bg-card border border-border-light shadow-xl',
          'transition-all duration-100 ease-out origin-bottom-right pointer-events-none',
          tooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        <p className="text-ui-xs font-semibold text-text-primary mb-0.5">Debug Mode</p>
        <p className="text-ui-xs text-text-secondary leading-relaxed">
          Inspect individual pixel values — hover the blade to see per-pixel RGBL and mA data.
        </p>
      </div>
    </span>
  );
}

// ─── Reset Button ───

interface ResetButtonProps {
  onReset: () => void;
}

function ResetButton({ onReset }: ResetButtonProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const showTooltip = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setTooltipVisible(true), 200);
  }, [clearTimers]);

  const hideTooltip = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setTooltipVisible(false), 100);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={onReset}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label="Reset layers to defaults"
        className="flex items-center justify-center w-7 h-7 rounded text-ui-xs border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors duration-100"
      >
        <span aria-hidden="true" className="text-[11px] leading-none">{'\u21BA'}</span>
      </button>

      <div
        role="tooltip"
        className={[
          'absolute bottom-full right-0 mb-2 z-50',
          'w-36 p-2 rounded-lg bg-bg-card border border-border-light shadow-xl',
          'transition-all duration-100 ease-out origin-bottom-right pointer-events-none',
          tooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        <p className="text-ui-xs text-text-secondary leading-relaxed">
          Reset all layers to default visibility.
        </p>
      </div>
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
        isHorizontal ? 'flex-row gap-0.5' : 'flex-col gap-0.5',
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
          'flex-shrink-0 bg-border-subtle',
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
          'flex-shrink-0 bg-border-subtle',
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
