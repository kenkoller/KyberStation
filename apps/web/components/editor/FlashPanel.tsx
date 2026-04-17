'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectProffieboardDfu,
  disconnectProffieboardDfu,
  isWebUsbSupported,
  DfuSeFlasher,
  DfuError,
  WebUsbUnsupportedError,
  FIRMWARE_MAX_BYTES,
  type ConnectedProffieboard,
  type FlashProgress,
  type FlashPhase,
} from '@/lib/webusb';
import { playUISound } from '@/lib/uiSounds';

// ─── Pre-built firmware variants ─────────────────────────────────────────────
//
// Binaries are produced by the `firmware-build` GitHub Action and dropped
// into `apps/web/public/firmware/`. The array below lists the variants we
// ship; each entry's `path` is resolved relative to the app's `/` root.
// If the binary is absent at runtime (fetch returns 404), the UI surfaces
// a clear "firmware not bundled — use a custom .bin" hint.

interface FirmwareVariant {
  id: string;
  label: string;
  description: string;
  path: string;
}

const FIRMWARE_VARIANTS: FirmwareVariant[] = [
  {
    id: 'v3-standard',
    label: 'ProffieOS 7.x — Proffieboard V3',
    description: 'Standard build. Fett263 prop. SD + audio + WS2811. No OLED.',
    path: '/firmware/proffieos-7x-v3-standard.bin',
  },
  {
    id: 'v3-oled',
    label: 'ProffieOS 7.x — Proffieboard V3 + OLED',
    description: 'Standard build with SSD1306 OLED display driver enabled.',
    path: '/firmware/proffieos-7x-v3-oled.bin',
  },
  {
    id: 'v2-standard',
    label: 'ProffieOS 7.x — Proffieboard V2',
    description: 'Standard build for V2 boards. Fett263 prop. SD + audio.',
    path: '/firmware/proffieos-7x-v2-standard.bin',
  },
];

// ─── Panel state machine ─────────────────────────────────────────────────────

type PanelState =
  | { kind: 'needs-ack' }
  | { kind: 'ready' }
  | { kind: 'connecting' }
  | { kind: 'connected'; board: ConnectedProffieboard }
  | { kind: 'flashing'; board: ConnectedProffieboard; progress: FlashProgress }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const DISCLAIMER_STORAGE_KEY = 'kyberstation:webusb-disclaimer-ack';

function hasAckedDisclaimer(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(DISCLAIMER_STORAGE_KEY) === '1';
}

