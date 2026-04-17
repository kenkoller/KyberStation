/**
 * Part catalog — the registry every composer reads from.
 *
 * Keep imports alphabetized within each type group. Stage-2 artist
 * agents add new imports + map entries here without conflicting —
 * each touches disjoint sections.
 */

import type { HiltPart } from './types';

// Emitters
import { compactEmitter } from './parts/emitters/compact';
import { curvedEmitter } from './parts/emitters/curved';
import { dualEmitterBottom } from './parts/emitters/dual-bottom';
import { dualEmitterTop } from './parts/emitters/dual-top';
import { graflexEmitter } from './parts/emitters/graflex';
import { mppEmitter } from './parts/emitters/mpp';
import { ornateEmitter } from './parts/emitters/ornate';
import { ventedEmitter } from './parts/emitters/vented';

// Switches
import { curvedSwitch } from './parts/switches/curved-switch';
import { darkSwitch } from './parts/switches/dark-switch';
import { fulcrumSwitch } from './parts/switches/fulcrum-switch';
import { graflexSwitch } from './parts/switches/graflex';
import { negotiatorSwitch } from './parts/switches/negotiator-switch';
import { sageSwitch } from './parts/switches/sage-switch';
import { ventedSwitch } from './parts/switches/vented-switch';

// Grips
import { curvedGrip } from './parts/grips/curved-grip';
import { fulcrumGrip } from './parts/grips/fulcrum-grip';
import { mppGrip } from './parts/grips/mpp-grip';
import { ribbedGrip } from './parts/grips/ribbed-grip';
import { shortGrip } from './parts/grips/short-grip';
import { staffBody } from './parts/grips/staff-body';
import { tTracksGrip } from './parts/grips/t-tracks';
import { tapedGrip } from './parts/grips/taped-grip';

// Pommels
import { classicPommel } from './parts/pommels/classic';
import { curvedPommel } from './parts/pommels/curved';
import { darkPommel } from './parts/pommels/dark';
import { ornatePommel } from './parts/pommels/ornate';
import { pointedPommel } from './parts/pommels/pointed';
import { rawPommel } from './parts/pommels/raw';
import { sagePommel } from './parts/pommels/sage';

// Accents
import { brassBand } from './parts/accents/brass-band';
import { crossguardQuillon } from './parts/accents/crossguard-quillon';
import { silverBand } from './parts/accents/silver-band';

export const PART_CATALOG: Record<string, HiltPart> = {
  [compactEmitter.id]: compactEmitter,
  [curvedEmitter.id]: curvedEmitter,
  [dualEmitterBottom.id]: dualEmitterBottom,
  [dualEmitterTop.id]: dualEmitterTop,
  [graflexEmitter.id]: graflexEmitter,
  [mppEmitter.id]: mppEmitter,
  [ornateEmitter.id]: ornateEmitter,
  [ventedEmitter.id]: ventedEmitter,
  [curvedSwitch.id]: curvedSwitch,
  [darkSwitch.id]: darkSwitch,
  [fulcrumSwitch.id]: fulcrumSwitch,
  [graflexSwitch.id]: graflexSwitch,
  [negotiatorSwitch.id]: negotiatorSwitch,
  [sageSwitch.id]: sageSwitch,
  [ventedSwitch.id]: ventedSwitch,
  [curvedGrip.id]: curvedGrip,
  [fulcrumGrip.id]: fulcrumGrip,
  [mppGrip.id]: mppGrip,
  [ribbedGrip.id]: ribbedGrip,
  [shortGrip.id]: shortGrip,
  [staffBody.id]: staffBody,
  [tTracksGrip.id]: tTracksGrip,
  [tapedGrip.id]: tapedGrip,
  [classicPommel.id]: classicPommel,
  [curvedPommel.id]: curvedPommel,
  [darkPommel.id]: darkPommel,
  [ornatePommel.id]: ornatePommel,
  [pointedPommel.id]: pointedPommel,
  [rawPommel.id]: rawPommel,
  [sagePommel.id]: sagePommel,
  [brassBand.id]: brassBand,
  [crossguardQuillon.id]: crossguardQuillon,
  [silverBand.id]: silverBand,
};

export function getPart(id: string): HiltPart | undefined {
  return PART_CATALOG[id];
}

export function getPartsByType(type: HiltPart['type']): HiltPart[] {
  return Object.values(PART_CATALOG).filter((p) => p.type === type);
}

export function allParts(): HiltPart[] {
  return Object.values(PART_CATALOG);
}
