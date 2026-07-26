import { useEffect, useState } from 'react';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { parseLrc, matchLrcFile, findActiveIndex, type LrcLine } from './lrc';

/**
 * Loads the .lrc file matching the current track (if any) and tracks the
 * active line against playback time.
 *
 * Playback time is read straight from the hidden <audio> element on a light
 * interval — line granularity is seconds, so no rAF and no store coupling.
 */

const POLL_MS = 200;
export const AUDIO_EL_ID = 'echoes-audio';

let indexPromise: Promise<string[]> | null = null;

/** Fetch public/LRC/manifest.json once per session; [] when absent. */
function loadLrcIndex(): Promise<string[]> {
  if (!indexPromise) {
    const base = import.meta.env.BASE_URL ?? '/';
    indexPromise = fetch(`${base}LRC/manifest.json`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.files) ? (data.files as string[]) : [];
      })
      .catch(() => []);
  }
  return indexPromise;
}

export function useLyrics(): { lines: LrcLine[]; activeIndex: number } {
  const track = usePlayerStore(selectCurrentTrack);
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Load + parse the lyric file whenever the track changes.
  useEffect(() => {
    let cancelled = false;
    setLines([]);
    setActiveIndex(-1);
    if (!track?.title) return;

    (async () => {
      const files = await loadLrcIndex();
      const file = matchLrcFile(track.title, files);
      if (!file || cancelled) return;
      try {
        const base = import.meta.env.BASE_URL ?? '/';
        const res = await fetch(`${base}LRC/${encodeURIComponent(file)}`);
        if (!res.ok || cancelled) return;
        const parsed = parseLrc(await res.text());
        if (!cancelled && parsed.length) setLines(parsed);
      } catch {
        /* no lyrics — overlay stays hidden */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [track?.title]);

  // Poll the audio element's clock and update the active line index.
  useEffect(() => {
    if (!lines.length) return;
    const id = window.setInterval(() => {
      const el = document.getElementById(AUDIO_EL_ID) as HTMLAudioElement | null;
      if (!el) return;
      const idx = findActiveIndex(lines, el.currentTime);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [lines]);

  return { lines, activeIndex };
}
