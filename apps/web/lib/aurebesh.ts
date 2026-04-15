/**
 * Aurebesh toggle management.
 *
 * Controls the Aurebesh font rendering mode across the UI.
 * Underlying text remains English for accessibility and screen readers —
 * only the visual font-face changes.
 *
 * Modes:
 *   'off'    — Standard fonts everywhere
 *   'labels' — Panel titles, nav, headers in Aurebesh; values/body in standard
 *   'full'   — Everything in Aurebesh except code, shortcuts, errors, inputs
 */

export type AurebeshMode = 'off' | 'labels' | 'full';

const STORAGE_KEY = 'bladeforge-aurebesh-mode';

/**
 * Get the saved Aurebesh mode from localStorage.
 */
export function getAurebeshMode(): AurebeshMode {
  if (typeof window === 'undefined') return 'off';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'labels' || stored === 'full') return stored;
  return 'off';
}

/**
 * Save the Aurebesh mode to localStorage.
 */
export function setAurebeshMode(mode: AurebeshMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

/**
 * Apply the Aurebesh CSS class to <html>.
 * Removes any previous Aurebesh class before applying the new one.
 */
export function applyAurebeshMode(mode: AurebeshMode): void {
  const html = document.documentElement;
  html.classList.remove('aurebesh-labels', 'aurebesh-full');
  if (mode === 'labels') {
    html.classList.add('aurebesh-labels');
  } else if (mode === 'full') {
    html.classList.add('aurebesh-full');
  }
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
