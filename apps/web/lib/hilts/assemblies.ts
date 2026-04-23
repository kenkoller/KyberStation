/**
 * Canonical assembly definitions. Each assembly is a curated
 * top-to-bottom stack of parts (by id) that renders as a complete
 * lightsaber hilt. Preset bindings reference assemblies by id.
 *
 * Connector diameters within each assembly mate in strict mode —
 * verified by `hiltAssemblies.test.ts`. When designing new assemblies,
 * check each part's connector classes in `parts/<type>/<id>.ts`.
 */

import type { HiltAssembly } from './types';

/**
 * Graflex — single-classic archetype.
 * Skywalker-lineage inspiration. Brass clamp + T-tracks grip.
 */
export const graflexAssembly: HiltAssembly = {
  id: 'graflex',
  displayName: 'Graflex',
  archetype: 'single-classic',
  era: 'original',
  faction: 'jedi',
  description:
    'Classic single-hilt inspired by the Graflex 3-cell flash-gun. '
    + 'Brass clamp band and T-tracks grip.',
  parts: [
    { partId: 'graflex-emitter' },
    { partId: 'graflex-switch' },
    { partId: 't-tracks-grip' },
    { partId: 'classic-pommel' },
  ],
};

/**
 * MPP — single-dark archetype.
 * Vader-lineage. MPP-microphone-derived emitter + black-grip body.
 */
export const mppAssembly: HiltAssembly = {
  id: 'mpp',
  displayName: 'MPP',
  archetype: 'single-dark',
  era: 'original',
  faction: 'sith',
  description:
    'Dark single-hilt inspired by the MPP microphone prop. '
    + 'Tall bell emitter, black-grip body, flat cap.',
  parts: [
    { partId: 'mpp-emitter' },
    { partId: 'dark-switch' },
    { partId: 'mpp-grip' },
    { partId: 'dark-pommel' },
  ],
};

/**
 * Negotiator — single-ornate archetype.
 * Obi-Wan Kenobi ROTS inspiration. Collared emitter + multi-step finial.
 */
export const negotiatorAssembly: HiltAssembly = {
  id: 'negotiator',
  displayName: 'Negotiator',
  archetype: 'single-ornate',
  era: 'prequel',
  faction: 'jedi',
  description:
    'Elegant single-hilt with stepped/collared emitter, ribbed grip, '
    + 'and ornate multi-step pommel finial.',
  parts: [
    { partId: 'ornate-emitter' },
    { partId: 'negotiator-switch' },
    { partId: 'ribbed-grip' },
    { partId: 'ornate-pommel' },
  ],
};

/**
 * Count — curved archetype.
 * Dooku inspiration. Fully curved grip for dueling-stance advantage.
 */
export const countAssembly: HiltAssembly = {
  id: 'count',
  displayName: 'Count',
  archetype: 'curved',
  era: 'prequel',
  faction: 'sith',
  description:
    'Curved-grip single-hilt — bent silhouette throughout, bronze '
    + 'accents, rounded pommel. Dueling-stance optimised.',
  parts: [
    { partId: 'curved-emitter' },
    { partId: 'curved-switch' },
    { partId: 'curved-grip' },
    { partId: 'curved-pommel' },
  ],
};

/**
 * Shoto (Sage) — shoto archetype.
 * Yoda inspiration. Compact hilt, narrow interface diameters throughout.
 */
export const shotoSageAssembly: HiltAssembly = {
  id: 'shoto-sage',
  displayName: 'Shoto (Sage)',
  archetype: 'shoto',
  era: 'prequel',
  faction: 'jedi',
  description:
    'Compact shoto hilt with narrow interfaces throughout. Built for '
    + 'close-quarters lightsaber forms.',
  parts: [
    { partId: 'compact-emitter' },
    { partId: 'sage-switch' },
    { partId: 'short-grip' },
    { partId: 'sage-pommel' },
  ],
};

/**
 * Vented Crossguard — crossguard archetype.
 * Kylo Ren inspiration. Emitter → quillon → body sequence for the
 * signature cross-blade silhouette. Uses dark-switch for the main body
 * since the quillon's standard bottom requires a standard-top switch.
 */
export const renVentAssembly: HiltAssembly = {
  id: 'ren-vent',
  displayName: 'Vented Crossguard',
  archetype: 'crossguard',
  era: 'sequel',
  faction: 'sith',
  description:
    'Unstable vented emitter with a lateral crossguard quillon, '
    + 'dark switch block, cross-wrap taped grip, and rough raw pommel.',
  parts: [
    { partId: 'vented-emitter' },
    { partId: 'crossguard-quillon' },
    { partId: 'dark-switch' },
    { partId: 'taped-grip' },
    { partId: 'raw-pommel' },
  ],
};

