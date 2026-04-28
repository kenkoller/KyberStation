// ─── Kyber Crystal — Public Barrel ───
//
// The only module outside `apps/web/lib/crystal/` should import from
// this file (plus the `reactComponent` re-export below, which depends
// on React and stays separate for SSR hygiene).

export { CrystalRenderer } from './renderer';
export { hashConfig, seedRng } from './hash';
export { CrystalAnimationController } from './animations';

export {
  CRYSTAL_FORMS,
  selectForm,
  geometryParamsForConfig,
  isRedHue,
  isGreenHue,
  isBlueHue,
  IDLE_ANIMATION_STATE,
} from './types';

export type {
  CrystalFormId,
  CrystalForm,
  CrystalGeometryParams,
  AnimationTrigger,
  AnimationState,
  CrystalHandle,
  CrystalRenderOptions,
} from './types';

export {
  createQrSurface,
  deriveQrLayout,
  contrastRatio,
} from './qrSurface';
export type { QrSurfaceResult, QrSurfaceOptions } from './qrSurface';

// React component is re-exported separately via reactComponent.tsx
// so non-React consumers (tests, snapshot) can import renderer without
// pulling React.
