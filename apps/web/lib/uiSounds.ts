/**
 * UI Sound Synthesizer — Star Wars console audio for BladeForge.
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

const STORAGE_KEY = 'bladeforge-ui-sounds';

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

// Sound → category mapping
const SOUND_CATEGORIES: Record<UISoundId, UISoundCategory> = {
  'tab-switch': 'navigation',
  'panel-open': 'navigation',
  'panel-close': 'navigation',
  'modal-open': 'navigation',
  'modal-close': 'navigation',
  'button-click': 'interaction',
  'toggle-on': 'interaction',
  'toggle-off': 'interaction',
  'hover': 'interaction',
  'success': 'feedback',
  'error': 'feedback',
  'copy': 'feedback',
  'preset-loaded': 'feedback',
  'theme-switch': 'feedback',
};

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

  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.settings.masterVolume;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return { ctx: this.context, master: this.masterGain! };
  }

  private getVolume(soundId: UISoundId): number {
    const category = SOUND_CATEGORIES[soundId];
    if (this.settings.categoryMuted[category]) return 0;
    return this.settings.masterVolume * this.settings.categoryVolumes[category];
  }

  private isEnabled(soundId: UISoundId): boolean {
    if (this.settings.preset === 'silent') return false;
    const category = SOUND_CATEGORIES[soundId];
    if (this.settings.preset === 'subtle' && category === 'ambient') return false;
    return !this.settings.categoryMuted[category];
  }

  // ─── Synthesis Primitives ───

  /**
   * Short sine tone — the foundation of most console beeps.
   */
  private beep(
    freq: number,
    duration: number,
    volume: number,
    envelope?: { attack?: number; decay?: number },
  ): void {
    const { ctx, master } = this.ensureContext();
    const now = ctx.currentTime;
    const attack = envelope?.attack ?? 0.005;
    const decay = envelope?.decay ?? 0.02;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + duration - decay);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /**
   * Frequency sweep — for slider interactions and whoosh effects.
   */
  private sweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ): void {
    const { ctx, master } = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.setValueAtTime(volume, now + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /**
   * Noise burst — for clicks and mechanical sounds.
   */
  private noiseBurst(duration: number, volume: number): void {
    const { ctx, master } = this.ensureContext();
    const now = ctx.currentTime;

    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to shape the noise into a "click"
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(now);
    source.stop(now + duration + 0.01);
  }

  /**
   * Multi-tone chirp — R2-D2 style compound beep.
   */
  private chirp(
    freqs: number[],
    durations: number[],
    volume: number,
    gap: number = 0.02,
  ): void {
    let offset = 0;
    for (let i = 0; i < freqs.length; i++) {
      const { ctx, master } = this.ensureContext();
      const now = ctx.currentTime + offset;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dur = durations[i] ?? durations[0];

      osc.type = 'sine';
      osc.frequency.value = freqs[i];

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.003);
      gain.gain.setValueAtTime(volume, now + dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, now + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + dur + 0.01);

      offset += dur + gap;
    }
  }

  // ─── Sound Definitions ───

  private playSound(id: UISoundId): void {
    const vol = this.getVolume(id);
    if (vol <= 0) return;

    switch (id) {
      // ─── Navigation ───
      case 'tab-switch':
        // Soft console beep — two quick tones ascending
        this.beep(880, 0.06, vol * 0.5);
        this.beep(1100, 0.08, vol * 0.5);
        break;

      case 'panel-open':
        // Hydraulic hiss — noise burst + ascending sweep
        this.noiseBurst(0.08, vol * 0.15);
        this.sweep(200, 600, 0.15, vol * 0.3);
        break;

      case 'panel-close':
        // Descending sweep + soft click
        this.sweep(600, 200, 0.12, vol * 0.3);
        this.noiseBurst(0.04, vol * 0.1);
        break;

      case 'modal-open':
        // Comm channel open — ascending tri-tone
        this.chirp([660, 880, 1320], [0.05, 0.05, 0.08], vol * 0.4, 0.01);
        break;

      case 'modal-close':
        // Comm channel close — descending bi-tone
        this.chirp([880, 550], [0.05, 0.06], vol * 0.35, 0.01);
        break;

      // ─── Interaction ───
      case 'button-click':
        // Tactile click + beep
        this.noiseBurst(0.02, vol * 0.2);
        this.beep(1200, 0.04, vol * 0.4);
        break;

      case 'toggle-on':
        // System activation chirp — quick ascending
        this.beep(600, 0.04, vol * 0.4);
        this.beep(900, 0.06, vol * 0.5, { attack: 0.01 });
        break;

      case 'toggle-off':
        // System deactivation — quick descending, lower pitch
        this.beep(800, 0.04, vol * 0.4);
        this.beep(500, 0.06, vol * 0.3, { attack: 0.01 });
        break;

      case 'hover':
        // Very subtle electronic hum swell
        this.beep(440, 0.03, vol * 0.08);
        break;

      // ─── Feedback ───
      case 'success':
        // R2-D2 affirmative — ascending cheerful chirp
        this.chirp([523, 659, 784, 1047], [0.06, 0.06, 0.06, 0.1], vol * 0.4, 0.015);
        break;

      case 'error':
        // Imperial alarm — low pulsing tone
        this.beep(220, 0.08, vol * 0.5);
        this.beep(180, 0.1, vol * 0.4, { attack: 0.01 });
        break;

      case 'copy':
        // Data transfer — quick double beep
        this.beep(1000, 0.04, vol * 0.35);
        this.beep(1200, 0.04, vol * 0.35);
        break;

      case 'preset-loaded':
        // Holocron activation — resonant ascending chord
        this.chirp([330, 440, 660, 880], [0.08, 0.08, 0.08, 0.15], vol * 0.35, 0.02);
        break;

      case 'theme-switch':
        // Hyperdrive engage — sweep from low to high with noise
        this.noiseBurst(0.1, vol * 0.1);
        this.sweep(100, 2000, 0.3, vol * 0.2, 'sawtooth');
        this.sweep(200, 4000, 0.25, vol * 0.1);
        break;
    }
  }

  // ─── Public API ───

  /**
   * Play a UI sound by ID.
   * No-ops if sounds are disabled or the category is muted.
   */
  play(id: UISoundId): void {
    if (!this.isEnabled(id)) return;
    this.playSound(id);
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
