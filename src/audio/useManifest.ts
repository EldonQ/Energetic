import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import type { Manifest, Track } from '@/types/track';

/**
 * Loads /audio/manifest.json on mount and hydrates the player store.
 * If the manifest is empty (no MP3s yet) the UI shows an instructional state.
 */
export function useManifest() {
  const setTracks = usePlayerStore((s) => s.setTracks);
  const manifestLoaded = usePlayerStore((s) => s.manifestLoaded);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = import.meta.env.BASE_URL ?? '/';
        const res = await fetch(`${base}audio/manifest.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
        const data = (await res.json()) as Manifest;
        if (!cancelled) setTracks(data.tracks ?? []);
      } catch {
        if (!cancelled) setTracks([] as Track[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTracks]);

  return manifestLoaded;
}
