'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EffectType = 'ignition' | 'clash' | 'lockup' | 'blast' | 'drag' | 'force';

interface TimelineMarker {
  id: string;
  type: EffectType;
  /** Start time in seconds */
  time: number;
  /** Optional end time for range-based effects (lockup, ignition) */
  endTime?: number;
}

const EFFECT_COLORS: Record<EffectType, string> = {
  ignition: '#22d3ee',   // cyan
  clash:    '#f59e0b',   // amber
  lockup:   '#ef4444',   // red
  blast:    '#a855f7',   // purple
  drag:     '#f97316',   // orange
  force:    '#3b82f6',   // blue
};

const EFFECT_LABELS: Record<EffectType, string> = {
  ignition: 'Ignition',
  clash:    'Clash',
  lockup:   'Lockup',
  blast:    'Blast',
  drag:     'Drag',
  force:    'Force',
};

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

const RANGE_EFFECTS: EffectType[] = ['ignition', 'lockup'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _idCounter = 0;
function uid(): string {
  return `tm_${Date.now()}_${++_idCounter}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelinePanel() {
  /* ----- state ----- */
  const [markers, setMarkers] = useState<TimelineMarker[]>([
    { id: uid(), type: 'ignition', time: 0.0, endTime: 0.4 },
  ]);
  const [duration, setDuration] = useState(10); // total seconds
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [zoom, setZoom] = useState(1); // 1 = fit all, higher = zoomed in
  const [scrollOffset, setScrollOffset] = useState(0); // in seconds
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; time: number } | null>(null);
  const [dragging, setDragging] = useState<{
    markerId: string;
    handle: 'start' | 'end';
    startX: number;
    startTime: number;
  } | null>(null);

  /* ----- refs ----- */
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const prevTs = useRef<number | null>(null);

  /* ----- derived ----- */
  const visibleDuration = duration / zoom;
  const visibleStart = scrollOffset;
  const visibleEnd = scrollOffset + visibleDuration;

  /* ----- pixel <-> time helpers ----- */
  const timeToPercent = useCallback(
    (t: number) => ((t - visibleStart) / visibleDuration) * 100,
    [visibleStart, visibleDuration],
  );

  const pxToTime = useCallback(
    (px: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((px - rect.left) / rect.width, 0, 1);
      return visibleStart + ratio * visibleDuration;
    },
    [visibleStart, visibleDuration],
  );

  /* ----- playback ----- */
  const tick = useCallback(
    (ts: number) => {
      if (prevTs.current !== null) {
        const dt = ((ts - prevTs.current) / 1000) * speed;
        setCurrentTime((prev) => {
          let next = prev + dt;
          if (next >= duration) {
            if (loop) {
              next = next % duration;
            } else {
              next = duration;
              setPlaying(false);
            }
          }
          return next;
        });
      }
      prevTs.current = ts;
      animRef.current = requestAnimationFrame(tick);
    },
    [duration, loop, speed],
  );

  useEffect(() => {
    if (playing) {
      prevTs.current = null;
      animRef.current = requestAnimationFrame(tick);
    } else if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [playing, tick]);

  /* ----- scrub ----- */
  const handleScrub = useCallback(
    (e: React.MouseEvent) => {
      const t = pxToTime(e.clientX);
      setCurrentTime(clamp(t, 0, duration));
    },
    [pxToTime, duration],
  );

  const handleScrubDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      handleScrub(e);
    },
    [handleScrub],
  );

  /* ----- zoom via wheel ----- */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = clamp(zoom * factor, 1, 50);

      // Zoom towards cursor position
      const cursorTime = pxToTime(e.clientX);
      const newVisDur = duration / newZoom;
      const newOffset = clamp(cursorTime - (cursorTime - scrollOffset) * (newVisDur / visibleDuration), 0, duration - newVisDur);

      setZoom(newZoom);
      setScrollOffset(newOffset);
    },
    [zoom, duration, pxToTime, scrollOffset, visibleDuration],
  );

  /* ----- add effect ----- */
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't open add menu if we clicked a marker
      if ((e.target as HTMLElement).closest('[data-marker]')) return;
      const t = pxToTime(e.clientX);
      setAddMenuPos({ x: e.clientX, time: t });
      setSelectedMarker(null);
    },
    [pxToTime],
  );

  const addMarker = useCallback(
    (type: EffectType) => {
      if (!addMenuPos) return;
      const isRange = RANGE_EFFECTS.includes(type);
      const marker: TimelineMarker = {
        id: uid(),
        type,
        time: Math.round(addMenuPos.time * 1000) / 1000,
        ...(isRange ? { endTime: Math.round((addMenuPos.time + 0.5) * 1000) / 1000 } : {}),
      };
      setMarkers((prev) => [...prev, marker]);
      setAddMenuPos(null);
      setSelectedMarker(marker.id);
    },
    [addMenuPos],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedMarker) return;
    setMarkers((prev) => prev.filter((m) => m.id !== selectedMarker));
    setSelectedMarker(null);
  }, [selectedMarker]);

  /* ----- drag markers ----- */
  const startDrag = useCallback(
    (e: React.MouseEvent, markerId: string, handle: 'start' | 'end') => {
      e.stopPropagation();
      const marker = markers.find((m) => m.id === markerId);
      if (!marker) return;
      setSelectedMarker(markerId);
      setDragging({
        markerId,
        handle,
        startX: e.clientX,
        startTime: handle === 'end' ? (marker.endTime ?? marker.time) : marker.time,
      });
    },
    [markers],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const dx = e.clientX - dragging.startX;
      const dtSeconds = (dx / rect.width) * visibleDuration;
      const newTime = clamp(dragging.startTime + dtSeconds, 0, duration);

      setMarkers((prev) =>
        prev.map((m) => {
          if (m.id !== dragging.markerId) return m;
          if (dragging.handle === 'end') {
            return { ...m, endTime: Math.max(m.time + 0.05, Math.round(newTime * 1000) / 1000) };
          }
          const rounded = Math.round(newTime * 1000) / 1000;
          if (m.endTime !== undefined) {
            const dur = m.endTime - m.time;
            return { ...m, time: rounded, endTime: Math.round((rounded + dur) * 1000) / 1000 };
          }
          return { ...m, time: rounded };
        }),
      );
    };

    const onUp = () => setDragging(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, visibleDuration, duration]);

  /* close add-menu on outside click */
  useEffect(() => {
    if (!addMenuPos) return;
    const close = () => setAddMenuPos(null);
    window.addEventListener('mousedown', close, { once: true });
    return () => window.removeEventListener('mousedown', close);
  }, [addMenuPos]);

  /* keyboard: delete */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMarker) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedMarker, deleteSelected]);

  /* ----- ruler ticks ----- */
  const ticks = (() => {
    const intervals = [0.1, 0.25, 0.5, 1, 2, 5, 10];
    const targetTickCount = 12;
    const interval =
      intervals.find((i) => visibleDuration / i <= targetTickCount) ?? 10;
    const result: { time: number; major: boolean }[] = [];
    const start = Math.ceil(visibleStart / interval) * interval;
    for (let t = start; t <= visibleEnd; t += interval) {
      const rounded = Math.round(t * 1000) / 1000;
      result.push({ time: rounded, major: rounded % (interval * 2) < 0.001 || interval >= 1 });
    }
    return result;
  })();

  /* ----- render ----- */
  return (
    <div className="space-y-3">
      {/* Header row: title + duration control */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold">
          Timeline
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-muted">Duration</label>
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            value={duration}
            onChange={(e) => {
              const d = clamp(Number(e.target.value), 1, 60);
              setDuration(d);
              if (currentTime > d) setCurrentTime(d);
            }}
            className="w-14 px-1.5 py-0.5 rounded bg-bg-deep border border-border-subtle text-text-primary text-[11px] text-center outline-none focus:border-accent-border"
          />
          <span className="text-[10px] text-text-muted">s</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={() => {
            if (currentTime >= duration && !loop) setCurrentTime(0);
            setPlaying((p) => !p);
          }}
          className="flex items-center justify-center w-7 h-7 rounded bg-bg-deep border border-border-subtle text-text-primary hover:border-accent-border hover:text-accent transition-colors"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1" width="3" height="10" rx="0.5" />
              <rect x="7" y="1" width="3" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <span className="text-[11px] font-mono text-text-secondary tabular-nums w-[90px]">
          {formatTime(currentTime)}
        </span>

        {/* Loop toggle */}
        <button
          onClick={() => setLoop((l) => !l)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
            loop
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-deep border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
          title="Toggle loop"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" />
            <path d="M12.5 1v3h-3M3.5 15v-3h3" />
          </svg>
          Loop
        </button>

        {/* Speed control */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                speed === s
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-deep border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Delete selected */}
        {selectedMarker && (
          <button
            onClick={deleteSelected}
            className="ml-auto px-2 py-1 rounded text-[10px] border border-border-subtle bg-bg-deep text-red-400 hover:border-red-500 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Timeline track area */}
      <div
        className="relative select-none"
        onWheel={handleWheel}
      >
        {/* Ruler */}
        <div className="relative h-5 border-b border-border-subtle overflow-hidden">
          {ticks.map((tick) => {
            const pct = timeToPercent(tick.time);
            if (pct < -1 || pct > 101) return null;
            return (
              <div
                key={tick.time}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${pct}%` }}
              >
                <span className="text-[9px] text-text-muted leading-none whitespace-nowrap -translate-x-1/2">
                  {tick.time.toFixed(tick.time % 1 === 0 ? 0 : 1)}s
                </span>
                <div
                  className={`w-px ${tick.major ? 'h-2 bg-text-muted' : 'h-1 bg-border-subtle'}`}
                  style={{ marginTop: '1px' }}
                />
              </div>
            );
          })}
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-16 bg-bg-deep rounded border border-border-subtle mt-1 cursor-crosshair overflow-hidden"
          onClick={handleTrackClick}
          onMouseDown={handleScrub}
          onMouseMove={handleScrubDrag}
        >
          {/* Effect markers */}
          {markers.map((marker) => {
            const left = timeToPercent(marker.time);
            const isRange = marker.endTime !== undefined;
            const width = isRange
              ? timeToPercent(marker.endTime!) - left
              : undefined;
            const isSelected = selectedMarker === marker.id;
            const color = EFFECT_COLORS[marker.type];

            if (isRange && width !== undefined) {
              return (
                <div
                  key={marker.id}
                  data-marker
                  className="absolute top-1 bottom-1 rounded-sm cursor-grab active:cursor-grabbing group"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    backgroundColor: `${color}22`,
                    borderLeft: `2px solid ${color}`,
                    borderRight: `2px solid ${color}`,
                    outline: isSelected ? `1px solid ${color}` : undefined,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onMouseDown={(e) => startDrag(e, marker.id, 'start')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarker(marker.id);
                  }}
                >
                  {/* Label */}
                  <span
                    className="absolute top-0.5 left-1 text-[9px] font-medium leading-none pointer-events-none"
                    style={{ color }}
                  >
                    {EFFECT_LABELS[marker.type]}
                  </span>
                  {/* End handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, marker.id, 'end');
                    }}
                  />
                </div>
              );
            }

            // Point marker
            return (
              <div
                key={marker.id}
                data-marker
                className="absolute top-1 bottom-1 flex flex-col items-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${left}%`,
                  transform: 'translateX(-50%)',
                  zIndex: isSelected ? 10 : 1,
                }}
                onMouseDown={(e) => startDrag(e, marker.id, 'start')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMarker(marker.id);
                }}
              >
                {/* Diamond indicator */}
                <div
                  className="w-3 h-3 rotate-45 rounded-[1px] shrink-0"
                  style={{
                    backgroundColor: color,
                    outline: isSelected ? `2px solid ${color}` : undefined,
                    outlineOffset: '1px',
                  }}
                />
                <div
                  className="w-px flex-1"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-[8px] font-medium whitespace-nowrap leading-none mt-0.5"
                  style={{ color }}
                >
                  {EFFECT_LABELS[marker.type]}
                </span>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none"
            style={{ left: `${timeToPercent(currentTime)}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>

        {/* Scroll indicator when zoomed */}
        {zoom > 1 && (
          <div className="relative h-1.5 mt-1 bg-bg-deep rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-accent-dim rounded-full"
              style={{
                left: `${(scrollOffset / duration) * 100}%`,
                width: `${(visibleDuration / duration) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Add-effect dropdown */}
      {addMenuPos && (
        <div
          className="fixed z-50 py-1 rounded bg-bg-secondary border border-border-subtle shadow-lg"
          style={{ left: addMenuPos.x, top: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[9px] text-text-muted uppercase tracking-wider">
            Add effect at {addMenuPos.time.toFixed(2)}s
          </div>
          {(Object.keys(EFFECT_COLORS) as EffectType[]).map((type) => (
            <button
              key={type}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-text-secondary hover:bg-bg-deep hover:text-text-primary transition-colors"
              onClick={() => addMarker(type)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: EFFECT_COLORS[type] }}
              />
              {EFFECT_LABELS[type]}
              {RANGE_EFFECTS.includes(type) && (
                <span className="text-[9px] text-text-muted ml-auto">(range)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected marker info */}
      {selectedMarker && (() => {
        const m = markers.find((mk) => mk.id === selectedMarker);
        if (!m) return null;
        return (
          <div className="flex items-center gap-3 px-3 py-2 rounded bg-bg-deep border border-border-subtle text-[11px]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: EFFECT_COLORS[m.type] }}
            />
            <span className="text-text-primary font-medium">{EFFECT_LABELS[m.type]}</span>
            <span className="text-text-muted">@</span>
            <span className="font-mono text-text-secondary">{m.time.toFixed(3)}s</span>
            {m.endTime !== undefined && (
              <>
                <span className="text-text-muted">-</span>
                <span className="font-mono text-text-secondary">{m.endTime.toFixed(3)}s</span>
                <span className="text-text-muted">
                  ({(m.endTime - m.time).toFixed(3)}s)
                </span>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
