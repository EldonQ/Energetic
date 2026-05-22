/**
 * Two professional reactivity tiers — applied as a post-process pass over the
 * computed AudioFeatures. Lets the user choose between gallery-quiet and
 * the engineer-tuned default without touching per-viz dials.
 *
 *   ambient : 安静展厅 — onsets / beats softened, swings narrowed.
 *             A calmer-than-default mode for ambient / classical listening.
 *   pulse   : 标准律动 — engineer-tuned defaults; identity transform
 *             (= no post-processing). The recommended baseline for most music.
 *
 * Coefficients multiply the analyser's "punchy" outputs. They never affect the
 * raw legacy bands (so colour mixing & smooth motion stay calm), only the
 * reactive accents.
 */
export type IntensityTier = 'ambient' | 'pulse';
export interface IntensityProfile {
  envScale: number;   // bassEnv / midEnv / trebleEnv multiplier
  onsetScale: number; // onset multiplier
  beatScale: number;  // beatPulse multiplier
  normScale: number;  // *Norm + levelNorm multiplier (used for big swings)
  /** Whether a "beat" is allowed to flip true at all. Keeps Ambient calm. */
  beatPassThrough: number; // 0 = no beat events, 1 = all, in-between = probability
}
export const INTENSITY_PROFILES: Record<IntensityTier, IntensityProfile> = {
  ambient: { envScale: 0.55, onsetScale: 0.45, beatScale: 0.45, normScale: 0.7, beatPassThrough: 0.6 },
  // Identity transform — matches the analyser's raw output, i.e. the
  // "pre-intensity-tier" behaviour from earlier builds.
  pulse:   { envScale: 1.0,  onsetScale: 1.0,  beatScale: 1.0,  normScale: 1.0, beatPassThrough: 1.0 },
};

/**
 * Unified per-frame audio analysis.
 *
 * Inputs : raw byte FFT (length = 512 with fftSize=1024).
 * Outputs: a rich feature set every viz can consume — envelopes (fast attack /
 *          slow release), onset/beat detection (spectral flux), adaptive
 *          normalisation, log-spaced spectrum, RMS loudness.
 *
 * Frequency layout (44.1 kHz, 512 bins ≈ 43 Hz / bin):
 *   bass   ~20–250 Hz  → bins 0..6
 *   mid    ~250–4000   → bins 6..93
 *   treble ~4000–14000 → bins 93..325
 *
 * The analyser is stateful — instantiate ONE per audio source and call
 * `process(buf, dtSec)` every frame.
 */

export interface AudioFeatures {
  // Raw smoothed bands (legacy, symmetric lerp) — kept for back-compat.
  bass: number;
  mid: number;
  treble: number;
  overall: number;

  // Envelope-followed bands: fast attack (sharp punch up) / slow release
  // (afterglow). USE THESE for "punchy" reactions — drums actually hit.
  bassEnv: number;
  midEnv: number;
  trebleEnv: number;

  // Onset / beat
  /** Normalised spectral-flux burst, 0..~1, exp-decays after a hit. */
  onset: number;
  /** TRUE on the frame a beat was detected (false otherwise). */
  beat: boolean;
  /** 0..1 decaying impulse latched on every detected beat (~300 ms decay). */
  beatPulse: number;
  /** Wall-clock ms timestamp of last detected beat (0 = none). */
  lastBeatAt: number;

  // Adaptive-normalised values (always reach ~1.0 on the track's peaks).
  bassNorm: number;
  midNorm: number;
  trebleNorm: number;
  levelNorm: number;

  // Overall loudness (RMS over the audible spectrum), 0..1.
  level: number;

