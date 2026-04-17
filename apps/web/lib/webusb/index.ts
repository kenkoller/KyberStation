/**
 * Public API for the WebUSB + STM32 DFU flash flow. UI components should
 * import from here rather than reaching into individual files.
 */

export {
  connectProffieboardDfu,
  disconnectProffieboardDfu,
  isWebUsbSupported,
  getWebUsb,
  WebUsbUnsupportedError,
  type ConnectedProffieboard,
} from './connect';

export { DfuDevice, DfuError } from './DfuDevice';
export { DfuSeFlasher } from './DfuSeFlasher';

export {
  DfuState,
  DfuStatus,
  type DfuStatusResult,
  type DfuInterfaceAlternate,
  type DfuMemoryRegion,
  type FlashOptions,
  type FlashProgress,
  type FlashPhase,
} from './types';

export {
  STM32_VENDOR_ID,
  STM32_DFU_PRODUCT_ID,
  PROFFIEBOARD_DFU_FILTER,
  STM32L4_FLASH_BASE,
  FIRMWARE_MAX_BYTES,
  DFU_STATE_NAMES,
  DFU_STATUS_NAMES,
} from './constants';

export { parseDfuMemoryLayout, findInternalFlash, pagesToErase } from './memoryLayout';
