'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import type { TimelineEventType, EasingCurve } from '@/stores/timelineStore';
import { EasingCurvePreview } from '@/components/editor/EasingCurvePreview';
import {
  ANIMATION_TEMPLATES,
  getCategories,
  getTemplatesByCategory,
} from '@kyberstation/engine';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

const EASING_OPTIONS: EasingCurve[] = [
  'linear', 'ease-in-quad', 'ease-out-quad', 'ease-in-out-quad',
  'ease-in-cubic', 'ease-out-cubic', 'bounce', 'elastic',
];

const EASING_LABELS: Record<EasingCurve, string> = {
  'linear': 'Linear',
  'ease-in-quad': 'Ease In',
  'ease-out-quad': 'Ease Out',
  'ease-in-out-quad': 'Ease In/Out',
  'ease-in-cubic': 'Cubic In',
  'ease-out-cubic': 'Cubic Out',
  'bounce': 'Bounce',
  'elastic': 'Elastic',
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EVENT_COLORS: Record<TimelineEventType, string> = {
  ignite:    '#22c55e', // green
  retract:   '#ef4444', // red
  clash:     '#ffffff', // white
  blast:     '#eab308', // yellow
  stab:      '#f97316', // orange
  lockup:    '#f59e0b', // amber
  lightning: '#818cf8', // indigo
  drag:      '#a855f7', // purple
  melt:      '#fb923c', // orange-light
  force:     '#3b82f6', // blue
};

const EVENT_LABELS: Record<TimelineEventType, string> = {
  ignite:    'Ignite',
  retract:   'Retract',
  clash:     'Clash',
  blast:     'Blast',
  stab:      'Stab',
  lockup:    'Lockup',
  lightning: 'Lightning',
  drag:      'Drag',
  melt:      'Melt',
  force:     'Force',
};

const ALL_EVENT_TYPES: TimelineEventType[] = [
  'ignite', 'retract', 'clash', 'blast', 'stab',
  'lockup', 'lightning', 'drag', 'melt', 'force',
];

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

/** Visual width of each event block in pixels */
const EVENT_BLOCK_WIDTH = 36;
const EVENT_BLOCK_HEIGHT = 24;

/** Pixels per second at zoom=1 */
const BASE_PX_PER_SEC = 80;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 100);
  return `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type TimelineView = 'timeline' | 'cuelist';

export function TimelinePanel() {
  /* ----- store ----- */
  const events = useTimelineStore((s) => s.events);
  const duration = useTimelineStore((s) => s.duration);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const loop = useTimelineStore((s) => s.loop);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const addEvent = useTimelineStore((s) => s.addEvent);
  const removeEvent = useTimelineStore((s) => s.removeEvent);
  const moveEvent = useTimelineStore((s) => s.moveEvent);
  const updateEventDuration = useTimelineStore((s) => s.updateEventDuration);
  const updateEventEasing = useTimelineStore((s) => s.updateEventEasing);
  const updateEventIntensity = useTimelineStore((s) => s.updateEventIntensity);
  const updateEventLabel = useTimelineStore((s) => s.updateEventLabel);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setPlaying = useTimelineStore((s) => s.setPlaying);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setLoop = useTimelineStore((s) => s.setLoop);
  const setPlaybackSpeed = useTimelineStore((s) => s.setPlaybackSpeed);
  const clearAll = useTimelineStore((s) => s.clearAll);

  /* ----- local UI state ----- */
  const [view, setView] = useState<TimelineView>('timeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number; time: number } | null>(null);
  const [dragging, setDragging] = useState<{
    eventId: string;
    startMouseX: number;
    startTime: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    eventId: string;
    startMouseX: number;
    startDuration: number;
  } | null>(null);

  /* ----- refs ----- */
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ----- derived layout ----- */
  const pxPerSec = BASE_PX_PER_SEC;
  const totalTrackWidth = duration * pxPerSec;

  /* ----- pixel <-> time ----- */
  const timeToX = useCallback(
    (t: number) => t * pxPerSec,
    [pxPerSec],
  );

  const xToTime = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const localX = clientX - rect.left;
      return clamp(localX / pxPerSec, 0, duration);
    },
    [pxPerSec, duration],
  );

  /* ----- scrub on ruler click ----- */
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const t = xToTime(e.clientX);
      setCurrentTime(t);
    },
    [xToTime, setCurrentTime],
  );

  /* ----- track click: open add menu ----- */
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-event]')) return;
      const t = xToTime(e.clientX);
      setAddMenuPos({ x: e.clientX, y: e.clientY, time: t });
      setSelectedId(null);
    },
    [xToTime],
  );

  const handleAddEvent = useCallback(
    (type: TimelineEventType) => {
      if (!addMenuPos) return;
      addEvent(type, addMenuPos.time);
      setAddMenuPos(null);
    },
    [addMenuPos, addEvent],
  );

  /* ----- drag events ----- */
  const startDrag = useCallback(
    (e: React.MouseEvent, eventId: string, startTime: number) => {
      e.stopPropagation();
      setSelectedId(eventId);
      setDragging({
        eventId,
        startMouseX: e.clientX,
        startTime,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragging.startMouseX;
      const dtSec = dx / pxPerSec;
      const newTime = clamp(dragging.startTime + dtSec, 0, duration);
      moveEvent(dragging.eventId, newTime);
    };

    const onUp = () => setDragging(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, pxPerSec, duration, moveEvent]);

  /* ----- resize drag (right edge of event block) ----- */
  const startResize = useCallback(
    (e: React.MouseEvent, eventId: string, startDuration: number) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing({ eventId, startMouseX: e.clientX, startDuration });
    },
    [],
  );

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startMouseX;
      const dtSec = dx / pxPerSec;
      const newDuration = Math.max(0.1, resizing.startDuration + dtSec);
      updateEventDuration(resizing.eventId, Math.round(newDuration * 100) / 100);
    };

    const onUp = () => setResizing(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, pxPerSec, updateEventDuration]);

  /* ----- close add-menu on outside click ----- */
  useEffect(() => {
    if (!addMenuPos) return;
    const close = () => setAddMenuPos(null);
    window.addEventListener('mousedown', close, { once: true });
    return () => window.removeEventListener('mousedown', close);
  }, [addMenuPos]);

  /* ----- keyboard: delete selected ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeEvent(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, removeEvent]);

  /* ----- auto-scroll to follow playhead ----- */
  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const playheadX = timeToX(currentTime);
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    // Keep playhead in the middle 60% of the visible area
    const margin = container.clientWidth * 0.2;
    if (playheadX < viewLeft + margin) {
      container.scrollLeft = Math.max(0, playheadX - margin);
    } else if (playheadX > viewRight - margin) {
      container.scrollLeft = playheadX - container.clientWidth + margin;
    }
  }, [currentTime, isPlaying, timeToX]);

  /* ----- ruler ticks ----- */
  const ticks = (() => {
    const result: { time: number; major: boolean }[] = [];
    // Place a tick every second, sub-ticks every 0.5s
    const interval = 1;
    for (let t = 0; t <= duration; t += interval) {
      result.push({ time: t, major: true });
    }
    // Half-second sub-ticks
    for (let t = 0.5; t < duration; t += interval) {
      result.push({ time: t, major: false });
    }
    return result.sort((a, b) => a.time - b.time);
  })();

  /* ----- render ----- */
  return (
    <div className="space-y-3">
      {/* Header: title + view toggle + duration */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
          Effect Sequencer
          <HelpTooltip text="Choreograph a timed sequence of blade effects (clash, blast, lockup, etc.) for demo playback. Place events on the timeline, press Play, and watch them fire on the blade preview in real time. Great for rehearsing choreography or recording demo videos. Click the track to add events, drag to reposition, resize from the right edge." />
        </h3>
        <div className="flex items-center gap-2">
          {/* View toggle: Timeline / Cue List (ETC Eos register per UX North Star §4) */}
          <div
            role="tablist"
            aria-label="Timeline view mode"
            className="inline-flex rounded border border-border-subtle bg-bg-deep overflow-hidden"
          >
            <button
              role="tab"
              type="button"
              aria-selected={view === 'timeline'}
              onClick={() => setView('timeline')}
              className={`touch-target px-2 py-0.5 text-ui-sm transition-colors ${
                view === 'timeline'
                  ? 'bg-accent-dim text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Horizontal timeline view"
            >
              Timeline
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={view === 'cuelist'}
              onClick={() => setView('cuelist')}
              className={`touch-target px-2 py-0.5 text-ui-sm transition-colors border-l border-border-subtle ${
                view === 'cuelist'
                  ? 'bg-accent-dim text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Tabular cue list (ETC Eos style)"
            >
              Cue List
            </button>
          </div>
          <label htmlFor="timeline-duration" className="text-ui-sm text-text-muted">Duration</label>
          <input
            id="timeline-duration"
            type="number"
            min={1}
            max={60}
            step={1}
            value={duration}
            onChange={(e) => {
              const d = clamp(Number(e.target.value), 1, 60);
              setDuration(d);
            }}
            className="touch-target w-14 px-1.5 py-0.5 rounded bg-bg-deep border border-border-subtle text-text-primary text-ui-base text-center outline-none focus:border-accent-border font-mono"
          />
          <span className="text-ui-sm text-text-muted">s</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-ui-xs text-text-muted -mt-1">
        Schedule blade effects on a timeline for choreographed demo playback.
        Press Play to fire each effect on the blade preview in sequence.
      </p>

      {/* Playback controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Play / Pause */}
        <button
          onClick={() => {
            if (!isPlaying && currentTime >= duration && !loop) {
              setCurrentTime(0);
            }
            setPlaying(!isPlaying);
          }}
          className="touch-target flex items-center justify-center w-7 h-7 rounded bg-bg-deep border border-border-subtle text-text-primary hover:border-accent-border hover:text-accent transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
        >
          {isPlaying ? (
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
        <span className="text-ui-base font-mono text-text-secondary tabular-nums w-[72px]">
          {formatTime(currentTime)}
        </span>

        {/* Loop toggle */}
        <button
          onClick={() => setLoop(!loop)}
          className={`touch-target flex items-center gap-1 px-2 py-1 rounded text-ui-sm border transition-colors ${
            loop
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-deep border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
          title="Toggle loop"
          aria-label={loop ? 'Disable loop' : 'Enable loop'}
          aria-pressed={loop}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" />
            <path d="M12.5 1v3h-3M3.5 15v-3h3" />
          </svg>
          Loop
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              aria-label={`Set playback speed to ${s}x`}
              aria-pressed={playbackSpeed === s}
              className={`touch-target px-1.5 py-0.5 rounded text-ui-sm border transition-colors ${
                playbackSpeed === s
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-deep border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Clear all */}
        {events.length > 0 && (
          <button
            onClick={clearAll}
            aria-label="Clear all timeline events"
            className="touch-target ml-auto px-2 py-1 rounded text-ui-sm border border-border-subtle bg-bg-deep text-text-muted hover:text-red-400 hover:border-red-500 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Timeline track area — scrollable. Hidden (not unmounted) when in cue-list view
          so drag/resize handlers + playhead auto-scroll refs stay valid between toggles. */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden rounded border border-border-subtle bg-bg-deep"
        style={{ maxHeight: '200px', display: view === 'timeline' ? 'block' : 'none' }}
      >
        <div
          className="relative select-none"
          style={{ width: `${totalTrackWidth}px`, minWidth: '100%' }}
        >
          {/* Ruler */}
          <div
            className="relative h-5 border-b border-border-subtle cursor-pointer"
            onClick={handleRulerClick}
          >
            {ticks.map((tick) => {
              const x = timeToX(tick.time);
              return (
                <div
                  key={tick.time}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${x}px` }}
                >
                  {tick.major && (
                    <span className="text-ui-xs text-text-muted leading-none whitespace-nowrap -translate-x-1/2">
                      {tick.time}s
                    </span>
                  )}
                  <div
                    className={`w-px ${tick.major ? 'h-2.5 bg-text-muted' : 'h-1.5 bg-border-subtle'}`}
                    style={{ marginTop: tick.major ? '1px' : '8px' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Event track */}
          <div
            ref={trackRef}
            className="relative cursor-crosshair"
            style={{ height: '120px' }}
            onClick={handleTrackClick}
            role="listbox"
            aria-label="Timeline events"
            aria-roledescription="reorderable list"
          >
            {/* Vertical grid lines at each second */}
            {ticks
              .filter((t) => t.major)
              .map((tick) => (
                <div
                  key={`grid-${tick.time}`}
                  className="absolute top-0 bottom-0 w-px bg-border-subtle/30"
                  style={{ left: `${timeToX(tick.time)}px` }}
                />
              ))}

            {/* Empty-state guide */}
            {events.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <span className="text-ui-sm text-text-muted/60 font-medium">No events yet</span>
                <span className="text-ui-xs text-text-muted/40 text-center max-w-[260px] leading-relaxed">
                  Click anywhere on this track to place a blade effect (clash, blast, lockup, etc.),
                  or expand Animation Templates below to drop a preset combo.
                </span>
              </div>
            )}

            {/* Event blocks */}
            {events.map((evt) => {
              const x = timeToX(evt.startTime);
              const color = EVENT_COLORS[evt.type];
              const isSelected = selectedId === evt.id;
              const hasDuration = evt.eventDuration > 0;
              const blockWidth = hasDuration
                ? Math.max(EVENT_BLOCK_WIDTH, evt.eventDuration * pxPerSec)
                : EVENT_BLOCK_WIDTH;

              return (
                <div
                  key={evt.id}
                  data-event
                  role="option"
                  aria-selected={isSelected}
                  aria-roledescription="draggable item"
                  aria-label={`${EVENT_LABELS[evt.type]} at ${evt.startTime.toFixed(1)}s`}
                  className="absolute cursor-grab active:cursor-grabbing group"
                  style={{
                    left: `${hasDuration ? x : x - EVENT_BLOCK_WIDTH / 2}px`,
                    top: '8px',
                    width: `${blockWidth}px`,
                    height: `${EVENT_BLOCK_HEIGHT}px`,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onMouseDown={(e) => startDrag(e, evt.id, evt.startTime)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(evt.id);
                  }}
                >
                  {/* Block background */}
                  <div
                    className="w-full h-full rounded-[4px] flex items-center justify-between relative overflow-hidden"
                    style={{
                      backgroundColor: `${color}22`,
                      border: isSelected ? `2px solid ${color}` : `1px solid ${color}66`,
                      opacity: evt.intensity < 1 ? 0.5 + evt.intensity * 0.5 : 1,
                    }}
                  >
                    <span
                      className="text-ui-xs font-semibold leading-none select-none truncate px-1"
                      style={{ color }}
                    >
                      {EVENT_LABELS[evt.type]}
                    </span>

                    {/* Duration label (when wide enough) */}
                    {hasDuration && blockWidth > 60 && (
                      <span
                        className="text-ui-xs font-mono select-none pr-3 shrink-0"
                        style={{ color: `${color}88` }}
                      >
                        {evt.eventDuration.toFixed(1)}s
                      </span>
                    )}

                    {/* Delete button (visible on hover / selection) */}
                    <button
                      className="touch-target absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-bg-deep border border-border-subtle text-text-muted
                        flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-500 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEvent(evt.id);
                        if (selectedId === evt.id) setSelectedId(null);
                      }}
                      title="Remove event"
                      aria-label={`Remove ${EVENT_LABELS[evt.type]} event`}
                    >
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 1l4 4M5 1l-4 4" />
                      </svg>
                    </button>

                    {/* Resize handle (right edge, for duration events) */}
                    {hasDuration && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: `${color}44` }}
                        onMouseDown={(e) => startResize(e, evt.id, evt.eventDuration)}
                      />
                    )}
                  </div>

                  {/* Vertical tick line below the block */}
                  <div
                    className="absolute w-px"
                    style={{
                      left: hasDuration ? '0px' : `${EVENT_BLOCK_WIDTH / 2}px`,
                      top: `${EVENT_BLOCK_HEIGHT}px`,
                      height: `${120 - EVENT_BLOCK_HEIGHT - 8 - 4}px`,
                      backgroundColor: `${color}44`,
                    }}
                  />

                  {/* Time label below */}
                  <span
                    className="absolute text-ui-xs font-mono whitespace-nowrap"
                    style={{
                      left: hasDuration ? '0px' : `${EVENT_BLOCK_WIDTH / 2}px`,
                      transform: hasDuration ? 'none' : 'translateX(-50%)',
                      bottom: `-${120 - EVENT_BLOCK_HEIGHT - 8 - 2}px`,
                      color: `${color}88`,
                    }}
                  >
                    {evt.startTime.toFixed(2)}s
                  </span>
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/90 z-20 pointer-events-none"
              style={{ left: `${timeToX(currentTime)}px` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Cue list view — ETC Eos register per UX North Star §4 */}
      {view === 'cuelist' && (
        <CueListView
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateEventDuration={updateEventDuration}
          updateEventLabel={updateEventLabel}
          moveEvent={moveEvent}
          removeEvent={removeEvent}
          setCurrentTime={setCurrentTime}
          duration={duration}
        />
      )}

      {/* Add-effect dropdown */}
      {addMenuPos && (
        <div
          className="fixed z-50 py-1 rounded bg-bg-secondary border border-border-subtle shadow-lg max-h-64 overflow-y-auto"
          style={{ left: addMenuPos.x, top: addMenuPos.y - 12, transform: 'translateY(-100%)' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-ui-xs text-text-muted uppercase tracking-wider">
            Add at {addMenuPos.time.toFixed(2)}s
          </div>
          {ALL_EVENT_TYPES.map((type) => (
            <button
              key={type}
              className="touch-target flex items-center gap-2 w-full px-3 py-1.5 text-ui-base text-text-secondary hover:bg-bg-deep hover:text-text-primary transition-colors"
              onClick={() => handleAddEvent(type)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: EVENT_COLORS[type] }}
              />
              {EVENT_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {/* Selected event property panel */}
      {selectedId && (() => {
        const evt = events.find((e) => e.id === selectedId);
        if (!evt) return null;
        const color = EVENT_COLORS[evt.type];
        const isInstant = evt.type === 'ignite' || evt.type === 'retract';
        return (
          <div className="rounded bg-bg-deep border border-border-subtle p-3 space-y-2.5">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-ui-base text-text-primary font-medium">{EVENT_LABELS[evt.type]}</span>
              <span className="text-ui-sm text-text-muted">@</span>
              <span className="text-ui-sm font-mono text-text-secondary">{evt.startTime.toFixed(3)}s</span>
              <button
                onClick={() => { removeEvent(evt.id); setSelectedId(null); }}
                className="touch-target ml-auto px-2 py-0.5 rounded text-ui-sm border border-border-subtle bg-bg-deep text-red-400 hover:border-red-500 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Properties grid */}
            <div className="grid grid-cols-1 desktop:grid-cols-3 gap-3">
              {/* Duration */}
              <div>
                <label htmlFor={`event-duration-${evt.id}`} className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  Duration
                  <HelpTooltip text="How long the effect lasts in seconds. Instant events (ignite/retract) use the timing set in the Effect Panel instead." position="bottom" />
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id={`event-duration-${evt.id}`}
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={evt.eventDuration}
                    disabled={isInstant}
                    onChange={(e) => updateEventDuration(evt.id, Number(e.target.value))}
                    className="touch-target w-full px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-ui-sm text-text-primary text-center outline-none focus:border-accent-border disabled:opacity-40"
                  />
                  <span className="text-ui-xs text-text-muted shrink-0">s</span>
                </div>
              </div>

              {/* Easing Curve */}
              <div>
                <label htmlFor={`event-easing-${evt.id}`} className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  Easing
                  <HelpTooltip text="Acceleration curve for the effect animation. Linear = constant speed. Ease Out = fast start, slow end (natural). Bounce/Elastic add spring physics." proffie="TrEaseX<>" position="bottom" />
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id={`event-easing-${evt.id}`}
                    value={evt.easingCurve}
                    disabled={isInstant}
                    onChange={(e) => updateEventEasing(evt.id, e.target.value as EasingCurve)}
                    className="touch-target flex-1 px-1 py-0.5 rounded bg-bg-surface border border-border-subtle text-ui-sm text-text-primary outline-none focus:border-accent-border disabled:opacity-40"
                  >
                    {EASING_OPTIONS.map((e) => (
                      <option key={e} value={e}>{EASING_LABELS[e]}</option>
                    ))}
                  </select>
                  {/* Live SVG preview of the chosen curve. Disabled events
                      render in muted grey so it's obvious the selector is
                      greyed-out too. */}
                  <div
                    className="shrink-0 rounded bg-bg-surface border border-border-subtle px-1 py-0.5"
                    title={`${EASING_LABELS[evt.easingCurve]} curve`}
                    style={{ opacity: isInstant ? 0.3 : 1 }}
                  >
                    <EasingCurvePreview
                      curve={evt.easingCurve}
                      color={isInstant ? 'rgb(var(--text-muted))' : color}
                      width={70}
                    />
                  </div>
                </div>
              </div>

              {/* Intensity */}
              <div>
                <label htmlFor={`event-intensity-${evt.id}`} className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  Intensity
                  <HelpTooltip text="Strength of the visual effect. Lower intensity makes the event subtler. At 100%, the effect renders at full brightness/size." proffie="Scale<>" position="bottom" />
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`event-intensity-${evt.id}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={evt.intensity}
                    onChange={(e) => updateEventIntensity(evt.id, Number(e.target.value))}
                    className="flex-1 h-1 accent-accent"
                  />
                  <span className="text-ui-xs text-text-muted tabular-nums w-6 text-right">
                    {Math.round(evt.intensity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Template Palette */}
      <TemplatePalette />

      {/* Event count hint */}
      <div className="flex items-center justify-between text-ui-xs text-text-muted">
        <span>
          {events.length === 0
            ? 'Click the track above to place your first effect, or use a template'
            : `${events.length} event${events.length !== 1 ? 's' : ''} \u2014 click track to add, drag to reposition, Delete key to remove`}
        </span>
        {events.length > 0 && <span>drag right edge to resize</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Palette                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<string, string> = {
  ignition: 'Ignition',
  idle: 'Idle',
  combat: 'Combat',
  retraction: 'Retraction',
  special: 'Special',
};

const CATEGORY_COLORS: Record<string, string> = {
  ignition: '#22c55e',
  idle: '#3b82f6',
  combat: '#ef4444',
  retraction: '#f59e0b',
  special: '#a855f7',
};

function TemplatePalette() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('combat');
  const addEventGroup = useTimelineStore((s) => s.addEventGroup);
  const currentTime = useTimelineStore((s) => s.currentTime);

  const handleDropTemplate = useCallback(
    (templateId: string) => {
      const template = ANIMATION_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      const groupEvents = template.events.map((e) => ({
        type: e.type as TimelineEventType,
        startTime: currentTime + e.relativeStartTime,
        eventDuration: e.duration,
        easingCurve: e.easing as EasingCurve,
        intensity: e.intensity,
        label: template.name,
      }));
      addEventGroup(groupEvents);
    },
    [currentTime, addEventGroup],
  );

  const templates = getTemplatesByCategory(activeCategory as import('@kyberstation/engine').AnimationCategory);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="touch-target text-ui-sm text-text-muted hover:text-accent transition-colors flex items-center gap-1"
      >
        <span className="text-ui-xs">{open ? '\u25BC' : '\u25B6'}</span>
        Animation Templates
      </button>

      {open && (
        <div className="mt-1.5 bg-bg-primary rounded p-2 border border-border-subtle space-y-2">
          {/* Category tabs */}
          <div className="flex gap-1">
            {getCategories().map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`touch-target px-2 py-0.5 rounded text-ui-xs border transition-colors ${
                  activeCategory === cat
                    ? 'border-accent-border text-accent bg-accent-dim'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
                style={activeCategory === cat ? { borderColor: CATEGORY_COLORS[cat] } : undefined}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 group cursor-pointer hover:bg-bg-surface rounded px-1.5 py-1 transition-colors"
                onClick={() => handleDropTemplate(t.id)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[t.category] }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-ui-sm text-text-primary group-hover:text-accent transition-colors">
                    {t.name}
                  </span>
                  <span className="text-ui-xs text-text-muted ml-1.5">
                    {t.totalDuration}s &middot; {t.events.length} events
                  </span>
                </div>
                <button
                  className="touch-target text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent hover:border-accent-border/40 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropTemplate(t.id);
                  }}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>

          <p className="text-ui-xs text-text-muted">
            Click a template to add it at the playhead position ({formatTime(useTimelineStore.getState().currentTime)}).
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cue List View — ETC Eos tabular register                          */
/*                                                                    */
/*  Sorting: click a column header to sort by that column. Clicking   */
/*  the same column twice flips asc/desc. Default is time ascending.  */
/*  Inline editing: time, duration, notes are editable cells — click  */
/*  (or press Enter while row is focused) to edit, Enter to commit,   */
/*  Escape to cancel.                                                 */
/*  Keyboard nav: Up/Down moves focus between rows; Enter on a row    */
/*  edits the time cell; Escape clears selection.                     */
/*                                                                    */
/*  Reads from the SAME useTimelineStore — no data duplication.       */
/* ------------------------------------------------------------------ */

type CueListSortKey = 'cue' | 'time' | 'type' | 'duration';
type CueListSortDir = 'asc' | 'desc';

interface CueListViewProps {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateEventDuration: (id: string, d: number) => void;
  updateEventLabel: (id: string, label: string) => void;
  moveEvent: (id: string, t: number) => void;
  removeEvent: (id: string) => void;
  setCurrentTime: (t: number) => void;
  duration: number;
}

interface CueRow {
  cueNum: number;   // 1-based index in time-sorted order (stable across sort key)
  event: import('@/stores/timelineStore').TimelineEvent;
}

/** Parse "MM:SS.ms" or a plain seconds-number string into seconds. Returns null on parse fail. */
function parseTimeString(raw: string): number | null {
  const s = raw.trim();
  if (s.length === 0) return null;
  // MM:SS.ms or MM:SS form
  const mmss = s.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (mmss) {
    const m = Number(mmss[1]);
    const sec = Number(mmss[2]);
    if (!Number.isFinite(m) || !Number.isFinite(sec)) return null;
    return m * 60 + sec;
  }
  // Plain seconds
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function CueListView({
  selectedId,
  setSelectedId,
  updateEventDuration,
  updateEventLabel,
  moveEvent,
  removeEvent,
  setCurrentTime,
  duration,
}: CueListViewProps) {
  const events = useTimelineStore((s) => s.events);

  const [sortKey, setSortKey] = useState<CueListSortKey>('time');
  const [sortDir, setSortDir] = useState<CueListSortDir>('asc');

  // Editing state: which cell is being edited? (eventId + column)
  const [editing, setEditing] = useState<{
    id: string;
    col: 'time' | 'duration' | 'notes';
    draft: string;
  } | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  /* ----- Derive rows: cue-number assigned in time-ASC order (stable),
          then re-ordered per the active sort key. ----- */
  const rows: CueRow[] = (() => {
    const byTimeAsc = [...events].sort((a, b) => a.startTime - b.startTime);
    const cueNums = new Map<string, number>();
    byTimeAsc.forEach((e, i) => cueNums.set(e.id, i + 1));

    const sorted = [...events].sort((a, b) => {
      let delta = 0;
      switch (sortKey) {
        case 'cue':
          delta = (cueNums.get(a.id) ?? 0) - (cueNums.get(b.id) ?? 0);
          break;
        case 'time':
          delta = a.startTime - b.startTime;
          break;
        case 'type':
          delta = a.type.localeCompare(b.type);
          break;
        case 'duration':
          delta = a.eventDuration - b.eventDuration;
          break;
      }
      return sortDir === 'asc' ? delta : -delta;
    });

    return sorted.map((e) => ({ cueNum: cueNums.get(e.id) ?? 0, event: e }));
  })();

  const onHeaderClick = (key: CueListSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const beginEdit = useCallback(
    (id: string, col: 'time' | 'duration' | 'notes', initial: string) => {
      setEditing({ id, col, draft: initial });
    },
    [],
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const { id, col, draft } = editing;
    if (col === 'time') {
      const parsed = parseTimeString(draft);
      if (parsed !== null) {
        moveEvent(id, clamp(parsed, 0, duration));
      }
    } else if (col === 'duration') {
      const n = Number(draft);
      if (Number.isFinite(n)) {
        updateEventDuration(id, Math.max(0, n));
      }
    } else if (col === 'notes') {
      updateEventLabel(id, draft);
    }
    setEditing(null);
  }, [editing, moveEvent, updateEventDuration, updateEventLabel, duration]);

  const cancelEdit = useCallback(() => setEditing(null), []);

  /* ----- Keyboard navigation across rows ----- */
  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
      if (editing) return; // edit input handles its own keys
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = rows.findIndex((r) => r.event.id === id);
        if (idx < 0) return;
        const next =
          e.key === 'ArrowDown'
            ? Math.min(rows.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        const nextId = rows[next]?.event.id;
        if (nextId) {
          setSelectedId(nextId);
          rowRefs.current[nextId]?.focus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const row = rows.find((r) => r.event.id === id);
        if (!row) return;
        beginEdit(id, 'time', row.event.startTime.toFixed(3));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
        (e.currentTarget as HTMLElement).blur();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeEvent(id);
        if (selectedId === id) setSelectedId(null);
      }
    },
    [editing, rows, setSelectedId, beginEdit, removeEvent, selectedId],
  );

  /* ----- Sort indicator glyph. Uses the same visual alphabet (▲/▼) as
          the StatusSignal primitives. ----- */
  const sortGlyph = (key: CueListSortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const HEAD_CELL =
    'px-2 py-1 text-left text-ui-xs text-text-muted uppercase tracking-wider font-semibold cursor-pointer hover:text-text-secondary select-none whitespace-nowrap';
  const BODY_CELL = 'px-2 py-1 text-ui-sm text-text-primary';
  const NUMERIC_CELL = `${BODY_CELL} font-mono tabular-nums whitespace-nowrap`;

  if (events.length === 0) {
    return (
      <div className="rounded border border-border-subtle bg-bg-deep p-6 flex flex-col items-center justify-center gap-1.5">
        <span className="text-ui-sm text-text-muted/60 font-medium">No cues yet</span>
        <span className="text-ui-xs text-text-muted/40 text-center max-w-[360px] leading-relaxed">
          Switch to Timeline view and click the track to place a cue, or expand
          Animation Templates below to drop a preset combo.
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded border border-border-subtle bg-bg-deep overflow-auto"
      style={{ maxHeight: '320px' }}
      role="region"
      aria-label="Cue list"
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-bg-deep border-b border-border-subtle z-10">
          <tr>
            <th
              scope="col"
              className={`${HEAD_CELL} w-10`}
              onClick={() => onHeaderClick('cue')}
              aria-sort={sortKey === 'cue' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              #{sortGlyph('cue')}
            </th>
            <th
              scope="col"
              className={`${HEAD_CELL} w-[110px]`}
              onClick={() => onHeaderClick('time')}
              aria-sort={sortKey === 'time' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Time{sortGlyph('time')}
            </th>
            <th
              scope="col"
              className={HEAD_CELL}
              onClick={() => onHeaderClick('type')}
              aria-sort={sortKey === 'type' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Event{sortGlyph('type')}
            </th>
            <th scope="col" className={`${HEAD_CELL} w-16 cursor-default hover:text-text-muted`}>
              Color
            </th>
            <th
              scope="col"
              className={`${HEAD_CELL} w-[90px]`}
              onClick={() => onHeaderClick('duration')}
              aria-sort={sortKey === 'duration' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Dur{sortGlyph('duration')}
            </th>
            <th scope="col" className={`${HEAD_CELL} cursor-default hover:text-text-muted`}>
              Notes
            </th>
            <th scope="col" className={`${HEAD_CELL} w-8 cursor-default hover:text-text-muted`} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cueNum, event: evt }) => {
            const color = EVENT_COLORS[evt.type];
            const isSelected = selectedId === evt.id;
            const isInstant = evt.type === 'ignite' || evt.type === 'retract';

            const timeEditing = editing?.id === evt.id && editing.col === 'time';
            const durationEditing = editing?.id === evt.id && editing.col === 'duration';
            const notesEditing = editing?.id === evt.id && editing.col === 'notes';

            return (
              <tr
                key={evt.id}
                ref={(el) => {
                  rowRefs.current[evt.id] = el;
                }}
                tabIndex={0}
                role="row"
                aria-selected={isSelected}
                data-testid="cuelist-row"
                data-cue-num={cueNum}
                className={`border-b border-border-subtle/40 outline-none ${
                  isSelected
                    ? 'bg-accent-dim/40'
                    : 'hover:bg-bg-surface/40 focus:bg-bg-surface/60'
                }`}
                onClick={() => {
                  setSelectedId(evt.id);
                  setCurrentTime(evt.startTime);
                }}
                onKeyDown={(e) => handleRowKeyDown(e, evt.id)}
              >
                {/* Cue # */}
                <td className={NUMERIC_CELL}>
                  <span className="text-text-muted">{String(cueNum).padStart(3, '0')}</span>
                </td>

                {/* Time — inline-editable */}
                <td className={NUMERIC_CELL}>
                  {timeEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editing!.draft}
                      onChange={(e) =>
                        setEditing((s) => (s ? { ...s, draft: e.target.value } : s))
                      }
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                      className="w-full bg-bg-surface border border-accent-border rounded px-1 py-0.5 font-mono tabular-nums text-ui-sm outline-none"
                      aria-label={`Edit time for cue ${cueNum}`}
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left hover:text-accent transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(evt.id);
                        beginEdit(evt.id, 'time', evt.startTime.toFixed(3));
                      }}
                      title="Click to edit — accepts MM:SS.ms or plain seconds"
                    >
                      {formatTime(evt.startTime)}
                    </button>
                  )}
                </td>

                {/* Event type */}
                <td className={BODY_CELL}>
                  <span style={{ color }} className="font-semibold">
                    {EVENT_LABELS[evt.type]}
                  </span>
                </td>

                {/* Color swatch + hex (JetBrains Mono hex per §6 data-typography) */}
                <td className={BODY_CELL}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm border border-border-subtle shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-ui-xs text-text-muted">{color.toUpperCase()}</span>
                  </div>
                </td>

                {/* Duration — inline-editable */}
                <td className={NUMERIC_CELL}>
                  {durationEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editing!.draft}
                      onChange={(e) =>
                        setEditing((s) => (s ? { ...s, draft: e.target.value } : s))
                      }
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                      className="w-full bg-bg-surface border border-accent-border rounded px-1 py-0.5 font-mono tabular-nums text-ui-sm outline-none disabled:opacity-40"
                      aria-label={`Edit duration for cue ${cueNum}`}
                      disabled={isInstant}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={isInstant}
                      className="w-full text-left hover:text-accent transition-colors disabled:opacity-40 disabled:hover:text-text-primary disabled:cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInstant) return;
                        setSelectedId(evt.id);
                        beginEdit(evt.id, 'duration', evt.eventDuration.toFixed(2));
                      }}
                      title={isInstant ? 'Instant trigger' : 'Click to edit duration in seconds'}
                    >
                      {isInstant ? '—' : `${evt.eventDuration.toFixed(2)}s`}
                    </button>
                  )}
                </td>

                {/* Notes — inline-editable text */}
                <td className={BODY_CELL}>
                  {notesEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editing!.draft}
                      onChange={(e) =>
                        setEditing((s) => (s ? { ...s, draft: e.target.value } : s))
                      }
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                      }}
                      className="w-full bg-bg-surface border border-accent-border rounded px-1 py-0.5 text-ui-sm outline-none"
                      aria-label={`Edit notes for cue ${cueNum}`}
                      placeholder="Add a note"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left hover:text-accent transition-colors text-text-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(evt.id);
                        beginEdit(evt.id, 'notes', evt.label ?? '');
                      }}
                      title="Click to add a note"
                    >
                      {evt.label ? evt.label : <span className="text-text-muted/50 italic">add note</span>}
                    </button>
                  )}
                </td>

                {/* Row actions */}
                <td className={`${BODY_CELL} text-right`}>
                  <button
                    type="button"
                    className="touch-target inline-flex items-center justify-center w-5 h-5 rounded text-text-muted hover:text-red-400 hover:border-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEvent(evt.id);
                      if (selectedId === evt.id) setSelectedId(null);
                    }}
                    title="Remove cue"
                    aria-label={`Remove cue ${cueNum}`}
                  >
                    <svg width="8" height="8" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 1l4 4M5 1l-4 4" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="px-2 py-1 text-ui-xs text-text-muted border-t border-border-subtle/40 bg-bg-deep/50">
        {rows.length} cue{rows.length !== 1 ? 's' : ''} &middot; arrow keys navigate, Enter edits, Esc cancels
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported helpers (for tests)                                       */
/* ------------------------------------------------------------------ */

export { formatTime as __formatTimeForTest, parseTimeString as __parseTimeStringForTest };
