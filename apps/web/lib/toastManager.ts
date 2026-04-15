// ─── Toast Notification Manager ───────────────────────────────────────────────
// Event-based pub/sub toast system. Zero external dependencies.
// Usage:
//   import { toast } from '@/lib/toastManager';
//   toast.success('Preset saved');
//   toast.error('Export failed');

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms
}

type ToastListener = (toasts: Toast[]) => void;

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4000;

let idCounter = 0;

function uniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `toast-${Date.now()}-${idCounter}`;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Current snapshot of active toasts (defensive copy). */
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  /** Add a toast. Returns its id for programmatic removal. */
  addToast(type: ToastType, message: string, duration?: number): string {
    const id = uniqueId();
    const ms = duration ?? DEFAULT_DURATION;
    const entry: Toast = { id, type, message, duration: ms };

    this.toasts = [...this.toasts, entry];

    // Enforce max-visible limit — evict oldest when exceeded
    while (this.toasts.length > MAX_VISIBLE) {
      const oldest = this.toasts[0];
      this.removeToast(oldest.id);
    }

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      this.removeToast(id);
    }, ms);
    this.timers.set(id, timer);

    this.notify();
    return id;
  }

  /** Manually dismiss a toast by id. */
  removeToast(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const prev = this.toasts;
    this.toasts = this.toasts.filter((t) => t.id !== id);

    // Only notify if something actually changed
    if (this.toasts.length !== prev.length) {
      this.notify();
    }
  }

  /** Remove all active toasts. */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.toasts = [];
    this.notify();
  }

  /** Subscribe to toast list changes. Returns an unsubscribe function. */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Unsubscribe a previously registered listener. */
  unsubscribe(listener: ToastListener): void {
    this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getToasts();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

/** Singleton toast manager instance. */
export const toastManager = new ToastManager();

/** Convenience helpers — import { toast } from '@/lib/toastManager' */
export const toast = {
  info: (message: string, duration?: number) =>
    toastManager.addToast('info', message, duration),
  success: (message: string, duration?: number) =>
    toastManager.addToast('success', message, duration),
  warning: (message: string, duration?: number) =>
    toastManager.addToast('warning', message, duration),
  error: (message: string, duration?: number) =>
    toastManager.addToast('error', message, duration),
};
