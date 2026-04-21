'use client';
import { useLayerStore } from '@/stores/layerStore';
import { useUIStore } from '@/stores/uiStore';
import { ModulatorViz, type ModulatorKind } from './ModulatorViz';

// ─── Inline audition button ─────────────────────────────────────────────────
//
// Copied in shape (not extracted) from LayerRow so W6b stays narrow — the
// modulator row only needs B/M/S, no bypass glyph divergence, no lengthy
// tooltip machinery. Colors and glyphs mirror LayerRow so the two rows
// read as siblings.

interface AuditionTokens {
  label: 'B' | 'M' | 'S';
  title: string;
  glyph: string;
  colorOn: string;
  colorOff: string;
  bgOn: string;
}

const MOD_AUDITION_TOKENS: Record<'bypass' | 'mute' | 'solo', AuditionTokens> = {
  bypass: {
    label: 'B',
    title: 'Bypass modulator (no audio routing)',
    glyph: '\u25A2',
    colorOn: 'rgb(var(--status-info))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-info), 0.15)',
  },
  mute: {
    label: 'M',
    title: 'Mute modulator (silent, still pays CPU)',
    glyph: '\u25BD',
    colorOn: 'rgb(var(--status-warn))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-warn), 0.15)',
  },
  solo: {
    label: 'S',
    title: 'Solo modulator (isolate)',
    glyph: '\u25C9',
    colorOn: 'rgb(var(--status-ok))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-ok), 0.15)',
  },
};

function ModAuditionButton({
  kind,
  active,
  onClick,
}: {
  kind: 'bypass' | 'mute' | 'solo';
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const tokens = MOD_AUDITION_TOKENS[kind];
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
      <span aria-hidden="true">{tokens.glyph}</span>
      <span className="sr-only">{tokens.label}</span>
    </button>
  );
}

// ─── ModulatorRow ────────────────────────────────────────────────────────────

export interface ModulatorRowProps {
  layerId: string;
  /** Display name, e.g. "SmoothSwing". */
  name: string;
  /** Viz kind — lfo / env / sim / state. */
  kind: ModulatorKind;
  /**
   * Free-text label describing what parameter the modulator drives, shown
   * at the right of the row in uppercase mono. Example: `BLADE_HUM`.
   */
  targetLabel?: string;
  /**
   * Identity color override. Defaults to `rgb(var(--status-magenta))`
   * (the aviation modulation/routing color per W1).
   */
  color?: string;
  /** Whether this row is the currently-selected layer. */
  isSelected: boolean;
}

const DEFAULT_MOD_COLOR = 'rgb(var(--status-magenta, 180 106 192))';

/**
 * Inline modulator plate row for the LayerStack.
 *
 * Matches the Claude Design reference `.mod-row` shape (W6 in
 * `docs/WORKBENCH_UX_REALIGNMENT_2026-04-20.md`):
 *
 *   `18px | 80px | 1fr | auto`
 *   drag-handle | name | live-viz | target-label
 *
 * Identity color propagates through `--mod-color` (consumed by the
 * left-edge accent stripe + viz stroke + hover tint). Defaults to the
 * W1-introduced aviation magenta.
 *
 * Hovering the row publishes `layerId` to `useUIStore.hoveredModulatorId`
 * so downstream parameter renderers can faintly tint themselves to
 * "show me what this mod drives" (§7 modulatorHoverHighlight, North
 * Star). Actual routing lookup (param ↔ mod) is v1.1 modulation-routing
 * sprint territory — today's mapping is a temporary 1:1 from the one
 * existing modulator (SmoothSwing) to the Base layer below it.
 */
