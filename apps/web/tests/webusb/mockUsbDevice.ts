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
  /**
   * Simulate Chrome-on-macOS's behaviour where `alt.interfaceName` comes
   * back null even when the device advertises valid string descriptors.
   * When true, the alternate is built with `interfaceName: undefined`, and
   * the mock serves the configured `memoryLayoutString` via a raw
   * GET_DESCRIPTOR(string) control transfer (iInterface = 4) — matching what
   * a real STM32 DfuSe bootloader does on Proffieboard V3 / V3.9.
   */
  macosNullInterfaceNames?: boolean;
  /**
   * Enforce DFU spec state-machine rules on UPLOAD and DNLOAD:
   *   • UPLOAD is only valid from `dfuIDLE` (first block) or `dfuUPLOAD_IDLE`
   *     (continuing a sequence). From any other state, return `status: 'stall'`.
   *   • DNLOAD is only valid from `dfuIDLE` (first block / command) or
   *     `dfuDNLOAD_IDLE` (continuing a sequence). Otherwise stall.
   *   • Successful UPLOAD transitions to `dfuUPLOAD_IDLE`.
   *
   * Matches the real STM32 DfuSe bootloader, which STALLs exactly these
   * violations on hardware (see 2026-04-20 validation session). Opt-in so
   * existing tests keep their legacy leniency; regression tests for the
   * three state-machine bugs fixed that day turn it on.
   */
  strictState?: boolean;
  /**
   * Simulate the STM32 DfuSe bootloader's `bitManifestationTolerant = 0`
   * behaviour: as the device transitions into `dfuMANIFEST_WAIT_RESET`
   * after manifestation, it resets the USB bus and the host's next
   * `controlTransferIn` fails. Chrome surfaces this as a raw
   * `DOMException`, not a DFU-level error. With this option set, the
   * first GET_STATUS that would report `dfuMANIFEST_WAIT_RESET` throws
   * a DOMException-shaped error instead of returning — matching what
   * Chrome's WebUSB API does on real hardware.
   */
  resetAfterManifest?: boolean;
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
    // USB standard request: GET_DESCRIPTOR (bRequest=0x06).
    // The macOS-null fallback in DfuDevice.loadAlternates() fetches the
    // configuration descriptor + string descriptors directly. Serve both
    // when that simulation is enabled.
    if (
      this.options.macosNullInterfaceNames &&
      setup.requestType === 'standard' &&
      setup.request === 0x06 &&
      ((setup.value >>> 8) & 0xff) === 0x02
    ) {
      const buf = this.buildConfigurationDescriptorBytes();
      const out = new Uint8Array(Math.min(length, buf.byteLength));
      out.set(buf.subarray(0, out.byteLength));
      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum: setup.value,
        dataLength: length,
      });
      return { data: new DataView(out.buffer), status: 'ok' };
    }

    if (
      this.options.macosNullInterfaceNames &&
      setup.requestType === 'standard' &&
      setup.request === 0x06 &&
      ((setup.value >>> 8) & 0xff) === 0x03
    ) {
      const stringIndex = setup.value & 0xff;
      const str = this.getMacosStringDescriptor(stringIndex);
      if (str === undefined) {
        return { data: new DataView(new ArrayBuffer(0)), status: 'stall' };
      }
      const utf16 = new Uint16Array(str.length);
      for (let i = 0; i < str.length; i++) utf16[i] = str.charCodeAt(i);
      const payload = new Uint8Array(2 + utf16.byteLength);
      payload[0] = payload.byteLength;
      payload[1] = 0x03;
      new Uint8Array(utf16.buffer).forEach((b, i) => (payload[2 + i] = b));
      this.log.push({
        direction: 'in',
        request: setup.request,
        blockNum: setup.value,
        dataLength: length,
      });
      return { data: new DataView(payload.buffer), status: 'ok' };
    }

    // DFU functional descriptor lives at (value = (0x21 << 8) | 0x00). We
    // serve a 9-byte descriptor advertising the configured wTransferSize.
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
        // resetAfterManifest: STM32 DfuSe bootloader issues a USB bus
        // reset as it enters dfuMANIFEST_WAIT_RESET. Chrome surfaces that
        // as a raw DOMException from controlTransferIn, not a DFU-level
        // error. Throw here to match the hardware behaviour observed on
        // 2026-04-20.
        if (this.options.resetAfterManifest) {
          throw new DOMException(
            "Failed to execute 'controlTransferIn' on 'USBDevice': A transfer error has occurred.",
            'NetworkError',
          );
        }
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
      // strictState: real STM32 DfuSe bootloader STALLs UPLOAD from any
      // state other than dfuIDLE (first block) or dfuUPLOAD_IDLE (continuing).
      // Caught the 2026-04-20 verify-after-setAddressPointer bug on hardware.
      if (
        this.options.strictState &&
        this.state !== DfuState.dfuIDLE &&
        this.state !== DfuState.dfuUPLOAD_IDLE
      ) {
        this.state = DfuState.dfuERROR;
        this.status = DfuStatus.errSTALLEDPKT;
        this.log.push({
          direction: 'in',
          request: setup.request,
          blockNum: setup.value,
          dataLength: length,
        });
        return { data: new DataView(new ArrayBuffer(0)), status: 'stall' };
      }

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
      // Successful UPLOAD transitions the device to dfuUPLOAD_IDLE per the
      // DFU spec state diagram. Unconditional — the transition is the same
      // regardless of strictState mode; strict mode only gates entry.
      this.state = DfuState.dfuUPLOAD_IDLE;
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
      // strictState: STM32 DfuSe bootloader STALLs DNLOAD from any state
      // other than dfuIDLE (first block / command) or dfuDNLOAD_IDLE
      // (continuing). Caught the 2026-04-20 manifest-after-UPLOAD bug on
      // hardware — manifest's zero-length DNLOAD was being issued from
      // dfuUPLOAD_IDLE.
      if (
        this.options.strictState &&
        this.state !== DfuState.dfuIDLE &&
        this.state !== DfuState.dfuDNLOAD_IDLE
      ) {
        this.state = DfuState.dfuERROR;
        this.status = DfuStatus.errSTALLEDPKT;
        return { bytesWritten: 0, status: 'stall' };
      }

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

    // On macOS, Chrome returns null for the interface name — simulate that by
    // handing WebUSB-land an undefined `interfaceName` even though the device
    // still advertises the string via GET_DESCRIPTOR (served separately).
    const exposedName = this.options.macosNullInterfaceNames ? undefined : memoryName;

    const alt: USBInterfaceDescriptor = {
      interfaceNumber: 0,
      claimed: false,
      alternates: [
        {
          alternateSetting: 0,
          interfaceClass: 0xfe,
          interfaceSubclass: 0x01,
          interfaceProtocol: 0x02,
          interfaceName: exposedName,
          endpoints: [],
        },
      ],
      alternate: {
        alternateSetting: 0,
        interfaceClass: 0xfe,
        interfaceSubclass: 0x01,
        interfaceProtocol: 0x02,
        interfaceName: exposedName,
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

  /**
   * Assemble a minimal but valid configuration descriptor byte stream for
   * the macOS-null fallback path. 9-byte config header + one 9-byte
   * interface descriptor with `iInterface = 4` (matching the real STM32
   * DfuSe layout, where the Internal Flash alternate's string lives at
   * index 4). Returned as Uint8Array so controlTransferIn can slice it.
   */
  private buildConfigurationDescriptorBytes(): Uint8Array {
    const totalLength = 9 + 9; // config header + 1 interface descriptor
    const buf = new Uint8Array(totalLength);
    // Configuration descriptor (USB 2.0 §9.6.3)
    buf[0] = 9;                           // bLength
    buf[1] = 0x02;                        // bDescriptorType (CONFIGURATION)
    buf[2] = totalLength & 0xff;          // wTotalLength (LE)
    buf[3] = (totalLength >> 8) & 0xff;
    buf[4] = 1;                           // bNumInterfaces
    buf[5] = 1;                           // bConfigurationValue
    buf[6] = 0;                           // iConfiguration
    buf[7] = 0x80;                        // bmAttributes (bus-powered)
    buf[8] = 50;                          // bMaxPower (100 mA)
    // Interface descriptor (USB 2.0 §9.6.5)
    buf[9] = 9;                           // bLength
    buf[10] = 0x04;                       // bDescriptorType (INTERFACE)
    buf[11] = 0;                          // bInterfaceNumber
    buf[12] = 0;                          // bAlternateSetting
    buf[13] = 0;                          // bNumEndpoints
    buf[14] = 0xfe;                       // bInterfaceClass (application-specific)
    buf[15] = 0x01;                       // bInterfaceSubClass (DFU)
    buf[16] = 0x02;                       // bInterfaceProtocol (DFU mode)
    buf[17] = 4;                          // iInterface (matches real DfuSe)
    return buf;
  }

  /**
   * Serve the string descriptor the macOS fallback will ask for.
   * String index 4 matches the `iInterface` value advertised by
   * `buildConfigurationDescriptorBytes()`.
   */
  private getMacosStringDescriptor(index: number): string | undefined {
    if (index === 4) {
      return this.options.omitMemoryLayout
        ? ''
        : (this.options.memoryLayoutString
            ?? '@Internal Flash  /0x08000000/256*0002Kg');
    }
    return undefined;
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
