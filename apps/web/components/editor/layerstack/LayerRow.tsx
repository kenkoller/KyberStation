'use client';
import { useState } from 'react';
import { useLayerStore } from '@/stores/layerStore';
import type { BlendMode, LayerRenderState } from '@/stores/layerStore';
import { useUIStore } from '@/stores/uiStore';
import { ScrubField } from '@/components/shared/ScrubField';
import { HIGH_DENSITY_THRESHOLD, LayerThumbnail } from '../LayerThumbnail';
import { BLEND_MODES, TYPE_BADGES } from './constants';
import { ModulatorRow } from './ModulatorRow';

/**
 * Map a render state to the triple of buttons' visual tokens.
 *
 * Uses `--status-*` tokens rather than raw red/green/yellow so color
 * theming and a11y contrast tune centrally. Glyph pairing follows the
 * StatusSignal convention — every color-coded signal has a typographic
 * fallback:
 *
 *   Bypass — ▢ (outlined square)   — status-info / muted when off
 *   Mute   — ▽ (empty triangle)     — status-warn when engaged
 *   Solo   — ◉ (bullseye)            — status-ok when engaged (the
 *            chosen signal for "isolated and playing")
 *
 * We deliberately avoid red for "solo on" — in DAWs red-solo is common
 * but conflicts with `--status-error` semantics and colorblind-safe
 * palette discipline. Green (status-ok) + ◉ reads as "active signal"
 * without implying failure.
 */
const AUDITION_BUTTON_TOKENS = {
  bypass: {
    label: 'B',
    title: 'Bypass — skip layer in compositor (zero CPU)',
    glyphOn: '\u25A2',   // ▢
    glyphOff: '\u25A2',  // ▢
    colorOn: 'rgb(var(--status-info))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-info), 0.15)',
  },
  mute: {
    label: 'M',
    title: 'Mute — composite as black (still pays CPU)',
    glyphOn: '\u25BD',   // ▽
    glyphOff: '\u25BD',  // ▽
    colorOn: 'rgb(var(--status-warn))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-warn), 0.15)',
  },
  solo: {
    label: 'S',
    title: 'Solo — render only soloed layers',
    glyphOn: '\u25C9',   // ◉
    glyphOff: '\u25CB',  // ○
    colorOn: 'rgb(var(--status-ok))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-ok), 0.15)',
  },
} as const;

