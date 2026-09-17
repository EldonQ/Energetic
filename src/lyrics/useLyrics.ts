import { useEffect, useState } from 'react';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { parseLrc, matchLrcFile, findActiveIndex, lrcFileUrl, type LrcLine } from './lrc';

const POLL_MS = 200;
const EMPTY_LINES: LrcLine[] = [];
export const AUDIO_EL_ID = 'echoes-audio';

let indexPromise: Promise<string[]> | null = null;

function loadLrcIndex(): Promise<string[]> {
  if (!indexPromise) {
    const base = import.meta.env.BASE_URL;
    indexPromise = fetch(`${base}SongLRC/manifest.json`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.files)
          ? data.files.filter((file: unknown): file is string => typeof file === 'string')
          : [];
      })
      .catch(() => []);
  }
  return indexPromise;
}

export function useLyrics(): { lines: LrcLine[]; activeIndex: number } {
  const track = usePlayerStore(selectCurrentTrack);
  const title = track?.title ?? '';
  const artist = track?.artist ?? '';
  const identity = JSON.stringify([track?.id, track?.file, title, artist]);
  const [loaded, setLoaded] = useState<{ identity: string; lines: LrcLine[] } | null>(null);
  const [active, setActive] = useState<{ lines: LrcLine[]; index: number } | null>(null);
  const lines = loaded?.identity === identity ? loaded.lines : EMPTY_LINES;

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(null);
    if (!title) return;
    (async () => {
      const files = await loadLrcIndex();
      const file = matchLrcFile({ title, artist }, files);
      if (!file || controller.signal.aborted) return;
      try {
        const base = import.meta.env.BASE_URL;
        const res = await fetch(lrcFileUrl(base, file), { signal: controller.signal });
        if (!res.ok) return;
        const parsed = parseLrc(await res.text());
        if (!controller.signal.aborted) setLoaded({ identity, lines: parsed });
      } catch {
        // Missing or cancelled lyrics must not interrupt playback.
      }
    })();
    return () => controller.abort();
  }, [identity, title, artist]);

  useEffect(() => {
    if (!lines.length) return;
    const update = () => {
      const el = document.getElementById(AUDIO_EL_ID) as HTMLAudioElement | null;
      if (!el) return;
      const index = findActiveIndex(lines, el.currentTime);
      setActive((previous) => previous?.lines === lines && previous.index === index ? previous : { lines, index });
    };
    update();
    const id = window.setInterval(update, POLL_MS);
    return () => window.clearInterval(id);
  }, [lines]);

  return { lines, activeIndex: active?.lines === lines ? active.index : -1 };
}
