'use client';

// ─── ModulatorPlateBar — v1.1 Core Modulation ─────────────────────────
//
// Renders all 11 built-in modulators as clickable "plates".
//
// Interaction (click-to-route):
//   1. User clicks a plate → arms it (sets uiStore.armedModulatorId)
//   2. User clicks any numeric scrub field → binding created via
//      useClickToRoute hook
//   3. Clicking the armed plate again, or pressing Escape, disarms
//
// Plates hidden entirely when the current board doesn't support
// modulation (CFX / Xenopixel / Verso / Proffie V2.2 for v1.0).
//
// Live viz is a lightweight CSS-driven shape per modulator kind:
//   - swing:      traveling wave bars (kinetic feel)
//   - sound:      pulsing VU-meter column
//   - angle:      tilting needle
//   - twist:      rotating axis bar (spin about long axis)
//   - time:       sweeping hand
//   - clash:      flash decay pulse
//   - battery:    cell with animating fill level
//   - lockup:     pinned bright center + sustained ring pulse
//   - preon:      flickering charge-up spark
//   - ignition:   left-to-right extension wipe (one-shot loop)
//   - retraction: right-to-left contraction wipe (one-shot loop)
//
// All 11 modulator descriptors live in
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

  // v1.1 Core: surface all 11 built-in modulators.
  const plates = BUILT_IN_MODULATORS;

  return (
    <div className="space-y-2">
      <p className="text-ui-xs text-text-muted/80 leading-snug">
        Click a modulator to arm it, then click any numeric parameter to
        wire it up. Press <kbd className="font-mono text-[10px] px-1 rounded bg-bg-deep border border-border-subtle">Esc</kbd> to cancel.
      </p>
      <div
        role="toolbar"
        aria-label="Modulator plates"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2"
      >
        {plates.map((plate) => (
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
    case 'swing':      return <SwingGlyph {...common} />;
    case 'sound':      return <SoundGlyph {...common} />;
    case 'angle':      return <AngleGlyph {...common} />;
    case 'twist':      return <TwistGlyph {...common} />;
    case 'time':       return <TimeGlyph {...common} />;
    case 'clash':      return <ClashGlyph {...common} />;
    case 'battery':    return <BatteryGlyph {...common} />;
    case 'lockup':     return <LockupGlyph {...common} />;
    case 'preon':      return <PreonGlyph {...common} />;
    case 'ignition':   return <IgnitionGlyph {...common} />;
    case 'retraction': return <RetractionGlyph {...common} />;
    default:           return <div style={{ height: 14 }} />;
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
