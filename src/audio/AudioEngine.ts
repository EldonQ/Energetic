/**
 * Singleton AudioEngine wrapping AudioContext + AnalyserNode.
 * - Initialize once (lazily, on user gesture).
 * - Bind to one HTMLAudioElement; switching tracks just changes its src.
 * - Calling createMediaElementSource on the same element twice throws,
 *   so we keep one source per element across the lifetime of the app.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private el: HTMLAudioElement | null = null;
  private buffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private initialized = false;

  /** Attach to an audio element. Must be called BEFORE init(). */
  attach(el: HTMLAudioElement) {
    this.el = el;
  }

  /** Lazily create AudioContext on user gesture. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.initialized || !this.el) return;
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.source = this.ctx.createMediaElementSource(this.el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;
    this.buffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount)); // 512
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.initialized = true;
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  sample(): Uint8Array<ArrayBuffer> {
    if (this.analyser) this.analyser.getByteFrequencyData(this.buffer);
    return this.buffer;
  }

  get ready(): boolean {
    return this.initialized;
  }
}

export const audioEngine = new AudioEngine();