/**
 * Zabrak Staff — double archetype.
 * Darth Maul saberstaff inspiration. Two emitters bracketing a long body.
 */
export const zabrakStaffAssembly: HiltAssembly = {
  id: 'zabrak-staff',
  displayName: 'Staff',
  archetype: 'double',
  era: 'prequel',
  faction: 'sith',
  description:
    'Double-bladed saberstaff — symmetric emitters at each end '
    + 'bracketing a long staff body.',
  parts: [
    { partId: 'dual-emitter-top' },
    { partId: 'staff-body' },
    { partId: 'dual-emitter-bottom' },
  ],
};

/**
 * Fulcrum Pair — dual-shoto archetype.
 * Ahsoka Rebels-era. This assembly describes ONE of the two hilts —
 * the pair is rendered side-by-side (or mirrored) at presentation time.
 * All-narrow interfaces for the compact geometry.
 */
export const fulcrumPairAssembly: HiltAssembly = {
  id: 'fulcrum-pair',
  displayName: 'Fulcrum Pair',
  archetype: 'dual-shoto',
  era: 'sequel',
  faction: 'grey',
  description:
    'Dual-shoto companion hilt — sleek narrow interfaces throughout, '
    + 'pointed pommel. Paired with a mirror of itself at presentation.',
  parts: [
    { partId: 'compact-emitter' },
    { partId: 'fulcrum-switch' },
    { partId: 'fulcrum-grip' },
    { partId: 'pointed-pommel' },
  ],
};

/**
 * Windu — single-classic archetype.
 * Mace Windu inspiration. Flat-top silver-bezel emitter, fluted
 * silver-banded grip, bullet-capped silver pommel.
 */
export const winduAssembly: HiltAssembly = {
  id: 'windu',
  displayName: 'Windu',
  archetype: 'single-classic',
  era: 'prequel',
  faction: 'jedi',
  description:
    'Precision-machined Jedi hilt with silver bezels and a flat-top '
    + 'aperture — ceremonial, minimalist, unmistakably Council-grade.',
  parts: [
    { partId: 'flat-top' },
    { partId: 'windu-switch' },
    { partId: 'windu-grip' },
    { partId: 'windu-pommel' },
  ],
};

/**
 * Luke ROTJ — single-classic archetype.
 * Luke Skywalker's self-built Return of the Jedi hilt. Tapered
 * emitter, clean ringed grip, classic pommel. No brass clamp.
 */
export const lukeRotjAssembly: HiltAssembly = {
  id: 'luke-rotj',
  displayName: 'Luke ROTJ',
  archetype: 'single-classic',
  era: 'original',
  faction: 'jedi',
  description:
    'Self-built Jedi hilt with a scooped funnel emitter and precise '
    + 'triple-ring grip detail. Restrained, purposeful lathework.',
  parts: [
    { partId: 'tapered' },
    { partId: 'graflex-switch' },
    { partId: 'luke-rotj-grip' },
    { partId: 'classic-pommel' },
  ],
};

/**
 * Qui-Gon — single-classic archetype.
 * Qui-Gon Jinn inspiration. Graflex-style hardware with a ribbed
 * prequel-era grip between. Same classic emitter, different body feel.
 */
export const quiGonAssembly: HiltAssembly = {
  id: 'qui-gon',
  displayName: 'Qui-Gon',
  archetype: 'single-classic',
  era: 'prequel',
  faction: 'jedi',
  description:
    'Graflex-descended Jedi hilt with a ribbed prequel-era grip. '
    + 'Brass clamp and classic cap bracket a machined body.',
  parts: [
    { partId: 'graflex-emitter' },
    { partId: 'graflex-switch' },
    { partId: 'ribbed-grip' },
    { partId: 'classic-pommel' },
  ],
};

/**
 * Savage — single-dark archetype.
 * Savage Opress / Maul-single inspiration. Stout dark emitter,
 * taped grip, raw-hewn pommel. Dathomirian barbarism.
 */
export const savageAssembly: HiltAssembly = {
  id: 'savage',
  displayName: 'Savage',
  archetype: 'single-dark',
  era: 'prequel',
  faction: 'sith',
  description:
    'Stout Zabrak single-hilt with a dark-banded emitter, wrap-taped '
    + 'grip, and raw-hewn pommel. Blunt, brutal, Dathomiri-forged.',
  parts: [
    { partId: 'maul-emitter' },
    { partId: 'dark-switch' },
    { partId: 'taped-grip' },
    { partId: 'raw-pommel' },
  ],
};

