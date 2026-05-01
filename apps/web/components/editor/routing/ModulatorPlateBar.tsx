'use client';

// ─── ModulatorPlateBar — v1.1 Core + Wave 8 UI shell ──────────────────
//
// Renders all 19 built-in modulators as clickable "plates", organized
// into category sections (MOTION / AUDIO / POWER / STATE / BUTTON /
// GESTURE) so the user can find related signals at a glance. The
// underlying interaction model is unchanged — each plate still arms
// click-to-route AND acts as an HTML5 drag source for drag-to-route.
//
// Interaction (two parallel paths, both supported):
//
//   A. Click-to-route (keyboard / accessibility-friendly path):
//     1. User clicks a plate → arms it (sets uiStore.armedModulatorId)
//     2. User clicks any numeric scrub field → binding created via
//        useClickToRoute hook
//     3. Clicking the armed plate again, or pressing Escape, disarms
//
//   B. Drag-to-route (Wave 5 — primary mouse/trackpad path,
//      Vital / Bitwig pattern):
//     1. User drags a plate (HTML5 drag-and-drop)
//     2. dragstart writes the modulator id under the
//        MODULATOR_DRAG_MIME_TYPE key on the dataTransfer
//     3. ParameterBank slider rows accept the drop and create the
//        binding via useClickToRoute().dragBind(...)
//     4. The armed-plate state is NOT touched during drag — the two
//        flows are deliberately independent. Browsers separate
//        click-vs-drag automatically when a drag actually starts;
//        the plate's onClick still fires for non-drag clicks.
//
// Plates hidden entirely when the current board doesn't support
// modulation (CFX / Xenopixel / Verso / Proffie V2.2 for v1.0).
//
// Live viz is a lightweight CSS-driven shape per modulator kind:
//   - swing:               traveling wave bars (kinetic feel)
//   - sound:               pulsing VU-meter column
//   - angle:               tilting needle
//   - twist:               rotating axis bar (spin about long axis)
//   - time:                sweeping hand
//   - clash:               flash decay pulse
//   - battery:             cell with animating fill level
//   - lockup:              pinned bright center + sustained ring pulse
//   - preon:               flickering charge-up spark
//   - ignition:            left-to-right extension wipe (one-shot loop)
//   - retraction:          right-to-left contraction wipe (one-shot loop)
//   - aux-click:           square button "tap" pulse
//   - aux-hold:            pinned button with slow ring pulse
//   - aux-double-click:    square button with two staggered pulses
//   - gesture-twist:       rotating arc-arrow loop
//   - gesture-stab:        forward-shooting arrow dart
//   - gesture-swing:       sweeping arc swoosh
//   - gesture-clash:       discrete-edge collision flash
//   - gesture-shake:       oscillating side-to-side bar
//
// All 19 modulator descriptors live in
// `packages/engine/src/modulation/registry.ts`.

import { useEffect } from 'react';
import {
  BUILT_IN_MODULATORS,
  type ModulatorDescriptor,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useUIStore } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';
import { getParameter } from '@/lib/parameterGroups';
import { MODULATOR_DRAG_MIME_TYPE } from '@/hooks/useClickToRoute';

// ─── Category groupings ──────────────────────────────────────────────
//
// Wave 8 UI shell (2026-05-01). At 11 plates the bar fit one tidy
// `auto-fill` grid; at 19 the user benefits from explicit grouping so
// related signals stay adjacent and the BUTTON / GESTURE families read
// as a separate intent surface from the existing motion/effect signals.
//
// Each category renders as its own `auto-fill` minmax grid with a
// caption header. Drag + click semantics on individual plates are
// identical across categories — categorization is purely organizational.

interface ModulatorCategory {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly modulatorIds: readonly string[];
}

