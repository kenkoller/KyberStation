/**
 * Mirror of `BoardId` from `@kyberstation/boards`.
 *
 * The root `.npmrc` sets `symlink=false`, which means package src/ trees
 * cannot import from sibling workspace packages at type-check time
 * (`tsc` has no node_modules entry to resolve through). Other packages
 * in this monorepo handle the same constraint by re-declaring shared
 * types locally with a "kept in sync" comment — see
 * `packages/codegen/src/emitters/XenopixelEmitter.ts` for the precedent.
 *
 * Keep this in sync with `packages/boards/src/types.ts` `BoardId` union.
 * The hardware-profiles package still declares `@kyberstation/boards` as
 * a workspace dependency to document the logical relationship.
 */
export type BoardId =
  | 'proffieboard-v2'
  | 'proffieboard-v3'
  | 'proffie-lite'
  | 'proffie-clone'
  | 'cfx'
  | 'ghv3'
  | 'ghv4'
  | 'verso'
  | 'xenopixel-v2'
  | 'xenopixel-v3'
  | 'lgt-baselit'
  | 'asteria'
  | 'darkwolf'
  | 'damiensaber'
  | 'snpixel-v4'
  | 's-rgb';

/**
 * Where a profile's data came from, and how trustworthy it is.
 *
 *   - `vendor-confirmed`     vendor (or upstream reference designer) shared
 *                            the values directly; treat as authoritative.
 *   - `community-validated`  values are documented publicly (vendor tutorial,
 *                            reseller pack, repo) and used successfully by
 *                            community members, but not boot-confirmed by
 *                            KyberStation itself.
 *   - `community-submitted`  values came from a community PR or report; no
 *                            independent confirmation yet.
 *   - `experimental`         placeholder / best-guess values; do not flash
 *                            without verifying on hardware.
 */
export type Provenance =
  | 'vendor-confirmed'
  | 'community-validated'
  | 'community-submitted'
  | 'experimental';

/** Which physical role this blade plays in a multi-blade chassis. */
export type BladeRole = 'main' | 'crystal' | 'accent' | 'pommel';

/** WS281x data pin macros recognized by ProffieOS V3 boards. */
export type WS2811DataPin = 'bladePin' | 'blade2Pin' | 'blade3Pin';

/** Driver type for a blade. WS281X covers the overwhelming majority of cases. */
export type BladeDriverType = 'ws281x' | 'simple-pwm' | 'cree-xpe2';

/**
 * One blade segment in a chassis. A main blade is required; crystal /
 * accent / pommel segments are optional.
 */
export interface BladeSpec {
  type: BladeDriverType;
  /** Number of LEDs for WS281X strips. Ignored for non-pixel drivers. */
  ledCount: number;
  /** Data pin macro (bladePin / blade2Pin / blade3Pin). */
  dataPin: WS2811DataPin;
  /** Color ordering as a ProffieOS Color8::* token. Defaults to GRB. */
  colorOrder?: string;
  /** PowerPINS macros that drive this segment's MOSFETs. */
  powerPins: string[];
  /** Physical role for UI labelling and validation. */
  role: BladeRole;
}

/**
 * Hardware-level profile for a specific saber chassis. Drives codegen
 * (`packages/codegen`) Phase 2 by translating chassis-specific topology +
 * defines into a `ConfigOptions` object.
 *
 * Mirrors the spec in
 * `docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md` §4, with one upgrade:
 * `boardId` is typed against `@kyberstation/boards.BoardId` instead of a
 * freeform string so it can cross-reference the existing BoardProfile
 * capability matrix.
 */
export interface HardwareProfile {
  // ─── Identity ─────────────────────────────────────────────────
  /** Stable kebab-case id (`stock-proffieboard-v3`, `89sabers-v3.9`). */
  id: string;
  /** Vendor / manufacturer slug used for filtering (`hubbe`, `89sabers`). */
  vendor: string;
  /** Human-readable model (`Proffieboard V3`, `V3.9`). */
  model: string;
  /** Reference to a board profile in `@kyberstation/boards`. */
  boardId: BoardId;
  /** Optional descriptive chip identifier (`STM32L452RE`). */
  boardChip?: string;

  // ─── CONFIG_TOP ───────────────────────────────────────────────
  numBlades: 1 | 2 | 3 | 4;
  numButtons: 1 | 2 | 3;
  /** ProffieOS VOLUME (~0–3500, typical 1500–2000). */
  defaultVolume: number;
  /** CLASH_THRESHOLD_G in Gs (typical 2.0–4.5). */
  clashThresholdG: number;
  /**
   * ORIENTATION macro. `undefined` means "leave at ProffieOS default"
   * (USB toward pommel for most stock boards). Vendor chassis often need
   * `USB_TOWARDS_BLADE` because of how the board is mounted in the hilt.
   */
  orientation:
    | 'USB_TOWARDS_BLADE'
    | 'USB_TOWARDS_POMMEL'
    | 'USB_PORT_TOWARDS_BLADE'
    | undefined;
  /** Whether to emit `#define ENABLE_SERIAL` (required for BT modules). */
  enableSerial: boolean;
  /** Prop file name relative to ProffieOS `props/` dir. */
  propFile: string;
  /**
   * Verbatim `#define` tokens emitted into CONFIG_TOP. Each entry is the
   * portion after `#define ` — e.g. `'FETT263_SWING_ON_SPEED 500'`.
   * Order is preserved.
   */
  propDefines: string[];
  /** MOTION_TIMEOUT in milliseconds. */
  motionTimeoutMs: number;

  // ─── BladeConfig ──────────────────────────────────────────────
  /** One entry per blade segment. `blades.length === numBlades`. */
  blades: BladeSpec[];

  // ─── Provenance ───────────────────────────────────────────────
  source: Provenance;
  /** GitHub handles of users who have boot-confirmed this profile. */
  validatedBy: string[];
  /** Free-form notes about hardware quirks, BT modules, pin mappings. */
  notes?: string;
}
