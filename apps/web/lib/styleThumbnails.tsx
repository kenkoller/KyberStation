// ─── Style thumbnail registry ────────────────────────────────────────────
//
// Static SVG thumbnails keyed by styleId. Used by MiniGalleryPicker in
// StylePanel. Each SVG gives the style a signature visual shape the eye
// can latch onto before the label registers. Live engine-driven preview
// would be more accurate but too expensive at 30+ cards — the signature
// shapes are deliberately stylized icons, not faithful renders.
//
// Design constraints:
//   - 100×60 px viewBox, drawn into a 100×60 SVG. The picker sets the
//     outer box height; letting the SVG fill its parent keeps the
//     thumbnails crisp at any zoom.
//   - All strokes / fills reference the accent CSS token (rgb(var(--accent)))
//     so the thumbnail follows the theme. Secondary accents fall back to
//     text-primary / text-muted.
//   - Each thumbnail is under 30 lines — these are icons, not
//     illustrations. If a shape needs >30 lines, it's probably trying
//     too hard and the user would be better served by an accurate name.
//   - Opaque fallback: `DEFAULT_STYLE_THUMBNAIL` is a plain horizontal
//     blade line. Any style not explicitly registered here falls back
//     to it in `getStyleThumbnail`.

import type { ReactNode } from 'react';

export interface StyleThumbnailEntry {
  thumbnail: ReactNode;
  label: string;
}

// Common SVG plumbing. `--accent` resolves through globals.css.
const ACCENT = 'rgb(var(--accent))';
const ACCENT_DIM = 'rgb(var(--accent) / 0.4)';
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

/** Plain horizontal accent-colored line. Fallback for unregistered styles. */
export const DEFAULT_STYLE_THUMBNAIL: StyleThumbnailEntry = {
  label: 'Style',
  thumbnail: (
    <Svg>
      <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  ),
};

