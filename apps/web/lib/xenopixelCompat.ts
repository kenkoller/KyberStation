// ─── Xenopixel Compatibility Utilities ─────────────────────────────
//
// Computes on-the-fly whether a BladeConfig / PresetConfig is
// compatible with the Xenopixel V3 board, and what the closest Xeno
// equivalents are. Used by:
//   1. Gallery to filter/tag "Xenopixel-compatible" presets
//   2. Board-switch design porter to show conversion notes
//   3. Preset detail cards to show compat badges
//
// Single source of truth for the style↔effectId mapping. The
// connected wrappers in `components/editor/xenopixel/connected.tsx`
// use XENO_BLADE_EFFECTS directly for their own UI-facing mapping;
// this module is for preset-level compatibility checking.

import { XENO_BLADE_EFFECTS, XENO_IGNITION_STYLES } from '@kyberstation/boards';

// ─── Types ────────────────────────────────────────────────────────

export interface XenopixelCompat {
  /** Whether the preset maps cleanly to Xenopixel capabilities. */
  compatible: boolean;
  /** Closest Xenopixel blade effect ID (0-7). */
  bladeEffectId: number;
  /** Closest Xenopixel blade effect name (e.g. 'Fire Blade'). */
  bladeEffectName: string;
  /** Closest Xenopixel ignition style ID (0-11). */
  ignitionStyleId: number;
  /** Closest Xenopixel ignition style name. */
  ignitionStyleName: string;
  /** Whether the blade style maps exactly (vs approximate). */
  styleExact: boolean;
  /** Whether the ignition maps exactly (vs approximate). */
  ignitionExact: boolean;
  /**
   * Human-readable note about what was approximated.
   * null when both style + ignition map exactly.
   */
  degradationNote: string | null;
}

// ─── Style → Xeno Effect ID mapping ──────────────────────────────

/** Map a BladeConfig.style string to the closest Xenopixel effect. */
function mapStyleToXenoEffect(style: string): {
  id: number;
  name: string;
  exact: boolean;
} {
  // Direct matches via kyberStyle field
  const directMatch = XENO_BLADE_EFFECTS.find(
    (e) => e.kyberStyle === style,
  );
  if (directMatch) {
    return { id: directMatch.id, name: directMatch.name, exact: true };
  }

  // Approximate matches for styles without a direct mapping
  const APPROX_MAP: Record<string, { id: number; reason: string }> = {
    // Styles that map to Fire Blade (flickering/animated)
    candle:       { id: 0, reason: 'Candle approximated as Fire Blade' },
    ember:        { id: 0, reason: 'Ember approximated as Fire Blade' },

    // Styles that map to Steady Blade (solid/stable)
    darksaber:    { id: 1, reason: 'Darksaber approximated as Steady Blade' },
    photon:       { id: 1, reason: 'Photon approximated as Steady Blade' },
    rotoscope:    { id: 1, reason: 'Rotoscope approximated as Steady Blade' },

    // Styles that map to Unstable Blade (flickering/random)
    plasma:       { id: 2, reason: 'Plasma approximated as Unstable Blade' },
    shatter:      { id: 2, reason: 'Shatter approximated as Unstable Blade' },
    automata:     { id: 2, reason: 'Automata approximated as Unstable Blade' },

    // Styles that map to Rainbow (multi-color)
    prism:        { id: 3, reason: 'Prism approximated as Rainbow Blade' },
    aurora:       { id: 3, reason: 'Aurora approximated as Rainbow Blade' },

    // Styles that map to Crack Blade
    neutron:      { id: 5, reason: 'Neutron approximated as Crack Blade' },

    // Styles that map to Pulse Blade (breathing/pulsing)
    gradient:     { id: 6, reason: 'Gradient approximated as Pulse Blade' },
    helix:        { id: 6, reason: 'Helix approximated as Pulse Blade' },

    // Styles that map to Flashing Blade (strobing)
    dataStream:   { id: 7, reason: 'Data Stream approximated as Flashing Blade' },
    gravity:      { id: 7, reason: 'Gravity approximated as Flashing Blade' },
    tempoLock:    { id: 7, reason: 'Tempo Lock approximated as Flashing Blade — rhythmic pattern closest to strobe' },

    // Additional particle/flicker styles → Fire Blade
    cinder:       { id: 0, reason: 'Cinder approximated as Fire Blade — particle-based effect closest to fire' },
    sithFlicker:  { id: 0, reason: 'Sith Flicker approximated as Fire Blade — flicker-based effect closest to fire' },

    // Additional multi-color styles → Rainbow Blade
    nebula:       { id: 3, reason: 'Nebula approximated as Rainbow Blade — multi-color effect closest to rainbow' },
    moire:        { id: 3, reason: 'Moire approximated as Rainbow Blade — pattern-based effect closest to rainbow' },
    vortex:       { id: 3, reason: 'Vortex approximated as Rainbow Blade — rotational multi-color closest to rainbow' },

    // Additional flowing-motion styles → Unstable Blade
    cascade:      { id: 2, reason: 'Cascade approximated as Unstable Blade — flowing motion closest to unstable' },
    torrent:      { id: 2, reason: 'Torrent approximated as Unstable Blade — flowing motion closest to unstable' },
    mirage:       { id: 2, reason: 'Mirage approximated as Unstable Blade — shimmering effect closest to unstable' },

    // Additional wave/pulse styles → Pulse Blade
    tidal:        { id: 6, reason: 'Tidal approximated as Pulse Blade — wave-like effect closest to pulse' },
    bladeCharge:  { id: 6, reason: 'Blade Charge approximated as Pulse Blade — energy buildup closest to pulse' },

    // Additional multi-segment styles → Candy Blade
    painted:      { id: 4, reason: 'Painted approximated as Candy Blade — multi-color segments closest to candy' },
    imageScroll:  { id: 4, reason: 'Image Scroll approximated as Candy Blade — scrolling content closest to candy' },
  };

  const approx = APPROX_MAP[style];
  if (approx) {
    const effect = XENO_BLADE_EFFECTS.find((e) => e.id === approx.id)!;
    return { id: effect.id, name: effect.name, exact: false };
  }

  // Fallback: Steady Blade (safest default)
  return { id: 1, name: 'Steady Blade', exact: false };
}

