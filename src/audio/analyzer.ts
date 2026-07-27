/**
 * Two reactivity personalities — selected globally, realised INSIDE the
 * analyser as independent tunings (time constants + event semantics).
 * Neither derives from the other: two aesthetics, not two volumes.
 *
 *   ambient : 氛围（潮汐）— slow-attack envelopes breathe with phrase-level
 *             dynamics; "events" are swells (sustained energy rises above a
 *             ~3 s baseline) that bloom for seconds instead of flashing.
 *   pulse   : 律动（节拍）— engineer-tuned defaults; fast attack / slow
 *             release, spectral-flux beat hits with ~300 ms pulses.
 *             Identical to the pre-tier analyser behaviour.
 *
 * The AudioFeatures interface is shared: in ambient, `beat` / `beatPulse`
 * carry swell events, so every visualisation gains both personalities
 * without any per-viz changes.
 */
export type IntensityTier = 'ambient' | 'pulse';
export interface AnalyzerTuning {
  /** Envelope follower [attack, release] per band — see envFollow(). */
  bassEnvAR: [number, number];
  midEnvAR: [number, number];
  trebleEnvAR: [number, number];
  onsetAR: [number, number];
  /** 'beat' = spectral-flux hits · 'swell' = phrase-level energy rises. */
  eventMode: 'beat' | 'swell';
  /** beatPulse linear decay per second (3 → ~330 ms; 0.4 → ~2.5 s bloom). */
  pulseDecayPerSec: number;
  /** Log-spectrum smoothing rate; 0 = raw per-frame bars. */
  spectrumFollow: number;
  /** PeakTracker decay/sec for adaptive normalisation. */
  normDecayPerSec: number;
}
export const ANALYZER_TUNINGS: Record<IntensityTier, AnalyzerTuning> = {
  // Tidal personality — the tide lives in the RELEASE (afterglow), never the
  // attack (slow attack reads as audio/visual lag). Releases are ~1.5× slower
  // than pulse — slow enough to glow, fast enough that envelopes fall back
  // between hits: dynamics come from that contrast.
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
  // Engineer defaults — the exact constants the analyser always shipped with.
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
  setDecay(perSec: number): void {
    this.decayPerSec = perSec;
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

  // Personality tuning (time constants + event semantics)
  private tier: IntensityTier = 'pulse';
  private tuning: AnalyzerTuning = ANALYZER_TUNINGS.pulse;

  // Swell detector state (ambient) — phrase-level energy vs slow baseline
  private swellBaseline = 0;
  private static readonly SWELL_THRESHOLD = 0.035;   // rise above baseline
  private static readonly SWELL_MIN_ENERGY = 0.08;   // ignore near-silence
  private static readonly SWELL_REFRACTORY_MS = 1800;

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
   * Switch reactivity personality. Cheap no-op when unchanged — safe to call
   * every frame. Analyser statistics are kept; envelopes glide into the new
   * time constants within a couple of seconds (the transition IS the fade).
   */
  setTier(tier: IntensityTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.tuning = ANALYZER_TUNINGS[tier];
    const d = this.tuning.normDecayPerSec;
    this.bassPk.setDecay(d);
    this.midPk.setDecay(d);
    this.treblePk.setDecay(d);
    this.levelPk.setDecay(d);
    // Restart the swell baseline from current energy so entering ambient
    // doesn't instantly fire a bogus swell.
    this.swellBaseline = this.features.overall;
  }

  /**
   * Update all features from a raw byte FFT buffer.
   * `dt` is delta-time in seconds (clamp upstream to avoid huge jumps).
   */
  process(buf: Uint8Array, dt: number): AudioFeatures {
    const f = this.features;
    const t = this.tuning;
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

    // ---- 2. Envelope followers — personality-owned time constants.
    //   pulse:   fast attack / slow release — drums actually hit.
    //   ambient: slow attack / very slow release — tide, not punch.
    f.bassEnv = envFollow(f.bassEnv, bassRaw, t.bassEnvAR[0], t.bassEnvAR[1], safeDt);
    f.midEnv = envFollow(f.midEnv, midRaw, t.midEnvAR[0], t.midEnvAR[1], safeDt);
    f.trebleEnv = envFollow(f.trebleEnv, trebleRaw, t.trebleEnvAR[0], t.trebleEnvAR[1], safeDt);

    // ---- 3. Log-spaced spectrum (32 bands) — ambient smooths it into a
    //   drifting horizon; pulse keeps the raw per-frame bars.
    const spec = f.spectrum;
    const aSpec = t.spectrumFollow > 0 ? 1 - Math.exp(-t.spectrumFollow * safeDt * 60) : 1;
    for (let i = 0; i < spec.length; i++) {
      const a = this.logBandBounds[i];
      const b = Math.max(a + 1, this.logBandBounds[i + 1]);
      const v = avg(buf, a, b);
      spec[i] += (v - spec[i]) * aSpec;
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
    f.onset = envFollow(f.onset, normOnset, t.onsetAR[0], t.onsetAR[1], safeDt);

    // ---- 5. Events — each personality owns its own semantics.
    f.beat = false;
    const sinceLast = this.wallMs - (f.lastBeatAt || 0);
    if (t.eventMode === 'beat') {
      // Spectral-flux hit with refractory period — "this very kick".
      if (sigmas > this.onsetThreshold && sinceLast > this.refractoryMs && f.bassEnv > 0.12) {
        f.beat = true;
        f.lastBeatAt = this.wallMs;
        f.beatPulse = 1;
      } else {
        f.beatPulse = Math.max(0, f.beatPulse - safeDt * t.pulseDecayPerSec);
      }
    } else {
      // Swell: overall energy rising well above its own ~3 s baseline —
      // "this phrase is cresting". Blooms slowly via pulseDecayPerSec.
      this.swellBaseline += (overallRaw - this.swellBaseline) * (1 - Math.exp(-0.33 * safeDt));
      const rise = overallRaw - this.swellBaseline;
      if (
        rise > AudioAnalyzer.SWELL_THRESHOLD &&
        overallRaw > AudioAnalyzer.SWELL_MIN_ENERGY &&
        sinceLast > AudioAnalyzer.SWELL_REFRACTORY_MS
      ) {
        f.beat = true;
        f.lastBeatAt = this.wallMs;
        f.beatPulse = 1;
      } else {
        f.beatPulse = Math.max(0, f.beatPulse - safeDt * t.pulseDecayPerSec);
      }
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
    this.swellBaseline = 0;
    this.wallMs = 0;
  }
}
