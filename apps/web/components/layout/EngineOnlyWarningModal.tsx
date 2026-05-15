'use client';

import { useModalDialog } from '@/hooks/useModalDialog';
import { useEngineOnlyWarningStore } from '@/stores/engineOnlyWarningStore';

/**
 * Styled replacement for the `window.confirm()` shipped in v0.17
 * Phase 2's export-time engine-only-style warning (audit Finding 3).
 *
 * Listens to `useEngineOnlyWarningStore`; renders nothing when
 * `isOpen` is false. When open, shows the list of offending presets
 * + their engine-only style IDs, and gates the export download via
 * the store's Promise-resolver pattern.
 *
 * Single instance mounted in `editor/page.tsx` (sibling to
 * `ChassisPicker`). Triggered by `handleDownload()` in
 * `CodeOutput.tsx` via `useEngineOnlyWarningStore().request(entries)`.
 */
export function EngineOnlyWarningModal() {
  const isOpen = useEngineOnlyWarningStore((s) => s.isOpen);
  const entries = useEngineOnlyWarningStore((s) => s.entries);
  const confirm = useEngineOnlyWarningStore((s) => s.confirm);
  const cancel = useEngineOnlyWarningStore((s) => s.cancel);

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: cancel,
  });

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="engine-only-warning-title"
      aria-describedby="engine-only-warning-desc"
      className="fixed inset-0 z-[55] flex items-center justify-center"
      style={{ background: 'rgba(var(--bg-deep), 0.92)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        className="relative w-full max-w-xl mx-4 corner-rounded"
        style={{
          background: 'rgb(var(--bg-secondary))',
          border: '1px solid var(--border-light)',
          padding: '28px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2
          id="engine-only-warning-title"
          className="text-ui-lg font-mono"
          style={{
            color: 'rgb(var(--status-warn))',
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          ⚠ Preview styles will export as Stable
        </h2>
        <p
          id="engine-only-warning-desc"
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--text-muted))',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          The presets below use blade styles that don't yet have a ProffieOS
          codegen handler. KyberStation will export them as the fallback
          <code style={{ fontFamily: 'monospace', color: 'rgb(var(--text-secondary))', padding: '0 4px' }}>stable</code>
          style on hardware — the flashed firmware won't match your canvas preview.
        </p>

        <div
          className="flex flex-col gap-1.5"
          style={{
            overflowY: 'auto',
            paddingRight: '4px',
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            padding: '10px 12px',
            background: 'rgb(var(--bg-deep))',
            maxHeight: '40vh',
          }}
        >
          {entries.map((entry, i) => (
            <div
              key={`${entry.presetName}-${i}`}
              className="text-ui-xs font-mono flex items-center justify-between gap-3"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.presetName}
              </span>
              <span
                className="uppercase tracking-[0.08em] shrink-0"
                style={{
                  color: 'rgb(var(--status-warn))',
                  fontSize: '0.7rem',
                  border: '1px solid rgb(var(--status-warn) / 0.4)',
                  padding: '1px 6px',
                  borderRadius: '2px',
                }}
              >
                {entry.styleId}
              </span>
            </div>
          ))}
        </div>

        <p
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--text-muted))',
            marginTop: '14px',
            lineHeight: 1.5,
          }}
        >
          To match what you see on canvas, swap each preset to one of the codegen-supported
          styles before exporting:{' '}
          <span style={{ color: 'rgb(var(--text-secondary))' }}>
            Stable, Unstable, Fire, Pulse, Rotoscope, Gradient, DarkSaber, SithFlicker,
            BladeCharge, TempoLock, Photon, Plasma, CrystalShatter, Aurora, Cinder,
            Prism, ImageScroll, Painted
          </span>
          . Tracked in{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
            docs/research/CODEGEN_CORRECTNESS_AUDIT_2026-05-15.md
          </code>{' '}
          Finding 3.
        </p>

        <div
          className="flex items-center justify-end gap-3 pt-5"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '16px',
          }}
        >
          <button
            data-autofocus
            onClick={cancel}
            className="text-ui-sm btn-hum"
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'rgb(var(--text-muted))',
              borderRadius: '2px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            Cancel export
          </button>
          <button
            onClick={confirm}
            className="text-ui-sm font-mono btn-hum"
            style={{
              padding: '8px 18px',
              background: 'rgb(var(--status-warn))',
              border: '1px solid rgb(var(--status-warn))',
              color: 'rgb(var(--bg-deep))',
              borderRadius: '2px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
