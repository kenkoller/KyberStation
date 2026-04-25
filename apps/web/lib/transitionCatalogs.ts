// ─── Shared transition catalogs (v0.14.0 PR 5a) ──────────────────────────────
//
// Single source of truth for the 19 ignition + 13 retraction styles. Prior
// to this module the catalogs were duplicated inline across three sites:
//
//   components/editor/IgnitionRetractionPanel.tsx    (deep-tuning panel)
//   components/editor/quick/QuickIgnitionPicker.tsx  (Inspector sidebar)
//   components/editor/quick/QuickRetractionPicker.tsx (Inspector sidebar)
//
// The duplication was flagged during PR 3 as a drift risk — if either list
// gained or renamed an entry without the others, the two surfaces would
// disagree about which transitions exist. Extracting here collapses that
// risk; both surfaces now import the same tables.
//
// If you add / rename a transition style, update it here and every consumer
// picks it up automatically (plus MGP thumbnail lookups via
// `lib/ignitionThumbnails.ts` + `lib/retractionThumbnails.ts` — add the
// entry there too so the picker UI has a thumbnail to show).

export interface TransitionStyle {
  /** Machine id — matches the engine's ignition / retraction registry. */
  id: string;
  /** Human-facing display label shown next to the thumbnail. */
  label: string;
  /** One-line description surfaced as the MGP tooltip + thumbnail caption. */
  desc: string;
}

export const IGNITION_STYLES: ReadonlyArray<TransitionStyle> = [
  { id: 'standard',     label: 'Standard',    desc: 'Classic linear ignition' },
  { id: 'scroll',       label: 'Scroll',      desc: 'Scrolling pixel fill' },
  { id: 'spark',        label: 'Spark',       desc: 'Crackling spark ignition' },
  { id: 'center',       label: 'Center Out',  desc: 'Ignites from center' },
  { id: 'wipe',         label: 'Wipe',        desc: 'Soft wipe reveal' },
  { id: 'stutter',      label: 'Stutter',     desc: 'Flickering unstable ignition' },
  { id: 'glitch',       label: 'Glitch',      desc: 'Digital glitch effect' },
  { id: 'twist',        label: 'Twist',       desc: 'Spiral ignition driven by twist' },
  { id: 'swing',        label: 'Swing',       desc: 'Speed-reactive swing ignition' },
  { id: 'stab',         label: 'Stab',        desc: 'Rapid center-out burst' },
  { id: 'crackle',      label: 'Crackle',     desc: 'Random segment flicker fill' },
  { id: 'fracture',     label: 'Fracture',    desc: 'Radiating crack points' },
  { id: 'flash-fill',   label: 'Flash Fill',  desc: 'White flash then color wipe' },
  { id: 'pulse-wave',   label: 'Pulse Wave',  desc: 'Sequential building waves' },
  { id: 'drip-up',      label: 'Drip Up',     desc: 'Fluid upward flow' },
  { id: 'hyperspace',   label: 'Hyperspace',  desc: 'Streaking star-line ignition' },
  { id: 'summon',       label: 'Summon',      desc: 'Force-pull ignition' },
  { id: 'seismic',      label: 'Seismic',     desc: 'Ground-shake ripple ignition' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

export const RETRACTION_STYLES: ReadonlyArray<TransitionStyle> = [
  { id: 'standard',     label: 'Standard',    desc: 'Linear retraction' },
  { id: 'scroll',       label: 'Scroll',      desc: 'Scrolling retract' },
  { id: 'fadeout',      label: 'Fade Out',    desc: 'Fading retraction' },
  { id: 'center',       label: 'Center In',   desc: 'Retracts to center' },
  { id: 'shatter',      label: 'Shatter',     desc: 'Shattering retraction' },
  { id: 'dissolve',     label: 'Dissolve',    desc: 'Random shuffle turn-off' },
  { id: 'flickerOut',   label: 'Flicker Out', desc: 'Tip-to-base flicker band' },
  { id: 'unravel',      label: 'Unravel',     desc: 'Sinusoidal thread unwind' },
  { id: 'drain',        label: 'Drain',       desc: 'Gravity drain with meniscus' },
  { id: 'implode',      label: 'Implode',     desc: 'Collapsing inward retraction' },
  { id: 'evaporate',    label: 'Evaporate',   desc: 'Fading particle evaporation' },
  { id: 'spaghettify',  label: 'Spaghettify', desc: 'Stretching gravitational pull' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];
