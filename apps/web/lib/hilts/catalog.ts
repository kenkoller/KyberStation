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
import { flatTopEmitter } from './parts/emitters/flat-top';
import { graflexEmitter } from './parts/emitters/graflex';
import { maulEmitter } from './parts/emitters/maul';
import { mppEmitter } from './parts/emitters/mpp';
import { ornateEmitter } from './parts/emitters/ornate';
import { ringedEmitter } from './parts/emitters/ringed';
import { taperedEmitter } from './parts/emitters/tapered';
import { ventedEmitter } from './parts/emitters/vented';

// Switches
import { curvedSwitch } from './parts/switches/curved-switch';
import { darkSwitch } from './parts/switches/dark-switch';
import { fulcrumSwitch } from './parts/switches/fulcrum-switch';
import { graflexSwitch } from './parts/switches/graflex';
import { inquisitorSwitch } from './parts/switches/inquisitor-switch';
import { negotiatorSwitch } from './parts/switches/negotiator-switch';
import { sageSwitch } from './parts/switches/sage-switch';
import { ventedSwitch } from './parts/switches/vented-switch';
import { winduSwitch } from './parts/switches/windu';

// Grips
import { covertecGrip } from './parts/grips/covertec-grip';
import { curvedGrip } from './parts/grips/curved-grip';
import { fulcrumGrip } from './parts/grips/fulcrum-grip';
import { lukeRotjGrip } from './parts/grips/luke-rotj-grip';
import { mppGrip } from './parts/grips/mpp-grip';
import { ribbedGrip } from './parts/grips/ribbed-grip';
import { shortGrip } from './parts/grips/short-grip';
import { staffBody } from './parts/grips/staff-body';
import { tTracksGrip } from './parts/grips/t-tracks';
import { tapedGrip } from './parts/grips/taped-grip';
import { winduGrip } from './parts/grips/windu-grip';

// Pommels
import { classicPommel } from './parts/pommels/classic';
import { curvedPommel } from './parts/pommels/curved';
import { darkPommel } from './parts/pommels/dark';
import { inquisitorMount } from './parts/pommels/inquisitor-mount';
import { ornatePommel } from './parts/pommels/ornate';
import { pointedPommel } from './parts/pommels/pointed';
import { rawPommel } from './parts/pommels/raw';
import { sagePommel } from './parts/pommels/sage';
import { winduPommel } from './parts/pommels/windu';

// Accents
import { activationBox } from './parts/accents/activation-box';
import { brassBand } from './parts/accents/brass-band';
import { crossguardQuillon } from './parts/accents/crossguard-quillon';
import { goldBand } from './parts/accents/gold-band';
import { leatherWrap } from './parts/accents/leather-wrap';
import { silverBand } from './parts/accents/silver-band';

export const PART_CATALOG: Record<string, HiltPart> = {
  [compactEmitter.id]: compactEmitter,
  [curvedEmitter.id]: curvedEmitter,
  [dualEmitterBottom.id]: dualEmitterBottom,
  [dualEmitterTop.id]: dualEmitterTop,
  [flatTopEmitter.id]: flatTopEmitter,
  [graflexEmitter.id]: graflexEmitter,
  [maulEmitter.id]: maulEmitter,
  [mppEmitter.id]: mppEmitter,
  [ornateEmitter.id]: ornateEmitter,
  [ringedEmitter.id]: ringedEmitter,
  [taperedEmitter.id]: taperedEmitter,
  [ventedEmitter.id]: ventedEmitter,
  [curvedSwitch.id]: curvedSwitch,
  [darkSwitch.id]: darkSwitch,
  [fulcrumSwitch.id]: fulcrumSwitch,
  [graflexSwitch.id]: graflexSwitch,
  [inquisitorSwitch.id]: inquisitorSwitch,
  [negotiatorSwitch.id]: negotiatorSwitch,
  [sageSwitch.id]: sageSwitch,
  [ventedSwitch.id]: ventedSwitch,
  [winduSwitch.id]: winduSwitch,
  [covertecGrip.id]: covertecGrip,
  [curvedGrip.id]: curvedGrip,
  [fulcrumGrip.id]: fulcrumGrip,
  [lukeRotjGrip.id]: lukeRotjGrip,
  [mppGrip.id]: mppGrip,
  [ribbedGrip.id]: ribbedGrip,
  [shortGrip.id]: shortGrip,
  [staffBody.id]: staffBody,
  [tTracksGrip.id]: tTracksGrip,
  [tapedGrip.id]: tapedGrip,
  [winduGrip.id]: winduGrip,
  [classicPommel.id]: classicPommel,
  [curvedPommel.id]: curvedPommel,
  [darkPommel.id]: darkPommel,
  [inquisitorMount.id]: inquisitorMount,
  [ornatePommel.id]: ornatePommel,
  [pointedPommel.id]: pointedPommel,
  [rawPommel.id]: rawPommel,
  [sagePommel.id]: sagePommel,
  [winduPommel.id]: winduPommel,
  [activationBox.id]: activationBox,
  [brassBand.id]: brassBand,
  [crossguardQuillon.id]: crossguardQuillon,
  [goldBand.id]: goldBand,
  [leatherWrap.id]: leatherWrap,
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
