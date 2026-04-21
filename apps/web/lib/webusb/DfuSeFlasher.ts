import type { DfuDevice } from './DfuDevice';
import { DfuError } from './DfuDevice';
import { DfuState } from './types';
import type { FlashOptions, FlashProgress, DfuMemoryRegion } from './types';
import {
  DFUSE_COMMAND,
  STM32L4_FLASH_BASE,
  DFU_DEFAULT_TRANSFER_SIZE,
  FIRMWARE_MAX_BYTES,
} from './constants';
import { findInternalFlash, pagesToErase } from './memoryLayout';

/**
 * High-level STM32 DfuSe flasher. Orchestrates SET_ADDRESS → ERASE → DNLOAD →
 * MANIFEST for an entire firmware binary.
 *
 * The device is left in a state where the STM32 will exit DFU and begin
 * executing the new firmware after a USB reset / power cycle.
 */
export class DfuSeFlasher {
  constructor(
    private readonly dfu: DfuDevice,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
  ) {}

  async flash(options: FlashOptions): Promise<void> {
    const {
      firmware,
      startAddress = STM32L4_FLASH_BASE,
      onProgress,
      signal,
      verifyAfterWrite = true,
      dryRun = false,
    } = options;

    if (firmware.byteLength === 0) {
      throw new DfuError('Firmware binary is empty — refusing to flash.');
    }
    if (firmware.byteLength > FIRMWARE_MAX_BYTES) {
      throw new DfuError(
        `Firmware is ${firmware.byteLength} bytes — exceeds ${FIRMWARE_MAX_BYTES}-byte limit.`,
      );
    }

    const layout = this.getActiveLayout();
    if (!layout) {
      throw new DfuError('Active alternate has no parsed memory layout');
    }

    const flashRegion = findInternalFlash(layout);
    if (!flashRegion) {
      throw new DfuError('No writable internal-flash region found');
    }

    this.assertFitsInFlash(firmware.byteLength, startAddress, flashRegion);
    this.checkAbort(signal);

    // 1) Make sure the device is in dfuIDLE before we begin — in case a
    //    previous flash attempt left it in dfuERROR.
    await this.ensureIdle();
    this.checkAbort(signal);

    // 2) Erase every page that will be written.
    const pages = pagesToErase(layout, startAddress, firmware.byteLength);
    const progress: FlashProgressState = {
      onProgress,
      bytesTotal: firmware.byteLength,
      bytesWritten: 0,
      eraseTotal: pages.length,
      eraseDone: 0,
    };

    emit(progress, {
      phase: 'erasing',
      fraction: 0,
      message: dryRun
        ? `DRY RUN — would erase ${pages.length} page${pages.length === 1 ? '' : 's'}`
        : `Erasing ${pages.length} page${pages.length === 1 ? '' : 's'}`,
    });

    for (const pageAddress of pages) {
      this.checkAbort(signal);
      if (!dryRun) await this.eraseePage(pageAddress);
      progress.eraseDone++;
      // Erase phase is short; weight it as the first 10% of total progress.
      emit(progress, {
        phase: 'erasing',
        fraction: 0.1 * (progress.eraseDone / Math.max(1, progress.eraseTotal)),
      });
    }

    // 3) Write firmware as a sequence of DNLOAD blocks. DfuSe treats each
    //    block number ≥2 as an offset from the pointer set by SET_ADDRESS.
    //    So we set the pointer to `startAddress`, then download blocks
    //    starting at block 2.
    if (!dryRun) await this.setAddressPointer(startAddress);
    this.checkAbort(signal);

    // Prefer the bootloader's advertised wTransferSize when we've read the
    // functional descriptor. Fall back to the spec-typical 2048 otherwise.
    const transferSize = this.dfu.getTransferSize(DFU_DEFAULT_TRANSFER_SIZE);
    const totalBlocks = Math.ceil(firmware.byteLength / transferSize);

    emit(progress, {
      phase: 'writing',
      fraction: 0.1,
      message: dryRun
        ? `DRY RUN — would write ${firmware.byteLength} bytes (${totalBlocks} blocks of up to ${transferSize} bytes each)`
        : `Writing ${firmware.byteLength} bytes (${totalBlocks} blocks)`,
      bytesWritten: 0,
      bytesTotal: firmware.byteLength,
    });

    for (let i = 0; i < totalBlocks; i++) {
      this.checkAbort(signal);
      const blockStart = i * transferSize;
      const blockEnd = Math.min(blockStart + transferSize, firmware.byteLength);
      const chunk = firmware.subarray(blockStart, blockEnd);

      if (!dryRun) {
        // DfuSe block numbering: block 0 = command, block 1 reserved,
        // data starts at block 2 (see AN3156 §4.2). Copy the subarray into
        // a fresh ArrayBuffer so TypeScript doesn't widen the buffer type
        // to ArrayBufferLike (which isn't assignable to BufferSource in
        // some lib.dom.d.ts revisions).
        const blockCopy = new Uint8Array(chunk.length);
        blockCopy.set(chunk);
        await this.dfu.download(i + 2, blockCopy);
        await this.dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], this.sleep);
      }

