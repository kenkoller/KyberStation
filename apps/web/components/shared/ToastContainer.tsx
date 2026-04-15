'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toastManager, type Toast, type ToastType } from '@/lib/toastManager';

// ─── Type-to-color mapping (CSS variable channel values) ──────────────────────

const ACCENT_COLORS: Record<ToastType, string> = {
  info: 'rgb(var(--status-info))',
  success: 'rgb(var(--status-ok))',
  warning: 'rgb(var(--status-warn))',
  error: 'rgb(var(--status-error))',
};

// ─── Individual Toast ─────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  // Progress bar countdown
  useEffect(() => {
    function tick() {
      const now = Date.now();
      setElapsed(now - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    // Allow fade-out to complete before actually removing
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  const progress = Math.max(0, 1 - elapsed / toast.duration);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        toast-comm-enter no-aurebesh material-satin corner-rounded
        relative flex items-start gap-3 w-80 px-3 py-2.5 overflow-hidden
        pointer-events-auto
      `}
      style={{
        background: 'rgb(var(--bg-card))',
        border: '1px solid var(--border-light)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: ACCENT_COLORS[toast.type] }}
      />

      {/* Message */}
      <span
        className="text-ui-sm flex-1 pl-2 pt-px"
        style={{ color: 'rgb(var(--text-primary))' }}
      >
        {toast.message}
      </span>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="
          flex-shrink-0 w-5 h-5 flex items-center justify-center
          rounded hover:bg-white/10 transition-colors
        "
        style={{ color: 'rgb(var(--text-secondary))' }}
        aria-label="Dismiss notification"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute left-0 bottom-0 right-0 h-[2px]" style={{ background: 'transparent' }}>
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: ACCENT_COLORS[toast.type],
            opacity: 0.5,
            transition: 'none',
          }}
        />
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Grab any toasts that already exist
    setToasts(toastManager.getToasts());

    const unsubscribe = toastManager.subscribe((next) => {
      setToasts(next);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = useCallback((id: string) => {
    toastManager.removeToast(id);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
