'use client';

import { useState } from 'react';

/**
 * NEW SABER card — first card in the Gallery marquee.
 *
 * Distinct treatment per the UI Overhaul v2 proposal §5:
 *   - Accent border (rgb(var(--accent))) instead of the neutral
 *     `--border-subtle` used by preset cards.
 *   - "GUIDED BUILD" uppercase eyebrow.
 *   - Large ✦ glyph where the saber silhouette would be on a preset
 *     card — visually anchors the card as an action rather than a
 *     saber preview.
 *   - Static. No engine tick, no hover-to-ignite animation. The point
 *     of visual contrast is "this is different from the others — click
 *     me to create something new."
 *
 * Click opens the existing SaberWizard as a modal (onClick prop fires
 * the parent's wizard-open state).
 *
 * Dimensions match `<MarqueeCard>`: 200px width, ~360px blade area,
 * same rounded-lg border + backdrop-blur card chrome. This keeps the
 * marquee row's vertical rhythm consistent when NEW SABER sits at the
 * head of the grid alongside preset cards.
 */

export interface NewSaberCardProps {
  onClick: () => void;
  /** Per-card stable identifier for data-card-key. */
  cardKey?: string;
}

export function NewSaberCard({ onClick, cardKey }: NewSaberCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Saber Wizard to build a new saber step-by-step"
      data-card-key={cardKey ?? 'new-saber'}
      className="relative shrink-0 flex flex-col gap-3 rounded-lg border-2 bg-bg-card/60 backdrop-blur-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-left cursor-pointer"
      style={{
        width: '200px',
        // Accent border — static 2px vs the 1px + inset-shadow trick
        // MarqueeCard uses on hover. Keeps NEW SABER visually pinned as
        // the guided-build primary without needing hover state.
        borderColor: 'rgb(var(--accent))',
        transition:
          'box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1), background-color 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered
          ? '0 0 48px 2px rgba(var(--accent), 0.42)'
          : '0 0 24px 0 rgba(var(--accent), 0.18)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Ambient accent halo — static, subtle, centred */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 45% 60% at center, rgba(var(--accent), 0.18) 0%, transparent 70%)',
          opacity: isHovered ? 0.9 : 0.55,
          filter: 'blur(18px)',
          transition:
            'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Glyph well — matches the blade area height in MarqueeCard so
          adjacent preset cards line up vertically */}
      <div
        className="relative flex flex-col items-center justify-center w-full pt-5 pb-2"
        style={{ minHeight: '360px' }}
      >
        <div
          aria-hidden="true"
          className="font-cinematic font-bold"
          style={{
            fontSize: '72px',
            lineHeight: 1,
            color: 'rgb(var(--accent))',
            textShadow: '0 0 24px rgba(var(--accent), 0.6)',
          }}
        >
          ✦
        </div>
        <div
          className="mt-4 text-ui-xs font-mono tracking-[0.2em] uppercase"
          style={{ color: 'rgb(var(--accent))' }}
        >
          Guided Build
        </div>
      </div>

      <div className="relative text-center pb-4 px-3">
        <div
          className="font-cinematic text-ui-base font-bold tracking-[0.06em]"
          style={{ color: 'rgb(var(--accent))' }}
        >
          NEW SABER
        </div>
        <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
          3-step guided preset
        </div>
      </div>
    </button>
  );
}
