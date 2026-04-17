import { describe, it, expect } from 'vitest';
import { DfuDevice } from '@/lib/webusb/DfuDevice';
import { DfuSeFlasher } from '@/lib/webusb/DfuSeFlasher';
import { DfuError } from '@/lib/webusb/DfuDevice';
import { DFU_REQUEST, DFUSE_COMMAND } from '@/lib/webusb/constants';
import type { FlashProgress } from '@/lib/webusb/types';
import { MockUsbDevice, type MockUsbDeviceOptions } from './mockUsbDevice';

async function makeFlasher(
  options: MockUsbDeviceOptions = {},
): Promise<{ device: MockUsbDevice; dfu: DfuDevice; flasher: DfuSeFlasher }> {
  const device = new MockUsbDevice(options);
  await device.open();
  const dfu = new DfuDevice(device, DfuDevice.findDfuInterface(device)!);
  await dfu.loadAlternates();
  await dfu.selectAlternate(0);
  const flasher = new DfuSeFlasher(dfu, async () => {}); // no-op sleep
  return { device, dfu, flasher };
}

describe('DfuSeFlasher.flash — successful path', () => {
  it('erases pages, writes firmware, and triggers manifest', async () => {
    const { device, flasher } = await makeFlasher();

    // 5 KiB firmware — spans 3 × 2 KiB pages, 3 × 2048-byte DNLOAD blocks.
    const firmware = new Uint8Array(5000);
    for (let i = 0; i < firmware.length; i++) firmware[i] = i & 0xff;

    const progressEvents: FlashProgress[] = [];
    await flasher.flash({
      firmware,
      onProgress: (p) => progressEvents.push({ ...p }),
    });

    // Every page covering the firmware should have been erased.
    expect(device.erasedPages.has(0x08000000)).toBe(true);
    expect(device.erasedPages.has(0x08000800)).toBe(true);
    expect(device.erasedPages.has(0x08001000)).toBe(true);
    expect(device.erasedPages.size).toBe(3);

    // Contents of simulated flash match the firmware byte-for-byte.
    const readBack = device.readFlash(0x08000000, firmware.length);
    expect(readBack).toEqual(firmware);

    // Manifest zero-length DNLOAD was sent.
    expect(device.receivedManifestRequest).toBe(true);

    // Progress fired and terminated with phase=done, fraction=1.
    expect(progressEvents.length).toBeGreaterThan(0);
    const last = progressEvents[progressEvents.length - 1];
    expect(last.phase).toBe('done');
    expect(last.fraction).toBe(1);
    // Erase → write → manifest → done in order.
    const phases = progressEvents.map((e) => e.phase);
    expect(phases[0]).toBe('erasing');
    expect(phases).toContain('writing');
    expect(phases).toContain('manifesting');
  });

  it('sends SET_ADDRESS with a little-endian encoded address', async () => {
    const { device, flasher } = await makeFlasher();
    await flasher.flash({ firmware: new Uint8Array(512) });

    const setAddress = device.log.find(
      (l) =>
        l.request === DFU_REQUEST.DNLOAD &&
        l.blockNum === 0 &&
        l.data?.[0] === DFUSE_COMMAND.SET_ADDRESS,
    );
    expect(setAddress).toBeDefined();
    // 0x08000000 little-endian: [0x21, 0x00, 0x00, 0x00, 0x08]
    expect(Array.from(setAddress!.data!)).toEqual([0x21, 0x00, 0x00, 0x00, 0x08]);
  });

  it('sends one ERASE per page the firmware touches', async () => {
    const { device, flasher } = await makeFlasher();
    // 1 page worth of data (exactly 2 KiB) — should erase exactly 1 page.
    await flasher.flash({ firmware: new Uint8Array(2048) });

    const erases = device.log.filter(
      (l) =>
        l.request === DFU_REQUEST.DNLOAD &&
        l.blockNum === 0 &&
        l.data?.[0] === DFUSE_COMMAND.ERASE_PAGE,
    );
    expect(erases.length).toBe(1);
  });
});

describe('DfuSeFlasher.flash — error paths', () => {
  it('rejects an empty firmware binary', async () => {
    const { flasher } = await makeFlasher();
    await expect(flasher.flash({ firmware: new Uint8Array(0) })).rejects.toThrow(
      /refusing to flash/,
    );
  });

  it('rejects firmware that exceeds the 1 MiB safety cap', async () => {
    const { flasher } = await makeFlasher();
    const oversized = new Uint8Array(1024 * 1024 + 1);
    await expect(flasher.flash({ firmware: oversized })).rejects.toThrow(/exceeds/);
  });

  it('rejects firmware larger than the advertised flash region', async () => {
    const { flasher } = await makeFlasher();
    // Flash region is 512 × 2 KiB = 1 MiB exactly; request 1 MiB + 1 byte
    // at an address that exceeds its end.
    const oversized = new Uint8Array(2048);
    await expect(
      flasher.flash({
        firmware: oversized,
        startAddress: 0x08000000 + 1024 * 1024 - 100,
      }),
    ).rejects.toThrow(/does not fit/);
  });

  it('propagates DfuError when the device enters dfuERROR mid-flash', async () => {
    const { flasher } = await makeFlasher({
      // Fail the second DNLOAD call — that's the first real data write
      // (first DNLOAD is SET_ADDRESS, second is the first ERASE — actually
      // three commands come before data, so pick a value that lands on a
      // data block).
      failOnDnload: 5,
    });
    const firmware = new Uint8Array(5000);
    await expect(flasher.flash({ firmware })).rejects.toThrow(DfuError);
  });

  it('honors an AbortSignal', async () => {
    const { flasher } = await makeFlasher();
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      flasher.flash({ firmware: new Uint8Array(100), signal: ctrl.signal }),
    ).rejects.toThrow(/aborted/);
  });
});

describe('DfuSeFlasher.flash — progress reporting', () => {
  it('reports monotonically increasing fraction values', async () => {
    const { flasher } = await makeFlasher();
    const firmware = new Uint8Array(8192); // 4 blocks at 2048 each
    const fractions: number[] = [];
    await flasher.flash({
      firmware,
      onProgress: (p) => fractions.push(p.fraction),
    });
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeGreaterThanOrEqual(fractions[i - 1] - 1e-9);
    }
    expect(fractions[fractions.length - 1]).toBe(1);
  });

  it('includes bytesWritten + bytesTotal during write phase', async () => {
    const { flasher } = await makeFlasher();
    const firmware = new Uint8Array(4096);
    const writeEvents: FlashProgress[] = [];
    await flasher.flash({
      firmware,
      onProgress: (p) => {
        if (p.phase === 'writing') writeEvents.push({ ...p });
      },
    });
    expect(writeEvents.length).toBeGreaterThan(0);
    const last = writeEvents[writeEvents.length - 1];
    expect(last.bytesTotal).toBe(4096);
    expect(last.bytesWritten).toBe(4096);
  });
});
