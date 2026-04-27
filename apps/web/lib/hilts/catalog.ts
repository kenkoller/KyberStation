/**
 * Part catalog — the registry every composer reads from.
 *
 * Keep imports alphabetized within each type group. Stage-2 artist
 * agents add new imports + map entries here without conflicting —
 * each touches disjoint sections.
 */

import type { HiltPart } from './types';

// Emitters
import { ahsokaCloneWarsEmitter } from './parts/emitters/ahsoka-clone-wars-emitter';
import { anakinRotsEmitter } from './parts/emitters/anakin-rots-emitter';
import { compactEmitter } from './parts/emitters/compact';
import { curvedEmitter } from './parts/emitters/curved';
import { dookuCanonEmitter } from './parts/emitters/dooku-canon-emitter';
import { dualEmitterBottom } from './parts/emitters/dual-bottom';
import { dualEmitterTop } from './parts/emitters/dual-top';
import { flatTopEmitter } from './parts/emitters/flat-top';
import { graflexEmitter } from './parts/emitters/graflex';
import { leiaRebelsEmitter } from './parts/emitters/leia-rebels-emitter';
import { maulEmitter } from './parts/emitters/maul';
import { mppEmitter } from './parts/emitters/mpp';
import { ornateEmitter } from './parts/emitters/ornate';
import { ploKoonEmitter } from './parts/emitters/plo-koon-emitter';
import { reyTrosEmitter } from './parts/emitters/rey-tros-emitter';
import { ringedEmitter } from './parts/emitters/ringed';
import { taperedEmitter } from './parts/emitters/tapered';
import { ventedEmitter } from './parts/emitters/vented';
import { ventressEmitter } from './parts/emitters/ventress-emitter';

// Switches
import { ahsokaCloneWarsSwitch } from './parts/switches/ahsoka-clone-wars-switch';
import { anakinRotsSwitch } from './parts/switches/anakin-rots-switch';
import { curvedSwitch } from './parts/switches/curved-switch';
import { darkSwitch } from './parts/switches/dark-switch';
import { dookuCanonSwitch } from './parts/switches/dooku-canon-switch';
import { fulcrumSwitch } from './parts/switches/fulcrum-switch';
import { graflexSwitch } from './parts/switches/graflex';
import { inquisitorSwitch } from './parts/switches/inquisitor-switch';
import { leiaRebelsSwitch } from './parts/switches/leia-rebels-switch';
import { negotiatorSwitch } from './parts/switches/negotiator-switch';
import { ploKoonSwitch } from './parts/switches/plo-koon-switch';
import { reyTrosSwitch } from './parts/switches/rey-tros-switch';
import { sageSwitch } from './parts/switches/sage-switch';
import { ventedSwitch } from './parts/switches/vented-switch';
import { ventressSwitch } from './parts/switches/ventress-switch';
import { winduSwitch } from './parts/switches/windu';

// Grips
import { ahsokaCloneWarsGrip } from './parts/grips/ahsoka-clone-wars-grip';
import { anakinRotsGrip } from './parts/grips/anakin-rots-grip';
import { covertecGrip } from './parts/grips/covertec-grip';
import { curvedGrip } from './parts/grips/curved-grip';
import { dookuCanonGrip } from './parts/grips/dooku-canon-grip';
import { fulcrumGrip } from './parts/grips/fulcrum-grip';
import { leiaRebelsGrip } from './parts/grips/leia-rebels-grip';
import { lukeRotjGrip } from './parts/grips/luke-rotj-grip';
import { mppGrip } from './parts/grips/mpp-grip';
import { ploKoonGrip } from './parts/grips/plo-koon-grip';
import { reyTrosGrip } from './parts/grips/rey-tros-grip';
import { ribbedGrip } from './parts/grips/ribbed-grip';
import { shortGrip } from './parts/grips/short-grip';
import { staffBody } from './parts/grips/staff-body';
import { tTracksGrip } from './parts/grips/t-tracks';
import { tapedGrip } from './parts/grips/taped-grip';
import { ventressGrip } from './parts/grips/ventress-grip';
import { winduGrip } from './parts/grips/windu-grip';

// Pommels
import { ahsokaCloneWarsPommel } from './parts/pommels/ahsoka-clone-wars-pommel';
import { anakinRotsPommel } from './parts/pommels/anakin-rots-pommel';
import { classicPommel } from './parts/pommels/classic';
import { curvedPommel } from './parts/pommels/curved';
import { darkPommel } from './parts/pommels/dark';
import { dookuCanonPommel } from './parts/pommels/dooku-canon-pommel';
import { inquisitorMount } from './parts/pommels/inquisitor-mount';
import { ornatePommel } from './parts/pommels/ornate';
import { ploKoonPommel } from './parts/pommels/plo-koon-pommel';
import { pointedPommel } from './parts/pommels/pointed';
import { rawPommel } from './parts/pommels/raw';
import { reyTrosPommel } from './parts/pommels/rey-tros-pommel';
import { sagePommel } from './parts/pommels/sage';
import { ventressPommel } from './parts/pommels/ventress-pommel';
import { winduPommel } from './parts/pommels/windu';

// Accents
import { activationBox } from './parts/accents/activation-box';
import { brassBand } from './parts/accents/brass-band';
import { bronzeBand } from './parts/accents/bronze-band';
import { chromeTrim } from './parts/accents/chrome-trim';
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
  // Emitters (Stage 2 — v0.15.0)
  [ahsokaCloneWarsEmitter.id]: ahsokaCloneWarsEmitter,
  [anakinRotsEmitter.id]: anakinRotsEmitter,
  [dookuCanonEmitter.id]: dookuCanonEmitter,
  [leiaRebelsEmitter.id]: leiaRebelsEmitter,
  [ploKoonEmitter.id]: ploKoonEmitter,
  [reyTrosEmitter.id]: reyTrosEmitter,
  [ventressEmitter.id]: ventressEmitter,
  // Switches (Stage 2 — v0.15.0)
  [ahsokaCloneWarsSwitch.id]: ahsokaCloneWarsSwitch,
  [anakinRotsSwitch.id]: anakinRotsSwitch,
  [dookuCanonSwitch.id]: dookuCanonSwitch,
  [leiaRebelsSwitch.id]: leiaRebelsSwitch,
  [ploKoonSwitch.id]: ploKoonSwitch,
  [reyTrosSwitch.id]: reyTrosSwitch,
  [ventressSwitch.id]: ventressSwitch,
  // Grips (Stage 2 — v0.15.0)
  [ahsokaCloneWarsGrip.id]: ahsokaCloneWarsGrip,
  [anakinRotsGrip.id]: anakinRotsGrip,
  [dookuCanonGrip.id]: dookuCanonGrip,
  [leiaRebelsGrip.id]: leiaRebelsGrip,
  [ploKoonGrip.id]: ploKoonGrip,
  [reyTrosGrip.id]: reyTrosGrip,
  [ventressGrip.id]: ventressGrip,
  // Pommels (Stage 2 — v0.15.0)
  [ahsokaCloneWarsPommel.id]: ahsokaCloneWarsPommel,
  [anakinRotsPommel.id]: anakinRotsPommel,
  [dookuCanonPommel.id]: dookuCanonPommel,
  [ploKoonPommel.id]: ploKoonPommel,
  [reyTrosPommel.id]: reyTrosPommel,
  [ventressPommel.id]: ventressPommel,
  // Accents (Stage 2 — v0.15.0)
  [bronzeBand.id]: bronzeBand,
  [chromeTrim.id]: chromeTrim,
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
