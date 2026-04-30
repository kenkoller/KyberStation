'use client';

// ─── MobileInspectHUD — Phase 4.5 (2026-05-01) ──────────────────────────────
//
// Floating zoom HUD rendered top-right of the blade canvas during
// Inspect mode. Per "Claude Design Mobile handoff/HANDOFF.md" §Q4:
//
//   - 1× / 2.4× / 4× / 🎯 four-button chip cluster
//   - 1× / 2.4× / 4× set the zoom factor (and recenter pan to 0)
//   - 🎯 re-centers + resets to 1× zoom (without exiting Inspect)
//   - HUD background: rgba(0,0,0,0.4) + backdrop-filter blur
//
// The HUD only renders when isInspecting is true; the host (MobileShell)
// gates the mount on store state.

import { useInspectModeStore, type InspectZoom } from '@/stores/inspectModeStore';

const ZOOM_BUTTONS: ReadonlyArray<{ value: InspectZoom; label: string }> = [
  { value: 1, label: '1×' },
  { value: 2.4, label: '2.4×' },
  { value: 4, label: '4×' },
];

export function MobileInspectHUD() {
  const zoom = useInspectModeStore((s) => s.zoom);
  const setZoom = useInspectModeStore((s) => s.setZoom);
  const recenter = useInspectModeStore((s) => s.recenter);

  return (
    <div
      role="toolbar"
      aria-label="Blade zoom controls"
      data-mobile-inspect-hud
      className="absolute top-2 right-2 z-30 flex items-center gap-1 px-1 py-1 rounded-interactive border border-border-light"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {ZOOM_BUTTONS.map((btn) => {
        const active = zoom === btn.value;
        return (
          <button
            key={btn.value}
            type="button"
            onClick={() => {
              setZoom(btn.value);
              // Reset pan when changing zoom — avoids stale pan offsets
              // that exceed the new zoom's allowed pan range.
              useInspectModeStore.getState().setPanX(0);
            }}
            aria-label={`Set blade zoom to ${btn.label}`}
            aria-pressed={active}
            data-zoom-value={btn.value}
            data-active={active || undefined}
            className={[
              'flex items-center justify-center rounded-interactive font-mono text-[11px] font-semibold tracking-wide transition-colors',
              active
                ? 'bg-accent text-bg-deep'
                : 'text-text-primary hover:bg-bg-surface/40',
            ].join(' ')}
            style={{ minWidth: 36, height: 28, padding: '0 6px' }}
          >
            {btn.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={recenter}
        aria-label="Re-center and reset zoom"
        data-recenter
        className="flex items-center justify-center rounded-interactive text-text-primary hover:bg-bg-surface/40 transition-colors"
        style={{ minWidth: 36, height: 28, padding: '0 6px', fontSize: 14 }}
      >
        <span aria-hidden="true">🎯</span>
      </button>
    </div>
  );
}
