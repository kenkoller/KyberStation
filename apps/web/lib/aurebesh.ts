/**
 * Aurebesh toggle management.
 *
 * Controls the Aurebesh font rendering mode across the UI.
 * Underlying text remains English for accessibility and screen readers —
 * only the visual font-face changes.
 *
 * Modes (which UI surfaces switch to Aurebesh):
 *   'off'    — Standard fonts everywhere
 *   'labels' — Panel titles, nav, headers in Aurebesh; values/body in standard
 *   'full'   — Everything in Aurebesh except code, shortcuts, errors, inputs
 *
 * Variants (which Aurebesh font-face is used when the mode is on):
 *   'canon'        — AurebeshAF Canon (default — clean letterforms, broadest coverage)
 *   'canon-tech'   — AurebeshAF CanonTech (techy / numeric-emphasis variant)
 *   'legends'      — AurebeshAF Legends (expanded-universe letterforms)
 *   'legends-tech' — AurebeshAF Legends Tech (legends + tech)
 */

export type AurebeshMode = 'off' | 'labels' | 'full';

export type AurebeshVariant = 'canon' | 'canon-tech' | 'legends' | 'legends-tech';

const MODE_STORAGE_KEY = 'kyberstation-aurebesh-mode';
const VARIANT_STORAGE_KEY = 'kyberstation-aurebesh-variant';

/**
 * Get the saved Aurebesh mode from localStorage.
 */
export function getAurebeshMode(): AurebeshMode {
  if (typeof window === 'undefined') return 'off';
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === 'labels' || stored === 'full') return stored;
  return 'off';
}

/**
 * Save the Aurebesh mode to localStorage.
 */
export function setAurebeshMode(mode: AurebeshMode): void {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

/**
 * Get the saved Aurebesh variant from localStorage. Defaults to 'canon'.
 */
export function getAurebeshVariant(): AurebeshVariant {
  if (typeof window === 'undefined') return 'canon';
  const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
  if (stored === 'canon-tech' || stored === 'legends' || stored === 'legends-tech') return stored;
  return 'canon';
}

/**
 * Save the Aurebesh variant to localStorage.
 */
export function setAurebeshVariant(variant: AurebeshVariant): void {
  localStorage.setItem(VARIANT_STORAGE_KEY, variant);
}

/**
 * Apply the Aurebesh CSS classes to <html>. Composes:
 *   - mode class: aurebesh-labels | aurebesh-full | (none for 'off')
 *   - variant class: aurebesh-variant-canon | aurebesh-variant-canon-tech
 *                    | aurebesh-variant-legends | aurebesh-variant-legends-tech
 *
 * The variant class is always applied (even when mode is 'off') so any
 * decorative `.sw-aurebesh` element on the page picks up the user's
 * preferred variant immediately — without waiting for a mode flip.
 *
 * Removes any previous mode + variant class before applying the new one.
 */
const ALL_VARIANT_CLASSES = [
  'aurebesh-variant-canon',
  'aurebesh-variant-canon-tech',
  'aurebesh-variant-legends',
  'aurebesh-variant-legends-tech',
];

export function applyAurebeshMode(mode: AurebeshMode, variant?: AurebeshVariant): void {
  const html = document.documentElement;
  html.classList.remove('aurebesh-labels', 'aurebesh-full');
  if (mode === 'labels') {
    html.classList.add('aurebesh-labels');
  } else if (mode === 'full') {
    html.classList.add('aurebesh-full');
  }
  if (variant !== undefined) {
    applyAurebeshVariant(variant);
  }
}

export function applyAurebeshVariant(variant: AurebeshVariant): void {
  const html = document.documentElement;
  for (const cls of ALL_VARIANT_CLASSES) html.classList.remove(cls);
  html.classList.add(`aurebesh-variant-${variant}`);
}

/**
 * Aurebesh alphabet mapping (Latin → Aurebesh letter names).
 * Useful for generating decorative Aurebesh text content.
 */
export const AUREBESH_LETTERS = [
  'Aurek', 'Besh', 'Cresh', 'Dorn', 'Esk', 'Forn',
  'Grek', 'Herf', 'Isk', 'Jenth', 'Krill', 'Leth',
  'Mern', 'Nern', 'Osk', 'Peth', 'Qek', 'Resh',
  'Senth', 'Trill', 'Usk', 'Vev', 'Wesk', 'Xesh',
  'Yirt', 'Zerek',
] as const;

/**
 * Generate a random string of Aurebesh letter names for decorative use.
 */
export function generateAurebeshStream(count: number = 50): string {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(AUREBESH_LETTERS[Math.floor(Math.random() * AUREBESH_LETTERS.length)]);
  }
  return result.join(' ');
}

/**
 * Visual transliteration of Latin letters to Unicode glyphs that render
 * as alien-script stand-ins for Aurebesh. Used while no actual FT Aurebesh
 * font file is bundled in `public/fonts/` — the DataTicker calls this so
 * the ambient-chrome scroll LOOKS like Aurebesh even on fresh clones
 * where the font would silently fall back to the system monospace.
 *
 * Each character is mapped to a Unicode Canadian Syllabic that is
 * (a) renderable in every major system font, (b) geometrically close to
 * an Aurebesh letter shape (straight strokes + simple curves), and
 * (c) visually distinctive enough to NOT look like a typo. Digits,
 * punctuation, whitespace and CJK pass through unchanged so readouts
 * like `LEDS · 144` stay scannable.
 *
 * When a real `FT Aurebesh` font is bundled later, the DataTicker's
 * font-family declaration already points at it and the glyphs will
 * reshape into the authentic Aurebesh letterforms.
 */
const AUREBESH_GLYPH_MAP: Record<string, string> = {
  A: 'ᐱ', B: 'ᑊ', C: 'ᐸ', D: 'ᑭ', E: 'ᓀ', F: 'ᑐ',
  G: 'ᑦ', H: 'ᕼ', I: 'ᔨ', J: 'ᔑ', K: 'ᓱ', L: 'ᒪ',
  M: 'ᓯ', N: 'ᓗ', O: 'ᑕ', P: 'ᒃ', Q: 'ᖅ', R: 'ᕆ',
  S: 'ᐅ', T: 'ᕕ', U: 'ᓄ', V: 'ᑲ', W: 'ᐧ', X: 'ᒍ',
  Y: 'ᔨ', Z: 'ᓇ',
};

export function aurebeshTransliterate(text: string): string {
  let out = '';
  for (const ch of text) {
    const upper = ch.toUpperCase();
    out += AUREBESH_GLYPH_MAP[upper] ?? ch;
  }
  return out;
}
