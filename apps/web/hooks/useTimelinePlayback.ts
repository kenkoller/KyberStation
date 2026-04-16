'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useBladeStore } from '@/stores/bladeStore';
import { EASING_PRESETS } from '@kyberstation/engine';

/**
 * Orchestrates timeline playback by advancing currentTime each frame
 * and triggering effects when the playhead crosses an event's startTime.
 * Supports duration-based events with easing curves and intensity.
 */
export function useTimelinePlayback(
  toggle: () => void,
  triggerEffect: (type: string, options?: { intensity?: number }) => void,
) {
  const animRef = useRef<number | null>(null);
  const prevTs = useRef<number | null>(null);
  /** Set of event IDs already fired during this playback pass */
  const firedRef = useRef<Set<string>>(new Set());
  /** Track active sustained events (those with duration, currently in progress) */
  const activeRef = useRef<Set<string>>(new Set());

  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const loop = useTimelineStore((s) => s.loop);
  const duration = useTimelineStore((s) => s.duration);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const events = useTimelineStore((s) => s.events);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setPlaying = useTimelineStore((s) => s.setPlaying);

  // Stable ref for events so the tick callback always sees the latest
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const fireEvent = useCallback(
    (type: string, options?: { intensity?: number }) => {
      const isOn = useBladeStore.getState().isOn;
      switch (type) {
        case 'ignite':
          if (!isOn) toggle();
          break;
        case 'retract':
          if (isOn) toggle();
          break;
        default:
          // Only trigger blade effects when the blade is on
          if (isOn) triggerEffect(type, options);
          break;
      }
    },
    [toggle, triggerEffect],
  );

  const tick = useCallback(
    (ts: number) => {
      if (prevTs.current === null) {
        prevTs.current = ts;
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = ((ts - prevTs.current) / 1000) * playbackSpeed;
      prevTs.current = ts;

      const store = useTimelineStore.getState();
      let nextTime = store.currentTime + dt;

      // Check events that fall in the window [currentTime, nextTime]
      const currentEvents = eventsRef.current;
      for (const event of currentEvents) {
        const endTime = event.startTime + (event.eventDuration || 0);

        // Fire event at its start time (instant trigger)
        if (!firedRef.current.has(event.id)) {
          if (event.startTime >= store.currentTime && event.startTime < nextTime) {
            // Apply easing-aware intensity
            const easingFn = EASING_PRESETS[event.easingCurve] ?? EASING_PRESETS.linear;
            const baseIntensity = event.intensity ?? 1;
            const easedIntensity = easingFn(1) * baseIntensity;
            fireEvent(event.type, { intensity: easedIntensity });
            firedRef.current.add(event.id);
            if (event.eventDuration > 0) {
              activeRef.current.add(event.id);
            }
          }
        }

        // Track active duration events (for future progress-aware rendering)
        if (activeRef.current.has(event.id) && nextTime >= endTime) {
          activeRef.current.delete(event.id);
        }
      }

      // Handle end of timeline
      if (nextTime >= duration) {
        if (loop) {
          // Wrap around: fire any events between currentTime and duration,
          // then reset fired set and fire events from 0 to remainder
          const remainder = nextTime - duration;
          firedRef.current.clear();
          activeRef.current.clear();

          for (const event of currentEvents) {
            if (event.startTime < remainder) {
              const easingFn = EASING_PRESETS[event.easingCurve] ?? EASING_PRESETS.linear;
              const baseIntensity = event.intensity ?? 1;
              fireEvent(event.type, { intensity: easingFn(1) * baseIntensity });
              firedRef.current.add(event.id);
              if (event.eventDuration > 0) activeRef.current.add(event.id);
            }
          }

          nextTime = remainder;
        } else {
          nextTime = duration;
          setPlaying(false);
        }
      }

      setCurrentTime(nextTime);
      animRef.current = requestAnimationFrame(tick);
    },
    [playbackSpeed, duration, loop, fireEvent, setCurrentTime, setPlaying],
  );

  useEffect(() => {
    if (isPlaying) {
      prevTs.current = null;
      firedRef.current.clear();
      animRef.current = requestAnimationFrame(tick);
    } else {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    }
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [isPlaying, tick]);
}
