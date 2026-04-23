import type { Preset } from '../../types.js';

/**
 * Cereal & snack mascot pop-culture presets.
 *
 * Deeply silly, entirely unofficial fan tribute blades inspired by the
 * iconic spokes-characters of the American breakfast-and-vending-machine
 * industrial complex. None of these are real — nor is there any universe
 * in which Tony the Tiger wields a lightsaber — but if Kellogg's ever
 * decides to cross the streams, KyberStation is ready.
 *
 * Notes on era/affiliation:
 * - `era` uses `'expanded-universe'` because the Preset type's `Era` union
 *   does not include a dedicated pop-culture value. The
 *   `continuity: 'pop-culture'` field is the authoritative source for
 *   gallery filtering.
 * - `affiliation` is `'neutral'` for all entries — these mascots are
 *   beholden only to the dictates of their respective cereal box quests.
 *   Chester Cheetah leans a little chaotic, but we're not going to call
 *   him Sith over it.
 */
export const MASCOT_PRESETS: Preset[] = [
  // ── Tony the Tiger (Frosted Flakes) ─────────────────────────────
  {
    id: 'pop-mascot-tony-tiger',
    name: 'Tony the Tiger',
    character: 'Tony the Tiger',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "The official saber of breakfast champions. Blazing tiger orange with a subtle banded gradient evoking stripes on a sun-warmed pelt. They're GR-R-REAT! Forged in the cereal aisle at dawn, tempered in whole milk, quenched in a bowl no spoon has yet disturbed.",
    hiltNotes:
      'Orange-striped grip with a tiger-paw pommel. Kellogg\'s-certified; red bandana optional but strongly encouraged.',
    config: {
      name: 'TonyTiger',
      baseColor: { r: 255, g: 140, b: 0 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 180, b: 0 },
      blastColor: { r: 255, g: 240, b: 200 },
      style: 'gradient',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 300,
      retractionMs: 400,
      shimmer: 0.12,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.04,
      gradientStops: [
        { position: 0, color: { r: 255, g: 100, b: 0 } },
        { position: 0.5, color: { r: 255, g: 170, b: 40 } },
        { position: 1, color: { r: 255, g: 120, b: 0 } },
      ],
    },
  },

  // ── Toucan Sam (Froot Loops) ────────────────────────────────────
  {
    id: 'pop-mascot-toucan-sam',
    name: 'Toucan Sam',
    character: 'Toucan Sam',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Follow your nose — it always knows. A full-spectrum rainbow blade that sweeps from cherry-red at the emitter through orange, yellow, green, and blue to grape-purple at the tip. Every color of the Froot Loops rainbow, rendered as an honest one-dimensional gradient. A beak-forward saber with nothing to hide.',
    hiltNotes:
      'Sky-blue grip with a rainbow-striped pommel and a prominent hook-beak crossguard. Technically a beak, not a guard.',
    config: {
      name: 'ToucanSam',
      baseColor: { r: 255, g: 140, b: 140 },
      clashColor: { r: 255, g: 255, b: 255 },
      lockupColor: { r: 255, g: 240, b: 180 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'gradient',
      ignition: 'scroll',
      retraction: 'scroll',
      ignitionMs: 500,
      retractionMs: 600,
      shimmer: 0.18,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.06,
      gradientStops: [
        { position: 0, color: { r: 255, g: 40, b: 50 } },
        { position: 0.2, color: { r: 255, g: 140, b: 20 } },
        { position: 0.4, color: { r: 255, g: 230, b: 40 } },
        { position: 0.6, color: { r: 60, g: 220, b: 80 } },
        { position: 0.8, color: { r: 40, g: 120, b: 255 } },
        { position: 1, color: { r: 180, g: 60, b: 220 } },
      ],
    },
  },

  // ── Kool-Aid Man ────────────────────────────────────────────────
  {
    id: 'pop-mascot-kool-aid-man',
    name: 'Kool-Aid Man',
    character: 'Kool-Aid Man',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "OH YEAH!!! Explosive cherry-red sugary plasma contained in a glass pitcher that has absolutely no business being a lightsaber. Fast ignition — he bursts through the wall at a full sprint, and his saber does too. Every clash is a small home-renovation project.",
    hiltNotes:
      'Clear glass-pitcher hilt with cherry-red fill visible through the walls. A smiling face is painted on one side. Structurally questionable; vibes impeccable.',
    config: {
      name: 'KoolAid',
      baseColor: { r: 255, g: 20, b: 30 },
      clashColor: { r: 255, g: 200, b: 120 },
      lockupColor: { r: 255, g: 60, b: 20 },
      blastColor: { r: 255, g: 120, b: 80 },
      style: 'fire',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 150,
      retractionMs: 300,
      shimmer: 0.28,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.1,
    },
  },

  // ── Mr. Peanut (Planters) ───────────────────────────────────────
  {
    id: 'pop-mascot-mr-peanut',
    name: 'Mr. Peanut',
    character: 'Mr. Peanut',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'The refined gentleman\'s blade. Warm tan-beige with a subtle monocle-gold shimmer — the color of a properly-roasted peanut held up to afternoon light. Stable, dignified, and never without a top hat. Please address as "Mr. Peanut" even in the heat of a duel.',
    hiltNotes:
      'Monocle-gold ribbed grip with a walking-cane crossguard and a tiny top-hat pommel. Spats, if they made them for hilts, would be included.',
    config: {
      name: 'MrPeanut',
      baseColor: { r: 220, g: 190, b: 140 },
      clashColor: { r: 255, g: 230, b: 160 },
      lockupColor: { r: 240, g: 210, b: 150 },
      blastColor: { r: 255, g: 240, b: 200 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 380,
      retractionMs: 480,
      shimmer: 0.06,
      ledCount: 144,
      swingFxIntensity: 0.18,
      noiseLevel: 0.02,
    },
  },

  // ── Cap'n Crunch ────────────────────────────────────────────────
  {
    id: 'pop-mascot-capn-crunch',
    name: "Cap'n Crunch",
    character: "Cap'n Crunch",
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'A Captain\'s blade, fit for the bridge of the S.S. Guppy. Deep nautical navy with gold trim that evokes epaulets and bicorn braid. Stays stable through rough seas and the first splash of milk — the breakfast bowl holds no terrors for one who has tasted the Crunchberry.',
    hiltNotes:
      'Navy-wrapped grip with gold admiralty fittings, a bicorn-hat pommel, and an anchor motif etched into the guard.',
    config: {
      name: 'CapnCrunch',
      baseColor: { r: 20, g: 40, b: 160 },
      clashColor: { r: 255, g: 220, b: 80 },
      lockupColor: { r: 60, g: 100, b: 200 },
      blastColor: { r: 255, g: 240, b: 180 },
      style: 'stable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 360,
      retractionMs: 460,
      shimmer: 0.08,
      ledCount: 144,
      swingFxIntensity: 0.2,
      noiseLevel: 0.03,
    },
  },

  // ── Chester Cheetah (Cheetos) ───────────────────────────────────
  {
    id: 'pop-mascot-chester-cheetah',
    name: 'Chester Cheetah',
    character: 'Chester Cheetah',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Dangerously cheesy. An unstable orange blade with an erratic leopard-spot flicker — each clash leaves a faint orange residue on anything you touch for the next forty-five minutes. Wear gloves. Or don\'t. Chester doesn\'t, and look at him.',
    hiltNotes:
      'Orange grip with irregular black-spotted wrap, sunglasses-shaped crossguard, and a pom-pom-tail pommel.',
    config: {
      name: 'ChesterCheetah',
      baseColor: { r: 255, g: 140, b: 50 },
      clashColor: { r: 255, g: 240, b: 180 },
      lockupColor: { r: 255, g: 160, b: 70 },
      blastColor: { r: 255, g: 200, b: 120 },
      style: 'unstable',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 320,
      retractionMs: 420,
      shimmer: 0.3,
      ledCount: 144,
      swingFxIntensity: 0.4,
      noiseLevel: 0.18,
    },
  },

  // ── Mr. Clean ───────────────────────────────────────────────────
  {
    id: 'pop-mascot-mr-clean',
    name: 'Mr. Clean',
    character: 'Mr. Clean',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      'Pristine, brilliant, and absolutely spotless. A full-white blade with a light-blue aurora shimmer that suggests freshly-mopped linoleum under fluorescent light. One cross-armed stare and every grease stain in the galaxy surrenders.',
    hiltNotes:
      'Mirror-polished chrome grip with a single gold earring at the pommel. Arms crossed sold separately. Bald head not included but strongly implied.',
    config: {
      name: 'MrClean',
      baseColor: { r: 255, g: 255, b: 255 },
      clashColor: { r: 200, g: 230, b: 255 },
      lockupColor: { r: 230, g: 240, b: 255 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: 'aurora',
      ignition: 'standard',
      retraction: 'standard',
      ignitionMs: 420,
      retractionMs: 500,
      shimmer: 0.2,
      ledCount: 144,
      swingFxIntensity: 0.25,
      noiseLevel: 0.04,
    },
  },

  // ── Lucky the Leprechaun (Lucky Charms) ─────────────────────────
  {
    id: 'pop-mascot-lucky-leprechaun',
    name: 'Lucky the Leprechaun',
    character: 'Lucky',
    era: 'expanded-universe',
    continuity: 'pop-culture',
    affiliation: 'neutral',
    tier: 'detailed',
    screenAccurate: false,
    author: 'KyberStation',
    description:
      "They're magically delicious. Rainbow aurora blade with a warm gold core — hearts, stars, horseshoes, clovers, and blue moons not technically included, but you can almost see them at the edge of perception. Chase this saber across the galaxy and you'll find a pot of kyber at the end of it.",
    hiltNotes:
      'Emerald-green grip with a gold-buckle crossguard, four-leaf-clover pommel accent, and a tiny black top hat that tips politely on activation.',
    config: {
      name: 'LuckyLeprechaun',
      baseColor: { r: 255, g: 200, b: 60 },
      clashColor: { r: 255, g: 255, b: 200 },
      lockupColor: { r: 255, g: 220, b: 100 },
      blastColor: { r: 255, g: 240, b: 160 },
      style: 'aurora',
      ignition: 'scroll',
      retraction: 'standard',
      ignitionMs: 500,
      retractionMs: 600,
      shimmer: 0.25,
      ledCount: 144,
      swingFxIntensity: 0.35,
      noiseLevel: 0.08,
      gradientStops: [
        { position: 0, color: { r: 255, g: 200, b: 60 } },
        { position: 0.25, color: { r: 255, g: 80, b: 80 } },
        { position: 0.45, color: { r: 255, g: 180, b: 40 } },
        { position: 0.6, color: { r: 60, g: 220, b: 80 } },
        { position: 0.8, color: { r: 40, g: 140, b: 255 } },
        { position: 1, color: { r: 180, g: 80, b: 220 } },
      ],
    },
  },
];
