import { useEffect } from 'react';
import { Scene } from '@/components/visualizer/Scene';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TrackTitle } from '@/components/hud/TrackTitle';
import { Timestamp } from '@/components/hud/Timestamp';
import { Playlist } from '@/components/playlist/Playlist';
import { ParamPanel } from '@/components/controls/ParamPanel';
import { NowShowingToast } from '@/components/controls/NowShowingToast';
import { LyricsOverlay } from '@/lyrics/LyricsOverlay';
import { useManifest } from '@/audio/useManifest';
import { useAudio } from '@/audio/useAudio';
import { usePlayerStore } from '@/store/playerStore';

export default function App() {
  useManifest();
  const audioRef = useAudio();
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink">
      <Scene />

      <Header />
      <Playlist />
      <TrackTitle />
      <Timestamp />
      <LyricsOverlay />
      <Footer />

      <ParamPanel />
      <NowShowingToast />

      <audio
        id="echoes-audio"
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}
