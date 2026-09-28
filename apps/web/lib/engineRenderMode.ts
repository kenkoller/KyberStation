// ─── Engine render mode — the single source of truth ─────────────────
//
// Decides which render path the BladeEngine uses and which ProffieOS
// template (if any) it evaluates. Before 2026-09 this decision lived in
// two hooks with duplicated ternaries (`useBladeEngine` forced 'proffie'
// unless the config carried imported raw code; `useHardwarePreview`
// re-applied 'template-eval' only when the generated code string
// changed). Switching between two Proffie boards therefore dropped the
// canvas to the parameter-engine approximation until the next edit:
// the first hook's `setRenderMode('proffie')` destroyed the template
// bridge and the second hook saw an unchanged code string and skipped.
//
// Now `useBladeEngine` derives a complete plan from the current inputs
// on every change and applies it idempotently — nothing depends on
// effect ordering or on "did the code change since last time".

import type {
  BladeConfig,
  BladeEngine,
  RenderMode as EngineRenderMode,
} from '@kyberstation/engine';
import { generateStyleCode } from '@kyberstation/codegen';

export interface RenderModeInputs {
  /** Selected board profile id (see `lib/boardProfiles.ts`). */
  boardId: string;
  /** `uiStore.hardwarePreview` — the "HW" toggle. Defaults on. */
  hardwarePreview: boolean;
  /** Raw ProffieOS style code carried by an imported config, if any. */
  importedRawCode?: string | null;
}

/**
 * Which render path the engine should use.
 *
 *   1. Imported raw ProffieOS code → `'template-eval'` (the only faithful
 *      way to render a style the parameter engine has no model for).
 *   2. Xenopixel board → `'xenopixel'` (that firmware never evaluates a
 *      ProffieOS template; the engine's Xeno registries model it).
 *   3. Hardware Preview on → `'template-eval'` over the generated code.
 *   4. Otherwise → `'proffie'`, the parameter-engine approximation.
 */
export function resolveEngineRenderMode(inputs: RenderModeInputs): EngineRenderMode {
  if (inputs.importedRawCode) return 'template-eval';
  if (inputs.boardId === 'xenopixel') return 'xenopixel';
  return inputs.hardwarePreview ? 'template-eval' : 'proffie';
}

export interface EngineRenderPlan {
  mode: EngineRenderMode;
  /**
   * Generated ProffieOS code for the engine's preview template, or `null`
   * when the engine should not use one (not in template-eval mode, or the
   * config's own `importedRawCode` is rendered instead). A codegen failure
   * also yields `null`; the engine then falls back to the parameter engine
   * for that frame rather than rendering a stale template.
   */
  previewTemplate: string | null;
}

export type StyleCodeGenerator = (config: BladeConfig) => string;

const generatePreviewCode: StyleCodeGenerator = (config) =>
  generateStyleCode(config, { comments: false });

export function planEngineRender(
  config: BladeConfig,
  inputs: Omit<RenderModeInputs, 'importedRawCode'>,
  generate: StyleCodeGenerator = generatePreviewCode,
): EngineRenderPlan {
  const importedRawCode = config.importedRawCode ?? null;
  const mode = resolveEngineRenderMode({ ...inputs, importedRawCode });
  if (mode !== 'template-eval' || importedRawCode) {
    return { mode, previewTemplate: null };
  }
  try {
    return { mode, previewTemplate: generate(config) };
  } catch {
    return { mode, previewTemplate: null };
  }
}

/**
 * Apply a plan. Idempotent: `setRenderMode` no-ops on the current mode and
 * the template bridge no-ops on an unchanged template string, so this can
 * run on every input change without resetting template state (held
 * lockups, transition clocks, ColorChange variant).
 *
 * Order matters: the mode is set first because leaving 'template-eval'
 * tears the bridge down, and the preview template must be (re)attached
 * after that.
 */
export function applyEngineRenderPlan(
  engine: Pick<BladeEngine, 'setRenderMode' | 'setPreviewTemplate'>,
  plan: EngineRenderPlan,
): void {
  engine.setRenderMode(plan.mode);
  engine.setPreviewTemplate(plan.previewTemplate);
}
