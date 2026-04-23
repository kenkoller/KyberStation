'use client';

// ─── ModulatorPlateBar — v1.0 Modulation Preview ─────────────────────
//
// Renders the 5 built-in modulators as clickable "plates" for the
// Friday 2026-04-24 Modulation Preview.
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
//   - swing:  traveling wave bars (kinetic feel)
//   - sound:  pulsing VU-meter column
//   - angle:  tilting needle
//   - time:   sweeping hand
//   - clash:  flash decay pulse
//
// 6 additional modulators (twist, battery, lockup, preon, ignition,
// retraction) are scaffolded in registry.ts but not shown as plates
// until v1.1 Core (per MODULATION_ROUTING_v1.1_IMPL_PLAN.md §3.2).

import { useEffect } from 'react';
import {
  BUILT_IN_MODULATORS,
  type ModulatorDescriptor,
} from '@kyberstation/engine';
import { useUIStore } from '@/stores/uiStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';

// Friday v1.0 ships 5 plates. The remaining 6 descriptors from
// BUILT_IN_MODULATORS stay hidden until v1.1 Core lands them.
const V1_0_MODULATOR_IDS: readonly string[] = [
  'swing',
  'sound',
  'angle',
  'time',
  'clash',
];

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

  const plates = BUILT_IN_MODULATORS.filter((m) =>
    V1_0_MODULATOR_IDS.includes(m.id as string),
  );

  return (
    <div className="space-y-2">
      <p className="text-ui-xs text-text-muted/80 leading-snug">
        Click a modulator to arm it, then click any numeric parameter to
        wire it up. Press <kbd className="font-mono text-[10px] px-1 rounded bg-bg-deep border border-border-subtle">Esc</kbd> to cancel.
      </p>
      <div
        role="toolbar"
        aria-label="Modulator plates"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
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

  return (
    <button
      type="button"
      onClick={onClick}
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
        boxShadow: armed
          ? `inset 3px 0 0 ${color}, 0 0 0 1px ${color}`
          : `inset 3px 0 0 ${color}`,
      }}
      title={`${name} modulator · range ${descriptor.range[0]}..${descriptor.range[1]}${descriptor.unit ? ' ' + descriptor.unit : ''}`}
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
          className="text-[9px] font-mono uppercase tracking-wider opacity-70"
          style={{ color }}
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
    case 'swing':   return <SwingGlyph {...common} />;
    case 'sound':   return <SoundGlyph {...common} />;
    case 'angle':   return <AngleGlyph {...common} />;
    case 'time':    return <TimeGlyph {...common} />;
    case 'clash':   return <ClashGlyph {...common} />;
    default:        return <div style={{ height: 14 }} />;
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
