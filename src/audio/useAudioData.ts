import { useEffect } from 'react';
import { audioEngine } from './AudioEngine';
import { AudioAnalyzer, createEmptyFeatures, type AudioFeatures } from './analyzer';
import type { Bands } from './fft';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';

export const sharedBandsRef: { current: Bands } = {
  current: { bass: 0, mid: 0, treble: 0, overall: 0 },
};

export const sharedFeaturesRef: { current: AudioFeatures } = {
  current: createEmptyFeatures(),
};

export function useSharedAudioData() {
  useEffect(() => {
    let analyzer: AudioAnalyzer | null = null;
    let raf: number;
    let lastTimeUpdate = 0;
    let lastFrame = performance.now();
    const audioEl = document.getElementById('echoes-audio') as HTMLAudioElement | null;
    const reset = () => {
      analyzer?.reset();
      sharedFeaturesRef.current = analyzer?.features ?? createEmptyFeatures();
      sharedBandsRef.current = sharedFeaturesRef.current;
      lastFrame = performance.now();
    };
    audioEl?.addEventListener('emptied', reset);
    audioEl?.addEventListener('seeking', reset);
    audioEl?.addEventListener('seeked', reset);

    const tick = (now: number) => {
      const dt = (now - lastFrame) / 1000;
      lastFrame = now;
      if (audioEngine.ready) {
        analyzer ??= new AudioAnalyzer({ sampleRate: audioEngine.sampleRate, fftSize: audioEngine.fftSize });
        analyzer.setTier(useUIStore.getState().intensity);
        sharedFeaturesRef.current = analyzer.process(audioEngine.sample(), dt);
        sharedBandsRef.current = sharedFeaturesRef.current;
      }
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
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audioEl?.removeEventListener('emptied', reset);
      audioEl?.removeEventListener('seeking', reset);
      audioEl?.removeEventListener('seeked', reset);
    };
  }, []);
  return sharedBandsRef;
}
