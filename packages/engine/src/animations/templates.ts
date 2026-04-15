// ─── Animation Template Library ───
// Pre-made animation sequences that can be dropped onto the timeline.

export type AnimationCategory = 'ignition' | 'idle' | 'combat' | 'retraction' | 'special';

export type AnimationEventType =
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

export interface AnimationTemplateEvent {
  type: AnimationEventType;
  /** Start time relative to template start (seconds) */
  relativeStartTime: number;
  /** Duration in seconds (0 = instant) */
  duration: number;
  /** Easing curve */
  easing: string;
  /** Intensity 0-1 */
  intensity: number;
}

export interface AnimationTemplate {
  id: string;
  name: string;
  category: AnimationCategory;
  description: string;
  events: AnimationTemplateEvent[];
  /** Total duration in seconds */
  totalDuration: number;
}

// ─── Pre-Built Templates ───

export const ANIMATION_TEMPLATES: AnimationTemplate[] = [
  // ── Ignition ──
  {
    id: 'ignition-quick',
    name: 'Quick Ignite',
    category: 'ignition',
    description: 'Fast ignition with a single clash flash',
    totalDuration: 1.0,
    events: [
      { type: 'ignite', relativeStartTime: 0, duration: 0, easing: 'linear', intensity: 1 },
      { type: 'clash', relativeStartTime: 0.3, duration: 0.2, easing: 'ease-out-quad', intensity: 0.5 },
    ],
  },
  {
    id: 'ignition-dramatic',
    name: 'Dramatic Ignite',
    category: 'ignition',
    description: 'Slow ignition with stab and force push',
    totalDuration: 2.5,
    events: [
      { type: 'force', relativeStartTime: 0, duration: 0.5, easing: 'ease-in-quad', intensity: 0.3 },
      { type: 'ignite', relativeStartTime: 0.5, duration: 0, easing: 'linear', intensity: 1 },
      { type: 'stab', relativeStartTime: 1.5, duration: 0.4, easing: 'ease-out-quad', intensity: 0.7 },
    ],
  },
  {
    id: 'ignition-stutter',
    name: 'Stutter Ignite',
    category: 'ignition',
    description: 'Unstable ignition with flickering start',
    totalDuration: 2.0,
    events: [
      { type: 'clash', relativeStartTime: 0, duration: 0.1, easing: 'linear', intensity: 0.3 },
      { type: 'clash', relativeStartTime: 0.2, duration: 0.1, easing: 'linear', intensity: 0.5 },
      { type: 'ignite', relativeStartTime: 0.5, duration: 0, easing: 'linear', intensity: 1 },
      { type: 'clash', relativeStartTime: 0.8, duration: 0.15, easing: 'ease-out-quad', intensity: 0.4 },
    ],
  },

  // ── Idle ──
  {
    id: 'idle-gentle-pulse',
    name: 'Gentle Pulse',
    category: 'idle',
    description: 'Subtle rhythmic pulsing during idle',
    totalDuration: 4.0,
    events: [
      { type: 'force', relativeStartTime: 0, duration: 1.5, easing: 'ease-in-out-quad', intensity: 0.2 },
      { type: 'force', relativeStartTime: 2, duration: 1.5, easing: 'ease-in-out-quad', intensity: 0.2 },
    ],
  },
  {
    id: 'idle-crackle',
    name: 'Crackle Loop',
    category: 'idle',
    description: 'Unstable blade crackling effect',
    totalDuration: 3.0,
    events: [
      { type: 'lightning', relativeStartTime: 0.2, duration: 0.15, easing: 'linear', intensity: 0.4 },
      { type: 'lightning', relativeStartTime: 0.8, duration: 0.1, easing: 'linear', intensity: 0.3 },
      { type: 'lightning', relativeStartTime: 1.5, duration: 0.2, easing: 'linear', intensity: 0.5 },
      { type: 'lightning', relativeStartTime: 2.3, duration: 0.1, easing: 'linear', intensity: 0.3 },
    ],
  },

  // ── Combat ──
  {
    id: 'combat-single-clash',
    name: 'Single Clash',
    category: 'combat',
    description: 'One clean clash strike',
    totalDuration: 0.8,
    events: [
      { type: 'clash', relativeStartTime: 0, duration: 0.3, easing: 'ease-out-quad', intensity: 1 },
    ],
  },
  {
    id: 'combat-triple-combo',
    name: 'Triple Combo',
    category: 'combat',
    description: 'Three rapid clash strikes',
    totalDuration: 1.5,
    events: [
      { type: 'clash', relativeStartTime: 0, duration: 0.2, easing: 'ease-out-quad', intensity: 0.8 },
      { type: 'clash', relativeStartTime: 0.4, duration: 0.2, easing: 'ease-out-quad', intensity: 0.9 },
      { type: 'clash', relativeStartTime: 0.8, duration: 0.3, easing: 'ease-out-cubic', intensity: 1.0 },
    ],
  },
  {
    id: 'combat-clash-lockup',
    name: 'Clash into Lockup',
    category: 'combat',
    description: 'Clash strike that transitions into saber lock',
    totalDuration: 3.0,
    events: [
      { type: 'clash', relativeStartTime: 0, duration: 0.3, easing: 'ease-out-quad', intensity: 1 },
      { type: 'lockup', relativeStartTime: 0.3, duration: 2.0, easing: 'ease-in-out-quad', intensity: 0.8 },
      { type: 'clash', relativeStartTime: 2.3, duration: 0.2, easing: 'ease-out-quad', intensity: 0.6 },
    ],
  },
  {
    id: 'combat-blast-deflect',
    name: 'Blast Deflection',
    category: 'combat',
    description: 'Deflecting multiple blaster shots',
    totalDuration: 2.5,
    events: [
      { type: 'blast', relativeStartTime: 0, duration: 0.15, easing: 'ease-out-quad', intensity: 0.8 },
      { type: 'blast', relativeStartTime: 0.4, duration: 0.15, easing: 'ease-out-quad', intensity: 0.9 },
      { type: 'blast', relativeStartTime: 0.7, duration: 0.15, easing: 'ease-out-quad', intensity: 0.7 },
      { type: 'blast', relativeStartTime: 1.2, duration: 0.15, easing: 'ease-out-quad', intensity: 1.0 },
      { type: 'blast', relativeStartTime: 1.8, duration: 0.15, easing: 'ease-out-quad', intensity: 0.8 },
    ],
  },
  {
    id: 'combat-force-push',
    name: 'Force Push',
    category: 'combat',
    description: 'Force push with blade flash',
    totalDuration: 1.5,
    events: [
      { type: 'force', relativeStartTime: 0, duration: 0.8, easing: 'ease-out-cubic', intensity: 1 },
      { type: 'clash', relativeStartTime: 0.1, duration: 0.1, easing: 'linear', intensity: 0.5 },
    ],
  },

  // ── Retraction ──
  {
    id: 'retraction-quick',
    name: 'Quick Retract',
    category: 'retraction',
    description: 'Fast clean retraction',
    totalDuration: 0.5,
    events: [
      { type: 'retract', relativeStartTime: 0, duration: 0, easing: 'linear', intensity: 1 },
    ],
  },
  {
    id: 'retraction-dramatic',
    name: 'Dramatic Retract',
    category: 'retraction',
    description: 'Slow retraction with final clash',
    totalDuration: 2.0,
    events: [
      { type: 'clash', relativeStartTime: 0, duration: 0.2, easing: 'ease-out-quad', intensity: 0.5 },
      { type: 'retract', relativeStartTime: 0.5, duration: 0, easing: 'linear', intensity: 1 },
    ],
  },

  // ── Special ──
  {
    id: 'special-duel-choreography',
    name: 'Duel Sequence',
    category: 'special',
    description: 'Full choreographed duel: ignite, clash combo, lockup, force push, retract',
    totalDuration: 8.0,
    events: [
      { type: 'ignite', relativeStartTime: 0, duration: 0, easing: 'linear', intensity: 1 },
      { type: 'clash', relativeStartTime: 1.0, duration: 0.3, easing: 'ease-out-quad', intensity: 0.8 },
      { type: 'clash', relativeStartTime: 1.8, duration: 0.3, easing: 'ease-out-quad', intensity: 0.9 },
      { type: 'clash', relativeStartTime: 2.4, duration: 0.3, easing: 'ease-out-quad', intensity: 1.0 },
      { type: 'lockup', relativeStartTime: 3.0, duration: 1.5, easing: 'ease-in-out-quad', intensity: 0.8 },
      { type: 'clash', relativeStartTime: 4.5, duration: 0.2, easing: 'ease-out-quad', intensity: 0.7 },
      { type: 'blast', relativeStartTime: 5.0, duration: 0.15, easing: 'ease-out-quad', intensity: 0.8 },
      { type: 'blast', relativeStartTime: 5.4, duration: 0.15, easing: 'ease-out-quad', intensity: 0.9 },
      { type: 'force', relativeStartTime: 6.0, duration: 0.8, easing: 'ease-out-cubic', intensity: 1 },
      { type: 'retract', relativeStartTime: 7.5, duration: 0, easing: 'linear', intensity: 1 },
    ],
  },
  {
    id: 'special-melt-through',
    name: 'Melt Through',
    category: 'special',
    description: 'Drag and melt effect sequence (cutting through a door)',
    totalDuration: 4.0,
    events: [
      { type: 'stab', relativeStartTime: 0, duration: 0.3, easing: 'ease-out-quad', intensity: 1 },
      { type: 'melt', relativeStartTime: 0.3, duration: 2.5, easing: 'ease-in-out-quad', intensity: 0.9 },
      { type: 'drag', relativeStartTime: 1.0, duration: 2.0, easing: 'linear', intensity: 0.7 },
    ],
  },
];

/** Get templates by category */
export function getTemplatesByCategory(category: AnimationCategory): AnimationTemplate[] {
  return ANIMATION_TEMPLATES.filter((t) => t.category === category);
}

/** Get all unique categories */
export function getCategories(): AnimationCategory[] {
  return ['ignition', 'idle', 'combat', 'retraction', 'special'];
}
