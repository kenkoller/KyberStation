'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { TOPOLOGY_PRESETS, type BladeConfig } from '@kyberstation/engine';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

const BLADE_LENGTHS = [
  { label: 'Yoda (20")', inches: 20, ledCount: 73 },
  { label: 'Short (24")', inches: 24, ledCount: 88 },
  { label: 'Medium (28")', inches: 28, ledCount: 103 },
  { label: 'Standard (32")', inches: 32, ledCount: 117 },
  { label: 'Long (36")', inches: 36, ledCount: 144 },
  { label: 'Extra Long (40")', inches: 40, ledCount: 147 },
];

const STRIP_TYPES = [
  { id: 'single', label: '1 Strip', icon: '│', desc: 'Single neopixel strip' },
  { id: 'dual-neo', label: '2 Strip', icon: '║', desc: 'Dual strip, brighter' },
  { id: 'tri-neo', label: '3 Strip', icon: '┃┃┃', desc: 'Tri strip, even light' },
  { id: 'quad-neo', label: '4 Strip', icon: '╬', desc: 'Quad strip, ultra-even' },
  { id: 'penta-neo', label: '5 Strip', icon: '╬│', desc: 'Penta strip, maximum light' },
];

const TOPOLOGY_OPTIONS = [
  { id: 'single', label: 'Single Blade', icon: '╱', desc: 'Standard lightsaber' },
  { id: 'staff', label: 'Staff', icon: '╲╱', desc: 'Double-ended saber staff' },
  { id: 'crossguard', label: 'Crossguard', icon: '┼', desc: 'Main blade + quillons' },
  { id: 'triple', label: 'Triple', icon: '╲│╱', desc: 'Three blades' },
  { id: 'inquisitor', label: 'Inquisitor', icon: '◎', desc: 'Spinning double ring' },
];

export function BladeHardwarePanel() {
  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const setTopology = useBladeStore((s) => s.setTopology);

  const currentLength = config.ledCount <= 73 ? 20 : config.ledCount <= 88 ? 24 : config.ledCount <= 103 ? 28 : config.ledCount <= 117 ? 32 : config.ledCount <= 144 ? 36 : 40;

  const handleLengthChange = (inches: number) => {
    const preset = BLADE_LENGTHS.find(b => b.inches === inches);
    if (preset) {
      updateConfig({ ledCount: preset.ledCount });
    }
  };

  const handleTopologyChange = (topoId: string) => {
    const topo = TOPOLOGY_PRESETS[topoId];
    if (topo) {
      setTopology(topo);
      updateConfig({ ledCount: topo.totalLEDs });
    }
  };

  return (
    <div className="space-y-4">
      {/* Topology */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Topology
          <HelpTooltip text="Physical blade layout. Single = standard saber, Staff = double-ended, Crossguard = main blade + quillons (Kylo Ren style). Affects how many blade segments are simulated. See also: Power Draw section for battery estimates based on your topology." proffie="BladeConfig blades[]" />
        </label>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Blade topology">
          {TOPOLOGY_OPTIONS.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={topology.presetId === t.id}
              onClick={() => handleTopologyChange(t.id)}
              className={`text-left px-3 py-2 rounded text-ui-xs transition-colors border ${
                topology.presetId === t.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-ui-sm font-mono opacity-60" aria-hidden="true">{t.icon}</span>
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{t.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Blade Length */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Blade Length
          <HelpTooltip text="Physical blade length in inches. Longer blades need more LEDs. LED count auto-adjusts based on standard 3.6 LEDs/inch neopixel density. See also: Power Draw section for how LED count affects battery life." proffie="maxLedsPerStrip" />
        </label>
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
          {/* Visual length comparison */}
          <div className="space-y-1.5 mb-3" role="radiogroup" aria-label="Blade length">
            {BLADE_LENGTHS.map((b) => (
              <button
                key={b.inches}
                role="radio"
                aria-checked={currentLength === b.inches}
                aria-label={`${b.label}, ${b.ledCount} LEDs`}
                onClick={() => handleLengthChange(b.inches)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                  currentLength === b.inches
                    ? 'bg-accent-dim/40 text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-ui-sm w-20 text-left shrink-0">{b.label}</span>
                {/* Visual bar showing relative length */}
                <div className="flex-1 h-2 bg-bg-deep rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentLength === b.inches ? 'bg-accent' : 'bg-text-muted/20'
                    }`}
                    style={{ width: `${(b.inches / 40) * 100}%` }}
                  />
                </div>
                <span className="text-ui-xs text-text-muted tabular-nums w-10 text-right">
                  {b.ledCount} LED
                </span>
              </button>
            ))}
          </div>
          <div className="text-ui-xs text-text-muted text-center">
            {currentLength}" = {config.ledCount} LEDs
          </div>
        </div>
      </div>

      {/* Strip Type */}
      <div>
        <label className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Strip Configuration
          <HelpTooltip text="Number of neopixel LED strips inside the blade tube. More strips = brighter and more even illumination, but draw more power. See also: Power Draw section for current consumption estimates per strip count." proffie="WS281XBladePtr<ledCount, bladePin, Color8::GRB, PowerPINS<...>>" />
        </label>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Strip configuration">
          {STRIP_TYPES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={(config.stripType ?? 'single') === s.id}
              onClick={() => {
                const isInHilt = s.id.includes('cree');
                updateConfig({
                  stripType: s.id as BladeConfig['stripType'],
                  bladeType: isInHilt ? 'in-hilt-led' : 'neopixel',
                });
              }}
              className={`text-left px-3 py-2 rounded text-ui-xs transition-colors border ${
                (config.stripType ?? 'single') === s.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-ui-sm font-mono opacity-60" aria-hidden="true">{s.icon}</span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{s.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
