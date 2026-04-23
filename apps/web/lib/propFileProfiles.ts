// ─── Prop File Profiles ────────────────────────────────────────────────
//
// Vocabulary registry for ProffieOS prop files — the `*_buttons.h`
// files that map physical button events (click / long-press / etc.)
// and gesture events (swing / stab / twist) into sound + visual
// triggers.
//
// Status: v1.0 launch registry. Author: Agent C (modulation routing
// sprint, 2026-04-22). v1.0 ships the vocabularies; the ROUTING tab's
// "Button Routing" sub-tab that consumes them lands in v1.1 per sprint
// plan §3.2 "coming soon".
//
// ── Conventions ────────────────────────────────────────────────────────
//
// • `ButtonEvent` and `GestureEvent` are closed unions. Adding a new
//   event means the UI has to handle it — all consumers should exhaust
//   the union. The Fett263 prop file is the most capable member of the
//   set; `supportsXxx` booleans capture the orthogonal dimensions the
//   Inspector will gate on.
//
// • `compatibleBoards` lists board IDs the prop file is known to
//   flash + run on. The Proffie family (V2.2 / V3.9 / Golden Harvest
//   V3) share an ABI, so a prop file is typically compatible with all
//   three or with only V3. CFX / Xenopixel / Verso have no ProffieOS
//   prop files — they use entirely different firmware.
//
// • Menu structure (Edit Mode menu tree) is deferred to v1.1 per the
//   sprint plan; `menuStructure` is not included yet.

export type ButtonEvent =
  | 'click'
  | 'long-press'
  | 'hold'
  | 'double-click'
  | 'triple-click'
  | 'click-and-hold'
  | 'held-plus-other-click';

export type GestureEvent = 'swing' | 'stab' | 'thrust' | 'twist' | 'shake';

export interface PropFileProfile {
  id: string;
  displayName: string;
  author: string;
  /** Board IDs this prop file is known to build + flash against. */
  compatibleBoards: readonly string[];
  buttonEvents: readonly ButtonEvent[];
  gestureEvents: readonly GestureEvent[];
  /** Runtime color-change menu (rotate hue, save to preset, etc.). */
  supportsColorChange: boolean;
  /** Multiple simultaneous blast marks with spatial placement. */
  supportsMultiBlast: boolean;
  /** Force-push / force-slow / force-lightning effect events. */
  supportsForceEffects: boolean;
  // menuStructure: ... — v1.1, per sprint plan §3.2.
}

// ── Profiles ──────────────────────────────────────────────────────────
//
// Fett263 is the reference implementation — the default shipped with
// KyberStation's bundled firmware builds (see firmware-configs/README.md)
// and the prop file Ken validated on the 89sabers V3.9. The other three
// are narrower vocabularies authored by community members that some
// users prefer for their simpler mental model.

const FETT263_PROP: PropFileProfile = {
  id: 'fett263',
  displayName: 'Fett263',
  author: 'Fett263',
  compatibleBoards: ['proffie-v2.2', 'proffie-v3.9', 'golden-harvest-v3'],
  buttonEvents: [
    'click',
    'long-press',
    'hold',
    'double-click',
    'triple-click',
    'click-and-hold',
    'held-plus-other-click',
  ],
  gestureEvents: ['swing', 'stab', 'thrust', 'twist', 'shake'],
  supportsColorChange: true,
  supportsMultiBlast: true,
  supportsForceEffects: true,
};

const SA22C_PROP: PropFileProfile = {
  id: 'sa22c',
  displayName: 'SA22C',
  author: 'SA22C',
  // Community feedback on the SA22C prop has centered on V3.9; SA22C on
  // V2 is unverified in-sprint, so conservatively scope to V3-family.
  compatibleBoards: ['proffie-v3.9', 'golden-harvest-v3'],
  buttonEvents: [
    'click',
    'long-press',
    'hold',
    'double-click',
    'click-and-hold',
  ],
  gestureEvents: ['swing', 'stab', 'twist'],
  supportsColorChange: true,
  supportsMultiBlast: false,
  supportsForceEffects: true,
};

const BC_BUTTON_CONTROLS: PropFileProfile = {
  id: 'bc-button-controls',
  displayName: 'BC Button Controls',
  author: 'Brian Conner',
  compatibleBoards: ['proffie-v2.2', 'proffie-v3.9', 'golden-harvest-v3'],
  // Simpler vocab by design — BC's prop trades feature breadth for a
  // discoverable button mental model.
  buttonEvents: ['click', 'long-press', 'hold', 'double-click'],
  gestureEvents: ['swing', 'stab'],
  supportsColorChange: true,
  supportsMultiBlast: false,
  supportsForceEffects: false,
};

const DEFAULT_FETT_PROP: PropFileProfile = {
  id: 'default-fett',
  displayName: 'Default (Fett)',
  author: 'ProffieOS',
  // Bundled ProffieOS default — the narrowest prop. Ships everywhere.
  compatibleBoards: ['proffie-v2.2', 'proffie-v3.9', 'golden-harvest-v3'],
  buttonEvents: ['click', 'long-press', 'hold'],
  gestureEvents: ['swing'],
  supportsColorChange: false,
  supportsMultiBlast: false,
  supportsForceEffects: false,
};

// ── Registry ──────────────────────────────────────────────────────────

export const PROP_FILE_PROFILES: readonly PropFileProfile[] = Object.freeze([
  FETT263_PROP,
  SA22C_PROP,
  BC_BUTTON_CONTROLS,
  DEFAULT_FETT_PROP,
]);

const PROP_INDEX: ReadonlyMap<string, PropFileProfile> = new Map(
  PROP_FILE_PROFILES.map((p) => [p.id, p]),
);

/** Default prop file — matches the bundled firmware-configs profiles. */
export const DEFAULT_PROP_FILE_ID: string = FETT263_PROP.id;

export function getPropFileProfile(id: string): PropFileProfile | undefined {
  return PROP_INDEX.get(id);
}

/** Prop files compatible with a given board ID. */
export function getPropFilesForBoard(
  boardId: string,
): readonly PropFileProfile[] {
  return PROP_FILE_PROFILES.filter((p) =>
    p.compatibleBoards.includes(boardId),
  );
}
