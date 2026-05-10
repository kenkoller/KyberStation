// ─── blade3d barrel ────────────────────────────────────────────────
//
// Public API for the 3D blade renderer (Phase 2A of Visualizer Upgrade).

export { BladeScene3D } from './BladeScene3D';
export type { BladeScene3DProps } from './BladeScene3D';

export {
  createBladeGeometry,
  createBladeTipGeometry,
  createFullBladeGeometry,
} from './BladeGeometry';
export type { BladeGeometryOptions } from './BladeGeometry';

export {
  createBladeMaterial,
  createLedTexture,
  updateLedTexture,
  getLedTextureFromMaterial,
} from './BladeMaterial';
export type { BladeMaterialOptions } from './BladeMaterial';

export {
  extractProfileFromPath,
  buildHiltProfile,
  buildDefaultHiltProfile,
  createHiltLathGeometry,
  createHiltGeometry3D,
  createHiltMaterial,
} from './HiltGeometry3D';
