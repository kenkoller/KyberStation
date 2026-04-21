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

describe('DfuSeFlasher.flash — verify phase', () => {
  it('enables verification by default and succeeds on clean flash', async () => {
    const { device, flasher } = await makeFlasher();
    const firmware = new Uint8Array(2048 + 100);
    for (let i = 0; i < firmware.length; i++) firmware[i] = (i * 7) & 0xff;

    const phases: string[] = [];
    await flasher.flash({
      firmware,
      onProgress: (p) => phases.push(p.phase),
    });

    expect(phases).toContain('verifying');
    // UPLOAD call was made to read back each block.
    const uploads = device.log.filter((l) => l.direction === 'in' && l.request === 0x02);
    expect(uploads.length).toBe(2); // two 2KiB blocks
  });

  it('detects silent flash corruption via readback', async () => {
    // corruptDataAtBlock=2 → first data write flips bit 0.
    const { flasher } = await makeFlasher({ corruptDataAtBlock: 2 });
    const firmware = new Uint8Array(512);
    firmware[0] = 0x42;

    await expect(flasher.flash({ firmware })).rejects.toThrow(/Verification failed/);
  });

  it('skips verification when verifyAfterWrite: false', async () => {
    const { device, flasher } = await makeFlasher();
    const firmware = new Uint8Array(512);

    await flasher.flash({ firmware, verifyAfterWrite: false });

    const uploads = device.log.filter((l) => l.direction === 'in' && l.request === 0x02);
    expect(uploads.length).toBe(0);
  });
});

describe('DfuSeFlasher.flash — dry run mode', () => {
  it('runs every phase without emitting a single DNLOAD', async () => {
    const { device, flasher } = await makeFlasher();
    const firmware = new Uint8Array(4096);

    const phases: string[] = [];
    await flasher.flash({
      firmware,
      dryRun: true,
      onProgress: (p) => phases.push(p.phase),
    });

    const dnloads = device.log.filter((l) => l.direction === 'out' && l.request === 0x01);
    expect(dnloads.length).toBe(0);

    // Simulated flash memory stays empty (never written).
    expect(device.writtenByteCount).toBe(0);
    expect(device.erasedPages.size).toBe(0);
    expect(device.receivedManifestRequest).toBe(false);

    // UI still got a full erase/writing/done sequence.
    expect(phases).toContain('erasing');
    expect(phases).toContain('writing');
    expect(phases[phases.length - 1]).toBe('done');
  });

  it('includes "DRY RUN" in progress messages so the UI can highlight it', async () => {
    const { flasher } = await makeFlasher();
    const messages: string[] = [];
    await flasher.flash({
      firmware: new Uint8Array(512),
      dryRun: true,
      onProgress: (p) => {
        if (p.message) messages.push(p.message);
      },
    });
    expect(messages.some((m) => m.includes('DRY RUN'))).toBe(true);
  });

  it('dry-run skips the verify phase (since nothing was written)', async () => {
    const { device, flasher } = await makeFlasher();
    await flasher.flash({ firmware: new Uint8Array(512), dryRun: true });
    const uploads = device.log.filter((l) => l.direction === 'in' && l.request === 0x02);
    expect(uploads.length).toBe(0);
  });
});

describe('DfuSeFlasher — realistic ProffieOS-sized binary', () => {
  it('flashes a ~350 KB binary (typical ProffieOS compile size) end-to-end', async () => {
    const { device, flasher } = await makeFlasher();
    // 350 KiB — matches the order-of-magnitude of a real ProffieOS 7.x build
    // (varies 250-400 KB depending on enabled features).
    const size = 350 * 1024;
    const firmware = new Uint8Array(size);
    // Fill with a pseudo-random but deterministic pattern so we detect any
    // off-by-one errors in block boundaries and verify readback exactly.
    for (let i = 0; i < size; i++) firmware[i] = ((i * 2654435761) >>> 24) & 0xff;

    await flasher.flash({ firmware });

    // Every byte should round-trip through the simulated flash.
    const readBack = device.readFlash(0x08000000, size);
    expect(readBack).toEqual(firmware);

    // Block count should be ceil(350 KiB / 2 KiB) = 175.
    const dnloadDataBlocks = device.log.filter(
      (l) => l.direction === 'out' && l.request === 0x01 && l.blockNum >= 2,
    );
    expect(dnloadDataBlocks.length).toBe(Math.ceil(size / 2048));
  });

  it('fits within the real STM32L452RE flash region (512 KB)', async () => {
    const { flasher } = await makeFlasher();
    // 510 KiB fits; 514 KiB does not.
    await flasher.flash({ firmware: new Uint8Array(510 * 1024), verifyAfterWrite: false });
    await expect(
      makeFlasher().then(({ flasher: f }) =>
        f.flash({ firmware: new Uint8Array(514 * 1024) }),
      ),
    ).rejects.toThrow(/does not fit/);
  });
});

