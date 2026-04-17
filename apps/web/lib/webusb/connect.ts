import type { USB, USBDevice } from './types';
import { PROFFIEBOARD_DFU_FILTER } from './constants';
import { DfuDevice, DfuError } from './DfuDevice';
import { findInternalFlash } from './memoryLayout';

/** Thin accessor for `navigator.usb`. Returns `undefined` on browsers without WebUSB. */
export function getWebUsb(): USB | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as unknown as { usb?: USB };
  return nav.usb;
}

/** True if the running environment exposes the WebUSB API. */
export function isWebUsbSupported(): boolean {
  return getWebUsb() !== undefined;
}

export interface ConnectedProffieboard {
  device: USBDevice;
  dfu: DfuDevice;
  /** Summary string suitable for a success toast. */
  summary: string;
  /** Total writable flash bytes (for the "fits in flash?" check). */
  flashBytes: number;
}

/**
 * Prompt the user to pick a Proffieboard in DFU mode, open it, claim the DFU
 * interface, and return a `DfuDevice` ready for flash operations.
 *
 * Throws:
 *  - `WebUsbUnsupportedError` if the browser lacks WebUSB
 *  - `DfuError` if the picked device doesn't expose a DFU interface, or
 *    if the control-pipe handshake fails
 *
 * The user's `requestDevice()` cancel is surfaced as the underlying
 * DOMException (NotFoundError); callers should handle it as "user cancelled".
 */
export async function connectProffieboardDfu(): Promise<ConnectedProffieboard> {
  const usb = getWebUsb();
  if (!usb) {
    throw new WebUsbUnsupportedError(
      'WebUSB is not available in this browser. Use Chrome, Edge, Brave, or another Chromium-based browser on macOS, Windows, or Linux.',
    );
  }

  const device = await usb.requestDevice({ filters: [PROFFIEBOARD_DFU_FILTER] });
  await device.open();

  if (!device.configuration) {
    await device.selectConfiguration(1);
  }

  const interfaceNumber = DfuDevice.findDfuInterface(device);
  if (interfaceNumber === undefined) {
    await safeClose(device);
    throw new DfuError(
      `Selected USB device (VID=${hex4(device.vendorId)} PID=${hex4(device.productId)}) does not expose a DFU interface. Make sure the Proffieboard is in DFU mode — hold the BOOT button while plugging in USB.`,
    );
  }

  await device.claimInterface(interfaceNumber);

  const dfu = new DfuDevice(device, interfaceNumber);
  await dfu.loadAlternates();

  // STM32 typically exposes Internal Flash as alternate 0, but we don't hard-
  // code the index — select the alternate whose parsed memory region covers
  // flash base 0x08000000 and is writable + erasable.
  const flashAlt = dfu.alternates.find((alt) =>
    alt.memoryLayout ? findInternalFlash(alt.memoryLayout) : false,
  );
  if (!flashAlt) {
    await safeClose(device);
    throw new DfuError(
      'Connected device has no writable internal-flash region. Refusing to flash.',
    );
  }

  await dfu.selectAlternate(flashAlt.alternateSetting);

  const flashRegion = findInternalFlash(flashAlt.memoryLayout!)!;
  const flashBytes = flashRegion.sectorCount * flashRegion.sectorSize;

  const manufacturer = device.manufacturerName ?? 'STMicroelectronics';
  const product = device.productName ?? 'STM32 DFU Device';
  const flashKib = Math.round(flashBytes / 1024);
  const summary = `${manufacturer} ${product} — ${flashKib} KiB flash ready`;

  return { device, dfu, summary, flashBytes };
}

/**
 * Release the DFU interface and close the USB device. Swallows errors
 * because this is called from cleanup paths; returns `true` if it ran
 * cleanly, `false` otherwise.
 */
export async function disconnectProffieboardDfu(
  connected: ConnectedProffieboard,
): Promise<boolean> {
  try {
    await connected.device.releaseInterface(connected.dfu.interfaceNumber);
  } catch {
    // Ignore — will still attempt close.
  }
  return safeClose(connected.device);
}

/** Error thrown when the running environment lacks WebUSB entirely. */
export class WebUsbUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebUsbUnsupportedError';
  }
}

// ─── Internals ───────────────────────────────────────────────────────────────

async function safeClose(device: USBDevice): Promise<boolean> {
  try {
    await device.close();
    return true;
  } catch {
    return false;
  }
}

function hex4(n: number): string {
  return `0x${n.toString(16).padStart(4, '0')}`;
}
