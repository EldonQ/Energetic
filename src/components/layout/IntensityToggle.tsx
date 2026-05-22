import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import type { IntensityTier } from '@/audio/analyzer';
import clsx from 'clsx';

/**
 * Two-tier global reactivity selector. Museum-minimal: two labels
 * separated by a hairline, current one in bone, the other dim.
 *
 *   ambient — restrained, gallery-quiet; softer envelopes, fewer beats
 *   pulse   — engineer defaults (recommended), full punch
 */
export function IntensityToggle() {
  const { t } = useTranslation();
  const intensity = useUIStore((s) => s.intensity);
  const setIntensity = useUIStore((s) => s.setIntensity);

  const tiers: { id: IntensityTier; key: string }[] = [
    { id: 'ambient', key: 'intensity.ambient' },
    { id: 'pulse', key: 'intensity.pulse' },
  ];

  return (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-museum no-select"
         title={t('intensity.hint') as string}>
      {tiers.map((tier, i) => (
        <span key={tier.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-dim/60">·</span>}
          <button
            type="button"
            onClick={() => setIntensity(tier.id)}
            className={clsx(
              'px-1 py-0.5 transition-colors',
              intensity === tier.id ? 'text-bone' : 'text-dim hover:text-bone/70',
            )}
            aria-pressed={intensity === tier.id}
            aria-label={t(tier.key) as string}
          >
            {t(tier.key)}
          </button>
        </span>
      ))}
    </div>
  );
}