describe('DfuSeFlasher — bootloader wTransferSize', () => {
  it('uses the value reported by the functional descriptor', async () => {
    const { device, dfu, flasher } = await makeFlasher({ transferSize: 1024 });
    await dfu.readFunctionalDescriptor();
    // 4096 bytes at 1024 per block = 4 blocks.
    await flasher.flash({ firmware: new Uint8Array(4096), verifyAfterWrite: false });
    const dnloadDataBlocks = device.log.filter(
      (l) => l.direction === 'out' && l.request === 0x01 && l.blockNum >= 2,
    );
    expect(dnloadDataBlocks.length).toBe(4);
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

// ─── Regression: 2026-04-20 hardware-validation DFU bugs ────────────────────
//
// These three tests fire strict-state + bus-reset simulation in the mock to
// reproduce the exact hardware failures observed on 89sabers Proffieboard
// V3.9 on 2026-04-20. Each test fails if the corresponding fix in
// DfuSeFlasher is reverted. The mock's default-lenient mode doesn't catch
// any of them — the whole point of this block.
//
// Full write-up in docs/HARDWARE_VALIDATION_TODO.md § Phase C.

describe('DfuSeFlasher.flash — regression: 2026-04-20 DFU state-machine bugs', () => {
  it('verifyFlash completes under strictState (UPLOAD requires dfuIDLE after setAddressPointer)', async () => {
    // Without the `abort()` between setAddressPointer and the UPLOAD loop
    // in verifyFlash, the device sits in dfuDNLOAD_IDLE when the first
    // UPLOAD fires. Real STM32 bootloader STALLs; strictState mock STALLs;
    // this test fails with a "UPLOAD block 2 returned status \"stall\"" error.
    const { flasher } = await makeFlasher({ strictState: true });
    const firmware = new Uint8Array(4096); // 2 × 2048-byte blocks
    for (let i = 0; i < firmware.length; i++) firmware[i] = (i * 7 + 13) & 0xff;

    await expect(
      flasher.flash({ firmware, verifyAfterWrite: true }),
    ).resolves.toBeUndefined();
  });

  it('manifest completes under strictState (DNLOAD requires dfuIDLE after UPLOAD verify)', async () => {
    // Without the `abort()` before the manifest's zero-length DNLOAD, the
    // device sits in dfuUPLOAD_IDLE (from the last UPLOAD verify block).
    // Real STM32 bootloader STALLs; strictState mock STALLs; this test
    // fails with a "DNLOAD block 0 returned status \"stall\"" error.
    const { device, flasher } = await makeFlasher({ strictState: true });
    const firmware = new Uint8Array(4096);
    for (let i = 0; i < firmware.length; i++) firmware[i] = (i * 11 + 5) & 0xff;

    await expect(
      flasher.flash({ firmware, verifyAfterWrite: true }),
    ).resolves.toBeUndefined();

    // Manifest must actually have reached the bootloader — not just skipped.
    expect(device.receivedManifestRequest).toBe(true);
  });

  it('resetAfterManifest: bus-reset DOMException from controlTransferIn is treated as success', async () => {
    // STM32 DfuSe has bitManifestationTolerant=0, so it resets the USB bus
    // as it enters dfuMANIFEST_WAIT_RESET. Chrome's WebUSB surfaces that as
    // a raw DOMException, not our DfuError. Without the catch-all in
    // waitForManifestComplete, the DOMException propagates and a
    // successfully-flashed board shows a red error banner to the user.
    const { device, flasher } = await makeFlasher({ resetAfterManifest: true });
    const firmware = new Uint8Array(4096);
    for (let i = 0; i < firmware.length; i++) firmware[i] = (i * 3 + 1) & 0xff;

    await expect(
      flasher.flash({ firmware, verifyAfterWrite: true }),
    ).resolves.toBeUndefined();

    // The manifest DNLOAD did land before the simulated bus reset, so
    // the host-side state machine is consistent with a successful flash.
    expect(device.receivedManifestRequest).toBe(true);
  });
});
