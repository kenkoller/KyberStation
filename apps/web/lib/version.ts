/**
 * Single source of truth for the current KyberStation release identity.
 *
 * Update these three constants at release time (same commit that bumps
 * `apps/web/package.json`'s `version` field and adds a `CHANGELOG.md`
 * entry). Any UI surface that wants to display the current version
 * should import from here — do not hardcode the string in components.
 *
 * Consumers (as of 0.11.3):
 *   - `apps/web/components/landing/LandingReleaseStrip.tsx` (landing page)
 *   - `apps/web/components/layout/WorkbenchLayout.tsx` (editor header)
 */
export const LATEST_VERSION = '0.11.3';
export const LATEST_CODENAME = 'Modular Hilt Library';
export const LATEST_DATE = '2026-04-17';
