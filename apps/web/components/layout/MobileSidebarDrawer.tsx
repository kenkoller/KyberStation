'use client';

// ─── MobileSidebarDrawer — Item H mobile overhaul (2026-04-30) ────────────
//
// Slide-out drawer that wraps the existing <Sidebar> for mobile (<768px).
// Triggered by a hamburger button in the mobile header. The Sidebar
// component is reused unchanged — the drawer is purely a positioning +
// open/close mechanism.
//
// Behavior:
//   · `open` controls visibility. When true, drawer slides in from the
//     left over a backdrop. When false, drawer slides out, backdrop fades.
//   · Clicking the backdrop closes the drawer.
//   · Clicking a sidebar section closes the drawer (mobile UX standard —
//     section selection navigates the user, no need to keep the menu open).
//   · ESC key closes the drawer.
//   · Drawer width is ~280px (matches the desktop sidebar default).
//   · CSS transform-based slide for smooth GPU-accelerated motion.
//
// A11y:
//   · `role="dialog"` + `aria-modal="true"` while open.
//   · `aria-hidden="true"` on the drawer wrapper while closed so screen
//     readers don't surface unreachable nav items.
//   · Focus trap is intentionally lightweight — relies on browser default
//     focus order. Future polish can use useModalDialog.

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from './Sidebar';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH_PX = 280;

export function MobileSidebarDrawer({ open, onClose }: MobileSidebarDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Watch activeSection so we close the drawer whenever the user picks a
  // section. Sidebar.tsx writes activeSection through uiStore — listening
  // here keeps that side of the conversation closed-loop without
  // patching Sidebar's internals.
  const activeSection = useUIStore((s) => s.activeSection);
  const lastSectionRef = useRef(activeSection);
  useEffect(() => {
    if (!open) {
      // Track the section that was active when the drawer was last
      // closed so we don't auto-close on the first open.
      lastSectionRef.current = activeSection;
      return;
    }
    if (activeSection !== lastSectionRef.current) {
      lastSectionRef.current = activeSection;
      onClose();
    }
  }, [activeSection, open, onClose]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Auto-focus the close button on open so keyboard users can tab into
  // the drawer immediately.
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Backdrop — fades in/out, blocks interaction with content underneath
          when drawer is open. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ease-out',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer panel — slides in from the left. */}
      <div
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label="Editor sections menu"
        aria-hidden={open ? undefined : 'true'}
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-bg-secondary border-r border-border-subtle',
          'transition-transform duration-200 ease-out',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ width: DRAWER_WIDTH_PX }}
      >
        {/* Drawer header — title + close button. The close button is
            44×44 to meet the WCAG touch-target floor. */}
        <div className="flex items-center justify-between px-3 h-12 border-b border-border-subtle bg-bg-deep/40 shrink-0">
          <h2 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
            <span className="text-white">KYBER</span>
            <span className="text-accent">STATION</span>
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded-interactive"
          >
            <span className="text-lg leading-none" aria-hidden="true">×</span>
          </button>
        </div>

        {/* Sidebar fills the remaining height. The existing Sidebar
            component already has its own scroll container. */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Sidebar style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </>
  );
}
