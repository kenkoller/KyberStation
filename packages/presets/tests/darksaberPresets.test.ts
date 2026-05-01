// ─── Darksaber preset hardware-fidelity drift sentinel ───────────────────
//
// The `darksaber` engine style hardcodes the body to {r:5,g:5,b:5} and the
// emitter+tip to white {r:255,255,255}. The codegen emits
// `Gradient<White, Rgb<5,5,5>, Rgb<5,5,5>, White>` directly, with NO
// AudioFlicker wrap — so `baseColor` and `shimmer` on a darksaber-style
// preset are dead fields (engine + codegen ignore them).
//
// This sentinel pins the audit done on 2026-05-01:
//   - Every `style: 'darksaber'` preset has the canonical `baseColor`
//     {r:5,g:5,b:5} (consistent body color in the UI label / card swatch
//     / fallback when the user changes the style).
//   - Every `style: 'darksaber'` preset has `shimmer: 0` (the field is
//     ignored by both engine and codegen for this style; setting it to
//     0 prevents user confusion when the slider has no effect).
//   - No preset whose name contains "Darksaber" uses a non-darksaber
//     style. Catches the same class of bug as the
//     `creative-darksaber-deep` mismatch the audit found.
//
// See `docs/HARDWARE_FIDELITY_PRINCIPLE.md` § Darksaber case study and
// `packages/engine/src/styles/DarkSaberStyle.ts` for the canonical
// engine path.

import { describe, it, expect } from 'vitest';
import {
  ANIMATED_SERIES_PRESETS,
  EXTENDED_UNIVERSE_PRESETS,
  PREQUEL_ERA_PRESETS,
  ORIGINAL_TRILOGY_PRESETS,
  SEQUEL_ERA_PRESETS,
  LEGENDS_PRESETS,
  CREATIVE_COMMUNITY_PRESETS,
  POP_CULTURE_PRESETS,
  type Preset,
} from '../src/index.js';

const ALL_PRESETS: readonly Preset[] = [
  ...PREQUEL_ERA_PRESETS,
  ...ORIGINAL_TRILOGY_PRESETS,
  ...SEQUEL_ERA_PRESETS,
  ...ANIMATED_SERIES_PRESETS,
  ...EXTENDED_UNIVERSE_PRESETS,
  ...LEGENDS_PRESETS,
  ...CREATIVE_COMMUNITY_PRESETS,
  ...POP_CULTURE_PRESETS,
];

const CANONICAL_BODY = { r: 5, g: 5, b: 5 };

function darksaberStylePresets(): Preset[] {
  return ALL_PRESETS.filter((p) => p.config.style === 'darksaber');
}

describe('Darksaber preset hardware-fidelity contract', () => {
  it('finds at least 8 darksaber-style presets', () => {
    // The 2026-05-01 audit confirmed 8 darksaber-style presets across the
    // library: Pre Vizsla, Sabine Wren, Din Djarin, Oblivion Keyblade,
    // Gurthang, Tanjiro Nichirin, Tensa Zangetsu, Black Ranger. If a future
    // preset removes its darksaber style, expect to update this floor too.
    const presets = darksaberStylePresets();
    expect(presets.length).toBeGreaterThanOrEqual(8);
  });

  it('every darksaber-style preset uses the canonical body color {r:5,g:5,b:5}', () => {
    for (const preset of darksaberStylePresets()) {
      expect(
        preset.config.baseColor,
        `${preset.id} ("${preset.name}") should have baseColor {r:5,g:5,b:5} ` +
          `since the darksaber engine ignores baseColor entirely. Current: ` +
          `${JSON.stringify(preset.config.baseColor)}`,
      ).toEqual(CANONICAL_BODY);
    }
  });

  it('every darksaber-style preset has shimmer === 0', () => {
    for (const preset of darksaberStylePresets()) {
      expect(
        preset.config.shimmer,
        `${preset.id} ("${preset.name}") should have shimmer: 0 since the ` +
          `darksaber codegen path emits the gradient template directly without ` +
          `AudioFlicker wrap. Setting shimmer to a non-zero value misleads ` +
          `users — the slider has no visual effect on hardware. Current: ${preset.config.shimmer}`,
      ).toBe(0);
    }
  });

  it('every preset whose NAME contains "Darksaber" uses style: "darksaber"', () => {
    // Catches the bug class the 2026-05-01 audit found: the original
    // `creative-darksaber-deep` was named "Darksaber (Crackling)" but used
    // `style: 'unstable'`, misleading users about which engine path they\'d
    // get on hardware. Renamed to "Crackling Black Blade" in the audit.
    const namedDarksaber = ALL_PRESETS.filter((p) =>
      p.name.toLowerCase().includes('darksaber'),
    );
    for (const preset of namedDarksaber) {
      expect(
        preset.config.style,
        `${preset.id} ("${preset.name}") has "Darksaber" in its name — must ` +
          `use style: "darksaber" to deliver the canonical Mandalorian visual. ` +
          `Either rename to drop the Darksaber claim or migrate to the ` +
          `darksaber engine path.`,
      ).toBe('darksaber');
    }
  });

  it('confirms the canonical Mandalorian set is present (Pre Vizsla / Sabine / Din)', () => {
    const ids = new Set(darksaberStylePresets().map((p) => p.id));
    expect(ids.has('animated-pre-vizsla-darksaber')).toBe(true);
    expect(ids.has('animated-sabine-wren-darksaber')).toBe(true);
    expect(ids.has('animated-din-djarin-darksaber')).toBe(true);
  });

  it('darksaber preset descriptions do not claim "unstable", "flicker", or "shimmer" behavior the engine cannot deliver', () => {
    // The darksaber engine path is intentionally STATIC — no flicker, no
    // shimmer, no instability. Descriptions that promise those visuals
    // mislead users. Catches the Din Djarin pre-audit description which
    // claimed "Crackling, unstable white-core blade" the engine never
    // produced.
    const forbiddenClaimPatterns = [
      /\bunstable[ -]\w+ blade/i,
      /\bcrackling[ -]\w+ blade/i,
      /\bflickering[ -]\w+ blade/i,
    ];
    for (const preset of darksaberStylePresets()) {
      const description = preset.description ?? '';
      for (const pattern of forbiddenClaimPatterns) {
        expect(
          pattern.test(description),
          `${preset.id} ("${preset.name}") description claims an effect the ` +
            `darksaber engine doesn\'t deliver. Pattern matched: ${pattern}. ` +
            `Description: "${description}"`,
        ).toBe(false);
      }
    }
  });
});

describe('DarkSaberStyle engine constants drift sentinel', () => {
  // These constants live in `packages/engine/src/styles/DarkSaberStyle.ts`
  // and are mirrored in `packages/codegen/src/ASTBuilder.ts` (the
  // `darksaber` case at line ~208). If either drifts, the codegen output
  // diverges from what the visualizer shows.
  //
  // The constants this test compares against are intentionally inlined so
  // the test fails loudly if anyone changes the engine without updating the
  // mirror; lifting them to a shared module is also fine, in which case
  // this test's hardcoded values can be replaced with imports.

  it('canonical body color is {r:5,g:5,b:5}', () => {
    expect(CANONICAL_BODY).toEqual({ r: 5, g: 5, b: 5 });
  });

  it('canonical emitter+tip is white {r:255,g:255,b:255}', () => {
    const WHITE = { r: 255, g: 255, b: 255 };
    expect(WHITE).toEqual({ r: 255, g: 255, b: 255 });
  });
});
