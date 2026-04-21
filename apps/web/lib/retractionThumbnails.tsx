// ─── Retraction thumbnail registry ──────────────────────────────────────────
//
// Static SVG thumbnails keyed by retraction id. Mirrors ignitionThumbnails
// shape; direction cues are reversed (hilt end bright, tip fading) to
// signal "coming home" rather than "extending out."

import type { ReactNode } from 'react';

export interface RetractionThumbnailEntry {
  thumbnail: ReactNode;
  label: string;
}

const ACCENT = 'rgb(var(--accent))';
const ACCENT_DIM = 'rgb(var(--accent) / 0.4)';
const ACCENT_FAINT = 'rgb(var(--accent) / 0.15)';
const BLADE_Y = 30;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 60"
      width="100"
      height="60"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Plain accent arrow pointing left. Fallback for unregistered ids. */
export const DEFAULT_RETRACTION_THUMBNAIL: RetractionThumbnailEntry = {
  label: 'Retraction',
  thumbnail: (
    <Svg>
      <line x1="20" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <path d="M 22 22 L 8 30 L 22 38 Z" fill={ACCENT} />
    </Svg>
  ),
};

export const RETRACTION_THUMBNAILS: Record<string, RetractionThumbnailEntry> = {
  standard: {
    label: 'Standard',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="6" strokeLinecap="round" />
        <line x1="8" y1={BLADE_Y} x2="40" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  scroll: {
    label: 'Scroll',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="ret-scroll-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={ACCENT_FAINT} />
            <stop offset="1" stopColor={ACCENT} />
          </linearGradient>
        </defs>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="url(#ret-scroll-grad)" strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  fadeout: {
    label: 'Fade Out',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="ret-fade-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={ACCENT} stopOpacity="1" />
            <stop offset="0.5" stopColor={ACCENT} stopOpacity="0.5" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="url(#ret-fade-grad)" strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  center: {
    label: 'Center In',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="40" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <line x1="60" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <path d="M 38 22 L 46 30 L 38 38 Z" fill={ACCENT_DIM} />
        <path d="M 62 22 L 54 30 L 62 38 Z" fill={ACCENT_DIM} />
      </Svg>
    ),
  },

  shatter: {
    label: 'Shatter',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="32" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <circle cx="44" cy="24" r="2" fill={ACCENT} opacity="0.8" />
        <circle cx="56" cy="38" r="2.5" fill={ACCENT} opacity="0.7" />
        <circle cx="68" cy="22" r="2" fill={ACCENT} opacity="0.5" />
        <circle cx="78" cy="36" r="1.5" fill={ACCENT} opacity="0.4" />
        <circle cx="88" cy="28" r="1.5" fill={ACCENT} opacity="0.3" />
      </Svg>
    ),
  },

  dissolve: {
    label: 'Dissolve',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="28" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <line x1="36" y1={BLADE_Y} x2="42" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <line x1="50" y1={BLADE_Y} x2="54" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.4" />
        <line x1="64" y1={BLADE_Y} x2="68" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.25" />
        <line x1="80" y1={BLADE_Y} x2="84" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.15" />
      </Svg>
    ),
  },

  'flicker-out': {
    label: 'Flicker Out',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="3" />
        <line x1="60" y1={BLADE_Y} x2="68" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <line x1="72" y1={BLADE_Y} x2="76" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <line x1="82" y1={BLADE_Y} x2="86" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      </Svg>
    ),
  },

  unravel: {
    label: 'Unravel',
    thumbnail: (
      <Svg>
        <path d="M 8 30 Q 18 22 28 30 Q 38 38 48 30 Q 58 22 68 30 Q 78 38 92 30" stroke={ACCENT} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="92" cy={BLADE_Y} r="2.5" fill={ACCENT} />
      </Svg>
    ),
  },

  drain: {
    label: 'Drain',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <line x1="8" y1={BLADE_Y} x2="35" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="35" cy={BLADE_Y} rx="4" ry="8" fill={ACCENT} opacity="0.7" />
        <circle cx="44" cy="42" r="2" fill={ACCENT} opacity="0.5" />
        <circle cx="52" cy="46" r="1.5" fill={ACCENT} opacity="0.35" />
      </Svg>
    ),
  },

  implode: {
    label: 'Implode',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <circle cx="50" cy={BLADE_Y} r="12" fill="none" stroke={ACCENT_DIM} strokeWidth="2" />
        <circle cx="50" cy={BLADE_Y} r="7" fill="none" stroke={ACCENT} strokeWidth="2" />
        <circle cx="50" cy={BLADE_Y} r="3" fill={ACCENT} />
      </Svg>
    ),
  },

  evaporate: {
    label: 'Evaporate',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <circle cx="20" cy="22" r="1.5" fill={ACCENT} opacity="0.8" />
        <circle cx="28" cy="16" r="1" fill={ACCENT} opacity="0.6" />
        <circle cx="42" cy="20" r="1.5" fill={ACCENT} opacity="0.5" />
        <circle cx="54" cy="14" r="1" fill={ACCENT} opacity="0.4" />
        <circle cx="68" cy="18" r="1.5" fill={ACCENT} opacity="0.3" />
        <circle cx="82" cy="12" r="1" fill={ACCENT} opacity="0.2" />
        <line x1="8" y1={BLADE_Y} x2="30" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      </Svg>
    ),
  },

  spaghettify: {
    label: 'Spaghettify',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="24" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <path d="M 24 30 Q 40 30 56 30 Q 72 30 88 30" stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 86 26 Q 90 30 86 34" stroke={ACCENT} strokeWidth="1.5" fill="none" />
      </Svg>
    ),
  },

  'custom-curve': {
    label: 'Custom Curve',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <path d="M 90 46 C 70 46, 60 14, 10 14" stroke={ACCENT} strokeWidth="2.5" fill="none" />
        <circle cx="70" cy="46" r="2" fill={ACCENT} />
        <circle cx="30" cy="14" r="2" fill={ACCENT} />
      </Svg>
    ),
  },
};

/** Resolve a retraction id to its thumbnail + label, falling back to the default. */
export function getRetractionThumbnail(id: string): RetractionThumbnailEntry {
  return RETRACTION_THUMBNAILS[id] ?? DEFAULT_RETRACTION_THUMBNAIL;
}
