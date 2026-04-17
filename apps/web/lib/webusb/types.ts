/**
 * Minimal WebUSB + DFU type definitions for KyberStation's flash flow.
 *
 * The WebUSB API ships in Chromium-family browsers but is not part of the
 * default TypeScript `lib.dom.d.ts`. We inline the subset we use rather than
 * pulling in `@types/w3c-web-usb` — keeps the dependency graph lean and the
 * types co-located with the code that uses them.
 */

// ─── WebUSB transport surface (subset we actually call) ───────────────────────

export interface USBControlTransferParameters {
  requestType: 'standard' | 'class' | 'vendor';
  recipient: 'device' | 'interface' | 'endpoint' | 'other';
  request: number;
  value: number;
  index: number;
}

export interface USBInTransferResult {
  data?: DataView;
  status: 'ok' | 'stall' | 'babble';
}

export interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

export interface USBInterfaceDescriptor {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: USBAlternateInterface[];
  claimed: boolean;
}

export interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName?: string;
  endpoints: unknown[];
}

export interface USBConfiguration {
  configurationValue: number;
  configurationName?: string;
  interfaces: USBInterfaceDescriptor[];
}

export interface USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName?: string;
  readonly manufacturerName?: string;
  readonly serialNumber?: string;
  readonly opened: boolean;
  readonly configuration: USBConfiguration | null;
  readonly configurations: USBConfiguration[];

  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;

  controlTransferIn(
    setup: USBControlTransferParameters,
    length: number,
  ): Promise<USBInTransferResult>;

  controlTransferOut(
    setup: USBControlTransferParameters,
    data?: BufferSource,
  ): Promise<USBOutTransferResult>;

  reset(): Promise<void>;
}

export interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

export interface USB {
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
}

// ─── DFU protocol types ──────────────────────────────────────────────────────

/**
 * DFU device status (from GET_STATUS response). Values defined in the
 * USB DFU 1.1 specification, table 4.3.
 */
export enum DfuStatus {
  OK = 0x00,
  errTARGET = 0x01,
  errFILE = 0x02,
  errWRITE = 0x03,
  errERASE = 0x04,
  errCHECK_ERASED = 0x05,
  errPROG = 0x06,
  errVERIFY = 0x07,
  errADDRESS = 0x08,
  errNOTDONE = 0x09,
  errFIRMWARE = 0x0a,
  errVENDOR = 0x0b,
  errUSBR = 0x0c,
  errPOR = 0x0d,
  errUNKNOWN = 0x0e,
  errSTALLEDPKT = 0x0f,
}

/**
 * DFU device state (from GET_STATUS response). Values defined in the
 * USB DFU 1.1 specification, table 4.2.
 */
export enum DfuState {
  appIDLE = 0,
  appDETACH = 1,
  dfuIDLE = 2,
  dfuDNLOAD_SYNC = 3,
  dfuDNBUSY = 4,
  dfuDNLOAD_IDLE = 5,
  dfuMANIFEST_SYNC = 6,
  dfuMANIFEST = 7,
  dfuMANIFEST_WAIT_RESET = 8,
  dfuUPLOAD_IDLE = 9,
  dfuERROR = 10,
}

/** Result of GET_STATUS (class request 0x03). */
export interface DfuStatusResult {
  status: DfuStatus;
  pollTimeout: number; // ms to wait before next GET_STATUS
  state: DfuState;
  iString: number;     // index of optional status string descriptor
}

/**
 * A DFU-capable interface alternate setting. STM32 exposes one alternate per
 * flash region (Internal Flash, Option Bytes, OTP, Device Feature).
 * The alternate's name encodes the region's address range — we parse it to
 * decide which alternate to target when flashing firmware.
 */
export interface DfuInterfaceAlternate {
  alternateSetting: number;
  name: string;                 // e.g. "@Internal Flash  /0x08000000/512*0002Kg"
  memoryLayout?: DfuMemoryRegion[];
}

/** One contiguous region of DfuSe-parseable flash layout. */
export interface DfuMemoryRegion {
  startAddress: number;
  sectorCount: number;
  sectorSize: number;            // bytes
  readable: boolean;
  erasable: boolean;
  writable: boolean;
}

// ─── Flash progress reporting ────────────────────────────────────────────────

export type FlashPhase =
  | 'connecting'
  | 'erasing'
  | 'writing'
  | 'verifying'
  | 'manifesting'
  | 'done'
  | 'error';

export interface FlashProgress {
  phase: FlashPhase;
  /** 0–1 fraction of total flash progress (not per-phase). */
  fraction: number;
  message?: string;
  bytesWritten?: number;
  bytesTotal?: number;
}

export interface FlashOptions {
  /** Firmware binary to flash. */
  firmware: Uint8Array;
  /** Start address in flash memory. Defaults to 0x08000000 (STM32L4 flash base). */
  startAddress?: number;
  /** Optional progress callback. */
  onProgress?: (progress: FlashProgress) => void;
  /** If set, abort the flash when this AbortSignal fires. */
  signal?: AbortSignal;
}
