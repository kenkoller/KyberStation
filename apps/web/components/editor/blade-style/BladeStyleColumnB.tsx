'use client';

// ─── BladeStyleColumnB — Sidebar A/B v2 Phase 2 ────────────────────────
//
// Deep editor for whichever style is active in Column A. Renders:
//
//   1. Header — style name + 1-line description from the catalog
//   2. Style-specific UI — BladePainter / ImageScrollPanel / GradientBuilder
//      mounts conditionally on `config.style`, mirroring the legacy
//      StylePanel block-by-block. Behavior must match exactly so users
//      flipping the `useABLayout` flag don't see a regression.
//   3. Style-specific parameters — per-style sliders driven by
//      STYLE_PARAMS in `styleCatalog.ts` (mirrors the legacy table).
//   4. Downstream-pointer hint — a compact "Color: edit in DESIGN → Color"
//      line so users know where the dropped panels live.
//   5. Randomizer — the existing component, for "Surprise Me" variants
//      restricted to style + adjacent params.
//
// What's deliberately NOT here (per the Phase 2 prompt):
//   - ParameterBank — stays in Inspector → TUNE tab. Collapsing it into
//     Column B is a v1.x change that requires removing it from Inspector
//     simultaneously; Phase 2 keeps the simpler version.
//   - The 4 ColorPickerRows + the 2 conditional ones — color editing now
//     lives in the Color sidebar section (Block 1 already extracted it).
//   - The Hardware (brightness/LED count) collapsible — that lives in
//     the Hardware sidebar section.

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { Randomizer } from '../Randomizer';
import { GradientBuilder } from '../GradientBuilder';
import { GradientMixer } from '../GradientMixer';
import { BladePainter } from '../BladePainter';
import { ImageScrollPanel } from '../ImageScrollPanel';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ScrubField } from '@/components/shared/ScrubField';
import { BLADE_STYLES, STYLE_PARAMS, type StyleParamDef, getBladeStyle } from './styleCatalog';

function StyleParamSlider({
  param,
  value,
  onChange,
}: {
  param: StyleParamDef;
  value: number;
  onChange: (value: number) => void;
}): JSX.Element {
  const decimals = param.step < 1 ? (param.step < 0.1 ? 2 : 1) : 0;
  return (
    <ScrubField
      id={`style-param-${param.key}`}
      label={param.label}
      min={param.min}
      max={param.max}
      step={param.step}
      value={value}
      onChange={onChange}
      format={(v) => v.toFixed(decimals)}
      labelClassName="w-24"
      readoutClassName="w-10"
    />
  );
}

export function BladeStyleColumnB(): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const activeStyleId = config.style;
  const activeStyle = useMemo(() => getBladeStyle(activeStyleId), [activeStyleId]);

  // The legacy StylePanel keys this table by style id; entries for
  // every style without dedicated params (the 21 "Stable / Pulse / etc."
  // cases) are absent, so STYLE_PARAMS[id] === undefined for those —
  // matching legacy behavior of "no params section rendered".
  const params = STYLE_PARAMS[activeStyleId];

  // Match legacy StylePanel: GradientMixer mounts ONLY for `gradient`,
  // BladePainter for `painted`, ImageScrollPanel for `imageScroll`. The
  // existing tests + visual baseline depend on this precise dispatch.
  const showGradientUI = activeStyleId === 'gradient';
  const showPainted = activeStyleId === 'painted';
  const showImageScroll = activeStyleId === 'imageScroll';

  return (
    <div className="flex flex-col h-full" data-testid="blade-style-column-b">
      {/* Sticky header — name + description of whichever style is active.
          Mirrors the existing MainContent panel-header style for consistency. */}
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            {activeStyle?.label ?? activeStyleId}
          </h3>
          {activeStyle && (
            <span className="text-ui-xs text-text-muted truncate">
              {activeStyle.desc}
            </span>
          )}
        </div>
      </header>

      {/* Scrollable body — keeps the deep editor scrolling internally
          without dragging the sticky header along with it. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {/* Style-specific custom UI (painted / imageScroll / gradient).
            These blocks only render when the active style needs them. */}
        {showPainted && (
          <CollapsibleSection
            title="Blade Painter"
            defaultOpen={true}
            persistKey="BladeStyleColumnB.painted"
            headerAccessory={
              <HelpTooltip text="Hand-paint blade colors per LED. The painted strip becomes the live blade output." />
            }
          >
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
              <BladePainter />
            </div>
          </CollapsibleSection>
        )}

        {showImageScroll && (
          <CollapsibleSection
            title="Image Scroll"
            defaultOpen={true}
            persistKey="BladeStyleColumnB.imageScroll"
            headerAccessory={
              <HelpTooltip text="Scroll an image down the blade for light-painting effects. Drop in any PNG / JPG." />
            }
          >
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
              <ImageScrollPanel />
            </div>
          </CollapsibleSection>
        )}

        {/* Style-specific parameters. Only renders when the catalog has
            an entry for this style; matches legacy `STYLE_PARAMS[id] && (…)`
            pattern. The list is sometimes empty (painted / imageScroll have
            empty arrays); we still mount the section for those because the
            gradient mixer is conditional inside it. */}
        {params && (
          <CollapsibleSection
            title="Style Parameters"
            defaultOpen={true}
            persistKey="BladeStyleColumnB.style-parameters"
            headerAccessory={
              <HelpTooltip text="Fine-tune the selected style's behavior. These sliders are specific to the current style — switching styles may show different parameters." />
            }
          >
            <div className="space-y-2 bg-bg-surface rounded-panel p-2 border border-border-subtle">
              {params.map((param) => (
                <StyleParamSlider
                  key={param.key}
                  param={param}
                  value={(config[param.key] as number | undefined) ?? param.defaultValue}
                  onChange={(val) => updateConfig({ [param.key]: val })}
                />
              ))}
              {showGradientUI && (
                <>
                  <GradientBuilder />
                  <GradientMixer />
                </>
              )}
              {params.length === 0 && !showGradientUI && !showPainted && !showImageScroll && (
                <p className="text-ui-xs text-text-muted italic px-1 py-0.5">
                  No tunable parameters for this style.
                </p>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Pointer to the surfaces that USED to live in the StylePanel.
            Color + Hardware moved out in earlier phases; surface where to
            find them so users don't search for missing controls. */}
        <div
          className="rounded-panel border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
          aria-label="Related sections"
        >
          <p className="leading-relaxed">
            Color and brightness moved to dedicated sections — open
            <span className="text-text-secondary"> Color</span> in the sidebar
            for the deep color editor and
            <span className="text-text-secondary"> Hardware</span> for
            brightness + LED count.
          </p>
        </div>

        {/* Randomizer — surprise-me + locks + variants. Same component
            legacy StylePanel mounts at the bottom; keeps the "throw a few
            and see what sticks" workflow intact for this section. */}
        <Randomizer />
      </div>
    </div>
  );
}

// Keep the catalog import surface narrow — re-export only what callers
// (e.g. tests) need to reference the canonical 29-style list.
export { BLADE_STYLES };