  // Log-spaced spectrum (32 bands, 0..1). For Monolith / Glyph-style vizs.
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

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

function avg(buf: Uint8Array, start: number, end: number): number {
  if (end <= start || end > buf.length) return 0;
  let s = 0;
  for (let i = start; i < end; i++) s += buf[i];
  return s / (end - start) / 255;
}

/**
 * Asymmetric envelope follower: rapid attack, slow release.
 *  - `attack`  in [0..1]: fraction of the gap covered per frame on the way up
 *  - `release` in [0..1]: fraction of the gap covered per frame on the way down
 * Tuned for 60 fps. The follower is frame-rate compensated via `dt`.
 */
function envFollow(prev: number, target: number, attack: number, release: number, dt: number): number {
  const k = target > prev ? attack : release;
  // exp-style smoothing so behaviour is roughly fps-independent
  const a = 1 - Math.exp(-k * dt * 60);
  return prev + (target - prev) * a;
}

/** Adaptive max-tracker for self-normalisation. */
class PeakTracker {
  private peak = 0.0001;
  private floor: number;
  /** decay per second when no new peak (linear). */
  private decayPerSec: number;
  constructor(decayPerSec = 0.12, floor = 0.05) {
    this.decayPerSec = decayPerSec;
    this.floor = floor;
  }
  update(v: number, dt: number): number {
    if (v > this.peak) this.peak = v;
    else this.peak = Math.max(this.floor, this.peak - this.decayPerSec * dt);
    return Math.min(1, v / this.peak);
  }
}

/** Rolling mean + std for onset detection. */
class RunningStats {
  private mean = 0;
  private varVal = 0;
  /** smoothing factor per second */
  private k: number;
  constructor(k = 0.5) { this.k = k; }
  push(v: number, dt: number): { mean: number; std: number } {
    const a = 1 - Math.exp(-this.k * dt * 60);
    const delta = v - this.mean;
    this.mean += delta * a;
    this.varVal += ((delta * delta) - this.varVal) * a;
    return { mean: this.mean, std: Math.sqrt(this.varVal) };
  }
}

// ----------------------------------------------------------------------------
// Main analyser
// ----------------------------------------------------------------------------

export class AudioAnalyzer {
  readonly features: AudioFeatures;

  private prevSpectrum: Float32Array;
  private logBandBounds: Int32Array; // start indices for each log band; length N+1

  // Peak trackers — adaptive normalisation
  private bassPk = new PeakTracker(0.18, 0.04);
  private midPk = new PeakTracker(0.18, 0.04);
  private treblePk = new PeakTracker(0.18, 0.04);
  private levelPk = new PeakTracker(0.18, 0.04);
  private onsetPk = new PeakTracker(0.4, 0.5);

  // Onset detector state
  private fluxStats = new RunningStats(0.35);
  private refractoryMs = 80;            // min ms between beats
  private onsetThreshold = 1.6;          // sigmas above rolling mean

  // Timekeeping
  private wallMs = 0;

  constructor(opts?: { numLogBands?: number; minBin?: number; maxBin?: number; binsHint?: number }) {
    const n = opts?.numLogBands ?? 32;
    const minBin = Math.max(1, opts?.minBin ?? 2);
    const maxBin = opts?.maxBin ?? 320; // ~14 kHz with fftSize=1024
    this.features = createEmptyFeatures(n);

    // Pre-compute log-spaced bin boundaries.
    this.logBandBounds = new Int32Array(n + 1);
    const logA = Math.log(minBin);
    const logB = Math.log(maxBin);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bin = Math.round(Math.exp(logA + (logB - logA) * t));
      this.logBandBounds[i] = Math.max(0, bin);
    }
    // Spectrum we diff against for spectral flux — sized to nBins hint or 512.
    this.prevSpectrum = new Float32Array(opts?.binsHint ?? 512);
  }

