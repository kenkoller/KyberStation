'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ScrubField } from '@/components/shared/ScrubField';

export function MotionSimPanel() {
  const motionSim = useBladeStore((s) => s.motionSim);
  const setMotionSim = useBladeStore((s) => s.setMotionSim);

  return (
    <div className="space-y-2">
      {/* Motion sliders */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Motion Parameters
          <HelpTooltip text="Simulate the Proffieboard's IMU sensor data. These sliders drive motion-reactive styles in real time. See also: Style Panel for motion-responsive styles like AudioFlicker." proffie="SwingSpeed<>, BladeAngle<>, TwistAngle<>" />
        </h3>

        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          {/* Swing Speed */}
          <div>
            <ScrubField
              id="motion-swing"
              label={<>Swing Speed <HelpTooltip text="How fast the saber is being swung. Drives AudioFlicker intensity and SmoothSwing crossfade. 0 = still, 100 = full swing." proffie="SwingSpeed<>" position="right" /></>}
              min={0} max={100}
              value={motionSim.swing}
              onChange={(v) => setMotionSim({ swing: v })}
              unit="%"
              labelClassName="w-24 flex items-center gap-1"
              readoutClassName="w-10"
            />
            <div className="flex justify-between text-ui-xs text-text-muted mt-1 ml-[108px]">
              <span>Still</span>
              <span>Full Swing</span>
            </div>
          </div>

          {/* Blade Angle */}
          <div>
            <ScrubField
              id="motion-angle"
              label={<>Blade Angle <HelpTooltip text="Tilt of the blade relative to the ground. Used by angle-responsive styles and Dual-Mode Ignition. See also: Effect Panel for angle-based ignition switching." proffie="BladeAngle<>" position="right" /></>}
              min={0} max={100}
              value={motionSim.angle}
              onChange={(v) => setMotionSim({ angle: v })}
              format={(v) => `${v - 50 > 0 ? '+' : ''}${v - 50}`}
              labelClassName="w-24 flex items-center gap-1"
              readoutClassName="w-10"
            />
            <div className="flex justify-between text-ui-xs text-text-muted mt-1 ml-[108px]">
              <span>Down</span>
              <span>Level</span>
              <span>Up</span>
            </div>
          </div>

          {/* Twist */}
          <div>
            <ScrubField
              id="motion-twist"
              label={<>Twist <HelpTooltip text="Rotational twist of the hilt. Used by twist-on ignition and twist-responsive effects. Negative = counter-clockwise, positive = clockwise." proffie="TwistAngle<>" position="right" /></>}
              min={0} max={100}
              value={motionSim.twist}
              onChange={(v) => setMotionSim({ twist: v })}
              format={(v) => `${v - 50 > 0 ? '+' : ''}${v - 50}`}
              labelClassName="w-24 flex items-center gap-1"
              readoutClassName="w-10"
            />
            <div className="flex justify-between text-ui-xs text-text-muted mt-1 ml-[108px]">
              <span>CCW</span>
              <span>Neutral</span>
              <span>CW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto modes */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Auto Modes
          <HelpTooltip text="Automated motion and combat simulation for hands-free previewing. Auto-Swing oscillates swing speed; Auto-Duel triggers random clash, blast, and lockup effects." />
        </h3>

        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-ui-xs text-text-secondary">Auto-Swing</span>
              <p className="text-ui-sm text-text-muted">
                Oscillates swing speed for demo preview
              </p>
            </div>
            <button
              onClick={() => setMotionSim({ autoSwing: !motionSim.autoSwing })}
              role="switch"
              aria-checked={motionSim.autoSwing}
              aria-label="Toggle auto-swing"
              className={`relative w-10 h-5 rounded-full transition-colors ${
                motionSim.autoSwing ? 'bg-accent' : 'bg-bg-deep border border-border-subtle'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  motionSim.autoSwing ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-ui-xs text-text-secondary">Auto-Duel</span>
              <p className="text-ui-sm text-text-muted">
                Triggers random combat effects automatically
              </p>
            </div>
            <button
              onClick={() => setMotionSim({ autoDuel: !motionSim.autoDuel })}
              role="switch"
              aria-checked={motionSim.autoDuel}
              aria-label="Toggle auto-duel"
              className={`relative w-10 h-5 rounded-full transition-colors ${
                motionSim.autoDuel ? 'bg-accent' : 'bg-bg-deep border border-border-subtle'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  motionSim.autoDuel ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* ProffieOS mapping info */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5">
          ProffieOS Mapping
        </h3>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          <div className="text-ui-xs text-text-secondary leading-relaxed">
            <p className="mb-2">
              These sliders simulate the Proffieboard IMU (accelerometer + gyroscope) sensor data
              that drives motion-reactive styles.
            </p>
          </div>

          <div className="space-y-2">
            <div className="border-b border-border-subtle pb-2">
              <div className="text-ui-sm text-accent font-medium">SwingSpeed&lt;&gt;</div>
              <div className="text-ui-sm text-text-muted">
                Maps to swing speed slider. Drives AudioFlicker, responsive effects.
                Range: 0 (still) to 32768 (max swing).
              </div>
            </div>

            <div className="border-b border-border-subtle pb-2">
              <div className="text-ui-sm text-accent font-medium">BladeAngle&lt;&gt;</div>
              <div className="text-ui-sm text-text-muted">
                Maps to blade angle slider. Used by angle-responsive styles.
                Range: 0 (down) to 32768 (up).
              </div>
            </div>

            <div className="border-b border-border-subtle pb-2">
              <div className="text-ui-sm text-accent font-medium">TwistAngle&lt;&gt;</div>
              <div className="text-ui-sm text-text-muted">
                Maps to twist slider. Used by twist-on effects.
                Range: -32768 to 32768.
              </div>
            </div>

            <div className="pb-2">
              <div className="text-ui-sm text-accent font-medium">SoundLevel&lt;&gt;</div>
              <div className="text-ui-sm text-text-muted">
                Derived from swing speed. Drives AudioFlicker and responsive hum styles.
                Range: 0 to 32768.
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-bg-deep rounded text-ui-sm text-text-muted border border-border-subtle">
            <span className="text-accent">TIP:</span> Enable Auto-Swing for a quick demo.
            Enable Auto-Duel to see clash/blast/lockup effects triggered randomly.
          </div>
        </div>
      </div>
    </div>
  );
}
