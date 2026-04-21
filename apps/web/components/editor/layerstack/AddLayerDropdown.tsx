'use client';
import { useCallback } from 'react';
import { useLayerStore, SMOOTHSWING_DEFAULTS } from '@/stores/layerStore';
import type { LayerType } from '@/stores/layerStore';
import { TYPE_BADGES } from './constants';

export function AddLayerDropdown({ onClose }: { onClose: () => void }) {
  const addLayer = useLayerStore((s) => s.addLayer);

  const handleAdd = useCallback(
    (type: LayerType) => {
      const defaults: Record<LayerType, { name: string; config: Record<string, unknown> }> = {
        base: {
          name: 'Base Layer',
          config: { style: 'stable', color: { r: 0, g: 140, b: 255 } },
        },
        effect: {
          name: 'Effect Layer',
          config: { effectType: 'clash', color: { r: 255, g: 255, b: 255 }, size: 50 },
        },
        accent: {
          name: 'Accent Layer',
          config: { style: 'stable', color: { r: 255, g: 200, b: 0 }, position: 90, width: 10 },
        },
        mix: {
          name: 'Mix Layer',
          config: { mixRatio: 50, styleA: 'stable', styleB: 'fire' },
        },
        smoothswing: {
          name: 'SmoothSwing',
          config: { ...SMOOTHSWING_DEFAULTS },
        },
      };

      const preset = defaults[type];
      addLayer({
        type,
        name: preset.name,
        visible: true,
        opacity: 1,
        blendMode: type === 'effect' ? 'add' : 'normal',
        config: preset.config,
      });
      onClose();
    },
    [addLayer, onClose]
  );

  const options: Array<{ type: LayerType; label: string; desc: string }> = [
    { type: 'base', label: 'Add Base Layer', desc: 'Primary blade style' },
    { type: 'effect', label: 'Add Effect Layer', desc: 'Clash, blast, lockup...' },
    { type: 'accent', label: 'Add Accent Layer', desc: 'Tip/hilt accent stripe' },
    { type: 'mix', label: 'Add Mix Layer', desc: 'Blend two styles' },
    { type: 'smoothswing', label: 'Add SmoothSwing Plate', desc: 'Audio swing-pair crossfade (modulator)' },
  ];

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-deep border border-border-subtle rounded-lg shadow-lg overflow-hidden z-10">
      {options.map((opt) => {
        const badge = TYPE_BADGES[opt.type];
        return (
          <button
            key={opt.type}
            onClick={() => handleAdd(opt.type)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-ui-xs hover:bg-bg-surface transition-colors"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${badge.color}`}
              aria-label={`${opt.type} layer type`}
            />
            <div>
              <div className="text-text-primary font-medium">{opt.label}</div>
              <div className="text-ui-xs text-text-muted">{opt.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
