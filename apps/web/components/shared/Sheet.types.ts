// ─── Sheet primitive — types ────────────────────────────────────────────
//
// Phase 4 PR #2 (2026-04-30). The full-screen bottom-sheet primitive for
// mobile UI. Slides up from below, dims a backdrop, dismisses on
// backdrop-tap / Escape / swipe-down on the drag handle.
//
// Sized variants:
//   - 'auto' (default): the sheet sizes to its content; capped at ~85vh.
//   - 'half': fixed 50vh. Useful for medium-density bodies.
//   - 'full': 100vh — edge-to-edge, the entire viewport. Used for
//     deep-edit experiences.
//
// Spec: `docs/mobile-implementation-plan.md` § PR #2.
// Design context: `docs/mobile-design.md` § 4.

import type { ReactNode } from 'react';

export type SheetSize = 'auto' | 'half' | 'full';

export interface SheetProps {
  /** Whether the sheet is currently visible. Sheet renders nothing when false. */
  open: boolean;
  /** Called when the user dismisses the sheet (backdrop tap / Escape / swipe-down). */
  onClose: () => void;
  /** Required title rendered in the sheet header; also used as the aria-labelledby target. */
  title: string;
  /** Sheet height variant. Defaults to 'auto'. */
  size?: SheetSize;
  /** Optional sticky bottom-bar slot for action buttons (e.g. Apply / Cancel). */
  footer?: ReactNode;
  /** Sheet body. */
  children?: ReactNode;
  /** Optional override for the title element id — used by the dialog's `aria-labelledby`. */
  ariaLabelledById?: string;
}