// ─── Ignition → Xeno Ignition ID mapping ─────────────────────────

/** Map a BladeConfig.ignition string to the closest Xenopixel ignition. */
function mapIgnitionToXenoStyle(ignition: string): {
  id: number;
  name: string;
  exact: boolean;
} {
  // Direct blade-mode matches
  const DIRECT_MAP: Record<string, number> = {
    standard: 0,
    scroll:   1,
    wipe:     2,
    spark:    3,
    ghost:    4,
  };

  if (ignition in DIRECT_MAP) {
    const id = DIRECT_MAP[ignition];
    const entry = XENO_IGNITION_STYLES.find((s) => s.id === id)!;
    return { id, name: entry.name, exact: true };
  }

  // Approximate matches
  const APPROX_MAP: Record<string, { id: number; reason: string }> = {
    center:       { id: 0, reason: 'Center ignition approximated as Standard' },
    stutter:      { id: 3, reason: 'Stutter ignition approximated as Blaster Blade' },
    glitch:       { id: 3, reason: 'Glitch ignition approximated as Blaster Blade' },
    crackle:      { id: 5, reason: 'Crackle approximated as Stack Ignition' },
    fracture:     { id: 5, reason: 'Fracture approximated as Stack Ignition' },
    flashFill:    { id: 6, reason: 'FlashFill approximated as FoldTile Ignition' },
    pulseWave:    { id: 7, reason: 'PulseWave approximated as Word Ignition' },
    dripUp:       { id: 8, reason: 'DripUp approximated as Faser Ignition' },
  };

  const approx = APPROX_MAP[ignition];
  if (approx) {
    const entry = XENO_IGNITION_STYLES.find((s) => s.id === approx.id)!;
    return { id: entry.id, name: entry.name, exact: false };
  }

  // Fallback: Standard
  return { id: 0, name: 'Standard Blade', exact: false };
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Compute Xenopixel V3 compatibility for a preset config.
 * Does NOT mutate the config — returns a read-only analysis.
 */
export function getXenopixelCompat(config: {
  style: string;
  ignition: string;
}): XenopixelCompat {
  const effect = mapStyleToXenoEffect(config.style);
  const ignition = mapIgnitionToXenoStyle(config.ignition);

  const notes: string[] = [];
  if (!effect.exact) {
    notes.push(
      `${config.style} → ${effect.name} (approximate)`,
    );
  }
  if (!ignition.exact) {
    notes.push(
      `${config.ignition} → ${ignition.name} (approximate)`,
    );
  }

  return {
    compatible: effect.exact && ignition.exact,
    bladeEffectId: effect.id,
    bladeEffectName: effect.name,
    ignitionStyleId: ignition.id,
    ignitionStyleName: ignition.name,
    styleExact: effect.exact,
    ignitionExact: ignition.exact,
    degradationNote: notes.length > 0 ? notes.join('; ') : null,
  };
}

/**
 * Check if a style string has a direct Xenopixel equivalent.
 * Quick boolean check for gallery filtering.
 */
export function isXenopixelCompatibleStyle(style: string): boolean {
  return XENO_BLADE_EFFECTS.some((e) => e.kyberStyle === style);
}

/**
 * Get a list of all BladeConfig.style strings that have direct
 * Xenopixel mappings.
 */
export function getXenopixelCompatibleStyles(): string[] {
  return XENO_BLADE_EFFECTS
    .filter((e) => e.kyberStyle !== null)
    .map((e) => e.kyberStyle!);
}