  /**
   * Update all features from a raw byte FFT buffer.
   * `dt` is delta-time in seconds (clamp upstream to avoid huge jumps).
   */
  process(buf: Uint8Array, dt: number): AudioFeatures {
    const f = this.features;
    const safeDt = Math.max(0.0005, Math.min(dt, 0.05));
    this.wallMs += safeDt * 1000;

    // ---- 1. Raw smoothed bands (legacy)
    const bassRaw = avg(buf, 0, 6);
    const midRaw = avg(buf, 6, 93);
    const trebleRaw = avg(buf, 93, 325);
    const overallRaw = avg(buf, 0, 325);
    const a1 = 1 - Math.exp(-0.25 * safeDt * 60);
    f.bass += (bassRaw - f.bass) * a1;
    f.mid += (midRaw - f.mid) * a1;
    f.treble += (trebleRaw - f.treble) * a1;
    f.overall += (overallRaw - f.overall) * a1;

    // ---- 2. Envelope followers (fast attack / slow release)
    //   bass:   wants very punchy → 0.7 / 0.06
    //   mid:    snappy             → 0.55 / 0.08
    //   treble: shimmery quick     → 0.65 / 0.10
    f.bassEnv = envFollow(f.bassEnv, bassRaw, 0.7, 0.06, safeDt);
    f.midEnv = envFollow(f.midEnv, midRaw, 0.55, 0.08, safeDt);
    f.trebleEnv = envFollow(f.trebleEnv, trebleRaw, 0.65, 0.10, safeDt);

    // ---- 3. Log-spaced spectrum (32 bands)
    const spec = f.spectrum;
    for (let i = 0; i < spec.length; i++) {
      const a = this.logBandBounds[i];
      const b = Math.max(a + 1, this.logBandBounds[i + 1]);
      spec[i] = avg(buf, a, b);
    }

    // ---- 4. Spectral flux for onset detection.
    //   Sum of positive differences between successive frame magnitudes
    //   over the perceptual range (skip rumble, skip ultra-highs).
    const prev = this.prevSpectrum;
    let flux = 0;
    const lo = 2;
    const hi = Math.min(buf.length, 200); // ~8 kHz cutoff for percussive content
    for (let i = lo; i < hi; i++) {
      const cur = buf[i] / 255;
      const d = cur - (prev[i] ?? 0);
      if (d > 0) flux += d;
      prev[i] = cur;
    }
    flux = flux / (hi - lo); // normalise to 0..1-ish

    const stats = this.fluxStats.push(flux, safeDt);
    // Convert flux into a "sigmas above mean" score; clamp to non-negative
    const sigmas = stats.std > 1e-6 ? (flux - stats.mean) / stats.std : 0;

    // Onset signal: scaled & clamped sigma score, peak-normalised.
    const rawOnset = Math.max(0, sigmas);
    const normOnset = this.onsetPk.update(rawOnset, safeDt);
    // Envelope-follow the onset to make it visible-but-spikey
    f.onset = envFollow(f.onset, normOnset, 0.85, 0.12, safeDt);

    // ---- 5. Beat detection with refractory period.
    f.beat = false;
    const sinceLast = this.wallMs - (f.lastBeatAt || 0);
    if (sigmas > this.onsetThreshold && sinceLast > this.refractoryMs && f.bassEnv > 0.12) {
      f.beat = true;
      f.lastBeatAt = this.wallMs;
      f.beatPulse = 1;
    } else {
      // exponential decay (~300 ms half-life)
      f.beatPulse = Math.max(0, f.beatPulse - safeDt * 3.0);
    }

    // ---- 6. Adaptive normalisation
    f.bassNorm = this.bassPk.update(f.bassEnv, safeDt);
    f.midNorm = this.midPk.update(f.midEnv, safeDt);
    f.trebleNorm = this.treblePk.update(f.trebleEnv, safeDt);

    // ---- 7. RMS loudness
    let sumSq = 0;
    for (let i = 0; i < hi; i++) {
      const v = buf[i] / 255;
      sumSq += v * v;
    }
    f.level = Math.sqrt(sumSq / hi);
    f.levelNorm = this.levelPk.update(f.level, safeDt);

    return f;
  }

  reset(): void {
    const f = this.features;
    f.bass = f.mid = f.treble = f.overall = 0;
    f.bassEnv = f.midEnv = f.trebleEnv = 0;
    f.onset = f.beatPulse = 0;
    f.beat = false;
    f.lastBeatAt = 0;
    f.bassNorm = f.midNorm = f.trebleNorm = f.levelNorm = 0;
    f.level = 0;
    for (let i = 0; i < f.spectrum.length; i++) f.spectrum[i] = 0;
    for (let i = 0; i < this.prevSpectrum.length; i++) this.prevSpectrum[i] = 0;
    this.wallMs = 0;
  }
}

/**
 * Apply a global intensity profile to the analyser's features IN PLACE.
 * Call this every frame right after `analyzer.process(...)`.
 *
 * The analyser's own state (envelopes, peak trackers, onset stats) is
 * untouched — only the values the visualisations READ get scaled, so the
 * detector still adapts correctly to the track.
 */
export function applyIntensity(f: AudioFeatures, profile: IntensityProfile): void {
  const { envScale, onsetScale, beatScale, normScale, beatPassThrough } = profile;
  f.bassEnv = Math.min(1.4, f.bassEnv * envScale);
  f.midEnv = Math.min(1.4, f.midEnv * envScale);
  f.trebleEnv = Math.min(1.4, f.trebleEnv * envScale);
  f.onset = Math.min(1.6, f.onset * onsetScale);
  f.beatPulse = Math.min(1.6, f.beatPulse * beatScale);
  f.bassNorm = Math.min(1.4, f.bassNorm * normScale);
  f.midNorm = Math.min(1.4, f.midNorm * normScale);
  f.trebleNorm = Math.min(1.4, f.trebleNorm * normScale);
  f.levelNorm = Math.min(1.4, f.levelNorm * normScale);
  // Ambient: occasionally suppress beat events so the scene rests
  if (beatPassThrough < 1 && f.beat) {
    if (Math.random() > beatPassThrough) f.beat = false;
  }
}