/**
 * Inquisitor — single-ornate archetype.
 * Imperial-era Inquisitor inspiration. Ringed emitter (suggests
 * spin-mechanism), dual-pad control, disk mount. Single-hilt variant.
 */
export const inquisitorAssembly: HiltAssembly = {
  id: 'inquisitor',
  displayName: 'Inquisitor',
  archetype: 'single-ornate',
  era: 'original',
  faction: 'sith',
  description:
    'Imperial Inquisitor single-hilt with a silver ring-mount at the '
    + 'emitter, twin-pad control strip, and a disk pommel. Mechanically '
    + 'dense; built for the spinning-blade variant.',
  parts: [
    { partId: 'ringed-emitter' },
    { partId: 'inquisitor-switch' },
    { partId: 'ribbed-grip' },
    { partId: 'inquisitor-mount' },
  ],
};

/**
 * Cal Kestis — single-classic archetype.
 * Jedi: Fallen Order / Survivor-era Cal Kestis. Graflex-lineage hardware
 * with a leather-wrap mid-body accent and covertec-clipped grip.
 */
export const calKestisAssembly: HiltAssembly = {
  id: 'cal-kestis',
  displayName: 'Cal Kestis',
  archetype: 'single-classic',
  era: 'original',
  faction: 'grey',
  description:
    'Post-Purge survivor hilt — Graflex-lineage emitter and clamp, '
    + 'leather-wrap accent, covertec belt-clip grip. Quiet, '
    + 'roadworn, purposeful.',
  parts: [
    { partId: 'graflex-emitter' },
    { partId: 'graflex-switch' },
    { partId: 'leather-wrap' },
    { partId: 'covertec-grip' },
    { partId: 'raw-pommel' },
  ],
};

/**
 * Starkiller — single-dark archetype.
 * Legends-era Galen Marek / Force Unleashed inspiration. MPP-style
 * emitter, activation-box clamp, T-tracks grip — a cobbled-together
 * secret apprentice's weapon.
 */
export const starkillerAssembly: HiltAssembly = {
  id: 'starkiller',
  displayName: 'Starkiller',
  archetype: 'single-dark',
  era: 'legends',
  faction: 'sith',
  description:
    'Legends-era apprentice hilt mashing MPP lineage with a brass '
    + 'activation box and T-tracks grip. Cobbled-together by '
    + 'design, lethal by intent.',
  parts: [
    { partId: 'mpp-emitter' },
    { partId: 'activation-box' },
    { partId: 'dark-switch' },
    { partId: 't-tracks-grip' },
    { partId: 'raw-pommel' },
  ],
};

/**
 * Palpatine — single-ornate archetype.
 * Ceremonial Sith hilt with gold accents — Emperor / Senate-guard
 * aesthetic. Ornate hardware bracketing a gold-banded body.
 */
export const palpatineAssembly: HiltAssembly = {
  id: 'palpatine',
  displayName: 'Palpatine',
  archetype: 'single-ornate',
  era: 'prequel',
  faction: 'sith',
  description:
    'Ceremonial Sith hilt with polished gold accents, multi-step '
    + 'ornate finial, and engraved rings. Senate-era regalia; '
    + 'every detail is a declaration.',
  parts: [
    { partId: 'ornate-emitter' },
    { partId: 'gold-band' },
    { partId: 'negotiator-switch' },
    { partId: 'ribbed-grip' },
    { partId: 'ornate-pommel' },
  ],
};

export const ASSEMBLY_CATALOG: Record<string, HiltAssembly> = {
  [graflexAssembly.id]: graflexAssembly,
  [mppAssembly.id]: mppAssembly,
  [negotiatorAssembly.id]: negotiatorAssembly,
  [countAssembly.id]: countAssembly,
  [shotoSageAssembly.id]: shotoSageAssembly,
  [renVentAssembly.id]: renVentAssembly,
  [zabrakStaffAssembly.id]: zabrakStaffAssembly,
  [fulcrumPairAssembly.id]: fulcrumPairAssembly,
  [winduAssembly.id]: winduAssembly,
  [lukeRotjAssembly.id]: lukeRotjAssembly,
  [quiGonAssembly.id]: quiGonAssembly,
  [savageAssembly.id]: savageAssembly,
  [inquisitorAssembly.id]: inquisitorAssembly,
  [calKestisAssembly.id]: calKestisAssembly,
  [starkillerAssembly.id]: starkillerAssembly,
  [palpatineAssembly.id]: palpatineAssembly,
};

export function getAssembly(id: string): HiltAssembly | undefined {
  return ASSEMBLY_CATALOG[id];
}

export function allAssemblies(): HiltAssembly[] {
  return Object.values(ASSEMBLY_CATALOG);
}
