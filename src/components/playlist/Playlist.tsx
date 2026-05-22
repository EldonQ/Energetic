import { useTranslation } from 'react-i18next';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { formatTime } from '@/utils/format';
import clsx from 'clsx';

export function Playlist() {
  const { t } = useTranslation();
  const tracks = usePlayerStore((s) => s.tracks);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const select = usePlayerStore((s) => s.selectTrack);
  const current = usePlayerStore(selectCurrentTrack);

  if (!tracks.length) {
    return (
      <aside className="absolute left-8 md:left-10 top-1/2 z-10 -translate-y-1/2 max-w-xs">
        <p className="label-bone whitespace-pre-line leading-relaxed">
          {t('messages.noTracks')}
        </p>
      </aside>
    );
  }

  return (
    <aside className="absolute left-8 md:left-10 top-1/2 z-10 -translate-y-1/2 max-w-xs">
      <ul className="space-y-1 text-xs leading-snug">
        {tracks.map((tr, i) => {
          const active = i === currentIndex;
          return (
            <li key={tr.id}>
              <button
                type="button"
                onClick={() => select(i)}
                className={clsx(
                  'group flex w-full items-center gap-3 text-left transition-colors',
                  active ? 'text-bone' : 'text-dim hover:text-bone/80',
                )}
              >
                <span className="w-6 tabular-nums">
                  {active ? '▶' : tr.id}
                </span>
                <span className={clsx('flex-1 uppercase truncate tracking-wider', active && 'font-bold')}>
                  {tr.title}
                </span>
                <span className="tabular-nums w-12 text-right">{formatTime(tr.duration)}</span>
                {active && <span className="text-haze">●</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-faint pt-3 text-[10px] uppercase tracking-wider text-dim">
        <p>{t('labels.nowPlaying')}</p>
        <p className="mt-1 font-bold text-bone">{current?.title || '—'}</p>
        <p className="mt-1 text-dim">{current?.artist || t('labels.unknownArchive')}</p>
      </div>
    </aside>
  );
}
