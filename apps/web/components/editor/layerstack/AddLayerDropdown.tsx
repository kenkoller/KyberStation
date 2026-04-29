'use client';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLayerStore, SMOOTHSWING_DEFAULTS } from '@/stores/layerStore';
import type { LayerType } from '@/stores/layerStore';
import { TYPE_BADGES } from './constants';

interface AddLayerDropdownProps {
  /** Ref to the "+ Add Layer" button — drives the dropdown's screen
   *  position so the portal-rendered menu aligns to the button edges. */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * AddLayerDropdown — portal-rendered popover with the five layer-type
 * options (Base / Effect / Accent / Mix / SmoothSwing).
 *
 * Rendered via `createPortal(document.body)` so it escapes the
 * LayerStack subpanel's `overflow: hidden` ancestor (the `rounded-panel`
 * container that gives the panel its rounded border clips any child that
 * extends past its footprint). The previous `absolute` version was
 * clipped either at the top (when opening above) or at the bottom (when
 * opening below) — Ken's 2026-04-20 walkthrough caught both.
 *
 * Closes on: option click, click-outside (anywhere except the anchor or
 * the dropdown itself), or Escape.
 */
export function AddLayerDropdown({ anchorRef, onClose }: AddLayerDropdownProps) {
  const addLayer = useLayerStore((s) => s.addLayer);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Defer portal mount to client to keep SSR output identical.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure the anchor button on mount + when the page reflows. useLayoutEffect
  // so the first paint lands with the correct position (no visible jump from
  // top=0/left=0 to the computed values).
  useLayoutEffect(() => {
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    place();
    // Reposition on resize / scroll so the dropdown tracks the anchor if
    // the user scrolls the underlying panel while the menu is open.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef]);

  // Close on click-outside (mousedown to catch it before the Add Layer
  // button's own onClick would re-toggle) or Escape.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [anchorRef, onClose]);

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
        // 2026-04-29 (Hardware Fidelity tighten): all new layers
        // default to 'normal'. The 'add' default for effect layers
        // was visualizer-only — codegen always emitted lerp regardless,
        // so users got a different look in the visualizer than on
        // hardware. See docs/HARDWARE_FIDELITY_PRINCIPLE.md.
        blendMode: 'normal',
        config: preset.config,
      });
      onClose();
    },
    [addLayer, onClose],
  );

  const options: Array<{ type: LayerType; label: string; desc: string }> = [
    { type: 'base', label: 'Add Base Layer', desc: 'Primary blade style' },
    { type: 'effect', label: 'Add Effect Layer', desc: 'Clash, blast, lockup...' },
    { type: 'accent', label: 'Add Accent Layer', desc: 'Tip/hilt accent stripe' },
    { type: 'mix', label: 'Add Mix Layer', desc: 'Blend two styles' },
    { type: 'smoothswing', label: 'Add SmoothSwing Plate', desc: 'Audio swing-pair crossfade (modulator)' },
  ];

  const dropdown = (
    <div
      ref={ref}
      role="menu"
      aria-label="Add layer"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 100,
      }}
      className="bg-bg-deep border border-border-subtle rounded-lg shadow-lg overflow-hidden max-h-[320px] overflow-y-auto"
    >
      {options.map((opt) => {
        const badge = TYPE_BADGES[opt.type];
        return (
          <button
            key={opt.type}
            role="menuitem"
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

  if (!mounted) return null;
  return createPortal(dropdown, document.body);
}
