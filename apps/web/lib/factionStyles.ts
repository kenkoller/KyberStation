// ─── Faction / Era / Badge Style Helpers ───
//
// Small mapping helpers that turn faction/era/badge IDs into CSS-variable
// references from globals.css. Used by PresetGallery (and anywhere else
// that renders faction-flavoured badges) so the colours track the active
// theme and colour-blind overrides instead of being hardcoded Tailwind
// palette values.
//
// Returns `rgb(var(--token))` strings suitable for inline `style={{…}}`
// usage. For tinted backgrounds/borders, consumers compose their own
// alpha via `style={{ background: `${fg}/0.3` }}` — trivial because the
// functions always emit `rgb(var(--token))` which can be wrapped:
// `rgb(var(--token) / 0.3)` via string concat.

import type { Affiliation, Era } from '@kyberstation/presets';

export function affiliationColor(affiliation: Affiliation): string {
  switch (affiliation) {
    case 'jedi':    return 'rgb(var(--faction-jedi))';
    case 'sith':    return 'rgb(var(--faction-sith))';
    case 'neutral': return 'rgb(var(--faction-neutral))';
    case 'other':   return 'rgb(var(--faction-grey))';
  }
}

export function affiliationTint(affiliation: Affiliation, alpha = 0.3): string {
  const token = {
    jedi:    '--faction-jedi',
    sith:    '--faction-sith',
    neutral: '--faction-neutral',
    other:   '--faction-grey',
  }[affiliation];
  return `rgb(var(${token}) / ${alpha})`;
}

export function eraColor(era: Era): string {
  switch (era) {
    case 'prequel':            return 'rgb(var(--era-prequel))';
    case 'original-trilogy':   return 'rgb(var(--era-ot))';
    case 'sequel':             return 'rgb(var(--era-sequel))';
    case 'animated':           return 'rgb(var(--era-animated))';
    case 'expanded-universe':  return 'rgb(var(--era-eu))';
  }
}

/** Named badges that aren't tied to faction/era. */
export type BadgeKind = 'legends' | 'creative' | 'screen-accurate';

export function badgeColor(kind: BadgeKind): string {
  switch (kind) {
    case 'legends':          return 'rgb(var(--badge-legends))';
    case 'creative':         return 'rgb(var(--badge-creative))';
    case 'screen-accurate':  return 'rgb(var(--badge-screen-accurate))';
  }
}

export function badgeTint(kind: BadgeKind, alpha = 0.3): string {
  const token = {
    'legends':          '--badge-legends',
    'creative':         '--badge-creative',
    'screen-accurate':  '--badge-screen-accurate',
  }[kind];
  return `rgb(var(${token}) / ${alpha})`;
}
