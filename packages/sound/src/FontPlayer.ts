/**
 * Minimal sound font player for KyberStation.
 *
 * Manages hum loop playback and one-shot sound effects, providing an output
 * GainNode that the AudioFilterChain can connect to.
 */
export class FontPlayer {
  private context: AudioContext;
  private outputNode: GainNode;
  private humSource: AudioBufferSourceNode | null = null;
  private disposed = false;

  constructor(context: AudioContext) {
    this.context = context;
    this.outputNode = context.createGain();
    this.outputNode.gain.value = 1.0;
  }

  /** Get the output node to connect to the filter chain or destination */
  getOutput(): GainNode {
    return this.outputNode;
  }

  /** Load an audio file from a URL into an AudioBuffer */
  async loadBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.context.decodeAudioData(arrayBuffer);
  }

  /**
   * Start playing a hum loop. Stops any existing hum first.
   * The hum loops indefinitely until stopHum() is called.
   */
  playHum(buffer: AudioBuffer): void {
    if (this.disposed) return;

    this.stopHum();

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.outputNode);
    source.start();
    this.humSource = source;
  }

  /** Stop the current hum loop if one is playing */
  stopHum(): void {
    if (this.humSource) {
      try {
        this.humSource.stop();
      } catch {
        // Already stopped
      }
      this.humSource.disconnect();
      this.humSource = null;
    }
  }

  /**
   * Play a one-shot sound effect (clash, blast, swing, etc.).
   * The buffer plays once and auto-cleans up on completion.
   */
  playOneShot(buffer: AudioBuffer): void {
    if (this.disposed) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputNode);

    source.onended = () => {
      source.disconnect();
    };

    source.start();
  }

  /** Clean up all resources */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopHum();
    this.outputNode.disconnect();
  }
}
