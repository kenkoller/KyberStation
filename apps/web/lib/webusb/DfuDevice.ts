import type {
  USBDevice,
  DfuStatusResult,
  DfuInterfaceAlternate,
  DfuFunctionalDescriptor,
  USBAlternateInterface,
} from './types';
import { DfuStatus, DfuState } from './types';
import {
  DFU_REQUEST,
  DFU_INTERFACE_CLASS,
  DFU_INTERFACE_SUBCLASS,
  DFU_PROTOCOL_DFU_MODE,
  DFU_STATE_NAMES,
  DFU_STATUS_NAMES,
} from './constants';
import { parseDfuMemoryLayout } from './memoryLayout';

/**
 * Custom error thrown by every DFU operation. Surfaces the DFU status code
 * and state so the UI layer can render something user-actionable.
 */
export class DfuError extends Error {
  constructor(
    message: string,
    public readonly status?: DfuStatus,
    public readonly state?: DfuState,
  ) {
    super(message);
    this.name = 'DfuError';
  }
}

/**
 * Wrap a `USBDevice` that speaks DFU. Instances hold the interface number
 * of the claimed DFU interface and issue class requests on the default
 * control pipe.
 *
 * A higher-level flasher (see `DfuSeFlasher`) composes the primitives here
 * into an end-to-end STM32 download sequence.
 */
export class DfuDevice {
  public alternates: DfuInterfaceAlternate[] = [];
  public activeAlternate: number = 0;
  /**
   * Functional descriptor read from the device. `undefined` until
   * `readFunctionalDescriptor()` is called; most flash operations should
   * pull wTransferSize from here rather than hardcoding a constant.
   */
  public functionalDescriptor: DfuFunctionalDescriptor | undefined;

  constructor(
    public readonly device: USBDevice,
    public readonly interfaceNumber: number,
  ) {}

