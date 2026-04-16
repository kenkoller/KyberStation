'use client';

/**
 * ToastContainer — Global notification overlay for KyberStation.
 *
 * Mount once at the app root (editor/page.tsx). Toasts are pushed via the
 * `toast()` convenience function (or the lower-level `toastManager` API) from
 * anywhere in the codebase — no React context required.
 *
 * Usage:
 *   import { toast } from '@/components/layout/ToastContainer';
 *   toast('Preset saved', 'success');
 *   toast('Export failed', 'error', 6000);
 *
 * The component subscribes to @/lib/toastManager and renders toasts stacked
 * from the bottom-right corner, with slide-in entrance and fade-out exit.
 */

// Re-export the rendering component from shared/
export { default } from '@/components/shared/ToastContainer';

// ─── Convenience function ──────────────────────────────────────────────────────
// Provides the single-call `toast(message, type?, duration?)` API requested
// alongside the richer `toastManager.{info,success,warning,error}()` API.

import { toastManager, type ToastType } from '@/lib/toastManager';

/**
 * Show a toast notification from anywhere in the app.
 *
 * @param message  Text to display.
 * @param type     Visual style — 'info' | 'success' | 'warning' | 'error'. Default: 'info'.
 * @param duration Auto-dismiss delay in ms. Default: 4000.
 * @returns        The toast id (for programmatic early dismissal via toastManager.removeToast).
 */
export function toast(
  message: string,
  type: ToastType = 'info',
  duration?: number,
): string {
  return toastManager.addToast(type, message, duration);
}
