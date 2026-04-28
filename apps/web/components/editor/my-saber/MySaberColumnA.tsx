'use client';

// ─── MySaberColumnA — Sidebar A/B v2 Phase 4c ───────────────────────────
//
// Column A: list of saved Saber Profiles per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md`
// §4.7. Each row renders:
//   - A mini blade preview swatch (bottom of card)
//   - The profile name
//   - The chassis type (or "—" if blank)
//   - The LED count (from the active card config's first entry, falling
//     back to the placeholder "?" when no entries have been authored yet)
//
// Top of A: a "+ New Profile" button that creates a fresh profile with a
// reasonable default name and switches to it immediately. This mirrors
// the `+ New Saber` flow in the legacy SaberProfileManager but skips the
// inline create-form modal — for the "fast-path A column" we want a
// single click to create + select; users can rename or fill in chassis
// details from the character-sheet hero in Column B (which has the
// existing edit-notes flow).
//
// Active row: matches `activeProfileId`. Visual treatment mirrors the
// blade-style / color / ignition-retraction A/B columns:
//   `bg-accent-dim/30 border-l-2 border-accent text-accent`.
//
// Per the Phase 4c prompt: the row preview is a static colored swatch,
// NOT a live <MiniSaber>. Mounting one BladeEngine per row would add
// real CPU cost on every profile list render; the swatch reads as
// "blade with this color" and is essentially free. If a future polish
// pass wants live previews here, swapping the swatch for <MiniSaber
// animated={false}> on hover is the natural extension point.

import { useMemo } from 'react';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import type { SaberProfile } from '@/stores/saberProfileStore';
import { playUISound } from '@/lib/uiSounds';

/** Compact summary of the data Column A needs to render one row. */
interface ProfileRow {
  id: string;
  name: string;
  chassisType: string;
  boardType: string;
  ledCount: number | null;
  bladeColorCss: string;
}

function summariseProfile(profile: SaberProfile): ProfileRow {
  // The "representative" config — the active card config's first entry,
  // or the first card config's first entry, or none. This matches the
  // logic SaberProfileManager uses for its hero blade preview.
  const activeCardConfig =
    profile.cardConfigs.find((c) => c.id === profile.activeCardConfigId) ??
    profile.cardConfigs[0];
  const firstEntry = activeCardConfig?.entries[0];
  const config = firstEntry?.config ?? null;

  const ledCount = config?.ledCount ?? null;
  const baseColor = config?.baseColor ?? null;

  // When a profile has no presets yet, fall back to a neutral chrome
  // tone so the swatch still reads as a "blade slot" without claiming
  // a color the user didn't pick.
  const bladeColorCss = baseColor
    ? `rgb(${baseColor.r | 0}, ${baseColor.g | 0}, ${baseColor.b | 0})`
    : 'rgb(120, 130, 145)';

  return {
    id: profile.id,
    name: profile.name,
    chassisType: profile.chassisType || '—',
    boardType: profile.boardType,
    ledCount,
    bladeColorCss,
  };
}

/**
 * Mini blade swatch — a static vertical capsule colored with the profile's
 * representative `baseColor`. Sized to match the existing 40×40 thumbnail
 * well used by BladeStyleColumnA so visual rhythm stays consistent.
 *
 * Hidden from the a11y tree (presentational); the row's visible name +
 * chassis carry semantic identity.
 */
function BladeSwatch({ colorCss }: { colorCss: string }): JSX.Element {
  return (
    <div
      className="shrink-0 bg-bg-deep rounded-chrome overflow-hidden border border-border-subtle relative flex items-end justify-center"
      style={{ width: 40, height: 40 }}
      aria-hidden="true"
    >
      <div
        style={{
          width: 6,
          height: 32,
          background: colorCss,
          borderRadius: 3,
          boxShadow: `0 0 6px ${colorCss}, 0 0 12px ${colorCss}`,
          marginBottom: 2,
        }}
      />
    </div>
  );
}

export function MySaberColumnA(): JSX.Element {
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const switchProfile = useSaberProfileStore((s) => s.switchProfile);
  const createProfile = useSaberProfileStore((s) => s.createProfile);

  const rows = useMemo(() => profiles.map(summariseProfile), [profiles]);

  const handleSelect = (id: string): void => {
    if (id === activeProfileId) return;
    playUISound('preset-loaded');
    switchProfile(id);
  };

  const handleCreate = (): void => {
    // Auto-name the profile so users can click-create-edit without a
    // create-form modal. They can rename via the edit-notes flow in
    // Column B once they're in the character sheet.
    const nextNumber = profiles.length + 1;
    const name = `My Saber ${nextNumber}`;
    const created = createProfile(name);
    playUISound('success');
    // createProfile both inserts AND auto-switches if it's the first
    // profile, but we explicitly switch here so subsequent creates
    // always select the freshly-created profile.
    if (created && created.id !== activeProfileId) {
      switchProfile(created.id);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="my-saber-column-a">
      {/* Sticky header — "+ New Profile" affordance at the top of A. */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <button
          type="button"
          onClick={handleCreate}
          className="w-full px-2 py-1.5 rounded-chrome text-ui-sm font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors"
        >
          + New Profile
        </button>
      </div>

      {/* Scrollable list body */}
      {rows.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 text-ui-xs text-text-muted italic text-center">
          No saber profiles yet. Click <span className="font-mono">+ New Profile</span>
          {' '}above to create your first one.
        </div>
      ) : (
        <ul
          role="listbox"
          aria-label="Saber profile"
          aria-activedescendant={
            activeProfileId ? `my-saber-row-${activeProfileId}` : undefined
          }
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {rows.map((row) => {
            const isActive = row.id === activeProfileId;
            return (
              <li
                key={row.id}
                id={`my-saber-row-${row.id}`}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => handleSelect(row.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(row.id);
                  }
                }}
                className={[
                  'flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                  'focus-visible:bg-bg-surface/80',
                  isActive
                    ? 'bg-accent-dim/30 border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
                ].join(' ')}
              >
                <BladeSwatch colorCss={row.bladeColorCss} />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div
                    className={[
                      'text-ui-sm font-medium truncate',
                      isActive ? 'text-accent' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {row.name}
                  </div>
                  <div className="text-ui-xs text-text-muted truncate">
                    {row.chassisType}
                  </div>
                  <div className="text-ui-xs text-text-muted font-mono tabular-nums truncate">
                    {row.ledCount != null ? `${row.ledCount} LEDs` : 'No presets yet'}
                    {' · '}
                    {row.boardType}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
