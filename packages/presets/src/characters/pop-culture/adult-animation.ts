import type { Preset } from '../../types.js';

/**
 * Adult-animation pop-culture presets.
 *
 * Fan tribute blades inspired by late-night animation and adult cartoon
 * franchises. None are screen-accurate lightsaber appearances — they're
 * interpretations of character signatures translated to Neopixel blade
 * aesthetics.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union does
 *   not include a dedicated pop-culture value. The `continuity: 'pop-culture'`
 *   field is the authoritative source for gallery filtering.
 * - `affiliation` is `'jedi'` for Samurai Jack (divine weapon vs. evil),
 *   `'sith'` for Brock (chaotic violence), and `'other'` / `'neutral'` for
 *   figures outside the axis.
 */
export const ADULT_ANIMATION_PRESETS: Preset[] = [
  // ── Rick's Portal Gun (Rick and Morty) ─────────────────────────
  {
    id: 'pop-rick-portal-gun',
    name: 'Portal Gun Green',
    character: 'Rick Sanchez (Rick and Morty)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'other',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The signature portal-gun green. Radioactive, unstable, and inherently quantum-hazardous — high shimmer conveys a blade that might rip a wormhole to a universe where you\'re already dead. The portal gun was never stable; neither is this preset.',
    hiltNotes:
      'Grey-and-chrome lab-fabricated hilt, green concentrator cell mid-grip, liquid-crystal readout near the emitter.',
    config: {
      name: 'PortalGun',
      baseColor: { r: 150, g: 255, b: 50 },
      clashColor: { r: 240, g: 255, b: 200 },
      lockupColor: { r: 200, g: 255, b: 120 },
      blastColor: { r: 255, g: 255, b: 220 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 360,
      retractionMs: 480,
      shimmer: 0.6,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.22,
    },
  },

  // ── Samurai Jack — Katana of Righteousness ─────────────────────
  {
    id: 'pop-samurai-jack-katana',
    name: 'Katana of Righteousness',
    character: 'Samurai Jack',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'jedi',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The blade forged by the gods — Odin, Ra, and Rama — the only weapon capable of harming Aku. Pure holy white with a gold halo via aurora style; the blade hums with the divine purpose of its forging. Cleaves evil, refuses to harm the innocent.',
    hiltNotes:
      'Black-wrapped tsuka over white ray-skin, circular tsuba (hand guard), polished steel saya-fittings at the pommel.',
    config: {
      name: 'KatanaRighteousness',
      baseColor: { r: 255, g: 255, b: 255 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 250, b: 220 },
      blastColor: { r: 255, g: 255, b: 240 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 420,
      retractionMs: 560,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.3,
      noiseLevel: 0.04,
    },
  },

  // ── Master Shake (Aqua Teen Hunger Force) ──────────────────────
  {
    id: 'pop-atf-master-shake',
    name: 'Master Shake',
    character: 'Master Shake (Aqua Teen Hunger Force)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A frothy, cheerfully dumb milkshake rendered as a blade. Pale pink-white stable output — the chill of the cup, the foam of the whip, the self-importance of the strawman. Confidently useless in every scenario.',
    hiltNotes:
      'White plastic cup-shape hilt with pink-swirl accent, bendy-straw crossguard leaning perpendicular to the emitter.',
    config: {
      name: 'MasterShake',
      baseColor: { r: 255, g: 220, b: 230 },
      clashColor: { r: 255, g: 240, b: 250 },
      lockupColor: { r: 255, g: 230, b: 240 },
      blastColor: { r: 255, g: 250, b: 255 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.18,
      noiseLevel: 0.02,
    },
  },

  // ── Meatwad (Aqua Teen Hunger Force) ───────────────────────────
  {
    id: 'pop-atf-meatwad',
    name: 'Meatwad',
    character: 'Meatwad (Aqua Teen Hunger Force)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Deep red-brown ground-beef signature. Simple, good-hearted, and genuinely the moral center of the Hunger Force. Stable blade in a saturated meat-red that\'s warm rather than sith-crimson — a color that reads as "friend" despite the substrate.',
    hiltNotes:
      'Rounded red-brown rolled-meat grip with no formal guard, two dots of iceberg lettuce near the emitter.',
    config: {
      name: 'Meatwad',
      baseColor: { r: 150, g: 30, b: 10 },
      clashColor: { r: 255, g: 160, b: 120 },
      lockupColor: { r: 200, g: 70, b: 40 },
      blastColor: { r: 255, g: 180, b: 140 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Brock Samson (Venture Bros) ────────────────────────────────
  {
    id: 'pop-vb-brock-samson',
    name: 'Brock Samson',
    character: 'Brock Samson (The Venture Bros)',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'sith',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'OSI bodyguard, mullet, knife. Blood-red unstable blade with elevated shimmer — the preset embodies Brock\'s Led-Zeppelin-scored kill-streak energy rather than a disciplined warrior. Violence as art form.',
    hiltNotes:
      'Black leather-wrapped grip, brass accents, combat-knife-style false-edge crossguard, no frills.',
    config: {
      name: 'BrockSamson',
      baseColor: { r: 200, g: 20, b: 20 },
      clashColor: { r: 255, g: 180, b: 180 },
      lockupColor: { r: 240, g: 60, b: 50 },
      blastColor: { r: 255, g: 200, b: 200 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 360,
      retractionMs: 460,
      shimmer: 0.4,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.15,
    },
  },
];