function AuditionButton({
  kind,
  active,
  onClick,
}: {
  kind: 'bypass' | 'mute' | 'solo';
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const tokens = AUDITION_BUTTON_TOKENS[kind];
  return (
    <button
      onClick={onClick}
      className="touch-target shrink-0 w-5 h-5 text-ui-xs leading-none flex items-center justify-center rounded border transition-colors font-mono"
      style={{
        color: active ? tokens.colorOn : tokens.colorOff,
        background: active ? tokens.bgOn : 'transparent',
        borderColor: active ? tokens.colorOn : 'rgb(var(--border-subtle))',
      }}
      title={`${tokens.title} (${active ? 'on' : 'off'})`}
      aria-label={`${kind} ${active ? 'on' : 'off'}`}
      aria-pressed={active}
      role="switch"
      aria-checked={active}
    >
      <span aria-hidden="true" className="text-ui-xs">
        {active ? tokens.glyphOn : tokens.glyphOff}
      </span>
      <span className="sr-only">{tokens.label}</span>
    </button>
  );
}

export function LayerRow({
  layerId,
  isSelected,
  rowIndex,
  totalRows,
}: {
  layerId: string;
  isSelected: boolean;
  /** 0-indexed position in the rendered row list (for stagger). */
  rowIndex: number;
  /** Total rendered rows (for stagger). */
  totalRows: number;
}) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const layerCount = useLayerStore((s) => s.layers.length);
  const layerIndex = useLayerStore((s) => s.layers.findIndex((l) => l.id === layerId));
  const selectLayer = useLayerStore((s) => s.selectLayer);
  const toggleVisibility = useLayerStore((s) => s.toggleVisibility);
  const setOpacity = useLayerStore((s) => s.setOpacity);
  const setBlendMode = useLayerStore((s) => s.setBlendMode);
  const moveLayer = useLayerStore((s) => s.moveLayer);
  const removeLayer = useLayerStore((s) => s.removeLayer);
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer);
  const toggleBypass = useLayerStore((s) => s.toggleBypass);
  const toggleMute = useLayerStore((s) => s.toggleMute);
  const toggleSolo = useLayerStore((s) => s.toggleSolo);
  // Subscribe to the derived render state at this level; cheap (just
  // reads two booleans + iterates `layers` once). The subscription
  // re-fires when `layers` changes, which is correct — solo state
  // toggling must propagate to every row.
  const renderState: LayerRenderState = useLayerStore((s) =>
    s.getRenderState(layerId),
  );

  const [showOpacity, setShowOpacity] = useState(false);

  // Subscribe to the globally-hovered modulator id so we can faintly
  // tint our own row when a mod is being hovered and this layer is one
  // of the parameters that mod would drive.
  //
  // W6b lands only the 1:1 temporary mapping: any mod being hovered
  // tints the `base` layer below it. Full param-level tinting awaits
  // the v1.1 modulation-routing scaffold (see MODULATION_ROUTING_V1.1.md).
  const hoveredModulatorId = useUIStore((s) => s.hoveredModulatorId);

  if (!layer) return null;

  // ──────────────────────────────────────────────────────────────
  // SmoothSwing delegates to the new ModulatorRow presentation.
  // This is the only structural hand-off for W6b — keeps the
  // LayerStack's mod rows visually distinct from visual layers
  // (magenta edge, live waveform, target label) while still reusing
  // layerStore for B/M/S / reorder / select / duplicate / delete.
  // ──────────────────────────────────────────────────────────────
  if (layer.type === 'smoothswing') {
    return (
      <ModulatorRow
        layerId={layer.id}
        name={layer.name || 'SmoothSwing'}
        kind="sim"
        targetLabel="BLADE_HUM"
        isSelected={isSelected}
      />
    );
  }

  const badge = TYPE_BADGES[layer.type];
  const canMoveUp = layerIndex < layerCount - 1;
  const canMoveDown = layerIndex > 0;

  // Stagger thumbnail updates when row count is high. Below the
  // threshold we let every thumbnail update every frame; above it we
  // round-robin to keep total frame cost under the 16ms budget.
  const shouldStagger = totalRows >= HIGH_DENSITY_THRESHOLD;
  const staggerTurn = shouldStagger ? rowIndex % Math.max(1, totalRows) : undefined;
  const staggerTotal = shouldStagger ? totalRows : undefined;

  // Consumer-side of the hot-mod hover primitive.
  //
  // TEMPORARY 1:1 mapping: any modulator row being hovered highlights
  // every non-modulator layer as a "parameter this mod may drive".
  // The real mapping — per-param routing — ships with v1.1
  // modulation-routing. Rip this block and read `driveTable` from
  // the routing store once that scaffold lands.
  //
  // See `docs/MODULATION_ROUTING_V1.1.md` for the follow-up.
  const isHotModTarget = hoveredModulatorId !== null;

  return (
    <div
      className={`group border transition-colors rounded ${
        isSelected
          ? 'border-accent bg-accent-dim/30'
          : 'border-border-subtle bg-bg-surface hover:border-border-light'
      }`}
      style={
        isHotModTarget
          ? {
              // Faint magenta shadow that tints the row without
              // shifting its layout. Low alpha keeps it tasteful when
              // multiple rows participate.
              boxShadow:
                '0 0 0 1px rgba(var(--status-magenta, 180 106 192), 0.25), inset 2px 0 0 rgba(var(--status-magenta, 180 106 192), 0.4)',
            }
          : undefined
      }
    >
      {/* Main row — compact at ~36px. role="button" + tabIndex makes the
          whole row keyboard-selectable (Enter/Space toggle). The inner
          buttons (reorder, B/M/S, duplicate, delete) remain independently
          focusable and stopPropagation prevents them from re-firing the
          row's select. See the 2026-04-19 a11y audit P1. */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? 'Deselect' : 'Select'} layer ${layer.name}`}
        onClick={() => selectLayer(isSelected ? null : layer.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            selectLayer(isSelected ? null : layer.id);
          }
        }}
      >
        {/* Reorder arrows */}
        <div className="flex flex-col shrink-0" aria-label="Reorder">
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(layer.id, 'up');
            }}
            disabled={!canMoveUp}
            className={`touch-target text-ui-xs leading-none px-1 ${
              canMoveUp
                ? 'text-text-muted hover:text-accent'
                : 'text-text-muted/20 cursor-default'
            }`}
            title="Move up"
            aria-label="Move layer up"
          >
            {'\u25B2'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(layer.id, 'down');
            }}
            disabled={!canMoveDown}
            className={`touch-target text-ui-xs leading-none px-1 ${
              canMoveDown
                ? 'text-text-muted hover:text-accent'
                : 'text-text-muted/20 cursor-default'
            }`}
            title="Move down"
            aria-label="Move layer down"
          >
            {'\u25BC'}
          </button>
        </div>

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(layer.id);
          }}
          className={`touch-target text-ui-sm shrink-0 w-5 text-center transition-colors ${
            layer.visible ? 'text-text-secondary hover:text-accent' : 'text-text-muted/30'
          }`}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
          role="switch"
          aria-checked={layer.visible}
          aria-label={`Layer visibility: ${layer.name}`}
        >
          {layer.visible ? '\u25C9' : '\u25CB'}
        </button>

        {/* Type badge */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${badge.color}`}
          title={layer.type}
          aria-label={`${layer.type} layer`}
        />

        {/* Live thumbnail — 40x8 px. SmoothSwing (the only plate shape
            today) delegates to ModulatorRow above and never reaches
            this branch. */}
        <LayerThumbnail
          layer={layer}
          renderState={renderState}
          staggerTurn={staggerTurn}
          staggerTotal={staggerTotal}
        />

        {/* Layer name */}
        <span
          className={`flex-1 text-ui-base truncate ${
            layer.visible ? 'text-text-primary' : 'text-text-muted line-through'
          }`}
        >
          {layer.name}
        </span>

        {/* Audition controls: Bypass / Mute / Solo */}
        <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Audition controls">
          <AuditionButton
            kind="bypass"
            active={layer.bypass}
            onClick={(e) => {
              e.stopPropagation();
              toggleBypass(layer.id);
            }}
          />
          <AuditionButton
            kind="mute"
            active={layer.mute}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(layer.id);
            }}
          />
          <AuditionButton
            kind="solo"
            active={layer.solo}
            onClick={(e) => {
              e.stopPropagation();
              toggleSolo(layer.id);
            }}
          />
        </div>

        {/* Opacity + blend-mode only apply to visual (pixel-output)
            layers. Plates (SmoothSwing) route audio and use the
            ModulatorRow presentation above. */}
        {/* Opacity indicator (click to expand slider) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowOpacity(!showOpacity);
          }}
          className="text-ui-xs text-text-muted font-mono shrink-0 hover:text-accent transition-colors w-8 text-right"
          title="Opacity"
          aria-label="Toggle opacity slider"
        >
          {Math.round(layer.opacity * 100)}%
        </button>

        {/* Blend mode dropdown */}
        <select
          value={layer.blendMode}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setBlendMode(layer.id, e.target.value as BlendMode)}
          className="text-ui-xs bg-transparent border-none text-text-muted cursor-pointer shrink-0 w-12 p-0"
          title="Blend mode"
          aria-label="Blend mode"
        >
          {BLEND_MODES.map((bm) => (
            <option key={bm.id} value={bm.id}>
              {bm.label}
            </option>
          ))}
        </select>

        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateLayer(layer.id);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-accent focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Duplicate layer"
          aria-label="Duplicate layer"
        >
          {'\u2398'}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeLayer(layer.id);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-red-400 focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Remove layer"
          aria-label="Remove layer"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Opacity slider (expanded) — visual layers only. */}
      {showOpacity && (
        <ScrubField
          label="Opacity"
          min={0} max={100}
          value={Math.round(layer.opacity * 100)}
          onChange={(v) => setOpacity(layer.id, v / 100)}
          ariaLabel="Layer opacity"
          unit="%"
          className="gap-2 px-3 pb-2"
          labelClassName="w-auto"
          readoutClassName="w-8"
        />
      )}
    </div>
  );
}
