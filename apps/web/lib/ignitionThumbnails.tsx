// ─── Ignition thumbnail registry ────────────────────────────────────────────
//
// Static SVG thumbnails keyed by ignition id. Used by MiniGalleryPicker in
// EffectPanel + IgnitionRetractionPanel. Each thumbnail hints at the
// ignition's direction / character via shape alone (no motion): fills,
// gradients, partial blades, cracks, spark points.
//
// Constraints mirror styleThumbnails.tsx:
//   - 100×60 viewBox, accent CSS tokens only
//   - Each thumbnail < 30 lines
//   - `DEFAULT_IGNITION_THUMBNAIL` fallback for unregistered ids

import type { ReactNode } from 'react';

export interface IgnitionThumbnailEntry {
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

/** Plain accent arrow pointing right. Fallback for unregistered ids. */
export const DEFAULT_IGNITION_THUMBNAIL: IgnitionThumbnailEntry = {
  label: 'Ignition',
  thumbnail: (
    <Svg>
      <line x1="8" y1={BLADE_Y} x2="80" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <path d="M 78 22 L 92 30 L 78 38 Z" fill={ACCENT} />
    </Svg>
  ),
};

export const IGNITION_THUMBNAILS: Record<string, IgnitionThumbnailEntry> = {
  standard: {
    label: 'Standard',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="6" strokeLinecap="round" />
        <line x1="8" y1={BLADE_Y} x2="60" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  scroll: {
    label: 'Scroll',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="ign-scroll-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={ACCENT} />
            <stop offset="1" stopColor={ACCENT_FAINT} />
          </linearGradient>
        </defs>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="url(#ign-scroll-grad)" strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  spark: {
    label: 'Spark',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="55" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <circle cx="58" cy={BLADE_Y} r="4" fill={ACCENT} />
        <circle cx="65" cy="24" r="1.5" fill={ACCENT} />
        <circle cx="66" cy="38" r="1.5" fill={ACCENT} />
        <circle cx="72" cy="28" r="1" fill={ACCENT} />
      </Svg>
    ),
  },

  center: {
    label: 'Center Out',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="6" strokeLinecap="round" />
        <line x1="32" y1={BLADE_Y} x2="68" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <path d="M 24 20 L 32 30 L 24 40 Z" fill={ACCENT_DIM} />
        <path d="M 76 20 L 68 30 L 76 40 Z" fill={ACCENT_DIM} />
      </Svg>
    ),
  },

  wipe: {
    label: 'Wipe',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="ign-wipe-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={ACCENT} stopOpacity="1" />
            <stop offset="0.55" stopColor={ACCENT} stopOpacity="1" />
            <stop offset="0.75" stopColor={ACCENT} stopOpacity="0.3" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="url(#ign-wipe-grad)" strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  stutter: {
    label: 'Stutter',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="20" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <line x1="26" y1={BLADE_Y} x2="38" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <line x1="44" y1={BLADE_Y} x2="58" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
        <line x1="66" y1={BLADE_Y} x2="72" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  glitch: {
    label: 'Glitch',
    thumbnail: (
      <Svg>
        <line x1="8" y1="28" x2="28" y2="28" stroke={ACCENT} strokeWidth="3" />
        <line x1="20" y1="32" x2="46" y2="32" stroke={ACCENT} strokeWidth="3" />
        <line x1="32" y1="26" x2="54" y2="26" stroke={ACCENT} strokeWidth="3" />
        <line x1="48" y1="34" x2="72" y2="34" stroke={ACCENT} strokeWidth="3" opacity="0.6" />
        <line x1="66" y1="28" x2="86" y2="28" stroke={ACCENT} strokeWidth="3" opacity="0.4" />
      </Svg>
    ),
  },

  twist: {
    label: 'Twist',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <path d="M 10 30 Q 25 16, 40 30 T 70 30 T 92 30" stroke={ACCENT} strokeWidth="3" fill="none" strokeLinecap="round" />
      </Svg>
    ),
  },

  swing: {
    label: 'Swing',
    thumbnail: (
      <Svg>
        <path d="M 8 42 Q 50 12 92 42" stroke={ACCENT} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 8 42 Q 50 12 92 42" stroke={ACCENT_DIM} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.4" />
      </Svg>
    ),
  },

  stab: {
    label: 'Stab',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy={BLADE_Y} r="10" fill={ACCENT} />
        <circle cx="50" cy={BLADE_Y} r="16" fill="none" stroke={ACCENT_DIM} strokeWidth="2" />
      </Svg>
    ),
  },

  crackle: {
    label: 'Crackle',
    thumbnail: (
      <Svg>
        <line x1="12" y1={BLADE_Y} x2="18" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" />
        <line x1="26" y1={BLADE_Y} x2="30" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" opacity="0.5" />
        <line x1="38" y1={BLADE_Y} x2="48" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" />
        <line x1="54" y1={BLADE_Y} x2="62" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" opacity="0.7" />
        <line x1="70" y1={BLADE_Y} x2="76" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" opacity="0.3" />
        <line x1="82" y1={BLADE_Y} x2="88" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" opacity="0.5" />
      </Svg>
    ),
  },

  fracture: {
    label: 'Fracture',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="3" />
        <path d="M 30 30 L 24 18 M 30 30 L 24 42" stroke={ACCENT} strokeWidth="1.5" fill="none" />
        <path d="M 56 30 L 64 16 M 56 30 L 64 44" stroke={ACCENT} strokeWidth="1.5" fill="none" />
        <path d="M 78 30 L 72 20 M 78 30 L 72 40" stroke={ACCENT} strokeWidth="1.5" fill="none" />
      </Svg>
    ),
  },

