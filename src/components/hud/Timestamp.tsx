import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/store/playerStore';
import { formatTime } from '@/utils/format';

export function Timestamp() {
  const time = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute right-8 md:right-10 top-1/2 z-10 -translate-y-1/2 text-right">
      <p className="label">{t('labels.nowPlaying')}</p>
      <p className="mt-1 tabular-nums text-bone/90 text-sm tracking-wider">
        {formatTime(time)} <span className="text-dim">/</span> {formatTime(duration)}
      </p>
    </div>
  );
}
