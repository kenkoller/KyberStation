'use client';

import { useState } from 'react';

/**
 * SURPRISE ME card — second card in the Gallery marquee.
 *
 * Neutral treatment per the UI Overhaul v2 proposal §5:
 *   - `--border-subtle` border (no accent wash) so NEW SABER stays the
 *     visual primary. Hover tightens the border slightly and warms the
 *     dice glyph but doesn't promote the card to accent status.
 *   - 🎲 glyph where the saber silhouette would be on a preset card.
 *   - Subtitle "Random archetype + style + color".
 *
 * Click fires the parent's onClick, which should:
 *   1. Run `useSurpriseMe().surprise()` (or equivalent randomizer
 *      helper from `components/editor/Randomizer.tsx`).
 *   2. Switch the active tab to 'design' so the user lands on the
 *      edit canvas with their new random saber already showing.
 *
 * Dimensions match `<MarqueeCard>`: 200px width, ~360px glyph area,
 * same rounded-lg border chrome. Keeps the grid rhythm consistent.
 */

export interface SurpriseMeCardProps {
  onClick: () => void;
  /** Per-card stable identifier for data-card-key. */
  cardKey?: string;
}

export function SurpriseMeCard({ onClick, cardKey }: SurpriseMeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Create a random saber and open it in the editor"
      data-card-key={cardKey ?? 'surprise-me'}
      className="relative shrink-0 flex flex-col gap-3 rounded-lg border bg-bg-card/60 backdrop-blur-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-left cursor-pointer"
      style={{
        width: '200px',
        borderColor: isHovered
          ? 'rgb(var(--border-light))'
          : 'rgb(var(--border-subtle))',
        transition:
          'border-color 400ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered
          ? 'inset 0 0 0 1px rgb(var(--border-light)), 0 0 32px 0 rgba(255, 255, 255, 0.05)'
          : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Ambient neutral glow — very faint on hover only */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 45% 60% at center, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
          opacity: isHovered ? 0.8 : 0.3,
          filter: 'blur(24px)',
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
          className="select-none"
          style={{
            fontSize: '96px',
            lineHeight: 1,
            // Grayscale dice glyph by default; small rotation / color
            // shift on hover keeps the "roll the dice" affordance alive
            // without hijacking the card's neutral treatment.
            filter: isHovered ? 'none' : 'grayscale(0.65) brightness(0.8)',
            transform: isHovered ? 'rotate(-8deg)' : 'rotate(0deg)',
            transition:
              'filter 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          🎲
        </div>
      </div>

      <div className="relative text-center pb-4 px-3">
        <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary">
          SURPRISE ME
        </div>
        <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
          Random archetype + style + color
        </div>
      </div>
    </button>
  );
}
