import { useTranslation } from 'react-i18next';
import { usePlayerStore, selectCurrentTrack } from '@/store/playerStore';
import { PlayPauseButton } from '@/components/ui/PlayPauseButton';

export function Footer() {
  const { t } = useTranslation();
  const track = usePlayerStore(selectCurrentTrack);

  return (
    <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between p-8 md:p-10">
      <div className="pointer-events-auto max-w-md">
        <p className="label mb-2">{t('labels.archiveId')}</p>
        <p className="font-bold uppercase text-xl tracking-wide">
          {track?.title || '—'}
        </p>
        <p className="label mt-1">
          NO. {track ? `2024_11_18_${track.id}` : '— — —'}
        </p>
        <div className="mt-6">
          <PlayPauseButton />
        </div>
      </div>
      <div className="pointer-events-auto text-right">
        <p className="label">{t('labels.soundSculpture')}</p>
        <p className="label mt-1">{t('labels.sealed')}</p>
      </div>
    </footer>
  );
}
