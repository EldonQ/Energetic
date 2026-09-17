export type IntensityTier = 'ambient' | 'pulse';

export interface AnalyzerTuning {
  bassEnvAR: [number, number];
  midEnvAR: [number, number];
  trebleEnvAR: [number, number];
  onsetAR: [number, number];
  eventMode: 'beat' | 'swell';
  pulseDecayPerSec: number;
  spectrumFollow: number;
  normDecayPerSec: number;
}

export const ANALYZER_TUNINGS: Record<IntensityTier, AnalyzerTuning> = {
  ambient: {
    bassEnvAR: [0.50, 0.04],
    midEnvAR: [0.45, 0.05],
    trebleEnvAR: [0.55, 0.06],
    onsetAR: [0.60, 0.08],
    eventMode: 'swell',
    pulseDecayPerSec: 0.4,
    spectrumFollow: 0.08,
    normDecayPerSec: 0.06,
  },
  pulse: {
    bassEnvAR: [0.7, 0.06],
    midEnvAR: [0.55, 0.08],
    trebleEnvAR: [0.65, 0.10],
    onsetAR: [0.85, 0.12],
    eventMode: 'beat',
    pulseDecayPerSec: 3.0,
    spectrumFollow: 0,
    normDecayPerSec: 0.18,
  },
};

export interface AudioFeatures {
  bass: number;
  mid: number;
  treble: number;
  overall: number;
  bassEnv: number;
  midEnv: number;
  trebleEnv: number;
  onset: number;
  beat: boolean;
  beatPulse: number;
  /** Elapsed analysis time in milliseconds, not a wall-clock timestamp. */
  lastBeatAt: number;
  bassNorm: number;
  midNorm: number;
  trebleNorm: number;
  levelNorm: number;
  /** RMS of byte-frequency magnitudes, not waveform RMS or calibrated loudness. */
  level: number;
  spectrum: Float32Array;
}

export function createEmptyFeatures(numBands = 32): AudioFeatures {
  return {
    bass: 0, mid: 0, treble: 0, overall: 0,
    bassEnv: 0, midEnv: 0, trebleEnv: 0,
    onset: 0, beat: false, beatPulse: 0, lastBeatAt: 0,
    bassNorm: 0, midNorm: 0, trebleNorm: 0, levelNorm: 0,
    level: 0,
    spectrum: new Float32Array(numBands),
  };
}

function avg(buf: Uint8Array, start: number, end: number): number {
  if (end <= start || end > buf.length) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += buf[i];
  return sum / (end - start) / 255;
}

function envFollow(prev: number, target: number, attack: number, release: number, dt: number): number {
  const k = target > prev ? attack : release;
  const a = 1 - Math.exp(-k * dt * 60);
  return prev + (target - prev) * a;
}

class PeakTracker {
  private peak: number;
  constructor(private decayPerSec: number, private floor: number) {
    this.peak = floor;
  }
  setDecay(perSec: number): void {
    this.decayPerSec = perSec;
  }
  update(v: number, dt: number): number {
    this.peak = Math.max(this.floor, v, this.peak - this.decayPerSec * dt);
    return Math.min(1, v / this.peak);
  }
  reset(): void {
    this.peak = this.floor;
  }
}

class RunningStats {
  private mean = 0;
  private variance = 0;

  scoreAndPush(v: number, dt: number): number {
    // Score against history; including this sample first caps detectable transients.
    const score = (v - this.mean) / Math.max(0.002, Math.sqrt(this.variance));
    const a = 1 - Math.exp(-2 * dt);
    const delta = v - this.mean;
    this.mean += delta * a;
    this.variance = (1 - a) * (this.variance + a * delta * delta);
    return Math.max(0, score);
  }
  reset(): void {
    this.mean = this.variance = 0;
  }
}

export class AudioAnalyzer {
  readonly features: AudioFeatures;
  private prevSpectrum: Float32Array;
  private logBandBounds: Int32Array;
  private bassEnd: number;
  private midEnd: number;
  private trebleEnd: number;
  private fluxStart: number;
  private fluxEnd: number;
  private primed = false;
  private aboveOnset = false;
  private bassPk = new PeakTracker(0.18, 0.04);
  private midPk = new PeakTracker(0.18, 0.04);
  private treblePk = new PeakTracker(0.18, 0.04);
  private levelPk = new PeakTracker(0.18, 0.04);
  private onsetPk = new PeakTracker(0.4, 0.5);
  private fluxStats = new RunningStats();
  private tier: IntensityTier = 'pulse';
  private tuning: AnalyzerTuning = ANALYZER_TUNINGS.pulse;
  private swellBaseline = 0;
  private elapsedMs = 0;

  constructor(opts?: { numLogBands?: number; sampleRate?: number; fftSize?: number }) {
    const n = opts?.numLogBands ?? 32;
    const fftSize = opts?.fftSize ?? 1024;
    const sampleRate = opts?.sampleRate ?? 44100;
    const bins = fftSize / 2;
    const toBin = (hz: number) => Math.min(bins, Math.ceil(hz * fftSize / sampleRate));
    this.bassEnd = toBin(250);
    this.midEnd = toBin(4000);
    this.trebleEnd = toBin(14000);
    this.fluxStart = toBin(80);
    this.fluxEnd = toBin(8000);
    this.features = createEmptyFeatures(n);
    this.prevSpectrum = new Float32Array(bins);
    this.logBandBounds = new Int32Array(n + 1);
    const logA = Math.log(80);
    const logB = Math.log(Math.min(14000, sampleRate / 2));
    for (let i = 0; i <= n; i++) {
      this.logBandBounds[i] = toBin(Math.exp(logA + (logB - logA) * i / n));
    }
  }

