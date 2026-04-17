// ─── Font ↔ Preset Pairing Heuristic ───
//
// Sound fonts don't carry structured metadata about which style or
// character they're designed for — the community convention is to
// encode intent in the font NAME (e.g. "SmthJedi", "Vader", "FireV2",
// "KyloUnstable"). This module parses those names against a small
// keyword table and returns a pairing score for the currently loaded
// preset.
//
// This is strictly a UI aid — surfacing "recommended" fonts at the
// top of the library list. The user can load any font with any preset.

export interface PairingScore {
  /** 0..1 how well this font pairs with the config. */
  score: number;
  /** Human-readable reasons the score came out the way it did. */
  reasons: string[];
}

interface PairingConfig {
  style: string;
  ignition: string;
  baseColor: { r: number; g: number; b: number };
  name?: string;
}

/**
 * Keyword → character/archetype affinities. Each keyword that appears
 * in a font name contributes to its compatibility with matching
 * preset fields. Keywords are case-insensitive and match as
 * substrings.
 */
const KEYWORDS: Array<{
  keyword: string;
  styles: string[];
  colorHint?: 'cool' | 'warm' | 'white' | 'any';
  characterHint?: string;
  weight: number;
}> = [
  // Jedi-side / cool-colour fonts
  { keyword: 'jedi', styles: ['stable', 'rotoscope'], colorHint: 'cool', weight: 0.35 },
  { keyword: 'luke', styles: ['stable', 'rotoscope'], colorHint: 'cool', characterHint: 'Luke Skywalker', weight: 0.5 },
  { keyword: 'obi', styles: ['stable'], colorHint: 'cool', characterHint: 'Obi-Wan', weight: 0.5 },
  { keyword: 'anakin', styles: ['stable'], colorHint: 'cool', characterHint: 'Anakin', weight: 0.5 },
  { keyword: 'yoda', styles: ['stable'], colorHint: 'cool', characterHint: 'Yoda', weight: 0.5 },
  { keyword: 'qui', styles: ['stable'], colorHint: 'cool', characterHint: 'Qui-Gon Jinn', weight: 0.5 },
  { keyword: 'mace', styles: ['stable'], colorHint: 'any', characterHint: 'Mace Windu', weight: 0.5 },
  { keyword: 'ahsoka', styles: ['stable'], colorHint: 'white', characterHint: 'Ahsoka Tano', weight: 0.5 },

  // Sith-side / unstable / warm-colour fonts
  { keyword: 'sith', styles: ['stable', 'unstable'], colorHint: 'warm', weight: 0.35 },
  { keyword: 'vader', styles: ['stable'], colorHint: 'warm', characterHint: 'Darth Vader', weight: 0.5 },
  { keyword: 'maul', styles: ['unstable'], colorHint: 'warm', characterHint: 'Darth Maul', weight: 0.5 },
  { keyword: 'kylo', styles: ['unstable'], colorHint: 'warm', characterHint: 'Kylo Ren', weight: 0.5 },
  { keyword: 'dooku', styles: ['stable'], colorHint: 'warm', characterHint: 'Count Dooku', weight: 0.5 },
  { keyword: 'sidious', styles: ['unstable', 'stable'], colorHint: 'warm', characterHint: 'Palpatine', weight: 0.5 },
  { keyword: 'palpatine', styles: ['unstable', 'stable'], colorHint: 'warm', characterHint: 'Palpatine', weight: 0.5 },
  { keyword: 'inquisitor', styles: ['unstable'], colorHint: 'warm', weight: 0.45 },
  { keyword: 'revan', styles: ['stable'], colorHint: 'warm', characterHint: 'Darth Revan', weight: 0.5 },

  // Style-specific (not character-bound)
  { keyword: 'fire', styles: ['fire', 'unstable'], colorHint: 'warm', weight: 0.45 },
  { keyword: 'plasma', styles: ['plasma', 'unstable'], colorHint: 'any', weight: 0.4 },
  { keyword: 'unstable', styles: ['unstable'], colorHint: 'any', weight: 0.6 },
  { keyword: 'smthjedi', styles: ['stable'], colorHint: 'cool', weight: 0.5 },
  { keyword: 'smthgrey', styles: ['stable', 'rotoscope'], colorHint: 'any', weight: 0.45 },
  { keyword: 'smthfuzz', styles: ['unstable', 'fire'], colorHint: 'warm', weight: 0.45 },
  { keyword: 'graflex', styles: ['stable', 'rotoscope'], colorHint: 'cool', weight: 0.5 },
  { keyword: 'rotoscope', styles: ['rotoscope'], colorHint: 'any', weight: 0.55 },

  // Exotic / unique
  { keyword: 'darksaber', styles: ['stable'], colorHint: 'white', characterHint: 'Darksaber', weight: 0.55 },
  { keyword: 'rainbow', styles: ['aurora', 'gradient'], colorHint: 'any', weight: 0.4 },
  { keyword: 'cal', styles: ['stable'], colorHint: 'any', characterHint: 'Cal Kestis', weight: 0.45 },
];

