'use client';
import { useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { Fett263PropEditor } from './Fett263PropEditor';
import { ButtonRoutingSubTab } from './routing/ButtonRoutingSubTab';
import { getPropFileProfile } from '@/lib/propFileProfiles';

// ─── Prop file presets ──────────────────────────────────────────────────
//
// ProffieOS `prop` files determine the blade's button behaviour. The
// community-standard files come with their own conventions; KyberStation
// currently emits whichever is selected here into `#define PROP_FILE` in
// the generated config.h.

interface PropFileOption {
  id: string;
  label: string;
  headerName: string;
  tagline: string;
  gestureCompatible: boolean;
}

const PROP_FILES: PropFileOption[] = [
  {
    id: 'fett263',
    label: 'Fett263 Buttons',
    headerName: 'saber_fett263_buttons.h',
    tagline: 'Full gesture + edit-mode prop. 1–3 button variants.',
    gestureCompatible: true,
  },
  {
    id: 'sa22c',
    label: 'SA22C Buttons',
    headerName: 'saber_sa22c_buttons.h',
    tagline: 'Classic 2-button prop. Less gesture coverage.',
    gestureCompatible: false,
  },
  {
    id: 'bc',
    label: 'BC Buttons',
    headerName: 'saber_BC_buttons.h',
    tagline: 'Brian Conner original. Minimal, reliable.',
    gestureCompatible: false,
  },
  {
    id: 'shtok',
    label: 'Shtok Buttons',
    headerName: 'saber_shtok_buttons.h',
    tagline: 'Shtok Sabers custom prop. Russian conventions.',
    gestureCompatible: false,
  },
  {
    id: 'default',
    label: 'Default (Fredrik)',
    headerName: 'saber_fredrik_buttons.h',
    tagline: 'Stock ProffieOS default. No extras.',
    gestureCompatible: false,
  },
];

// ─── Bridge from local PROP_FILES ids to the propFileProfiles registry ─
//
// The local `PROP_FILES` table predates `apps/web/lib/propFileProfiles.ts`
// and uses short ids (`bc`, `default`) that don't match the
// registry's longer ids (`bc-button-controls`, `default-fett`). The
// Routing sub-tab consumes the registry profiles, so we map across.
// `shtok` has no registry entry yet — routing is hidden for it.
const PROFILE_ID_BY_PROP_FILE_ID: Record<string, string | undefined> = {
  fett263: 'fett263',
  sa22c: 'sa22c',
  bc: 'bc-button-controls',
  shtok: undefined,
  default: 'default-fett',
};

// ─── Gesture defines ───────────────────────────────────────────────────
//
// The comprehensive Fett263 define catalog now lives in
// `lib/fett263Defines.ts` with full dependency/conflict validation.
// The Fett263PropEditor component renders the complete ~42-define set.

// ─── Button action reference (Fett263 defaults) ─────────────────────────
//
// Displayed to users as a non-interactive table so they understand what
// each click pattern does when the blade is off vs on. This is read-only
// reference material; the gesture toggles above modify behaviour on top
// of these defaults.

interface ButtonActionRow {
  input: string;
  whenOff: string;
  whenOn: string;
}

const FETT263_BUTTON_ACTIONS: ButtonActionRow[] = [
  { input: 'Click (Power)', whenOff: 'Ignite', whenOn: 'Blast (deflect)' },
  { input: 'Double-Click', whenOff: 'Next preset', whenOn: 'Force effect' },
  { input: 'Hold + Swing', whenOff: '—', whenOn: 'Clash override' },
  { input: 'Hold (1s)', whenOff: 'Volume menu', whenOn: 'Lockup' },
  { input: 'Hold (2s+)', whenOff: 'Preset-select menu', whenOn: 'Drag (tip-down) / Melt' },
  { input: 'Twist', whenOff: 'Track/music toggle', whenOn: 'Force push (if enabled)' },
];

// ─── Component ──────────────────────────────────────────────────────────

type SubTabId = 'defines' | 'routing';

export function GestureControlPanel() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const activeDefines = (config.gestureDefines as string[] | undefined) ?? [];
  const currentPropId =
    (config.propFileId as string | undefined) ?? 'fett263';
  const currentProp =
    PROP_FILES.find((p) => p.id === currentPropId) ?? PROP_FILES[0];

  // Resolve the propFileProfiles registry entry for the active prop file.
  // Used to gate the ROUTING sub-tab + feed event rows to ButtonRoutingSubTab.
  const profileRegistryId = PROFILE_ID_BY_PROP_FILE_ID[currentProp.id];
  const profile = profileRegistryId
    ? getPropFileProfile(profileRegistryId)
    : undefined;
  const routingAvailable =
    profile !== undefined &&
    (profile.buttonEvents.length > 0 || profile.gestureEvents.length > 0);

  const [showMap, setShowMap] = useState(false);
  const [subTab, setSubTab] = useState<SubTabId>('defines');

  // If the prop file flips to one without a routing profile, snap back to DEFINES.
  if (subTab === 'routing' && !routingAvailable) {
    // Don't update state inside render — use a microtask via setTimeout(0).
    // Cheaper than a useEffect since the visible state is the next render's tab.
    queueMicrotask(() => setSubTab('defines'));
  }

  const setPropFile = (id: string) => {
    const opt = PROP_FILES.find((p) => p.id === id);
    if (!opt) return;
    updateConfig({
      propFileId: id,
      propFile: opt.headerName,
      // Fett263 gesture defines are meaningless with other prop files — clear them.
      ...(opt.gestureCompatible ? {} : { gestureDefines: [] }),
    });
  };

  return (
    <div className="space-y-3">
      {/* Prop file picker */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1 mb-1.5">
          Prop File
          <HelpTooltip
            text="Which button-behaviour prop file ProffieOS compiles into your firmware. Determines what clicks, holds, twists, and swings do. Only Fett263 exposes the gesture options below."
            proffie='#define PROP_FILE "saber_fett263_buttons.h"'
          />
        </h3>
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-1.5">
          {PROP_FILES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPropFile(p.id)}
              className={`text-left px-2 py-1.5 rounded-panel border transition-colors ${
                currentProp.id === p.id
                  ? 'bg-accent-dim border-accent text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-ui-sm font-semibold">{p.label}</span>
                {p.gestureCompatible && (
                  <span className="text-ui-xs uppercase tracking-wider font-mono px-1 py-0 rounded bg-accent/20 text-accent">
                    Gestures
                  </span>
                )}
              </div>
              <p className="text-ui-xs text-text-muted mt-0.5">{p.tagline}</p>
              <p className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
                {p.headerName}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-tab strip: DEFINES vs ROUTING ───────────────────────── */}
      <div
        role="tablist"
        aria-label="Gesture control sub-tabs"
        className="inline-flex rounded border border-border-subtle bg-bg-deep overflow-hidden"
      >
        <button
          role="tab"
          type="button"
          id="gesture-subtab-defines"
          aria-selected={subTab === 'defines'}
          aria-controls="gesture-subtab-defines-panel"
          onClick={() => setSubTab('defines')}
          className={`px-3 py-1 text-ui-sm transition-colors ${
            subTab === 'defines'
              ? 'bg-accent-dim text-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          title="Prop-file #define toggles (Fett263 catalog)"
        >
          Defines
        </button>
        <button
          role="tab"
          type="button"
          id="gesture-subtab-routing"
          aria-selected={subTab === 'routing'}
          aria-controls="gesture-subtab-routing-panel"
          onClick={() => setSubTab('routing')}
          disabled={!routingAvailable}
          className={`px-3 py-1 text-ui-sm transition-colors border-l border-border-subtle ${
            subTab === 'routing' && routingAvailable
              ? 'bg-accent-dim text-accent'
              : routingAvailable
                ? 'text-text-muted hover:text-text-secondary'
                : 'text-text-muted/40 cursor-not-allowed'
          }`}
          title={
            routingAvailable
              ? 'Wire button + gesture events to modulation bindings'
              : `${currentProp.label} doesn't expose button or gesture events for routing.`
          }
        >
          Routing
        </button>
      </div>

      {/* ── DEFINES tab panel ───────────────────────────────────────── */}
      {subTab === 'defines' && (
        <div
          role="tabpanel"
          id="gesture-subtab-defines-panel"
          aria-labelledby="gesture-subtab-defines"
          className="space-y-3"
        >
          {/* Button action reference — collapsible */}
          {currentProp.gestureCompatible && (
            <div className="border border-border-subtle rounded-panel overflow-hidden">
              <button
                onClick={() => setShowMap((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-bg-surface hover:bg-bg-card transition-colors"
              >
                <span className="text-ui-sm text-text-secondary font-medium">
                  Button Action Map ({currentProp.label} defaults)
                </span>
                <span className="text-ui-xs text-text-muted">
                  {showMap ? '▾ hide' : '▸ show'}
                </span>
              </button>
              {showMap && (
                <div className="p-2 bg-bg-deep/40">
                  <table className="w-full text-ui-xs border-collapse">
                    <thead>
                      <tr className="text-text-muted uppercase tracking-wider">
                        <th className="text-left px-2 py-1 font-semibold">Input</th>
                        <th className="text-left px-2 py-1 font-semibold">When OFF</th>
                        <th className="text-left px-2 py-1 font-semibold">When ON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FETT263_BUTTON_ACTIONS.map((row, i) => (
                        <tr
                          key={row.input}
                          className={`border-t border-border-subtle/50 ${
                            i % 2 === 1 ? 'bg-bg-surface/40' : ''
                          }`}
                        >
                          <td className="px-2 py-1 text-text-primary font-medium">
                            {row.input}
                          </td>
                          <td className="px-2 py-1 text-text-secondary">{row.whenOff}</td>
                          <td className="px-2 py-1 text-text-secondary">{row.whenOn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-text-muted/80 mt-2 px-2">
                    Reference values — your toggles below supplement these defaults. Actual
                    behaviour may vary with 1-button vs 2-button hilt configurations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fett263 prop defines — full editor with all ~42 defines */}
          {currentProp.gestureCompatible ? (
            <Fett263PropEditor
              activeDefines={activeDefines}
              onDefinesChange={(defines) => updateConfig({ gestureDefines: defines })}
            />
          ) : (
            <div className="text-ui-sm text-text-muted bg-bg-primary rounded p-3 border border-border-subtle">
              Gesture controls are Fett263-specific. Switch to{' '}
              <button
                onClick={() => setPropFile('fett263')}
                className="text-accent hover:underline"
              >
                Fett263 Buttons
              </button>{' '}
              above to unlock twist-on, stab-on, force-push, and other gesture defines.
            </div>
          )}
        </div>
      )}

      {/* ── ROUTING tab panel ───────────────────────────────────────── */}
      {subTab === 'routing' && routingAvailable && profile && (
        <div
          role="tabpanel"
          id="gesture-subtab-routing-panel"
          aria-labelledby="gesture-subtab-routing"
        >
          <ButtonRoutingSubTab profile={profile} />
        </div>
      )}
    </div>
  );
}
