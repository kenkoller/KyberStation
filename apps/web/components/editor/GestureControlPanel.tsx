'use client';
import { useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

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

// ─── Gesture defines (Fett263-specific) ─────────────────────────────────

interface GestureDefine {
  id: string;
  define: string;
  label: string;
  description: string;
  icon: string;
  category: 'ignition' | 'controls' | 'features';
}

const GESTURE_DEFINES: GestureDefine[] = [
  // Ignition gestures
  { id: 'twist-on', define: 'FETT263_TWIST_ON', label: 'Twist On', description: 'Twist hilt to ignite', icon: '↻', category: 'ignition' },
  { id: 'twist-off', define: 'FETT263_TWIST_OFF', label: 'Twist Off', description: 'Twist hilt to retract', icon: '↺', category: 'ignition' },
  { id: 'stab-on', define: 'FETT263_STAB_ON', label: 'Stab On', description: 'Stab forward to ignite', icon: '➤', category: 'ignition' },
  { id: 'swing-on', define: 'FETT263_SWING_ON', label: 'Swing On', description: 'Swing to ignite', icon: '⤴', category: 'ignition' },
  { id: 'swing-on-speed', define: 'FETT263_SWING_ON_SPEED', label: 'Swing On Speed', description: 'Speed-based swing ignition threshold', icon: '⏩', category: 'ignition' },
  { id: 'thrust-on', define: 'FETT263_THRUST_ON', label: 'Thrust On', description: 'Thrust forward to ignite', icon: '↗', category: 'ignition' },

  // Control modes
  { id: 'force-push', define: 'FETT263_FORCE_PUSH', label: 'Force Push', description: 'Force push gesture effect', icon: '✦', category: 'controls' },
  { id: 'battle-mode', define: 'FETT263_BATTLE_MODE', label: 'Battle Mode', description: 'Auto-clash on impact detection', icon: '⚔', category: 'controls' },
  { id: 'multi-phase', define: 'FETT263_MULTI_PHASE', label: 'Multi-Phase', description: 'Cycle through blade styles', icon: '◐', category: 'controls' },
  { id: 'save-gesture', define: 'FETT263_SAVE_GESTURE', label: 'Save Gesture', description: 'Save color changes with gesture', icon: '💾', category: 'controls' },

  // Feature toggles
  { id: 'edit-mode', define: 'FETT263_EDIT_MODE_MENU', label: 'Edit Mode', description: 'On-saber color/parameter editing', icon: '✎', category: 'features' },
  { id: 'quote-player', define: 'FETT263_QUOTE_PLAYER', label: 'Quote Player', description: 'Random quote playback on gesture', icon: '🎤', category: 'features' },
  { id: 'track-player', define: 'FETT263_TRACK_PLAYER', label: 'Track Player', description: 'Music/track playback control', icon: '♫', category: 'features' },
  { id: 'dual-mode-sound', define: 'FETT263_DUAL_MODE_SOUND', label: 'Dual Mode Sound', description: 'Separate sound for common/color change', icon: '◑', category: 'features' },
];

const CATEGORY_LABELS: Record<string, string> = {
  ignition: 'Ignition Gestures',
  controls: 'Control Modes',
  features: 'Features',
};

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

export function GestureControlPanel() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const activeDefines = (config.gestureDefines as string[] | undefined) ?? [];
  const currentPropId =
    (config.propFileId as string | undefined) ?? 'fett263';
  const currentProp =
    PROP_FILES.find((p) => p.id === currentPropId) ?? PROP_FILES[0];

  const [showMap, setShowMap] = useState(false);

  const toggleDefine = (define: string) => {
    const current = [...activeDefines];
    const idx = current.indexOf(define);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(define);
    updateConfig({ gestureDefines: current });
  };

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

  const categories = ['ignition', 'controls', 'features'] as const;

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

      {/* Gesture defines — only meaningful with Fett263 */}
      {currentProp.gestureCompatible ? (
        <>
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
            Fett263 Gesture Controls
            <HelpTooltip
              text="Enable gesture-based controls. Each toggle adds a #define to your config.h that changes how the blade responds to motion."
            />
          </h3>

          {categories.map((cat) => {
            const defines = GESTURE_DEFINES.filter((d) => d.category === cat);
            return (
              <div key={cat} role="group" aria-labelledby={`gesture-cat-${cat}`}>
                <h4
                  id={`gesture-cat-${cat}`}
                  className="text-ui-xs text-text-muted uppercase tracking-wider mb-1.5"
                >
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="space-y-1">
                  {defines.map((d) => {
                    const isActive = activeDefines.includes(d.define);
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-surface transition-colors cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleDefine(d.define)}
                          className="w-3 h-3 rounded border-border-subtle accent-accent"
                        />
                        <span
                          aria-hidden="true"
                          className="w-5 h-5 flex items-center justify-center shrink-0 rounded bg-bg-deep text-ui-sm"
                          style={{
                            color: isActive
                              ? 'rgb(var(--accent))'
                              : 'rgb(var(--text-muted))',
                          }}
                        >
                          {d.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-ui-sm font-medium ${
                              isActive ? 'text-accent' : 'text-text-secondary'
                            }`}
                          >
                            {d.label}
                          </span>
                          <span className="text-ui-xs text-text-muted ml-1.5 hidden group-hover:inline">
                            {d.description}
                          </span>
                        </div>
                        <code className="text-ui-xs text-text-muted font-mono hidden group-hover:block truncate max-w-[120px]">
                          {d.define}
                        </code>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div
            className="text-ui-xs text-text-muted bg-bg-primary rounded p-2 border border-border-subtle"
            role="status"
            aria-live="polite"
          >
            {activeDefines.length} define{activeDefines.length !== 1 ? 's' : ''} active.
            These appear as <code className="text-accent">#define</code> statements in
            your config.h output.
          </div>
        </>
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
  );
}
