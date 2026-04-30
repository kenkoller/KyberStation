// ─── bladeRenderHeadless — backwards-compat shim ────────────────────
//
// Historical entry point for the headless / non-React blade pipeline.
// As of the Phase 4 module-extraction (CLAUDE.md v0.14.0 entry,
// "Still open" → "Item K"), the canonical implementation lives at
// `apps/web/lib/blade/pipeline.ts`. This file remains as a re-export
// shim so existing import sites
// (`apps/web/lib/sharePack/cardSnapshot.ts`,
// `apps/web/components/editor/CrystalPanel.tsx`, render tests) keep
// working without churn.
//
// New code should import from `@/lib/blade/pipeline` (or one of the
// sibling modules: `rasterizer`, `bloom`, `colorMath`, `glowProfile`)
// directly. This shim will be removed once all consumers migrate.

export {
  drawWorkbenchBlade,
} from '@/lib/blade/pipeline';
export {
  ledBufferFrom,
} from '@/lib/blade/ledBuffer';
export {
  getGlowProfileHeadless as getGlowProfile,
} from '@/lib/blade/glowProfile';
export type {
  LedBufferLike,
  BladeRenderOptions,
} from '@/lib/blade/types';
export type { BaseGlowProfile as GlowProfile } from '@/lib/blade/types';
