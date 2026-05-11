// ─── useHardwarePreview ──────────────────────────────────────────
//
// Drives "Hardware Preview" mode — when enabled, generates ProffieOS
// code from the current blade config and feeds it through the engine's
// template-eval bridge for pixel-accurate rendering. This lets users
// verify that what they see in the visualizer matches what their real
// Proffieboard hardware will produce.
//
// The hook:
//   1. Reads `hardwarePreview` from uiStore
//   2. When ON: generates style code via `generateStyleCode`
//   3. Feeds the generated code to `engine.setPreviewTemplate()`
//   4. Switches engine to 'template-eval' mode
//   5. When OFF: clears preview template, restores normal mode

'use client';

import { useEffect, useRef } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { generateStyleCode } from '@kyberstation/codegen';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';

/**
 * Hardware Preview hook — connects the codegen pipeline to the engine's
 * template-eval bridge for live WYSIWYG verification.
 *
 * Mount in the same component that owns the engine (WorkbenchLayout).
 * The hook generates ProffieOS code from the current config and sets it
 * as the engine's preview template when hardwarePreview is toggled on.
 */
export function useHardwarePreview(
  engineRef: React.RefObject<BladeEngine | null>,
): void {
  const hardwarePreview = useUIStore((s) => s.hardwarePreview);
  const config = useBladeStore((s) => s.config);
  const { boardId } = useBoardProfile();

  // Track the previous code to avoid redundant setTemplate calls
  const prevCodeRef = useRef<string>('');

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (!hardwarePreview) {
      // Preview OFF — clear the preview template and restore normal mode
      engine.setPreviewTemplate(null);
      prevCodeRef.current = '';

      // Restore the engine's render mode to what it should normally be
      const hasRawTemplate = !!config.importedRawCode;
      const mode = hasRawTemplate
        ? 'template-eval'
        : boardId === 'xenopixel'
          ? 'xenopixel'
          : 'proffie';
      engine.setRenderMode(mode);
      return;
    }

    // Preview ON — generate the ProffieOS code from the current config
    // and feed it to the engine's template-eval bridge.
    //
    // Skip if config already has importedRawCode — that's already being
    // rendered pixel-accurately by the normal template-eval path.
    if (config.importedRawCode) return;

    try {
      const code = generateStyleCode(config, { comments: false });

      // Only update if the code actually changed
      if (code !== prevCodeRef.current) {
        prevCodeRef.current = code;
        engine.setRenderMode('template-eval');
        engine.setPreviewTemplate(code);
      }
    } catch {
      // Codegen failed — clear the preview to avoid stale state
      engine.setPreviewTemplate(null);
      prevCodeRef.current = '';
    }
  }, [hardwarePreview, config, boardId, engineRef]);
}