export function ModulatorRow({
  layerId,
  name,
  kind,
  targetLabel,
  color = DEFAULT_MOD_COLOR,
  isSelected,
}: ModulatorRowProps) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const selectLayer = useLayerStore((s) => s.selectLayer);
  const toggleBypass = useLayerStore((s) => s.toggleBypass);
  const toggleMute = useLayerStore((s) => s.toggleMute);
  const toggleSolo = useLayerStore((s) => s.toggleSolo);
  const moveLayer = useLayerStore((s) => s.moveLayer);
  const removeLayer = useLayerStore((s) => s.removeLayer);
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer);
  const layerCount = useLayerStore((s) => s.layers.length);
  const layerIndex = useLayerStore((s) => s.layers.findIndex((l) => l.id === layerId));

  const hoveredModulatorId = useUIStore((s) => s.hoveredModulatorId);
  const setHoveredModulator = useUIStore((s) => s.setHoveredModulator);

  if (!layer) return null;

  const isHot = hoveredModulatorId === layerId;
  const canMoveUp = layerIndex < layerCount - 1;
  const canMoveDown = layerIndex > 0;

  // CSS custom prop the stripe + hover glow consume. Inline-scoped so
  // multiple modulators can coexist with different identity colors.
  //
  // We stack up to three inset shadows so the left-edge accent stripe
  // stays visible while hover also adds a subtle full-row glow. Avoids
  // `color-mix()` — it's the only place we'd use it and browser support
  // is thinner than the rest of our palette discipline requires.
  const stripeShadow = `inset 2px 0 0 ${color}`;
  const hoverShadow = isHot
    ? `${stripeShadow}, inset 0 0 0 1px ${color}, 0 0 0 1px rgba(var(--status-magenta, 180 106 192), 0.15)`
    : stripeShadow;
  const rowStyle: React.CSSProperties = {
    // --mod-color drives the accent stripe + viz stroke via the cascade
    ['--mod-color' as string]: color,
    gridTemplateColumns: '18px 80px 1fr auto',
    height: 'var(--row-h, 26px)',
    background: isSelected ? 'rgba(var(--accent), 0.12)' : 'rgb(var(--bg-surface))',
    borderColor: isSelected ? 'rgb(var(--accent))' : 'rgb(var(--border-subtle))',
    boxShadow: hoverShadow,
  };

  return (
    <div
      className="group grid items-center gap-1.5 px-2 rounded border transition-colors cursor-pointer font-mono"
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} modulator ${name}`}
      style={rowStyle}
      onClick={() => selectLayer(isSelected ? null : layerId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          selectLayer(isSelected ? null : layerId);
        }
      }}
      onPointerEnter={() => setHoveredModulator(layerId)}
      onPointerLeave={() => setHoveredModulator(null)}
      onFocus={() => setHoveredModulator(layerId)}
      onBlur={() => setHoveredModulator(null)}
    >
      {/* 18px — drag handle + reorder */}
      <div
        className="flex flex-col items-center justify-center shrink-0 select-none"
        aria-label="Reorder"
        title="Drag or use arrows to reorder"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            moveLayer(layerId, 'up');
          }}
          disabled={!canMoveUp}
          className={`text-ui-xs leading-[0.8] ${
            canMoveUp ? 'text-text-muted hover:text-accent' : 'text-text-muted/20 cursor-default'
          }`}
          aria-label="Move modulator up"
        >
          {'\u25B2'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            moveLayer(layerId, 'down');
          }}
          disabled={!canMoveDown}
          className={`text-ui-xs leading-[0.8] ${
            canMoveDown ? 'text-text-muted hover:text-accent' : 'text-text-muted/20 cursor-default'
          }`}
          aria-label="Move modulator down"
        >
          {'\u25BC'}
        </button>
      </div>

      {/* 80px — name, identity-colored */}
      <span
        className="truncate text-ui-xs tracking-wide"
        style={{ color, fontWeight: 500 }}
        title={name}
      >
        {name}
      </span>

      {/* 1fr — live waveform viz */}
      <div className="min-w-0 h-[18px]">
        <ModulatorViz kind={kind} color={color} width={80} height={18} seed={layerIndex} />
      </div>

      {/* auto — target label + audition triple + trailing actions */}
      <div className="flex items-center gap-1 shrink-0">
        {targetLabel && (
          <span
            className="text-[9px] uppercase tracking-[0.04em] whitespace-nowrap"
            style={{ color, opacity: 0.9 }}
            title={`Drives ${targetLabel}`}
          >
            {targetLabel}
          </span>
        )}
        <div
          className="flex items-center gap-0.5 shrink-0"
          role="group"
          aria-label="Audition controls"
        >
          <ModAuditionButton
            kind="bypass"
            active={layer.bypass}
            onClick={(e) => {
              e.stopPropagation();
              toggleBypass(layerId);
            }}
          />
          <ModAuditionButton
            kind="mute"
            active={layer.mute}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(layerId);
            }}
          />
          <ModAuditionButton
            kind="solo"
            active={layer.solo}
            onClick={(e) => {
              e.stopPropagation();
              toggleSolo(layerId);
            }}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateLayer(layerId);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-accent focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Duplicate modulator"
          aria-label="Duplicate modulator"
        >
          {'\u2398'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeLayer(layerId);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-red-400 focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Remove modulator"
          aria-label="Remove modulator"
        >
          {'\u2715'}
        </button>
      </div>
    </div>
  );
}