function storeDisclaimerAck(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, '1');
  } catch {
    // Session storage may be disabled — degrade silently.
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlashPanel() {
  const [state, setState] = useState<PanelState>(
    hasAckedDisclaimer() ? { kind: 'ready' } : { kind: 'needs-ack' },
  );
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>(FIRMWARE_VARIANTS[0].id);
  const [customFirmware, setCustomFirmware] = useState<Uint8Array | null>(null);
  const [customFirmwareName, setCustomFirmwareName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Release the USB interface if the component unmounts mid-flight.
  useEffect(() => {
    return () => {
      if (state.kind === 'connected') {
        void disconnectProffieboardDfu(state.board);
      } else if (state.kind === 'flashing') {
        abortRef.current?.abort();
        void disconnectProffieboardDfu(state.board);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const webUsbSupported = isWebUsbSupported();

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAckDisclaimer = useCallback(() => {
    if (!disclaimerChecked) return;
    storeDisclaimerAck();
    setState({ kind: 'ready' });
  }, [disclaimerChecked]);

  const handleConnect = useCallback(async () => {
    setState({ kind: 'connecting' });
    try {
      const board = await connectProffieboardDfu();
      playUISound('copy');
      setState({ kind: 'connected', board });
    } catch (err) {
      if (err instanceof WebUsbUnsupportedError) {
        setState({ kind: 'error', message: err.message });
        return;
      }
      // `requestDevice` throws DOMException NotFoundError when the user
      // dismisses the picker — treat that as a soft reset, not an error.
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setState({ kind: 'ready' });
        return;
      }
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to connect to the board.',
      });
    }
  }, []);

  const handleCustomFirmware = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > FIRMWARE_MAX_BYTES) {
      setState({
        kind: 'error',
        message: `${file.name} is ${file.size} bytes — exceeds the ${FIRMWARE_MAX_BYTES}-byte safety cap.`,
      });
      return;
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    setCustomFirmware(buf);
    setCustomFirmwareName(file.name);
    setSelectedVariant('custom');
  }, []);

  const handleFlash = useCallback(async () => {
    if (state.kind !== 'connected') return;
    const board = state.board;

    let firmware: Uint8Array | null = null;
    if (selectedVariant === 'custom') {
      firmware = customFirmware;
    } else {
      const variant = FIRMWARE_VARIANTS.find((v) => v.id === selectedVariant);
      if (!variant) return;
      try {
        const res = await fetch(variant.path);
        if (!res.ok) {
          setState({
            kind: 'error',
            message: `Firmware "${variant.label}" is not bundled in this build. Supply your own .bin via the file picker below.`,
          });
          return;
        }
        firmware = new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch firmware.',
        });
        return;
      }
    }
    if (!firmware || firmware.byteLength === 0) {
      setState({
        kind: 'error',
        message: 'No firmware selected. Pick a bundled variant or upload a .bin.',
      });
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const flasher = new DfuSeFlasher(board.dfu);
    setState({
      kind: 'flashing',
      board,
      progress: { phase: 'connecting', fraction: 0 },
    });

    try {
      await flasher.flash({
        firmware,
        signal: ctrl.signal,
        onProgress: (progress) => {
          setState((prev) =>
            prev.kind === 'flashing' ? { ...prev, progress } : prev,
          );
        },
      });
      playUISound('copy');
      await disconnectProffieboardDfu(board);
      setState({
        kind: 'done',
        message:
          'Flash complete. Unplug and reconnect the board — it will boot into the new firmware.',
      });
    } catch (err) {
      await disconnectProffieboardDfu(board);
      const message =
        err instanceof DfuError
          ? `${err.message} If the flash partially completed, hold the BOOT button while plugging in USB to re-enter DFU and retry.`
          : err instanceof Error
            ? err.message
            : 'Flash failed for an unknown reason.';
      setState({ kind: 'error', message });
    } finally {
      abortRef.current = null;
    }
  }, [state, selectedVariant, customFirmware]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleReset = useCallback(() => {
    setState({ kind: 'ready' });
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1">
        Flash to Saber
      </h3>
      <p className="text-ui-xs text-text-muted mb-4 leading-relaxed">
        One-click firmware flash over WebUSB. The <strong>config.h</strong> you build in
        KyberStation still lives on the SD card — this panel only writes the ProffieOS
        firmware itself.
      </p>

      {!webUsbSupported && <UnsupportedNotice />}

      {webUsbSupported && state.kind === 'needs-ack' && (
        <DisclaimerCard
          checked={disclaimerChecked}
          onToggle={setDisclaimerChecked}
          onAck={handleAckDisclaimer}
        />
      )}

      {webUsbSupported && state.kind !== 'needs-ack' && (
        <>
          <FirmwareSelector
            variants={FIRMWARE_VARIANTS}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
            customFirmwareName={customFirmwareName}
            fileInputRef={fileInputRef}
            onFileChange={handleCustomFirmware}
            disabled={state.kind === 'connecting' || state.kind === 'flashing'}
          />

          <div className="mt-4">
            {state.kind === 'ready' && (
              <ConnectButton onClick={handleConnect} />
            )}
            {state.kind === 'connecting' && <StatusLine>Waiting for device picker…</StatusLine>}
            {state.kind === 'connected' && (
              <ConnectedActions
                board={state.board}
                onFlash={handleFlash}
                onDisconnect={async () => {
                  await disconnectProffieboardDfu(state.board);
                  setState({ kind: 'ready' });
                }}
              />
            )}
            {state.kind === 'flashing' && (
              <FlashProgressView progress={state.progress} onCancel={handleCancel} />
            )}
            {state.kind === 'done' && (
              <ResultNotice tone="ok" message={state.message} onDismiss={handleReset} />
            )}
            {state.kind === 'error' && (
              <ResultNotice tone="error" message={state.message} onDismiss={handleReset} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function UnsupportedNotice() {
  return (
    <div
      className="rounded-panel border p-3 text-ui-xs leading-relaxed"
      style={{
        background: 'rgb(var(--status-warn) / 0.08)',
        borderColor: 'rgb(var(--status-warn) / 0.35)',
        color: 'rgb(var(--status-warn))',
      }}
    >
      <strong>WebUSB is not available in this browser.</strong>
      <br />
      Use Chrome, Edge, Brave, or another Chromium-based browser on macOS, Windows, or Linux.
      Safari and Firefox do not implement WebUSB. The rest of KyberStation still works —
      export the config.h and flash with Arduino IDE instead.
    </div>
  );
}

function DisclaimerCard({
  checked,
  onToggle,
  onAck,
}: {
  checked: boolean;
  onToggle: (value: boolean) => void;
  onAck: () => void;
}) {
  return (
    <div
      className="rounded-panel border p-4"
      style={{
        background: 'rgb(var(--status-warn) / 0.06)',
        borderColor: 'rgb(var(--status-warn) / 0.45)',
      }}
    >
      <h4
        className="text-ui-sm font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'rgb(var(--status-warn))' }}
      >
        Use at your own risk
      </h4>
      <div className="text-ui-xs text-text-primary leading-relaxed space-y-2 mb-3">
        <p>
          Flashing firmware to your Proffieboard via WebUSB is provided as a convenience.
          KyberStation cannot recover a bricked board.
        </p>
        <p>
          STM32 boards have a hardware DFU recovery mode. If a flash fails, hold the{' '}
          <strong>BOOT</strong> button while plugging in USB to re-enter DFU mode and retry.
        </p>
        <p>By proceeding, you accept responsibility for the flash operation.</p>
      </div>
      <label className="flex items-start gap-2 text-ui-xs text-text-primary cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <span>I understand and accept responsibility for the flash operation.</span>
      </label>
      <button
        type="button"
        onClick={onAck}
        disabled={!checked}
        className="px-4 py-2 rounded text-ui-sm font-medium transition-colors
          bg-accent text-white hover:bg-accent/90
          disabled:bg-bg-surface disabled:text-text-muted disabled:cursor-not-allowed"
      >
        Proceed
      </button>
    </div>
  );
}

function FirmwareSelector({
  variants,
  selectedVariant,
  onSelectVariant,
  customFirmwareName,
  fileInputRef,
  onFileChange,
  disabled,
}: {
  variants: FirmwareVariant[];
  selectedVariant: string;
  onSelectVariant: (id: string) => void;
  customFirmwareName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label
        className="block text-ui-sm text-text-muted uppercase tracking-wider mb-2"
      >
        Firmware
      </label>
      <div className="bg-bg-surface rounded-panel border border-border-subtle p-2 space-y-1">
        {variants.map((variant) => (
          <label
            key={variant.id}
            className="flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-bg-primary/50 cursor-pointer transition-colors"
          >
            <input
              type="radio"
              name="firmware-variant"
              value={variant.id}
              checked={selectedVariant === variant.id}
              onChange={() => onSelectVariant(variant.id)}
              disabled={disabled}
              className="mt-1 accent-accent shrink-0"
            />
            <div className="min-w-0">
              <div className="text-ui-xs text-text-primary">{variant.label}</div>
              <div className="text-ui-xs text-text-muted">{variant.description}</div>
            </div>
          </label>
        ))}
        <label className="flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-bg-primary/50 cursor-pointer transition-colors">
          <input
            type="radio"
            name="firmware-variant"
            value="custom"
            checked={selectedVariant === 'custom'}
            onChange={() => onSelectVariant('custom')}
            disabled={disabled}
            className="mt-1 accent-accent shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-ui-xs text-text-primary">Custom .bin (power user)</div>
            <div className="text-ui-xs text-text-muted mb-1">
              Compile ProffieOS yourself, then upload the output .bin here.
            </div>
            {customFirmwareName && (
              <div className="text-ui-xs font-mono text-accent truncate">
                {customFirmwareName}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-ui-xs underline text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
            >
              {customFirmwareName ? 'Choose different file' : 'Choose .bin file…'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".bin,application/octet-stream"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
        </label>
      </div>
    </div>
  );
}

function ConnectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 rounded text-ui-sm font-medium transition-colors
        bg-accent text-white hover:bg-accent/90"
    >
      Connect Proffieboard (DFU mode)
    </button>
  );
}

function StatusLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-ui-xs text-text-muted italic py-2">{children}</div>
  );
}

function ConnectedActions({
  board,
  onFlash,
  onDisconnect,
}: {
  board: ConnectedProffieboard;
  onFlash: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-panel border p-3 text-ui-xs"
        style={{
          background: 'rgb(var(--status-ok) / 0.08)',
          borderColor: 'rgb(var(--status-ok) / 0.35)',
          color: 'rgb(var(--status-ok))',
        }}
      >
        <strong>Connected.</strong> {board.summary}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onFlash}
          className="flex-1 px-4 py-2 rounded text-ui-sm font-medium transition-colors
            bg-accent text-white hover:bg-accent/90"
        >
          Flash firmware
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="px-4 py-2 rounded text-ui-sm font-medium transition-colors
            bg-bg-surface text-text-primary border border-border-subtle hover:border-accent/50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function FlashProgressView({
  progress,
  onCancel,
}: {
  progress: FlashProgress;
  onCancel: () => void;
}) {
  const percent = Math.round(progress.fraction * 100);
  const phaseLabel = PHASE_LABELS[progress.phase];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-ui-xs">
        <span className="text-text-primary">{phaseLabel}</span>
        <span className="text-text-muted tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgb(var(--bg-surface))' }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={phaseLabel}
      >
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{
            width: `${percent}%`,
            background: 'rgb(var(--accent))',
          }}
        />
      </div>
      {progress.bytesWritten !== undefined && progress.bytesTotal !== undefined && (
        <div className="text-ui-xs text-text-muted tabular-nums">
          {progress.bytesWritten.toLocaleString()} / {progress.bytesTotal.toLocaleString()} bytes
        </div>
      )}
      {progress.message && (
        <div className="text-ui-xs text-text-muted">{progress.message}</div>
      )}
      <div
        className="text-ui-xs font-semibold uppercase tracking-wider"
        style={{ color: 'rgb(var(--status-warn))' }}
      >
        Do not disconnect the board until flashing completes.
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-4 py-2 rounded text-ui-sm font-medium transition-colors
          bg-bg-surface text-text-primary border border-border-subtle hover:border-accent/50"
      >
        Cancel
      </button>
    </div>
  );
}

function ResultNotice({
  tone,
  message,
  onDismiss,
}: {
  tone: 'ok' | 'error';
  message: string;
  onDismiss: () => void;
}) {
  const token = tone === 'ok' ? '--status-ok' : '--status-error';
  return (
    <div className="space-y-3">
      <div
        className="rounded-panel border p-3 text-ui-xs leading-relaxed"
        style={{
          background: `rgb(var(${token}) / 0.08)`,
          borderColor: `rgb(var(${token}) / 0.35)`,
          color: `rgb(var(${token}))`,
        }}
      >
        {message}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full px-4 py-2 rounded text-ui-sm font-medium transition-colors
          bg-bg-surface text-text-primary border border-border-subtle hover:border-accent/50"
      >
        OK
      </button>
    </div>
  );
}

const PHASE_LABELS: Record<FlashPhase, string> = {
  connecting: 'Connecting',
  erasing: 'Erasing flash',
  writing: 'Writing firmware',
  verifying: 'Verifying',
  manifesting: 'Finalising',
  done: 'Complete',
  error: 'Error',
};
