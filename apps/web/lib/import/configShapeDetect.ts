// ─── Full-config.h shape detection + first-preset extraction ───────────
//
// Users routinely paste their entire `config.h` file into KyberStation's
// import textarea (it's what they have on disk from Fett263's generator
// or from past hand-editing). The parser tolerates the surrounding
// `#ifdef` / `#define` / `Preset presets[]` / `BladeConfig blades[]`
// gracefully and the export path preserves everything verbatim, but
// the reconstructor only finds the first style template — and when
// it can't recognize the shape (because of all the wrapping noise),
// it returns a partial reconstruction that defaults baseColor to
// pure blue. That makes the visualizer look wrong even when the
// flashable export is correct.
//
// This module:
//   1. Detects whether a pasted blob is a "full config.h" vs a
//      naked `StylePtr<...>()` snippet
//   2. Extracts the first preset's style template so the visualizer
//      gets a recognizable shape to reconstruct from
//   3. Counts how many presets are in the blob so the UI can show
//      "Detected N presets" messaging
//
// Sprint 5D will add multi-preset library entries; this module is
// the v0.18.0 minimum-viable Step 2 fix.

const STYLE_PTR_PATTERNS = [
  /\bStylePtr</,
  /\bStyleNormalPtr</,
  /\bStyleStrobePtr</,
  /\bStyleFirePtr</,
  /\bStyleRainbowPtr</,
  /\bChargingStylePtr</,
];

const MULTI_PRESET_MARKERS = [
  /#ifdef\s+CONFIG_PRESETS\b/,
  /\bPreset\s+\w+\s*\[\s*\]\s*=/,
  /\bBladeConfig\s+\w+\s*\[\s*\]\s*=/,
  /CONFIGARRAY\s*\(/,
];

export interface ConfigShape {
  /** True when the blob looks like a full config.h (has Preset[]/BladeConfig[]/ifdef wrapping). */
  isFullConfig: boolean;
  /** Count of distinct StylePtr / StyleNormalPtr / StyleStrobePtr / StyleFirePtr / StyleRainbowPtr / ChargingStylePtr blocks. */
  styleCount: number;
  /** True when the blob has C-preprocessor directives (#ifdef, #define, #include). */
  hasPreprocessor: boolean;
}

/**
 * Inspect the pasted blob to classify its shape. This is heuristic +
 * cheap (no full parse) — the goal is "does this look like a wrapped
 * config or a naked style?", not "is this valid C++?".
 */
export function detectConfigShape(rawCode: string): ConfigShape {
  const hasMultiPresetMarker = MULTI_PRESET_MARKERS.some((re) => re.test(rawCode));
  const hasPreprocessor = /^\s*#(ifdef|ifndef|if|define|include|endif|else)\b/m.test(rawCode);
  const styleCount = countStyleBlocks(rawCode);
  return {
    isFullConfig: hasMultiPresetMarker || (hasPreprocessor && styleCount > 0),
    styleCount,
    hasPreprocessor,
  };
}

/**
 * Count distinct top-level style template blocks. Each `StylePtr<...>`,
 * `StyleNormalPtr<...>`, etc. counts once. Used to surface "Detected N
 * presets" in the UI.
 */
export function countStyleBlocks(rawCode: string): number {
  let count = 0;
  for (const pattern of STYLE_PTR_PATTERNS) {
    const matches = rawCode.match(new RegExp(pattern.source, 'g'));
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Find the first complete style template block in the blob. Returns the
 * substring starting at `StylePtr` (or sister name) and continuing
 * through the matched `>` and trailing `()`. Returns null if no style
 * block is found.
 *
 * Bracket matching is angle-bracket-aware:
 *   StylePtr<Layers<Blue, ResponsiveLockupL<...>>>()
 *                  ^----- inner --------^
 *           ^---------- outer ----------^
 *
 * The `<` / `>` count is balanced before declaring the match complete.
 * The trailing `()` is consumed when present (it always is in real
 * code but we tolerate its absence for robustness).
 */
export function extractFirstStylePtr(rawCode: string): string | null {
  // Find the earliest match across all style-ptr names.
  let earliest: { index: number; name: string } | null = null;
  for (const pattern of STYLE_PTR_PATTERNS) {
    const match = pattern.exec(rawCode);
    if (match && (earliest === null || match.index < earliest.index)) {
      earliest = { index: match.index, name: match[0].slice(0, -1) };
    }
  }
  if (earliest === null) return null;

  // Walk forward from the `<` after the style-ptr name, counting
  // angle-bracket depth. End when depth returns to zero.
  const startTemplate = rawCode.indexOf('<', earliest.index);
  if (startTemplate === -1) return null;

  let depth = 1;
  let i = startTemplate + 1;
  while (i < rawCode.length && depth > 0) {
    const ch = rawCode[i];
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
    i++;
  }
  if (depth !== 0) return null; // unbalanced; let the parser produce its own warning

  // Consume optional trailing `()`. Whitespace tolerance: skip
  // newlines and spaces before checking for the parens.
  let j = i;
  while (j < rawCode.length && /\s/.test(rawCode[j])) j++;
  if (rawCode[j] === '(') {
    // Also consume the closing `)` — the call is always nullary in real configs.
    let parenDepth = 1;
    j++;
    while (j < rawCode.length && parenDepth > 0) {
      if (rawCode[j] === '(') parenDepth++;
      else if (rawCode[j] === ')') parenDepth--;
      j++;
    }
  }

  return rawCode.slice(earliest.index, j);
}
