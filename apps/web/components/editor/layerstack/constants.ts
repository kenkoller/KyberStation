import type { LayerType } from '@/stores/layerStore';

export const BLADE_STYLES = [
  { id: 'stable', label: 'Stable' },
  { id: 'unstable', label: 'Unstable' },
  { id: 'fire', label: 'Fire' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'rotoscope', label: 'Rotoscope' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'photon', label: 'Photon' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'crystalShatter', label: 'Crystal Shatter' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'cinder', label: 'Cinder' },
  { id: 'prism', label: 'Prism' },
  { id: 'dataStream', label: 'Data Stream' },
  { id: 'gravity', label: 'Gravity' },
  { id: 'ember', label: 'Ember' },
  { id: 'automata', label: 'Automata' },
  { id: 'helix', label: 'Helix' },
  { id: 'candle', label: 'Candle' },
  { id: 'shatter', label: 'Shatter' },
  { id: 'neutron', label: 'Neutron' },
  { id: 'torrent', label: 'Torrent' },
  { id: 'moire', label: 'Moir\u00e9' },
  { id: 'cascade', label: 'Cascade' },
  { id: 'vortex', label: 'Vortex' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'tidal', label: 'Tidal' },
  { id: 'mirage', label: 'Mirage' },
];

export const EFFECT_TYPES = [
  { id: 'clash', label: 'Clash Flash' },
  { id: 'blast', label: 'Blast Spots' },
  { id: 'lockup', label: 'Lockup Glow' },
  { id: 'drag', label: 'Drag Sparks' },
  { id: 'melt', label: 'Melt Tip' },
  { id: 'lightning', label: 'Lightning Block' },
  { id: 'stab', label: 'Stab Flash' },
  { id: 'force', label: 'Force Effect' },
  { id: 'shockwave', label: 'Shockwave' },
  { id: 'scatter', label: 'Scatter Burst' },
  { id: 'fragment', label: 'Fragment' },
  { id: 'ripple', label: 'Ripple Waves' },
  { id: 'freeze', label: 'Freeze Crystal' },
  { id: 'overcharge', label: 'Overcharge' },
  { id: 'bifurcate', label: 'Bifurcate' },
  { id: 'invert', label: 'Invert' },
  { id: 'preon', label: 'Preon' },
  { id: 'postoff', label: 'Post-Off' },
  { id: 'emitter', label: 'Emitter' },
  { id: 'rain', label: 'Rain' },
  { id: 'fire', label: 'Fire Distortion' },
];

// 2026-04-29 (Hardware Fidelity tighten): BLEND_MODES export retired.
// Of the 4 modes previously exposed in the LayerRow dropdown, only
// `'normal'` (alpha-over via lerp) round-trips to a ProffieOS template;
// the other 3 (add / multiply / screen) were visualizer-only fakes.
// See docs/HARDWARE_FIDELITY_PRINCIPLE.md.

export const TYPE_BADGES: Record<LayerType, { color: string; label: string }> = {
  base: { color: 'bg-blue-500', label: 'B' },
  effect: { color: 'bg-yellow-500', label: 'E' },
  accent: { color: 'bg-green-500', label: 'A' },
  mix: { color: 'bg-purple-500', label: 'M' },
  // SmoothSwing is a modulator plate — no pixel output. Slate badge +
  // \u25CE glyph in the thumbnail keeps it visually distinct from the
  // visual-layer rows without borrowing a visual-layer color.
  smoothswing: { color: 'bg-slate-400', label: 'S' },
};

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, c))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}
