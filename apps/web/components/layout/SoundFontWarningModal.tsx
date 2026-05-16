'use client';

import { useModalDialog } from '@/hooks/useModalDialog';
import { useSoundFontWarningStore } from '@/stores/soundFontWarningStore';

/**
 * Pre-flash warning modal that lists preset → missing-font-folder
 * mismatches before writing presets.ini to the user's SD card. Mirrors
 * the `EngineOnlyWarningModal` pattern.
 *
 * Single instance mounted in `editor/page.tsx` (sibling to other warning
 * modals). Triggered by `CardWriter.tsx`'s direct-write flow via
 * `useSoundFontWarningStore().request(missing, available)`.
 *
 * Closes the silent-failure gap: a preset referencing a font folder
 * that isn't on the card would activate to ProffieOS's default font
 * with no surfaced error. The modal lets the user verify before
 * committing the write.
 */
export function SoundFontWarningModal() {
  const isOpen = useSoundFontWarningStore((s) => s.isOpen);
  const missing = useSoundFontWarningStore((s) => s.missing);
  const available = useSoundFontWarningStore((s) => s.available);
  const confirm = useSoundFontWarningStore((s) => s.confirm);
  const cancel = useSoundFontWarningStore((s) => s.cancel);

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
      aria-labelledby="sound-font-warning-title"
      aria-describedby="sound-font-warning-desc"
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
          id="sound-font-warning-title"
          className="text-ui-lg font-mono"
          style={{
            color: 'rgb(var(--status-warn))',
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          ⚠ Missing sound font folders on card
        </h2>
        <p
          id="sound-font-warning-desc"
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--text-muted))',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          The presets below reference font folders that aren't on the SD
          card you just selected. ProffieOS will silently fall back to its
          default font when these presets activate — your saber will
          ignite but won't play the sounds you designed for.
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
          {missing.map((entry, i) => (
            <div
              key={`${entry.presetName}-${entry.fontName}-${i}`}
              className="text-ui-xs font-mono flex flex-col gap-1"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              <div className="flex items-center justify-between gap-3">
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
                  {entry.fontName}/
                </span>
              </div>
              {entry.closestMatch ? (
                <span
                  style={{
                    color: 'rgb(var(--text-muted))',
                    fontSize: '0.7rem',
                    paddingLeft: '4px',
                  }}
                >
                  did you mean <code style={{ color: 'rgb(var(--text-secondary))' }}>{entry.closestMatch}/</code>?
                </span>
              ) : null}
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
          {available.length > 0 ? (
            <>
              Your card has these font folders: <span style={{ color: 'rgb(var(--text-secondary))' }}>{available.join(', ')}</span>.
              Copy the missing folders onto the card before flashing, or
              edit the affected presets to reference an existing folder.
            </>
          ) : (
            <>
              The selected directory has no font folders at its root. This
              card likely isn't a Proffieboard SD card, or hasn't been
              initialized with sound font content yet.
            </>
          )}
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
            Cancel write
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
            Write anyway
          </button>
        </div>
      </div>
    </div>
  );
}
