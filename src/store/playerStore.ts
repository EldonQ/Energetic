import { create } from 'zustand';
import type { Track } from '@/types/track';

interface PlayerState {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  manifestLoaded: boolean;

  setTracks: (tracks: Track[]) => void;
  selectTrack: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  next: () => void;
  prev: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  tracks: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  manifestLoaded: false,

  setTracks: (tracks) =>
    set({ tracks, manifestLoaded: true, currentIndex: Math.min(get().currentIndex, Math.max(0, tracks.length - 1)) }),
  selectTrack: (index) => set({ currentIndex: index, isPlaying: true, currentTime: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  next: () => {
    const { tracks, currentIndex } = get();
    if (!tracks.length) return;
    set({ currentIndex: (currentIndex + 1) % tracks.length, currentTime: 0, isPlaying: true });
  },
  prev: () => {
    const { tracks, currentIndex } = get();
    if (!tracks.length) return;
    set({ currentIndex: (currentIndex - 1 + tracks.length) % tracks.length, currentTime: 0, isPlaying: true });
  },
}));

export const selectCurrentTrack = (s: PlayerState) => s.tracks[s.currentIndex];
