import { useEffect, useRef } from 'react';
import { audioEngine } from './AudioEngine';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';

/**
 * Bridges the playerStore <-> a hidden <audio> element + AudioEngine.
 * Returns the ref to attach to the <audio> element.
 *
 * Concerns kept here:
 *   - swap audio.src when currentIndex changes
 *   - call audio.play() / .pause() based on isPlaying
 *   - on first play(), lazily initialize AudioEngine (user gesture)
 *   - keep store currentTime in sync via 'timeupdate' as backup (analyser hook covers main case)
 */
export function useAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const next = usePlayerStore((s) => s.next);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const track = usePlayerStore(selectCurrentTrack);

  // Attach engine to element once
  useEffect(() => {
    if (ref.current) audioEngine.attach(ref.current);
  }, []);

  // Swap source when track changes
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    // Prefix manifest's relative file path with the deploy base
    // (handles both Vercel root and /Energetic/ on GitHub Pages).
    const base = import.meta.env.BASE_URL ?? '/';
    const src = track.file.startsWith('http') || track.file.startsWith(base)
      ? track.file
      : `${base}${track.file.replace(/^\//, '')}`;
    if (el.src.endsWith(src) || el.src === src) return;
    el.src = src;
    el.load();
  }, [track?.file]);

  // Respond to play/pause flag
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    if (isPlaying) {
      // Lazy init on user gesture (the click that set isPlaying=true)
      (async () => {
        try {
          await audioEngine.init();
          await audioEngine.resume();
          await el.play();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[audio] play() blocked:', err);
          setPlaying(false);
        }
      })();
    } else {
      el.pause();
    }
  }, [isPlaying, track?.file, setPlaying]);

  // wire 'ended' -> next track, 'loadedmetadata' -> duration
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnded = () => next();
    const onLoaded = () => setDuration(el.duration || 0);
    el.addEventListener('ended', onEnded);
    el.addEventListener('loadedmetadata', onLoaded);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [next, setDuration]);

  return ref;
}
