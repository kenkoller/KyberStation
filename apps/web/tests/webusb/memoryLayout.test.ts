import { describe, it, expect } from 'vitest';
import {
  parseDfuMemoryLayout,
  findInternalFlash,
  pagesToErase,
} from '@/lib/webusb/memoryLayout';

describe('parseDfuMemoryLayout', () => {
  it('parses the Proffieboard V3 internal flash layout', () => {
    const regions = parseDfuMemoryLayout('@Internal Flash  /0x08000000/512*0002Kg');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      startAddress: 0x08000000,
      sectorCount: 512,
      sectorSize: 2048,
      readable: true,
      erasable: true,
      writable: true,
    });
  });

  it('parses option bytes as non-erasable', () => {
    const regions = parseDfuMemoryLayout('@Option Bytes  /0x1FFF7800/01*040 e');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      startAddress: 0x1fff7800,
      sectorCount: 1,
      sectorSize: 40,
      readable: true,
      erasable: false,
      writable: true,
    });
  });

  it('parses multiple segments separated by commas', () => {
    const regions = parseDfuMemoryLayout('@Mixed /0x08000000/04*016Kg,01*064Kg');
    expect(regions).toHaveLength(2);
    expect(regions[0].sectorCount).toBe(4);
    expect(regions[0].sectorSize).toBe(16 * 1024);
    expect(regions[1].startAddress).toBe(0x08000000 + 4 * 16 * 1024);
    expect(regions[1].sectorSize).toBe(64 * 1024);
  });

  it('returns an empty array for a malformed descriptor', () => {
    expect(parseDfuMemoryLayout('')).toEqual([]);
    expect(parseDfuMemoryLayout('/not-a-hex-address/01*0001Kg')).toEqual([]);
    expect(parseDfuMemoryLayout('@Foo')).toEqual([]);
  });
});

describe('findInternalFlash', () => {
  it('selects the writable+erasable region in STM32 flash space', () => {
    const regions = parseDfuMemoryLayout(
      '@Internal Flash  /0x08000000/512*0002Kg',
    );
    const flash = findInternalFlash(regions);
    expect(flash).toBeDefined();
    expect(flash!.startAddress).toBe(0x08000000);
  });

  it('rejects non-writable regions', () => {
    // Flag 'a' = readable only.
    const regions = parseDfuMemoryLayout('@Read Only /0x08000000/01*0001Ka');
    expect(findInternalFlash(regions)).toBeUndefined();
  });

  it('rejects regions outside the flash range', () => {
    const regions = parseDfuMemoryLayout('@OTP /0x1FFF7000/01*0001Kg');
    expect(findInternalFlash(regions)).toBeUndefined();
  });
});

describe('pagesToErase', () => {
  it('returns just the pages that cover the target range', () => {
    const regions = parseDfuMemoryLayout(
      '@Internal Flash  /0x08000000/512*0002Kg',
    );
    const pages = pagesToErase(regions, 0x08000000, 5000);
    // 5000 bytes spans pages 0, 1, and 2 (each 2 KiB).
    expect(pages).toEqual([0x08000000, 0x08000800, 0x08001000]);
  });

  it('returns one page when the range fits in a single sector', () => {
    const regions = parseDfuMemoryLayout(
      '@Internal Flash  /0x08000000/512*0002Kg',
    );
    const pages = pagesToErase(regions, 0x08000000, 100);
    expect(pages).toEqual([0x08000000]);
  });

  it('returns zero pages when the region is non-erasable', () => {
    const regions = parseDfuMemoryLayout('@OB /0x1FFF7800/01*040 e');
    const pages = pagesToErase(regions, 0x1fff7800, 16);
    expect(pages).toEqual([]);
  });

  it('handles ranges that straddle region boundaries', () => {
    const regions = parseDfuMemoryLayout(
      '@Internal Flash  /0x08000000/04*016Kg,01*064Kg',
    );
    // First region: 4 × 16 KiB pages. Second region: 1 × 64 KiB page.
    const pages = pagesToErase(regions, 0x08000000, 4 * 16 * 1024 + 1);
    expect(pages).toHaveLength(5);
    expect(pages[0]).toBe(0x08000000);
    expect(pages[4]).toBe(0x08000000 + 4 * 16 * 1024);
  });
});
