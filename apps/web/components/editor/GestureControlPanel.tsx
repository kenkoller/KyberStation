'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

interface GestureDefine {
  id: string;
  define: string;
  label: string;
  description: string;
  category: 'ignition' | 'controls' | 'features';
}

const GESTURE_DEFINES: GestureDefine[] = [
  // Ignition gestures
  { id: 'twist-on', define: 'FETT263_TWIST_ON', label: 'Twist On', description: 'Twist hilt to ignite', category: 'ignition' },
  { id: 'twist-off', define: 'FETT263_TWIST_OFF', label: 'Twist Off', description: 'Twist hilt to retract', category: 'ignition' },
  { id: 'stab-on', define: 'FETT263_STAB_ON', label: 'Stab On', description: 'Stab forward to ignite', category: 'ignition' },
  { id: 'swing-on', define: 'FETT263_SWING_ON', label: 'Swing On', description: 'Swing to ignite', category: 'ignition' },
  { id: 'swing-on-speed', define: 'FETT263_SWING_ON_SPEED', label: 'Swing On Speed', description: 'Speed-based swing ignition threshold', category: 'ignition' },
  { id: 'thrust-on', define: 'FETT263_THRUST_ON', label: 'Thrust On', description: 'Thrust forward to ignite', category: 'ignition' },

  // Control modes
  { id: 'force-push', define: 'FETT263_FORCE_PUSH', label: 'Force Push', description: 'Force push gesture effect', category: 'controls' },
  { id: 'battle-mode', define: 'FETT263_BATTLE_MODE', label: 'Battle Mode', description: 'Auto-clash on impact detection', category: 'controls' },
  { id: 'multi-phase', define: 'FETT263_MULTI_PHASE', label: 'Multi-Phase', description: 'Cycle through blade styles', category: 'controls' },
  { id: 'save-gesture', define: 'FETT263_SAVE_GESTURE', label: 'Save Gesture', description: 'Save color changes with gesture', category: 'controls' },

  // Feature toggles
  { id: 'edit-mode', define: 'FETT263_EDIT_MODE_MENU', label: 'Edit Mode', description: 'On-saber color/parameter editing', category: 'features' },
  { id: 'quote-player', define: 'FETT263_QUOTE_PLAYER', label: 'Quote Player', description: 'Random quote playback on gesture', category: 'features' },
  { id: 'track-player', define: 'FETT263_TRACK_PLAYER', label: 'Track Player', description: 'Music/track playback control', category: 'features' },
  { id: 'dual-mode-sound', define: 'FETT263_DUAL_MODE_SOUND', label: 'Dual Mode Sound', description: 'Separate sound for common/color change', category: 'features' },
];

const CATEGORY_LABELS: Record<string, string> = {
  ignition: 'Ignition Gestures',
  controls: 'Control Modes',
  features: 'Features',
};

export function GestureControlPanel() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const activeDefines = (config.gestureDefines as string[] | undefined) ?? [];

  const toggleDefine = (define: string) => {
    const current = [...activeDefines];
    const idx = current.indexOf(define);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(define);
    }
    updateConfig({ gestureDefines: current });
  };

  const categories = ['ignition', 'controls', 'features'] as const;

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        Fett263 Gesture Controls
        <HelpTooltip text="Enable gesture-based controls for the Fett263 prop file. Selected options generate #define statements in your config.h. Requires saber_fett263_buttons.h prop file." />
      </h3>

      {categories.map((cat) => {
        const defines = GESTURE_DEFINES.filter((d) => d.category === cat);
        return (
          <div key={cat} role="group" aria-labelledby={`gesture-cat-${cat}`}>
            <h4 id={`gesture-cat-${cat}`} className="text-ui-xs text-text-muted uppercase tracking-wider mb-1.5">
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
                      className="w-3 h-3 rounded border-border-subtle accent-[var(--color-accent)]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-ui-sm font-medium ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
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

      <div className="text-ui-xs text-text-muted bg-bg-primary rounded p-2 border border-border-subtle" role="status" aria-live="polite">
        {activeDefines.length} define{activeDefines.length !== 1 ? 's' : ''} active.
        These will appear as <code className="text-accent">#define</code> statements in your config.h output.
      </div>
    </div>
  );
}
