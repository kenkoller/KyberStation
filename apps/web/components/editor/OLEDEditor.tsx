'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeBMP, decodeBMP } from '@kyberstation/engine';
import type { OLEDResolution } from '@kyberstation/engine';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ErrorState } from '@/components/shared/ErrorState';

type Tool = 'pencil' | 'eraser' | 'line' | 'rect' | 'fill';

const SCALE = 4;

// These are NOT UI theme colours — they simulate real monochrome OLED
// hardware. A typical SSD1306 white-pixel emitter is slightly blue-tinted
// (~#e0e8ff matches real-world photos), the off state is near-black with
// a faint red residue, and the grid is a debug overlay that should read
// as "barely there" on any theme. Keeping them hardcoded on purpose so
// the OLED preview always looks like actual hardware regardless of the
// surrounding app theme.
const PIXEL_ON = '#e0e8ff';
const PIXEL_OFF = '#0a0a0a';
const GRID_COLOR = '#1a1a2a';

interface OLEDFrame {
  id: string;
  name: string;
  pixels: boolean[][];
  durationMs: number;
}

function createEmptyPixels(w: number, h: number): boolean[][] {
  return Array.from({ length: h }, () => new Array(w).fill(false) as boolean[]);
}

function clonePixels(pixels: boolean[][]): boolean[][] {
  return pixels.map((row) => [...row]);
}

