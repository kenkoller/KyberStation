import { describe, it, expect } from 'vitest';
import { contrastRatio, deriveQrLayout } from '@/lib/crystal/qrSurface';

describe('contrastRatio', () => {
  it('computes standard WCAG contrast for black on white', () => {
    const r = contrastRatio('#000000', '#ffffff');
    expect(r.ratio).toBeCloseTo(21, 0);
    expect(r.passes).toBe(true);
  });

  it('fails when contrast is too low (navy on dim blue)', () => {
    const r = contrastRatio('#0a0a20', '#2a2a40');
    expect(r.passes).toBe(false);
  });

  it('passes the canonical QR palette (deep-space on white)', () => {
    const r = contrastRatio('#0a0a10', '#ffffff');
    expect(r.ratio).toBeGreaterThan(4.5);
    expect(r.passes).toBe(true);
  });

  it('passes inverted darksaber palette', () => {
    // Dark modules become white, light becomes near-black — still high contrast
    const r = contrastRatio('#0a0a10', '#d8dce4');
    expect(r.passes).toBe(true);
  });
});

describe('deriveQrLayout', () => {
  const meta = { topY: 0.8, bottomY: -0.8, radius: 0.4 };

  it('places the QR centred on the body height', () => {
    const l = deriveQrLayout(meta);
    expect(l.centreY).toBeCloseTo(0, 5);
  });

  it('sizes the QR to fit within the body', () => {
    const l = deriveQrLayout(meta);
    // body height = 1.6, 60% = 0.96; radius*1.5 = 0.6 — min wins
    expect(l.width).toBeLessThanOrEqual(meta.topY - meta.bottomY);
    expect(l.width).toBeLessThanOrEqual(meta.radius * 1.5);
  });

  it('z-offsets the QR outward', () => {
    const l = deriveQrLayout(meta);
    expect(l.zOffset).toBeGreaterThan(0);
    expect(l.zOffset).toBeLessThan(meta.radius * 1.05); // not past the body
  });

  it('QR is square (width === height)', () => {
    const l = deriveQrLayout(meta);
    expect(l.width).toBe(l.height);
  });
});
