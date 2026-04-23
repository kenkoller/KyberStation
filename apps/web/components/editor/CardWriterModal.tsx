'use client';

/**
 * CardWriterModal — thin wrapper around the existing <CardWriter> panel
 * body rendered as a centered modal dialog.
 *
 * The persistent Delivery rail (OV4) surfaces EXPORT at the bottom of
 * every tab. Clicking that segment opens this modal. The existing
 * `<CardWriter>` component stays alive as a panel-renderable consumer
 * (the editor Output tab may still host it via layoutStore); this
 * modal is a second mount point triggered by the rail.
 *
 * Behavior:
 *   - Centered portal dialog, ~960px wide, max 85vh.
 *   - ESC closes, click-backdrop closes, focus trap via useModalDialog.
 *   - Body scrolls internally when CardWriter's state exceeds 85vh.
 *   - Header shows "Export to SD Card" + a close button.
 *   - Renders nothing while `isOpen` is false (no hidden DOM).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '@/hooks/useModalDialog';
import { CardWriter } from '@/components/editor/CardWriter';

export interface CardWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CardWriterModal({ isOpen, onClose }: CardWriterModalProps) {
  const { dialogRef } = useModalDialog<HTMLDivElement>({ isOpen, onClose });

  // SSR safety — createPortal(..., document.body) needs a client-side
  // mount. Matches the CommandPalette + HelpTooltip pattern.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
      style={{
        background: 'rgba(6, 8, 11, 0.72)',
        paddingTop: '8vh',
        paddingBottom: '8vh',
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
        aria-labelledby="cardwriter-modal-heading"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 960,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: '84vh',
          background: 'rgb(var(--bg-secondary))',
          border: '1px solid rgb(var(--border-light) / 1)',
          borderRadius: 'var(--r-interactive, 4px)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-deep/60"
        >
          <h2
            id="cardwriter-modal-heading"
            className="font-mono uppercase tracking-[0.12em] text-ui-sm text-accent"
          >
            Export to SD Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="text-text-muted hover:text-text-primary transition-colors text-ui-sm px-2 py-1 rounded-chrome border border-border-subtle hover:border-border-light"
          >
            Close · ESC
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4">
          <CardWriter />
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
