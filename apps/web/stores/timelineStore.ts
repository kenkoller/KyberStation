import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TimelineEventType =
  | 'ignite'
  | 'retract'
  | 'clash'
  | 'blast'
  | 'stab'
  | 'lockup'
  | 'lightning'
  | 'drag'
  | 'melt'
  | 'force';

export type EasingCurve =
  | 'linear'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'bounce'
  | 'elastic';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  /** Start time in seconds from timeline start */
  startTime: number;
  /** Duration in seconds (0 = instant trigger) */
  eventDuration: number;
  /** Easing curve for the effect progress */
  easingCurve: EasingCurve;
  /** Effect intensity (0-1) */
  intensity: number;
  label?: string;
  /** Group ID for events added from a template */
  groupId?: string;
}

export interface TimelineState {
  events: TimelineEvent[];
  duration: number;
  isPlaying: boolean;
  currentTime: number;
  loop: boolean;
  playbackSpeed: number;

  addEvent: (type: TimelineEventType, startTime: number) => void;
  removeEvent: (id: string) => void;
  moveEvent: (id: string, newStartTime: number) => void;
  updateEventDuration: (id: string, eventDuration: number) => void;
  updateEventEasing: (id: string, easingCurve: EasingCurve) => void;
  updateEventIntensity: (id: string, intensity: number) => void;
  updateEventLabel: (id: string, label: string) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setLoop: (loop: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addEventGroup: (events: Array<{ type: TimelineEventType; startTime: number; eventDuration: number; easingCurve: EasingCurve; intensity: number; label?: string }>) => void;
  removeGroup: (groupId: string) => void;
  clearAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _counter = 0;
function uid(): string {
  return `tl_${Date.now()}_${++_counter}`;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  duration: 10,
  isPlaying: false,
  currentTime: 0,
  loop: true,
  playbackSpeed: 1,

  addEvent: (type, startTime) =>
    set((state) => ({
      events: [
        ...state.events,
        {
          id: uid(),
          type,
          startTime: Math.round(startTime * 1000) / 1000,
          eventDuration: type === 'ignite' || type === 'retract' ? 0 : 0.5,
          easingCurve: 'linear' as EasingCurve,
          intensity: 1.0,
        },
      ],
    })),

  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),

  moveEvent: (id, newStartTime) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id
          ? { ...e, startTime: Math.round(Math.max(0, Math.min(newStartTime, state.duration)) * 1000) / 1000 }
          : e,
      ),
    })),

  updateEventDuration: (id, eventDuration) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, eventDuration: Math.max(0, eventDuration) } : e,
      ),
    })),

  updateEventEasing: (id, easingCurve) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, easingCurve } : e,
      ),
    })),

  updateEventIntensity: (id, intensity) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, intensity: Math.max(0, Math.min(1, intensity)) } : e,
      ),
    })),

  updateEventLabel: (id, label) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, label: label.length > 0 ? label : undefined } : e,
      ),
    })),

  setDuration: (duration) =>
    set((state) => ({
      duration,
      currentTime: Math.min(state.currentTime, duration),
    })),

  setPlaying: (isPlaying) => set({ isPlaying }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setLoop: (loop) => set({ loop }),

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  addEventGroup: (groupEvents) => {
    const groupId = uid();
    set((state) => ({
      events: [
        ...state.events,
        ...groupEvents.map((e) => ({
          id: uid(),
          type: e.type,
          startTime: Math.round(e.startTime * 1000) / 1000,
          eventDuration: e.eventDuration,
          easingCurve: e.easingCurve,
          intensity: e.intensity,
          label: e.label,
          groupId,
        })),
      ],
    }));
  },

  removeGroup: (groupId) =>
    set((state) => ({
      events: state.events.filter((e) => e.groupId !== groupId),
    })),

  clearAll: () => set({ events: [], currentTime: 0, isPlaying: false }),
}));