  setTier(tier: IntensityTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.tuning = ANALYZER_TUNINGS[tier];
    const d = this.tuning.normDecayPerSec;
    this.bassPk.setDecay(d);
    this.midPk.setDecay(d);
    this.treblePk.setDecay(d);
    this.levelPk.setDecay(d);
    this.swellBaseline = this.features.overall;
  }

  process(buf: Uint8Array, dt: number): AudioFeatures {
    const f = this.features;
    const t = this.tuning;
    const safeDt = Math.max(0.0005, Math.min(dt, 0.05));
    this.elapsedMs += safeDt * 1000;
    const bassRaw = avg(buf, 0, this.bassEnd);
    const midRaw = avg(buf, this.bassEnd, this.midEnd);
    const trebleRaw = avg(buf, this.midEnd, this.trebleEnd);
    const overallRaw = avg(buf, 0, this.trebleEnd);
    const a = 1 - Math.exp(-0.25 * safeDt * 60);
    f.bass += (bassRaw - f.bass) * a;
    f.mid += (midRaw - f.mid) * a;
    f.treble += (trebleRaw - f.treble) * a;
    f.overall += (overallRaw - f.overall) * a;
    f.bassEnv = envFollow(f.bassEnv, bassRaw, ...t.bassEnvAR, safeDt);
    f.midEnv = envFollow(f.midEnv, midRaw, ...t.midEnvAR, safeDt);
    f.trebleEnv = envFollow(f.trebleEnv, trebleRaw, ...t.trebleEnvAR, safeDt);

    const spec = f.spectrum;
    const aSpec = t.spectrumFollow > 0 ? 1 - Math.exp(-t.spectrumFollow * safeDt * 60) : 1;
    for (let i = 0; i < spec.length; i++) {
      const start = this.logBandBounds[i];
      const end = Math.min(buf.length, Math.max(start + 1, this.logBandBounds[i + 1]));
      spec[i] += (avg(buf, start, end) - spec[i]) * aSpec;
    }

    let flux = 0;
    const hi = Math.min(buf.length, this.fluxEnd);
    for (let i = this.fluxStart; i < hi; i++) {
      const cur = buf[i] / 255;
      if (this.primed) flux += Math.max(0, cur - this.prevSpectrum[i]);
      this.prevSpectrum[i] = cur;
    }
    // Scale differences to a 60 Hz interval so a continuous rise is refresh-rate independent.
    flux /= Math.max(1, hi - this.fluxStart) * safeDt * 60;
    if (!this.primed) this.swellBaseline = overallRaw;
    this.primed = true;
    const sigmas = this.fluxStats.scoreAndPush(flux, safeDt);
    const normOnset = this.onsetPk.update(sigmas, safeDt);
    f.onset = envFollow(f.onset, normOnset, ...t.onsetAR, safeDt);

    f.beat = false;
    f.beatPulse = Math.max(0, f.beatPulse - safeDt * t.pulseDecayPerSec);
    const sinceLast = this.elapsedMs - f.lastBeatAt;
    const aboveOnset = sigmas > 1.6 && flux > 0.002 && f.bassEnv > 0.12;
    if (t.eventMode === 'beat') {
      if (aboveOnset && !this.aboveOnset && sinceLast > 80) f.beat = true;
    } else {
      this.swellBaseline += (overallRaw - this.swellBaseline) * (1 - Math.exp(-0.33 * safeDt));
      if (overallRaw - this.swellBaseline > 0.035 && overallRaw > 0.08 && sinceLast > 1800) {
        f.beat = true;
      }
    }
    this.aboveOnset = aboveOnset;
    if (f.beat) {
      f.lastBeatAt = this.elapsedMs;
      f.beatPulse = 1;
    }

    f.bassNorm = this.bassPk.update(f.bassEnv, safeDt);
    f.midNorm = this.midPk.update(f.midEnv, safeDt);
    f.trebleNorm = this.treblePk.update(f.trebleEnv, safeDt);
    let sumSq = 0;
    for (let i = 0; i < hi; i++) sumSq += (buf[i] / 255) ** 2;
    f.level = hi > 0 ? Math.sqrt(sumSq / hi) : 0;
    f.levelNorm = this.levelPk.update(f.level, safeDt);
    return f;
  }

  reset(): void {
    const spectrum = this.features.spectrum;
    spectrum.fill(0);
    Object.assign(this.features, createEmptyFeatures(0), { spectrum });
    this.prevSpectrum.fill(0);
    this.bassPk.reset();
    this.midPk.reset();
    this.treblePk.reset();
    this.levelPk.reset();
    this.onsetPk.reset();
    this.fluxStats.reset();
    this.swellBaseline = this.elapsedMs = 0;
    this.primed = this.aboveOnset = false;
  }
}
