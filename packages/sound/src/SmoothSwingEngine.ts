/**
 * SmoothSwingEngine — crossfades between matched swingl/swingh sound pairs
 * based on real-time blade swing speed, emulating ProffieOS SmoothSwing V2.
 *
 * How it works:
 *   - Each "pair" consists of a low-swing buffer (swingl) and a high-swing
 *     buffer (swingh) that are played simultaneously and looped.
 *   - A gain crossfade driven by the normalised swing speed (0-1) blends
 *     between the two buffers: low gain fades out as high gain fades in.
 *   - When swing speed is below a silence threshold (< 0.1), both gains
 *     are zeroed so only the hum is audible.
 *   - When the user makes a large swing-speed jump (delta > 0.3), a new
 *     random pair is chosen for variety.
 */

interface SwingPair {
  lowBuffer: AudioBuffer;
  highBuffer: AudioBuffer;
}

interface ActivePair {
  lowSource: AudioBufferSourceNode;
  highSource: AudioBufferSourceNode;
  lowGain: GainNode;
  highGain: GainNode;
}

const SILENCE_THRESHOLD = 0.1;
const PAIR_SWITCH_DELTA = 0.3;
const GAIN_RAMP_TIME = 0.03; // 30 ms for smooth crossfade transitions

export class SmoothSwingEngine {
  private context: AudioContext;
  private output: GainNode;
  private pairs: SwingPair[] = [];
  private activePair: ActivePair | null = null;
  private currentPairIndex = -1;
  private lastSwingSpeed = 0;
  private _isPlaying = false;

  constructor(context: AudioContext, output: GainNode) {
    this.context = context;
    this.output = output;
  }

  /**
   * Store the matched buffer pairs. lowBuffers[i] pairs with highBuffers[i].
   * Any mismatched lengths are truncated to the shorter list.
   */
  loadPairs(lowBuffers: AudioBuffer[], highBuffers: AudioBuffer[]): void {
    const count = Math.min(lowBuffers.length, highBuffers.length);
    this.pairs = [];
    for (let i = 0; i < count; i++) {
      this.pairs.push({
        lowBuffer: lowBuffers[i],
        highBuffer: highBuffers[i],
      });
    }
  }

  /** Begin playback — picks a random pair and starts looping. */
  start(): void {
    if (this._isPlaying || this.pairs.length === 0) return;

    this._isPlaying = true;
    this.lastSwingSpeed = 0;
    this.startPair(this.randomPairIndex());
  }

  /** Stop all swing-sound playback. */
  stop(): void {
    if (!this._isPlaying) return;

    this._isPlaying = false;
    this.stopActivePair();
    this.lastSwingSpeed = 0;
  }

  /**
   * Called every frame with the current normalised swing speed (0-1).
   *
   * - Below SILENCE_THRESHOLD: silence both channels.
   * - Above threshold: crossfade low/high gains proportionally.
   * - Large delta (> PAIR_SWITCH_DELTA): switch to a new random pair.
   */
  update(swingSpeed: number): void {
    if (!this._isPlaying || !this.activePair) return;

    const clamped = Math.max(0, Math.min(1, swingSpeed));

    // Switch pair on large velocity change for variety
    if (
      this.pairs.length > 1 &&
      Math.abs(clamped - this.lastSwingSpeed) > PAIR_SWITCH_DELTA
    ) {
      this.switchPair();
    }

    this.lastSwingSpeed = clamped;

    const now = this.context.currentTime;
    const { lowGain, highGain } = this.activePair;

    if (clamped < SILENCE_THRESHOLD) {
      // Below threshold — silence
      lowGain.gain.setTargetAtTime(0, now, GAIN_RAMP_TIME);
      highGain.gain.setTargetAtTime(0, now, GAIN_RAMP_TIME);
    } else {
      // Map SILENCE_THRESHOLD..1 to 0..1 for the crossfade factor
      const t = (clamped - SILENCE_THRESHOLD) / (1 - SILENCE_THRESHOLD);
      const lowLevel = 1 - t;
      const highLevel = t;
      lowGain.gain.setTargetAtTime(lowLevel, now, GAIN_RAMP_TIME);
      highGain.gain.setTargetAtTime(highLevel, now, GAIN_RAMP_TIME);
    }
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Clean up all resources. */
  dispose(): void {
    this.stop();
    this.pairs = [];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private randomPairIndex(): number {
    return Math.floor(Math.random() * this.pairs.length);
  }

  /** Start a specific pair by index. */
  private startPair(index: number): void {
    if (this.pairs.length === 0) return;

    this.stopActivePair();
    this.currentPairIndex = index;
    const pair = this.pairs[index];

    const lowGain = this.context.createGain();
    lowGain.gain.value = 0;
    lowGain.connect(this.output);

    const highGain = this.context.createGain();
    highGain.gain.value = 0;
    highGain.connect(this.output);

    const lowSource = this.context.createBufferSource();
    lowSource.buffer = pair.lowBuffer;
    lowSource.loop = true;
    lowSource.connect(lowGain);

    const highSource = this.context.createBufferSource();
    highSource.buffer = pair.highBuffer;
    highSource.loop = true;
    highSource.connect(highGain);

    lowSource.start();
    highSource.start();

    this.activePair = { lowSource, highSource, lowGain, highGain };
  }

  /** Stop and disconnect the currently playing pair. */
  private stopActivePair(): void {
    if (!this.activePair) return;

    const { lowSource, highSource, lowGain, highGain } = this.activePair;

    try { lowSource.stop(); } catch { /* already stopped */ }
    try { highSource.stop(); } catch { /* already stopped */ }

    lowSource.disconnect();
    highSource.disconnect();
    lowGain.disconnect();
    highGain.disconnect();

    this.activePair = null;
  }

  /** Switch to a different random pair (avoids repeating the same one). */
  private switchPair(): void {
    if (this.pairs.length <= 1) return;

    let next = this.randomPairIndex();
    // Avoid picking the same pair
    while (next === this.currentPairIndex) {
      next = this.randomPairIndex();
    }

    this.startPair(next);
  }
}
