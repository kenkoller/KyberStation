import type {
  USBDevice,
  USBConfiguration,
  USBInterfaceDescriptor,
  USBControlTransferParameters,
  USBInTransferResult,
  USBOutTransferResult,
} from '@/lib/webusb/types';
import { DfuState, DfuStatus } from '@/lib/webusb/types';
import {
  DFU_REQUEST,
  DFUSE_COMMAND,
  DFU_DEFAULT_TRANSFER_SIZE,
} from '@/lib/webusb/constants';

/**
 * A pure TypeScript mock of a USBDevice that implements just enough of the
 * STM32 DfuSe protocol to exercise the flash state machine end-to-end.
 *
 * Records every control-transfer request + response so tests can assert on
 * the exact byte stream the flasher emits.
 */

export interface MockTransferLogEntry {
  direction: 'in' | 'out';
  request: number;
  blockNum: number;
  dataLength: number;
  data?: Uint8Array;
}

export interface MockUsbDeviceOptions {
  /** How many DNBUSY→DNLOAD_IDLE polls to report during page erase / write. */
  busyPolls?: number;
  /** Throw on the Nth DNLOAD call (1-indexed). Used to test error recovery. */
  failOnDnload?: number;
  /** Don't advertise a parseable memory layout on the chosen alternate. */
  omitMemoryLayout?: boolean;
  /**
   * Advertised flash layout. Defaults to the real STM32L452RE (Proffieboard V3)
   * descriptor: 256 pages × 2 KiB = 512 KiB. Tests that need a different board
   * (e.g. V2's STM32L433CC has 128 pages × 2 KiB = 256 KiB) can override.
   */
  memoryLayoutString?: string;
  /**
   * Advertised wTransferSize in the DFU functional descriptor. Defaults to
   * 2048, which is what ST's L4 bootloader advertises.
   */
  transferSize?: number;
  /** On block N ≥ 2, corrupt the byte we store in simulated flash. Tests readback verify. */
  corruptDataAtBlock?: number;
  /**
   * Advertised `bwPollTimeout` in the GET_STATUS response (little-endian
   * 24-bit). Real STM32 bootloaders report non-zero values during DNBUSY —
   * our flasher must honour the timeout between polls. Defaults to 0 so
   * existing tests don't have to wait, but the poll-timeout test
   * overrides this.
   */
  pollTimeoutMs?: number;
}

export class MockUsbDevice implements USBDevice {
  readonly vendorId = 0x0483;
  readonly productId = 0xdf11;
  readonly productName = 'STM32 BOOTLOADER';
  readonly manufacturerName = 'STMicroelectronics';
  readonly serialNumber = 'MOCK0001';

  opened = false;
  configuration: USBConfiguration | null = null;
  readonly configurations: USBConfiguration[];

  /** Log of every control-transfer the test has observed. */
  public readonly log: MockTransferLogEntry[] = [];
  /** Simulated flash memory, indexed by byte address (sparse). */
  public readonly writtenBytes = new Map<number, number>();
  /** Pages the mock has "erased". */
  public readonly erasedPages = new Set<number>();

  private state: DfuState = DfuState.dfuIDLE;
  private status: DfuStatus = DfuStatus.OK;
  private addressPointer = 0;
  private busyRemaining = 0;
  private dnloadCallCount = 0;
  private manifestRequested = false;

