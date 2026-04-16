'use client';
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface HelpTooltipProps {
  /** Short explanation of the control */
  text: string;
  /** Optional ProffieOS mapping info (e.g. "Maps to Layers<>") */
  proffie?: string;
  /** Preferred position relative to the trigger icon (auto-flips if clipped) */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/** Viewport padding — tooltips stay this far from screen edges */
const VP_PAD = 8;

/** Calculate tooltip position in fixed/viewport coordinates, auto-flipping and shifting to stay in view */
function calcTooltipPosition(
  triggerRect: DOMRect,
  tooltipEl: HTMLElement,
  preferred: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number; resolved: 'top' | 'bottom' | 'left' | 'right' } {
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  const gap = 8; // space between trigger and tooltip

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Center of trigger
  const cx = triggerRect.left + triggerRect.width / 2;
  const cy = triggerRect.top + triggerRect.height / 2;

  let resolved = preferred;
  let top = 0;
  let left = 0;

  // Try preferred axis, flip if it overflows
  if (resolved === 'top') {
    top = triggerRect.top - th - gap;
    if (top < VP_PAD) resolved = 'bottom';
  } else if (resolved === 'bottom') {
    top = triggerRect.bottom + gap;
    if (top + th > vh - VP_PAD) resolved = 'top';
  } else if (resolved === 'left') {
    left = triggerRect.left - tw - gap;
    if (left < VP_PAD) resolved = 'right';
  } else if (resolved === 'right') {
    left = triggerRect.right + gap;
    if (left + tw > vw - VP_PAD) resolved = 'left';
  }

  // Compute position based on resolved side
  if (resolved === 'top') {
    top = triggerRect.top - th - gap;
    left = cx - tw / 2;
  } else if (resolved === 'bottom') {
    top = triggerRect.bottom + gap;
    left = cx - tw / 2;
  } else if (resolved === 'left') {
    left = triggerRect.left - tw - gap;
    top = cy - th / 2;
  } else {
    left = triggerRect.right + gap;
    top = cy - th / 2;
  }

  // Clamp so the tooltip never overflows the viewport
  left = Math.max(VP_PAD, Math.min(left, vw - tw - VP_PAD));
  top = Math.max(VP_PAD, Math.min(top, vh - th - VP_PAD));

  return { top, left, resolved };
}

export function HelpTooltip({ text, proffie, position = 'top' }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; resolved: string }>({ top: 0, left: 0, resolved: position });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for client mount so createPortal has a target
  useEffect(() => { setMounted(true); }, []);

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const show = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setVisible(true), 550);
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setVisible(false), 150);
  }, [clearTimers]);

  const toggle = useCallback(() => {
    clearTimers();
    setVisible((v) => !v);
  }, [clearTimers]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        clearTimers();
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, clearTimers]);

  // Position the tooltip in viewport coordinates whenever it becomes visible
  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    setPos(calcTooltipPosition(triggerRect, tooltipRef.current, position));
  }, [visible, position]);

  // Cleanup timers on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const originClasses: Record<string, string> = {
    top: 'origin-bottom',
    bottom: 'origin-top',
    left: 'origin-right',
    right: 'origin-left',
  };

  const tooltipContent = (
    <div
      ref={tooltipRef}
      id="help-tooltip"
      role="tooltip"
      onMouseEnter={() => { clearTimers(); setVisible(true); }}
      onMouseLeave={hide}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      className={`w-56 max-w-[75vw] p-2.5 rounded-lg bg-bg-card border border-border-light shadow-xl
        transition-all duration-150 ease-out ${originClasses[pos.resolved] ?? 'origin-bottom'}
        ${visible
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-95 pointer-events-none'
        }`}
    >
      <p className="text-ui-sm text-text-secondary leading-relaxed">{text}</p>
      {proffie && (
        <p className="mt-1.5 text-ui-xs text-accent/70 font-mono leading-snug border-t border-border-subtle pt-1.5">
          ProffieOS: {proffie}
        </p>
      )}
    </div>
  );

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border focus-visible:text-accent focus-visible:border-accent-border transition-colors text-[10px] font-bold leading-none"
        aria-label="Help"
        aria-describedby={visible ? 'help-tooltip' : undefined}
      >
        ?
      </button>
      {mounted ? createPortal(tooltipContent, document.body) : tooltipContent}
    </span>
  );
}