  'flash-fill': {
    label: 'Flash Fill',
    thumbnail: (
      <Svg>
        <rect x="6" y="26" width="88" height="8" fill={ACCENT} opacity="0.85" />
        <line x1="8" y1={BLADE_Y} x2="50" y2={BLADE_Y} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
      </Svg>
    ),
  },

  'pulse-wave': {
    label: 'Pulse Wave',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <line x1="8" y1={BLADE_Y} x2="22" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <line x1="8" y1={BLADE_Y} x2="42" y2={BLADE_Y} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        <line x1="8" y1={BLADE_Y} x2="62" y2={BLADE_Y} stroke={ACCENT} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      </Svg>
    ),
  },

  'drip-up': {
    label: 'Drip Up',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="3" />
        <path d="M 20 46 Q 24 30 28 40 Q 32 20 36 34" stroke={ACCENT} strokeWidth="2.5" fill="none" />
        <path d="M 54 46 Q 58 32 62 38 Q 66 22 70 34" stroke={ACCENT} strokeWidth="2.5" fill="none" opacity="0.7" />
      </Svg>
    ),
  },

  hyperspace: {
    label: 'Hyperspace',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="1" />
        <line x1="12" y1="22" x2="88" y2="22" stroke={ACCENT} strokeWidth="1" opacity="0.6" />
        <line x1="16" y1="26" x2="92" y2="26" stroke={ACCENT} strokeWidth="1" opacity="0.8" />
        <line x1="8" y1={BLADE_Y} x2="88" y2={BLADE_Y} stroke={ACCENT} strokeWidth="2" />
        <line x1="16" y1="34" x2="92" y2="34" stroke={ACCENT} strokeWidth="1" opacity="0.8" />
        <line x1="12" y1="38" x2="88" y2="38" stroke={ACCENT} strokeWidth="1" opacity="0.6" />
      </Svg>
    ),
  },

  summon: {
    label: 'Summon',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <path d="M 92 30 L 82 22 M 92 30 L 82 38" stroke={ACCENT} strokeWidth="2" fill="none" />
        <circle cx="50" cy={BLADE_Y} r="4" fill={ACCENT} />
        <circle cx="30" cy={BLADE_Y} r="2.5" fill={ACCENT} opacity="0.6" />
      </Svg>
    ),
  },

  seismic: {
    label: 'Seismic',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <path d="M 8 30 L 18 22 L 26 38 L 36 20 L 46 40 L 56 24 L 66 36 L 76 26 L 86 32 L 92 30" stroke={ACCENT} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },

  'custom-curve': {
    label: 'Custom Curve',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_FAINT} strokeWidth="2" />
        <path d="M 10 46 C 30 46, 40 14, 90 14" stroke={ACCENT} strokeWidth="2.5" fill="none" />
        <circle cx="30" cy="46" r="2" fill={ACCENT} />
        <circle cx="70" cy="14" r="2" fill={ACCENT} />
      </Svg>
    ),
  },
};

/** Resolve an ignition id to its thumbnail + label, falling back to the default. */
export function getIgnitionThumbnail(id: string): IgnitionThumbnailEntry {
  return IGNITION_THUMBNAILS[id] ?? DEFAULT_IGNITION_THUMBNAIL;
}
