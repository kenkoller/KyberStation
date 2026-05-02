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
 * Bracket matching is angle-bracket-aware. The `<` / `>` count is
 * balanced before declaring the match complete. The trailing `()` is
 * consumed when present.
 */
export function extractFirstStylePtr(rawCode: string): string | null {
  const blocks = findStylePtrBlocks(rawCode);
  return blocks.length > 0 ? blocks[0].block : null;
}

/**
 * One style-ptr block found in the source, with its start index for
 * downstream metadata extraction (e.g. matching back to a `Preset {
 * "name", "font", <here>, "display" }` entry).
 */
export interface StylePtrBlock {
  /** Starting index in the original rawCode string. */
  index: number;
  /** Style-ptr template name without trailing `<` (e.g. `StylePtr`, `StyleNormalPtr`). */
  name: string;
  /** Full block including the wrapping template + trailing `()`. */
  block: string;
}

/**
 * Find every complete style-ptr block in the blob. Walks angle-bracket
 * depth, so nested templates inside the block don't terminate the walk.
 * Used by the multi-preset extractor (Sprint 5D MVP) to split a full
 * `config.h` into per-preset style snippets, each of which becomes its
 * own saved user preset in the library.
 */
export function findStylePtrBlocks(rawCode: string): StylePtrBlock[] {
  const blocks: StylePtrBlock[] = [];
  let cursor = 0;
  while (cursor < rawCode.length) {
    let earliest: { index: number; name: string } | null = null;
    for (const pattern of STYLE_PTR_PATTERNS) {
      const slice = rawCode.slice(cursor);
      const match = pattern.exec(slice);
      if (match) {
        const absoluteIndex = cursor + match.index;
        if (earliest === null || absoluteIndex < earliest.index) {
          earliest = { index: absoluteIndex, name: match[0].slice(0, -1) };
        }
      }
    }
    if (earliest === null) break;

    const startTemplate = rawCode.indexOf('<', earliest.index);
    if (startTemplate === -1) break;

    let depth = 1;
    let i = startTemplate + 1;
    while (i < rawCode.length && depth > 0) {
      const ch = rawCode[i];
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      i++;
    }
    if (depth !== 0) {
      // Unbalanced — bail past this match to avoid infinite loop.
      cursor = earliest.index + earliest.name.length + 1;
      continue;
    }

    let j = i;
    while (j < rawCode.length && /\s/.test(rawCode[j])) j++;
    if (rawCode[j] === '(') {
      let parenDepth = 1;
      j++;
      while (j < rawCode.length && parenDepth > 0) {
        if (rawCode[j] === '(') parenDepth++;
        else if (rawCode[j] === ')') parenDepth--;
        j++;
      }
    }

    blocks.push({
      index: earliest.index,
      name: earliest.name,
      block: rawCode.slice(earliest.index, j),
    });
    cursor = j;
  }
  return blocks;
}

/**
 * One preset extracted from a `Preset presets[] = { ... }` array. The
 * shape we're matching (whitespace-tolerant):
 *   { "fontName", "tracks/whatever.wav",
 *      StylePtr<...>(),
 *      "Display Label"
 *   }
 *
 * Some configs add extra fields. We grab the closest enclosing `{...}`
 * brace block surrounding each style-ptr block and pull its quoted
 * string literals: first → fontName, second → track, last → display.
 */
export interface ExtractedPreset {
  /** First quoted string in the preset entry — the font folder name. */
  fontName: string | null;
  /** Second quoted string — the sound track filename. */
  track: string | null;
  /** Last quoted string in the preset entry — the user-facing display label. */
  displayLabel: string | null;
  /** The style-ptr block extracted from this preset entry. */
  styleBlock: string;
  /** Index in the source where the style block starts (for ordering). */
  styleIndex: number;
}

/**
 * Extract every `Preset { "fontName", "track", StyleXxxPtr<...>(),
 * "Display Label" }` entry from a config.h-style blob. Each returned
 * `ExtractedPreset` has the metadata needed to seed a saved user
 * preset.
 *
 * If the blob has style-ptr blocks but NO surrounding `Preset { ... }`
 * structure, each style-ptr block becomes a preset with all metadata
 * `null`.
 */
export function extractPresets(rawCode: string): ExtractedPreset[] {
  const blocks = findStylePtrBlocks(rawCode);
  if (blocks.length === 0) return [];

  return blocks.map((styleBlock) => {
    const enclosing = findEnclosingBraceBlock(rawCode, styleBlock.index);
    if (enclosing === null) {
      return {
        fontName: null,
        track: null,
        displayLabel: null,
        styleBlock: styleBlock.block,
        styleIndex: styleBlock.index,
      };
    }
    const stringLiterals = extractStringLiterals(enclosing);
    return {
      fontName: stringLiterals[0] ?? null,
      track: stringLiterals[1] ?? null,
      displayLabel:
        stringLiterals.length >= 3
          ? stringLiterals[stringLiterals.length - 1]
          : null,
      styleBlock: styleBlock.block,
      styleIndex: styleBlock.index,
    };
  });
}

/**
 * Walk backward from a position to find the most recent `{` and forward
 * to find its matching `}`. Returns the substring inside (not including
 * the braces). Returns null if no enclosing brace pair is found within
 * 10000 chars.
 */
function findEnclosingBraceBlock(
  source: string,
  position: number,
): string | null {
  let depth = 0;
  let openBrace = -1;
  for (let i = position; i >= Math.max(0, position - 10000); i--) {
    const ch = source[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        openBrace = i;
        break;
      }
      depth--;
    }
  }
  if (openBrace === -1) return null;

  let fwdDepth = 1;
  let closeBrace = -1;
  for (let i = openBrace + 1; i < Math.min(source.length, openBrace + 10000); i++) {
    const ch = source[i];
    if (ch === '{') fwdDepth++;
    else if (ch === '}') {
      fwdDepth--;
      if (fwdDepth === 0) {
        closeBrace = i;
        break;
      }
    }
  }
  if (closeBrace === -1) return null;

  return source.slice(openBrace + 1, closeBrace);
}

/**
 * Pull every double-quoted string literal out of a snippet. Supports
 * basic backslash escaping. Returns raw contents (without quotes).
 */
function extractStringLiterals(snippet: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < snippet.length) {
    if (snippet[i] === '"') {
      let end = i + 1;
      while (end < snippet.length && snippet[end] !== '"') {
        if (snippet[end] === '\\') end += 2;
        else end++;
      }
      out.push(snippet.slice(i + 1, end));
      i = end + 1;
    } else {
      i++;
    }
  }
  return out;
}
