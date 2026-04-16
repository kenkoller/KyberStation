/**
 * UI Sound Synthesizer — Star Wars console audio for KyberStation.
 *
 * All sounds are synthesized at runtime using the Web Audio API. No external
 * audio files are needed. Sounds are modeled after Star Wars cockpit and
 * bridge console audio: subtle electronic chirps, beeps, and hums.
 *
 * Sound system defaults to OFF. Users enable it during onboarding or settings.
 */

export type UISoundCategory = 'navigation' | 'interaction' | 'feedback' | 'ambient';

export type UISoundId =
  // Navigation
  | 'tab-switch'
  | 'panel-open'
  | 'panel-close'
  | 'modal-open'
  | 'modal-close'
  // Interaction
  | 'button-click'
  | 'toggle-on'
  | 'toggle-off'
  | 'hover'
  // Feedback
  | 'success'
  | 'error'
  | 'copy'
  | 'preset-loaded'
  | 'theme-switch';

export type UISoundPreset = 'silent' | 'subtle' | 'full';

const STORAGE_KEY = 'kyberstation-ui-sounds';

interface SoundSettings {
  preset: UISoundPreset;
  masterVolume: number; // 0-1
  categoryVolumes: Record<UISoundCategory, number>; // 0-1 per category
  categoryMuted: Record<UISoundCategory, boolean>;
}

const DEFAULT_SETTINGS: SoundSettings = {
  preset: 'silent',
  masterVolume: 0.4,
  categoryVolumes: {
    navigation: 0.5,
    interaction: 0.4,
    feedback: 0.6,
    ambient: 0.2,
  },
  categoryMuted: {
    navigation: false,
    interaction: false,
    feedback: false,
    ambient: true, // Ambient off by default even in full mode
  },
};

// Sound → category mapping (used by synthesis engine, commented out while disabled)
// const SOUND_CATEGORIES: Record<UISoundId, UISoundCategory> = {
//   'tab-switch': 'navigation', 'panel-open': 'navigation', 'panel-close': 'navigation',
//   'modal-open': 'navigation', 'modal-close': 'navigation', 'button-click': 'interaction',
//   'toggle-on': 'interaction', 'toggle-off': 'interaction', 'hover': 'interaction',
//   'success': 'feedback', 'error': 'feedback', 'copy': 'feedback',
//   'preset-loaded': 'feedback', 'theme-switch': 'feedback',
// };

/**
 * Core sound synthesizer. Creates short synthesized sounds on demand.
 * Lazy-initializes the AudioContext on first play (browser autoplay policy).
 */
class UISoundEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private settings: SoundSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  // ensureContext — lazy AudioContext init (used by synthesis engine)
  // private ensureContext(): { ctx: AudioContext; master: GainNode } {
  //   if (!this.context) {
  //     this.context = new AudioContext();
  //     this.masterGain = this.context.createGain();
  //     this.masterGain.gain.value = this.settings.masterVolume;
  //     this.masterGain.connect(this.context.destination);
  //   }
  //   if (this.context.state === 'suspended') { this.context.resume(); }
  //   return { ctx: this.context, master: this.masterGain! };
  // }

  // ─── Synthesis engine — commented out while play() is disabled ─────────
  // All synthesis primitives (getVolume, isEnabled, beep, sweep, noiseBurst,
  // chirp, playSound) are preserved as comments for future re-enablement.
  // See the play() JSDoc for context.
  //
  // private getVolume(soundId: UISoundId): number { ... }
  // private isEnabled(soundId: UISoundId): boolean { ... }
  // private beep(freq, duration, volume, envelope?): void { ... }
  // private sweep(startFreq, endFreq, duration, volume, type?): void { ... }
  // private noiseBurst(duration, volume): void { ... }
  // private chirp(freqs, durations, volume, gap?): void { ... }

  // ─── Sound Definitions ───
  // playSound — preserved for future use when sound system is re-enabled
  //
  // private playSound(id: UISoundId): void {
  //   const vol = this.getVolume(id);
  //   if (vol <= 0) return;
  //   switch (id) {
  //     case 'tab-switch':       this.beep(880, 0.06, vol * 0.5); this.beep(1100, 0.08, vol * 0.5); break;
  //     case 'panel-open':       this.noiseBurst(0.08, vol * 0.15); this.sweep(200, 600, 0.15, vol * 0.3); break;
  //     case 'panel-close':      this.sweep(600, 200, 0.12, vol * 0.3); this.noiseBurst(0.04, vol * 0.1); break;
  //     case 'modal-open':       this.chirp([660, 880, 1320], [0.05, 0.05, 0.08], vol * 0.4, 0.01); break;
  //     case 'modal-close':      this.chirp([880, 550], [0.05, 0.06], vol * 0.35, 0.01); break;
  //     case 'button-click':     this.noiseBurst(0.02, vol * 0.2); this.beep(1200, 0.04, vol * 0.4); break;
  //     case 'toggle-on':        this.beep(600, 0.04, vol * 0.4); this.beep(900, 0.06, vol * 0.5, { attack: 0.01 }); break;
  //     case 'toggle-off':       this.beep(800, 0.04, vol * 0.4); this.beep(500, 0.06, vol * 0.3, { attack: 0.01 }); break;
  //     case 'hover':            this.beep(440, 0.03, vol * 0.08); break;
  //     case 'success':          this.chirp([523, 659, 784, 1047], [0.06, 0.06, 0.06, 0.1], vol * 0.4, 0.015); break;
  //     case 'error':            this.beep(220, 0.08, vol * 0.5); this.beep(180, 0.1, vol * 0.4, { attack: 0.01 }); break;
  //     case 'copy':             this.beep(1000, 0.04, vol * 0.35); this.beep(1200, 0.04, vol * 0.35); break;
  //     case 'preset-loaded':    this.chirp([330, 440, 660, 880], [0.08, 0.08, 0.08, 0.15], vol * 0.35, 0.02); break;
  //     case 'theme-switch':     this.noiseBurst(0.1, vol * 0.1); this.sweep(100, 2000, 0.3, vol * 0.2, 'sawtooth'); this.sweep(200, 4000, 0.25, vol * 0.1); break;
  //   }
  // }

  // ─── Public API ───

  /**
   * Play a UI sound by ID.
   *
   * DISABLED: UI sounds are disabled globally while the placeholder
   * synthesized sounds are being replaced with proper audio assets.
   * The sound engine code is preserved for future use — this method
   * simply returns immediately without doing anything.
   */
  play(_id: UISoundId): void {
    return;
  }

  /**
   * Update the sound preset (silent / subtle / full).
   */
  setPreset(preset: UISoundPreset): void {
    this.settings.preset = preset;
    // Apply preset defaults
    if (preset === 'subtle') {
      this.settings.masterVolume = 0.3;
      this.settings.categoryMuted.ambient = true;
    } else if (preset === 'full') {
      this.settings.masterVolume = 0.5;
      this.settings.categoryMuted.ambient = false;
    }
    this.applyVolume();
    this.saveSettings();
  }

  /**
   * Set master volume (0-1).
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    this.saveSettings();
  }

  /**
   * Set volume for a specific category (0-1).
   */
  setCategoryVolume(category: UISoundCategory, volume: number): void {
    this.settings.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  /**
   * Mute/unmute a specific category.
   */
  setCategoryMuted(category: UISoundCategory, muted: boolean): void {
    this.settings.categoryMuted[category] = muted;
    this.saveSettings();
  }

  /**
   * Get current settings (read-only copy).
   */
  getSettings(): Readonly<SoundSettings> {
    return { ...this.settings };
  }

  /**
   * Dispose the audio context. Call on app unmount.
   */
  dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
    }
  }

  // ─── Persistence ───

  private applyVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
  }

  private loadSettings(): SoundSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SoundSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          categoryVolumes: {
            ...DEFAULT_SETTINGS.categoryVolumes,
            ...(parsed.categoryVolumes ?? {}),
          },
          categoryMuted: {
            ...DEFAULT_SETTINGS.categoryMuted,
            ...(parsed.categoryMuted ?? {}),
          },
        };
      }
    } catch {
      // Invalid stored settings, use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage full or disabled
    }
  }
}

// Singleton instance
let instance: UISoundEngine | null = null;

/**
 * Get the shared UI sound engine instance.
 * Creates the instance on first call (lazy init).
 */
export function getUISoundEngine(): UISoundEngine {
  if (!instance) {
    instance = new UISoundEngine();
  }
  return instance;
}

/**
 * Convenience: play a UI sound.
 */
export function playUISound(id: UISoundId): void {
  getUISoundEngine().play(id);
}
