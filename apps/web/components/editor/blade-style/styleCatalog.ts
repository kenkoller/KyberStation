// ─── Blade-style catalog — Sidebar A/B v2 Phase 2 ──────────────────────
//
// Shared between BladeStyleColumnA (the 29-row list) and BladeStyleColumnB
// (the deep-editor header). Mirrors the `BLADE_STYLES` array that legacy
// `StylePanel.tsx` keeps inline; if a new style ships, both lists need to
// grow together.
//
// Kept alongside the column components rather than promoted to /lib
// because it's the single source of truth for ONE feature (the A/B
// blade-style section). When more sections migrate to A/B and want
// similar catalogs (color presets, ignition flavors), each can keep its
// own catalog colocated with its column components — the lib boundary
// gets crossed only when a piece is actually consumed by ≥2 features.

export interface BladeStyleCatalogEntry {
  id: string;
  label: string;
  desc: string;
}

export const BLADE_STYLES: ReadonlyArray<BladeStyleCatalogEntry> = [
  { id: 'stable',         label: 'Stable',          desc: 'Classic solid blade' },
  { id: 'unstable',       label: 'Unstable',        desc: 'Kylo Ren crackling energy' },
  { id: 'fire',           label: 'Fire',            desc: 'Flame-like animated blade' },
  { id: 'pulse',          label: 'Pulse',           desc: 'Rhythmic energy pulse' },
  { id: 'rotoscope',      label: 'Rotoscope',       desc: 'Film-accurate OT shimmer' },
  { id: 'gradient',       label: 'Gradient',        desc: 'Multi-color gradient blend' },
  { id: 'photon',         label: 'Photon Blade',    desc: 'Particle stream effect' },
  { id: 'plasma',         label: 'Plasma Storm',    desc: 'Chaotic plasma arcs' },
  { id: 'crystalShatter', label: 'Crystal Shatter', desc: 'Fractured kyber effect' },
  { id: 'aurora',         label: 'Aurora',          desc: 'Northern lights shimmer' },
  { id: 'cinder',         label: 'Cinder',          desc: 'Dying ember trail' },
  { id: 'prism',          label: 'Prism',           desc: 'Rainbow refraction' },
  { id: 'dataStream',     label: 'Data Stream',     desc: 'Traveling data packets' },
  { id: 'gravity',        label: 'Gravity',         desc: 'Accelerometer-driven pooling' },
  { id: 'ember',          label: 'Ember',           desc: 'Rising ember particles' },
  { id: 'automata',       label: 'Automata',        desc: 'Cellular automaton pattern' },
  { id: 'helix',          label: 'Helix',           desc: 'Double helix sine waves' },
  { id: 'candle',         label: 'Candle',          desc: 'Fbm flicker with gust events' },
  { id: 'shatter',        label: 'Shatter',         desc: 'Independent shard pulses' },
  { id: 'neutron',        label: 'Neutron',         desc: 'Bouncing particle with trail' },
  { id: 'torrent',        label: 'Torrent',         desc: 'Rushing energy torrent' },
  { id: 'moire',          label: 'Moiré',      desc: 'Moiré interference pattern' },
  { id: 'cascade',        label: 'Cascade',         desc: 'Cascading energy waves' },
  { id: 'vortex',         label: 'Vortex',          desc: 'Swirling vortex effect' },
  { id: 'nebula',         label: 'Nebula',          desc: 'Cosmic nebula clouds' },
  { id: 'tidal',          label: 'Tidal',           desc: 'Tidal wave oscillation' },
  { id: 'mirage',         label: 'Mirage',          desc: 'Heat shimmer mirage' },
  { id: 'painted',        label: 'Painted',         desc: 'Hand-painted blade colors' },
  { id: 'imageScroll',    label: 'Image Scroll',    desc: 'Scroll an image for light painting' },
  { id: 'sithFlicker',    label: 'Sith Flicker',    desc: 'Vader / Inquisitor unstable flicker' },
  { id: 'bladeCharge',    label: 'Blade Charge',    desc: 'Energy pools to tip on swing' },
  { id: 'tempoLock',      label: 'Tempo Lock',      desc: 'BPM-locked rhythmic pulse' },
];

// ─── Style-specific parameter defs ─────────────────────────────────────
//
// Mirrors the inline `STYLE_PARAMS` table in legacy `StylePanel.tsx`. Same
// shape (key / label / min / max / step / defaultValue) so consumers can
// drop in either source and the rendered slider grid is identical.

export interface StyleParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export const STYLE_PARAMS: Record<string, StyleParamDef[]> = {
  fire: [
    { key: 'fireSize',   label: 'Fire Size',   min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
    { key: 'sparkRate',  label: 'Spark Rate',  min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
    { key: 'heatSpread', label: 'Heat Spread', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  aurora: [
    { key: 'waveCount',  label: 'Wave Count',  min: 1, max: 8, step: 1,   defaultValue: 3 },
    { key: 'driftSpeed', label: 'Drift Speed', min: 0, max: 2, step: 0.1, defaultValue: 0.5 },
  ],
  plasma: [
    { key: 'frequency',  label: 'Frequency',   min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
    { key: 'phaseSpeed', label: 'Phase Speed', min: 0,   max: 3, step: 0.1, defaultValue: 1 },
  ],
  prism: [
    { key: 'facets',         label: 'Facets',         min: 2, max: 12, step: 1,   defaultValue: 6 },
    { key: 'rotationSpeed',  label: 'Rotation Speed', min: 0, max: 5,  step: 0.1, defaultValue: 1 },
  ],
  gradient: [
    { key: 'gradientSpeed', label: 'Scroll Speed', min: 0, max: 3, step: 0.1, defaultValue: 0.5 },
  ],
  pulse: [
    { key: 'pulseSpeed',     label: 'Pulse Speed',     min: 0.5, max: 5, step: 0.1,  defaultValue: 1 },
    { key: 'pulseMinBright', label: 'Min Brightness',  min: 0,   max: 1, step: 0.05, defaultValue: 0.3 },
  ],
  unstable: [
    { key: 'flicker', label: 'Flicker Intensity', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  painted: [],
  imageScroll: [],
  sithFlicker: [
    { key: 'flickerRate',      label: 'Flicker Rate (Hz)', min: 3, max: 8, step: 0.5,  defaultValue: 5 },
    { key: 'flickerMinBright', label: 'Min Brightness',    min: 0, max: 0.3, step: 0.01, defaultValue: 0.1 },
  ],
  bladeCharge: [
    { key: 'chargeExponent', label: 'Tip Pooling',  min: 1,   max: 3, step: 0.1,  defaultValue: 1.5 },
    { key: 'chargeBoost',    label: 'Charge Boost', min: 0.1, max: 1, step: 0.05, defaultValue: 0.6 },
  ],
  tempoLock: [
    { key: 'tempoBpm',   label: 'BPM',         min: 60, max: 180, step: 1,   defaultValue: 120 },
    { key: 'tempoDepth', label: 'Pulse Depth', min: 0,  max: 1,   step: 0.05, defaultValue: 0.5 },
  ],
};

/**
 * Resolve a style id → catalog entry, or `undefined` if the id isn't
 * known. Callers fall back to a placeholder header in that case rather
 * than the entire Column B going blank.
 */
export function getBladeStyle(id: string): BladeStyleCatalogEntry | undefined {
  return BLADE_STYLES.find((s) => s.id === id);
}
