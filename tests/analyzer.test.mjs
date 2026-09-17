import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioAnalyzer, createEmptyFeatures } from '../src/audio/analyzer.ts';

const rates = [30, 60, 90, 120, 144];

function runPulses(step, smooth = false) {
  const analyzer = new AudioAnalyzer();
  const buf = new Uint8Array(512);
  const beats = [];
  let time = 0;
  let frame = 0;
  while (time < 12 - 1e-8) {
    const dt = Math.min(step(frame++), 12 - time);
    time += dt;
    const phase = (time - 1 + 1e-8) % 0.5;
    const amplitude = time >= 1 && time < 12 - 1e-8 && phase < 0.08
      ? (smooth ? Math.sin(Math.PI * phase / 0.08) : 1) : 0;
    buf.fill(0);
    buf.fill(Math.round(10 + 220 * amplitude), 0, 325);
    const f = analyzer.process(buf, dt);
    if (f.beat) beats.push(time);
  }
  return beats;
}

for (const fps of rates) {
  for (const smooth of [false, true]) {
    test(`${fps}fps detects each ${smooth ? 'rounded' : 'square'} transient once`, () => {
      const beats = runPulses(() => 1 / fps, smooth);
      assert.equal(beats.length, 22);
      beats.forEach((time, index) => assert.ok(Math.abs(time - (1 + index * 0.5)) <= 1 / fps + 0.02));
    });
  }
}

test('jittered frame intervals preserve pulse count and timing', () => {
  const steps = [1 / 30, 1 / 144, 1 / 60, 1 / 90, 1 / 120];
  const beats = runPulses((frame) => steps[frame % steps.length]);
  assert.equal(beats.length, 22);
  beats.forEach((time, index) => assert.ok(Math.abs(time - (1 + index * 0.5)) < 0.04));
});

for (const tier of ['ambient', 'pulse']) {
  test(`${tier}: silence and constant input do not create events`, () => {
    for (const value of [0, 160]) {
      const analyzer = new AudioAnalyzer();
      analyzer.setTier(tier);
      const buf = new Uint8Array(512).fill(value);
      for (let i = 0; i < 600; i++) {
        const f = analyzer.process(buf, 1 / 60);
        assert.equal(f.beat, false);
        assert.equal(f.beatPulse, 0);
      }
    }
  });

  test(`${tier}: reset matches a fresh instance including adaptive peaks`, () => {
    const reused = new AudioAnalyzer();
    reused.setTier(tier);
    for (let i = 0; i < 300; i++) reused.process(new Uint8Array(512).fill(i % 20 < 4 ? 240 : 20), 1 / 60);
    const spectrum = reused.features.spectrum;
    reused.reset();
    assert.equal(reused.features.spectrum, spectrum);
    assert.deepEqual(reused.features, createEmptyFeatures());
    const fresh = new AudioAnalyzer();
    fresh.setTier(tier);
    for (let i = 0; i < 200; i++) {
      const buf = new Uint8Array(512).fill(i % 35 < 5 ? 70 : 2);
      assert.deepEqual(reused.process(buf, 1 / 60), fresh.process(buf, 1 / 60));
    }
  });

  test(`${tier}: envelopes and event decay follow seconds rather than frames`, () => {
    const results = rates.map((fps) => {
      const analyzer = new AudioAnalyzer();
      analyzer.setTier(tier);
      const loud = new Uint8Array(512).fill(180);
      const silence = new Uint8Array(512);
      for (let i = 0; i < fps; i++) analyzer.process(loud, 1 / fps);
      analyzer.features.beatPulse = 1;
      for (let i = 0; i < fps / 2; i++) analyzer.process(silence, 1 / fps);
      return { bass: analyzer.features.bassEnv, pulse: analyzer.features.beatPulse };
    });
    for (const result of results) {
      assert.ok(Math.abs(result.bass - results[0].bass) < 1e-6);
      assert.ok(Math.abs(result.pulse - (tier === 'ambient' ? 0.8 : 0)) < 1e-6);
    }
  });
}

test('44.1/48 kHz place the same Hz in the same frequency region', () => {
  for (const [hz, band] of [[100, 'bass'], [1000, 'mid'], [6000, 'treble']]) {
    const peaks = [];
    for (const sampleRate of [44100, 48000]) {
      const analyzer = new AudioAnalyzer({ sampleRate, fftSize: 1024 });
      const buf = new Uint8Array(512);
      buf[Math.round(hz * 1024 / sampleRate)] = 255;
      const f = analyzer.process(buf, 1 / 60);
      for (const name of ['bass', 'mid', 'treble']) assert.equal(f[name] > 0, name === band);
      peaks.push(f.spectrum.indexOf(Math.max(...f.spectrum)));
    }
    assert.equal(peaks[0], peaks[1]);
  }
});

test('ambient swells have a longer envelope than pulse hits', () => {
  for (const tier of ['ambient', 'pulse']) {
    const analyzer = new AudioAnalyzer();
    analyzer.setTier(tier);
    const low = new Uint8Array(512).fill(10);
    for (let i = 0; i < 180; i++) analyzer.process(low, 1 / 60);
    assert.equal(analyzer.process(new Uint8Array(512).fill(230), 1 / 60).beat, true);
    for (let i = 0; i < 30; i++) analyzer.process(low, 1 / 60);
    assert.ok(Math.abs(analyzer.features.beatPulse - (tier === 'ambient' ? 0.8 : 0)) < 1e-6);
  }
});
