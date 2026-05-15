// ─── Custom Config Splicer ───
//
// Implements the v0.18 "custom-paste passthrough" workflow: a user
// pastes their factory `config.h`, and KyberStation only replaces the
// `Preset presets[] = { ... };` array on export. Everything else
// (CONFIG_TOP defines, BladeConfig, prop includes, CONFIG_BUTTONS) is
// preserved byte-for-byte — including any vendor quirks KyberStation's
// own codegen can't yet emit (BLE defines, custom BladeID, SubBlade
// layouts, OLED screens, etc.).
//
// This is the "if we don't profile your vendor, paste your own" escape
// hatch from `docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md` §5
// v0.18.

import type { PresetEntry } from './types.js';
import { buildPresetsArray } from './ConfigBuilder.js';

/**
 * Splice a freshly-generated `Preset presets[] = { ... };` block into a
 * user-provided factory `config.h`, preserving everything else verbatim.
 *
 * Throws if:
 *   - The factory config doesn't contain a `Preset presets[] = {...}`
 *     declaration (we don't know where to splice).
 *   - The opening `{` of that array has no matching `}` (likely a
 *     truncated paste).
 *   - The closing `}` isn't followed by a `;` (malformed C++).
 *
 * Brace-matching is comment- and string-literal-aware so preset entries
 * with C++ string literals like `{ "Ahsoka;common", ... }` and
 * `/* ... *\/` block comments don't fool the depth counter.
 */
export function splicePresetsIntoConfig(
  factoryConfig: string,
  presets: PresetEntry[],
): string {
  const startMatch = factoryConfig.match(/Preset\s+presets\s*\[\s*\]\s*=\s*\{/);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(
      'Pasted config does not contain a `Preset presets[] = { ... }` array',
    );
  }
  const startIdx = startMatch.index;
  const openBraceIdx = startIdx + startMatch[0].length - 1; // index of `{`

  const closeBraceIdx = findMatchingClose(factoryConfig, openBraceIdx);
  if (closeBraceIdx === -1) {
    throw new Error(
      'Unterminated `Preset presets[]` array — no matching `}` found',
    );
  }

  // Find the trailing `;` (skipping whitespace).
  let semiIdx = closeBraceIdx + 1;
  while (semiIdx < factoryConfig.length && /\s/.test(factoryConfig[semiIdx]!)) {
    semiIdx++;
  }
  if (factoryConfig[semiIdx] !== ';') {
    throw new Error(
      'Missing `;` after `Preset presets[]` array close brace',
    );
  }

  const newBlock = buildPresetsArray(presets);
  return (
    factoryConfig.slice(0, startIdx) +
    newBlock +
    factoryConfig.slice(semiIdx + 1)
  );
}

/**
 * Validate that a pasted config looks like a real factory config.h.
 * Returns an array of human-readable errors — empty array means valid.
 *
 * Soft-fail rather than throwing so callers (UI paste forms) can show
 * multiple issues at once. Pairs with `splicePresetsIntoConfig()` —
 * `validateFactoryConfig()` runs first to populate UI feedback, then
 * `splicePresetsIntoConfig()` runs at export time to do the work.
 */
export function validateFactoryConfig(factoryConfig: string): string[] {
  const errors: string[] = [];

  if (factoryConfig.trim().length === 0) {
    errors.push('Config is empty.');
    return errors;
  }
  if (!/#ifdef\s+CONFIG_TOP\b/.test(factoryConfig)) {
    errors.push('Missing `#ifdef CONFIG_TOP` section.');
  }
  if (!/#ifdef\s+CONFIG_PRESETS\b/.test(factoryConfig)) {
    errors.push('Missing `#ifdef CONFIG_PRESETS` section.');
  }
  if (!/Preset\s+presets\s*\[\s*\]\s*=\s*\{/.test(factoryConfig)) {
    errors.push(
      'Missing `Preset presets[] = { ... }` array — KyberStation needs this to know where to splice.',
    );
  }
  if (!/BladeConfig\s+blades\s*\[\s*\]\s*=\s*\{/.test(factoryConfig)) {
    errors.push(
      'Missing `BladeConfig blades[] = { ... }` array — this is your hardware topology.',
    );
  }
  return errors;
}

// ─── Internal: comment/string-aware brace matcher ────────────────────────

type ScanState = 'code' | 'string' | 'char' | 'line-comment' | 'block-comment';

/**
 * Walk `text` from `openBraceIdx + 1` and return the index of the `}`
 * that matches the `{` at `openBraceIdx`. Returns -1 if no matching
 * close found before end of text.
 *
 * Skips over braces inside C++ string literals (`"..."`), character
 * literals (`'...'`), line comments (`// ...`), and block comments
 * (`/* ... *\/`). Handles backslash escapes inside strings.
 */
function findMatchingClose(text: string, openBraceIdx: number): number {
  let depth = 1;
  let state: ScanState = 'code';
  let i = openBraceIdx + 1;
  while (i < text.length) {
    const c = text[i]!;
    const next = i + 1 < text.length ? text[i + 1] : '';
    if (state === 'code') {
      if (c === '"') {
        state = 'string';
      } else if (c === "'") {
        state = 'char';
      } else if (c === '/' && next === '/') {
        state = 'line-comment';
        i++;
      } else if (c === '/' && next === '*') {
        state = 'block-comment';
        i++;
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) return i;
      }
    } else if (state === 'string') {
      if (c === '\\') {
        i++; // skip the escaped char
      } else if (c === '"') {
        state = 'code';
      }
    } else if (state === 'char') {
      if (c === '\\') {
        i++;
      } else if (c === "'") {
        state = 'code';
      }
    } else if (state === 'line-comment') {
      if (c === '\n') state = 'code';
    } else if (state === 'block-comment') {
      if (c === '*' && next === '/') {
        state = 'code';
        i++;
      }
    }
    i++;
  }
  return -1;
}
