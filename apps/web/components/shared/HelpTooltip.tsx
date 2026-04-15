'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface HelpTooltipProps {
  /** Short explanation of the control */
  text: string;
  /** Optional ProffieOS mapping info (e.g. "Maps to Layers<>") */
  proffie?: string;
  /** Preferred position relative to the trigger icon (auto-flips if clipped) */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ text, proffie, position = 'top' }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [resolvedPos, setResolvedPos] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const show = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setVisible(true), 250);
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

  // Auto-flip position when tooltip clips viewport
  useEffect(() => {
    if (!visible || !tooltipRef.current) { setResolvedPos(position); return; }
    const rect = tooltipRef.current.getBoundingClientRect();
    const pad = 8;
    let next = position;
    if (position === 'top' && rect.top < pad) next = 'bottom';
    else if (position === 'bottom' && rect.bottom > window.innerHeight - pad) next = 'top';
    else if (position === 'left' && rect.left < pad) next = 'right';
    else if (position === 'right' && rect.right > window.innerWidth - pad) next = 'left';
    if (next !== resolvedPos) setResolvedPos(next);
  }, [visible, position, resolvedPos]);

  // Cleanup timers on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const originClasses: Record<string, string> = {
    top: 'origin-bottom',
    bottom: 'origin-top',
    left: 'origin-right',
    right: 'origin-left',
  };

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
      <div
        ref={tooltipRef}
        id="help-tooltip"
        role="tooltip"
        onMouseEnter={() => { clearTimers(); setVisible(true); }}
        onMouseLeave={hide}
        className={`absolute z-50 ${positionClasses[resolvedPos]} w-56 max-w-[75vw] p-2.5 rounded-lg bg-bg-card border border-border-light shadow-xl
          transition-all duration-150 ease-out ${originClasses[resolvedPos]}
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
    </span>
  );
}