const MODULATOR_CATEGORIES: readonly ModulatorCategory[] = [
  {
    id: 'motion',
    label: 'Motion',
    description: 'Continuous orientation + movement signals',
    modulatorIds: ['swing', 'angle', 'twist'],
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Sound envelope',
    modulatorIds: ['sound'],
  },
  {
    id: 'power',
    label: 'Power',
    description: 'System time + battery',
    modulatorIds: ['battery', 'time'],
  },
  {
    id: 'state',
    label: 'State',
    description: 'Effect lifecycle + impact signals',
    modulatorIds: ['clash', 'lockup', 'preon', 'ignition', 'retraction'],
  },
  {
    id: 'button',
    label: 'Button',
    description: 'Aux button events',
    modulatorIds: ['aux-click', 'aux-hold', 'aux-double-click'],
  },
  {
    id: 'gesture',
    label: 'Gesture',
    description: 'IMU-detected gesture events',
    modulatorIds: [
      'gesture-twist',
      'gesture-stab',
      'gesture-swing',
      'gesture-clash',
      'gesture-shake',
    ],
  },
];

// Stable empty array reference — passing `[]` as a Zustand selector
// fallback creates a new reference every render and triggers an
// infinite-rerender loop. Mirrors the BindingList pattern (dcd4dd4).
const EMPTY_BINDINGS: readonly SerializedBinding[] = [];

