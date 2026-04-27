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
  /**
   * Optional public path to an animated GIF preview for this variant
   * (Saber GIF Sprint 2). When present, the picker UI swaps the static
   * SVG thumbnail for the GIF on hover. When `undefined`, the picker
   * falls back to the SVG-only behaviour. Backward-compatible: every
   * consumer that previously read `id` / `label` / `desc` continues to
   * work unchanged.
   *
   * Generator: `pnpm --filter @kyberstation/engine gif:pickers`. Output:
   * `apps/web/public/picker-gifs/{ignition,retraction}/<id>.gif`.
   */
  pickerGifPath?: string;
}

/**
 * Build the public-asset path for a generated picker GIF. Returns the
 * canonical `/picker-gifs/<kind>/<id>.gif` URL even before the file
 * exists on disk — the file presence is verified in tests + at runtime
 * by `MiniGalleryPicker` (it falls back to the SVG when the asset
 * 404s).
 */
function gifPath(kind: 'ignition' | 'retraction', id: string): string {
  return `/picker-gifs/${kind}/${id}.gif`;
}

export const IGNITION_STYLES: ReadonlyArray<TransitionStyle> = [
  { id: 'standard',     label: 'Standard',    desc: 'Classic linear ignition',         pickerGifPath: gifPath('ignition', 'standard') },
  { id: 'scroll',       label: 'Scroll',      desc: 'Scrolling pixel fill',            pickerGifPath: gifPath('ignition', 'scroll') },
  { id: 'spark',        label: 'Spark',       desc: 'Crackling spark ignition',        pickerGifPath: gifPath('ignition', 'spark') },
  { id: 'center',       label: 'Center Out',  desc: 'Ignites from center',             pickerGifPath: gifPath('ignition', 'center') },
  { id: 'wipe',         label: 'Wipe',        desc: 'Soft wipe reveal',                pickerGifPath: gifPath('ignition', 'wipe') },
  { id: 'stutter',      label: 'Stutter',     desc: 'Flickering unstable ignition',    pickerGifPath: gifPath('ignition', 'stutter') },
  { id: 'glitch',       label: 'Glitch',      desc: 'Digital glitch effect',           pickerGifPath: gifPath('ignition', 'glitch') },
  { id: 'twist',        label: 'Twist',       desc: 'Spiral ignition driven by twist', pickerGifPath: gifPath('ignition', 'twist') },
  { id: 'swing',        label: 'Swing',       desc: 'Speed-reactive swing ignition',   pickerGifPath: gifPath('ignition', 'swing') },
  { id: 'stab',         label: 'Stab',        desc: 'Rapid center-out burst',          pickerGifPath: gifPath('ignition', 'stab') },
  { id: 'crackle',      label: 'Crackle',     desc: 'Random segment flicker fill',     pickerGifPath: gifPath('ignition', 'crackle') },
  { id: 'fracture',     label: 'Fracture',    desc: 'Radiating crack points',          pickerGifPath: gifPath('ignition', 'fracture') },
  { id: 'flash-fill',   label: 'Flash Fill',  desc: 'White flash then color wipe',     pickerGifPath: gifPath('ignition', 'flash-fill') },
  { id: 'pulse-wave',   label: 'Pulse Wave',  desc: 'Sequential building waves',       pickerGifPath: gifPath('ignition', 'pulse-wave') },
  { id: 'drip-up',      label: 'Drip Up',     desc: 'Fluid upward flow',               pickerGifPath: gifPath('ignition', 'drip-up') },
  { id: 'hyperspace',   label: 'Hyperspace',  desc: 'Streaking star-line ignition',    pickerGifPath: gifPath('ignition', 'hyperspace') },
  { id: 'summon',       label: 'Summon',      desc: 'Force-pull ignition',             pickerGifPath: gifPath('ignition', 'summon') },
  { id: 'seismic',      label: 'Seismic',     desc: 'Ground-shake ripple ignition',    pickerGifPath: gifPath('ignition', 'seismic') },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve',      pickerGifPath: gifPath('ignition', 'custom-curve') },
];

export const RETRACTION_STYLES: ReadonlyArray<TransitionStyle> = [
  { id: 'standard',     label: 'Standard',    desc: 'Linear retraction',               pickerGifPath: gifPath('retraction', 'standard') },
  { id: 'scroll',       label: 'Scroll',      desc: 'Scrolling retract',               pickerGifPath: gifPath('retraction', 'scroll') },
  { id: 'fadeout',      label: 'Fade Out',    desc: 'Fading retraction',               pickerGifPath: gifPath('retraction', 'fadeout') },
  { id: 'center',       label: 'Center In',   desc: 'Retracts to center',              pickerGifPath: gifPath('retraction', 'center') },
  { id: 'shatter',      label: 'Shatter',     desc: 'Shattering retraction',           pickerGifPath: gifPath('retraction', 'shatter') },
  { id: 'dissolve',     label: 'Dissolve',    desc: 'Random shuffle turn-off',         pickerGifPath: gifPath('retraction', 'dissolve') },
  { id: 'flickerOut',   label: 'Flicker Out', desc: 'Tip-to-base flicker band',        pickerGifPath: gifPath('retraction', 'flickerOut') },
  { id: 'unravel',      label: 'Unravel',     desc: 'Sinusoidal thread unwind',        pickerGifPath: gifPath('retraction', 'unravel') },
  { id: 'drain',        label: 'Drain',       desc: 'Gravity drain with meniscus',     pickerGifPath: gifPath('retraction', 'drain') },
  { id: 'implode',      label: 'Implode',     desc: 'Collapsing inward retraction',    pickerGifPath: gifPath('retraction', 'implode') },
  { id: 'evaporate',    label: 'Evaporate',   desc: 'Fading particle evaporation',     pickerGifPath: gifPath('retraction', 'evaporate') },
  { id: 'spaghettify',  label: 'Spaghettify', desc: 'Stretching gravitational pull',   pickerGifPath: gifPath('retraction', 'spaghettify') },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve',      pickerGifPath: gifPath('retraction', 'custom-curve') },
];

/** All ignition + retraction picker GIF paths in one flat array — handy
 *  for bundler manifest checks + the test that asserts these all live in
 *  `/picker-gifs/`. */
export function allPickerGifPaths(): string[] {
  const out: string[] = [];
  for (const s of IGNITION_STYLES) if (s.pickerGifPath) out.push(s.pickerGifPath);
  for (const s of RETRACTION_STYLES) if (s.pickerGifPath) out.push(s.pickerGifPath);
  return out;
}
