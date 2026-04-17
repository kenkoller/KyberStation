import { describe, it, expect } from 'vitest';
import { DfuDevice, DfuError } from '@/lib/webusb/DfuDevice';
import { DfuState, DfuStatus } from '@/lib/webusb/types';
import { MockUsbDevice } from './mockUsbDevice';

async function makeDfu(options = {}): Promise<{ device: MockUsbDevice; dfu: DfuDevice }> {
  const device = new MockUsbDevice(options);
  await device.open();
  const ifaceNum = DfuDevice.findDfuInterface(device);
  expect(ifaceNum).toBe(0);
  const dfu = new DfuDevice(device, ifaceNum!);
  await dfu.loadAlternates();
  return { device, dfu };
}

describe('DfuDevice.findDfuInterface', () => {
  it('finds the DFU-mode interface on a Proffieboard-like device', async () => {
    const device = new MockUsbDevice();
    await device.open();
    expect(DfuDevice.findDfuInterface(device)).toBe(0);
  });
});

describe('DfuDevice — class requests', () => {
  it('GET_STATUS parses a 6-byte response', async () => {
    const { dfu } = await makeDfu();
    const status = await dfu.getStatus();
    expect(status.status).toBe(DfuStatus.OK);
    expect(status.state).toBe(DfuState.dfuIDLE);
  });

  it('GET_STATE parses the 1-byte response', async () => {
    const { dfu } = await makeDfu();
    const state = await dfu.getState();
    expect(state).toBe(DfuState.dfuIDLE);
  });

  it('CLR_STATUS succeeds and logs the correct class request', async () => {
    const { dfu, device } = await makeDfu();
    await dfu.clearStatus();
    const clrLog = device.log.find((l) => l.request === 0x04);
    expect(clrLog).toBeDefined();
    expect(clrLog!.direction).toBe('out');
  });

  it('ABORT succeeds and logs the correct class request', async () => {
    const { dfu, device } = await makeDfu();
    await dfu.abort();
    const abortLog = device.log.find((l) => l.request === 0x06);
    expect(abortLog).toBeDefined();
    expect(abortLog!.direction).toBe('out');
  });

  it('DNLOAD block 0 with address sets the DfuSe address pointer', async () => {
    const { dfu, device } = await makeDfu();
    const payload = new Uint8Array([0x21, 0x00, 0x00, 0x00, 0x08]);
    await dfu.download(0, payload);
    const dnloadLog = device.log.find((l) => l.request === 0x01 && l.blockNum === 0);
    expect(dnloadLog).toBeDefined();
    expect(dnloadLog!.data).toEqual(payload);
  });
});

describe('DfuDevice.loadAlternates', () => {
  it('parses the alternate\'s memory layout from its interface name', async () => {
    const { dfu } = await makeDfu();
    expect(dfu.alternates).toHaveLength(1);
    expect(dfu.alternates[0].name).toContain('Internal Flash');
    expect(dfu.alternates[0].memoryLayout).toBeDefined();
    expect(dfu.alternates[0].memoryLayout![0].startAddress).toBe(0x08000000);
  });
});

describe('DfuDevice.readFunctionalDescriptor', () => {
  it('parses the 9-byte DFU functional descriptor', async () => {
    const { dfu } = await makeDfu();
    const desc = await dfu.readFunctionalDescriptor();
    expect(desc.length).toBe(9);
    expect(desc.transferSize).toBe(2048);
    expect(desc.dfuVersion).toBe(0x0110);
    expect(desc.detachTimeoutMs).toBe(255);
    // bit 0 (can DNLOAD) + bit 1 (can UPLOAD) + bit 3 (manifest tolerant)
    expect(desc.attributes).toBe(0b00001011);
  });

  it('honours a non-standard wTransferSize from the bootloader', async () => {
    const { dfu } = await makeDfu({ transferSize: 1024 });
    const desc = await dfu.readFunctionalDescriptor();
    expect(desc.transferSize).toBe(1024);
    expect(dfu.getTransferSize(2048)).toBe(1024);
  });

  it('falls back when the descriptor has not been read', async () => {
    const { dfu } = await makeDfu();
    expect(dfu.functionalDescriptor).toBeUndefined();
    expect(dfu.getTransferSize(2048)).toBe(2048);
  });
});

describe('DfuDevice.pollUntilIdle', () => {
  it('returns once the device transitions to an expected state', async () => {
    // busyPolls = 2 → device reports DNBUSY twice, then DNLOAD_IDLE.
    const { dfu, device } = await makeDfu({ busyPolls: 2 });
    await dfu.download(0, new Uint8Array([0x21, 0, 0, 0, 0x08]));

    const sleepCalls: number[] = [];
    const fakeSleep = async (ms: number) => {
      sleepCalls.push(ms);
    };

    const status = await dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], fakeSleep);
    expect(status.state).toBe(DfuState.dfuDNLOAD_IDLE);
    // Should have observed 3 GET_STATUS calls total (DNLOAD_SYNC, DNBUSY, DNBUSY, DNLOAD_IDLE is collapsed).
    const getStatusLogs = device.log.filter((l) => l.request === 0x03);
    expect(getStatusLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('throws DfuError when the device enters dfuERROR', async () => {
    // failOnDnload=1 → first DNLOAD transitions the mock into dfuERROR.
    const { dfu } = await makeDfu({ failOnDnload: 1 });
    await dfu.download(0, new Uint8Array([0x21, 0, 0, 0, 0x08]));
    const fakeSleep = async () => {};

    await expect(dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], fakeSleep)).rejects.toThrow(
      DfuError,
    );
  });

  it('honours the bwPollTimeout reported by the device', async () => {
    // Report a 50 ms poll timeout, with 2 DNBUSY polls → expect 2 sleeps of 50 ms.
    const { dfu } = await makeDfu({ busyPolls: 2, pollTimeoutMs: 50 });
    await dfu.download(0, new Uint8Array([0x21, 0, 0, 0, 0x08]));

    const sleepCalls: number[] = [];
    const fakeSleep = async (ms: number) => {
      sleepCalls.push(ms);
    };

    await dfu.pollUntilIdle([DfuState.dfuDNLOAD_IDLE], fakeSleep);
    // We should have slept at least once between GET_STATUS responses where
    // the state was still busy, and the value should match what the device
    // advertised — not a hardcoded number on our side.
    expect(sleepCalls.length).toBeGreaterThan(0);
    expect(sleepCalls.every((ms) => ms === 50)).toBe(true);
  });
});