  constructor(private readonly options: MockUsbDeviceOptions = {}) {
    this.configurations = [this.buildConfiguration()];
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async open(): Promise<void> {
    this.opened = true;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  async selectConfiguration(configurationValue: number): Promise<void> {
    this.configuration =
      this.configurations.find((c) => c.configurationValue === configurationValue) ?? null;
  }

  async claimInterface(_interfaceNumber: number): Promise<void> {
    // No-op for the mock.
  }

  async releaseInterface(_interfaceNumber: number): Promise<void> {
    // No-op for the mock.
  }

  async selectAlternateInterface(_iface: number, _alt: number): Promise<void> {
    // No-op for the mock.
  }

  async reset(): Promise<void> {
    this.state = DfuState.dfuIDLE;
    this.status = DfuStatus.OK;
  }

  // ─── Control transfers ─────────────────────────────────────────────────────

  async controlTransferIn(
    setup: USBControlTransferParameters,
    length: number,
  ): Promise<USBInTransferResult> {
    // USB standard request: GET_DESCRIPTOR (bRequest=0x06). DFU functional
    // descriptor lives at (value = (0x21 << 8) | 0x00). We serve a 9-byte
    // descriptor advertising the configured wTransferSize.
    if (setup.requestType === 'standard' && setup.request === 0x06 && setup.value === (0x21 << 8)) {
      const transferSize = this.options.transferSize ?? 2048;
      const buf = new ArrayBuffer(9);
      const view = new DataView(buf);
      view.setUint8(0, 9);                    // bLength
      view.setUint8(1, 0x21);                 // bDescriptorType = DFU FUNCTIONAL
      view.setUint8(2, 0b00001011);           // bmAttributes = manifest tolerant + can download + can upload
      view.setUint16(3, 255, true);           // wDetachTimeOut
      view.setUint16(5, transferSize, true);  // wTransferSize (LE)
      view.setUint16(7, 0x0110, true);        // bcdDFUVersion = 1.1
      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum: setup.value,
        dataLength: length,
      });
      return { data: new DataView(buf), status: 'ok' };
    }

    if (setup.request === DFU_REQUEST.GETSTATUS) {
      const buf = new ArrayBuffer(6);
      const view = new DataView(buf);
      view.setUint8(0, this.status);
      // bwPollTimeout — 24-bit LE. Real bootloaders report non-zero during
      // DNBUSY; the host is meant to wait this long before re-polling.
      const pt = this.options.pollTimeoutMs ?? 0;
      view.setUint8(1, pt & 0xff);
      view.setUint8(2, (pt >> 8) & 0xff);
      view.setUint8(3, (pt >> 16) & 0xff);

      // If we're busy, advance the state machine toward idle on each GET_STATUS.
      if (this.state === DfuState.dfuDNLOAD_SYNC) {
        this.state = this.busyRemaining > 0 ? DfuState.dfuDNBUSY : DfuState.dfuDNLOAD_IDLE;
      } else if (this.state === DfuState.dfuDNBUSY) {
        this.busyRemaining--;
        this.state = this.busyRemaining > 0 ? DfuState.dfuDNBUSY : DfuState.dfuDNLOAD_IDLE;
      } else if (this.state === DfuState.dfuMANIFEST_SYNC) {
        this.state = DfuState.dfuMANIFEST_WAIT_RESET;
      }

      view.setUint8(4, this.state);
      view.setUint8(5, 0);

      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum: setup.value,
        dataLength: length,
      });
      return { data: new DataView(buf), status: 'ok' };
    }

    if (setup.request === DFU_REQUEST.GETSTATE) {
      const buf = new ArrayBuffer(1);
      new DataView(buf).setUint8(0, this.state);
      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum: setup.value,
        dataLength: length,
      });
      return { data: new DataView(buf), status: 'ok' };
    }

    if (setup.request === DFU_REQUEST.UPLOAD) {
      // Return the contents of simulated flash for the requested block.
      // DfuSe's address stride is the fixed wTransferSize, not the `length`
      // the host asked to read (the last partial block is shorter). Match
      // the stride used by controlTransferOut + DNLOAD.
      const blockNum = setup.value;
      const stride = this.options.transferSize ?? DFU_DEFAULT_TRANSFER_SIZE;
      const out = new Uint8Array(length);
      if (blockNum >= 2) {
        const base = this.addressPointer + (blockNum - 2) * stride;
        for (let i = 0; i < length; i++) {
          out[i] = this.writtenBytes.get(base + i) ?? 0xff;
        }
      }
      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum,
        dataLength: length,
      });
      return { data: new DataView(out.buffer), status: 'ok' };
    }

    throw new Error(`MockUsbDevice: unhandled controlTransferIn request ${setup.request}`);
  }

  async controlTransferOut(
    setup: USBControlTransferParameters,
    data?: BufferSource,
  ): Promise<USBOutTransferResult> {
    const bytes = data ? toUint8Array(data) : new Uint8Array(0);

    this.log.push({
      direction: 'out',
      request: setup.request,
      blockNum: setup.value,
      dataLength: bytes.byteLength,
      data: bytes.slice(),
    });

    if (setup.request === DFU_REQUEST.DNLOAD) {
      this.dnloadCallCount++;
      if (this.options.failOnDnload === this.dnloadCallCount) {
        this.state = DfuState.dfuERROR;
        this.status = DfuStatus.errWRITE;
        return { bytesWritten: 0, status: 'ok' };
      }

      if (setup.value === 0) {
        // Command block — SET_ADDRESS / ERASE / zero-length manifest.
        if (bytes.byteLength === 0) {
          // Zero-length DNLOAD — manifest.
          this.manifestRequested = true;
          this.state = DfuState.dfuMANIFEST_SYNC;
        } else {
          const cmd = bytes[0];
          const addr =
            bytes[1] | (bytes[2] << 8) | (bytes[3] << 16) | (bytes[4] << 24);
          if (cmd === DFUSE_COMMAND.SET_ADDRESS) {
            this.addressPointer = addr >>> 0;
          } else if (cmd === DFUSE_COMMAND.ERASE_PAGE) {
            this.erasedPages.add(addr >>> 0);
          }
          this.state = DfuState.dfuDNLOAD_SYNC;
          this.busyRemaining = this.options.busyPolls ?? 0;
        }
      } else if (setup.value >= 2) {
        // Data block — DfuSe uses a fixed wTransferSize stride, not the
        // current packet's byte length (the final packet may be shorter).
        const stride = this.options.transferSize ?? DFU_DEFAULT_TRANSFER_SIZE;
        const base = this.addressPointer + (setup.value - 2) * stride;
        const corruptHere = this.options.corruptDataAtBlock === setup.value;
        for (let i = 0; i < bytes.byteLength; i++) {
          // Simulate a flash write that silently flips a bit on block N —
          // post-flash readback verify should catch it.
          const stored = corruptHere && i === 0 ? bytes[i] ^ 0xff : bytes[i];
          this.writtenBytes.set(base + i, stored);
        }
        this.state = DfuState.dfuDNLOAD_SYNC;
        this.busyRemaining = this.options.busyPolls ?? 0;
      }

      return { bytesWritten: bytes.byteLength, status: 'ok' };
    }

    if (setup.request === DFU_REQUEST.CLRSTATUS) {
      this.state = DfuState.dfuIDLE;
      this.status = DfuStatus.OK;
      return { bytesWritten: 0, status: 'ok' };
    }

    if (setup.request === DFU_REQUEST.ABORT) {
      this.state = DfuState.dfuIDLE;
      this.status = DfuStatus.OK;
      return { bytesWritten: 0, status: 'ok' };
    }

    throw new Error(`MockUsbDevice: unhandled controlTransferOut request ${setup.request}`);
  }

  // ─── Test introspection helpers ────────────────────────────────────────────

  get receivedManifestRequest(): boolean {
    return this.manifestRequested;
  }

  get currentState(): DfuState {
    return this.state;
  }

  get writtenByteCount(): number {
    return this.writtenBytes.size;
  }

  /** Read back a contiguous range of the simulated flash. */
  readFlash(startAddress: number, length: number): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = this.writtenBytes.get(startAddress + i) ?? 0xff;
    }
    return out;
  }

  // ─── Configuration builder ─────────────────────────────────────────────────

  private buildConfiguration(): USBConfiguration {
    const memoryName = this.options.omitMemoryLayout
      ? ''
      : (this.options.memoryLayoutString
          ?? '@Internal Flash  /0x08000000/256*0002Kg');

    const alt: USBInterfaceDescriptor = {
      interfaceNumber: 0,
      claimed: false,
      alternates: [
        {
          alternateSetting: 0,
          interfaceClass: 0xfe,
          interfaceSubclass: 0x01,
          interfaceProtocol: 0x02,
          interfaceName: memoryName,
          endpoints: [],
        },
      ],
      alternate: {
        alternateSetting: 0,
        interfaceClass: 0xfe,
        interfaceSubclass: 0x01,
        interfaceProtocol: 0x02,
        interfaceName: memoryName,
        endpoints: [],
      },
    };
    const cfg: USBConfiguration = {
      configurationValue: 1,
      interfaces: [alt],
    };
    this.configuration = cfg;
    return cfg;
  }
}

function toUint8Array(source: BufferSource): Uint8Array {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  return new Uint8Array(0);
}