function floodFill(pixels: boolean[][], x: number, y: number, fillValue: boolean): void {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const target = pixels[y][x];
  if (target === fillValue) return;

  const stack: Array<[number, number]> = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    if (pixels[cy][cx] !== target) continue;
    pixels[cy][cx] = fillValue;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

export function OLEDEditor() {
  const [resolution, setResolution] = useState<OLEDResolution>('128x32');
  const dims = resolution === '128x64' ? { w: 128, h: 64 } : { w: 128, h: 32 };

  const [frames, setFrames] = useState<OLEDFrame[]>([
    { id: '1', name: 'Frame 1', pixels: createEmptyPixels(dims.w, dims.h), durationMs: 100 },
  ]);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawValue, setDrawValue] = useState(true);
  const [undoStack, setUndoStack] = useState<boolean[][][]>([]);
  const [playback, setPlayback] = useState(false);
  const playbackRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const activeFrame = frames[activeFrameIdx];
  const pixels = activeFrame?.pixels ?? createEmptyPixels(dims.w, dims.h);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = PIXEL_OFF;
    ctx.fillRect(0, 0, dims.w * SCALE, dims.h * SCALE);

    // Grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= dims.w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * SCALE, 0);
      ctx.lineTo(x * SCALE, dims.h * SCALE);
      ctx.stroke();
    }
    for (let y = 0; y <= dims.h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * SCALE);
      ctx.lineTo(dims.w * SCALE, y * SCALE);
      ctx.stroke();
    }

    // Pixels
    for (let y = 0; y < dims.h; y++) {
      for (let x = 0; x < dims.w; x++) {
        if (pixels[y]?.[x]) {
          ctx.fillStyle = PIXEL_ON;
          ctx.fillRect(x * SCALE + 0.5, y * SCALE + 0.5, SCALE - 1, SCALE - 1);
        }
      }
    }
  }, [pixels, dims]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor(((e.clientX - rect.left) * scaleX) / SCALE),
      y: Math.floor(((e.clientY - rect.top) * scaleY) / SCALE),
    };
  };

  const pushUndo = () => {
    setUndoStack((prev) => [...prev.slice(-19), clonePixels(pixels)]);
  };

  const setPixel = (x: number, y: number, value: boolean) => {
    if (x < 0 || x >= dims.w || y < 0 || y >= dims.h) return;
    const newFrames = [...frames];
    newFrames[activeFrameIdx] = {
      ...newFrames[activeFrameIdx],
      pixels: newFrames[activeFrameIdx].pixels.map((row, ry) =>
        ry === y ? row.map((p, rx) => (rx === x ? value : p)) : row,
      ),
    };
    setFrames(newFrames);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPixelCoords(e);
    pushUndo();

    if (tool === 'fill') {
      const newPixels = clonePixels(pixels);
      floodFill(newPixels, x, y, !pixels[y]?.[x]);
      const newFrames = [...frames];
      newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], pixels: newPixels };
      setFrames(newFrames);
      return;
    }

    if (tool === 'line' || tool === 'rect') {
      lineStartRef.current = { x, y };
      setIsDrawing(true);
      return;
    }

    const value = tool === 'eraser' ? false : !pixels[y]?.[x];
    setDrawValue(value);
    setPixel(x, y, value);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (tool === 'line' || tool === 'rect') return;
    const { x, y } = getPixelCoords(e);
    setPixel(x, y, drawValue);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === 'line' || tool === 'rect') && lineStartRef.current) {
      const { x: x2, y: y2 } = getPixelCoords(e);
      const { x: x1, y: y1 } = lineStartRef.current;
      const newPixels = clonePixels(pixels);

      if (tool === 'line') {
        drawLine(newPixels, x1, y1, x2, y2);
      } else {
        drawRectOutline(newPixels, x1, y1, x2, y2);
      }

      const newFrames = [...frames];
      newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], pixels: newPixels };
      setFrames(newFrames);
      lineStartRef.current = null;
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    const newFrames = [...frames];
    newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], pixels: prev };
    setFrames(newFrames);
  };

  const handleClear = () => {
    pushUndo();
    const newFrames = [...frames];
    newFrames[activeFrameIdx] = {
      ...newFrames[activeFrameIdx],
      pixels: createEmptyPixels(dims.w, dims.h),
    };
    setFrames(newFrames);
  };

  const handleInvert = () => {
    pushUndo();
    const newPixels = pixels.map((row) => row.map((p) => !p));
    const newFrames = [...frames];
    newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], pixels: newPixels };
    setFrames(newFrames);
  };

  // Frame management
  const addFrame = () => {
    const newFrame: OLEDFrame = {
      id: String(Date.now()),
      name: `Frame ${frames.length + 1}`,
      pixels: createEmptyPixels(dims.w, dims.h),
      durationMs: 100,
    };
    setFrames([...frames, newFrame]);
    setActiveFrameIdx(frames.length);
  };

  const duplicateFrame = () => {
    const dup: OLEDFrame = {
      ...activeFrame,
      id: String(Date.now()),
      name: `${activeFrame.name} copy`,
      pixels: clonePixels(activeFrame.pixels),
    };
    const newFrames = [...frames];
    newFrames.splice(activeFrameIdx + 1, 0, dup);
    setFrames(newFrames);
    setActiveFrameIdx(activeFrameIdx + 1);
  };

  const removeFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== activeFrameIdx);
    setFrames(newFrames);
    setActiveFrameIdx(Math.min(activeFrameIdx, newFrames.length - 1));
  };

  const setFrameDuration = (ms: number) => {
    const newFrames = [...frames];
    newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], durationMs: ms };
    setFrames(newFrames);
  };

  // Playback
  useEffect(() => {
    if (!playback || frames.length <= 1) return;
    let idx = activeFrameIdx;
    const tick = () => {
      idx = (idx + 1) % frames.length;
      setActiveFrameIdx(idx);
      playbackRef.current = window.setTimeout(tick, frames[idx].durationMs);
    };
    playbackRef.current = window.setTimeout(tick, frames[idx].durationMs);
    return () => clearTimeout(playbackRef.current);
  }, [playback, frames.length]);

  // BMP Export
  const handleExportBMP = () => {
    const data = encodeBMP(pixels, dims.w, dims.h);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'image/bmp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFrame.name.replace(/\s+/g, '_')}.bmp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BMP Import
  const handleImportBMP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const arrayBuf = await file.arrayBuffer();
      const result = decodeBMP(new Uint8Array(arrayBuf));
      pushUndo();
      const newFrames = [...frames];
      newFrames[activeFrameIdx] = { ...newFrames[activeFrameIdx], pixels: result.pixels };
      setFrames(newFrames);
      if (result.height === 64 && resolution !== '128x64') {
        setResolution('128x64');
      } else if (result.height === 32 && resolution !== '128x32') {
        setResolution('128x32');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import BMP');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export all frames as ProffieOS-named BMPs
  const handleExportAll = () => {
    const PROFFIE_NAMES = ['boot', 'on', 'off', 'font1', 'font2', 'font3', 'font4', 'font5'];
    frames.forEach((frame, i) => {
      const data = encodeBMP(frame.pixels, dims.w, dims.h);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'image/bmp' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${PROFFIE_NAMES[i] ?? `frame${i}`}.bmp`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Resolution change
  const handleResolutionChange = (res: OLEDResolution) => {
    const newDims = res === '128x64' ? { w: 128, h: 64 } : { w: 128, h: 32 };
    setResolution(res);
    setFrames(
      frames.map((f) => ({
        ...f,
        pixels: createEmptyPixels(newDims.w, newDims.h),
      })),
    );
    setUndoStack([]);
  };

  const TOOLS: Array<{ id: Tool; label: string; icon: string }> = [
    { id: 'pencil', label: 'Pencil', icon: '✏' },
    { id: 'eraser', label: 'Eraser', icon: '◻' },
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'rect', label: 'Rectangle', icon: '▭' },
    { id: 'fill', label: 'Fill', icon: '◧' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        OLED Frame Editor
        <HelpTooltip text="Draw custom OLED screens pixel-by-pixel. Export as 1-bit BMP files for ProffieOS. Create animation sequences with multiple frames." />
      </h3>

      {/* Resolution + Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={resolution}
          onChange={(e) => handleResolutionChange(e.target.value as OLEDResolution)}
          aria-label="OLED resolution"
          className="bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-sm text-text-secondary"
        >
          <option value="128x32">128x32</option>
          <option value="128x64">128x64</option>
        </select>

        <div className="flex gap-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              aria-label={t.label}
              className={`w-6 h-6 rounded text-ui-xs flex items-center justify-center transition-colors ${
                tool === t.id
                  ? 'bg-accent-dim border-accent-border text-accent border'
                  : 'bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <button onClick={handleUndo} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary" title="Undo">
          Undo
        </button>
        <button onClick={handleClear} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary" title="Clear">
          Clear
        </button>
        <button onClick={handleInvert} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary" title="Invert">
          Invert
        </button>
      </div>

      {/* Canvas */}
      <div className="overflow-x-auto bg-black rounded border border-border-subtle p-1">
        <canvas
          ref={canvasRef}
          width={dims.w * SCALE}
          height={dims.h * SCALE}
          style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />
      </div>

      {/* Frame strip */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-ui-xs text-text-muted uppercase">Frames</span>
          <button onClick={addFrame} aria-label="Add frame" className="px-1.5 py-0.5 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary">+</button>
          <button onClick={duplicateFrame} aria-label="Duplicate frame" className="px-1.5 py-0.5 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary">Dup</button>
          {frames.length > 1 && (
            <button onClick={removeFrame} aria-label="Delete frame" className="px-1.5 py-0.5 rounded text-ui-xs bg-bg-surface border border-border-subtle text-red-400 hover:text-red-300">Del</button>
          )}
          <div className="flex-1" />
          {frames.length > 1 && (
            <button
              onClick={() => setPlayback(!playback)}
              className={`px-2 py-0.5 rounded text-ui-xs border transition-colors ${
                playback ? 'bg-accent-dim border-accent-border text-accent' : 'bg-bg-surface border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {playback ? 'Stop' : 'Play'}
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {frames.map((f, i) => (
            <button
              key={f.id}
              onClick={() => { setPlayback(false); setActiveFrameIdx(i); }}
              className={`shrink-0 px-2 py-1 rounded text-ui-xs border transition-colors ${
                i === activeFrameIdx
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
        {activeFrame && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-ui-xs text-text-muted">Duration:</span>
            <input
              type="range"
              min={16}
              max={1000}
              step={16}
              value={activeFrame.durationMs}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-ui-xs text-text-muted font-mono w-12 text-right">{activeFrame.durationMs}ms</span>
          </div>
        )}
      </div>

      {/* Import / Export */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={handleExportBMP} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary">
          Export BMP
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary">
          Import BMP
        </button>
        {frames.length > 1 && (
          <button onClick={handleExportAll} className="px-2 py-1 rounded text-ui-xs bg-bg-surface border border-border-subtle text-text-muted hover:text-text-primary">
            Export All (ProffieOS)
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".bmp" onChange={handleImportBMP} className="hidden" />
      </div>

      {importError && (
        <ErrorState
          variant="import-failed"
          message={importError}
          onRetry={() => {
            setImportError(null);
            fileInputRef.current?.click();
          }}
          compact
        />
      )}

      <p className="text-ui-xs text-text-muted">
        {frames.length} frame{frames.length !== 1 ? 's' : ''}. Export creates 1-bit monochrome BMP files compatible with ProffieOS OLED displays.
      </p>
    </div>
  );
}

// ─── Drawing Helpers ───

function drawLine(pixels: boolean[][], x0: number, y0: number, x1: number, y1: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;

  while (true) {
    if (cy >= 0 && cy < pixels.length && cx >= 0 && cx < (pixels[0]?.length ?? 0)) {
      pixels[cy][cx] = true;
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

function drawRectOutline(pixels: boolean[][], x0: number, y0: number, x1: number, y1: number): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;

  for (let x = minX; x <= maxX; x++) {
    if (x >= 0 && x < w) {
      if (minY >= 0 && minY < h) pixels[minY][x] = true;
      if (maxY >= 0 && maxY < h) pixels[maxY][x] = true;
    }
  }
  for (let y = minY; y <= maxY; y++) {
    if (y >= 0 && y < h) {
      if (minX >= 0 && minX < w) pixels[y][minX] = true;
      if (maxX >= 0 && maxX < w) pixels[y][maxX] = true;
    }
  }
}