export function ModulatorPlateBar() {
  const boardId = useBoardProfile().boardId;
  const armedModulatorId = useUIStore((s) => s.armedModulatorId);
  const setArmedModulatorId = useUIStore((s) => s.setArmedModulatorId);

  // Escape key disarms globally.
  useEffect(() => {
    if (armedModulatorId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArmedModulatorId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armedModulatorId, setArmedModulatorId]);

  // Gate: board must support modulation.
  if (!canBoardModulate(boardId)) {
    return (
      <div className="p-3 text-ui-xs text-text-muted/70 text-center">
        Modulation not supported on this board. Pick a Proffie V3.9 or
        Golden Harvest V3 to unlock routing.
      </div>
    );
  }

  // v1.1 Core + Wave 8 LITE: surface all 19 built-in modulators
  // organized into 6 category sections.
  const descriptorsById = new Map<string, ModulatorDescriptor>(
    BUILT_IN_MODULATORS.map((d) => [d.id as string, d]),
  );

  return (
    <div className="space-y-3" role="toolbar" aria-label="Modulator plates">
      <p className="text-ui-xs text-text-muted/80 leading-snug">
        Drag a modulator onto any numeric parameter to wire it up — or
        click to arm, then click the parameter. Press <kbd className="font-mono text-[10px] px-1 rounded bg-bg-deep border border-border-subtle">Esc</kbd> to cancel.
      </p>
      {MODULATOR_CATEGORIES.map((category) => {
        const categoryPlates = category.modulatorIds
          .map((id) => descriptorsById.get(id))
          .filter((d): d is ModulatorDescriptor => d !== undefined);

        // Defensive: if the registry is reshaped and a category ends up
        // empty, skip it rather than render an empty header. Shouldn't
        // happen in practice — a typecheck-clean registry has all 19.
        if (categoryPlates.length === 0) return null;

        return (
          <section
            key={category.id}
            data-testid={`modulator-category-${category.id}`}
            aria-labelledby={`modulator-category-${category.id}-label`}
            className="space-y-1.5"
          >
            <h5
              id={`modulator-category-${category.id}-label`}
              className="font-mono uppercase text-[10px] tracking-[0.14em] text-text-muted/70 px-0.5"
              title={category.description}
            >
              {category.label}
            </h5>
            <div
              // Column-width-aware grid. Tailwind responsive breakpoints
              // (sm/lg/xl) respond to VIEWPORT width, not container width
              // — when the plate bar is rendered inside a 220-400px
              // sidebar A/B Column A, viewport-based `xl:grid-cols-6`
              // activated and squished plates so badly that
              // "RETRACTION" / "IGNITION" / "LOCKUP" labels overflowed
              // and the live glyphs visibly overlapped each other (Bug
              // fix 2026-04-30). `auto-fill` minmax sizes by available
              // width regardless of where the bar is mounted.
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
            >
              {categoryPlates.map((plate) => (
                <ModulatorPlate
                  key={plate.id as string}
                  descriptor={plate}
                  armed={armedModulatorId === (plate.id as string)}
                  onClick={() => {
                    if (armedModulatorId === (plate.id as string)) {
                      setArmedModulatorId(null);
                    } else {
                      setArmedModulatorId(plate.id as string);
                    }
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
      {armedModulatorId && (
        <div
          className="text-ui-xs px-2 py-1 rounded flex items-center gap-2"
          style={{
            background: 'rgba(var(--status-magenta), 0.08)',
            border: '1px solid rgba(var(--status-magenta), 0.4)',
            color: 'rgb(var(--status-magenta))',
          }}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">◎</span>
          <span className="font-mono uppercase tracking-wider">
            {armedModulatorId} armed — click any numeric parameter to wire
          </span>
        </div>
      )}
    </div>
  );
}

// ── Individual plate ─────────────────────────────────────────────────

interface ModulatorPlateProps {
  descriptor: ModulatorDescriptor;
  armed: boolean;
  onClick: () => void;
}

function ModulatorPlate({ descriptor, armed, onClick }: ModulatorPlateProps) {
  const color = descriptor.colorVar;
  const name = descriptor.displayName;
  const id = descriptor.id as string;
  const setHoveredModulator = useUIStore((s) => s.setHoveredModulator);

  // Reciprocal hover (Wave 2): when the user hovers a parameter row in
  // ParameterBank, every plate that drives that param subtly accents
  // itself. Symmetric with the existing plate→params direction.
  const hoveredParameterPath = useUIStore((s) => s.hoveredParameterPath);
  const bindings = useBladeStore((s) => s.config.modulation?.bindings ?? EMPTY_BINDINGS);

  const isDrivenByThis =
    hoveredParameterPath !== null &&
    bindings.some(
      (b) => b.source === id && b.target === hoveredParameterPath && !b.bypassed,
    );

  // Armed state's full-strength outline is more emphatic; reciprocal
  // hover stays subtle so the two are visually distinct.
  const showReciprocal = isDrivenByThis && !armed;

  const reciprocalParamLabel = showReciprocal
    ? (getParameter(hoveredParameterPath as string)?.displayName ??
        hoveredParameterPath)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHoveredModulator(id)}
      onPointerLeave={() => setHoveredModulator(null)}
      onFocus={() => setHoveredModulator(id)}
      onBlur={() => setHoveredModulator(null)}
      // ── Wave 5 drag-to-route ──
      // Plate is a drag source. The drop target (slider rows in
      // ParameterBank) reads the modulator id under the specific
      // MIME type and calls `useClickToRoute().dragBind(...)`.
      // We don't set a custom drag image — the default browser
      // drag image (the plate ghosted under the cursor) is good
      // enough for v1.1 Core. A future polish pass can add a
      // portaled "wire from plate to cursor" if Ken wants it.
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MODULATOR_DRAG_MIME_TYPE, id);
        e.dataTransfer.effectAllowed = 'link';
      }}
      className={[
        'relative group flex flex-col gap-1 px-2 py-2 rounded border transition-all text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        armed ? 'scale-[1.02]' : 'hover:scale-[1.01]',
      ].join(' ')}
      style={{
        // --mod-color is consumed by the accent stripe and the live-viz.
        // Background stays flat even when armed — the accent stripe +
        // outer ring carry the state. Avoiding color-mix() per codebase
        // convention (uneven browser support at our release baseline).
        ['--mod-color' as string]: color,
        background: 'rgb(var(--bg-surface))',
        borderColor: armed ? color : 'rgb(var(--border-subtle))',
        // Layered box-shadow priority: armed > reciprocal hover > base.
        // Reciprocal applies a 1.5px outer ring (subtler than armed's
        // full 1px solid + scale combo) preserving the inset stripe.
        boxShadow: armed
          ? `inset 3px 0 0 ${color}, 0 0 0 1px ${color}`
          : showReciprocal
            ? `inset 3px 0 0 ${color}, 0 0 0 1.5px ${color}`
            : `inset 3px 0 0 ${color}`,
      }}
      title={
        showReciprocal && reciprocalParamLabel
          ? `${name} modulator · drives ${reciprocalParamLabel}`
          : `${name} modulator · range ${descriptor.range[0]}..${descriptor.range[1]}${descriptor.unit ? ' ' + descriptor.unit : ''}`
      }
      aria-pressed={armed}
      aria-label={`${armed ? 'Disarm' : 'Arm'} ${name} modulator`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono uppercase tracking-[0.1em] text-ui-xs font-semibold"
          style={{ color }}
        >
          {name}
        </span>
        <span
          className="text-[9px] font-mono uppercase tracking-wider"
          style={{ color, opacity: showReciprocal ? 1 : 0.7 }}
          aria-hidden="true"
        >
          {id}
        </span>
      </div>
      <ModulatorGlyph kind={id} color={color} />
      {armed && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: color }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ── Minimal per-modulator live glyph ─────────────────────────────────

function ModulatorGlyph({ kind, color }: { kind: string; color: string }) {
  const common = { color, height: 14 };
  switch (kind) {
    case 'swing':              return <SwingGlyph {...common} />;
    case 'sound':              return <SoundGlyph {...common} />;
    case 'angle':              return <AngleGlyph {...common} />;
    case 'twist':              return <TwistGlyph {...common} />;
    case 'time':               return <TimeGlyph {...common} />;
    case 'clash':              return <ClashGlyph {...common} />;
    case 'battery':            return <BatteryGlyph {...common} />;
    case 'lockup':             return <LockupGlyph {...common} />;
    case 'preon':              return <PreonGlyph {...common} />;
    case 'ignition':           return <IgnitionGlyph {...common} />;
    case 'retraction':         return <RetractionGlyph {...common} />;
    case 'aux-click':          return <AuxClickGlyph {...common} />;
    case 'aux-hold':           return <AuxHoldGlyph {...common} />;
    case 'aux-double-click':   return <AuxDoubleClickGlyph {...common} />;
    case 'gesture-twist':      return <GestureTwistGlyph {...common} />;
    case 'gesture-stab':       return <GestureStabGlyph {...common} />;
    case 'gesture-swing':      return <GestureSwingGlyph {...common} />;
    case 'gesture-clash':      return <GestureClashGlyph {...common} />;
    case 'gesture-shake':      return <GestureShakeGlyph {...common} />;
    default:                   return <div style={{ height: 14 }} />;
  }
}

function SwingGlyph({ color, height }: { color: string; height: number }) {
  // 3 traveling bars — CSS animation carries them
  return (
    <div className="flex items-end gap-0.5" style={{ height }} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="flex-1 rounded-sm"
          style={{
            background: color,
            opacity: 0.6,
            height: `${40 + ((i * 17) % 60)}%`,
            animation: `swing-bar 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes swing-bar {
          0%   { transform: scaleY(0.4); opacity: 0.4; }
          100% { transform: scaleY(1.0); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function SoundGlyph({ color, height }: { color: string; height: number }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height }} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="flex-1 rounded-sm"
          style={{
            background: color,
            opacity: 0.7,
            height: `${30 + ((i * 23) % 70)}%`,
            animation: `vu-bar 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes vu-bar {
          0%   { transform: scaleY(0.2); }
          100% { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}

function AngleGlyph({ color, height }: { color: string; height: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="absolute origin-bottom"
        style={{
          width: 2,
          height: height - 2,
          background: color,
          animation: 'angle-tilt 2s ease-in-out infinite alternate',
        }}
      />
      <style jsx>{`
        @keyframes angle-tilt {
          0%   { transform: rotate(-30deg); }
          100% { transform: rotate(30deg); }
        }
      `}</style>
    </div>
  );
}

function TimeGlyph({ color, height }: { color: string; height: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="rounded-full"
        style={{
          width: height - 4,
          height: height - 4,
          border: `1px solid ${color}`,
          opacity: 0.5,
        }}
      />
      <span
        className="absolute origin-bottom"
        style={{
          width: 1.5,
          height: (height - 4) / 2,
          background: color,
          bottom: '50%',
          animation: 'time-sweep 4s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes time-sweep {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ClashGlyph({ color, height }: { color: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="rounded-full"
        style={{
          width: height,
          height: height,
          background: color,
          animation: 'clash-flash 2.6s cubic-bezier(.2,.8,.2,1) infinite',
        }}
      />
      <style jsx>{`
        @keyframes clash-flash {
          0%   { transform: scale(0.2); opacity: 0; }
          5%   { transform: scale(1.0); opacity: 1; }
          40%  { transform: scale(0.6); opacity: 0.3; }
          100% { transform: scale(0.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function TwistGlyph({ color, height }: { color: string; height: number }) {
  // Horizontal bar that 2D-rotates about its center, evoking spin
  // about the blade's long axis.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="rounded-sm"
        style={{
          width: height + 6,
          height: 2,
          background: color,
          opacity: 0.85,
          animation: 'twist-spin 1.6s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes twist-spin {
          0%   { transform: rotate(0deg)   scaleX(1.0); }
          25%  { transform: rotate(90deg)  scaleX(0.3); }
          50%  { transform: rotate(180deg) scaleX(1.0); }
          75%  { transform: rotate(270deg) scaleX(0.3); }
          100% { transform: rotate(360deg) scaleX(1.0); }
        }
      `}</style>
    </div>
  );
}

function BatteryGlyph({ color, height }: { color: string; height: number }) {
  // Battery body with a small terminal nub on the right; the inner
  // fill bar animates between low and full.
  const bodyW = height + 4;
  const bodyH = height - 4;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="relative inline-flex items-center"
        style={{
          width: bodyW,
          height: bodyH,
          border: `1px solid ${color}`,
          borderRadius: 1,
          padding: 1,
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            background: color,
            opacity: 0.85,
            animation: 'battery-fill 2.4s ease-in-out infinite alternate',
          }}
        />
        {/* terminal nub */}
        <span
          style={{
            position: 'absolute',
            right: -2,
            top: '25%',
            width: 1,
            height: '50%',
            background: color,
          }}
        />
      </span>
      <style jsx>{`
        @keyframes battery-fill {
          0%   { width: 25%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

function LockupGlyph({ color, height }: { color: string; height: number }) {
  // Held-bright center dot with a sustained pulsing ring around it —
  // reads as a steady "locked" state with live energy.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="absolute rounded-full"
        style={{
          width: height - 2,
          height: height - 2,
          border: `1px solid ${color}`,
          opacity: 0.6,
          animation: 'lockup-ring 1.4s ease-in-out infinite',
        }}
      />
      <span
        className="rounded-full"
        style={{
          width: height / 2,
          height: height / 2,
          background: color,
          animation: 'lockup-core 1.4s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes lockup-ring {
          0%, 100% { transform: scale(0.7); opacity: 0.7; }
          50%      { transform: scale(1.05); opacity: 0.25; }
        }
        @keyframes lockup-core {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}

function PreonGlyph({ color, height }: { color: string; height: number }) {
  // Pre-ignition charge-up: a small dim spark that flickers and
  // grows, never quite reaching full brightness.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="rounded-full"
        style={{
          width: height / 2,
          height: height / 2,
          background: color,
          filter: `drop-shadow(0 0 2px ${color})`,
          animation: 'preon-spark 1.1s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes preon-spark {
          0%   { transform: scale(0.4); opacity: 0.2; }
          20%  { transform: scale(0.7); opacity: 0.6; }
          35%  { transform: scale(0.5); opacity: 0.3; }
          55%  { transform: scale(0.85); opacity: 0.75; }
          70%  { transform: scale(0.65); opacity: 0.5; }
          100% { transform: scale(1.0); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function IgnitionGlyph({ color, height }: { color: string; height: number }) {
  // One-shot extension wipe: bar grows from left edge to full width,
  // resets, repeats. Reads as "blade extending."
  return (
    <div
      className="relative flex items-center"
      style={{ height, width: '100%' }}
      aria-hidden="true"
    >
      <span
        className="block rounded-sm"
        style={{
          height: 3,
          background: color,
          boxShadow: `0 0 4px ${color}`,
          transformOrigin: 'left center',
          animation: 'ignition-extend 1.6s cubic-bezier(.4,.0,.2,1) infinite',
        }}
      />
      <style jsx>{`
        @keyframes ignition-extend {
          0%   { width: 0%;   opacity: 0.4; }
          15%  { width: 20%;  opacity: 0.9; }
          85%  { width: 100%; opacity: 1.0; }
          92%  { width: 100%; opacity: 1.0; }
          100% { width: 100%; opacity: 0.0; }
        }
      `}</style>
    </div>
  );
}

function RetractionGlyph({ color, height }: { color: string; height: number }) {
  // One-shot retraction wipe: bar starts full, contracts toward the
  // right edge (i.e. retreats toward the hilt). Reads as "blade
  // retracting."
  return (
    <div
      className="relative flex items-center justify-end"
      style={{ height, width: '100%' }}
      aria-hidden="true"
    >
      <span
        className="block rounded-sm"
        style={{
          height: 3,
          background: color,
          boxShadow: `0 0 4px ${color}`,
          transformOrigin: 'right center',
          animation: 'retraction-contract 1.6s cubic-bezier(.4,.0,.2,1) infinite',
        }}
      />
      <style jsx>{`
        @keyframes retraction-contract {
          0%   { width: 100%; opacity: 1.0; }
          15%  { width: 100%; opacity: 1.0; }
          85%  { width: 8%;   opacity: 0.6; }
          100% { width: 0%;   opacity: 0.0; }
        }
      `}</style>
    </div>
  );
}

// ─── Wave 8 LITE — aux/gesture event glyphs ─────────────────────────

function AuxClickGlyph({ color, height }: { color: string; height: number }) {
  // Square button outline with a single inner pulse — reads as a
  // discrete tap.
  const size = height - 2;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="absolute"
        style={{
          width: size,
          height: size,
          border: `1px solid ${color}`,
          borderRadius: 2,
          opacity: 0.7,
        }}
      />
      <span
        className="rounded-sm"
        style={{
          width: size - 4,
          height: size - 4,
          background: color,
          animation: 'auxclick-pulse 1.4s ease-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes auxclick-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          5%            { transform: scale(1.0); opacity: 1.0; }
          30%           { transform: scale(0.7); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function AuxHoldGlyph({ color, height }: { color: string; height: number }) {
  // Square button kept lit + a slow ring pulse around it — reads as
  // sustained hold.
  const size = height - 2;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="absolute"
        style={{
          width: size + 4,
          height: size + 4,
          border: `1px solid ${color}`,
          borderRadius: 3,
          opacity: 0.5,
          animation: 'auxhold-ring 1.8s ease-in-out infinite',
        }}
      />
      <span
        className="rounded-sm"
        style={{
          width: size - 2,
          height: size - 2,
          background: color,
          animation: 'auxhold-core 1.8s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes auxhold-ring {
          0%, 100% { transform: scale(0.85); opacity: 0.7; }
          50%      { transform: scale(1.05); opacity: 0.25; }
        }
        @keyframes auxhold-core {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}

function AuxDoubleClickGlyph({ color, height }: { color: string; height: number }) {
  // Two side-by-side mini-squares pulsing in close succession — reads
  // as a double-tap.
  const size = height - 4;
  return (
    <div
      className="relative flex items-center justify-center gap-1"
      style={{ height }}
      aria-hidden="true"
    >
      {[0, 1].map((i) => (
        <span
          key={i}
          className="rounded-sm"
          style={{
            width: size,
            height: size,
            background: color,
            animation: `auxdbl-pulse 1.2s ease-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes auxdbl-pulse {
          0%, 60%, 100% { transform: scale(0.7); opacity: 0.4; }
          5%            { transform: scale(1.0); opacity: 1.0; }
          25%           { transform: scale(0.75); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function GestureTwistGlyph({ color, height }: { color: string; height: number }) {
  // Curved arrow loop rotating about its center — distinct from the
  // continuous `twist` glyph (axis-bar spin) by being arc-shaped.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <svg
        width={height}
        height={height}
        viewBox="0 0 16 16"
        style={{ animation: 'gesture-twist-spin 1.8s linear infinite' }}
      >
        <path
          d="M 8 2 A 6 6 0 1 1 2 8"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M 8 2 L 6 0.5 M 8 2 L 6 3.5"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <style jsx>{`
        @keyframes gesture-twist-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function GestureStabGlyph({ color, height }: { color: string; height: number }) {
  // Forward-shooting arrow — reads as a thrust / poke gesture.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height, width: '100%' }}
      aria-hidden="true"
    >
      <span
        className="absolute flex items-center"
        style={{
          left: 0,
          right: 0,
          height: 2,
          animation: 'gesture-stab-thrust 1.2s ease-out infinite',
        }}
      >
        <span
          className="block flex-1 rounded-sm"
          style={{ height: 2, background: color }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 0,
            height: 0,
            borderLeft: `5px solid ${color}`,
            borderTop: `4px solid transparent`,
            borderBottom: `4px solid transparent`,
            marginLeft: -1,
          }}
        />
      </span>
      <style jsx>{`
        @keyframes gesture-stab-thrust {
          0%, 100% { transform: translateX(-30%); opacity: 0.4; }
          25%      { transform: translateX(0);    opacity: 1.0; }
          55%      { transform: translateX(20%);  opacity: 0.8; }
          85%      { transform: translateX(-30%); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

function GestureSwingGlyph({ color, height }: { color: string; height: number }) {
  // Sweeping arc — reads as a discrete swing event (distinct from
  // continuous `swing` modulator's traveling bars).
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <svg width={height + 2} height={height} viewBox="0 0 18 14">
        <path
          d="M 2 12 Q 9 0 16 12"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="22"
          style={{
            animation: 'gesture-swing-arc 1.6s ease-in-out infinite',
          }}
        />
      </svg>
      <style jsx>{`
        @keyframes gesture-swing-arc {
          0%   { stroke-dashoffset: 22; opacity: 0.3; }
          25%  { stroke-dashoffset: 0;  opacity: 1.0; }
          75%  { stroke-dashoffset: 0;  opacity: 0.7; }
          100% { stroke-dashoffset: -22; opacity: 0.0; }
        }
      `}</style>
    </div>
  );
}

function GestureClashGlyph({ color, height }: { color: string; height: number }) {
  // Two opposing wedges meeting + a flash burst — reads as a discrete
  // collision event distinct from the `clash` effect's flash decay.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="absolute"
        style={{
          width: 0,
          height: 0,
          borderRight: `5px solid ${color}`,
          borderTop: `4px solid transparent`,
          borderBottom: `4px solid transparent`,
          left: '20%',
          animation: 'gesture-clash-left 1.4s ease-in-out infinite',
        }}
      />
      <span
        className="absolute"
        style={{
          width: 0,
          height: 0,
          borderLeft: `5px solid ${color}`,
          borderTop: `4px solid transparent`,
          borderBottom: `4px solid transparent`,
          right: '20%',
          animation: 'gesture-clash-right 1.4s ease-in-out infinite',
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: 5,
          height: 5,
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: 'gesture-clash-flash 1.4s ease-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes gesture-clash-left {
          0%, 100% { transform: translateX(-4px); opacity: 0.7; }
          45%      { transform: translateX(0);    opacity: 1.0; }
          55%      { transform: translateX(0);    opacity: 0.4; }
        }
        @keyframes gesture-clash-right {
          0%, 100% { transform: translateX(4px); opacity: 0.7; }
          45%      { transform: translateX(0);   opacity: 1.0; }
          55%      { transform: translateX(0);   opacity: 0.4; }
        }
        @keyframes gesture-clash-flash {
          0%, 40%, 100% { transform: scale(0); opacity: 0; }
          50%           { transform: scale(1.4); opacity: 1.0; }
          75%           { transform: scale(0.6); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function GestureShakeGlyph({ color, height }: { color: string; height: number }) {
  // Bar oscillating side-to-side — reads as a sustained shake.
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height }}
      aria-hidden="true"
    >
      <span
        className="rounded-sm"
        style={{
          width: height + 2,
          height: 3,
          background: color,
          opacity: 0.85,
          animation: 'gesture-shake-osc 0.42s ease-in-out infinite alternate',
        }}
      />
      <style jsx>{`
        @keyframes gesture-shake-osc {
          0%   { transform: translateX(-3px) rotate(-6deg); }
          100% { transform: translateX(3px)  rotate(6deg); }
        }
      `}</style>
    </div>
  );
}
