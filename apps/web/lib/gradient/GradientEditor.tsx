'use client';
// ─── GradientEditor / GradientEditorPanel — two layout shapes ───────────────
//
// `<GradientEditor>` — inline card shape, used by ColorPanel.tsx's deep
//   color region. Mode picker as a "Mode" row at the top.
//
// `<GradientEditorPanel>` — CollapsibleSection-wrapped, used by ColorColumnB
//   and BladeStyleColumnB (Phase 2/3 sidebar A/B layout). Mode picker in
//   `headerAccessory`.
//
// Both share the same hook + body to guarantee identical behavior and
// state. Previously two near-duplicate copies (GradientBuilder.tsx +
// ColorPanel.tsx's private GradientRegion) — this file is the single source.

import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { GradientEditorBody } from './GradientEditorBody';
import { InterpolationPicker } from './InterpolationPicker';
import { useGradientEditor } from './useGradientEditor';

export interface GradientEditorPanelProps {
  /** CollapsibleSection title. Default: "Gradient Stops". */
  title?: string;
  /** CollapsibleSection persistKey. Default: `"GradientEditorPanel.stops"`. */
  persistKey?: string;
  /** Whether the section starts open. Default: `true`. */
  defaultOpen?: boolean;
}

/**
 * Inline gradient editor — used by ColorPanel.tsx. Renders a card with the
 * Mode picker at the top and the editor body below. Exposes the
 * `data-testid="gradient-region"` hook used by colorPanel.test.tsx.
 */
export function GradientEditor() {
  const editor = useGradientEditor();
  const { interpolation, setInterpolation, handlePointerMove, handlePointerUp } = editor;

  return (
    <div
      data-testid="gradient-region"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2"
    >
      {/* Interpolation mode picker */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-ui-xs text-text-muted uppercase tracking-wider font-mono">
          Mode
        </span>
        <InterpolationPicker value={interpolation} onChange={setInterpolation} />
      </div>

      <GradientEditorBody editor={editor} />
    </div>
  );
}

/**
 * Panel-shaped gradient editor — used by ColorColumnB + BladeStyleColumnB.
 * Wraps the editor body in a CollapsibleSection with the Mode picker as
 * the header accessory.
 */
export function GradientEditorPanel({
  title = 'Gradient Stops',
  persistKey = 'GradientEditorPanel.stops',
  defaultOpen = true,
}: GradientEditorPanelProps = {}) {
  const editor = useGradientEditor();
  const { interpolation, setInterpolation, handlePointerMove, handlePointerUp } = editor;

  return (
    <div onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <CollapsibleSection
        title={title}
        defaultOpen={defaultOpen}
        persistKey={persistKey}
        headerAccessory={
          <InterpolationPicker value={interpolation} onChange={setInterpolation} />
        }
      >
        <GradientEditorBody editor={editor} />
      </CollapsibleSection>
    </div>
  );
}