/**
 * Classify a colour's temperature. Used to match fonts whose name
 * implies a warm (red/orange) or cool (blue/green) aesthetic.
 */
function classifyColor(
  c: { r: number; g: number; b: number },
): 'cool' | 'warm' | 'white' {
  const max = Math.max(c.r, c.g, c.b);
  const isWhiteish = c.r > 200 && c.g > 200 && c.b > 200;
  if (isWhiteish) return 'white';
  if (max === 0) return 'white'; // default
  // Cool: blue or green dominates. Warm: red/orange dominates.
  if (c.b >= c.r || (c.g >= c.r && c.g >= c.b)) return 'cool';
  return 'warm';
}

/**
 * Score how well a font (by name) pairs with a preset config.
 *
 * Strategy: walk keyword table, accumulate weight from keyword matches.
 * Bonus when style matches, penalty when colour temperature disagrees.
 * Result clamped to [0, 1].
 */
export function scoreFontForConfig(
  fontName: string,
  config: PairingConfig,
): PairingScore {
  const haystack = fontName.toLowerCase();
  const configColor = classifyColor(config.baseColor);
  let score = 0;
  const reasons: string[] = [];

  for (const entry of KEYWORDS) {
    if (!haystack.includes(entry.keyword)) continue;

    // Base weight from keyword match.
    let contrib = entry.weight;
    const parts: string[] = [];

    // Style-matching bonus.
    if (entry.styles.includes(config.style)) {
      contrib *= 1.5;
      parts.push(`matches ${config.style} style`);
    } else if (entry.styles.length > 0) {
      // Keyword implies a style that isn't current; slight penalty.
      contrib *= 0.6;
      parts.push(`typically paired with ${entry.styles[0]}`);
    }

    // Colour-hint bonus / mismatch.
    if (entry.colorHint === 'any' || !entry.colorHint) {
      // no adjustment
    } else if (entry.colorHint === configColor) {
      contrib *= 1.3;
      parts.push(`${configColor} palette fit`);
    } else {
      contrib *= 0.5;
      parts.push(`expects ${entry.colorHint} palette`);
    }

    // Character-name match (if config carries a name and keyword implies a char).
    if (
      entry.characterHint &&
      config.name &&
      config.name.toLowerCase().includes(entry.characterHint.toLowerCase().split(' ')[0])
    ) {
      contrib *= 1.8;
      parts.push(`named for ${entry.characterHint}`);
    }

    score += contrib;
    if (parts.length > 0) {
      reasons.push(`"${entry.keyword}" → ${parts.join(', ')}`);
    } else {
      reasons.push(`"${entry.keyword}"`);
    }
  }

  // Clamp; above 1.0 means strong multi-match, treat as perfect.
  return { score: Math.min(1, score), reasons };
}

/** Convenience classifier for display — maps score → short label. */
export function pairingLabel(score: number): {
  tag: 'recommended' | 'compatible' | 'neutral';
  label: string;
  color: string;
} {
  if (score >= 0.55) {
    return {
      tag: 'recommended',
      label: 'Recommended',
      color: 'rgb(var(--status-ok))',
    };
  }
  if (score >= 0.25) {
    return {
      tag: 'compatible',
      label: 'Compatible',
      color: 'rgb(var(--accent))',
    };
  }
  return {
    tag: 'neutral',
    label: '',
    color: 'rgb(var(--text-muted))',
  };
}
