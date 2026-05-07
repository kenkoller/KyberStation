import { BaseIgnition } from '../BaseIgnition.js';

/**
 * Xenopixel Ignition Mode 0 — Standard.
 *
 * Simple linear wipe from hilt to tip, identical to the ProffieOS
 * standard ignition. The Xenopixel V3 firmware uses this as its
 * default ignition mode when no special preon is selected.
 */
export class XenoStandardIgnition extends BaseIgnition {
  readonly id = 'xeno-standard';
  readonly name = 'Xeno Standard';

  getMask(position: number, progress: number): number {
    return position <= progress ? 1 : 0;
  }
}
