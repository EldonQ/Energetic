import { useEffect, useState } from 'react';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { formatArchiveStamp } from '@/utils/format';

/**
 * Top-center info: timestamp + current "audio study" name (e.g. "PINE AND SNOW")
 */
export function TrackTitle() {
  const track = usePlayerStore(selectCurrentTrack);
  const [stamp, setStamp] = useState(formatArchiveStamp());

  useEffect(() => {
    const id = window.setInterval(() => setStamp(formatArchiveStamp()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none text-center">
      <p className="label mb-4 text-dim">{stamp}</p>
      <h2 className="font-bold uppercase text-2xl md:text-3xl tracking-[0.18em] text-bone/90">
        {track?.title || '—'}
      </h2>
    </div>
  );
}
