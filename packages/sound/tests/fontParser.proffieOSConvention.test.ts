/**
 * Regression tests for the ProffieOS in/out naming convention.
 *
 * Background — KyberStation shipped with `in` and `out` semantically inverted
 * relative to actual ProffieOS hardware behavior. ProffieOS source
 * (`sound/hybrid_font.h`) plays:
 *
 *   - `out.wav` (or fallback `poweron.wav`) during IGNITION (saber blade
 *     goes OUT of the hilt → power-on)
 *   - `in.wav`  (followed by `pstoff.wav`)   during RETRACTION (saber blade
 *     comes IN to the hilt → power-off)
 *
 * Pre-fix, KyberStation's CATEGORY_MAP routed `playIgnition()` to category
 * 'in' and `playRetraction()` to 'out'. Verified live 2026-04-28 against
 * Kyberphonic Vader_KP_ROTJ + Anakin_KP fonts: pressing Space to ignite
 * played the descending whoosh from in1.wav (real retraction sound), and
 * pressing Space to retract played the rising-then-snap whoosh from
 * out1.wav (real ignition sound).
 *
 * These tests pin the convention at the file-name → category mapping so the
 * bug can't silently re-invert.
 */
import { describe, it, expect } from 'vitest';
import { parseFileList } from '../src/FontParser.js';

// Helper — build a File with a given name + webkitRelativePath (mirrors
// what `loadFontFromDirectoryHandle` produces in production).
function makeFile(name: string, relativePath?: string): File {
  const f = new File([new ArrayBuffer(8)], name);
  if (relativePath) {
    Object.defineProperty(f, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
    });
  }
  return f;
}

describe('ProffieOS in/out naming convention', () => {
  it('in##.wav is categorized as "in" (retraction sound)', () => {
    const files = [makeFile('in01.wav'), makeFile('in1.wav'), makeFile('in.wav')];
    const manifest = parseFileList(files);
    expect(manifest.categories.in).toBe(2); // in01, in1 — bare 'in.wav' has no digit so doesn't match /^(in\d|...)/
    // Bare 'in.wav' fails the regex; that's intentional — ProffieOS fonts
    // always use indexed names. If users hit this, it surfaces as a parse
    // warning rather than silently mis-categorizing.
    expect(manifest.warnings).toContainEqual(expect.stringContaining('in.wav'));
  });

  it('out##.wav is categorized as "out" (ignition sound)', () => {
    const files = [makeFile('out01.wav'), makeFile('out1.wav'), makeFile('out12.wav')];
    const manifest = parseFileList(files);
    expect(manifest.categories.out).toBe(3);
  });

  it('poweron.wav is categorized as "out" (ignition — ProffieOS `getOut()` fallback)', () => {
    // ProffieOS `getOut()`: `return SFX_out ? &SFX_out : &SFX_poweron;`
    const manifest = parseFileList([makeFile('poweron.wav')]);
    expect(manifest.categories.out).toBe(1);
    expect(manifest.categories.in).toBe(0);
  });

  it('poweroff.wav is categorized as "in" (retraction)', () => {
    // Symmetric counterpart to poweron — fonts that ship `poweroff.wav`
    // intend it as the retraction sound.
    const manifest = parseFileList([makeFile('poweroff.wav')]);
    expect(manifest.categories.in).toBe(1);
    expect(manifest.categories.out).toBe(0);
  });

  it('pstoff.wav is categorized as "in" (post-off follow-up to retraction)', () => {
    // ProffieOS `SFX_in.SetFollowing(... &SFX_pstoff ...)`: pstoff plays
    // immediately after `in.wav` during retraction. We treat them as the
    // same category since they belong to the same retraction event.
    const manifest = parseFileList([makeFile('pstoff.wav')]);
    expect(manifest.categories.in).toBe(1);
  });

  it('does NOT cross-categorize poweron→in or poweroff→out (the pre-fix bug)', () => {
    // Pre-fix regex was: [/^(in\d|poweron)/i, 'in'] + [/^(out\d|poweroff)/i, 'out']
    // — i.e. `poweron` paired with `in`. This test fails loudly if anyone
    // re-introduces the swap.
    const m = parseFileList([
      makeFile('poweron.wav'),
      makeFile('poweroff.wav'),
      makeFile('in1.wav'),
      makeFile('out1.wav'),
    ]);
    expect(m.categories.out).toBe(2); // poweron + out1
    expect(m.categories.in).toBe(2);  // poweroff + in1
  });

  it('directory-style font (in/in1.wav, out/out1.wav) categorizes correctly', () => {
    // Mirrors what `loadFontFromDirectoryHandle` produces for nested
    // Kyberphonic-shape fonts (Vader_KP_ROTJ/in/in1.wav etc.).
    const files = [
      makeFile('in1.wav', 'Vader_KP_ROTJ/in/in1.wav'),
      makeFile('in2.wav', 'Vader_KP_ROTJ/in/in2.wav'),
      makeFile('out1.wav', 'Vader_KP_ROTJ/out/out1.wav'),
      makeFile('out2.wav', 'Vader_KP_ROTJ/out/out2.wav'),
      makeFile('out3.wav', 'Vader_KP_ROTJ/out/out3.wav'),
    ];
    const manifest = parseFileList(files);
    expect(manifest.categories.in).toBe(2);
    expect(manifest.categories.out).toBe(3);
    // Verify the ledger: every file landed under its directory name's category.
    const inFiles = manifest.files.filter((f) => f.category === 'in').map((f) => f.name);
    const outFiles = manifest.files.filter((f) => f.category === 'out').map((f) => f.name);
    expect(inFiles).toEqual(['in1.wav', 'in2.wav']);
    expect(outFiles).toEqual(['out1.wav', 'out2.wav', 'out3.wav']);
  });
});