      progress.bytesWritten = blockEnd;
      emit(progress, {
        phase: 'writing',
        fraction: 0.1 + 0.7 * (progress.bytesWritten / Math.max(1, progress.bytesTotal)),
        bytesWritten: progress.bytesWritten,
        bytesTotal: progress.bytesTotal,
      });
    }

    // 4) Optional verification — UPLOAD every block back from the device
    //    and compare against the source firmware. Catches bit-flips /
    //    incomplete writes that would otherwise leave the user trusting
    //    a corrupt image.
    if (verifyAfterWrite && !dryRun) {
      await this.verifyFlash({
        firmware,
        startAddress,
        transferSize,
        totalBlocks,
        onProgress,
        signal,
      });
    }

    // 5) Manifest — the device commits the new firmware. A zero-length
    //    DNLOAD at block 0 tells the device "download complete"; the
    //    subsequent GET_STATUS transitions through dfuMANIFEST_SYNC →
    //    dfuMANIFEST → dfuMANIFEST_WAIT_RESET.
    this.checkAbort(signal);

    if (dryRun) {
      emit(progress, {
        phase: 'done',
        fraction: 1,
        message:
          'DRY RUN complete. No bytes were written. Review the protocol trace above, then disable dry-run to perform the real flash.',
        bytesWritten: progress.bytesTotal,
        bytesTotal: progress.bytesTotal,
      });
      return;
    }

    emit(progress, {
      phase: 'manifesting',
      fraction: 0.95,
      message: 'Finalising firmware — do not disconnect',
    });

    // After UPLOAD verify the device is in dfuUPLOAD_IDLE. Manifest's
    // zero-length DNLOAD at block 0 requires dfuIDLE. Abort first so
    // the bootloader accepts the manifest command.
    await this.dfu.abort();
    await this.dfu.download(0, undefined);
    await this.waitForManifestComplete();

    emit(progress, {
      phase: 'done',
      fraction: 1,
      message: 'Flash complete. Unplug and reconnect the board to boot the new firmware.',
      bytesWritten: progress.bytesTotal,
      bytesTotal: progress.bytesTotal,
    });
  }

  /**
   * Read every block we just wrote and compare to the source firmware.
   * DfuSe reuses the block-number scheme from DNLOAD: block N ≥ 2 reads
   * from `address_pointer + (N - 2) * transferSize`.
   */
  private async verifyFlash(args: {
    firmware: Uint8Array;
    startAddress: number;
    transferSize: number;
    totalBlocks: number;
    onProgress?: (progress: FlashProgress) => void;
    signal?: AbortSignal;
  }): Promise<void> {
    const { firmware, startAddress, transferSize, totalBlocks, onProgress, signal } = args;

    // Re-set the address pointer so UPLOAD starts at the same base address.
    await this.setAddressPointer(startAddress);
    this.checkAbort(signal);

    // setAddressPointer leaves the device in dfuDNLOAD_IDLE (it's a DNLOAD
    // block 0 command under the hood). UPLOAD is only valid from dfuIDLE,
    // so abort back to dfuIDLE before reading. The STM32 bootloader
    // preserves the address pointer through ABORT — same pattern dfu-util
    // uses for dfuse_upload_bin.
    await this.dfu.abort();
    this.checkAbort(signal);

    onProgress?.({
      phase: 'verifying',
      fraction: 0.8,
      message: `Verifying ${firmware.byteLength} bytes`,
      bytesWritten: 0,
      bytesTotal: firmware.byteLength,
    });

    let bytesVerified = 0;
    for (let i = 0; i < totalBlocks; i++) {
      this.checkAbort(signal);
      const blockStart = i * transferSize;
      const blockEnd = Math.min(blockStart + transferSize, firmware.byteLength);
      const expected = firmware.subarray(blockStart, blockEnd);

      const readBack = await this.dfu.upload(i + 2, expected.length);

      for (let j = 0; j < expected.length; j++) {
        if (readBack[j] !== expected[j]) {
          throw new DfuError(
            `Verification failed at block ${i + 2}, byte offset ${blockStart + j}: expected 0x${expected[j].toString(16).padStart(2, '0')}, got 0x${readBack[j].toString(16).padStart(2, '0')}`,
          );
        }
      }

      bytesVerified = blockEnd;
      onProgress?.({
        phase: 'verifying',
        fraction: 0.8 + 0.15 * (bytesVerified / Math.max(1, firmware.byteLength)),
        bytesWritten: bytesVerified,
        bytesTotal: firmware.byteLength,
      });
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private getActiveLayout(): DfuMemoryRegion[] | undefined {
    const active = this.dfu.alternates.find(
      (alt) => alt.alternateSetting === this.dfu.activeAlternate,
    );
    return active?.memoryLayout;
  }

  private assertFitsInFlash(
    firmwareBytes: number,
    startAddress: number,
    region: DfuMemoryRegion,
  ): void {
    if (startAddress < region.startAddress) {
      throw new DfuError(
        `Start address 0x${startAddress.toString(16)} is below flash base 0x${region.startAddress.toString(16)}`,
      );
    }
    const regionEnd = region.startAddress + region.sectorCount * region.sectorSize;
    if (startAddress + firmwareBytes > regionEnd) {
      throw new DfuError(
        `Firmware (${firmwareBytes} bytes) does not fit in writable flash region (${regionEnd - startAddress} bytes available from 0x${startAddress.toString(16)})`,
      );
    }
  }

  private async ensureIdle(): Promise<void> {
    const state = await this.dfu.getState();
    if (state === DfuState.dfuERROR) {
      await this.dfu.clearStatus();
    }
    // Some devices come up in dfuDNLOAD_IDLE — abort to return to dfuIDLE.
    if (
      state === DfuState.dfuDNLOAD_IDLE ||
      state === DfuState.dfuUPLOAD_IDLE ||
      state === DfuState.dfuDNLOAD_SYNC
    ) {
      await this.dfu.abort();
    }
  }

  /** Send DfuSe SET_ADDRESS command (0x21 + 4-byte LE address) at block 0. */
  private async setAddressPointer(address: number): Promise<void> {
    const payload = new Uint8Array(5);
    payload[0] = DFUSE_COMMAND.SET_ADDRESS;
    payload[1] = address & 0xff;
    payload[2] = (address >> 8) & 0xff;
    payload[3] = (address >> 16) & 0xff;
    payload[4] = (address >> 24) & 0xff;
    await this.dfu.download(0, payload);
    await this.dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], this.sleep);
  }

  /** Send DfuSe ERASE command (0x41 + 4-byte LE address) at block 0. */
  private async eraseePage(address: number): Promise<void> {
    const payload = new Uint8Array(5);
    payload[0] = DFUSE_COMMAND.ERASE_PAGE;
    payload[1] = address & 0xff;
    payload[2] = (address >> 8) & 0xff;
    payload[3] = (address >> 16) & 0xff;
    payload[4] = (address >> 24) & 0xff;
    await this.dfu.download(0, payload);
    await this.dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], this.sleep);
  }

  /**
   * After the final zero-length DNLOAD, poll GET_STATUS until the device
   * reports dfuMANIFEST_WAIT_RESET (or the USB pipe goes away — which also
   * signals a successful manifest since the device has reset itself).
   */
  private async waitForManifestComplete(): Promise<void> {
    try {
      await this.dfu.pollUntilIdle(
        [DfuState.dfuMANIFEST_WAIT_RESET, DfuState.dfuIDLE],
        this.sleep,
      );
    } catch {
      // Any error here means success: the STM32 DfuSe bootloader resets
      // the USB bus as part of manifest (bitManifestationTolerant = 0),
      // which makes the next GET_STATUS fail with either a DfuError (our
      // wrapped status != 'ok') or a raw WebUSB DOMException (pipe
      // invalidated mid-transfer). Both are expected completion signals.
      return;
    }
  }

  private checkAbort(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new DfuError('Flash operation aborted by user');
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FlashProgressState {
  onProgress?: (progress: FlashProgress) => void;
  bytesTotal: number;
  bytesWritten: number;
  eraseTotal: number;
  eraseDone: number;
}

function emit(state: FlashProgressState, progress: FlashProgress): void {
  state.onProgress?.(progress);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
