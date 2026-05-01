'use client';
// ─── useGradientEditor — shared state machine for the gradient editor ─────
//
// Pure state machine + pointer/click handlers extracted from the legacy
// `GradientBuilder.tsx` and `ColorPanel.tsx`'s private `GradientRegion()`.
// Both surfaces consumed identical logic; this hook is the canonical source.
//
// Reads + writes `config.gradientStops` and `config.gradientInterpolation`
// via the global blade store. Returns everything the editor body needs
// (sorted stops, gradient CSS string, all event handlers, refs) so the
// rendered shape can be composed differently per caller (inline card vs
// CollapsibleSection-wrapped panel).

import { useState, useCallback, useRef, useEffect } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { hexToRgb, rgbToHex } from './colorUtils';
import {
  DEFAULT_GRADIENT_STOPS,
  type GradientInterpolation,
  type GradientStop,
} from './types';

export interface UseGradientEditorReturn {
  stops: GradientStop[];
  sortedStops: GradientStop[];
  interpolation: GradientInterpolation;
  selectedIndex: number | null;
  draggingIndex: number | null;
  barRef: React.RefObject<HTMLDivElement>;
  gradientCSS: string;
  setInterpolation: (value: GradientInterpolation) => void;
  handleBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleStopColorChange: (index: number, hex: string) => void;
  handleStopColorClick: (index: number, e: React.MouseEvent) => void;
  handleDeleteStop: (index: number) => void;
  handleStopPointerDown: (index: number, e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
  handlePositionInput: (index: number, value: number) => void;
}

export function useGradientEditor(): UseGradientEditorReturn {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const stops: GradientStop[] =
    (config.gradientStops as GradientStop[] | undefined) ?? DEFAULT_GRADIENT_STOPS;
  const interpolation =
    (config.gradientInterpolation as GradientInterpolation | undefined) ?? 'linear';

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  const setStops = useCallback(
    (newStops: GradientStop[]) => {
      updateConfig({ gradientStops: newStops });
    },
    [updateConfig],
  );

  const setInterpolation = useCallback(
    (value: GradientInterpolation) => {
      updateConfig({ gradientInterpolation: value });
    },
    [updateConfig],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't add stops during drag
      if (draggingIndex !== null) return;
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      // Don't add if clicking near an existing stop
      const tooClose = stops.some((s) => Math.abs(s.position - pos) < 0.03);
      if (tooClose) return;

      // Interpolate color at this position
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
          lower = sorted[i];
          upper = sorted[i + 1];
          break;
        }
      }
      const range = upper.position - lower.position;
      const t = range > 0 ? (pos - lower.position) / range : 0;
      const newColor = {
        r: Math.round(lower.color.r + (upper.color.r - lower.color.r) * t),
        g: Math.round(lower.color.g + (upper.color.g - lower.color.g) * t),
        b: Math.round(lower.color.b + (upper.color.b - lower.color.b) * t),
      };

      const newStops = [...stops, { position: pos, color: newColor }];
      setStops(newStops);
      setSelectedIndex(newStops.length - 1);
    },
    [stops, setStops, draggingIndex],
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = stops.map((s, i) => (i === index ? { ...s, color: hexToRgb(hex) } : s));
      setStops(newStops);
    },
    [stops, setStops],
  );

  const handleStopColorClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(index);
  }, []);

  const handleDeleteStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return;
      const newStops = stops.filter((_, i) => i !== index);
      setStops(newStops);
      setSelectedIndex(null);
    },
    [stops, setStops],
  );

  const handleStopPointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
    setSelectedIndex(index);
    // Defensive: synthetic test events have no real pointer; capture is a perf hint, not load-bearing.
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rounded = Math.round(pos * 1000) / 1000;
      const newStops = stops.map((s, i) =>
        i === draggingIndex ? { ...s, position: rounded } : s,
      );
      setStops(newStops);
    },
    [draggingIndex, stops, setStops],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handlePositionInput = useCallback(
    (index: number, value: number) => {
      const clamped = Math.max(0, Math.min(100, value)) / 100;
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position: Math.round(clamped * 1000) / 1000 } : s,
      );
      setStops(newStops);
    },
    [stops, setStops],
  );

  // Handle keyboard delete on the selected stop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex !== null) {
        e.preventDefault();
        handleDeleteStop(selectedIndex);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, handleDeleteStop]);

  // Build CSS gradient string from sorted stops
  const gradientCSS = sortedStops
    .map((s) => {
      const hex = rgbToHex(s.color.r, s.color.g, s.color.b);
      const pct = (s.position * 100).toFixed(0);
      return `${hex} ${pct}%`;
    })
    .join(', ');

  return {
    stops,
    sortedStops,
    interpolation,
    selectedIndex,
    draggingIndex,
    barRef,
    gradientCSS,
    setInterpolation,
    handleBarClick,
    handleStopColorChange,
    handleStopColorClick,
    handleDeleteStop,
    handleStopPointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePositionInput,
  };
}
