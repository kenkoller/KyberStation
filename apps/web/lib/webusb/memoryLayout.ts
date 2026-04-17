import type { DfuMemoryRegion } from './types';

/**
 * Parse a DfuSe interface alternate's name string into a memory layout.
 *
 * The format is defined in ST AN3156 §4.2. Example strings on a Proffieboard
 * V3 (STM32L452RE):
 *
 *   "@Internal Flash  /0x08000000/512*0002Kg"
 *   "@Option Bytes  /0x1FFF7800/01*040 e"
 *   "@OTP Memory /0x1FFF7000/01*0001Kg"
 *   "@Device Feature/0xFFFF0000/01*004 e"
 *
 * After the first slash-delimited block comes the start address, then
 * any number of `N*sizeU` segments separated by commas.
 *   N      — sector count (decimal)
 *   size   — sector size (decimal)
 *   U      — size unit ( ' ' = bytes, 'K' = KiB, 'M' = MiB )
 *   flags  — trailing chars: 'a'=readable, 'b'=erasable, 'c'=readable+erasable,
 *            'd'=writable, 'e'=readable+writable, 'f'=erasable+writable,
 *            'g'=readable+erasable+writable
 */
export function parseDfuMemoryLayout(name: string): DfuMemoryRegion[] {
  const parts = name.split('/');
  if (parts.length < 3) return [];

  const startAddress = parseInt(parts[1], 16);
  if (!Number.isFinite(startAddress)) return [];

  const segments = parts[2].split(',');
  const regions: DfuMemoryRegion[] = [];
  let cursor = startAddress;

  for (const segment of segments) {
    const match = segment.match(/^(\d+)\*(\d+)([\sKMG])([a-g])/);
    if (!match) continue;

    const count = parseInt(match[1], 10);
    const rawSize = parseInt(match[2], 10);
    const unit = match[3];
    const flagChar = match[4];

    let sectorSize = rawSize;
    if (unit === 'K') sectorSize = rawSize * 1024;
    else if (unit === 'M') sectorSize = rawSize * 1024 * 1024;
    else if (unit === 'G') sectorSize = rawSize * 1024 * 1024 * 1024;

    const readable = 'aceg'.includes(flagChar);
    const erasable = 'bcfg'.includes(flagChar);
    const writable = 'defg'.includes(flagChar);

    regions.push({
      startAddress: cursor,
      sectorCount: count,
      sectorSize,
      readable,
      erasable,
      writable,
    });

    cursor += count * sectorSize;
  }

  return regions;
}

/**
 * Find the internal-flash region for an alternate's memory layout. Used
 * when deciding where to write firmware (STM32L4 flash starts at 0x08000000).
 */
export function findInternalFlash(
  regions: DfuMemoryRegion[],
): DfuMemoryRegion | undefined {
  return regions.find(
    (r) =>
      r.startAddress >= 0x08000000 &&
      r.startAddress < 0x08100000 &&
      r.writable &&
      r.erasable,
  );
}

/**
 * Given a writable layout and a target address + length, list the page
 * start-addresses that must be erased to cover the range. Pages are aligned
 * to each region's sectorSize.
 */
export function pagesToErase(
  regions: DfuMemoryRegion[],
  startAddress: number,
  byteLength: number,
): number[] {
  const pages: number[] = [];
  const endAddress = startAddress + byteLength;

  for (const region of regions) {
    if (!region.erasable) continue;
    const regionEnd = region.startAddress + region.sectorCount * region.sectorSize;
    if (region.startAddress >= endAddress || regionEnd <= startAddress) continue;

    const overlapStart = Math.max(region.startAddress, startAddress);
    const overlapEnd = Math.min(regionEnd, endAddress);

    const firstSector = Math.floor(
      (overlapStart - region.startAddress) / region.sectorSize,
    );
    const lastSector = Math.ceil(
      (overlapEnd - region.startAddress) / region.sectorSize,
    );

    for (let i = firstSector; i < lastSector; i++) {
      pages.push(region.startAddress + i * region.sectorSize);
    }
  }

  return pages;
}
