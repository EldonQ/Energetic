import { usePlayerStore } from '@/store/playerStore';
import clsx from 'clsx';

export function PlayPauseButton() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const hasTrack = usePlayerStore((s) => s.tracks.length > 0);
  const label = isPlaying ? '|| PAUSE' : '▶  PLAY';

  return (
    <button
      type="button"
      onClick={togglePlay}
      disabled={!hasTrack}
      className={clsx(
        'group inline-flex items-center gap-2 text-xs tracking-museum uppercase',
        'border border-dim/60 px-3 py-2 transition-colors',
        'hover:border-bone hover:text-bone',
        'disabled:opacity-30 disabled:hover:border-dim/60 disabled:cursor-not-allowed',
      )}
    >
      <span>[ {label} ]</span>
    </button>
  );
}
