/**
 * Constants for the WebUSB + STM32 DFU flash flow.
 *
 * References:
 *  - USB DFU 1.1 specification
 *    https://usb.org/sites/default/files/DFU_1.1.pdf
 *  - STM32 AN3156 — "USB DFU protocol used in the STM32 bootloader"
 *    https://www.st.com/resource/en/application_note/an3156-usb-dfu-protocol-used-in-the-stm32-bootloader-stmicroelectronics.pdf
 *  - ProffieOS hardware reference — Proffieboard V3.9 uses STM32L452RE
 */

// ─── USB vendor / product identification ─────────────────────────────────────

/**
 * STMicroelectronics Vendor ID. Every STM32 in factory DFU mode reports
 * this VID regardless of the end-product branding.
 */
export const STM32_VENDOR_ID = 0x0483;

/**
 * STM32 DFU Bootloader Product ID (DfuSe). Set by ST's ROM bootloader when
 * the STM32 enters DFU mode via the BOOT0 pin.
 */
export const STM32_DFU_PRODUCT_ID = 0xdf11;

/** The filter passed to `navigator.usb.requestDevice`. */
export const PROFFIEBOARD_DFU_FILTER = {
  vendorId: STM32_VENDOR_ID,
  productId: STM32_DFU_PRODUCT_ID,
};

// ─── DFU USB interface class ─────────────────────────────────────────────────

/** Interface class code for DFU (application-specific per DFU 1.1 §4.1). */
export const DFU_INTERFACE_CLASS = 0xfe;
/** Interface subclass code for DFU. */
export const DFU_INTERFACE_SUBCLASS = 0x01;
/** Protocol code for DFU mode. */
export const DFU_PROTOCOL_DFU_MODE = 0x02;

// ─── DFU class requests (bRequest values) ────────────────────────────────────
//
// Sent with bmRequestType = 0x21 (host→device, class, recipient=interface)
// or 0xA1 (device→host, class, recipient=interface).

export const DFU_REQUEST = {
  DETACH:     0x00,
  DNLOAD:     0x01,
  UPLOAD:     0x02,
  GETSTATUS:  0x03,
  CLRSTATUS:  0x04,
  GETSTATE:   0x05,
  ABORT:      0x06,
} as const;

// ─── STM32 DfuSe vendor extensions (first byte of DNLOAD payload) ────────────

export const DFUSE_COMMAND = {
  /** Set the address pointer for subsequent UPLOAD / DNLOAD commands. */
  SET_ADDRESS:    0x21,
  /** Erase a specific flash page (when followed by 4-byte page address). */
  ERASE_PAGE:     0x41,
  /** Mass-erase the entire flash (ERASE_PAGE byte with no address). */
  MASS_ERASE:     0x41,
  /** Unprotect the device (clears readout protection). */
  READ_UNPROTECT: 0x92,
} as const;

// ─── Flash layout defaults ───────────────────────────────────────────────────

/** STM32L4 flash base address. */
export const STM32L4_FLASH_BASE = 0x08000000;

/** DFU transfer size defaults (matches ST DfuSe v3). */
export const DFU_DEFAULT_TRANSFER_SIZE = 2048;

/**
 * Maximum size of a single firmware image we'll accept for upload. Proffieboard
 * V3's STM32L452RE has 512 KiB of flash; we cap at 1 MiB to allow for
 * potential future boards without being unboundedly permissive.
 */
export const FIRMWARE_MAX_BYTES = 1024 * 1024;

// ─── Human-readable status / state names (for error messages) ────────────────

import { DfuState, DfuStatus } from './types';

export const DFU_STATE_NAMES: Record<DfuState, string> = {
  [DfuState.appIDLE]: 'appIDLE',
  [DfuState.appDETACH]: 'appDETACH',
  [DfuState.dfuIDLE]: 'dfuIDLE',
  [DfuState.dfuDNLOAD_SYNC]: 'dfuDNLOAD_SYNC',
  [DfuState.dfuDNBUSY]: 'dfuDNBUSY',
  [DfuState.dfuDNLOAD_IDLE]: 'dfuDNLOAD_IDLE',
  [DfuState.dfuMANIFEST_SYNC]: 'dfuMANIFEST_SYNC',
  [DfuState.dfuMANIFEST]: 'dfuMANIFEST',
  [DfuState.dfuMANIFEST_WAIT_RESET]: 'dfuMANIFEST_WAIT_RESET',
  [DfuState.dfuUPLOAD_IDLE]: 'dfuUPLOAD_IDLE',
  [DfuState.dfuERROR]: 'dfuERROR',
};

export const DFU_STATUS_NAMES: Record<DfuStatus, string> = {
  [DfuStatus.OK]: 'OK',
  [DfuStatus.errTARGET]: 'errTARGET — file does not target this device',
  [DfuStatus.errFILE]: 'errFILE — file fails vendor-specific verification',
  [DfuStatus.errWRITE]: 'errWRITE — cannot write memory',
  [DfuStatus.errERASE]: 'errERASE — memory erase failed',
  [DfuStatus.errCHECK_ERASED]: 'errCHECK_ERASED — memory not erased',
  [DfuStatus.errPROG]: 'errPROG — program failed',
  [DfuStatus.errVERIFY]: 'errVERIFY — verify failed after write',
  [DfuStatus.errADDRESS]: 'errADDRESS — address out of range',
  [DfuStatus.errNOTDONE]: 'errNOTDONE — DNLOAD zero-length packet received but data incomplete',
  [DfuStatus.errFIRMWARE]: 'errFIRMWARE — device firmware corrupt',
  [DfuStatus.errVENDOR]: 'errVENDOR — vendor-specific error',
  [DfuStatus.errUSBR]: 'errUSBR — unexpected USB reset',
  [DfuStatus.errPOR]: 'errPOR — unexpected power-on reset',
  [DfuStatus.errUNKNOWN]: 'errUNKNOWN — unknown error',
  [DfuStatus.errSTALLEDPKT]: 'errSTALLEDPKT — device stalled an unexpected request',
};
