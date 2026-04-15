'use client';
import { useRef, useEffect, useMemo } from 'react';
import { BladeEngine } from '@bladeforge/engine';
import type { EffectType } from '@bladeforge/engine';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { getThemeById } from '@/lib/canvasThemes';

// ─── Effect row definitions ───

interface EffectRowDef {
  type: EffectType;
  label: string;
  sustained: boolean; // lockup, drag, melt, lightning stay active
  configKey: string;  // key in BladeConfig for the effect color
  colorChannel: string; // color channel key for navigation
}

const EFFECT_ROWS: EffectRowDef[] = [
  { type: 'clash', label: 'Clash', sustained: false, configKey: 'clashColor', colorChannel: 'clashColor' },
  { type: 'blast', label: 'Blast', sustained: false, configKey: 'blastColor', colorChannel: 'blastColor' },
  { type: 'stab', label: 'Stab', sustained: false, configKey: 'clashColor', colorChannel: 'clashColor' },
  { type: 'force', label: 'Force', sustained: false, configKey: 'baseColor', colorChannel: 'baseColor' },
  { type: 'lockup', label: 'Lockup', sustained: true, configKey: 'lockupColor', colorChannel: 'lockupColor' },
  { type: 'lightning', label: 'Lightning', sustained: true, configKey: 'lightningColor', colorChannel: 'lightningColor' },
  { type: 'drag', label: 'Drag', sustained: true, configKey: 'dragColor', colorChannel: 'dragColor' },
  { type: 'melt', label: 'Melt', sustained: true, configKey: 'meltColor', colorChannel: 'meltColor' },
];

// How often to retrigger transient effects (ms)
const RETRIGGER_INTERVAL = 900;

// ─── Component ───

export function EffectComparisonPanel() {
  const config = useBladeStore((s) => s.config);
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setActiveColorChannel = useUIStore((s) => s.setActiveColorChannel);
  const theme = useMemo(() => getThemeById(canvasTheme), [canvasTheme]);

  /** Click an effect row to jump to its color settings in the Design panel */
  const handleRowClick = (row: EffectRowDef) => {
    setActiveTab('design');
    setActiveColorChannel(row.colorChannel);
  };

  // Stable refs for engines, canvases, and timing
  const enginesRef = useRef<BladeEngine[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>(new Array(EFFECT_ROWS.length).fill(null));
  const lastTriggerRef = useRef<number[]>(new Array(EFFECT_ROWS.length).fill(0));
  const configRef = useRef(config);
  configRef.current = config;

  // ─── Initialize engines on mount ───
  useEffect(() => {
    const engines: BladeEngine[] = [];
    const cfg = configRef.current;

    for (let i = 0; i < EFFECT_ROWS.length; i++) {
      const engine = new BladeEngine();
      engine.ignite();
      // Fast-forward through ignition (~2s at 60fps)
      for (let frame = 0; frame < 120; frame++) {
        engine.update(16.67, cfg);
      }
      // Now trigger the effect
      engine.triggerEffect(EFFECT_ROWS[i].type);
      engines.push(engine);
    }

    enginesRef.current = engines;
    lastTriggerRef.current = new Array(EFFECT_ROWS.length).fill(performance.now());

    return () => {
      enginesRef.current = [];
    };
  }, []);

  // ─── Animation frame: update all engines + render strips ───
  useAnimationFrame((deltaMs) => {
    const engines = enginesRef.current;
    if (engines.length === 0) return;

    const now = performance.now();
    const cfg = configRef.current;
    const ledCount = cfg.ledCount;

    for (let i = 0; i < EFFECT_ROWS.length; i++) {
      const engine = engines[i];
      const canvas = canvasRefs.current[i];
      if (!engine || !canvas) continue;

      // Update engine simulation
      engine.update(deltaMs, cfg);

      // Retrigger transient effects periodically
      const row = EFFECT_ROWS[i];
      if (!row.sustained && now - lastTriggerRef.current[i] > RETRIGGER_INTERVAL) {
        engine.triggerEffect(row.type);
        lastTriggerRef.current[i] = now;
      }

      // Render LED strip onto canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const w = canvas.width;
      const h = canvas.height;

      // Background
      ctx.fillStyle = theme.stripBg;
      ctx.fillRect(0, 0, w, h);

      // LED pixels
      const pixels = engine.getPixels();
      if (pixels.length < ledCount * 3) continue;
      const cellW = w / ledCount;

      for (let j = 0; j < ledCount; j++) {
        const r = pixels[j * 3] ?? 0;
        const g = pixels[j * 3 + 1] ?? 0;
        const b = pixels[j * 3 + 2] ?? 0;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(j * cellW, 0, Math.max(cellW, 1), h);
      }
    }
  }, { maxFps: reducedMotion ? 2 : undefined });

  // ─── Get effect color swatch from config ───
  const getEffectColor = (configKey: string): { r: number; g: number; b: number } => {
    const color = (config as Record<string, unknown>)[configKey];
    if (color && typeof color === 'object' && color !== null && 'r' in color) {
      return color as { r: number; g: number; b: number };
    }
    // Fallback: lockup for sustained, clash for transient
    return config.lockupColor ?? config.clashColor;
  };

  return (
    <div className="shrink-0 border-b border-border-subtle bg-bg-secondary/30 px-3 py-2">
      <div className="text-ui-xs text-text-muted font-medium uppercase tracking-widest mb-1.5">
        Effect Comparison
      </div>
      <div className="grid gap-0.5">
        {EFFECT_ROWS.map((row, i) => {
          const color = getEffectColor(row.configKey);
          return (
            <div
              key={row.type}
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => handleRowClick(row)}
              title={`Click to edit ${row.label} color`}
            >
              <span className="w-14 text-ui-xs text-text-secondary font-medium shrink-0 text-right group-hover:text-accent transition-colors">
                {row.label}
              </span>
              <canvas
                ref={(el) => { canvasRefs.current[i] = el; }}
                className="flex-1 h-5 rounded-sm border border-border-subtle"
                width={800}
                height={20}
              />
              <div
                className="w-3.5 h-3.5 rounded-sm border border-border-subtle shrink-0"
                style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