export const STYLE_THUMBNAILS: Record<string, StyleThumbnailEntry> = {
  stable: {
    label: 'Stable',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  unstable: {
    label: 'Unstable',
    thumbnail: (
      <Svg>
        <path
          d="M8 30 L18 24 L24 34 L32 22 L40 36 L48 26 L56 32 L64 24 L72 34 L80 26 L92 30"
          stroke={ACCENT}
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    ),
  },

  fire: {
    label: 'Fire',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="70" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <path d="M70 30 Q78 18 82 14 Q86 22 92 18 Q90 30 86 32 Q80 34 75 34 Z" fill={ACCENT} opacity="0.8" />
        <path d="M74 30 Q78 22 82 22 Q82 28 88 26 Q86 30 82 30 Z" fill={ACCENT} opacity="1" />
      </Svg>
    ),
  },

  rotoscope: {
    label: 'Rotoscope',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="10" strokeLinecap="round" />
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
        <line x1="12" y1={BLADE_Y} x2="88" y2={BLADE_Y} stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </Svg>
    ),
  },

  pulse: {
    label: 'Pulse',
    thumbnail: (
      <Svg>
        <line
          x1="8"
          y1={BLADE_Y}
          x2="92"
          y2={BLADE_Y}
          stroke={ACCENT}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="8 6"
        />
      </Svg>
    ),
  },

  gradient: {
    label: 'Gradient',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="style-thumb-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={ACCENT} />
            <stop offset="50%" stopColor="rgb(var(--status-magenta, 220 80 180))" />
            <stop offset="100%" stopColor="rgb(var(--status-cyan, 80 200 220))" />
          </linearGradient>
        </defs>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="url(#style-thumb-gradient)" strokeWidth="6" strokeLinecap="round" />
      </Svg>
    ),
  },

  photon: {
    label: 'Photon Blade',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="2" strokeLinecap="round" />
        <circle cx="30" cy={BLADE_Y} r="4" fill={ACCENT} />
        <circle cx="50" cy={BLADE_Y} r="6" fill={ACCENT}>
          <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="70" cy={BLADE_Y} r="3" fill={ACCENT} opacity="0.8" />
      </Svg>
    ),
  },

  plasma: {
    label: 'Plasma Storm',
    thumbnail: (
      <Svg>
        <path
          d="M8 30 Q18 18, 28 30 T48 30 T68 30 T88 30"
          stroke={ACCENT}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M8 30 Q18 42, 28 30 T48 30 T68 30 T88 30"
          stroke={ACCENT_DIM}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    ),
  },

  crystalShatter: {
    label: 'Crystal Shatter',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="28" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <line x1="34" y1={BLADE_Y} x2="46" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <line x1="52" y1={BLADE_Y} x2="62" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <line x1="68" y1={BLADE_Y} x2="78" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
        <line x1="84" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
      </Svg>
    ),
  },

  aurora: {
    label: 'Aurora',
    thumbnail: (
      <Svg>
        <defs>
          <linearGradient id="aurora-thumb" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(var(--status-cyan, 100 220 200))" />
            <stop offset="50%" stopColor={ACCENT} />
            <stop offset="100%" stopColor="rgb(var(--status-magenta, 220 100 200))" />
          </linearGradient>
        </defs>
        <path
          d="M8 30 Q25 18 50 30 T92 30"
          stroke="url(#aurora-thumb)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    ),
  },

  cinder: {
    label: 'Cinder',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="4" strokeLinecap="round" />
        <circle cx="20" cy="24" r="1.5" fill={ACCENT} />
        <circle cx="35" cy="36" r="1.2" fill={ACCENT} opacity="0.8" />
        <circle cx="55" cy="22" r="1.8" fill={ACCENT} />
        <circle cx="70" cy="38" r="1.4" fill={ACCENT} opacity="0.7" />
        <circle cx="85" cy="26" r="1" fill={ACCENT} opacity="0.6" />
      </Svg>
    ),
  },

  prism: {
    label: 'Prism',
    thumbnail: (
      <Svg>
        <line x1="8" y1="26" x2="92" y2="26" stroke="rgb(239 68 68)" strokeWidth="3" strokeLinecap="round" />
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke="rgb(34 197 94)" strokeWidth="3" strokeLinecap="round" />
        <line x1="8" y1="34" x2="92" y2="34" stroke="rgb(59 130 246)" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    ),
  },

  gravity: {
    label: 'Gravity',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="70" cy={BLADE_Y} rx="18" ry="6" fill={ACCENT} opacity="0.8" />
        <ellipse cx="80" cy={BLADE_Y} rx="10" ry="4" fill={ACCENT} />
      </Svg>
    ),
  },

  dataStream: {
    label: 'Data Stream',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="26" width="8" height="8" fill={ACCENT} />
        <rect x="34" y="26" width="8" height="8" fill={ACCENT} opacity="0.8" />
        <rect x="54" y="26" width="8" height="8" fill={ACCENT} opacity="0.6" />
        <rect x="74" y="26" width="8" height="8" fill={ACCENT} opacity="0.4" />
      </Svg>
    ),
  },

  ember: {
    label: 'Ember',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="20" r="1.5" fill={ACCENT} />
        <circle cx="32" cy="14" r="1" fill={ACCENT} opacity="0.6" />
        <circle cx="50" cy="16" r="1.8" fill={ACCENT} />
        <circle cx="62" cy="10" r="1" fill={ACCENT} opacity="0.5" />
        <circle cx="78" cy="18" r="1.3" fill={ACCENT} opacity="0.8" />
      </Svg>
    ),
  },

  automata: {
    label: 'Automata',
    thumbnail: (
      <Svg>
        <rect x="14" y="26" width="6" height="8" fill={ACCENT} />
        <rect x="26" y="26" width="6" height="8" fill={ACCENT_DIM} />
        <rect x="38" y="26" width="6" height="8" fill={ACCENT} />
        <rect x="50" y="26" width="6" height="8" fill={ACCENT} />
        <rect x="62" y="26" width="6" height="8" fill={ACCENT_DIM} />
        <rect x="74" y="26" width="6" height="8" fill={ACCENT} />
        <rect x="86" y="26" width="6" height="8" fill={ACCENT_DIM} />
      </Svg>
    ),
  },

  helix: {
    label: 'Helix',
    thumbnail: (
      <Svg>
        <path
          d="M8 30 Q25 18 42 30 T76 30 T110 30"
          stroke={ACCENT}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M8 30 Q25 42 42 30 T76 30 T110 30"
          stroke={ACCENT_DIM}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    ),
  },

  candle: {
    label: 'Candle',
    thumbnail: (
      <Svg>
        <path
          d="M8 30 L22 28 L26 32 L38 29 L44 31 L58 28 L66 32 L78 29 L92 30"
          stroke={ACCENT}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },

  shatter: {
    label: 'Shatter',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy={BLADE_Y} r="4" fill={ACCENT} />
        <circle cx="40" cy={BLADE_Y} r="5" fill={ACCENT} opacity="0.85" />
        <circle cx="58" cy={BLADE_Y} r="3" fill={ACCENT} opacity="0.65" />
        <circle cx="76" cy={BLADE_Y} r="6" fill={ACCENT} />
      </Svg>
    ),
  },

  neutron: {
    label: 'Neutron',
    thumbnail: (
      <Svg>
        <line x1="8" y1={BLADE_Y} x2="92" y2={BLADE_Y} stroke={ACCENT_DIM} strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1={BLADE_Y} x2="86" y2={BLADE_Y} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <circle cx="86" cy={BLADE_Y} r="5" fill={ACCENT} />
      </Svg>
    ),
  },
};

/** Resolve a styleId to its thumbnail + label, falling back to the default. */
export function getStyleThumbnail(styleId: string): StyleThumbnailEntry {
  return STYLE_THUMBNAILS[styleId] ?? DEFAULT_STYLE_THUMBNAIL;
}