  /**
   * Scan a USBDevice's configuration for a DFU-mode interface. Returns the
   * interface number, or `undefined` if no DFU interface is present.
   */
  static findDfuInterface(device: USBDevice): number | undefined {
    const config = device.configuration;
    if (!config) return undefined;

    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (
          alt.interfaceClass === DFU_INTERFACE_CLASS &&
          alt.interfaceSubclass === DFU_INTERFACE_SUBCLASS &&
          alt.interfaceProtocol === DFU_PROTOCOL_DFU_MODE
        ) {
          return iface.interfaceNumber;
        }
      }
    }
    return undefined;
  }

  /**
   * Populate `this.alternates` by reading string descriptors off every
   * alternate of the claimed interface.
   */
  async loadAlternates(): Promise<void> {
    const config = this.device.configuration;
    if (!config) throw new DfuError('Device has no active USB configuration');

    const iface = config.interfaces.find((i) => i.interfaceNumber === this.interfaceNumber);
    if (!iface) throw new DfuError(`Interface ${this.interfaceNumber} not found`);

    this.alternates = iface.alternates.map((alt: USBAlternateInterface) => ({
      alternateSetting: alt.alternateSetting,
      name: alt.interfaceName ?? '',
      memoryLayout: alt.interfaceName
        ? parseDfuMemoryLayout(alt.interfaceName)
        : undefined,
    }));
  }

  /** Switch to a specific alternate setting (e.g. Internal Flash vs Option Bytes). */
  async selectAlternate(alternateSetting: number): Promise<void> {
    await this.device.selectAlternateInterface(this.interfaceNumber, alternateSetting);
    this.activeAlternate = alternateSetting;
  }

  /**
   * Read the DFU functional descriptor (type 0x21). Populates
   * `this.functionalDescriptor` and returns the parsed result.
   *
   * Sent as a standard GET_DESCRIPTOR request with
   * `wValue = (0x21 << 8) | 0`. The descriptor is 9 bytes (USB DFU 1.1
   * §4.1.3). We prefer this over a hardcoded transfer-size constant
   * because the bootloader is the source of truth.
   *
   * Throws `DfuError` if the bootloader returns a short / non-DFU
   * descriptor, which means we're not talking to a DFU device.
   */
  async readFunctionalDescriptor(): Promise<DfuFunctionalDescriptor> {
    const result = await this.device.controlTransferIn(
      {
        requestType: 'standard',
        recipient: 'interface',
        request: 0x06, // GET_DESCRIPTOR
        value: 0x21 << 8,
        index: this.interfaceNumber,
      },
      9,
    );
    if (result.status !== 'ok' || !result.data || result.data.byteLength < 9) {
      throw new DfuError('GET_DESCRIPTOR(DFU functional) returned a short or stalled response');
    }
    const data = result.data;
    if (data.getUint8(1) !== 0x21) {
      throw new DfuError(
        `Device returned descriptor type 0x${data.getUint8(1).toString(16)} — expected 0x21 (DFU functional)`,
      );
    }
    const desc: DfuFunctionalDescriptor = {
      length: data.getUint8(0),
      attributes: data.getUint8(2),
      detachTimeoutMs: data.getUint16(3, true),
      transferSize: data.getUint16(5, true),
      dfuVersion: data.getUint16(7, true),
    };
    this.functionalDescriptor = desc;
    return desc;
  }

  /**
   * wTransferSize from the functional descriptor, if it's been read.
   * Falls back to the fallback value (typically `DFU_DEFAULT_TRANSFER_SIZE`)
   * when the descriptor hasn't been loaded yet.
   */
  getTransferSize(fallback: number): number {
    return this.functionalDescriptor?.transferSize ?? fallback;
  }

  // ─── DFU class requests ────────────────────────────────────────────────────

  /**
   * DFU_GETSTATUS — returns the device's current status, state, and the
   * poll interval we should wait before the next request while the
   * device is busy.
   */
  async getStatus(): Promise<DfuStatusResult> {
    const result = await this.device.controlTransferIn(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_REQUEST.GETSTATUS,
        value: 0,
        index: this.interfaceNumber,
      },
      6,
    );
    if (result.status !== 'ok' || !result.data || result.data.byteLength < 6) {
      throw new DfuError('GET_STATUS returned a short or stalled response');
    }
    const data = result.data;
    return {
      status: data.getUint8(0) as DfuStatus,
      pollTimeout:
        data.getUint8(1) | (data.getUint8(2) << 8) | (data.getUint8(3) << 16),
      state: data.getUint8(4) as DfuState,
      iString: data.getUint8(5),
    };
  }

  /** DFU_CLRSTATUS — clears a prior error and returns the device to dfuIDLE. */
  async clearStatus(): Promise<void> {
    const result = await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_REQUEST.CLRSTATUS,
      value: 0,
      index: this.interfaceNumber,
    });
    if (result.status !== 'ok') {
      throw new DfuError('CLR_STATUS failed');
    }
  }

  /** DFU_ABORT — return to dfuIDLE from any state. */
  async abort(): Promise<void> {
    const result = await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_REQUEST.ABORT,
      value: 0,
      index: this.interfaceNumber,
    });
    if (result.status !== 'ok') {
      throw new DfuError('ABORT failed');
    }
  }

  /** DFU_GETSTATE — returns current state without the full status payload. */
  async getState(): Promise<DfuState> {
    const result = await this.device.controlTransferIn(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_REQUEST.GETSTATE,
        value: 0,
        index: this.interfaceNumber,
      },
      1,
    );
    if (result.status !== 'ok' || !result.data || result.data.byteLength < 1) {
      throw new DfuError('GET_STATE returned a short or stalled response');
    }
    return result.data.getUint8(0) as DfuState;
  }

  /**
   * DFU_DNLOAD — write a block to the device. `wValue` is the block number
   * (the STM32 DfuSe convention uses block 0 for commands and blocks
   * ≥2 for flash data).
   */
  async download(blockNum: number, data: BufferSource | undefined): Promise<void> {
    const result = await this.device.controlTransferOut(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_REQUEST.DNLOAD,
        value: blockNum,
        index: this.interfaceNumber,
      },
      data,
    );
    if (result.status !== 'ok') {
      throw new DfuError(`DNLOAD block ${blockNum} returned status "${result.status}"`);
    }
  }

  /** DFU_UPLOAD — read a block from the device (used for verification). */
  async upload(blockNum: number, length: number): Promise<Uint8Array> {
    const result = await this.device.controlTransferIn(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_REQUEST.UPLOAD,
        value: blockNum,
        index: this.interfaceNumber,
      },
      length,
    );
    if (result.status !== 'ok' || !result.data) {
      throw new DfuError(`UPLOAD block ${blockNum} returned status "${result.status}"`);
    }
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }

  // ─── Higher-level helpers ──────────────────────────────────────────────────

  /**
   * Poll GET_STATUS until the device is no longer in a busy state (dfuDNBUSY
   * or dfuMANIFEST). Honors the device-reported poll interval between
   * requests. Throws if the device lands in dfuERROR.
   */
  async pollUntilIdle(
    expected: DfuState[] = [DfuState.dfuIDLE, DfuState.dfuDNLOAD_IDLE],
    sleep: (ms: number) => Promise<void> = defaultSleep,
    maxPolls = 200,
  ): Promise<DfuStatusResult> {
    let polls = 0;
    while (true) {
      if (polls++ >= maxPolls) {
        throw new DfuError(
          `Device did not return to an idle state after ${maxPolls} polls`,
        );
      }
      const status = await this.getStatus();
      if (status.status !== DfuStatus.OK) {
        throw new DfuError(
          `Device reported DFU status ${DFU_STATUS_NAMES[status.status]} in state ${DFU_STATE_NAMES[status.state]}`,
          status.status,
          status.state,
        );
      }
      if (expected.includes(status.state)) return status;
      if (status.state === DfuState.dfuERROR) {
        throw new DfuError(
          `Device entered dfuERROR (status ${DFU_STATUS_NAMES[status.status]})`,
          status.status,
          status.state,
        );
      }
      await sleep(status.pollTimeout);
    }
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
