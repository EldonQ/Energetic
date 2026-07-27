import { useEffect, useRef } from 'react';
import { audioEngine } from './AudioEngine';
import { extractBands, lerp, type Bands } from './fft';
import {
  AudioAnalyzer,
  createEmptyFeatures,
  type AudioFeatures,
} from './analyzer';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';

/**
 * Spawns a rAF loop that samples the audio analyser each frame and
 * publishes both:
 *   - `sharedBandsRef`    (legacy: bass/mid/treble/overall)
 *   - `sharedFeaturesRef` (rich AudioFeatures with envelopes, onset, beat, ...)
 *
 * 60fps band data flows through refs only — no React re-renders.
 * currentTime is throttled (~4 Hz) into Zustand for the timestamp HUD.
 */
function useAudioData() {
  const bandsRef = useRef<Bands>({ bass: 0, mid: 0, treble: 0, overall: 0 });
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyzerRef.current) analyzerRef.current = new AudioAnalyzer();
    const analyzer = analyzerRef.current;

    let lastTimeUpdate = 0;
    let lastFrame = performance.now();
    const audioEl = document.getElementById('echoes-audio') as HTMLAudioElement | null;

    const tick = (now: number) => {
      const dt = (now - lastFrame) / 1000;
      lastFrame = now;

      if (audioEngine.ready) {
        const buf = audioEngine.sample();
        // Legacy bands (for back-compat with code that hasn't migrated yet)
        const b = extractBands(buf);
        const ref = bandsRef.current;
        ref.bass = lerp(ref.bass, b.bass, 0.25);
        ref.mid = lerp(ref.mid, b.mid, 0.25);
        ref.treble = lerp(ref.treble, b.treble, 0.35);
        ref.overall = lerp(ref.overall, b.overall, 0.25);

        // Rich feature set — personality (ambient/pulse) lives inside the
        // analyser; setTier is a no-op unless the user switched tiers.
        // (Read from Zustand without triggering React re-renders.)
        analyzer.setTier(useUIStore.getState().intensity);
        sharedFeaturesRef.current = analyzer.process(buf, dt);
      }

      // throttled timestamp publish
      if (audioEl && now - lastTimeUpdate > 250) {
        lastTimeUpdate = now;
        const { currentTime, duration } = audioEl;
        const st = usePlayerStore.getState();
        if (Number.isFinite(currentTime) && Math.abs(st.currentTime - currentTime) > 0.2) {
          st.setCurrentTime(currentTime);
        }
        if (Number.isFinite(duration) && Math.abs(st.duration - duration) > 0.5) {
          st.setDuration(duration);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return bandsRef;
}

/**
 * Module-scoped singletons so any 3D component can read frame-fresh audio
 * without prop-drilling. Both are populated by the rAF loop in useAudioData.
 */
export const sharedBandsRef: { current: Bands } = {
  current: { bass: 0, mid: 0, treble: 0, overall: 0 },
};

export const sharedFeaturesRef: { current: AudioFeatures } = {
  current: createEmptyFeatures(32),
};

/** Variant of useAudioData that writes into the shared singleton refs. */
export function useSharedAudioData() {
  const ref = useAudioData();
  useEffect(() => {
    let raf: number;
    const sync = () => {
      sharedBandsRef.current = ref.current;
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return ref;
}
